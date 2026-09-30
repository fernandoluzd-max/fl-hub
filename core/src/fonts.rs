//! Instalação de fontes e mapa "nome do arquivo -> caminho instalado".

use crate::env::{fwd, Env, Target};
use crate::pack::Pack;
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

#[derive(Default, Debug, Clone)]
pub struct FontResult {
    /// nome do arquivo em minúsculas -> caminho (com "/") que vai dentro dos arquivos do CapCut
    pub map: BTreeMap<String, String>,
    /// arquivos que o FL Hub criou (para poder remover na desinstalação)
    pub created: Vec<PathBuf>,
    pub log: Vec<String>,
}

pub fn sha256_file(p: &Path) -> io::Result<String> {
    let mut h = Sha256::new();
    let mut f = fs::File::open(p)?;
    io::copy(&mut f, &mut h)?;
    Ok(format!("{:x}", h.finalize()))
}

fn is_font(p: &Path) -> bool {
    matches!(
        p.extension().and_then(|e| e.to_str()).map(|e| e.to_ascii_lowercase()).as_deref(),
        Some("ttf") | Some("otf") | Some("ttc")
    )
}

fn list_fonts(dir: &Path) -> Vec<PathBuf> {
    let mut v: Vec<PathBuf> = fs::read_dir(dir)
        .map(|rd| rd.filter_map(|e| e.ok()).map(|e| e.path()).filter(|p| p.is_file() && is_font(p)).collect())
        .unwrap_or_default();
    v.sort();
    v
}

/// Copia `src` para `dir`, sem sobrescrever uma cópia idêntica e sem falhar se a antiga estiver em uso.
/// Devolve (caminho final, criado_agora).
fn place(src: &Path, dir: &Path) -> io::Result<(PathBuf, bool)> {
    fs::create_dir_all(dir)?;
    let name = src.file_name().unwrap();
    let dest = dir.join(name);
    if dest.exists() && sha256_file(&dest)? == sha256_file(src)? {
        return Ok((dest, false));
    }
    match fs::copy(src, &dest) {
        Ok(_) => Ok((dest, true)),
        Err(_) => {
            // arquivo antigo bloqueado (Windows): instala a versão nova com outro nome
            let stem = src.file_stem().unwrap().to_string_lossy();
            let ext = src.extension().map(|e| e.to_string_lossy().to_string()).unwrap_or_default();
            let alt = dir.join(format!("{stem}-FL.{ext}"));
            if !(alt.exists() && sha256_file(&alt)? == sha256_file(src)?) {
                fs::copy(src, &alt)?;
            }
            Ok((alt, true))
        }
    }
}

pub fn install_fonts(env: &Env, pack: &Pack) -> io::Result<FontResult> {
    let mut r = FontResult::default();
    let m = &pack.manifest;
    let mut arquivos: Vec<PathBuf> = m.fonts_dir.as_ref().map(|d| list_fonts(&pack.root.join(d))).unwrap_or_default();
    if env.target == Target::Windows {
        if let Some(d) = &m.fonts_windows_dir {
            arquivos.extend(list_fonts(&pack.root.join(d)));
        }
    }

    for f in &arquivos {
        let nome = f.file_name().unwrap().to_string_lossy().to_string();
        let destino_capcut: PathBuf = match env.target {
            Target::Mac => {
                // fonte do usuário (aparece no sistema) + cópia no container do CapCut (mesmo lugar do criador)
                let (p_user, c1) = place(f, &env.home.join("Library/Fonts"))?;
                if c1 {
                    r.created.push(p_user.clone());
                }
                if env.mac_container().is_dir() {
                    let (p, c2) = place(f, &env.mac_container().join("Data/Library/Fonts"))?;
                    if c2 {
                        r.created.push(p.clone());
                    }
                    p
                } else {
                    p_user
                }
            }
            Target::Windows => {
                let base = env.local_appdata.clone().unwrap_or_else(|| env.home.join("AppData/Local"));
                let (p, c) = place(f, &base.join("Microsoft").join("Windows").join("Fonts"))?;
                if c {
                    r.created.push(p.clone());
                }
                if env.system_integration {
                    win::register(&p);
                }
                p
            }
            Target::Linux => {
                let (p, c) = place(f, &env.home.join(".local/share/fonts"))?;
                if c {
                    r.created.push(p.clone());
                }
                p
            }
        };
        r.map.insert(nome.to_lowercase(), fwd(&destino_capcut));
        r.log.push(format!("Fonte: {nome}"));
    }

    // substitutas do Windows (fontes que só existem no Mac)
    if env.target == Target::Windows {
        for (mac, sub) in &m.substitutes_windows {
            if let Some(sys) = sub.strip_prefix("SISTEMA:") {
                if let Some(w) = &env.windir {
                    let p = w.join("Fonts").join(sys);
                    if p.exists() {
                        r.map.insert(mac.to_lowercase(), fwd(&p));
                    }
                }
            } else if let Some(p) = r.map.get(&sub.to_lowercase()).cloned() {
                r.map.insert(mac.to_lowercase(), p);
            }
        }
    }
    // apelidos (mesmo arquivo com outro nome)
    for (ap, alvo) in &m.aliases {
        if let Some(p) = r.map.get(&alvo.to_lowercase()).cloned() {
            r.map.insert(ap.to_lowercase(), p);
        }
    }
    Ok(r)
}

/// Remove fontes criadas pelo FL Hub (na desinstalação).
pub fn remove_fonts(env: &Env, files: &[PathBuf]) -> Vec<String> {
    let mut log = vec![];
    for f in files {
        if env.target == Target::Windows && env.system_integration {
            win::unregister(f);
        }
        match fs::remove_file(f) {
            Ok(_) => log.push(format!("Fonte removida: {}", f.display())),
            Err(e) => log.push(format!("Fonte não removida ({e}): {}", f.display())),
        }
    }
    log
}

#[cfg(windows)]
mod win {
    use std::os::windows::ffi::OsStrExt;
    use std::path::Path;
    use winreg::enums::*;
    use winreg::RegKey;
    const KEY: &str = r"Software\Microsoft\Windows NT\CurrentVersion\Fonts";

    fn wide(p: &Path) -> Vec<u16> {
        p.as_os_str().encode_wide().chain(std::iter::once(0)).collect()
    }
    fn value_name(p: &Path) -> String {
        let stem = p.file_stem().unwrap().to_string_lossy();
        let kind = if p.extension().map(|e| e.eq_ignore_ascii_case("otf")).unwrap_or(false) { "OpenType" } else { "TrueType" };
        format!("{stem} ({kind})")
    }
    pub fn register(p: &Path) {
        if let Ok((k, _)) = RegKey::predef(HKEY_CURRENT_USER).create_subkey(KEY) {
            let _ = k.set_value(value_name(p), &p.to_string_lossy().to_string());
        }
        unsafe {
            windows_sys::Win32::Graphics::Gdi::AddFontResourceW(wide(p).as_ptr());
        }
    }
    pub fn unregister(p: &Path) {
        unsafe {
            windows_sys::Win32::Graphics::Gdi::RemoveFontResourceW(wide(p).as_ptr());
        }
        if let Ok(k) = RegKey::predef(HKEY_CURRENT_USER).open_subkey_with_flags(KEY, KEY_SET_VALUE) {
            let _ = k.delete_value(value_name(p));
        }
    }
}

#[cfg(not(windows))]
mod win {
    use std::path::Path;
    pub fn register(_p: &Path) {}
    pub fn unregister(_p: &Path) {}
}
