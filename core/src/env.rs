//! Ambiente de execução: sistema alvo e pastas relevantes.
//! Tudo é injetável para que a lógica possa ser testada simulando Mac e Windows.

use std::path::{Path, PathBuf};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Target {
    Mac,
    Windows,
    Linux, // usado só em testes / desenvolvimento
}

impl Target {
    pub fn current() -> Target {
        if cfg!(target_os = "macos") {
            Target::Mac
        } else if cfg!(windows) {
            Target::Windows
        } else {
            Target::Linux
        }
    }
}

#[derive(Clone, Debug)]
pub struct Env {
    pub target: Target,
    /// pasta pessoal do usuário (~ no Mac, %USERPROFILE% no Windows)
    pub home: PathBuf,
    /// %LOCALAPPDATA% no Windows
    pub local_appdata: Option<PathBuf>,
    /// %WINDIR% no Windows (fontes do sistema)
    pub windir: Option<PathBuf>,
    /// onde o app guarda estado, backups e log
    pub data_dir: PathBuf,
    /// se false, não mexe em registro/serviços do sistema (testes)
    pub system_integration: bool,
}

impl Env {
    pub fn detect() -> Env {
        let target = Target::current();
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        let local_appdata = std::env::var_os("LOCALAPPDATA").map(PathBuf::from);
        let windir = std::env::var_os("WINDIR").map(PathBuf::from);
        let data_dir = match target {
            Target::Mac => home.join("Library/Application Support/Pluga Edita"),
            Target::Windows => local_appdata.clone().unwrap_or_else(|| home.clone()).join("Pluga Edita"),
            Target::Linux => home.join(".local/share/pluga-edita"),
        };
        Env { target, home, local_appdata, windir, data_dir, system_integration: true }
    }

    pub fn mac_container(&self) -> PathBuf {
        self.home.join("Library/Containers/com.lemon.lvoverseas")
    }

    /// Pastas "User Data" do CapCut existentes neste computador (sem duplicar links).
    pub fn capcut_user_data(&self) -> Vec<PathBuf> {
        let candidatos: Vec<PathBuf> = match self.target {
            Target::Mac => vec![
                self.home.join("Movies/CapCut/User Data"),
                self.mac_container().join("Data/Movies/CapCut/User Data"),
            ],
            Target::Windows => {
                let base = self.local_appdata.clone().unwrap_or_else(|| self.home.join("AppData/Local"));
                vec![base.join("CapCut").join("User Data")]
            }
            Target::Linux => vec![self.home.join("CapCut/User Data")],
        };
        let mut vistos: Vec<PathBuf> = Vec::new();
        let mut out = Vec::new();
        for c in candidatos {
            if !c.is_dir() {
                continue;
            }
            let real = std::fs::canonicalize(&c).unwrap_or_else(|_| c.clone());
            if vistos.contains(&real) {
                continue;
            }
            vistos.push(real);
            out.push(c);
        }
        out
    }

    /// Pastas "Presets" onde o CapCut guarda e lê as predefinições, junto da User Data a que pertencem.
    /// Sempre a padrão (User Data/Presets) e, se o usuário escolheu outra no CapCut
    /// (Configurações › Rascunho › "Predefinir caminho para salvar"), também essa. Sem repetir a mesma pasta.
    pub fn capcut_preset_roots(&self) -> Vec<(PathBuf, PathBuf)> {
        let mut vistos: Vec<PathBuf> = Vec::new();
        let mut out = Vec::new();
        for ud in self.capcut_user_data() {
            let mut cands = vec![ud.join("Presets")];
            if let Some(c) = custom_preset_path(&ud) {
                cands.push(c);
            }
            for c in cands {
                if !c.is_dir() && std::fs::create_dir_all(&c).is_err() {
                    continue;
                }
                let real = std::fs::canonicalize(&c).unwrap_or_else(|_| c.clone());
                if vistos.contains(&real) {
                    continue;
                }
                vistos.push(real);
                out.push((ud.clone(), c));
            }
        }
        out
    }

