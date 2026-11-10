//! Native open/save dialogs.
//!
//! The dialog plugin's blocking APIs must never run on the main thread, so
//! each command shuttles the blocking call onto a dedicated OS thread and
//! waits for the result over a channel.

use std::sync::mpsc;

use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

fn file_path_to_string(picked: Option<tauri_plugin_dialog::FilePath>) -> Option<String> {
    picked
        .and_then(|f| f.into_path().ok())
        .map(|p| p.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn pick_open_file(app: AppHandle) -> Option<String> {
    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let picked = app
            .dialog()
            .file()
            .set_title("Open a LaTeX Document")
            .add_filter("LaTeX sources", &["tex", "ltx"])
            .add_filter("All files", &["*"])
            .blocking_pick_file();
        let _ = tx.send(file_path_to_string(picked));
    });
    rx.recv().unwrap_or(None)
}

#[tauri::command]
pub async fn pick_save_tex_file(app: AppHandle, default_name: String) -> Option<String> {
    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let picked = app
            .dialog()
            .file()
            .set_title("Save LaTeX Document")
            .set_file_name(default_name)
            .add_filter("LaTeX source", &["tex"])
            .blocking_save_file();
        let _ = tx.send(file_path_to_string(picked));
    });
    rx.recv().unwrap_or(None)
}

#[tauri::command]
pub async fn pick_save_pdf_file(app: AppHandle, default_name: String) -> Option<String> {
    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let picked = app
            .dialog()
            .file()
            .set_title("Export PDF")
            .set_file_name(default_name)
            .add_filter("PDF document", &["pdf"])
            .blocking_save_file();
        let _ = tx.send(file_path_to_string(picked));
    });
    rx.recv().unwrap_or(None)
}
