use reqwest::header::{ACCEPT, USER_AGENT};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File},
    io::Read,
    path::{Path, PathBuf},
    process::Command,
};
use sysinfo::System;
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, WebviewUrl};
use tauri::webview::WebviewBuilder;
use tauri_plugin_shell::ShellExt;
use tempfile::tempdir;
use url::Url;
use zip::ZipArchive;

const SETTINGS_FILE: &str = "settings.json";
const SURF_STATE_FILE: &str = "surf-state.json";
const ALYARCHETYPE_REPO: &str = "Jimbowiii/AlyArchetype";
const ALYARCHETYPE_ASSET: &str = "AlyArchetype.zip";
const ALYARCHETYPE_TARGET: &str = "data/mods/AlyArchetype.zip";
const ALYARCHETYPE_BACKUP: &str = "data/mods/AlyArchetype.backup.zip";
const ALYA_COMPANION_REPO: &str = "Jimbowiii/Alya-Companion";
const ALYA_COMPANION_INSTALLER: &str = "Alya-Companion-Windows-x64-setup.exe";
const ALYA_COMPANION_INSTALLER_SHA256: &str = "Alya-Companion-Windows-x64-setup.exe.sha256";
const BUILTIN_SURF_RESOURCE_DIR: &str = "resources/surf";
const BUILTIN_SURF_MANIFEST: &str = "patches.json";
const VANITY_WEBVIEW_LABEL: &str = "vanity-embedded";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
struct Settings {
    pokemmo_dir: String,
    rom_path: String,
    vanity_url: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            pokemmo_dir: String::new(),
            rom_path: String::new(),
            vanity_url: "https://www.crimsoncoremmo.co.uk/vanity-booth".into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct SurfState {
    managed_rom_path: Option<String>,
    active_patch_id: Option<String>,
    active_patch_name: Option<String>,
    original_backup_path: Option<String>,
    rom_sha256: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
struct AppState {
    settings: Settings,
    pokemmo_detected: bool,
    pokemmo_running: bool,
    theme_installed: bool,
    theme_status: Option<ThemeStatus>,
    surf_state: SurfState,
}

#[derive(Debug, Clone, Serialize)]
struct ThemeStatus {
    local_version: Option<String>,
    latest_version: Option<String>,
    release_name: Option<String>,
    changelog: Option<String>,
    published_at: Option<String>,
    update_available: bool,
    asset_name: Option<String>,
    backup_available: bool,
}

#[derive(Debug, Clone, Serialize)]
struct CompanionUpdateStatus {
    current_version: String,
    latest_version: Option<String>,
    release_name: Option<String>,
    changelog: Option<String>,
    published_at: Option<String>,
    update_available: bool,
    installer_available: bool,
    checksum_available: bool,
    repository: String,
    development_build: bool,
}

#[derive(Debug, Clone, Deserialize)]
struct GitHubRelease {
    tag_name: String,
    name: Option<String>,
    body: Option<String>,
    published_at: Option<String>,
    #[serde(default)]
    draft: bool,
    #[serde(default)]
    prerelease: bool,
    assets: Vec<GitHubAsset>,
}

#[derive(Debug, Clone, Deserialize)]
struct GitHubAsset {
    name: String,
    browser_download_url: String,
}


#[derive(Debug, Clone, Serialize, Deserialize)]
struct SurfPatch {
    id: String,
    name: String,
    description: String,
    compatibility: Option<String>,
    patch_file: String,
    patch_sha256: Option<String>,
    expected_source_sha256: Option<String>,
    expected_output_sha256: Option<String>,
}

#[derive(Debug, Deserialize)]
struct PatchManifest {
    patches: Vec<SurfPatch>,
}

fn config_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(config_dir(app)?.join(SETTINGS_FILE))
}

fn legacy_pokemmo_path() -> Option<String> {
    let appdata = std::env::var_os("APPDATA")?;
    let cfg = PathBuf::from(appdata)
        .join("AlyArchetypeUpdater")
        .join("pokemmo-path.txt");
    let raw = fs::read_to_string(cfg).ok()?;
    let saved = raw.trim_start_matches('\u{feff}').trim().to_string();
    if saved.is_empty() {
        return None;
    }
    let mods = Path::new(&saved).join("data").join("mods");
    if mods.is_dir() {
        Some(saved)
    } else {
        None
    }
}

fn load_settings(app: &AppHandle) -> Result<Settings, String> {
    let path = settings_path(app)?;
    let mut settings = if path.exists() {
        let data = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str::<Settings>(&data).map_err(|e| format!("Configuration invalide: {e}"))?
    } else {
        Settings::default()
    };

    let mut imported_legacy_path = false;
    if settings.pokemmo_dir.trim().is_empty() {
        if let Some(saved) = legacy_pokemmo_path() {
            settings.pokemmo_dir = saved;
            imported_legacy_path = true;
        }
    }

    if !path.exists() || imported_legacy_path {
        let data = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
        fs::write(&path, data).map_err(|e| e.to_string())?;
    }

    Ok(settings)
}

fn persist_settings(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    validate_settings(settings)?;
    let data = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(settings_path(app)?, data).map_err(|e| e.to_string())
}

fn surf_state_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(config_dir(app)?.join(SURF_STATE_FILE))
}

