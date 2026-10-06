//! Instalar / remover um pacote no CapCut, com backup, desfazer automático e registro do que foi instalado.

use crate::env::{capcut_running, fwd, Env};
use crate::fonts::{install_fonts, remove_fonts};
use crate::index;
use crate::pack::Pack;
use crate::patch::Patcher;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct UdState {
    pub user_data: String,
    pub presets: Vec<String>,
    pub preset_ids: Vec<String>,
    pub created_folders: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct Installed {
    pub id: String,
    pub name: String,
    pub version: String,
    pub installed_at: String,
    pub targets: Vec<UdState>,
    pub fonts_created: Vec<String>,
    pub backup_dir: String,
    /// "media" para pacotes de sons/músicas
    #[serde(default)]
    pub kind: String,
    #[serde(default)]
    pub media_path: String,
    #[serde(default)]
    pub media_files: Vec<String>,
    /// LUTs instalados (kind = "lut") e as pastas User Data onde entraram
    #[serde(default)]
    pub lut_names: Vec<String>,
    #[serde(default)]
    pub lut_targets: Vec<String>,
}

#[derive(Serialize, Clone, Debug, Default)]
pub struct Report {
    pub pack: String,
    pub version: String,
    pub presets: usize,
    pub fonts: usize,
    pub user_data: Vec<String>,
    pub missing_fonts: Vec<String>,
    pub files_patched: usize,
    pub log: Vec<String>,
    pub media_path: String,
}

fn now() -> String {
    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}
fn stamp() -> String {
    chrono::Local::now().format("%Y%m%d-%H%M%S").to_string()
}

pub fn log_line(env: &Env, msg: &str) {
    let _ = fs::create_dir_all(&env.data_dir);
    use std::io::Write;
    if let Ok(mut f) = fs::OpenOptions::new().create(true).append(true).open(env.log_path()) {
        let _ = writeln!(f, "[{}] {}", now(), msg);
    }
}

pub fn copy_dir(src: &Path, dst: &Path) -> io::Result<()> {
    for e in WalkDir::new(src) {
        let e = e.map_err(io::Error::other)?;
        let rel = e.path().strip_prefix(src).unwrap();
        let out = dst.join(rel);
        if e.file_type().is_dir() {
            fs::create_dir_all(&out)?;
        } else {
            if let Some(p) = out.parent() {
                fs::create_dir_all(p)?;
            }
            fs::copy(e.path(), &out)?;
        }
    }
    Ok(())
}

/// move (ou copia+apaga, se estiver em outro disco)
fn move_path(a: &Path, b: &Path) -> io::Result<()> {
    if let Some(p) = b.parent() {
        fs::create_dir_all(p)?;
    }
    if fs::rename(a, b).is_ok() {
        return Ok(());
    }
    copy_dir(a, b)?;
    fs::remove_dir_all(a)
}

fn read_json(p: &Path) -> Option<Value> {
    fs::read_to_string(p).ok().and_then(|t| serde_json::from_str(t.trim_start_matches('\u{feff}')).ok())
}

pub fn state_path(env: &Env, id: &str) -> PathBuf {
    env.state_dir().join(format!("{id}.json"))
}
pub fn installed(env: &Env) -> Vec<Installed> {
    let mut v: Vec<Installed> = fs::read_dir(env.state_dir())
        .map(|rd| rd.filter_map(|e| e.ok()).filter_map(|e| read_json(&e.path())).filter_map(|j| serde_json::from_value(j).ok()).collect())
        .unwrap_or_default();
    v.sort_by(|a, b| a.name.cmp(&b.name));
    v
}

/// Ações realizadas, para desfazer se algo falhar.
enum Acao {
    Criou(PathBuf),
    Moveu { original: PathBuf, backup: PathBuf },
    Indice { arquivo: PathBuf, anterior: Option<String> },
}

fn desfazer(acoes: Vec<Acao>) {
    for a in acoes.into_iter().rev() {
        match a {
            Acao::Criou(p) => {
                let _ = fs::remove_dir_all(&p);
            }
            Acao::Moveu { original, backup } => {
                let _ = fs::remove_dir_all(&original);
                let _ = move_path(&backup, &original);
            }
            Acao::Indice { arquivo, anterior } => match anterior {
                Some(t) => {
                    let _ = fs::write(&arquivo, t);
                }
                None => {
                    let _ = fs::remove_file(&arquivo);
                }
            },
        }
    }
}

fn is_media(pack: &Pack) -> bool {
    pack.manifest.kind.as_deref() == Some("media")
}

/// Pacote de sons/músicas: copia os arquivos para Filmes/Vídeos › Pluga & Edita › <pasta>.
/// Não mexe no CapCut (pode ficar aberto). Guarda a lista do que foi copiado para remover depois.
pub fn install_media(env: &Env, pack: &Pack, progress: &mut dyn FnMut(&str)) -> Result<Report, String> {
    let m = &pack.manifest;
    let src = pack.root.join(m.media_dir.as_deref().unwrap_or("media"));
    if !src.is_dir() {
        return Err("Pacote inválido: pasta de mídia não encontrada.".into());
    }
    let pasta = m.media_target.clone().unwrap_or_else(|| m.name.clone());
    let dest = env.media_root().join(&pasta);
    let mut rep = Report { pack: m.name.clone(), version: m.version.clone(), media_path: dest.to_string_lossy().to_string(), ..Default::default() };
    let mut say = |rep: &mut Report, s: String| {
        log_line(env, &s);
        progress(&s);
        rep.log.push(s);
    };
    say(&mut rep, format!("Instalando {} {}", m.name, m.version));
    // atualização: remove arquivos da versão anterior que não existem mais
    let anterior: Option<Installed> = read_json(&state_path(env, &m.id)).and_then(|j| serde_json::from_value(j).ok());
    let mut novos: Vec<String> = Vec::new();
    for e in WalkDir::new(&src).into_iter().flatten() {
        if e.file_type().is_file() {
            let rel = e.path().strip_prefix(&src).unwrap();
            let nome = rel.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
            if nome.starts_with('.') {
                continue;
            }
            novos.push(fwd(rel));
        }
    }
    if let Some(a) = &anterior {
        let base = PathBuf::from(&a.media_path);
        for f in &a.media_files {
            if !novos.contains(f) || base != dest {
                let _ = fs::remove_file(base.join(f));
            }
        }
    }
    fs::create_dir_all(&dest).map_err(|e| format!("Não foi possível criar a pasta {}: {e}", dest.display()))?;
    let mut feitos: Vec<PathBuf> = Vec::new();
    for rel in &novos {
        let de = src.join(rel);
        let para = dest.join(rel);
        if let Some(p) = para.parent() {
            let _ = fs::create_dir_all(p);
        }
        if let Err(e) = fs::copy(&de, &para) {
            for f in &feitos {
                let _ = fs::remove_file(f);
            }
            return Err(format!("Erro ao copiar {rel}: {e}"));
        }
        feitos.push(para);
    }
    rep.presets = novos.len();
    let cats = fs::read_dir(&dest).map(|r| r.flatten().filter(|e| e.path().is_dir()).count()).unwrap_or(0);
    say(&mut rep, format!("{} arquivos em {} categorias", novos.len(), cats));
    let st = Installed {
        id: m.id.clone(),
        name: m.name.clone(),
        version: m.version.clone(),
        installed_at: now(),
        kind: "media".into(),
        media_path: dest.to_string_lossy().to_string(),
        media_files: novos,
        ..Default::default()
    };
    let _ = fs::create_dir_all(env.state_dir());
    fs::write(state_path(env, &m.id), serde_json::to_string_pretty(&st).unwrap()).map_err(|e| e.to_string())?;
    Ok(rep)
}

fn uninstall_media(env: &Env, st: &Installed, progress: &mut dyn FnMut(&str)) {
    let base = PathBuf::from(&st.media_path);
    for f in &st.media_files {
        let _ = fs::remove_file(base.join(f));
    }
    // apaga só pastas que ficaram vazias (nunca arquivos do aluno)
    let mut dirs: Vec<PathBuf> = WalkDir::new(&base).into_iter().flatten().filter(|e| e.file_type().is_dir()).map(|e| e.path().to_path_buf()).collect();
    dirs.sort_by_key(|d| std::cmp::Reverse(d.components().count()));
    for d in dirs {
        let _ = fs::remove_file(d.join(".DS_Store"));
        let _ = fs::remove_dir(&d);
    }
    let _ = fs::remove_dir(env.media_root());
    let msg = format!("{} arquivos removidos de {}", st.media_files.len(), st.media_path);
    log_line(env, &msg);
    progress(&msg);
}

const LUT_CFG: &str = "LutImportCfg.json";

fn lut_titulo(nome: &str) -> String {
    format!("{nome}.cube")
}

/// Pacote de LUTs: copia para User Data/Resources/Lut/<nome>/ e registra em LutImportCfg.json
/// (a lista da aba Ajuste › Seus › LUT). LUTs importados pelo aluno não são tocados.
pub fn install_luts(env: &Env, pack: &Pack, progress: &mut dyn FnMut(&str)) -> Result<Report, String> {
    let m = &pack.manifest;
    let mut rep = Report { pack: m.name.clone(), version: m.version.clone(), ..Default::default() };
    let mut say = |rep: &mut Report, s: String| {
        log_line(env, &s);
        progress(&s);
        rep.log.push(s);
    };
    if env.system_integration && capcut_running() {
        return Err("O CapCut está aberto. Feche o CapCut (no Mac: ⌘Q) e tente de novo.".into());
    }
    let uds = env.capcut_user_data();
    if uds.is_empty() {
        return Err("CapCut não encontrado. Abra o CapCut uma vez, crie um projeto qualquer, feche e tente de novo.".into());
    }
    let src = pack.root.join(m.lut_dir.as_deref().unwrap_or("luts"));
    let nomes: Vec<String> = if m.luts.is_empty() {
        let mut v: Vec<String> = fs::read_dir(&src).map_err(|e| e.to_string())?.flatten().filter(|e| e.path().is_dir()).map(|e| e.file_name().to_string_lossy().to_string()).collect();
        v.sort();
        v
    } else {
        m.luts.clone()
    };
    say(&mut rep, format!("Instalando {} {}", m.name, m.version));
    // versão anterior: remove o que saiu do pacote
    let anterior: Option<Installed> = read_json(&state_path(env, &m.id)).and_then(|j| serde_json::from_value(j).ok());
    let mut alvos = Vec::new();
    for ud in &uds {
        let dir = ud.join("Resources").join("Lut");
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let cfg_path = dir.join(LUT_CFG);
        let original = fs::read_to_string(&cfg_path).ok();
        // backup da lista
        let bdir = env.backups_dir().join(format!("{}-{}", m.id, stamp()));
        let _ = fs::create_dir_all(&bdir);
        if let Some(t) = &original {
            let _ = fs::write(bdir.join(LUT_CFG), t);
        }
        let mut lista: Vec<Value> = original.as_deref().and_then(|t| serde_json::from_str(t.trim_start_matches('\u{feff}')).ok()).unwrap_or_default();
        let remover: Vec<String> = anterior.as_ref().map(|a| a.lut_names.clone()).unwrap_or_default();
        for n in remover.iter().filter(|n| !nomes.contains(n)) {
            let _ = fs::remove_dir_all(dir.join(n));
        }
        let meus: Vec<String> = nomes.iter().chain(remover.iter()).map(|n| lut_titulo(n)).collect();
        lista.retain(|e| !e.get("title").and_then(|t| t.as_str()).map(|t| meus.iter().any(|x| x == t)).unwrap_or(false));
        let app = fwd(&env.capcut_app_path(ud));
        // o CapCut mostra os mais recentes primeiro: entram na ordem inversa para aparecerem na ordem do pacote
        for n in nomes.iter().rev() {
            let de = src.join(n);
            let para = dir.join(n);
            let _ = fs::remove_dir_all(&para);
            if let Err(e) = copy_dir(&de, &para) {
                if let Some(t) = &original {
                    let _ = fs::write(&cfg_path, t);
                }
                return Err(format!("Erro ao copiar o LUT {n}: {e}"));
            }
            let base = format!("{app}/Resources/Lut/{n}/{n}");
            lista.push(serde_json::json!({
                "imagePath": format!("{base}.jpeg"),
                "originPath": format!("{base}.cube"),
                "path": format!("{base}.cube"),
                "title": lut_titulo(n),
            }));
        }
        fs::write(&cfg_path, serde_json::to_string(&lista).unwrap()).map_err(|e| e.to_string())?;
        say(&mut rep, format!("{} LUTs na aba Ajuste › LUT ({})", nomes.len(), fwd(ud)));
        alvos.push(ud.to_string_lossy().to_string());
    }
    rep.presets = nomes.len();
    rep.user_data = alvos.clone();
    let st = Installed {
        id: m.id.clone(),
        name: m.name.clone(),
        version: m.version.clone(),
        installed_at: now(),
        kind: "lut".into(),
        lut_names: nomes,
        lut_targets: alvos,
        ..Default::default()
    };
    let _ = fs::create_dir_all(env.state_dir());
    fs::write(state_path(env, &m.id), serde_json::to_string_pretty(&st).unwrap()).map_err(|e| e.to_string())?;
    Ok(rep)
}

fn uninstall_luts(env: &Env, st: &Installed, progress: &mut dyn FnMut(&str)) {
    let meus: Vec<String> = st.lut_names.iter().map(|n| lut_titulo(n)).collect();
    for ud in &st.lut_targets {
        let dir = PathBuf::from(ud).join("Resources").join("Lut");
        for n in &st.lut_names {
            let _ = fs::remove_dir_all(dir.join(n));
        }
        let cfg_path = dir.join(LUT_CFG);
        if let Some(mut lista) = read_json(&cfg_path).and_then(|v| v.as_array().cloned()) {
            lista.retain(|e| !e.get("title").and_then(|t| t.as_str()).map(|t| meus.iter().any(|x| x == t)).unwrap_or(false));
            let _ = fs::write(&cfg_path, serde_json::to_string(&lista).unwrap());
        }
        let msg = format!("{} LUTs removidos de {}", st.lut_names.len(), ud);
        log_line(env, &msg);
        progress(&msg);
    }
}

pub fn install(env: &Env, pack: &Pack, progress: &mut dyn FnMut(&str)) -> Result<Report, String> {
    if pack.manifest.kind.as_deref() == Some("lut") {
        return install_luts(env, pack, progress);
    }
    if is_media(pack) {
        return install_media(env, pack, progress);
    }
    // se uma versão anterior deste pacote foi instalada como pasta de mídia, limpa antes
    if let Some(ant) = read_json(&state_path(env, &pack.manifest.id)).and_then(|j| serde_json::from_value::<Installed>(j).ok()) {
        if ant.kind == "media" {
            uninstall_media(env, &ant, progress);
            let _ = fs::remove_file(state_path(env, &pack.manifest.id));
        }
    }
    let m = &pack.manifest;
    let mut rep = Report { pack: m.name.clone(), version: m.version.clone(), ..Default::default() };
    let mut say = |rep: &mut Report, s: String| {
        log_line(env, &s);
        progress(&s);
        rep.log.push(s);
    };

    if env.system_integration && capcut_running() {
        return Err("O CapCut está aberto. Feche o CapCut e tente de novo.".into());
    }
    let uds = env.capcut_user_data();
    if uds.is_empty() {
        return Err("Não encontrei o CapCut neste computador. Abra o CapCut uma vez, crie um projeto qualquer, feche e tente de novo.".into());
    }
    say(&mut rep, format!("CapCut encontrado ({} pasta(s) de dados)", uds.len()));

    // 1. fontes
    let fr = install_fonts(env, pack).map_err(|e| format!("Erro ao instalar fontes: {e}"))?;
    rep.fonts = fr.map.len();
    say(&mut rep, format!("Fontes prontas: {}", fr.map.len()));
    for rf in &m.required_fonts {
        if rf.kind == "local" && !fr.map.contains_key(&rf.file.to_lowercase()) {
            rep.missing_fonts.push(rf.file.clone());
        }
    }

    // 2. predefinições, índice e caminhos, em cada pasta do CapCut
    let backup_root = env.backups_dir().join(format!("{}-{}", m.id, stamp()));
    let nomes = pack.preset_names();
    let ours_index = m.index.as_ref().and_then(|f| read_json(&pack.root.join(f)));
    let mut acoes: Vec<Acao> = vec![];
    let mut targets = vec![];

    let resultado: Result<(), String> = (|| {
        for ud in &uds {
            let presets = ud.join("Presets").join("Combination").join("Presets");
            fs::create_dir_all(&presets).map_err(|e| e.to_string())?;
            for n in &nomes {
                let dest = presets.join(n);
                if dest.exists() {
                    let bk = backup_root.join(fwd(ud).replace(['/', ':'], "_")).join(n);
                    move_path(&dest, &bk).map_err(|e| format!("backup de {n}: {e}"))?;
                    acoes.push(Acao::Moveu { original: dest.clone(), backup: bk });
                }
                copy_dir(&pack.presets_path().join(n), &dest).map_err(|e| format!("copiar {n}: {e}"))?;
                acoes.push(Acao::Criou(dest));
            }
            if let Some(r) = &m.resources_dir {
                let rd = ud.join("Presets").join("Combination").join("Resources");
                let _ = fs::create_dir_all(&rd);
                if let Ok(it) = fs::read_dir(pack.root.join(r)) {
                    for e in it.flatten() {
                        let d = rd.join(e.file_name());
                        if !d.exists() {
                            let _ = fs::copy(e.path(), d);
                        }
                    }
                }
            }
            let mut st = UdState { user_data: fwd(ud), presets: nomes.clone(), ..Default::default() };
            if let Some(ours) = &ours_index {
                let arq = presets.join(index::FILE);
                let anterior = fs::read_to_string(&arq).ok();
                if let Some(t) = &anterior {
                    let _ = fs::create_dir_all(&backup_root);
                    let _ = fs::write(backup_root.join(format!("{}-{}", fwd(ud).replace(['/', ':'], "_"), index::FILE)), t);
                }
                let mr = index::merge(anterior.as_deref().and_then(|t| serde_json::from_str(t.trim_start_matches('\u{feff}')).ok()), ours);
                fs::write(&arq, serde_json::to_string(&mr.index).unwrap()).map_err(|e| format!("índice: {e}"))?;
                acoes.push(Acao::Indice { arquivo: arq, anterior });
                st.preset_ids = mr.preset_ids;
                st.created_folders = mr.created_folders;
            }
            let patcher = Patcher::new(env.target, fr.map.clone(), &fwd(&env.home), &fwd(ud));
            for n in &nomes {
                rep.files_patched += patcher.patch_dir(&presets.join(n));
            }
            // verificação: cada predefinição precisa ter JSON válido
            for n in &nomes {
                let d = presets.join(n).join("preset_draft").join("draft_content.json");
                if d.exists() && read_json(&d).is_none() {
                    return Err(format!("verificação falhou em {n}"));
                }
            }
            targets.push(st);
        }
        Ok(())
    })();

    if let Err(e) = resultado {
        desfazer(acoes);
        say(&mut rep, format!("ERRO: {e}. Tudo foi desfeito, nada do seu CapCut foi alterado."));
        return Err(format!("A instalação falhou e foi desfeita: {e}"));
    }

    // Atualização: o que a versão anterior deste pacote instalou e a nova não traz mais (nome trocado, som retirado)
    // sai do CapCut, para não ficar predefinição repetida nem pasta antiga vazia.
    if let Some(prev) = read_json(&state_path(env, &m.id)).and_then(|j| serde_json::from_value::<Installed>(j).ok()) {
        for st in targets.iter_mut() {
            let Some(pt) = prev.targets.iter().find(|t| t.user_data == st.user_data) else { continue };
            let presets = PathBuf::from(&st.user_data).join("Presets").join("Combination").join("Presets");
            let mut tirados = 0;
            for n in pt.presets.iter().filter(|n| !nomes.contains(n)) {
                if fs::remove_dir_all(presets.join(n)).is_ok() {
                    tirados += 1;
                }
            }
            let velhos: Vec<String> = pt.preset_ids.iter().filter(|i| !st.preset_ids.contains(i)).cloned().collect();
            let arq = presets.join(index::FILE);
            if let Some(v) = read_json(&arq) {
                let novo = index::remove(v, &velhos, &pt.created_folders);
                // pastas que o FL Hub criou antes e continuam em uso seguem registradas como nossas
                let vivas: Vec<String> = novo["preset_virtual_store"][0]["value"].as_array().map(|a| a.iter().filter_map(|e| e["id"].as_str().map(String::from)).collect()).unwrap_or_default();
                for f in pt.created_folders.iter().filter(|f| vivas.contains(f)) {
                    if !st.created_folders.contains(f) {
                        st.created_folders.push(f.clone());
                    }
                }
                let _ = fs::write(&arq, serde_json::to_string(&novo).unwrap());
            }
            if tirados > 0 {
                say(&mut rep, format!("{tirados} predefinições da versão anterior foram retiradas"));
            }
        }
    }

    rep.presets = nomes.len();
    rep.user_data = uds.iter().map(|u| fwd(u)).collect();
    say(&mut rep, format!("{} predefinições instaladas e organizadas", nomes.len()));

    // 3. registro do que foi instalado
    let mut fonts_created: Vec<String> = fr.created.iter().map(|p| p.to_string_lossy().to_string()).collect();
    if let Some(prev) = read_json(&state_path(env, &m.id)).and_then(|j| serde_json::from_value::<Installed>(j).ok()) {
        for f in prev.fonts_created {
            if !fonts_created.contains(&f) {
                fonts_created.push(f);
            }
        }
        // pastas criadas numa instalação anterior continuam sendo "nossas" (reinstalar reaproveita)
        for pt in prev.targets {
            if let Some(t) = targets.iter_mut().find(|t| t.user_data == pt.user_data) {
                for f in pt.created_folders {
                    if !t.created_folders.contains(&f) {
                        t.created_folders.push(f);
                    }
                }
            }
        }
    }
    let st = Installed {
        id: m.id.clone(),
        name: m.name.clone(),
        version: m.version.clone(),
        installed_at: now(),
        targets,
        fonts_created,
        backup_dir: backup_root.to_string_lossy().to_string(),
        ..Default::default()
    };
    let _ = fs::create_dir_all(env.state_dir());
    fs::write(state_path(env, &m.id), serde_json::to_string_pretty(&st).unwrap()).map_err(|e| e.to_string())?;
    if !rep.missing_fonts.is_empty() {
        let faltam = rep.missing_fonts.join(", ");
        say(&mut rep, format!("Aviso: fontes não incluídas no pacote: {faltam}"));
    }
    Ok(rep)
}

pub fn uninstall(env: &Env, id: &str, progress: &mut dyn FnMut(&str)) -> Result<(), String> {
    let sp = state_path(env, id);
    let st: Installed = read_json(&sp).and_then(|j| serde_json::from_value(j).ok()).ok_or("Pacote não está instalado.")?;
    if st.kind == "lut" {
        if env.system_integration && capcut_running() {
            return Err("O CapCut está aberto. Feche o CapCut e tente de novo.".into());
        }
        uninstall_luts(env, &st, progress);
        let _ = fs::remove_file(sp);
        progress("LUTs removidos. Os LUTs que você importou por conta própria continuam lá.");
        return Ok(());
    }
    if st.kind == "media" {
        uninstall_media(env, &st, progress);
        let _ = fs::remove_file(sp);
        progress("Pacote removido.");
        return Ok(());
    }
    if env.system_integration && capcut_running() {
        return Err("O CapCut está aberto. Feche o CapCut e tente de novo.".into());
    }
    for t in &st.targets {
        let presets = PathBuf::from(&t.user_data).join("Presets").join("Combination").join("Presets");
        for n in &t.presets {
            let _ = fs::remove_dir_all(presets.join(n));
        }
        let arq = presets.join(index::FILE);
        if let Some(v) = read_json(&arq) {
            let novo = index::remove(v, &t.preset_ids, &t.created_folders);
            let _ = fs::write(&arq, serde_json::to_string(&novo).unwrap());
        }
        let msg = format!("{} predefinições removidas de {}", t.presets.len(), t.user_data);
        log_line(env, &msg);
        progress(&msg);
    }
    // fontes: só remove as criadas pelo FL Hub e que nenhum outro pacote instalado usa
    let outras: Vec<String> = installed(env).into_iter().filter(|p| p.id != id).flat_map(|p| p.fonts_created).collect();
    let remover: Vec<PathBuf> = st.fonts_created.iter().filter(|f| !outras.contains(f)).map(PathBuf::from).collect();
    for l in remove_fonts(env, &remover) {
        log_line(env, &l);
    }
    let _ = fs::remove_file(sp);
    progress("Pacote removido. Seus projetos e predefinições próprias não foram tocados.");
    Ok(())
}

/// Texto de diagnóstico para suporte.
pub fn diagnose(env: &Env) -> String {
    let mut s = String::new();
    s += &format!("Base FL {}\nSistema: {:?}\nData: {}\n", env!("CARGO_PKG_VERSION"), env.target, now());
    s += &format!("CapCut aberto: {}\n", if capcut_running() { "SIM" } else { "não" });
    let uds = env.capcut_user_data();
    s += &format!("Pastas do CapCut: {}\n", if uds.is_empty() { "NÃO ENCONTRADAS".into() } else { uds.iter().map(|u| fwd(u)).collect::<Vec<_>>().join(" | ") });
    for ud in &uds {
        let p = ud.join("Presets").join("Combination").join("Presets");
        let n = fs::read_dir(&p).map(|r| r.flatten().filter(|e| e.path().is_dir()).count()).unwrap_or(0);
        s += &format!("  predefinições em {}: {}\n", fwd(ud), n);
        s += &format!("  índice de pastas: {}\n", if p.join(index::FILE).exists() { "sim" } else { "não" });
    }
    for i in installed(env) {
        s += &format!("Instalado: {} v{} em {}\n", i.name, i.version, i.installed_at);
    }
    s
}
