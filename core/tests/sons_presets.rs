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
    fs::write(media.join("FL - Swoosh 01.m4a"), "x").unwrap();
    fs::create_dir_all(env.state_dir()).unwrap();
    fs::write(env.state_dir().join("fl-sons.json"), format!(r#"{{"id":"fl-sons","name":"Efeitos Sonoros","version":"1.0.0","installed_at":"","targets":[],"fonts_created":[],"backup_dir":"","kind":"media","media_path":"{}","media_files":["Swoosh/FL - Swoosh 01.m4a"]}}"#, env.media_root().join("Efeitos Sonoros").to_string_lossy().replace('\\', "/"))).unwrap();

    let pack = Pack::open(Path::new(PACK), &tmp.path().join("x")).unwrap();
    let r = install(&env, &pack, &mut |_| {}).unwrap();
    assert_eq!(r.presets, 65);
    assert!(!env.media_root().exists(), "pasta de mídia antiga removida");
    let presets = ud.join("Presets/Combination/Presets");
    let ficha: Value = serde_json::from_str(&fs::read_to_string(presets.join("FL - Swoosh 01/FL - Swoosh 01.json")).unwrap()).unwrap();
    let ap = ficha["audio_path"].as_str().unwrap();
    assert!(!ap.contains("__PLUGA_UD__"), "{ap}");
    assert!(Path::new(ap).exists(), "som de prévia existe: {ap}");
    assert_eq!(ficha["type"], "audio");
    let dc = fs::read_to_string(presets.join("FL - Swoosh 01/preset_draft/draft_content.json")).unwrap();
    let res = dc.split("/Resources/").nth(1).unwrap().split('"').next().unwrap();
    assert!(ud.join("Presets/Combination/Resources").join(res).exists());
    assert!(!dc.contains("fd933165de7a78bcc4658fa5680a4b58"), "sem identificador do criador");
    let idx: Value = serde_json::from_str(&fs::read_to_string(presets.join("CombinationPresetVirtualStore.json")).unwrap()).unwrap();
    let nomes: Vec<String> = idx["preset_virtual_store"].as_array().unwrap().iter().find(|b| b["type"] == 0).unwrap()["value"].as_array().unwrap().iter().map(|x| x["name"].as_str().unwrap().to_string()).collect();
    assert!(nomes.contains(&"FL - Efeitos Sonoros".to_string()) && nomes.contains(&"Swoosh".to_string()));
    uninstall(&env, "fl-sons", &mut |_| {}).unwrap();
    assert!(!presets.join("FL - Swoosh 01").exists());
    println!("{target:?}: ok, prévia em {ap}");
}
#[test] fn sons_mac() { cenario(Target::Mac); }
#[test] fn sons_windows() { cenario(Target::Windows); }
