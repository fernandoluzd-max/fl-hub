//! Pacote de sons: instala na pasta Filmes/Vídeos › Pluga & Edita, atualiza e remove sem tocar em arquivos do aluno.
use flcore::{env::Env, install, installed, uninstall, Pack, Target};
use std::fs;
use std::io::Write;
use std::path::Path;

fn flpack(path: &Path, files: &[(&str, &str)], versao: &str) {
    let f = fs::File::create(path).unwrap();
    let mut z = zip::ZipWriter::new(f);
    let o = zip::write::SimpleFileOptions::default();
    z.start_file("manifest.json", o).unwrap();
    write!(z, r#"{{"id":"fl-sons","name":"Efeitos Sonoros","version":"{versao}","kind":"media","media_dir":"media","media_target":"Efeitos Sonoros"}}"#).unwrap();
    for (n, c) in files {
        z.start_file(format!("media/{n}"), o).unwrap();
        z.write_all(c.as_bytes()).unwrap();
    }
    z.finish().unwrap();
}

fn cenario(target: Target) {
    let tmp = tempfile::tempdir().unwrap();
    let home = tmp.path().join("home");
    let env = Env { target, home: home.clone(), local_appdata: Some(home.join("AppData/Local")), windir: None, data_dir: tmp.path().join("data"), system_integration: false };
    let base = env.media_root().join("Efeitos Sonoros");
    // arquivo do aluno na mesma pasta (não pode ser apagado)
    fs::create_dir_all(base.join("Impact")).unwrap();
    fs::write(base.join("Impact/meu som.wav"), "aluno").unwrap();

    let p1 = tmp.path().join("v1.flpack");
    flpack(&p1, &[("Impact/FL - Impact 01.m4a", "a"), ("Swoosh/FL - Swoosh 01.m4a", "b"), ("Swoosh/FL - Velho.m4a", "c")], "1.0.0");
    let pack = Pack::open(&p1, &tmp.path().join("x1")).unwrap();
    let r = install(&env, &pack, &mut |_| {}).unwrap();
    assert_eq!(r.presets, 3);
    assert!(base.join("Swoosh/FL - Velho.m4a").exists());

    // versão nova sem "Velho": atualização remove o que saiu
    let p2 = tmp.path().join("v2.flpack");
    flpack(&p2, &[("Impact/FL - Impact 01.m4a", "a2"), ("Swoosh/FL - Swoosh 01.m4a", "b")], "1.1.0");
    let pack2 = Pack::open(&p2, &tmp.path().join("x2")).unwrap();
    install(&env, &pack2, &mut |_| {}).unwrap();
    assert!(!base.join("Swoosh/FL - Velho.m4a").exists());
    assert_eq!(fs::read_to_string(base.join("Impact/FL - Impact 01.m4a")).unwrap(), "a2");
    let st = installed(&env);
    assert_eq!(st.len(), 1);
    assert_eq!(st[0].kind, "media");
    assert_eq!(st[0].version, "1.1.0");

    uninstall(&env, "fl-sons", &mut |_| {}).unwrap();
    assert!(!base.join("Swoosh").exists(), "pasta vazia removida");
    assert!(base.join("Impact/meu som.wav").exists(), "arquivo do aluno preservado");
    assert!(installed(&env).is_empty());
    println!("{target:?}: ok em {}", base.display());
}

#[test]
fn media_mac() {
    cenario(Target::Mac);
}
#[test]
fn media_windows() {
    cenario(Target::Windows);
}
