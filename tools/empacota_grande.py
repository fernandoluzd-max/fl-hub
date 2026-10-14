#!/usr/bin/env python3
"""Empacota um .flpack grande (vídeos) em etapas: cada execução adiciona arquivos até o limite de tempo e para.
Rode de novo até aparecer PRONTO. Vídeos vão sem compressão (ZIP_STORED): já são comprimidos e assim instala mais rápido.

Uso: python3 tools/empacota_grande.py --dir SAIDA_DO_BUILD --id fl-assets --name "Base FL Assets" --version 1.0.0 --out X.flpack [--segundos 150]
"""
import argparse, json, os, time, unicodedata, zipfile

def nfc(s): return unicodedata.normalize("NFC", s)

a = argparse.ArgumentParser()
for k in ("dir", "id", "name", "version", "out"): a.add_argument("--" + k, required=True)
a.add_argument("--segundos", type=float, default=150)
o = a.parse_args()
t0 = time.time()
lista = []
for sub in ("presets", "resources"):
    base = os.path.join(o.dir, sub)
    for root, _, files in os.walk(base):
        for f in sorted(files):
            if f == ".DS_Store" or f.startswith("._"): continue
            p = os.path.join(root, f)
            lista.append((p, nfc(os.path.join(sub, os.path.relpath(p, base))).replace(os.sep, "/")))
lista.sort(key=lambda x: (x[1].startswith("resources/"), x[1]))
feitos = set()
if os.path.exists(o.out):
    try:
        with zipfile.ZipFile(o.out) as z: feitos = set(z.namelist())
    except zipfile.BadZipFile:
        os.remove(o.out); feitos = set()
modo = "a" if os.path.exists(o.out) else "w"
n = 0
with zipfile.ZipFile(o.out, modo, allowZip64=True) as z:
    for p, arc in lista:
        if arc in feitos: continue
        if time.time() - t0 > o.segundos: break
        comp = zipfile.ZIP_DEFLATED if arc.endswith((".json", ".tmp")) else zipfile.ZIP_STORED
        z.write(p, arc, compress_type=comp); feitos.add(arc); n += 1
    falta = [x for x in lista if x[1] not in feitos]
    if not falta and "manifest.json" not in feitos:
        z.write(os.path.join(o.dir, "index.json"), "index.json")
        man = {"id": o.id, "name": o.name, "version": o.version, "presets_dir": "presets",
               "resources_dir": "resources", "index": "index.json", "aliases": {}, "substitutes_windows": {}, "required_fonts": []}
        z.writestr("manifest.json", json.dumps(man, ensure_ascii=False, indent=1))
        feitos.add("manifest.json")
print(f"+{n} arquivos; faltam {len(lista) - len([x for x in lista if x[1] in feitos])}; {'PRONTO' if 'manifest.json' in feitos else 'continua'}; {os.path.getsize(o.out)/1e9:.2f} GB")
