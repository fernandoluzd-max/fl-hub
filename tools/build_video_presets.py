#!/usr/bin/env python3
"""Gera predefinições de VÍDEO do CapCut (uma por animação) a partir de uma pasta de vídeos organizada por categoria.

Uso:
  python3 tools/build_video_presets.py --videos PASTA --molde PASTA_MOLDE --raiz "Base FL Assets" --nomes nomes.json --out SAIDA

PASTA/<NN - Categoria>/<BASE FL - NNN - Nome>.mov   (vídeos com fundo transparente, do jeito que serão entregues)
PASTA_MOLDE/<preset>/<preset>.json + preset_draft/{draft_content.json,template.tmp}
            (uma predefinição de vídeo salva pelo próprio CapCut, usada como molde)
nomes.json  (opcional) {"001": "Seta Curva Ascendente", ...} e {"pastas": {"01": "Setas e Direcionamento"}}: nomes com acento

Saída: SAIDA/presets/<nome>/..., SAIDA/resources/<id>.mov, SAIDA/index.json
Depois: python3 tools/build_pack.py --presets SAIDA/presets --resources SAIDA/resources --index SAIDA/index.json --store ...
"""
import argparse, hashlib, json, os, re, shutil, subprocess, time, unicodedata, uuid

PH = "##_presetpath_placeholder_0E685133-18CE-45ED-8CB8-2904A212EC80_##"
UUID_RE = re.compile(r"[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}")
PLACEHOLDER_ID = "0E685133-18CE-45ED-8CB8-2904A212EC80"


def nfc(s): return unicodedata.normalize("NFC", s)


def info(f):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration",
                          "-of", "json", f], capture_output=True, text=True).stdout
    j = json.loads(out)
    return int(round(float(j["format"]["duration"]) * 1_000_000)), j["streams"][0]["width"], j["streams"][0]["height"]


def novos_ids(texto):
    """Troca todos os UUIDs (menos o marcador de pasta do CapCut) por novos, mantendo as referências internas."""
    mapa = {}
    def troca(m):
        u = m.group(0)
        if u.upper() == PLACEHOLDER_ID:
            return u
        if u not in mapa:
            n = str(uuid.uuid4())
            mapa[u] = n.upper() if u.isupper() or u.upper() == u else n
        return mapa[u]
    return UUID_RE.sub(troca, texto)


def limpa_identificadores(j):
    """Remove dados do computador/conta de quem criou o molde."""
    for k in ("platform", "last_modified_platform"):
        if isinstance(j.get(k), dict):
            for c in ("device_id", "mac_address", "os_version"):
                if c in j[k]:
                    j[k][c] = ""
    for d in j.get("materials", {}).get("drafts", []):
        limpa_identificadores(d.get("draft", {}))
    return j


