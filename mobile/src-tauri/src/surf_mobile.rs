use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{fs, io::Read, path::{Path, PathBuf}};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Deserialize)]
struct SurfPatchManifest {
    patches: Vec<SurfPatch>,
}

#[derive(Debug, Clone, Deserialize)]
struct SurfPatch {
    id: String,
    name: String,
    patch_file: String,
    patch_sha256: String,
    expected_source_sha256: Option<String>,
    expected_output_sha256: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MobileSurfPatchResult {
    pub patch_id: String,
    pub patch_name: String,
    pub output_path: String,
    pub output_sha256: String,
    pub source_sha256: String,
}

fn sha256_file(path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(path)
        .map_err(|e| format!("Impossible d'ouvrir {}: {e}", path.display()))?;
    let mut hasher = Sha256::new();
    let mut buffer = vec![0u8; 1024 * 1024];
    loop {
        let read = file.read(&mut buffer)
            .map_err(|e| format!("Lecture impossible pour {}: {e}", path.display()))?;
        if read == 0 { break; }
        hasher.update(&buffer[..read]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

fn surf_resources_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let bundled = app.path().resource_dir()
        .map_err(|e| format!("Dossier resources introuvable: {e}"))?
        .join("resources")
        .join("surf");
    if bundled.join("patches.json").is_file() {
        return Ok(bundled);
    }

    let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("surf");
    if dev.join("patches.json").is_file() {
        return Ok(dev);
    }

    Err("Ressources Surf introuvables (resources/surf/patches.json).".into())
}

fn load_manifest(app: &AppHandle) -> Result<(PathBuf, SurfPatchManifest), String> {
    let dir = surf_resources_dir(app)?;
    let raw = fs::read_to_string(dir.join("patches.json"))
        .map_err(|e| format!("Lecture du manifeste Surf impossible: {e}"))?;
    let manifest = serde_json::from_str::<SurfPatchManifest>(&raw)
        .map_err(|e| format!("Manifeste Surf invalide: {e}"))?;
    Ok((dir, manifest))
}

#[tauri::command]
pub async fn mobile_surf_hash_file(path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || sha256_file(Path::new(&path)))
        .await
        .map_err(|e| format!("Tache SHA-256 interrompue: {e}"))?
}

#[tauri::command]
pub async fn mobile_surf_apply_patch(
    app: AppHandle,
    source_path: String,
    patch_id: String,
) -> Result<MobileSurfPatchResult, String> {
    let source_path = PathBuf::from(source_path);
    let app_for_task = app.clone();

    tauri::async_runtime::spawn_blocking(move || {
        if !source_path.is_file() {
            return Err("Backup ROM original introuvable. Resélectionne ta ROM.".to_string());
        }

        let (resource_dir, manifest) = load_manifest(&app_for_task)?;
        let patch = manifest.patches.into_iter()
            .find(|p| p.id == patch_id)
            .ok_or_else(|| format!("Profil Surf inconnu: {patch_id}"))?;

        let source_hash = sha256_file(&source_path)?;
        if let Some(expected) = patch.expected_source_sha256.as_deref() {
            if !expected.is_empty() && !source_hash.eq_ignore_ascii_case(expected) {
                return Err(format!(
                    "ROM incompatible avec ce profil Surf. SHA-256 attendu: {expected}; obtenu: {source_hash}"
                ));
            }
        }

        let patch_path = resource_dir.join(&patch.patch_file);
        if !patch_path.is_file() {
            return Err(format!("Patch Surf introuvable: {}", patch.patch_file));
        }
        let patch_hash = sha256_file(&patch_path)?;
        if !patch_hash.eq_ignore_ascii_case(&patch.patch_sha256) {
            return Err(format!("Patch Surf corrompu: {}", patch.patch_file));
        }

        let work_dir = app_for_task.path().app_data_dir()
            .map_err(|e| format!("Dossier ALYA inaccessible: {e}"))?
            .join("surf-mobile");
        fs::create_dir_all(&work_dir)
            .map_err(|e| format!("Création du dossier Surf impossible: {e}"))?;
        let output_path = work_dir.join("patched-output.nds");
        let _ = fs::remove_file(&output_path);

        oxidelta::io::decode_file(&source_path, &patch_path, &output_path)
            .map_err(|e| format!("Application xdelta impossible: {e}"))?;

        let output_hash = sha256_file(&output_path)?;
        if let Some(expected) = patch.expected_output_sha256.as_deref() {
            if !expected.is_empty() && !output_hash.eq_ignore_ascii_case(expected) {
                let _ = fs::remove_file(&output_path);
                return Err(format!(
                    "Le résultat du patch ne correspond pas au SHA-256 attendu. Attendu: {expected}; obtenu: {output_hash}"
                ));
            }
        }

        Ok(MobileSurfPatchResult {
            patch_id: patch.id,
            patch_name: patch.name,
            output_path: output_path.to_string_lossy().into_owned(),
            output_sha256: output_hash,
            source_sha256: source_hash,
        })
    })
    .await
    .map_err(|e| format!("Tache Surf interrompue: {e}"))?
}
