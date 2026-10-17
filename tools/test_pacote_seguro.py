"""Testes do gerador de pacotes autossuficientes. Rodar: python3 tools/test_pacote_seguro.py"""
import json, os, subprocess, sys, tempfile, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pacote_seguro

def montar(base):
    """Simula o computador do criador: arquivos citados + uma predefinição que cita tudo."""
    musica = os.path.join(base, "Movies/CapCut/User Data/Cache/music/af49.mp3")
    capa = os.path.join(base, "Movies/CapCut/User Data/Projects/com.lveditor.draft/TEMPLATES/subdraft/AB/draft_cover.jpg")
    for f, c in ((musica, b"musica"), (capa, b"capa")):
        os.makedirs(os.path.dirname(f), exist_ok=True); open(f, "wb").write(c)
    pre = os.path.join(base, "presets/Titulo 01/preset_draft")
    os.makedirs(pre)
    dc = {"materials": {
        "audios": [{"path": musica}, {"path": musica}],
        "drafts": [{"draft_cover_path": capa}],
        "effects": [{"path": "/Users/fernandoluz/Movies/CapCut/User Data/Cache/effect/731/c21d/x.png"}],
        "texts": [{"font_path": "/Users/fernandoluz/Library/Fonts/Moderniz.otf"}]}}
    open(os.path.join(pre, "draft_content.json"), "w").write(json.dumps(dc))
    open(os.path.join(base, "presets/Titulo 01/Titulo 01.json"), "w").write("{}")
    return os.path.join(base, "presets"), musica

def test_embute_e_reescreve():
    with tempfile.TemporaryDirectory() as t:
        presets, musica = montar(t)
        orig = open(os.path.join(presets, "Titulo 01/preset_draft/draft_content.json")).read()
        rel = pacote_seguro.preparar(presets, os.path.join(t, "out"))
        dc = json.load(open(os.path.join(t, "out/presets/Titulo 01/preset_draft/draft_content.json")))
        a = dc["materials"]["audios"][0]["path"]
        assert a.startswith(pacote_seguro.MARCADOR) and a.endswith(".mp3"), a
        assert dc["materials"]["audios"][1]["path"] == a, "mesmo arquivo, mesmo nome"
        assert dc["materials"]["drafts"][0]["draft_cover_path"].startswith(pacote_seguro.MARCADOR)
        assert "/Cache/effect/" in dc["materials"]["effects"][0]["path"], "cache de efeitos fica (CapCut baixa pelo id)"
        assert dc["materials"]["texts"][0]["font_path"].endswith("Moderniz.otf"), "fontes ficam com o instalador"
        nome = a.rsplit("/", 1)[1]
        assert open(os.path.join(t, "out/resources", nome), "rb").read() == b"musica"
        assert len(rel["embutidos"]) == 2 and not rel["faltando"]
        assert open(os.path.join(presets, "Titulo 01/preset_draft/draft_content.json")).read() == orig, "original intocado"

def test_nome_estavel_entre_versoes():
    with tempfile.TemporaryDirectory() as t:
        presets, _ = montar(t)
        r1 = pacote_seguro.preparar(presets, os.path.join(t, "v1"))
        r2 = pacote_seguro.preparar(presets, os.path.join(t, "v2"))
        assert sorted(r1["embutidos"]) == sorted(r2["embutidos"]), "nome pelo conteúdo: igual em todas as versões"

def test_para_se_faltar_arquivo():
    with tempfile.TemporaryDirectory() as t:
        presets, musica = montar(t)
        os.remove(musica)
        try:
            pacote_seguro.preparar(presets, os.path.join(t, "out")); assert False, "devia parar"
        except SystemExit as e:
            assert "PACOTE NÃO GERADO" in str(e) and "af49.mp3" in str(e)
        rel = pacote_seguro.preparar(presets, os.path.join(t, "out2"), permitir_faltando=True)
        assert rel["faltando"] == [musica]

def test_build_pack_completo():
    with tempfile.TemporaryDirectory() as t:
        presets, _ = montar(t)
        out = os.path.join(t, "teste.flpack")
        aqui = os.path.dirname(os.path.abspath(__file__))
        subprocess.run([sys.executable, os.path.join(aqui, "build_pack.py"), "--id", "fl-teste", "--name", "Teste", "--version", "1.0.0", "--presets", presets, "--out", out], check=True, capture_output=True)
        z = zipfile.ZipFile(out); nomes = z.namelist()
        man = json.loads(z.read("manifest.json"))
        assert man["resources_dir"] == "resources" and "auditoria.json" in nomes
        assert sum(1 for n in nomes if n.startswith("resources/basefl-")) == 2
        dc = z.read("presets/Titulo 01/preset_draft/draft_content.json").decode()
        assert "Cache/music" not in dc and "/Projects/" not in dc

def test_capa_que_sumiu_fica_vazia():
    with tempfile.TemporaryDirectory() as t:
        presets, _ = montar(t)
        capa = os.path.join(t, "Movies/CapCut/User Data/Projects/com.lveditor.draft/TEMPLATES/subdraft/AB/draft_cover.jpg")
        os.remove(capa)
        rel = pacote_seguro.preparar(presets, os.path.join(t, "out"))
        dc = json.load(open(os.path.join(t, "out/presets/Titulo 01/preset_draft/draft_content.json")))
        assert dc["materials"]["drafts"][0]["draft_cover_path"] == ""
        assert rel["capas_zeradas"] == [capa] and not rel["faltando"]

if __name__ == "__main__":
    for n, f in list(globals().items()):
        if n.startswith("test_"): f(); print("ok", n)