    /// Pasta onde ficam sons/músicas: Filmes (Mac) ou Vídeos (Windows) › Pluga & Edita
    pub fn media_root(&self) -> PathBuf {
        match self.target {
            Target::Mac => self.home.join("Movies").join("Pluga & Edita"),
            Target::Windows => self.home.join("Videos").join("Pluga & Edita"),
            Target::Linux => self.home.join("Pluga & Edita"),
        }
    }

    /// Caminho da User Data como o próprio CapCut escreve nos arquivos dele.
    /// No Mac (versão da App Store) o CapCut usa o caminho do "container", mesmo quando ~/Movies/CapCut aponta para lá.
    pub fn capcut_app_path(&self, ud: &Path) -> PathBuf {
        if self.target == Target::Mac {
            let cont = self.mac_container().join("Data/Movies/CapCut/User Data");
            if cont.is_dir() {
                let a = std::fs::canonicalize(&cont).unwrap_or(cont.clone());
                let b = std::fs::canonicalize(ud).unwrap_or(ud.to_path_buf());
                if a == b {
                    return cont;
                }
            }
        }
        ud.to_path_buf()
    }

    pub fn backups_dir(&self) -> PathBuf {
        self.data_dir.join("backups")
    }
    pub fn state_dir(&self) -> PathBuf {
        self.data_dir.join("installed")
    }
    pub fn log_path(&self) -> PathBuf {
        self.data_dir.join("pluga-edita-log.txt")
    }
}

/// Pasta de predefinições escolhida pelo usuário no CapCut (chave customPresetPath de User Data/Config/globalSetting).
/// O arquivo é um .ini do Qt: o valor pode vir entre aspas e com escapes (\\, \", \xHHHH).
pub fn custom_preset_path(ud: &Path) -> Option<PathBuf> {
    let txt = std::fs::read(ud.join("Config").join("globalSetting")).ok()?;
    let txt = String::from_utf8_lossy(&txt);
    for linha in txt.lines() {
        let l = linha.trim_start_matches('\u{feff}').trim();
        if let Some(v) = l.strip_prefix("customPresetPath=") {
            let v = ini_valor(v.trim());
            let v = v.trim();
            if v.is_empty() {
                return None;
            }
            return Some(PathBuf::from(v));
        }
    }
    None
}

/// Desfaz o formato de valor do QSettings (.ini): aspas opcionais e escapes com barra invertida.
pub fn ini_valor(v: &str) -> String {
    let mut out = String::new();
    let mut cs = v.chars().peekable();
    let mut aspas = false;
    while let Some(c) = cs.next() {
        match c {
            '"' => aspas = !aspas,
            '\\' => match cs.next() {
                Some('\\') => out.push('\\'),
                Some('"') => out.push('"'),
                Some('\'') => out.push('\''),
                Some('n') => out.push('\n'),
                Some('t') => out.push('\t'),
                Some('r') => out.push('\r'),
                Some('x') => {
                    let mut h = String::new();
                    while h.len() < 4 {
                        match cs.peek() {
                            Some(d) if d.is_ascii_hexdigit() => {
                                h.push(*d);
                                cs.next();
                            }
                            _ => break,
                        }
                    }
                    if let Some(ch) = u32::from_str_radix(&h, 16).ok().and_then(char::from_u32) {
                        out.push(ch);
                    }
                }
                Some(o) => {
                    out.push('\\');
                    out.push(o);
                }
                None => out.push('\\'),
            },
            _ => out.push(c),
        }
    }
    let _ = aspas;
    out
}

/// Caminho com barras "/" (formato usado dentro dos arquivos do CapCut em qualquer sistema).
pub fn fwd(p: &Path) -> String {
    p.to_string_lossy().replace('\\', "/")
}

/// O CapCut está aberto?
pub fn capcut_running() -> bool {
    use sysinfo::{ProcessRefreshKind, RefreshKind, System};
    let sys = System::new_with_specifics(RefreshKind::new().with_processes(ProcessRefreshKind::new()));
    sys.processes().values().any(|p| {
        let n = p.name().to_string_lossy().to_lowercase();
        n == "capcut" || n == "capcut.exe"
    })
}
