//! Aluno que escolheu no CapCut outra pasta para as predefinições
//! (Configurações › Rascunho › "Predefinir caminho para salvar" = customPresetPath).
//! O app precisa instalar lá também, e remover de lá também.
use flcore::{env::{custom_preset_path, ini_valor, Env}, install, uninstall, Pack, Target};
use std::fs;
use std::path::{Path, PathBuf};

const PACK: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../packs/legendas.flpack");
const SONS: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../packs/efeitos-sonoros.flpack");

fn env_for(target: Target, root: &Path) -> Env {
    let home = root.join("home");
    Env { target, home: home.clone(), local_appdata: Some(home.join("AppData/Local")), windir: Some(root.join("Windows")), data_dir: root.join("flhub-data"), system_integration: false }
}
fn ud_of(env: &Env) -> PathBuf {
    match env.target { Target::Windows => env.local_appdata.clone().unwrap().join("CapCut/User Data"), _ => env.home.join("Movies/CapCut/User Data") }
}
/// escreve o globalSetting como o CapCut (Qt) escreve: barras invertidas dobradas no Windows
fn escolhe_pasta(ud: &Path, pasta: &Path, estilo_windows: bool) {
    fs::create_dir_all(ud.join("Config")).unwrap();
    let mut v = pasta.to_string_lossy().to_string();
    if estilo_windows { v = v.replace('\\', "\\\\"); }
    fs::write(ud.join("Config/globalSetting"), format!("[General]\nagencyModeEnable=false\ncustomPresetPath={v}\nlinkageCustomViewed=false\n")).unwrap();
}
fn conta(p: &Path) -> usize { fs::read_dir(p).map(|r| r.flatten().filter(|e| e.path().is_dir()).count()).unwrap_or(0) }

