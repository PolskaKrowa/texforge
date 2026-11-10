//! User-created document templates, persisted as JSON files inside
//! `<app_data>/templates/`. The built-in templates live in the frontend
//! bundle (see `src/builtinTemplates.ts`) so they can be reused by the
//! browser dev mode; this module only manages user-saved ones.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::fsops::{data_dir, now_secs};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UserTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    /// "beamer" | "article" | "basic"
    pub kind: String,
    pub created_at: u64,
    pub content: String,
}

fn templates_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = data_dir(app)?.join("templates");
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Could not create the templates directory: {e}"))?;
    Ok(dir)
}

#[tauri::command]
pub fn list_user_templates(app: AppHandle) -> Vec<UserTemplate> {
    let dir = match templates_dir(&app) {
        Ok(d) => d,
        Err(_) => return Vec::new(),
    };
    let mut out: Vec<UserTemplate> = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.extension().map(|e| e == "json").unwrap_or(false) {
                if let Ok(text) = std::fs::read_to_string(&p) {
                    if let Ok(t) = serde_json::from_str::<UserTemplate>(&text) {
                        out.push(t);
                    }
                }
            }
        }
    }
    out.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    out
}

#[tauri::command]
pub fn save_user_template(
    app: AppHandle,
    name: String,
    description: String,
    kind: String,
    content: String,
) -> Result<UserTemplate, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Please give the template a name.".into());
    }
    let dir = templates_dir(&app)?;
    let t = UserTemplate {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        description: description.trim().to_string(),
        kind: if kind.is_empty() {
            "basic".into()
        } else {
            kind
        },
        created_at: now_secs(),
        content,
    };
    let file = dir.join(format!("{}.json", t.id));
    let json = serde_json::to_string_pretty(&t)
        .map_err(|e| format!("Could not encode the template: {e}"))?;
    std::fs::write(&file, json).map_err(|e| format!("Could not save the template: {e}"))?;
    Ok(t)
}

#[tauri::command]
pub fn get_user_template(app: AppHandle, id: String) -> Option<String> {
    let dir = templates_dir(&app).ok()?;
    std::fs::read_to_string(dir.join(format!("{id}.json")))
        .ok()
        .and_then(|text| serde_json::from_str::<UserTemplate>(&text).ok())
        .map(|t| t.content)
}

#[tauri::command]
pub fn delete_user_template(app: AppHandle, id: String) -> Result<bool, String> {
    let dir = templates_dir(&app)?;
    let file = dir.join(format!("{id}.json"));
    if file.exists() {
        std::fs::remove_file(&file).map_err(|e| format!("Could not delete the template: {e}"))?;
        Ok(true)
    } else {
        Ok(false)
    }
}
