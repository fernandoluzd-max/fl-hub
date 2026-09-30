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
    /// onde o FL Hub guarda estado, backups e log
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
            Target::Mac => home.join("Library/Application Support/FL Hub"),
            Target::Windows => local_appdata.clone().unwrap_or_else(|| home.clone()).join("FL Hub"),
            Target::Linux => home.join(".local/share/fl-hub"),
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

    pub fn backups_dir(&self) -> PathBuf {
        self.data_dir.join("backups")
    }
    pub fn state_dir(&self) -> PathBuf {
        self.data_dir.join("installed")
    }
    pub fn log_path(&self) -> PathBuf {
        self.data_dir.join("fl-hub-log.txt")
    }
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
