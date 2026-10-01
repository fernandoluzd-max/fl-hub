// Pluga & Edita: janela do aplicativo. Toda a lógica de instalação fica no núcleo (flcore).
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
fn status(app: tauri::AppHandle) -> Status {
    let env = Env::detect();
    let uds = env.capcut_user_data();
    Status {
        capcut_found: !uds.is_empty(),
        capcut_running: capcut_running(),
        user_data: uds.iter().map(|p| p.to_string_lossy().to_string()).collect(),
        installed: flcore::installed(&env),
        system: format!("{:?}", env.target),
        version: app.package_info().version.to_string(),
    }
}

fn instalar_arquivo(app: &tauri::AppHandle, arquivo: &PathBuf, esperado: Option<&str>) -> Result<flcore::Report, String> {
    let env = Env::detect();
    let tmp = std::env::temp_dir().join(format!("plugaedita-{}", std::process::id()));
    let _ = app.emit("progress", "Preparando o pacote…");
    let pack = Pack::open(arquivo, &tmp).map_err(|e| format!("Pacote inválido: {e}"))?;
    if let Some(id) = esperado {
        if pack.manifest.id != id {
            let _ = std::fs::remove_dir_all(&tmp);
            return Err("O pacote recebido não corresponde a este pack.".into());
        }
    }
    let r = flcore::install(&env, &pack, &mut |m| {
        let _ = app.emit("progress", m);
    });
    let _ = std::fs::remove_dir_all(&tmp); // o conteúdo extraído não fica no computador
    r
}

/// Baixa o pack do servidor (link temporário) e instala. Nada fica salvo para o aluno.
#[tauri::command]
async fn install_remote(app: tauri::AppHandle, url: String, pack_id: String) -> Result<flcore::Report, String> {
    tauri::async_runtime::spawn_blocking(move || {
        use std::io::{Read, Write};
        let _ = app.emit("progress", "Baixando o pack…");
        let cli = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(900))
            .build()
            .map_err(|e| e.to_string())?;
        let mut resp = cli.get(&url).send().map_err(|e| format!("Sem conexão com o servidor: {e}"))?;
        if !resp.status().is_success() {
            return Err(format!("Download negado pelo servidor ({}). Confira se a compra está ativa.", resp.status()));
        }
        let total = resp.content_length().unwrap_or(0);
        let arq = std::env::temp_dir().join(format!("plugaedita-{}.bin", std::process::id()));
        let mut f = std::fs::File::create(&arq).map_err(|e| e.to_string())?;
        let (mut feito, mut ultimo) = (0u64, 0u64);
        let mut buf = vec![0u8; 256 * 1024];
        loop {
            let n = resp.read(&mut buf).map_err(|e| format!("Download interrompido: {e}"))?;
            if n == 0 {
                break;
            }
            f.write_all(&buf[..n]).map_err(|e| e.to_string())?;
            feito += n as u64;
            if total > 0 {
                let pct = feito * 100 / total;
                if pct >= ultimo + 25 && pct < 100 {
                    ultimo = pct - pct % 25;
                    let _ = app.emit("progress", format!("Baixando… {ultimo}%"));
                }
            }
        }
        drop(f);
        let r = instalar_arquivo(&app, &arq, Some(&pack_id));
        let _ = std::fs::remove_file(&arq);
        r
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Só para desenvolvimento: instalar de um arquivo .flpack local.
#[cfg(debug_assertions)]
#[tauri::command]
async fn install_pack(app: tauri::AppHandle, path: String) -> Result<flcore::Report, String> {
    tauri::async_runtime::spawn_blocking(move || instalar_arquivo(&app, &PathBuf::from(&path), None))
        .await
        .map_err(|e| e.to_string())?
}
#[cfg(not(debug_assertions))]
#[tauri::command]
async fn install_pack(_path: String) -> Result<flcore::Report, String> {
    Err("Indisponível nesta versão.".into())
}

/// Abre no Finder/Explorer a pasta de um pacote de sons instalado.
#[tauri::command]
fn open_media(id: String) -> Result<(), String> {
    let env = Env::detect();
    let st = flcore::installed(&env).into_iter().find(|i| i.id == id).ok_or("Pacote não instalado.")?;
    let p = PathBuf::from(&st.media_path);
    if !p.exists() {
        return Err("Pasta não encontrada. Clique em Remover e depois em Instalar.".into());
    }
    #[cfg(target_os = "macos")]
    let r = std::process::Command::new("open").arg(&p).spawn();
    #[cfg(windows)]
    let r = std::process::Command::new("explorer").arg(&p).spawn();
    #[cfg(not(any(target_os = "macos", windows)))]
    let r = std::process::Command::new("xdg-open").arg(&p).spawn();
    r.map(|_| ()).map_err(|e| e.to_string())
}

/// Sessão de login guardada só neste computador.
#[tauri::command]
fn session_get() -> String {
    std::fs::read_to_string(Env::detect().data_dir.join("sessao.json")).unwrap_or_default()
}
#[tauri::command]
fn session_set(data: String) -> Result<(), String> {
    let dir = Env::detect().data_dir;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let p = dir.join("sessao.json");
    if data.is_empty() {
        let _ = std::fs::remove_file(&p);
        return Ok(());
    }
    std::fs::write(&p, data).map_err(|e| e.to_string())
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
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![status, install_pack, install_remote, uninstall_pack, diagnose, log_text, session_get, session_set, open_media])
        .setup(|app| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_title("Pluga & Edita");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Pluga & Edita");
}
