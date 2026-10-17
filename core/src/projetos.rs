//! Projetos do aluno: encontra mídias que o CapCut não acha mais ("Vincular mídia") e religa
//! as que são dos nossos pacotes. Mídia do próprio aluno nunca é alterada, só apontada no diagnóstico.
//!
//! Também audita as predefinições de um pacote: referências a arquivos que não existem fora do
//! computador de quem criou (projeto do criador, cache de música, aplicativo do CapCut) — é o que
//! vira "mídia perdida" no computador do aluno.

use crate::env::{capcut_running, fwd, Env};
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

const ARQUIVOS_PROJETO: [&str; 2] = ["draft_content.json", "draft_info.json"];
const EXT_MIDIA: [&str; 16] = ["mp3", "wav", "m4a", "aac", "ogg", "flac", "mp4", "mov", "m4v", "webm", "png", "jpg", "jpeg", "gif", "webp", "heic"];

#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct MidiaFaltando {
    pub projeto: String,
    pub arquivo: String,
    pub caminho: String,
    /// é de um pacote nosso (pasta de recursos das predefinições ou pasta Pluga & Edita)
    pub nossa: bool,
    /// onde o arquivo está agora, se foi encontrado (dá para religar)
    pub encontrado_em: Option<String>,
}

#[derive(Serialize, Clone, Debug, Default)]
pub struct Verificacao {
    pub projetos: usize,
    /// projetos que não deu para ler (formato protegido ou arquivo corrompido)
    pub ilegiveis: Vec<String>,
    pub faltando: Vec<MidiaFaltando>,
}

#[derive(Serialize, Clone, Debug, Default)]
pub struct Reparo {
    pub projetos_alterados: usize,
    pub midias_religadas: usize,
    pub backup: String,
    pub log: Vec<String>,
}

fn eh_absoluto(p: &str) -> bool {
    p.starts_with('/') || (p.len() > 2 && p.as_bytes()[1] == b':' && (p.as_bytes()[2] == b'/' || p.as_bytes()[2] == b'\\'))
}

fn nome_arquivo(p: &str) -> String {
    p.replace('\\', "/").rsplit('/').next().unwrap_or("").to_string()
}

fn ler_json(p: &Path) -> Option<Value> {
    let t = fs::read_to_string(p).ok()?;
    serde_json::from_str(t.trim_start_matches('\u{feff}')).ok()
}

/// Pastas onde ficam os projetos do CapCut: a padrão (User Data/Projects/com.lveditor.draft)
/// e qualquer pasta de rascunhos escolhida nas configurações do CapCut (chaves "…DraftPath…" do globalSetting).
pub fn pastas_de_projetos(env: &Env) -> Vec<PathBuf> {
    let mut out: Vec<PathBuf> = Vec::new();
    let mut add = |p: PathBuf| {
        if p.is_dir() && !out.iter().any(|x| x == &p) {
            out.push(p);
        }
    };
    for ud in env.capcut_user_data() {
        add(ud.join("Projects").join("com.lveditor.draft"));
        if let Ok(b) = fs::read(ud.join("Config").join("globalSetting")) {
            for linha in String::from_utf8_lossy(&b).lines() {
                let l = linha.trim_start_matches('\u{feff}').trim();
                let Some((k, v)) = l.split_once('=') else { continue };
                let k = k.to_lowercase();
                if k.contains("draft") && k.contains("path") {
                    let v = crate::env::ini_valor(v.trim());
                    let v = v.trim();
                    if !v.is_empty() {
                        let p = PathBuf::from(v);
                        add(p.join("com.lveditor.draft"));
                        add(p);
                    }
                }
            }
        }
    }
    out
}

/// Pastas onde os nossos pacotes deixam mídia: Combination/Resources de cada pasta de predefinições
/// e Filmes/Vídeos › Pluga & Edita.
pub fn pastas_nossas(env: &Env) -> Vec<PathBuf> {
    let mut v: Vec<PathBuf> = env.capcut_preset_roots().into_iter().map(|(_, r)| r.join("Combination").join("Resources")).filter(|p| p.is_dir()).collect();
    let m = env.media_root();
    if m.is_dir() {
        v.push(m);
    }
    v
}

fn eh_nossa(caminho: &str, env: &Env) -> bool {
    let c = caminho.replace('\\', "/");
    let mr = fwd(&env.media_root());
    c.contains("/Combination/Resources/") || nome_arquivo(&c).starts_with("basefl-") || c.starts_with(&mr) || c.contains("/Pluga & Edita/")
}

