//! Mídia perdida em projetos do aluno: diagnóstico, religação das nossas mídias, e garantia de que
//! atualizar um pacote nunca apaga mídia que projetos antigos usam.
use flcore::{env::Env, install, projetos, Pack, Target};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};

fn ambiente(target: Target, tmp: &Path) -> (Env, PathBuf) {
    let home = tmp.join("home");
    let env = Env { target, home: home.clone(), local_appdata: Some(home.join("AppData/Local")), windir: None, data_dir: tmp.join("data"), system_integration: false };
    let ud: PathBuf = match target { Target::Windows => home.join("AppData/Local/CapCut/User Data"), _ => home.join("Movies/CapCut/User Data") };
    fs::create_dir_all(ud.join("Presets/Combination/Presets")).unwrap();
    (env, ud)
}

/// Pacote mínimo com uma predefinição que usa um som do próprio pacote (marcador __PLUGA_UD__).
fn pacote(dir: &Path, versao: &str, recurso: &str) -> Pack {
    let p = dir.join("presets/Titulo 01/preset_draft");
    fs::create_dir_all(&p).unwrap();
    fs::write(dir.join("presets/Titulo 01/Titulo 01.json"), r#"{"name":"Titulo 01"}"#).unwrap();
    let dc = format!(r#"{{"materials":{{"audios":[{{"path":"__PLUGA_UD__/Presets/Combination/Resources/{recurso}","type":"extract_music"}}],"texts":[{{"content":"Oi"}}]}}}}"#);
    fs::write(p.join("draft_content.json"), dc).unwrap();
    fs::create_dir_all(dir.join("resources")).unwrap();
    fs::write(dir.join("resources").join(recurso), "som").unwrap();
    fs::write(dir.join("manifest.json"), format!(r#"{{"id":"fl-teste","name":"Teste","version":"{versao}","presets_dir":"presets","resources_dir":"resources"}}"#)).unwrap();
    Pack::from_dir(dir).unwrap()
}

fn cenario(target: Target) {
    let tmp = tempfile::tempdir().unwrap();
    let (env, ud) = ambiente(target, tmp.path());
    let ud_s = ud.to_string_lossy().replace('\\', "/");
    let res = ud.join("Presets/Combination/Resources");

    // 1. instala a versão 1 (som basefl-aaa.mp3)
    install(&env, &pacote(&tmp.path().join("v1"), "1.0.0", "basefl-aaa.mp3"), &mut |_| {}).unwrap();
    assert!(res.join("basefl-aaa.mp3").exists());

    // 2. atualiza para a versão 2, que troca o som: o antigo NÃO pode sumir (projetos antigos usam)
    install(&env, &pacote(&tmp.path().join("v2"), "2.0.0", "basefl-bbb.mp3"), &mut |_| {}).unwrap();
    assert!(res.join("basefl-aaa.mp3").exists(), "atualização apagou mídia usada por projetos antigos");
    assert!(res.join("basefl-bbb.mp3").exists());

    // 3. projeto do aluno com: mídia nossa que estava em outro caminho (ex.: instalação antiga),
    //    mídia do próprio aluno que sumiu, e uma mídia que existe
    let proj = ud.join("Projects/com.lveditor.draft/Meu video");
    fs::create_dir_all(&proj).unwrap();
    let existe = tmp.path().join("clipe.mp4");
    fs::write(&existe, "v").unwrap();
    let antigo = "C:/Users/antigo/AppData/Local/CapCut/User Data/Presets/Combination/Resources/basefl-aaa.mp3";
    let aluno = "C:/Users/alan_/AppData/Local/Temp/9773286F-FE629C_video.mp4";
    let dc = serde_json::json!({"materials": {
        "audios": [{"path": antigo}],
        "videos": [{"path": aluno}, {"path": existe.to_string_lossy().replace('\\', "/")}],
        "texts": [{"content": "Título"}]
    }});
    fs::write(proj.join("draft_content.json"), serde_json::to_string(&dc).unwrap()).unwrap();
    fs::write(proj.join("draft_content.json.bak"), serde_json::to_string(&dc).unwrap()).unwrap();
    // um projeto em formato que não dá para ler (protegido)
    let prot = ud.join("Projects/com.lveditor.draft/Protegido");
    fs::create_dir_all(&prot).unwrap();
    fs::write(prot.join("draft_content.json"), [0u8, 159, 146, 150, 1, 2]).unwrap();

    let v = projetos::verificar(&env);
    assert_eq!(v.projetos, 2);
    assert_eq!(v.ilegiveis, vec!["Protegido".to_string()]);
    assert_eq!(v.faltando.len(), 2, "{:?}", v.faltando);
    let nossa = v.faltando.iter().find(|m| m.nossa).unwrap();
    assert_eq!(nossa.arquivo, "basefl-aaa.mp3");
    assert!(nossa.encontrado_em.as_deref().unwrap().starts_with(&ud_s));
    let do_aluno = v.faltando.iter().find(|m| !m.nossa).unwrap();
    assert_eq!(do_aluno.caminho, aluno);
    assert!(do_aluno.encontrado_em.is_none());

    // 4. reparo: religa só a nossa, com backup; a do aluno fica como estava
    let r = projetos::reparar(&env, &mut |_| {}).unwrap();
    assert_eq!(r.projetos_alterados, 1);
    assert_eq!(r.midias_religadas, 1);
    let depois: Value = serde_json::from_str(&fs::read_to_string(proj.join("draft_content.json")).unwrap()).unwrap();
    let novo = depois["materials"]["audios"][0]["path"].as_str().unwrap();
    assert!(Path::new(novo).exists(), "religado para {novo}");
    assert_eq!(depois["materials"]["videos"][0]["path"], aluno, "mídia do aluno não pode ser alterada");
    assert!(fs::read_to_string(proj.join("draft_content.json.bak")).unwrap().contains(novo), "cópia .bak do CapCut também religada");
    assert!(Path::new(&r.backup).join("Meu video/draft_content.json").exists(), "backup do projeto");
    assert_eq!(projetos::verificar(&env).faltando.iter().filter(|m| m.nossa).count(), 0);

    // 5. diagnóstico mostra o que falta e de quem é
    let d = flcore::diagnose(&env);
    assert!(d.contains("Projetos verificados: 2"), "{d}");
    assert!(d.contains("[aluno] Meu video"), "{d}");
}

#[test]
fn windows() {
    cenario(Target::Windows);
}
#[test]
fn mac() {
    cenario(Target::Mac);
}

/// Pasta de rascunhos escolhida no CapCut também é verificada.
#[test]
fn pasta_de_rascunhos_escolhida() {
    let tmp = tempfile::tempdir().unwrap();
    let (env, ud) = ambiente(Target::Windows, tmp.path());
    let outra = tmp.path().join("D/Projetos CapCut");
    fs::create_dir_all(outra.join("com.lveditor.draft/Video X")).unwrap();
    fs::write(outra.join("com.lveditor.draft/Video X/draft_content.json"), r#"{"materials":{"videos":[{"path":"D:/sumiu.mp4"}]}}"#).unwrap();
    fs::create_dir_all(ud.join("Config")).unwrap();
    fs::write(ud.join("Config/globalSetting"), format!("[General]\ncurrentCustomDraftPath={}\n", outra.to_string_lossy().replace('\\', "/"))).unwrap();
    let v = projetos::verificar(&env);
    assert_eq!(v.projetos, 1);
    assert_eq!(v.faltando[0].caminho, "D:/sumiu.mp4");
}

/// Auditoria do pacote real dos Títulos: acha referências que só existem no computador do criador.
#[test]
fn auditoria_pacote_titulos() {
    let pk = concat!(env!("CARGO_MANIFEST_DIR"), "/../packs/legendas.flpack");
    if !Path::new(pk).exists() {
        return;
    }
    let tmp = tempfile::tempdir().unwrap();
    let pack = Pack::open(Path::new(pk), &tmp.path().join("x")).unwrap();
    let ext = projetos::referencias_externas(&pack.presets_path());
    println!("referências externas no pacote dos Títulos: {}", ext.len());
    for e in ext.iter().take(10) {
        println!("  {e}");
    }
    assert!(ext.iter().all(|e| !e.contains("/Cache/effect/")));
}
