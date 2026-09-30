// FL Hub: janela do aplicativo. Toda a lógica de instalação fica no núcleo (flcore).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use flcore::{env::capcut_running, Env, Pack};
use serde::Serialize;
use std::path::PathBuf;
use tauri::{Emitter, Manager};

#[derive(Serialize)]
struct Status {
    capcut_found: bool,
    capcut_running: bool,
    user_data: Vec<String>,
    installed: Vec<flcore::Installed>,
    system: String,
    version: String,
}

#[tauri::command]
fn status() -> Status {
    let env = Env::detect();
    let uds = env.capcut_user_data();
    Status {
        capcut_found: !uds.is_empty(),
        capcut_running: capcut_running(),
        user_data: uds.iter().map(|p| p.to_string_lossy().to_string()).collect(),
        installed: flcore::installed(&env),
        system: format!("{:?}", env.target),
        version: env!("CARGO_PKG_VERSION").into(),
    }
}

/// Instala um pacote .flpack. Mensagens de progresso vão para o evento "progress".
#[tauri::command]
async fn install_pack(app: tauri::AppHandle, path: String) -> Result<flcore::Report, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let env = Env::detect();
        let tmp = std::env::temp_dir().join(format!("plugaedita-{}", std::process::id()));
        let _ = app.emit("progress", "Preparando o pacote…");
        let pack = Pack::open(&PathBuf::from(&path), &tmp).map_err(|e| format!("Pacote inválido: {e}"))?;
        let r = flcore::install(&env, &pack, &mut |m| {
            let _ = app.emit("progress", m);
        });
        let _ = std::fs::remove_dir_all(&tmp); // o conteúdo extraído não fica no computador
        r
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn uninstall_pack(app: tauri::AppHandle, id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let env = Env::detect();
        flcore::uninstall(&env, &id, &mut |m| {
            let _ = app.emit("progress", m);
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
fn diagnose() -> String {
    flcore::diagnose(&Env::detect())
}

#[tauri::command]
fn log_text() -> String {
    std::fs::read_to_string(Env::detect().log_path()).unwrap_or_default()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![status, install_pack, uninstall_pack, diagnose, log_text])
        .setup(|app| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_title("Pluga & Edita");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Pluga & Edita");
}
