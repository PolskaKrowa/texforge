//! File system access, recent files, misc app commands.

use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, WebviewWindow};

pub(crate) fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// The per-user application data directory (created on demand).
pub(crate) fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not resolve the app data directory: {e}"))?;
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Could not create the app data directory: {e}"))?;
    Ok(dir)
}

// ---------------------------------------------------------------------------
// Plain file access (used instead of the fs plugin so that no extra
// capability scopes are required — these are our own trusted commands)
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    let bytes =
        std::fs::read(&path).map_err(|e| format!("Could not read '{path}': {e}"))?;
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

#[tauri::command]
pub fn write_text_file(path: String, contents: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(&path, contents).map_err(|e| format!("Could not save '{path}': {e}"))
}

#[tauri::command]
pub fn write_pdf_from_b64(path: String, pdf_b64: String) -> Result<(), String> {
    let bytes = B64
        .decode(pdf_b64.as_bytes())
        .map_err(|e| format!("Invalid PDF payload: {e}"))?;
    std::fs::write(&path, bytes).map_err(|e| format!("Could not write '{path}': {e}"))
}

/// Reveal a file in the platform file manager (selects the file on Windows).
#[tauri::command]
pub fn show_in_folder(path: String) -> Result<(), String> {
    let target = PathBuf::from(&path);
    if !target.is_file() {
        return Err("File not found.".into());
    }
    #[cfg(target_os = "windows")]
    let result = std::process::Command::new("explorer")
        .arg(format!("/select,{}", target.display()))
        .spawn();
    #[cfg(target_os = "linux")]
    let result = std::process::Command::new("xdg-open")
        .arg(target.parent().unwrap_or(Path::new(".")))
        .spawn();
    #[cfg(target_os = "macos")]
    let result = std::process::Command::new("open").arg("-R").arg(&target).spawn();
    result
        .map(|_| ())
        .map_err(|e| format!("Could not open the file manager: {e}"))
}

/// Force-close the window, bypassing the close-requested handler (used after
/// the frontend has shown its own unsaved-changes dialog).
#[tauri::command]
pub fn force_exit(window: WebviewWindow) {
    let _ = window.destroy();
}

#[tauri::command]
pub fn get_app_info(app: AppHandle) -> serde_json::Value {
    let info = app.package_info();
    serde_json::json!({
        "name": &info.name,
        "version": info.version.to_string(),
    })
}

// ---------------------------------------------------------------------------
// Recent files (persisted in `<app_data>/recents.json`)
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RecentFile {
    pub path: String,
    pub name: String,
    pub updated_at: u64,
}

fn recents_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(data_dir(app)?.join("recents.json"))
}

fn load_recents(app: &AppHandle) -> Vec<RecentFile> {
    match recents_path(app) {
        Ok(p) => std::fs::read_to_string(p)
            .ok()
            .and_then(|text| serde_json::from_str(&text).ok())
            .unwrap_or_default(),
        Err(_) => Vec::new(),
    }
}

fn save_recents(app: &AppHandle, list: &[RecentFile]) {
    if let Ok(p) = recents_path(app) {
        if let Ok(json) = serde_json::to_string_pretty(list) {
            let _ = std::fs::write(p, json);
        }
    }
}

#[tauri::command]
pub fn get_recents(app: AppHandle) -> Vec<RecentFile> {
    let mut list = load_recents(&app);
    let before = list.len();
    // Drop files that no longer exist.
    list.retain(|r| Path::new(&r.path).exists());
    if list.len() != before {
        save_recents(&app, &list);
    }
    list
}

#[tauri::command]
pub fn push_recent(app: AppHandle, path: String) {
    let name = Path::new(&path)
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.clone());
    let entry = RecentFile {
        path: path.clone(),
        name,
        updated_at: now_secs(),
    };
    let mut list = load_recents(&app);
    list.retain(|r| r.path != path);
    list.insert(0, entry);
    list.truncate(10);
    save_recents(&app, &list);
}

#[tauri::command]
pub fn clear_recents(app: AppHandle) {
    if let Ok(p) = recents_path(&app) {
        let _ = std::fs::remove_file(p);
    }
}