/// Todos os caminhos de arquivo de mídia citados em "materials" de um projeto.
fn caminhos_de_midia(v: &Value, out: &mut Vec<String>) {
    match v {
        Value::Object(m) => {
            for (k, x) in m {
                if let Value::String(s) = x {
                    if (k == "path" || k == "file_Path" || k == "media_path") && eh_absoluto(s) {
                        let ext = nome_arquivo(s).rsplit('.').next().unwrap_or("").to_lowercase();
                        if EXT_MIDIA.contains(&ext.as_str()) && !out.contains(s) {
                            out.push(s.clone());
                        }
                    }
                } else {
                    caminhos_de_midia(x, out);
                }
            }
        }
        Value::Array(a) => a.iter().for_each(|x| caminhos_de_midia(x, out)),
        _ => {}
    }
}

/// Procura um arquivo pelo nome nas pastas dos nossos pacotes.
fn procurar(nome: &str, pastas: &[PathBuf]) -> Option<PathBuf> {
    if nome.is_empty() {
        return None;
    }
    for p in pastas {
        let direto = p.join(nome);
        if direto.is_file() {
            return Some(direto);
        }
        for e in WalkDir::new(p).max_depth(4).into_iter().flatten() {
            if e.file_type().is_file() && e.file_name().to_string_lossy() == nome {
                return Some(e.path().to_path_buf());
            }
        }
    }
    None
}

fn projetos(env: &Env) -> Vec<PathBuf> {
    let mut v = Vec::new();
    for raiz in pastas_de_projetos(env) {
        if let Ok(rd) = fs::read_dir(&raiz) {
            for e in rd.flatten() {
                let p = e.path();
                if p.is_dir() && ARQUIVOS_PROJETO.iter().any(|a| p.join(a).is_file()) && !v.contains(&p) {
                    v.push(p);
                }
            }
        }
    }
    v.sort();
    v
}

/// Só leitura: lista as mídias que faltam em cada projeto do aluno.
pub fn verificar(env: &Env) -> Verificacao {
    let nossas = pastas_nossas(env);
    let mut r = Verificacao::default();
    for proj in projetos(env) {
        r.projetos += 1;
        let nome_proj = proj.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
        let mut caminhos = Vec::new();
        let mut leu = false;
        for a in ARQUIVOS_PROJETO {
            let f = proj.join(a);
            if !f.is_file() {
                continue;
            }
            if let Some(j) = ler_json(&f) {
                leu = true;
                caminhos_de_midia(&j, &mut caminhos);
            }
        }
        if !leu {
            r.ilegiveis.push(nome_proj.clone());
            continue;
        }
        for c in caminhos {
            if Path::new(&c).exists() {
                continue;
            }
            let arquivo = nome_arquivo(&c);
            let nossa = eh_nossa(&c, env);
            let encontrado_em = if nossa { procurar(&arquivo, &nossas).map(|p| fwd(&p)) } else { None };
            r.faltando.push(MidiaFaltando { projeto: nome_proj.clone(), arquivo, caminho: c, nossa, encontrado_em });
        }
    }
    r
}