def capa(src, dur_us, destino):
    """Capa 320x180 (como a do CapCut): o quadro mais "cheio" da animação sobre fundo preto, com zoom no centro
    para a animação aparecer bem na miniatura das predefinições."""
    from PIL import Image
    import tempfile
    melhor, area = None, -1
    with tempfile.TemporaryDirectory() as tmp:
        for i, frac in enumerate((0.45, 0.6, 0.75, 0.9)):
            png = os.path.join(tmp, f"{i}.png")
            subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-ss", f"{dur_us / 1e6 * frac:.3f}", "-i", src,
                            "-vf", "crop=1280:720,scale=320:180:flags=lanczos,format=rgba", "-frames:v", "1", png], check=True)
            im = Image.open(png).convert("RGBA")
            s = sum(im.getchannel("A").histogram()[k] * k for k in range(256))
            if s > area:
                melhor, area = im.copy(), s
    fundo = Image.new("RGBA", melhor.size, (0, 0, 0, 255))
    fundo.alpha_composite(melhor)
    fundo.convert("RGB").save(destino, quality=88)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--videos", required=True)
    ap.add_argument("--molde", required=True)
    ap.add_argument("--raiz", required=True, help="nome da pasta principal dentro das predefinições do CapCut")
    ap.add_argument("--nomes")
    ap.add_argument("--out", required=True)
    ap.add_argument("--link", action="store_true", help="usa atalhos para os vídeos em vez de copiar (o empacotador lê o original)")
    a = ap.parse_args()
    NOMES = json.load(open(a.nomes, encoding="utf-8")) if a.nomes else {}

    nome_molde = os.listdir(a.molde)[0]
    base = os.path.join(a.molde, nome_molde)
    ficha_molde = json.load(open(os.path.join(base, nome_molde + ".json"), encoding="utf-8"))
    draft_molde = open(os.path.join(base, "preset_draft", "draft_content.json"), encoding="utf-8").read()
    vazio_molde = open(os.path.join(base, "preset_draft", "template.tmp"), encoding="utf-8").read()
    dj = json.loads(draft_molde)
    externo = dj["materials"]["videos"][0]
    interno = dj["materials"]["drafts"][0]["draft"]["materials"]["videos"][0]
    dur_molde = str(interno["duration"])
    res_int = interno["path"].split("/Resources/")[1]
    assert externo["width"] == interno["width"]

    shutil.rmtree(a.out, ignore_errors=True)
    P = os.path.join(a.out, "presets"); R = os.path.join(a.out, "resources")
    os.makedirs(P); os.makedirs(R)

    agora = int(time.time())
    pastas, itens, rel = [], [], []
    raiz_id = str(uuid.uuid4())
    pastas.append({"create_time": agora, "id": raiz_id, "import_time": agora, "import_time_us": agora * 1_000_000,
                   "name": a.raiz, "type": 0, "user_id": ""})
    rel.append({"child_id": raiz_id, "parent_id": ""})
    total = 0
    for cat in sorted(os.listdir(a.videos), key=lambda s: nfc(s).lower()):
        dcat = os.path.join(a.videos, cat)
        if not os.path.isdir(dcat):
            continue
        num_cat = cat.split(" - ")[0].strip()
        nome_cat = nfc(NOMES.get("pastas", {}).get(num_cat, cat))
        cat_id = str(uuid.uuid4())
        pastas.append({"create_time": agora, "id": cat_id, "import_time": agora, "import_time_us": agora * 1_000_000,
                       "name": nome_cat, "type": 0, "user_id": ""})
        rel.append({"child_id": cat_id, "parent_id": raiz_id})
        for arq in sorted(f for f in os.listdir(dcat) if f.lower().endswith(".mov") and not f.startswith(".")):
            src = os.path.join(dcat, arq)
            m = re.match(r"BASE FL - (\d{3}) - (.+)\.mov$", nfc(arq), re.I)
            num, resto = (m.group(1), m.group(2)) if m else ("", os.path.splitext(arq)[0])
            nome = nfc(f"{num} - {NOMES.get(num, resto)}" if num else resto)     # "001 - Seta Curva Ascendente"
            dur, w, h = info(src)
            res = hashlib.md5(("base-fl-assets/" + nfc(arq)).encode()).hexdigest() + ".mov"
            dst = os.path.join(R, res)
            if a.link:
                os.symlink(os.path.abspath(src), dst)
            else:
                shutil.copyfile(src, dst)
            # draft: novos ids, duração, tamanho, nome e recurso
            t = novos_ids(draft_molde).replace(dur_molde, str(dur))
            j = json.loads(t)
            ext = j["materials"]["videos"][0]
            ext["material_name"] = nome
            ext["width"], ext["height"] = w, h
            inn = j["materials"]["drafts"][0]["draft"]["materials"]["videos"][0]
            inn["material_name"] = nfc(arq)
            inn["path"] = f"{PH}/Resources/{res}"
            inn["width"], inn["height"] = w, h
            inn["unique_id"] = hashlib.md5(("baseflassets" + nome).encode()).hexdigest()
            inn["local_material_id"] = str(uuid.uuid4())
            limpa_identificadores(j)
            texto = json.dumps(j, ensure_ascii=False)
            assert res_int not in texto and "Minhas predef" not in texto
            pid = str(uuid.uuid4()).upper()
            dp = os.path.join(P, nome)
            d = os.path.join(dp, "preset_draft")
            os.makedirs(d)
            open(os.path.join(d, "draft_content.json"), "w", encoding="utf-8").write(texto)
            open(os.path.join(d, "template-2.tmp"), "w", encoding="utf-8").write(texto)
            open(os.path.join(d, "template.tmp"), "w", encoding="utf-8").write(novos_ids(vazio_molde))
            capa(src, dur, os.path.join(dp, nome + ".jpeg"))
            ficha = dict(ficha_molde)
            ficha.update({
                "audio_path": "", "cover_height": 180, "cover_width": 320,
                "cover_path": f"{PH}/Presets/{nome}/{nome}.jpeg",
                "create_time": agora, "import_time_ms": agora * 1000,
                "id": pid, "name": nome, "rough_cut_duration": dur, "rough_cut_start": 0,
                "type": "video", "user_id": "",
            })
            open(os.path.join(dp, nome + ".json"), "w", encoding="utf-8").write(json.dumps(ficha, ensure_ascii=False))
            itens.append({"copyright_type": "", "enterprise_id": "", "id": pid, "is_enterprise_edition": False,
                          "name": nome, "save_from": 1, "subsystem_id": "", "type": 1, "user_id": ""})
            rel.append({"child_id": pid, "parent_id": cat_id})
            total += 1
    indice = {"preset_virtual_store": [{"type": 0, "value": pastas + itens}, {"type": 1, "value": rel}]}
    json.dump(indice, open(os.path.join(a.out, "index.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print(f"{total} predefinições de vídeo em {len(pastas) - 1} categorias -> {a.out}")


if __name__ == "__main__":
    main()