#[test]
fn le_o_formato_do_capcut() {
    assert_eq!(ini_valor(r"C:\\Users\\Designer\\Desktop\\VIDEOS NOVEMBRO\\JianyingPro Presets"), r"C:\Users\Designer\Desktop\VIDEOS NOVEMBRO\JianyingPro Presets");
    assert_eq!(ini_valor(r#""C:\\Users\\Jo\xe3o\\V\xed\x64\x65os""#), r"C:\Users\João\Vídeos");
    assert_eq!(ini_valor("/Users/fernandoluz/Library/Containers/com.lemon.lvoverseas/Data/Movies/CapCut/User Data/Presets"), "/Users/fernandoluz/Library/Containers/com.lemon.lvoverseas/Data/Movies/CapCut/User Data/Presets");
    let t = tempfile::tempdir().unwrap();
    assert!(custom_preset_path(t.path()).is_none(), "sem arquivo: usa a padrão");
    fs::create_dir_all(t.path().join("Config")).unwrap();
    fs::write(t.path().join("Config/globalSetting"), "[General]\ncustomPresetPath=\n").unwrap();
    assert!(custom_preset_path(t.path()).is_none(), "vazio: usa a padrão");
}

fn cenario(target: Target) {
    if !Path::new(PACK).exists() { eprintln!("pacote ausente: ignorado"); return; }
    let tmp = tempfile::tempdir().unwrap();
    let env = env_for(target, tmp.path());
    let ud = ud_of(&env);
    fs::create_dir_all(ud.join("Presets/Combination/Presets")).unwrap();
    if target == Target::Windows { fs::create_dir_all(tmp.path().join("Windows/Fonts")).unwrap(); }
    // como o aluno: pasta na Área de Trabalho, com espaço no nome, já com uma predefinição dele
    let escolhida = env.home.join("Desktop/VIDEOS NOVEMBRO/JianyingPro Presets");
    fs::create_dir_all(escolhida.join("Combination/Presets/ZZTESTE")).unwrap();
    fs::write(escolhida.join("Combination/Presets/ZZTESTE/ZZTESTE.json"), "{}").unwrap();
    escolhe_pasta(&ud, &escolhida, target == Target::Windows);

    let raizes = env.capcut_preset_roots();
    assert_eq!(raizes.len(), 2, "{raizes:?}");

    let pack = Pack::open(Path::new(PACK), &tmp.path().join("x")).unwrap();
    let mut log = vec![];
    let rep = install(&env, &pack, &mut |m| log.push(m.to_string())).unwrap();
    assert_eq!(rep.presets, 145);
    assert!(log.iter().any(|l| l.contains("Pasta de predefinições escolhida no CapCut")), "{log:?}");
    let nas_duas = [ud.join("Presets/Combination/Presets"), escolhida.join("Combination/Presets")];
    for p in &nas_duas {
        assert_eq!(conta(p), 145 + if p.starts_with(&escolhida) { 1 } else { 0 }, "{p:?}");
        assert!(p.join("CombinationPresetVirtualStore.json").exists());
    }
    // reinstalar não duplica, e a predefinição do aluno continua
    install(&env, &pack, &mut |_| {}).unwrap();
    assert_eq!(conta(&nas_duas[1]), 146);
    assert!(escolhida.join("Combination/Presets/ZZTESTE/ZZTESTE.json").exists());
    let diag = flcore::install::diagnose(&env);
    assert!(diag.contains("JianyingPro Presets"), "{diag}");

    uninstall(&env, "fl-legendas", &mut |_| {}).unwrap();
    assert_eq!(conta(&nas_duas[0]), 0);
    assert_eq!(conta(&nas_duas[1]), 1, "só sobra a do aluno");
    assert!(escolhida.join("Combination/Presets/ZZTESTE/ZZTESTE.json").exists());

    // pasta padrão (sem escolha): continua igual a antes, uma pasta só
    fs::write(ud.join("Config/globalSetting"), "[General]\n").unwrap();
    assert_eq!(env.capcut_preset_roots().len(), 1);
    println!("{target:?}: ok — {}", diag.lines().filter(|l| l.contains("predefini")).collect::<Vec<_>>().join(" / "));
}

#[test] fn windows() { cenario(Target::Windows); }
#[test] fn mac() { cenario(Target::Mac); }

/// Efeitos Sonoros: o caminho do som aponta para a pasta escolhida (lá é que o arquivo fica).
#[test]
fn sons_na_pasta_escolhida() {
    if !Path::new(SONS).exists() { return; }
    let tmp = tempfile::tempdir().unwrap();
    let env = env_for(Target::Windows, tmp.path());
    let ud = ud_of(&env);
    fs::create_dir_all(ud.join("Presets/Combination/Presets")).unwrap();
    fs::create_dir_all(tmp.path().join("Windows/Fonts")).unwrap();
    let escolhida = env.home.join("Desktop/Minhas Pred");
    fs::create_dir_all(&escolhida).unwrap();
    escolhe_pasta(&ud, &escolhida, true);
    let pack = Pack::open(Path::new(SONS), &tmp.path().join("x")).unwrap();
    if pack.manifest.kind.as_deref() == Some("media") { return; }
    install(&env, &pack, &mut |_| {}).unwrap();
    let presets = escolhida.join("Combination/Presets");
    let mut visto = 0;
    for e in walkdir::WalkDir::new(&presets).into_iter().flatten() {
        let p = e.path();
        if p.extension().map(|x| x == "json").unwrap_or(false) {
            let s = fs::read_to_string(p).unwrap();
            assert!(!s.contains("__PLUGA_UD__"));
            let re = regex::Regex::new(r#""audio_path"\s*:\s*"([^"]+)""#).unwrap();
            for c in re.captures_iter(&s) {
                let ap = &c[1];
                assert!(ap.contains("Minhas Pred/Combination/Resources/"), "{ap}");
                assert!(Path::new(ap).exists(), "{ap}");
                visto += 1;
            }
        }
    }
    assert!(visto > 0, "nenhum som conferido");
    println!("sons: {visto} caminhos de áudio conferidos na pasta escolhida");
}
