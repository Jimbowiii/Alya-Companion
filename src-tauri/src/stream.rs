use tauri::Manager;
use url::Url;

const STREAM_EMBEDDED_LABEL: &str = "stream-embedded";
const STREAM_MINI_LABEL: &str = "stream-mini";

fn parse_stream_url(raw: &str) -> Result<Url, String> {
    let url = Url::parse(raw.trim()).map_err(|error| format!("URL Stream invalide: {error}"))?;
    match url.scheme() {
        "http" | "https" => Ok(url),
        _ => Err("L'onglet Stream accepte uniquement les URL http:// ou https://".into()),
    }
}

#[tauri::command]
pub async fn show_stream_webview(
    app: tauri::AppHandle,
    window: tauri::Window,
    url: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let url = parse_stream_url(&url)?;
    let position = tauri::PhysicalPosition::new(x.max(0.0).round() as i32, y.max(0.0).round() as i32);
    let size = tauri::PhysicalSize::new(width.max(1.0).round() as u32, height.max(1.0).round() as u32);

    if let Some(webview) = app.get_webview(STREAM_EMBEDDED_LABEL) {
        webview.set_position(position).map_err(|error| error.to_string())?;
        webview.set_size(size).map_err(|error| error.to_string())?;
        webview.show().map_err(|error| error.to_string())?;
        return Ok(());
    }

    let builder = tauri::webview::WebviewBuilder::new(
        STREAM_EMBEDDED_LABEL,
        tauri::WebviewUrl::External(url),
    );

    let webview = window
        .add_child(builder, position, size)
        .map_err(|error| format!("Impossible de creer la WebView Stream: {error}"))?;

    webview.show().map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn hide_stream_webview(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(webview) = app.get_webview(STREAM_EMBEDDED_LABEL) {
        webview.hide().map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn reload_stream_webview(app: tauri::AppHandle) -> Result<(), String> {
    let webview = app
        .get_webview(STREAM_EMBEDDED_LABEL)
        .ok_or_else(|| "La WebView Stream n'est pas encore ouverte.".to_string())?;
    webview.reload().map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn open_stream_mini(
    app: tauri::AppHandle,
    url: String,
    title: String,
) -> Result<(), String> {
    let url = parse_stream_url(&url)?;

    if let Some(window) = app.get_webview_window(STREAM_MINI_LABEL) {
        window.set_always_on_top(true).map_err(|error| error.to_string())?;
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        return Ok(());
    }

    let window_title = if title.trim().is_empty() {
        "ALYA Stream".to_string()
    } else {
        title.trim().to_string()
    };

    let mini = tauri::WebviewWindowBuilder::new(
        &app,
        STREAM_MINI_LABEL,
        tauri::WebviewUrl::External(url),
    )
    .title(window_title)
    .inner_size(720.0, 405.0)
    .min_inner_size(360.0, 220.0)
    .resizable(true)
    .decorations(true)
    .always_on_top(true)
    .build()
    .map_err(|error| format!("Impossible d'ouvrir la mini fenetre Stream: {error}"))?;

    mini.set_always_on_top(true).map_err(|error| error.to_string())?;
    mini.set_focus().map_err(|error| error.to_string())?;
    Ok(())
}
