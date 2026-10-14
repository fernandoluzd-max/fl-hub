//! Base FL Assets: 100 predefinições de VÍDEO em 10 pastas. Instala, mantém o que é do aluno, reinstala sem duplicar e remove.
//! Usa um pacote com a mesma estrutura do real, mas com vídeos de mentira (o instalador não lê o conteúdo dos vídeos).
use flcore::{env::Env, install, uninstall, Pack, Target};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};

fn pack_path() -> String {
    std::env::var("ASSETS_PACK").unwrap_or_else(|_| concat!(env!("CARGO_MANIFEST_DIR"), "/../mini.flpack").to_string())
}

fn cenario(target: Target) {
    let pk = pack_path();
    if !Path::new(&pk).exists() { panic!("pacote de teste não encontrado: {pk}"); }
    let tmp = tempfile::tempdir().unwrap();
    let home = tmp.path().join("home");
    let env = Env { target, home: home.clone(), local_appdata: Some(home.join("AppData/Local")), windir: None, data_dir: tmp.path().join("data"), system_integration: false };
    let ud: PathBuf = match target { Target::Windows => home.join("AppData/Local/CapCut/User Data"), _ => home.join("Movies/CapCut/User Data") };
    let presets = ud.join("Presets/Combination/Presets");
    fs::create_dir_all(presets.join("Meu preset")).unwrap();
    fs::write(presets.join("CombinationPresetVirtualStore.json"), r#"{"preset_virtual_store":[{"type":0,"value":[{"id":"PASTA-ALUNO","name":"Minhas","type":0},{"id":"P-ALUNO","name":"Meu preset","type":1}]},{"type":1,"value":[{"child_id":"PASTA-ALUNO","parent_id":""},{"child_id":"P-ALUNO","parent_id":"PASTA-ALUNO"}]}]}"#).unwrap();

    let pack = Pack::open(Path::new(&pk), &tmp.path().join("x")).unwrap();
    assert_eq!(pack.manifest.id, "fl-assets");
    let r = install(&env, &pack, &mut |_| {}).unwrap();
    assert_eq!(r.presets, 100, "100 animações");

    let nome = "001 - Seta Curva Ascendente";
    let ficha: Value = serde_json::from_str(&fs::read_to_string(presets.join(nome).join(format!("{nome}.json"))).unwrap()).unwrap();
    assert_eq!(ficha["type"], "video");
    assert!(presets.join(nome).join(format!("{nome}.jpeg")).exists(), "capa da predefinição instalada");
    let dc = fs::read_to_string(presets.join(nome).join("preset_draft/draft_content.json")).unwrap();
    let res = dc.split("/Resources/").nth(1).unwrap().split('"').next().unwrap();
    assert!(res.ends_with(".mov"));
    assert!(ud.join("Presets/Combination/Resources").join(res).exists(), "vídeo copiado para os recursos do CapCut");
    assert!(!dc.contains("7133561999128298497"), "sem a conta de quem criou o molde");

    let le = || -> Value { serde_json::from_str(&fs::read_to_string(presets.join("CombinationPresetVirtualStore.json")).unwrap()).unwrap() };
    let nomes = |v: &Value, tipo: i64| -> Vec<String> { v["preset_virtual_store"][0]["value"].as_array().unwrap().iter().filter(|x| x["type"] == tipo).map(|x| x["name"].as_str().unwrap().to_string()).collect() };
    let idx = le();
    let pastas = nomes(&idx, 0);
    assert!(pastas.contains(&"Base FL Assets".to_string()) && pastas.contains(&"03 - Interface e Navegação".to_string()) && pastas.contains(&"Minhas".to_string()), "{pastas:?}");
    assert_eq!(pastas.len(), 12, "raiz + 10 categorias + a pasta do aluno");
    assert_eq!(nomes(&idx, 1).len(), 101, "100 nossas + 1 do aluno");

    // instalar de novo não duplica
    install(&env, &pack, &mut |_| {}).unwrap();
    assert_eq!(nomes(&le(), 1).len(), 101);

    // reembolso / desinstalação: sai tudo o que é nosso, fica o do aluno
    uninstall(&env, "fl-assets", &mut |_| {}).unwrap();
    assert!(!presets.join(nome).exists());
    assert!(presets.join("Meu preset").exists());
    let depois = le();
    assert_eq!(nomes(&depois, 1), vec!["Meu preset".to_string()]);
    assert_eq!(nomes(&depois, 0), vec!["Minhas".to_string()]);
    assert!(!ud.join("Presets/Combination/Resources").join(res).exists(), "vídeo removido dos recursos");
    println!("{target:?}: ok");
}
#[test] fn assets_mac() { cenario(Target::Mac); }
#[test] fn assets_windows() { cenario(Target::Windows); }
