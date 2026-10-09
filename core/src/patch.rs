//! Reescreve, dentro dos arquivos do CapCut, os caminhos que dependem do computador de origem:
//! fontes locais -> fonte instalada neste computador; pastas do CapCut do criador -> pastas deste usuário.

use crate::env::Target;
use regex::{Captures, Regex};
use std::collections::BTreeMap;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

pub struct Patcher {
    re_font: Regex,
    rules: Vec<(Regex, String)>,
    map: BTreeMap<String, String>,
}

impl Patcher {
    /// `home_fwd`: pasta pessoal (Mac/Linux). `ud_fwd`: User Data do CapCut (Windows).
    pub fn new(target: Target, map: BTreeMap<String, String>, home_fwd: &str, ud_fwd: &str) -> Patcher {
        Patcher::new_with_root(target, map, home_fwd, ud_fwd, &format!("{ud_fwd}/Presets"))
    }

    /// Igual a `new`, mas a pasta de predefinições pode ser outra (a escolhida no CapCut).
    pub fn new_with_root(target: Target, map: BTreeMap<String, String>, home_fwd: &str, ud_fwd: &str, presets_fwd: &str) -> Patcher {
        let re_font = Regex::new(r#"(?i)"([^"\\]*/)([^"\\/]+\.(?:ttf|otf|ttc))(\\?")"#).unwrap();
        let win_origin = r#""[A-Za-z]:/Users/[^/"\\]+/AppData/Local/CapCut/User Data"#;
        let rules = match target {
            Target::Windows => vec![
                (
                    Regex::new(r#""/Users/[^/"\\]+/(?:Library/Containers/com\.lemon\.lvoverseas/Data/)?Movies/CapCut/User Data"#).unwrap(),
                    format!("\"{ud_fwd}"),
                ),
                (Regex::new(win_origin).unwrap(), format!("\"{ud_fwd}")),
            ],
            _ => vec![
                (
                    Regex::new(r#""/Users/[^/"\\]+/(Library/Containers/com\.lemon\.lvoverseas/|Movies/CapCut/)"#).unwrap(),
                    format!("\"{home_fwd}/"), // + grupo 1
                ),
                (Regex::new(win_origin).unwrap(), format!("\"{home_fwd}/Movies/CapCut/User Data")),
            ],
        };
        let mut rules = rules;
        // marcador usado pelos pacotes gerados (ex.: sons): vira a pasta User Data deste computador
        rules.push((Regex::new(r#""__PLUGA_UD__/Presets/"#).unwrap(), format!("\"{presets_fwd}/")));
        rules.push((Regex::new(r#""__PLUGA_UD__"#).unwrap(), format!("\"{ud_fwd}")));
        Patcher { re_font, rules, map }
    }

    pub fn patch_text(&self, s: &str) -> String {
        let s = self.re_font.replace_all(s, |c: &Captures| {
            let dir = &c[1];
            let name = &c[2];
            if !dir.contains("/Cache/effect/") {
                if let Some(novo) = self.map.get(&name.to_lowercase()) {
                    return format!("\"{}{}", novo, &c[3]);
                }
            }
            c[0].to_string()
        });
        let mut s = s.into_owned();
        for (i, (re, rep)) in self.rules.iter().enumerate() {
            s = re
                .replace_all(&s, |c: &Captures| {
                    // regra 0 do Mac mantém a subpasta capturada
                    if i == 0 && c.len() > 1 && c.get(1).is_some() {
                        format!("{rep}{}", &c[1])
                    } else {
                        rep.clone()
                    }
                })
                .into_owned();
        }
        s
    }

    /// Corrige todos os .json/.bak/.tmp de uma pasta (não toca na chave binária do CapCut).
    pub fn patch_dir(&self, dir: &Path) -> usize {
        let mut n = 0;
        for e in WalkDir::new(dir).into_iter().filter_map(|e| e.ok()) {
            let p = e.path();
            if !p.is_file() {
                continue;
            }
            let nome = p.file_name().unwrap().to_string_lossy();
            if nome.starts_with("crypto_key_store") {
                continue;
            }
            let ext = p.extension().and_then(|x| x.to_str()).unwrap_or("");
            if !matches!(ext, "json" | "bak" | "tmp") {
                continue;
            }
            let Ok(txt) = fs::read_to_string(p) else { continue };
            let novo = self.patch_text(&txt);
            if novo != txt && fs::write(p, novo).is_ok() {
                n += 1;
            }
        }
        n
    }
}
