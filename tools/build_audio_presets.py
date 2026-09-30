#!/usr/bin/env python3
"""Gera predefinições de ÁUDIO do CapCut (uma por som) a partir de uma pasta de sons organizada por categoria.

Uso:
  python3 tools/build_audio_presets.py --sons PASTA_SONS --molde PASTA_MOLDE --raiz "FL - Efeitos Sonoros" --out SAIDA

PASTA_SONS/<Categoria>/<FL - Nome>.m4a  (sons já tratados)
PASTA_MOLDE/<preset>/<preset>.json + preset_draft/{draft_content.json,template.tmp}
            (uma predefinição de áudio salva pelo próprio CapCut, usada como molde)

Saída: SAIDA/presets/<nome>/..., SAIDA/resources/<md5>.m4a, SAIDA/index.json
Depois: python3 tools/build_pack.py --presets SAIDA/presets --resources SAIDA/resources --index SAIDA/index.json ...
"""
import argparse, hashlib, json, os, re, shutil, subprocess, time, unicodedata, uuid

PH = "##_presetpath_placeholder_0E685133-18CE-45ED-8CB8-2904A212EC80_##"
UUID_RE = re.compile(r"[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}")
PLACEHOLDER_ID = "0E685133-18CE-45ED-8CB8-2904A212EC80"


def nfc(s): return unicodedata.normalize("NFC", s)


def dur_us(f):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f],
                         capture_output=True, text=True).stdout.strip()
    return int(round(float(out) * 1_000_000))


def novos_ids(texto):
    """Troca todos os UUIDs (menos o marcador de pasta do CapCut) por novos, mantendo as referências internas."""
    mapa = {}
    def troca(m):
        u = m.group(0)
        if u == PLACEHOLDER_ID:
            return u
        if u not in mapa:
            mapa[u] = str(uuid.uuid4()).upper()
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sons", required=True)
    ap.add_argument("--molde", required=True)
    ap.add_argument("--raiz", required=True, help="nome da pasta principal dentro das predefinições do CapCut")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    nome_molde = os.listdir(a.molde)[0]
    base = os.path.join(a.molde, nome_molde)
    ficha_molde = json.load(open(os.path.join(base, nome_molde + ".json"), encoding="utf-8"))
    draft_molde = open(os.path.join(base, "preset_draft", "draft_content.json"), encoding="utf-8").read()
    vazio_molde = open(os.path.join(base, "preset_draft", "template.tmp"), encoding="utf-8").read()
    dj = json.loads(draft_molde)
    externo = dj["materials"]["audios"][0]
    interno = dj["materials"]["drafts"][0]["draft"]["materials"]["audios"][0]
    dur_molde = str(externo["duration"])
    res_ext = externo["path"].split("/Resources/")[1]
    res_int = interno["path"].split("/Resources/")[1]

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
    for cat in sorted(os.listdir(a.sons), key=lambda s: nfc(s).lower()):
        dcat = os.path.join(a.sons, cat)
        if not os.path.isdir(dcat):
            continue
        cat_id = str(uuid.uuid4())
        pastas.append({"create_time": agora, "id": cat_id, "import_time": agora, "import_time_us": agora * 1_000_000,
                       "name": nfc(cat), "type": 0, "user_id": ""})
        rel.append({"child_id": cat_id, "parent_id": raiz_id})
        for arq in sorted(f for f in os.listdir(dcat) if f.lower().endswith(".m4a")):
            src = os.path.join(dcat, arq)
            nome = nfc(os.path.splitext(arq)[0])            # "FL - Swoosh 01"
            dur = dur_us(src)
            dados = open(src, "rb").read()
            res = hashlib.md5(dados).hexdigest() + ".m4a"
            shutil.copyfile(src, os.path.join(R, res))
            # draft: novos ids, duração, nome e recurso
            t = novos_ids(draft_molde)
            t = t.replace(dur_molde, str(dur))
            j = json.loads(t)
            ext = j["materials"]["audios"][0]
            ext["name"] = nome
            ext["path"] = f"{PH}/Resources/{res}"
            inn = j["materials"]["drafts"][0]["draft"]["materials"]["audios"][0]
            inn["name"] = nfc(arq)
            inn["path"] = f"{PH}/Resources/{res}"
            inn["unique_id"] = hashlib.md5(("pluga" + nome).encode()).hexdigest()
            limpa_identificadores(j)
            texto = json.dumps(j, ensure_ascii=False)
            assert res_ext not in texto and res_int not in texto
            pid = str(uuid.uuid4()).upper()
            d = os.path.join(P, nome, "preset_draft")
            os.makedirs(d)
            open(os.path.join(d, "draft_content.json"), "w", encoding="utf-8").write(texto)
            open(os.path.join(d, "template-2.tmp"), "w", encoding="utf-8").write(texto)
            open(os.path.join(d, "template.tmp"), "w", encoding="utf-8").write(novos_ids(vazio_molde))
            ficha = dict(ficha_molde)
            ficha.update({
                "audio_path": f"__PLUGA_UD__/Presets/Combination/Resources/{res}",
                "cover_height": 0, "cover_path": "", "cover_width": 0,
                "create_time": agora, "import_time_ms": agora * 1000,
                "id": pid, "name": nome, "rough_cut_duration": dur, "rough_cut_start": 0,
                "type": "audio", "user_id": "",
            })
            open(os.path.join(P, nome, nome + ".json"), "w", encoding="utf-8").write(json.dumps(ficha, ensure_ascii=False))
            itens.append({"copyright_type": "", "enterprise_id": "", "id": pid, "is_enterprise_edition": False,
                          "name": nome, "save_from": 1, "subsystem_id": "", "type": 1, "user_id": ""})
            rel.append({"child_id": pid, "parent_id": cat_id})
            total += 1
    indice = {"preset_virtual_store": [{"type": 0, "value": pastas + itens}, {"type": 1, "value": rel}]}
    json.dump(indice, open(os.path.join(a.out, "index.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print(f"{total} predefinições de áudio em {len(pastas) - 1} categorias -> {a.out}")


if __name__ == "__main__":
    main()
