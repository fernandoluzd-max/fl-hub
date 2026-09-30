//! Formato .flpack: um zip com manifest.json + conteúdo.
//!
//! manifest.json
//! {
//!   "id": "fl-legendas", "name": "Legendas FL", "version": "1.0.0",
//!   "presets_dir": "presets",            // pastas de predefinição (Combination/Presets)
//!   "resources_dir": "resources",        // opcional: Combination/Resources (.beat)
//!   "fonts_dir": "fonts",                // fontes instaladas em todos os sistemas
//!   "fonts_windows_dir": "fonts-windows",// fontes instaladas só no Windows (substitutas)
//!   "index": "index.json",               // opcional: pastas de predefinição (CombinationPresetVirtualStore)
//!   "aliases": { "nome-procurado.otf": "arquivo-no-pacote.ttf" },
//!   "substitutes_windows": { "MarkerFelt.ttc": "Marker Felt.ttf", "Georgia Bold.ttf": "SISTEMA:georgiab.ttf" },
//!   "required_fonts": [ { "file": "X.otf", "kind": "local" | "mac-system" } ]
//! }

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RequiredFont {
    pub file: String,
    pub kind: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Manifest {
    pub id: String,
    pub name: String,
    pub version: String,
    #[serde(default = "d_presets")]
    pub presets_dir: String,
    #[serde(default)]
    pub resources_dir: Option<String>,
    #[serde(default)]
    pub fonts_dir: Option<String>,
    #[serde(default)]
    pub fonts_windows_dir: Option<String>,
    #[serde(default)]
    pub index: Option<String>,
    #[serde(default)]
    pub aliases: BTreeMap<String, String>,
    #[serde(default)]
    pub substitutes_windows: BTreeMap<String, String>,
    #[serde(default)]
    pub required_fonts: Vec<RequiredFont>,
}
fn d_presets() -> String {
    "presets".into()
}

pub struct Pack {
    pub manifest: Manifest,
    pub root: PathBuf,
}

impl Pack {
    /// Extrai o .flpack para `dest` e lê o manifesto.
    pub fn open(file: &Path, dest: &Path) -> io::Result<Pack> {
        if dest.exists() {
            fs::remove_dir_all(dest)?;
        }
        fs::create_dir_all(dest)?;
        let f = fs::File::open(file)?;
        let mut z = zip::ZipArchive::new(f).map_err(io::Error::other)?;
        for i in 0..z.len() {
            let mut e = z.by_index(i).map_err(io::Error::other)?;
            let Some(rel) = e.enclosed_name() else { continue }; // bloqueia caminhos perigosos
            let out = dest.join(rel);
            if e.is_dir() {
                fs::create_dir_all(&out)?;
            } else {
                if let Some(p) = out.parent() {
                    fs::create_dir_all(p)?;
                }
                let mut w = fs::File::create(&out)?;
                io::copy(&mut e, &mut w)?;
            }
        }
        Pack::from_dir(dest)
    }

    /// Usa uma pasta já extraída (útil em testes).
    pub fn from_dir(root: &Path) -> io::Result<Pack> {
        let txt = fs::read_to_string(root.join("manifest.json"))?;
        let manifest: Manifest = serde_json::from_str(&txt).map_err(io::Error::other)?;
        Ok(Pack { manifest, root: root.to_path_buf() })
    }

    pub fn presets_path(&self) -> PathBuf {
        self.root.join(&self.manifest.presets_dir)
    }

    /// Nomes das pastas de predefinição do pacote.
    pub fn preset_names(&self) -> Vec<String> {
        let mut v: Vec<String> = fs::read_dir(self.presets_path())
            .map(|rd| {
                rd.filter_map(|e| e.ok())
                    .filter(|e| e.path().is_dir())
                    .map(|e| e.file_name().to_string_lossy().to_string())
                    .collect()
            })
            .unwrap_or_default();
        v.sort();
        v
    }
}
