//! TexForge — a LaTeX editor with a live PDF preview.
//!
//! The Rust side of the app owns everything that touches the real system:
//! file dialogs, reading/writing files, running LaTeX engines, parsing their
//! logs and persisting user templates + recent files. The webview talks to
//! these modules exclusively through the `#[tauri::command]`s wired up below.

mod compile;
mod dialogs;
mod fsops;
mod templates;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            compile::detect_engines,
            compile::compile_latex,
            dialogs::pick_open_file,
            dialogs::pick_save_tex_file,
            dialogs::pick_save_pdf_file,
            fsops::read_text_file,
            fsops::write_text_file,
            fsops::write_pdf_from_b64,
            fsops::show_in_folder,
            fsops::force_exit,
            fsops::get_app_info,
            fsops::get_recents,
            fsops::push_recent,
            fsops::clear_recents,
            templates::list_user_templates,
            templates::get_user_template,
            templates::save_user_template,
            templates::delete_user_template,
        ])
        .run(tauri::generate_context!())
        .expect("error while running texforge");
}
