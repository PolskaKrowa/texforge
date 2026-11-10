// Prevents an additional console window on Windows in release builds.
// Do NOT remove this—see https://tauri.app/develop/calling-rust/
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    texforge_lib::run()
}