fn load_surf_state(app: &AppHandle) -> Result<SurfState, String> {
    let path = surf_state_path(app)?;
    if !path.exists() {
        return Ok(SurfState::default());
    }
    let data = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&data).map_err(|e| format!("État Surf invalide: {e}"))
}

fn persist_surf_state(app: &AppHandle, state: &SurfState) -> Result<(), String> {
    let data = serde_json::to_string_pretty(state).map_err(|e| e.to_string())?;
    fs::write(surf_state_path(app)?, data).map_err(|e| e.to_string())
}

fn validate_settings(settings: &Settings) -> Result<(), String> {
    if !settings.pokemmo_dir.trim().is_empty() {
        let base = Path::new(settings.pokemmo_dir.trim());
        if !base.is_dir() {
            return Err("Le dossier PokeMMO configuré n'existe pas".into());
        }
        if !base.join("data").join("mods").is_dir() {
            return Err("Le dossier sélectionné ne contient pas data\\mods".into());
        }
    }
    if !settings.vanity_url.trim().is_empty() {
        let url = Url::parse(settings.vanity_url.trim()).map_err(|_| "URL Vanity invalide".to_string())?;
        if url.scheme() != "https" && url.scheme() != "http" {
            return Err("L'URL Vanity doit utiliser http ou https".into());
        }
    }
    Ok(())
}

fn pokemmo_running() -> bool {
    let mut system = System::new_all();
    system.refresh_all();
    system.processes().values().any(|process| {
        process
            .name()
            .to_string_lossy()
            .to_ascii_lowercase()
            .contains("pokemmo")
    })
}

fn ensure_game_closed() -> Result<(), String> {
    if pokemmo_running() {
        Err("PokeMMO est ouvert. Ferme le jeu avant de modifier ses fichiers ou la ROM.".into())
    } else {
        Ok(())
    }
}

fn pokemmo_mods_dir(settings: &Settings) -> Result<PathBuf, String> {
    if settings.pokemmo_dir.trim().is_empty() {
        return Err("Le dossier PokeMMO n'est pas configuré".into());
    }
    let mods = Path::new(settings.pokemmo_dir.trim()).join("data").join("mods");
    if !mods.is_dir() {
        return Err(format!("data\\mods introuvable dans {}", settings.pokemmo_dir));
    }
    Ok(mods)
}

fn theme_target(settings: &Settings) -> Result<PathBuf, String> {
    Ok(pokemmo_mods_dir(settings)?.join(ALYARCHETYPE_ASSET))
}

fn theme_backup(settings: &Settings) -> Result<PathBuf, String> {
    Ok(pokemmo_mods_dir(settings)?.join("AlyArchetype.backup.zip"))
}

fn read_zip_version(zip_path: &Path) -> Result<String, String> {
    if !zip_path.is_file() {
        return Ok("0.0.0".into());
    }
    let file = File::open(zip_path).map_err(|e| format!("Impossible d'ouvrir {}: {e}", zip_path.display()))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("ZIP AlyArchetype invalide: {e}"))?;
    let mut entry = match archive.by_name("version.txt") {
        Ok(entry) => entry,
        Err(_) => return Ok("0.0.0".into()),
    };
    let mut version = String::new();
    entry.read_to_string(&mut version).map_err(|e| e.to_string())?;
    let version = version.trim().to_string();
    if version.is_empty() {
        Ok("0.0.0".into())
    } else {
        Ok(version)
    }
}

