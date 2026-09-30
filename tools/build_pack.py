#!/usr/bin/env python3
"""Gera um pacote .flpack para o FL Hub.

Uso:
  python3 tools/build_pack.py --id fl-legendas --name "Legendas FL" --version 1.0.0 \
      --presets PASTA_PRESETS [--resources PASTA] [--fonts PASTA] [--fonts-windows PASTA] \
      [--index indice.json] [--aliases apelidos.txt] [--substitutes substitutos.txt] \
      --out legendas.flpack

- Calcula sozinho as fontes que as predefinições procuram (required_fonts).
- Remove .DS_Store e normaliza nomes (acentos) para NFC.
"""
import argparse, json, os, re, unicodedata, zipfile

FONT_RE = re.compile(r'"([^"\\]*/)([^"\\/]+\.(?:ttf|otf|ttc))(?=\\?")', re.I)

def nfc(s): return unicodedata.normalize("NFC", s)

def ler_pares(arq):
    out = {}
    if arq and os.path.exists(arq):
        for l in open(arq, encoding="utf-8"):
            l = l.strip()
            if not l or l.startswith("#") or "=" not in l: continue
            a, b = l.split("=", 1); out[a.strip()] = b.strip()
    return out

def fontes_necessarias(presets):
    req = {}
    for root, _, files in os.walk(presets):
        for f in files:
            if not f.endswith((".json", ".bak", ".tmp")): continue
            s = open(os.path.join(root, f), encoding="utf-8", errors="ignore").read()
            for m in FONT_RE.finditer(s):
                d, b = m.groups()
                if "/Cache/effect/" in d or d.startswith("/Applications/"): continue
                req[b] = "mac-system" if d.startswith("/System/") else "local"
    return [{"file": b, "kind": k} for b, k in sorted(req.items(), key=lambda x: (x[1], x[0].lower()))]

def add_dir(z, src, arc):
    for root, _, files in os.walk(src):
        for f in files:
            if f == ".DS_Store" or f.startswith("._"): continue
            p = os.path.join(root, f)
            rel = nfc(os.path.join(arc, os.path.relpath(p, src))).replace(os.sep, "/")
            z.write(p, rel)

def main():
    a = argparse.ArgumentParser()
    for k in ("id", "name", "version", "presets", "out"): a.add_argument("--" + k, required=True)
    for k in ("resources", "fonts", "fonts-windows", "index", "aliases", "substitutes"): a.add_argument("--" + k)
    o = a.parse_args()
    man = {"id": o.id, "name": o.name, "version": o.version, "presets_dir": "presets",
           "aliases": ler_pares(o.aliases), "substitutes_windows": ler_pares(o.substitutes),
           "required_fonts": fontes_necessarias(o.presets)}
    with zipfile.ZipFile(o.out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        add_dir(z, o.presets, "presets")
        if o.resources: add_dir(z, o.resources, "resources"); man["resources_dir"] = "resources"
        if o.fonts: add_dir(z, o.fonts, "fonts"); man["fonts_dir"] = "fonts"
        if o.fonts_windows: add_dir(z, o.fonts_windows, "fonts-windows"); man["fonts_windows_dir"] = "fonts-windows"
        if o.index: z.write(o.index, "index.json"); man["index"] = "index.json"
        z.writestr("manifest.json", json.dumps(man, ensure_ascii=False, indent=1))
    n = len([d for d in os.listdir(o.presets) if os.path.isdir(os.path.join(o.presets, d))])
    print(f"{o.out}: {n} predefinições, {len(man['required_fonts'])} fontes referenciadas, {os.path.getsize(o.out)/1e6:.1f} MB")

if __name__ == "__main__":
    main()
