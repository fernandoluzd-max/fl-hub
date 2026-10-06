//! Pack de sons como predefinições de áudio do CapCut: instala, aponta o som para a pasta do aluno e remove.
use flcore::{env::Env, install, uninstall, Pack, Target};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};

const PACK: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../packs/efeitos-sonoros.flpack");

fn cenario(target: Target) {
    if !Path::new(PACK).exists() { return; }
    let tmp = tempfile::tempdir().unwrap();
    let home = tmp.path().join("home");
    let env = Env { target, home: home.clone(), local_appdata: Some(home.join("AppData/Local")), windir: None, data_dir: tmp.path().join("data"), system_integration: false };
    let ud: PathBuf = match target { Target::Windows => home.join("AppData/Local/CapCut/User Data"), _ => home.join("Movies/CapCut/User Data") };
    fs::create_dir_all(ud.join("Presets/Combination/Presets")).unwrap();
    // simula a instalação antiga como pasta de mídia (deve ser limpa)
    let media = env.media_root().join("Efeitos Sonoros/Swoosh");
    fs::create_dir_all(&media).unwrap();
    fs::write(media.join("Base FL - Whoosh 01.m4a"), "x").unwrap();
    fs::create_dir_all(env.state_dir()).unwrap();
    fs::write(env.state_dir().join("fl-sons.json"), format!(r#"{{"id":"fl-sons","name":"Efeitos Sonoros","version":"1.0.0","installed_at":"","targets":[],"fonts_created":[],"backup_dir":"","kind":"media","media_path":"{}","media_files":["Swoosh/Base FL - Whoosh 01.m4a"]}}"#, env.media_root().join("Efeitos Sonoros").to_string_lossy().replace('\\', "/"))).unwrap();

    let pack = Pack::open(Path::new(PACK), &tmp.path().join("x")).unwrap();
    let r = install(&env, &pack, &mut |_| {}).unwrap();
    assert_eq!(r.presets, 261);
    assert!(!env.media_root().exists(), "pasta de mídia antiga removida");
    let presets = ud.join("Presets/Combination/Presets");
    let ficha: Value = serde_json::from_str(&fs::read_to_string(presets.join("Base FL - Whoosh 01/Base FL - Whoosh 01.json")).unwrap()).unwrap();
    let ap = ficha["audio_path"].as_str().unwrap();
    assert!(!ap.contains("__PLUGA_UD__"), "{ap}");
    assert!(Path::new(ap).exists(), "som de prévia existe: {ap}");
    assert_eq!(ficha["type"], "audio");
    let dc = fs::read_to_string(presets.join("Base FL - Whoosh 01/preset_draft/draft_content.json")).unwrap();
    let res = dc.split("/Resources/").nth(1).unwrap().split('"').next().unwrap();
    assert!(ud.join("Presets/Combination/Resources").join(res).exists());
    assert!(!dc.contains("fd933165de7a78bcc4658fa5680a4b58"), "sem identificador do criador");
    let idx: Value = serde_json::from_str(&fs::read_to_string(presets.join("CombinationPresetVirtualStore.json")).unwrap()).unwrap();
    let nomes: Vec<String> = idx["preset_virtual_store"].as_array().unwrap().iter().find(|b| b["type"] == 0).unwrap()["value"].as_array().unwrap().iter().map(|x| x["name"].as_str().unwrap().to_string()).collect();
    assert!(nomes.contains(&"Base FL - Efeitos Sonoros".to_string()) && nomes.contains(&"Whooshes".to_string()));
    uninstall(&env, "fl-sons", &mut |_| {}).unwrap();
    assert!(!presets.join("Base FL - Whoosh 01").exists());
    println!("{target:?}: ok, prévia em {ap}");
}
#[test] fn sons_mac() { cenario(Target::Mac); }
#[test] fn sons_windows() { cenario(Target::Windows); }

// Atualização da 1.1.0 (nomes "FL - ...", 11 pastas) para a 1.2.0 (nomes "Base FL - ...", 6 pastas): nada antigo pode sobrar.
const ANTIGO: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../packs/efeitos-sonoros-1.1.0.flpack");
fn atualiza(target: Target) {
    if !Path::new(PACK).exists() || !Path::new(ANTIGO).exists() { return; }
    let tmp = tempfile::tempdir().unwrap();
    let home = tmp.path().join("home");
    let env = Env { target, home: home.clone(), local_appdata: Some(home.join("AppData/Local")), windir: None, data_dir: tmp.path().join("data"), system_integration: false };
    let ud: PathBuf = match target { Target::Windows => home.join("AppData/Local/CapCut/User Data"), _ => home.join("Movies/CapCut/User Data") };
    let presets = ud.join("Presets/Combination/Presets");
    fs::create_dir_all(&presets).unwrap();
    // uma predefinição do próprio aluno, numa pasta dele: não pode ser tocada
    fs::create_dir_all(presets.join("Meu preset")).unwrap();
    fs::write(presets.join("CombinationPresetVirtualStore.json"), r#"{"preset_virtual_store":[{"type":0,"value":[{"id":"PASTA-ALUNO","name":"Minhas","type":0},{"id":"P-ALUNO","name":"Meu preset","type":1}]},{"type":1,"value":[{"child_id":"PASTA-ALUNO","parent_id":""},{"child_id":"P-ALUNO","parent_id":"PASTA-ALUNO"}]}]}"#).unwrap();
    let velho = Pack::open(Path::new(ANTIGO), &tmp.path().join("v")).unwrap();
    assert_eq!(install(&env, &velho, &mut |_| {}).unwrap().presets, 65);
    assert!(presets.join("FL - Swoosh 01").exists());
    let novo = Pack::open(Path::new(PACK), &tmp.path().join("n")).unwrap();
    let r = install(&env, &novo, &mut |_| {}).unwrap();
    assert_eq!(r.presets, 261);
    let pastas = |p: &Path| -> Vec<String> { fs::read_dir(p).unwrap().flatten().filter(|e| e.path().is_dir()).map(|e| e.file_name().to_string_lossy().to_string()).collect() };
    let d = pastas(&presets);
    assert_eq!(d.iter().filter(|n| n.starts_with("Base FL - ")).count(), 261);
    assert_eq!(d.iter().filter(|n| n.starts_with("FL - ")).count(), 0, "sobrou predefinição antiga: {d:?}");
    assert!(d.contains(&"Meu preset".to_string()));
    let le = || -> Value { serde_json::from_str(&fs::read_to_string(presets.join("CombinationPresetVirtualStore.json")).unwrap()).unwrap() };
    let nomes = |v: &Value, tipo: i64| -> Vec<String> { v["preset_virtual_store"][0]["value"].as_array().unwrap().iter().filter(|x| x["type"] == tipo).map(|x| x["name"].as_str().unwrap().to_string()).collect() };
    let idx = le();
    let mut f = nomes(&idx, 0); f.sort();
    assert_eq!(f, vec!["Base FL - Efeitos Sonoros", "Bass", "Beeps", "Camera", "Clock & Counter", "Foley", "Impacts", "Minhas", "Money", "Notifications", "Phone", "Pops & Clicks", "Risers", "Success & Level Up", "Whooshes", "Whooshes Bass & Magic"], "pastas no CapCut");
    let it = nomes(&idx, 1);
    assert_eq!(it.len(), 262, "261 nossos + 1 do aluno");
    assert!(it.iter().all(|n| n == "Meu preset" || n.starts_with("Base FL - ")));
    // instalar de novo a mesma versão não duplica nada
    install(&env, &novo, &mut |_| {}).unwrap();
    assert_eq!(nomes(&le(), 1).len(), 262);
    assert_eq!(nomes(&le(), 0).len(), 16);
    // remover: sai tudo o que é nosso, fica o que é do aluno
    uninstall(&env, "fl-sons", &mut |_| {}).unwrap();
    assert_eq!(pastas(&presets), vec!["Meu preset".to_string()]);
    let idx = le();
    assert_eq!(nomes(&idx, 0), vec!["Minhas".to_string()]);
    assert_eq!(nomes(&idx, 1), vec!["Meu preset".to_string()]);
}
#[test] fn atualiza_mac() { atualiza(Target::Mac); }
#[test] fn atualiza_windows() { atualiza(Target::Windows); }