fn validate_theme_zip(zip_path: &Path) -> Result<String, String> {
    let file = File::open(zip_path).map_err(|e| format!("Impossible d'ouvrir le ZIP téléchargé: {e}"))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("ZIP téléchargé invalide: {e}"))?;

    archive
        .by_name("info.xml")
        .map_err(|_| "ZIP invalide : info.xml absent à la racine.".to_string())?;
    archive
        .by_name("version.txt")
        .map_err(|_| "ZIP invalide : version.txt absent à la racine.".to_string())?;
    drop(archive);

    let version = read_zip_version(zip_path)?;
    if version == "0.0.0" {
        return Err("ZIP invalide : version.txt est vide.".into());
    }
    Ok(version)
}

fn normalize_version(value: &str) -> String {
    value.trim().trim_start_matches(|c| c == 'v' || c == 'V').to_string()
}

fn numeric_version(value: &str) -> Option<Vec<u64>> {
    let normalized = normalize_version(value);
    if normalized.is_empty() {
        return None;
    }
    normalized
        .split('.')
        .map(|part| part.parse::<u64>().ok())
        .collect::<Option<Vec<_>>>()
}

fn version_is_newer(remote: &str, local: &str) -> bool {
    match (numeric_version(remote), numeric_version(local)) {
        (Some(mut r), Some(mut l)) => {
            let len = r.len().max(l.len());
            r.resize(len, 0);
            l.resize(len, 0);
            r > l
        }
        _ => normalize_version(remote) != normalize_version(local),
    }
}

fn semver_version(value: &str) -> Option<semver::Version> {
    semver::Version::parse(&normalize_version(value)).ok()
}

fn companion_version_is_newer(remote: &str, local: &str) -> bool {
    match (semver_version(remote), semver_version(local)) {
        (Some(remote), Some(local)) => remote > local,
        _ => version_is_newer(remote, local),
    }
}

fn local_theme_version(settings: &Settings) -> Option<String> {
    let target = theme_target(settings).ok()?;
    if !target.is_file() {
        return None;
    }
    read_zip_version(&target).ok()
}

fn build_state(app: &AppHandle) -> Result<AppState, String> {
    let settings = load_settings(app)?;
    let target = theme_target(&settings).ok();
    let local_version = local_theme_version(&settings);
    let theme_installed = target.as_ref().is_some_and(|p| p.is_file());
    let backup_available = theme_backup(&settings).ok().is_some_and(|p| p.is_file());
    let theme_status = if theme_installed || local_version.is_some() || backup_available {
        Some(ThemeStatus {
            local_version,
            latest_version: None,
            release_name: None,
            changelog: None,
            published_at: None,
            update_available: false,
            asset_name: Some(ALYARCHETYPE_ASSET.into()),
            backup_available,
        })
    } else {
        None
    };
    let pokemmo_detected = !settings.pokemmo_dir.trim().is_empty()
        && Path::new(settings.pokemmo_dir.trim()).join("data").join("mods").is_dir();
    Ok(AppState {
        pokemmo_detected,
        pokemmo_running: pokemmo_running(),
        theme_installed,
        theme_status,
        surf_state: load_surf_state(app)?,
        settings,
    })
}