/// Religa, nos projetos, as mídias dos nossos pacotes que mudaram de lugar. Faz backup de cada arquivo
/// antes, confere que o projeto continua válido e desfaz se não estiver. CapCut precisa estar fechado.
pub fn reparar(env: &Env, progress: &mut dyn FnMut(&str)) -> Result<Reparo, String> {
    if env.system_integration && capcut_running() {
        return Err("O CapCut está aberto. Feche o CapCut e tente de novo.".into());
    }
    let v = verificar(env);
    let stamp = chrono::Local::now().format("%Y%m%d-%H%M%S").to_string();
    let backup = env.backups_dir().join(format!("projetos-{stamp}"));
    let mut rep = Reparo { backup: fwd(&backup), ..Default::default() };
    let mut porprojeto: Vec<(String, Vec<(String, String)>)> = Vec::new();
    for m in v.faltando.iter().filter(|m| m.nossa) {
        let Some(novo) = &m.encontrado_em else { continue };
        match porprojeto.iter_mut().find(|(p, _)| p == &m.projeto) {
            Some((_, l)) => l.push((m.caminho.clone(), novo.clone())),
            None => porprojeto.push((m.projeto.clone(), vec![(m.caminho.clone(), novo.clone())])),
        }
    }
    let lista = projetos(env);
    for (nome, trocas) in porprojeto {
        let Some(dir) = lista.iter().find(|p| p.file_name().map(|n| n.to_string_lossy() == nome).unwrap_or(false)) else { continue };
        let mut alterou = false;
        for e in fs::read_dir(dir).map_err(|e| e.to_string())?.flatten() {
            let f = e.path();
            let nm = f.file_name().unwrap().to_string_lossy().to_string();
            // o projeto e as cópias de segurança que o próprio CapCut guarda ao lado
            if !(nm.starts_with("draft_content.json") || nm.starts_with("draft_info.json")) || !f.is_file() {
                continue;
            }
            let Ok(txt) = fs::read_to_string(&f) else { continue };
            let mut novo = txt.clone();
            for (de, para) in &trocas {
                novo = novo.replace(&format!("\"{de}\""), &format!("\"{para}\""));
            }
            if novo == txt {
                continue;
            }
            let eh_json = nm.ends_with(".json");
            if eh_json && serde_json::from_str::<Value>(novo.trim_start_matches('\u{feff}')).is_err() {
                return Err(format!("O projeto {nome} ficaria inválido; nada foi alterado nele."));
            }
            let bk = backup.join(&nome).join(&nm);
            fs::create_dir_all(bk.parent().unwrap()).map_err(|e| e.to_string())?;
            fs::copy(&f, &bk).map_err(|e| format!("backup de {nome}: {e}"))?;
            fs::write(&f, &novo).map_err(|e| e.to_string())?;
            alterou = true;
        }
        if alterou {
            rep.projetos_alterados += 1;
            rep.midias_religadas += trocas.len();
            let msg = format!("{}: {} mídia(s) religada(s)", nome, trocas.len());
            crate::install::log_line(env, &msg);
            progress(&msg);
            rep.log.push(msg);
        }
    }
    let aluno = v.faltando.iter().filter(|m| !m.nossa).count();
    if aluno > 0 {
        let msg = format!("{aluno} mídia(s) do próprio aluno continuam faltando (não são dos nossos pacotes; religar pelo CapCut)");
        progress(&msg);
        rep.log.push(msg);
    }
    Ok(rep)
}

/// Texto curto para o Diagnóstico de suporte.
pub fn resumo(env: &Env) -> String {
    let v = verificar(env);
    let nossas = v.faltando.iter().filter(|m| m.nossa).count();
    let religaveis = v.faltando.iter().filter(|m| m.nossa && m.encontrado_em.is_some()).count();
    let mut s = format!(
        "Projetos verificados: {} · mídias faltando: {} (dos nossos pacotes: {nossas}, dá para religar: {religaveis}; do aluno: {})\n",
        v.projetos,
        v.faltando.len(),
        v.faltando.len() - nossas
    );
    if !v.ilegiveis.is_empty() {
        s += &format!("  projetos que não deu para ler (formato protegido?): {}\n", v.ilegiveis.len());
    }
    for m in v.faltando.iter().take(12) {
        s += &format!("  [{}] {} → {}{}\n", if m.nossa { "nosso" } else { "aluno" }, m.projeto, m.caminho, if m.encontrado_em.is_some() { " (religável)" } else { "" });
    }
    s
}

/// Referências, nas predefinições de um pacote, a arquivos de mídia que só existem no computador de quem
/// criou o pacote. Fontes, cache de efeitos (o CapCut baixa de novo pelo id) e o marcador __PLUGA_UD__ ficam de fora.
pub fn referencias_externas(dir: &Path) -> Vec<String> {
    let re = regex::Regex::new(r#""((?:/|[A-Za-z]:/)[^"\\]+\.([A-Za-z0-9]{2,5}))""#).unwrap();
    let mut out: Vec<String> = Vec::new();
    for e in WalkDir::new(dir).into_iter().flatten() {
        let p = e.path();
        let ext = p.extension().and_then(|x| x.to_str()).unwrap_or("");
        if !p.is_file() || !matches!(ext, "json" | "tmp" | "bak") {
            continue;
        }
        let Ok(t) = fs::read_to_string(p) else { continue };
        for c in re.captures_iter(&t) {
            let caminho = &c[1];
            let ext = c[2].to_lowercase();
            if !EXT_MIDIA.contains(&ext.as_str()) || caminho.contains("/Cache/effect/") || caminho.contains("__PLUGA_UD__") {
                continue;
            }
            if !out.iter().any(|x| x == caminho) {
                out.push(caminho.to_string());
            }
        }
    }
    out
}
