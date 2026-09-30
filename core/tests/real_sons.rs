use flcore::{env::Env, install, uninstall, Pack, Target};
#[test]
fn pack_real_de_sons() {
    let p = std::path::Path::new("/mnt/user-data/uploads/Downloads/efeitos-sonoros.flpack");
    if !p.exists() { return; }
    let tmp = tempfile::tempdir().unwrap();
    for t in [Target::Mac, Target::Windows] {
        let env = Env { target: t, home: tmp.path().join(format!("{t:?}")), local_appdata: None, windir: None, data_dir: tmp.path().join(format!("d{t:?}")), system_integration: false };
        let pack = Pack::open(p, &tmp.path().join("x")).unwrap();
        let r = install(&env, &pack, &mut |m| println!("{m}")).unwrap();
        assert_eq!(r.presets, 65);
        let n = walkdir::WalkDir::new(env.media_root()).into_iter().flatten().filter(|e| e.file_type().is_file()).count();
        assert_eq!(n, 65);
        println!("{}", r.media_path);
        uninstall(&env, "fl-sons", &mut |_| {}).unwrap();
        assert!(!env.media_root().exists());
    }
}
