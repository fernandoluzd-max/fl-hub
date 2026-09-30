//! Pacote de LUTs: entra na aba Ajuste › LUT (Resources/Lut + LutImportCfg.json), preserva LUTs do aluno e sai limpo.
use flcore::{env::Env, install, uninstall, Pack, Target};
use serde_json::Value;
use std::fs;
use std::path::Path;
const PACK: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../packs/luts.flpack");
fn cenario(target: Target) {
    if !Path::new(PACK).exists() { return; }
    let tmp = tempfile::tempdir().unwrap();
    let home = tmp.path().join("home");
    let env = Env { target, home: home.clone(), local_appdata: Some(home.join("AppData/Local")), windir: None, data_dir: tmp.path().join("data"), system_integration: false };
    let ud = match target { Target::Windows => home.join("AppData/Local/CapCut/User Data"), _ => home.join("Movies/CapCut/User Data") };
    let lut = ud.join("Resources/Lut");
    fs::create_dir_all(lut.join("MeuLut")).unwrap();
    fs::write(lut.join("MeuLut/MeuLut.cube"), "x").unwrap();
    fs::write(lut.join("LutImportCfg.json"), r#"[{"imagePath":"a","originPath":"b","path":"c","title":"MeuLut.cube"}]"#).unwrap();
    let pack = Pack::open(Path::new(PACK), &tmp.path().join("x")).unwrap();
    let r = install(&env, &pack, &mut |_| {}).unwrap();
    assert_eq!(r.presets, 23);
    install(&env, &pack, &mut |_| {}).unwrap(); // reinstalar não duplica
    let cfg: Vec<Value> = serde_json::from_str(&fs::read_to_string(lut.join("LutImportCfg.json")).unwrap()).unwrap();
    assert_eq!(cfg.len(), 24, "23 + o do aluno, sem duplicar");
    assert_eq!(cfg[0]["title"], "MeuLut.cube");
    // o último da lista é o primeiro que aparece no CapCut: tem que ser o Gênese
    assert_eq!(cfg.last().unwrap()["title"], "FL Gênese — Apple Log → Rec.709.cube");
    for e in &cfg[1..] {
        let p = e["path"].as_str().unwrap();
        assert!(Path::new(p).exists(), "cube existe: {p}");
        assert!(Path::new(e["imagePath"].as_str().unwrap()).exists());
    }
    assert!(lut.join("FL Fim de Tarde/config.json").exists());
    uninstall(&env, "fl-luts", &mut |_| {}).unwrap();
    let cfg: Vec<Value> = serde_json::from_str(&fs::read_to_string(lut.join("LutImportCfg.json")).unwrap()).unwrap();
    assert_eq!(cfg.len(), 1);
    assert!(lut.join("MeuLut/MeuLut.cube").exists());
    assert!(!lut.join("FL Fim de Tarde").exists());
    println!("{target:?}: ok");
}
#[test] fn luts_mac() { cenario(Target::Mac); }
#[test] fn luts_windows() { cenario(Target::Windows); }
