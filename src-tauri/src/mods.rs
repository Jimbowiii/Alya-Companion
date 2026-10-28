use aes::Aes128;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use ctr::cipher::{KeyIvInit, StreamCipher};
use regex::Regex;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File},
    io::{Read, Write},
    path::{Path, PathBuf},
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager};

use super::{ensure_game_closed, load_settings, pokemmo_mods_dir};

const DOWNLOAD_EVENT: &str = "alya-mod-download-progress";
const USER_AGENT_VALUE: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0";

type MegaCipher = ctr::Ctr128BE<Aes128>;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteModFile {
    pub url: String,
    pub file_name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DownloadProgress {
    mod_id: String,
    file_name: String,
    file_index: usize,
    file_count: usize,
    downloaded: u64,
    total: Option<u64>,
    percent: Option<f64>,
    stage: &'static str,
}

fn emit_progress(
    app: &AppHandle,
    mod_id: &str,
    file_name: &str,
    file_index: usize,
    file_count: usize,
    downloaded: u64,
    total: Option<u64>,
    stage: &'static str,
) {
    let percent = total.and_then(|value| {
        if value == 0 {
            None
        } else {
            Some((downloaded as f64 / value as f64 * 100.0).clamp(0.0, 100.0))
        }
    });
    let _ = app.emit(
        DOWNLOAD_EVENT,
        DownloadProgress {
            mod_id: mod_id.to_string(),
            file_name: file_name.to_string(),
            file_index,
            file_count,
            downloaded,
            total,
            percent,
            stage,
        },
    );
}

fn mods_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let settings = load_settings(app)?;
    pokemmo_mods_dir(&settings)
}

fn safe_file_name(name: &str) -> Result<String, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Nom de fichier vide.".into());
    }
    let path = Path::new(trimmed);
    if path.components().count() != 1 || path.file_name().and_then(|v| v.to_str()) != Some(trimmed) {
        return Err("Nom de fichier de mod invalide.".into());
    }
    let ext = path
        .extension()
        .and_then(|v| v.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if ext != "mod" && ext != "zip" {
        return Err("Seuls les fichiers .mod et .zip sont autorisés.".into());
    }
    Ok(trimmed.to_string())
}

fn sha256_file_local(path: &Path) -> Result<String, String> {
    let mut file = File::open(path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 256 * 1024];
    loop {
        let read = file.read(&mut buffer).map_err(|e| e.to_string())?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(hasher.finalize().iter().map(|b| format!("{b:02x}")).collect())
}

fn atomic_copy(source: &Path, target: &Path) -> Result<(), String> {
    let part = PathBuf::from(format!("{}.part", target.display()));
    let _ = fs::remove_file(&part);
    fs::copy(source, &part).map_err(|e| format!("Copie du mod impossible : {e}"))?;
    let _ = fs::remove_file(target);
    fs::rename(&part, target).map_err(|e| format!("Finalisation du mod impossible : {e}"))?;
    Ok(())
}

fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent(USER_AGENT_VALUE)
        .redirect(reqwest::redirect::Policy::limited(12))
        .build()
        .map_err(|e| e.to_string())
}

async fn mediafire_direct_url(client: &reqwest::Client, page_url: &str) -> Result<String, String> {
    let html = client
        .get(page_url)
        .send()
        .await
        .map_err(|e| format!("MediaFire inaccessible : {e}"))?
        .error_for_status()
        .map_err(|e| format!("MediaFire a refusé la requête : {e}"))?
        .text()
        .await
        .map_err(|e| e.to_string())?;

    let patterns = [
        r#"id=[\"']downloadButton[\"'][^>]*href=[\"']([^\"']+)[\"']"#,
        r#"href=[\"']([^\"']+)[\"'][^>]*id=[\"']downloadButton[\"']"#,
        r#"aria-label=[\"']Download file[\"'][^>]*href=[\"']([^\"']+)[\"']"#,
        r#"href=[\"']([^\"']+)[\"'][^>]*aria-label=[\"']Download file[\"']"#,
    ];

    for pattern in patterns {
        let regex = Regex::new(pattern).map_err(|e| e.to_string())?;
        if let Some(captures) = regex.captures(&html) {
            if let Some(value) = captures.get(1) {
                return Ok(value
                    .as_str()
                    .replace("&amp;", "&")
                    .replace("&#38;", "&"));
            }
        }
    }
    Err("MediaFire n'a pas fourni de lien de téléchargement exploitable.".into())
}

