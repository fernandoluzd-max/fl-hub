//! Simula a instalação num Mac e num Windows de aluno usando o pacote real de Legendas.
use flcore::{env::Env, install, installed, uninstall, Pack, Target};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};

const PACK: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../packs/legendas.flpack");

fn env_for(target: Target, root: &Path) -> Env {
    let home = root.join("home");
    Env {
        target,
        home: home.clone(),
        local_appdata: Some(home.join("AppData/Local")),
        windir: Some(root.join("Windows")),
        data_dir: root.join("flhub-data"),
        system_integration: false,
    }
}

fn user_data(env: &Env) -> PathBuf {
    match env.target {
        Target::Windows => env.local_appdata.clone().unwrap().join("CapCut/User Data"),
        _ => env.home.join("Movies/CapCut/User Data"),
    }
}

/// índice que o aluno já tinha: uma pasta dele, uma predefinição dele e uma pasta com o mesmo nome da nossa
const ALUNO: &str = r#"{"preset_virtual_store":[{"type":0,"value":[
 {"id":"F-ALUNO","name":"Minhas coisas","type":0},{"id":"P-ALUNO","name":"Aluno 1","type":1},
 {"id":"F-GANCHO","name":"Títulos - Ganchos","type":0}]},
 {"type":1,"value":[{"child_id":"F-ALUNO","parent_id":""},{"child_id":"P-ALUNO","parent_id":"F-ALUNO"},{"child_id":"F-GANCHO","parent_id":""}]}]}"#;

fn idx(ud: &Path) -> Value {
    serde_json::from_str(&fs::read_to_string(ud.join("Presets/Combination/Presets/CombinationPresetVirtualStore.json")).unwrap()).unwrap()
}
fn entries(v: &Value) -> (Vec<Value>, Vec<Value>) {
    let a = v["preset_virtual_store"].as_array().unwrap();
    let e = a.iter().find(|b| b["type"] == 0).unwrap()["value"].as_array().unwrap().clone();
    let r = a.iter().find(|b| b["type"] == 1).unwrap()["value"].as_array().unwrap().clone();
    (e, r)
}

fn cenario(target: Target) {
    if !Path::new(PACK).exists() {
        eprintln!("pacote de teste ausente (packs/legendas.flpack): teste ignorado");
        return;
    }
    let tmp = tempfile::tempdir().unwrap();
    let env = env_for(target, tmp.path());
    let ud = user_data(&env);
    fs::create_dir_all(ud.join("Presets/Combination/Presets")).unwrap();
    fs::write(ud.join("Presets/Combination/Presets/CombinationPresetVirtualStore.json"), ALUNO).unwrap();
    // predefinição própria do aluno (não pode ser tocada)
    fs::create_dir_all(ud.join("Presets/Combination/Presets/Aluno 1")).unwrap();
    fs::write(ud.join("Presets/Combination/Presets/Aluno 1/x.json"), "{}").unwrap();
    if target == Target::Mac {
        fs::create_dir_all(env.mac_container().join("Data")).unwrap();
    }
    if target == Target::Windows {
        fs::create_dir_all(tmp.path().join("Windows/Fonts")).unwrap();
        fs::write(tmp.path().join("Windows/Fonts/georgiab.ttf"), "x").unwrap();
        fs::write(tmp.path().join("Windows/Fonts/arial.ttf"), "x").unwrap();
    }

    let pack = Pack::open(Path::new(PACK), &tmp.path().join("extract")).unwrap();
    let mut msgs = vec![];
    let rep = install(&env, &pack, &mut |m| msgs.push(m.to_string())).unwrap();
    assert_eq!(rep.presets, 145, "{target:?}");
    assert!(rep.files_patched > 100);

    // segunda instalação (reparar/atualizar) não pode duplicar nada
    install(&env, &pack, &mut |_| {}).unwrap();

    let (e, r) = entries(&idx(&ud));
    let nomes: Vec<&str> = e.iter().filter(|x| x["type"] == 1).map(|x| x["name"].as_str().unwrap()).collect();
    let mut uniq = nomes.clone();
    uniq.sort();
    uniq.dedup();
    assert_eq!(nomes.len(), uniq.len(), "duplicadas no índice");
    assert_eq!(nomes.len(), 146); // 145 + "Aluno 1"
    let gancho: Vec<&Value> = e.iter().filter(|x| x["name"] == "Títulos - Ganchos").collect();
    assert_eq!(gancho.len(), 1, "pasta reaproveitada, não duplicada");
    assert!(r.iter().any(|x| x["child_id"] == "P-ALUNO" && x["parent_id"] == "F-ALUNO"), "aluno preservado");

    // nenhum caminho do computador do criador sobrou; fontes apontam para arquivos existentes
    let presets = ud.join("Presets/Combination/Presets");
    let re = regex::Regex::new(r#""font_path":"([^"]+)""#).unwrap();
    let mut conferidas = 0;
    for ent in walkdir::WalkDir::new(&presets).into_iter().flatten() {
        let p = ent.path();
        if p.extension().map(|x| x == "json").unwrap_or(false) && p.file_name().unwrap() == "draft_content.json" {
            let s = fs::read_to_string(p).unwrap();
            // única exceção conhecida: fonte Neometric, que não vem no pacote (o CapCut usa a padrão)
            let sobra = s.matches("/Users/fernandoluz/").count() - s.matches("/Users/fernandoluz/Library/Containers/com.lemon.lvoverseas/Data/Library/Fonts/Neometric").count();
            assert_eq!(sobra, 0, "sobrou caminho do criador em {p:?}");
            serde_json::from_str::<Value>(&s).expect("JSON válido");
            for c in re.captures_iter(&s) {
                let fp = &c[1];
                let local = fp.contains("NeueHaas") || fp.contains("EastmanRoman") || fp.contains("Poppins") || fp.contains("SFPRO");
                if local && !fp.contains("/Cache/effect/") {
                    assert!(Path::new(fp).exists(), "fonte não existe: {fp}");
                    conferidas += 1;
                }
            }
        }
    }
    assert!(conferidas > 20);
    assert_eq!(installed(&env).len(), 1);

    // desinstalar: some só o pacote
    uninstall(&env, "fl-legendas", &mut |_| {}).unwrap();
    let (e2, _) = entries(&idx(&ud));
    let sobraram: Vec<&str> = e2.iter().map(|x| x["name"].as_str().unwrap()).collect();
    assert_eq!(sobraram.len(), 3, "sobrou: {sobraram:?}"); // pasta do aluno, predefinição do aluno, pasta Ganchos do aluno
    assert!(presets.join("Aluno 1/x.json").exists());
    assert!(!presets.join("01").exists());
    assert!(installed(&env).is_empty());
    println!("{target:?}: ok ({} mensagens, {} arquivos corrigidos, {} fontes conferidas)", msgs.len(), rep.files_patched, conferidas);
}

#[test]
fn mac() {
    cenario(Target::Mac);
}
#[test]
fn windows() {
    cenario(Target::Windows);
}
#[test]
fn sem_capcut() {
    if !Path::new(PACK).exists() {
        return;
    }
    let tmp = tempfile::tempdir().unwrap();
    let env = env_for(Target::Mac, tmp.path());
    let pack = Pack::open(Path::new(PACK), &tmp.path().join("x")).unwrap();
    let err = install(&env, &pack, &mut |_| {}).unwrap_err();
    assert!(err.contains("Abra o CapCut"));
}