async fn github_latest_release(repo: &str) -> Result<GitHubRelease, String> {
    let endpoint = format!("https://api.github.com/repos/{repo}/releases/latest");
    let client = reqwest::Client::builder().build().map_err(|e| e.to_string())?;
    let response = client
        .get(endpoint)
        .header(USER_AGENT, format!("Alya-Companion/{}", env!("CARGO_PKG_VERSION")))
        .header(ACCEPT, "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| format!("GitHub inaccessible: {e}"))?;
    if !response.status().is_success() {
        return Err(format!("GitHub a répondu avec le statut {}", response.status()));
    }
    response
        .json()
        .await
        .map_err(|e| format!("Réponse GitHub invalide: {e}"))
}

async fn github_latest_companion_release() -> Result<GitHubRelease, String> {
    let endpoint = format!("https://api.github.com/repos/{ALYA_COMPANION_REPO}/releases?per_page=20");
    let client = reqwest::Client::builder().build().map_err(|e| e.to_string())?;
    let response = client
        .get(endpoint)
        .header(USER_AGENT, format!("Alya-Companion/{}", env!("CARGO_PKG_VERSION")))
        .header(ACCEPT, "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| format!("GitHub inaccessible: {e}"))?;
    if !response.status().is_success() {
        return Err(format!("GitHub a répondu avec le statut {}", response.status()));
    }
    let releases: Vec<GitHubRelease> = response
        .json()
        .await
        .map_err(|e| format!("Réponse GitHub invalide: {e}"))?;

    let current_is_prerelease = semver_version(env!("CARGO_PKG_VERSION"))
        .map(|version| !version.pre.is_empty())
        .unwrap_or(false);

    releases
        .into_iter()
        .filter(|release| !release.draft && (current_is_prerelease || !release.prerelease))
        .max_by(|a, b| {
            match (semver_version(&a.tag_name), semver_version(&b.tag_name)) {
                (Some(a), Some(b)) => a.cmp(&b),
                _ => a.tag_name.cmp(&b.tag_name),
            }
        })
        .ok_or_else(|| "Aucune release Alya Companion disponible sur GitHub".to_string())
}

async fn latest_release() -> Result<(GitHubRelease, GitHubAsset), String> {
    let release = github_latest_release(ALYARCHETYPE_REPO).await?;
    let asset = release
        .assets
        .iter()
        .find(|a| a.name == ALYARCHETYPE_ASSET)
        .cloned()
        .ok_or_else(|| format!("La release {} ne contient pas {ALYARCHETYPE_ASSET}.", release.tag_name))?;
    Ok((release, asset))
}

#[tauri::command]
fn get_state(app: AppHandle) -> Result<AppState, String> {
    build_state(&app)
}

#[tauri::command]
fn save_settings(app: AppHandle, settings: Settings) -> Result<AppState, String> {
    persist_settings(&app, &settings)?;
    build_state(&app)
}

#[tauri::command]
async fn refresh_theme_status(app: AppHandle) -> Result<ThemeStatus, String> {
    let settings = load_settings(&app)?;
    let target = theme_target(&settings)?;
    let backup = theme_backup(&settings)?;
    let (release, asset) = latest_release().await?;
    let remote = normalize_version(&release.tag_name);
    let local = if target.is_file() {
        Some(read_zip_version(&target)?)
    } else {
        None
    };
    let update_available = match local.as_deref() {
        Some(local) => version_is_newer(&remote, local),
        None => true,
    };
    Ok(ThemeStatus {
        local_version: local,
        latest_version: Some(remote),
        release_name: release.name,
        changelog: release.body,
        published_at: release.published_at,
        update_available,
        asset_name: Some(asset.name),
        backup_available: backup.is_file(),
    })
}

#[tauri::command]
async fn update_theme(app: AppHandle) -> Result<String, String> {
    ensure_game_closed()?;
    let settings = load_settings(&app)?;
    let target = theme_target(&settings)?;
    let backup = theme_backup(&settings)?;
    let mods = pokemmo_mods_dir(&settings)?;
    let (release, asset) = latest_release().await?;
    let remote = normalize_version(&release.tag_name);

    if target.is_file() {
        let local = read_zip_version(&target)?;
        if !version_is_newer(&remote, &local) {
            return Ok(format!("AlyArchetype {local} est déjà à jour."));
        }
    }

    let client = reqwest::Client::builder().build().map_err(|e| e.to_string())?;
    let response = client
        .get(&asset.browser_download_url)
        .header(USER_AGENT, format!("Alya-Companion/{}", env!("CARGO_PKG_VERSION")))
        .header(ACCEPT, "application/octet-stream")
        .send()
        .await
        .map_err(|e| format!("Téléchargement impossible: {e}"))?;
    if !response.status().is_success() {
        return Err(format!("Téléchargement refusé: {}", response.status()));
    }
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;

    let temp = tempdir().map_err(|e| e.to_string())?;
    let downloaded = temp.path().join(ALYARCHETYPE_ASSET);
    fs::write(&downloaded, &bytes).map_err(|e| format!("Impossible d'écrire le téléchargement temporaire: {e}"))?;

    let downloaded_version = validate_theme_zip(&downloaded)?;
    if normalize_version(&downloaded_version) != remote {
        return Err(format!(
            "Version du ZIP ({}) différente de la release ({}).",
            normalize_version(&downloaded_version),
            remote
        ));
    }

    if target.is_file() {
        for entry in fs::read_dir(&mods).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            if !entry.path().is_file() {
                continue;
            }
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with("AlyArchetype.backup") && name.ends_with(".zip") {
                fs::remove_file(entry.path()).map_err(|e| format!("Impossible de supprimer l'ancien backup: {e}"))?;
            }
        }
        fs::copy(&target, &backup).map_err(|e| format!("Sauvegarde AlyArchetype impossible: {e}"))?;
    }

    let staged = mods.join("AlyArchetype.update.tmp");
    if staged.exists() {
        fs::remove_file(&staged).map_err(|e| format!("Impossible de nettoyer l'ancien fichier temporaire: {e}"))?;
    }
    fs::copy(&downloaded, &staged).map_err(|e| format!("Préparation de la mise à jour impossible: {e}"))?;

    if target.exists() {
        if let Err(e) = fs::remove_file(&target) {
            let _ = fs::remove_file(&staged);
            return Err(format!("Impossible de remplacer AlyArchetype.zip: {e}"));
        }
    }

    if let Err(e) = fs::rename(&staged, &target) {
        let _ = fs::remove_file(&staged);
        if backup.is_file() {
            let _ = fs::copy(&backup, &target);
        }
        return Err(format!("Installation échouée, rollback tenté: {e}"));
    }

    Ok(format!("AlyArchetype {remote} installé depuis {}", asset.name))
}

#[tauri::command]
fn restore_latest_theme_backup(app: AppHandle) -> Result<String, String> {
    ensure_game_closed()?;
    let settings = load_settings(&app)?;
    let target = theme_target(&settings)?;
    let backup = theme_backup(&settings)?;

    if !backup.is_file() {
        return Err("Aucun AlyArchetype.backup.zip n'est disponible.".into());
    }
    validate_theme_zip(&backup)?;

    let mods = pokemmo_mods_dir(&settings)?;
    let staged = mods.join("AlyArchetype.restore.tmp");
    if staged.exists() {
        fs::remove_file(&staged).map_err(|e| e.to_string())?;
    }
    fs::copy(&backup, &staged).map_err(|e| format!("Préparation de la restauration impossible: {e}"))?;

    if target.exists() {
        fs::remove_file(&target).map_err(|e| format!("Impossible de remplacer la version installée: {e}"))?;
    }
    fs::rename(&staged, &target).map_err(|e| format!("Restauration impossible: {e}"))?;

    Ok(format!("Backup restauré : {}", backup.display()))
}

fn surf_resources_dir(app: &AppHandle) -> Result<PathBuf, String> {
    // En build installé, Tauri copie les resources dans resource_dir().
    let bundled = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join(BUILTIN_SURF_RESOURCE_DIR);
    if bundled.join(BUILTIN_SURF_MANIFEST).is_file() {
        return Ok(bundled);
    }

    // Fallback pratique pour `tauri dev` et les builds depuis les sources.
    let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("surf");
    if dev.join(BUILTIN_SURF_MANIFEST).is_file() {
        return Ok(dev);
    }

    Err("Les ressources Surf intégrées à Alya Companion sont introuvables.".into())
}

fn load_builtin_surf_manifest(app: &AppHandle) -> Result<(PatchManifest, PathBuf), String> {
    let dir = surf_resources_dir(app)?;
    let manifest_path = dir.join(BUILTIN_SURF_MANIFEST);
    let data = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Manifest Surf intégré illisible: {e}"))?;
    let manifest: PatchManifest = serde_json::from_str(&data)
        .map_err(|e| format!("Manifest Surf intégré invalide: {e}"))?;
    Ok((manifest, dir))
}

#[tauri::command]
fn list_surf_patches(app: AppHandle) -> Result<Vec<SurfPatch>, String> {
    let (manifest, _) = load_builtin_surf_manifest(&app)?;
    Ok(manifest.patches)
}

#[tauri::command]
async fn apply_surf_patch(app: AppHandle, patch_id: String) -> Result<SurfState, String> {
    ensure_game_closed()?;
    let settings = load_settings(&app)?;
    let rom = require_file(&settings.rom_path, "ROM")?;
    let (manifest, surf_dir) = load_builtin_surf_manifest(&app)?;
    let patch = manifest
        .patches
        .into_iter()
        .find(|p| p.id == patch_id)
        .ok_or_else(|| "Patch Surf introuvable".to_string())?;
    let patch_path = surf_dir.join(&patch.patch_file);
    if !patch_path.is_file() {
        return Err(format!("Fichier patch intégré introuvable: {}", patch_path.display()));
    }
    if let Some(expected) = normalized_hash(&patch.patch_sha256) {
        let actual = sha256_file(&patch_path)?;
        if actual != expected {
            return Err(format!(
                "Le patch Surf intégré est corrompu.\nAttendu: {expected}\nActuel:  {actual}"
            ));
        }
    }

    let mut state = load_surf_state(&app)?;
    let rom_identity = rom.to_string_lossy().into_owned();
    if state.managed_rom_path.as_deref() != Some(rom_identity.as_str()) {
        state = SurfState::default();
        state.managed_rom_path = Some(rom_identity.clone());
        persist_surf_state(&app, &state)?;
    }
    let source = match state.original_backup_path.as_ref().map(PathBuf::from) {
        Some(existing) if existing.is_file() => existing,
        _ => {
            if state.active_patch_id.is_some() {
                return Err("Le backup de la ROM originale est introuvable. Restaure manuellement ta ROM propre avant de continuer.".into());
            }
            let current_hash = sha256_file(&rom)?;
            if let Some(expected) = normalized_hash(&patch.expected_source_sha256) {
                if current_hash != expected {
                    return Err(format!("Cette ROM ne correspond pas au hash source attendu.\nAttendu: {expected}\nActuel:  {current_hash}"));
                }
            }
            let root = config_dir(&app)?.join("backups").join("rom");
            fs::create_dir_all(&root).map_err(|e| e.to_string())?;
            let filename = rom.file_name().and_then(|n| n.to_str()).unwrap_or("rom.nds");
            let backup = root.join(format!("original-{}-{}", &current_hash[..16], safe_filename(filename)));
            if !backup.exists() {
                fs::copy(&rom, &backup).map_err(|e| format!("Backup ROM impossible: {e}"))?;
            }
            state.original_backup_path = Some(backup.to_string_lossy().into_owned());
            persist_surf_state(&app, &state)?;
            backup
        }
    };

    if let Some(expected) = normalized_hash(&patch.expected_source_sha256) {
        let source_hash = sha256_file(&source)?;
        if source_hash != expected {
            return Err(format!("Le backup original ne correspond pas au hash attendu pour ce patch.\nAttendu: {expected}\nBackup:  {source_hash}"));
        }
    }

    let temp = tempdir().map_err(|e| e.to_string())?;
    let output = temp.path().join("patched.nds");
    let result = app
        .shell()
        .sidecar("xdelta3")
        .map_err(|e| format!("Sidecar xdelta3 introuvable: {e}"))?
        .arg("-d")
        .arg("-s")
        .arg(&source)
        .arg(&patch_path)
        .arg(&output)
        .output()
        .await
        .map_err(|e| format!("Impossible d'exécuter xdelta3 intégré: {e}"))?;
    if !result.status.success() {
        return Err(format!("xdelta3 a échoué:\n{}", String::from_utf8_lossy(&result.stderr)));
    }
    if !output.is_file() {
        return Err("xdelta3 n'a pas produit de ROM patchée".into());
    }
    let output_hash = sha256_file(&output)?;
    if let Some(expected) = normalized_hash(&patch.expected_output_sha256) {
        if output_hash != expected {
            return Err(format!("Le hash de la ROM générée est inattendu.\nAttendu: {expected}\nProduit: {output_hash}"));
        }
    }
    fs::copy(&output, &rom).map_err(|e| format!("Impossible de remplacer la ROM: {e}"))?;

    state.active_patch_id = Some(patch.id);
    state.active_patch_name = Some(patch.name);
    state.rom_sha256 = Some(output_hash);
    persist_surf_state(&app, &state)?;
    Ok(state)
}

#[tauri::command]
fn restore_original_rom(app: AppHandle) -> Result<SurfState, String> {
    ensure_game_closed()?;
    let settings = load_settings(&app)?;
    let rom = require_file_path(&settings.rom_path, "ROM")?;
    let mut state = load_surf_state(&app)?;
    let rom_identity = rom.to_string_lossy().into_owned();
    if state.managed_rom_path.as_deref() != Some(rom_identity.as_str()) {
        return Err("Le backup enregistré appartient à une autre ROM configurée".into());
    }
    let backup = state
        .original_backup_path
        .as_ref()
        .map(PathBuf::from)
        .filter(|p| p.is_file())
        .ok_or_else(|| "Aucun backup de ROM originale n'est disponible".to_string())?;
    fs::copy(&backup, &rom).map_err(|e| format!("Restauration de la ROM impossible: {e}"))?;
    state.active_patch_id = None;
    state.active_patch_name = None;
    state.rom_sha256 = Some(sha256_file(&rom)?);
    persist_surf_state(&app, &state)?;
    Ok(state)
}

fn vanity_url(app: &AppHandle) -> Result<Url, String> {
    let settings = load_settings(app)?;
    let url = Url::parse(settings.vanity_url.trim()).map_err(|_| "URL Vanity invalide".to_string())?;
    if url.scheme() != "https" && url.scheme() != "http" {
        return Err("L'URL Vanity doit utiliser http ou https".into());
    }
    Ok(url)
}

fn validate_vanity_bounds(x: f64, y: f64, width: f64, height: f64) -> Result<(LogicalPosition<f64>, LogicalSize<f64>), String> {
    if !x.is_finite() || !y.is_finite() || !width.is_finite() || !height.is_finite() {
        return Err("Dimensions Vanity invalides".into());
    }
    if width < 160.0 || height < 160.0 {
        return Err("Zone Vanity trop petite".into());
    }
    Ok((
        LogicalPosition::new(x.max(0.0), y.max(0.0)),
        LogicalSize::new(width.max(160.0), height.max(160.0)),
    ))
}

#[tauri::command]
async fn show_vanity_webview(app: AppHandle, x: f64, y: f64, width: f64, height: f64) -> Result<(), String> {
    let url = vanity_url(&app)?;
    let (position, size) = validate_vanity_bounds(x, y, width, height)?;

    if let Some(webview) = app.get_webview(VANITY_WEBVIEW_LABEL) {
        webview.set_position(position).map_err(|e| e.to_string())?;
        webview.set_size(size).map_err(|e| e.to_string())?;
        let should_navigate = webview.url().map(|current| current != url).unwrap_or(true);
        if should_navigate {
            webview.navigate(url).map_err(|e| e.to_string())?;
        }
        webview.show().map_err(|e| e.to_string())?;
        return Ok(());
    }

    let main_webview = app
        .get_webview("main")
        .or_else(|| app.webviews().into_values().find(|webview| webview.label() != VANITY_WEBVIEW_LABEL))
        .ok_or_else(|| "Fenêtre principale Alya Companion introuvable".to_string())?;
    let window = main_webview.window();

    let builder = WebviewBuilder::new(VANITY_WEBVIEW_LABEL, WebviewUrl::External(url));
    window
        .add_child(builder, position, size)
        .map_err(|e| format!("Impossible d'intégrer Vanity dans Alya Companion: {e}"))?;
    Ok(())
}

#[tauri::command]
fn hide_vanity_webview(app: AppHandle) -> Result<(), String> {
    if let Some(webview) = app.get_webview(VANITY_WEBVIEW_LABEL) {
        webview.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn reload_vanity_webview(app: AppHandle) -> Result<(), String> {
    let webview = app
        .get_webview(VANITY_WEBVIEW_LABEL)
        .ok_or_else(|| "Le Vanity Booth n'est pas encore ouvert".to_string())?;
    webview.reload().map_err(|e| e.to_string())?;
    Ok(())
}

fn companion_update_status_from_release(release: &GitHubRelease) -> CompanionUpdateStatus {
    let current = normalize_version(env!("CARGO_PKG_VERSION"));
    let latest = normalize_version(&release.tag_name);
    CompanionUpdateStatus {
        current_version: current.clone(),
        latest_version: Some(latest.clone()),
        release_name: release.name.clone(),
        changelog: release.body.clone(),
        published_at: release.published_at.clone(),
        update_available: companion_version_is_newer(&latest, &current),
        installer_available: release.assets.iter().any(|a| a.name == ALYA_COMPANION_INSTALLER),
        checksum_available: release.assets.iter().any(|a| a.name == ALYA_COMPANION_INSTALLER_SHA256),
        repository: ALYA_COMPANION_REPO.into(),
        development_build: cfg!(debug_assertions),
    }
}

#[tauri::command]
async fn check_companion_update() -> Result<CompanionUpdateStatus, String> {
    let release = github_latest_companion_release().await?;
    Ok(companion_update_status_from_release(&release))
}

fn parse_sha256_file(contents: &str) -> Result<String, String> {
    let candidate = contents
        .split_whitespace()
        .next()
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase();
    if candidate.len() != 64 || !candidate.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err("Fichier SHA-256 de la release invalide".into());
    }
    Ok(candidate)
}

#[tauri::command]
async fn install_companion_update(app: AppHandle) -> Result<String, String> {
    let release = github_latest_companion_release().await?;
    let status = companion_update_status_from_release(&release);
    if !status.update_available {
        return Ok(format!("Alya Companion {} est déjà à jour.", status.current_version));
    }

    let installer = release
        .assets
        .iter()
        .find(|a| a.name == ALYA_COMPANION_INSTALLER)
        .cloned()
        .ok_or_else(|| format!("La release {} ne contient pas {ALYA_COMPANION_INSTALLER}.", release.tag_name))?;
    let checksum = release
        .assets
        .iter()
        .find(|a| a.name == ALYA_COMPANION_INSTALLER_SHA256)
        .cloned()
        .ok_or_else(|| format!("La release {} ne contient pas {ALYA_COMPANION_INSTALLER_SHA256}.", release.tag_name))?;

    let client = reqwest::Client::builder().build().map_err(|e| e.to_string())?;
    let user_agent = format!("Alya-Companion/{}", env!("CARGO_PKG_VERSION"));

    let checksum_response = client
        .get(&checksum.browser_download_url)
        .header(USER_AGENT, &user_agent)
        .header(ACCEPT, "application/octet-stream")
        .send()
        .await
        .map_err(|e| format!("Téléchargement du SHA-256 impossible: {e}"))?;
    if !checksum_response.status().is_success() {
        return Err(format!("Téléchargement du SHA-256 refusé: {}", checksum_response.status()));
    }
    let expected_hash = parse_sha256_file(
        &checksum_response.text().await.map_err(|e| format!("Lecture du SHA-256 impossible: {e}"))?,
    )?;

    let installer_response = client
        .get(&installer.browser_download_url)
        .header(USER_AGENT, &user_agent)
        .header(ACCEPT, "application/octet-stream")
        .send()
        .await
        .map_err(|e| format!("Téléchargement de la mise à jour impossible: {e}"))?;
    if !installer_response.status().is_success() {
        return Err(format!("Téléchargement de la mise à jour refusé: {}", installer_response.status()));
    }
    let bytes = installer_response.bytes().await.map_err(|e| format!("Lecture de la mise à jour impossible: {e}"))?;

    let update_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?
        .join("updates");
    fs::create_dir_all(&update_dir).map_err(|e| format!("Impossible de créer le cache de mise à jour: {e}"))?;
    let installer_path = update_dir.join(ALYA_COMPANION_INSTALLER);
    fs::write(&installer_path, &bytes).map_err(|e| format!("Impossible d'écrire l'installateur: {e}"))?;

    let actual_hash = sha256_file(&installer_path)?;
    if actual_hash != expected_hash {
        let _ = fs::remove_file(&installer_path);
        return Err(format!(
            "SHA-256 de la mise à jour invalide. Attendu {expected_hash}, reçu {actual_hash}."
        ));
    }

    Command::new(&installer_path)
        .spawn()
        .map_err(|e| format!("Impossible de lancer l'installateur de mise à jour: {e}"))?;

    app.exit(0);
    Ok("Installateur de mise à jour lancé.".into())
}

fn require_file(value: &str, label: &str) -> Result<PathBuf, String> {
    let path = require_file_path(value, label)?;
    if !path.is_file() {
        return Err(format!("{label} introuvable: {}", path.display()));
    }
    Ok(path)
}

fn require_file_path(value: &str, label: &str) -> Result<PathBuf, String> {
    if value.trim().is_empty() {
        return Err(format!("{label} non configuré"));
    }
    Ok(PathBuf::from(value))
}

fn normalized_hash(value: &Option<String>) -> Option<String> {
    value.as_ref().map(|s| s.trim().to_ascii_lowercase()).filter(|s| !s.is_empty())
}

fn sha256_file(path: &Path) -> Result<String, String> {
    let mut file = File::open(path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 1024 * 1024];
    loop {
        let read = file.read(&mut buffer).map_err(|e| e.to_string())?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

fn safe_filename(value: &str) -> String {
    value
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.') { c } else { '_' })
        .collect()
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_state,
            save_settings,
            refresh_theme_status,
            update_theme,
            restore_latest_theme_backup,
            list_surf_patches,
            apply_surf_patch,
            restore_original_rom,
            show_vanity_webview,
            hide_vanity_webview,
            reload_vanity_webview,
            check_companion_update,
            install_companion_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Alya Companion");
}