fn google_drive_direct_url(url: &str) -> Result<String, String> {
    let regex = Regex::new(r#"drive\.google\.com/file/d/([^/]+)"#).map_err(|e| e.to_string())?;
    let id = regex
        .captures(url)
        .and_then(|caps| caps.get(1))
        .map(|m| m.as_str())
        .ok_or_else(|| "Lien Google Drive non reconnu.".to_string())?;
    Ok(format!(
        "https://drive.usercontent.google.com/download?id={id}&export=download&confirm=t"
    ))
}


async fn google_drive_response(client: &reqwest::Client, source_url: &str) -> Result<reqwest::Response, String> {
    let direct = google_drive_direct_url(source_url)?;
    let response = client
        .get(&direct)
        .send()
        .await
        .map_err(|e| format!("Google Drive inaccessible : {e}"))?
        .error_for_status()
        .map_err(|e| format!("Google Drive a refusé la requête : {e}"))?;

    let is_html = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .map(|v| v.to_ascii_lowercase().contains("text/html"))
        .unwrap_or(false);
    if !is_html {
        return Ok(response);
    }

    let html = response.text().await.map_err(|e| e.to_string())?;
    let action_re = Regex::new(r#"<form[^>]+id=[\"']download-form[\"'][^>]+action=[\"']([^\"']+)[\"']"#)
        .map_err(|e| e.to_string())?;
    let action_re_alt = Regex::new(r#"<form[^>]+action=[\"']([^\"']+)[\"'][^>]+id=[\"']download-form[\"']"#)
        .map_err(|e| e.to_string())?;
    let action = action_re
        .captures(&html)
        .or_else(|| action_re_alt.captures(&html))
        .and_then(|caps| caps.get(1))
        .map(|m| m.as_str().replace("&amp;", "&"))
        .unwrap_or_else(|| "https://drive.usercontent.google.com/download".to_string());
    let input_re = Regex::new(r#"<input[^>]+type=[\"']hidden[\"'][^>]+name=[\"']([^\"']+)[\"'][^>]+value=[\"']([^\"']*)[\"'][^>]*>"#)
        .map_err(|e| e.to_string())?;
    let input_re_alt = Regex::new(r#"<input[^>]+name=[\"']([^\"']+)[\"'][^>]+value=[\"']([^\"']*)[\"'][^>]+type=[\"']hidden[\"'][^>]*>"#)
        .map_err(|e| e.to_string())?;
    let mut target = url::Url::parse(&action).map_err(|e| format!("URL Google Drive invalide : {e}"))?;
    {
        let mut pairs = target.query_pairs_mut();
        let mut found = false;
        for caps in input_re.captures_iter(&html).chain(input_re_alt.captures_iter(&html)) {
            let name = caps.get(1).unwrap().as_str();
            let value = caps.get(2).unwrap().as_str().replace("&amp;", "&");
            pairs.append_pair(name, &value);
            found = true;
        }
        if !found {
            let id_re = Regex::new(r#"drive\.google\.com/file/d/([^/]+)"#).map_err(|e| e.to_string())?;
            let id = id_re
                .captures(source_url)
                .and_then(|caps| caps.get(1))
                .map(|m| m.as_str())
                .ok_or_else(|| "Confirmation Google Drive introuvable.".to_string())?;
            pairs.append_pair("id", id);
            pairs.append_pair("export", "download");
            pairs.append_pair("confirm", "t");
        }
    }
    client
        .get(target)
        .send()
        .await
        .map_err(|e| format!("Téléchargement Google Drive impossible : {e}"))?
        .error_for_status()
        .map_err(|e| format!("Google Drive a refusé le téléchargement : {e}"))
}

async fn resolve_standard_url(client: &reqwest::Client, url: &str) -> Result<String, String> {
    let parsed = url::Url::parse(url).map_err(|_| "URL de mod invalide.".to_string())?;
    if parsed.scheme() != "https" {
        return Err("Seules les URL HTTPS sont autorisées.".into());
    }
    let host = parsed.host_str().unwrap_or_default().to_ascii_lowercase();
    if host.ends_with("mediafire.com") {
        return mediafire_direct_url(client, url).await;
    }
    if host == "drive.google.com" || host.ends_with(".drive.google.com") {
        return google_drive_direct_url(url);
    }
    Ok(url.to_string())
}

async fn stream_response(
    app: &AppHandle,
    mod_id: &str,
    file_name: &str,
    file_index: usize,
    file_count: usize,
    mut response: reqwest::Response,
    target: &Path,
) -> Result<(), String> {
    response = response
        .error_for_status()
        .map_err(|e| format!("Téléchargement refusé : {e}"))?;
    let is_html = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .map(|v| v.to_ascii_lowercase().contains("text/html"))
        .unwrap_or(false);
    if is_html {
        return Err("L'hébergeur a renvoyé une page web au lieu du fichier du mod.".into());
    }
    let total = response.content_length();
    let mut output = File::create(target).map_err(|e| e.to_string())?;
    let mut downloaded = 0u64;
    while let Some(chunk) = response.chunk().await.map_err(|e| format!("Lecture réseau impossible : {e}"))? {
        output.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;
        emit_progress(app, mod_id, file_name, file_index, file_count, downloaded, total, "downloading");
    }
    output.flush().map_err(|e| e.to_string())?;
    if downloaded == 0 {
        return Err("Le fichier téléchargé est vide.".into());
    }
    Ok(())
}

fn parse_mega_link(link: &str) -> Result<(String, Vec<u8>), String> {
    let regex = Regex::new(r#"https://mega\.nz/file/([^#/?]+)#([^/?]+)"#).map_err(|e| e.to_string())?;
    let captures = regex.captures(link).ok_or_else(|| "Lien MEGA public non reconnu.".to_string())?;
    let handle = captures.get(1).unwrap().as_str().to_string();
    let key = URL_SAFE_NO_PAD
        .decode(captures.get(2).unwrap().as_str())
        .map_err(|e| format!("Clé MEGA invalide : {e}"))?;
    if key.len() != 32 {
        return Err("Clé MEGA invalide (32 octets attendus).".into());
    }
    Ok((handle, key))
}

async fn mega_download(
    app: &AppHandle,
    client: &reqwest::Client,
    mod_id: &str,
    file_name: &str,
    file_index: usize,
    file_count: usize,
    source_url: &str,
    target: &Path,
) -> Result<(), String> {
    let (handle, file_key) = parse_mega_link(source_url)?;
    let request_id = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(1);
    let api_url = format!("https://g.api.mega.co.nz/cs?id={request_id}");
    let body = serde_json::json!([{ "a": "g", "g": 1, "p": handle }]);
    let value: serde_json::Value = client
        .post(api_url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("MEGA inaccessible : {e}"))?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    let item = value.get(0).ok_or_else(|| "Réponse MEGA vide.".to_string())?;
    if let Some(code) = item.as_i64() {
        return Err(format!("MEGA a retourné l'erreur {code}."));
    }
    let download_url = item
        .get("g")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "MEGA n'a pas fourni d'URL de téléchargement.".to_string())?;
    let api_size = item.get("s").and_then(|v| v.as_u64());

    let mut aes_key = [0u8; 16];
    for index in 0..16 {
        aes_key[index] = file_key[index] ^ file_key[index + 16];
    }
    let mut iv = [0u8; 16];
    iv[..8].copy_from_slice(&file_key[16..24]);
    let mut cipher = MegaCipher::new_from_slices(&aes_key, &iv).map_err(|_| "Paramètres MEGA AES invalides.".to_string())?;

    let mut response = client
        .get(download_url)
        .send()
        .await
        .map_err(|e| format!("Téléchargement MEGA impossible : {e}"))?
        .error_for_status()
        .map_err(|e| e.to_string())?;
    let total = response.content_length().or(api_size);
    let mut output = File::create(target).map_err(|e| e.to_string())?;
    let mut downloaded = 0u64;
    while let Some(chunk) = response.chunk().await.map_err(|e| e.to_string())? {
        let mut bytes = chunk.to_vec();
        cipher.apply_keystream(&mut bytes);
        output.write_all(&bytes).map_err(|e| e.to_string())?;
        downloaded += bytes.len() as u64;
        emit_progress(app, mod_id, file_name, file_index, file_count, downloaded, total, "downloading");
    }
    output.flush().map_err(|e| e.to_string())?;
    if downloaded == 0 {
        return Err("Le fichier MEGA téléchargé est vide.".into());
    }
    Ok(())
}

async fn download_one(
    app: &AppHandle,
    client: &reqwest::Client,
    mod_id: &str,
    file: &RemoteModFile,
    file_index: usize,
    file_count: usize,
    mods: &Path,
) -> Result<(), String> {
    let file_name = safe_file_name(&file.file_name)?;
    let target = mods.join(&file_name);
    let part = mods.join(format!("{file_name}.part"));
    let _ = fs::remove_file(&part);
    emit_progress(app, mod_id, &file_name, file_index, file_count, 0, None, "resolving");

    let lower_url = file.url.to_ascii_lowercase();
    let result = if lower_url.starts_with("https://mega.nz/file/") {
        mega_download(app, client, mod_id, &file_name, file_index, file_count, &file.url, &part).await
    } else if lower_url.contains("drive.google.com/file/d/") {
        let response = google_drive_response(client, &file.url).await?;
        stream_response(app, mod_id, &file_name, file_index, file_count, response, &part).await
    } else {
        let resolved = resolve_standard_url(client, &file.url).await?;
        let response = client
            .get(resolved)
            .send()
            .await
            .map_err(|e| format!("Téléchargement impossible : {e}"))?;
        stream_response(app, mod_id, &file_name, file_index, file_count, response, &part).await
    };

    if let Err(error) = result {
        let _ = fs::remove_file(&part);
        return Err(error);
    }
    let _ = fs::remove_file(&target);
    fs::rename(&part, &target).map_err(|e| format!("Impossible d'installer {file_name} : {e}"))?;
    let size = fs::metadata(&target).map(|m| m.len()).unwrap_or(0);
    emit_progress(app, mod_id, &file_name, file_index, file_count, size, Some(size), "done");
    Ok(())
}

#[tauri::command]
pub fn mods_list_installed(app: AppHandle) -> Result<Vec<String>, String> {
    let mods = mods_dir(&app)?;
    let mut files = Vec::new();
    for entry in fs::read_dir(mods).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let ext = path.extension().and_then(|v| v.to_str()).unwrap_or_default().to_ascii_lowercase();
        if ext != "mod" && ext != "zip" {
            continue;
        }
        if let Some(name) = path.file_name().and_then(|v| v.to_str()) {
            files.push(name.to_string());
        }
    }
    files.sort_by_key(|name| name.to_ascii_lowercase());
    Ok(files)
}

#[tauri::command]
pub fn mods_install_bundled(
    app: AppHandle,
    resource_file: String,
    target_file: String,
    sha256: String,
) -> Result<(), String> {
    ensure_game_closed()?;
    let resource_file = safe_file_name(&resource_file)?;
    let target_file = safe_file_name(&target_file)?;
    let mods = mods_dir(&app)?;

    let bundled = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join("resources")
        .join("mods-bundled")
        .join(&resource_file);
    let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("mods-bundled")
        .join(&resource_file);
    let source = if bundled.is_file() { bundled } else { dev };
    if !source.is_file() {
        return Err(format!("Mod ALYA embarqué introuvable : {resource_file}"));
    }
    let actual = sha256_file_local(&source)?;
    if !sha256.trim().is_empty() && actual.to_ascii_lowercase() != sha256.trim().to_ascii_lowercase() {
        return Err("Le SHA-256 du mod embarqué ne correspond pas. Installation annulée.".into());
    }
    atomic_copy(&source, &mods.join(target_file))
}

#[tauri::command]
pub async fn mods_download_pack(
    app: AppHandle,
    mod_id: String,
    files: Vec<RemoteModFile>,
) -> Result<(), String> {
    ensure_game_closed()?;
    if files.is_empty() {
        return Err("Ce mod ne contient aucun fichier à télécharger.".into());
    }
    let mods = mods_dir(&app)?;
    let client = client()?;
    let count = files.len();
    for (index, file) in files.iter().enumerate() {
        download_one(&app, &client, &mod_id, file, index + 1, count, &mods).await?;
    }
    Ok(())
}

#[tauri::command]
pub fn mods_remove_files(app: AppHandle, file_names: Vec<String>) -> Result<(), String> {
    ensure_game_closed()?;
    let mods = mods_dir(&app)?;
    for name in file_names {
        let safe = safe_file_name(&name)?;
        let target = mods.join(safe);
        if target.is_file() {
            fs::remove_file(&target).map_err(|e| format!("Suppression impossible : {e}"))?;
        }
        let part = PathBuf::from(format!("{}.part", target.display()));
        if part.is_file() {
            let _ = fs::remove_file(part);
        }
    }
    Ok(())
}

#[tauri::command]
pub fn mods_install_local_file(app: AppHandle, source_path: String) -> Result<String, String> {
    ensure_game_closed()?;
    let source = fs::canonicalize(source_path).map_err(|e| format!("Fichier local introuvable : {e}"))?;
    if !source.is_file() {
        return Err("Le fichier sélectionné est invalide.".into());
    }
    let file_name = source
        .file_name()
        .and_then(|v| v.to_str())
        .ok_or_else(|| "Nom de fichier local invalide.".to_string())?;
    let safe = safe_file_name(file_name)?;
    let mods = mods_dir(&app)?;
    atomic_copy(&source, &mods.join(&safe))?;
    Ok(safe)
}

#[tauri::command]
pub fn mods_open_folder(app: AppHandle) -> Result<(), String> {
    let mods = mods_dir(&app)?;
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer.exe")
            .arg(&mods)
            .spawn()
            .map_err(|e| format!("Impossible d'ouvrir le dossier mods : {e}"))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        return Err(format!("Dossier mods : {}", mods.display()));
    }
    Ok(())
}
