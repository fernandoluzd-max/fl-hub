#!/usr/bin/env python3
"""Gera o pacote .flpack de LUTs (aba Ajuste › Seus › LUT do CapCut).

Uso:
  python3 tools/build_lut_pack.py --lista luts.json --foto frame.jpg --config PASTA_CONFIG \
      --id fl-luts --name "LUTs" --version 1.0.0 --out luts.flpack

luts.json: [ {"src": "caminho.cube", "nome": "FL Fim de Tarde", "tipo": "finalizacao"}, ... ]
  (na ordem em que devem aparecer no CapCut)
PASTA_CONFIG: config.json + algorithmConfig.json (iguais em todos os LUTs importados pelo CapCut)

Cada LUT vira luts/<nome>/<nome>.cube + <nome>.jpeg (miniatura) + config.json + algorithmConfig.json.
O .cube recebe TITLE com o nome novo e a marca Pluga & Edita · FL (a cor não muda).
"""
import argparse, json, os, sys, unicodedata, zipfile, io
import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(__file__))
from lutlib import load, apply  # noqa: E402

MARCA = ["# Pluga & Edita · FL",
         "# © Pluga & Edita (FL). Licenciado ao comprador. Proibida a revenda ou redistribuição."]
FONTES = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]


def nfc(s): return unicodedata.normalize("NFC", s)


def reescreve_cube(src, nome):
    out = [f'TITLE "{nome}"'] + MARCA
    for l in open(src, encoding="utf-8", errors="ignore"):
        s = l.strip()
        if not s or s.startswith("#") or s.upper().startswith("TITLE"):
            continue
        out.append(s)
    return "\n".join(out) + "\n"


def miniatura_look(src_cube, foto):
    im = Image.open(foto).convert("RGB")
    w, h = im.size; alvo = 1.5
    if w / h > alvo:
        nw = int(h * alvo); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = int(w / alvo); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    im = im.resize((1200, 800), Image.LANCZOS)
    arr = np.asarray(im).astype(np.float32) / 255
    return Image.fromarray((apply(load(src_cube), arr) * 255 + 0.5).astype(np.uint8))


def miniatura_conversao(nome):
    # cartão da marca: nome da família + origem → destino
    familia, _, rota = nome.replace("FL ", "", 1).partition(" — ")
    im = Image.new("RGB", (1200, 800), (13, 15, 14)); d = ImageDraw.Draw(im)
    for y in range(800):  # leve brilho verde no topo, como no app
        a = max(0, 1 - y / 520) * 0.55
        d.line([(0, y), (1200, y)], fill=(int(13 + (39 - 13) * a), int(15 + (53 - 15) * a), int(14 + (44 - 14) * a)))
    fb = ImageFont.truetype(FONTES[0], 132); fm = ImageFont.truetype(FONTES[1], 54); fs = ImageFont.truetype(FONTES[0], 34)
    d.rounded_rectangle((90, 110, 352, 170), radius=30, outline=(242, 165, 65), width=3)
    d.text((118, 118), "CONVERSÃO", font=fs, fill=(242, 165, 65))
    d.text((90, 250), familia, font=fb, fill=(244, 240, 228))
    d.text((94, 440), rota, font=fm, fill=(242, 165, 65))
    d.text((94, 690), "Pluga & Edita · FL", font=fs, fill=(157, 153, 140))
    return im


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lista", required=True); ap.add_argument("--foto", required=True); ap.add_argument("--config", required=True)
    ap.add_argument("--id", required=True); ap.add_argument("--name", required=True); ap.add_argument("--version", required=True)
    ap.add_argument("--out", required=True); ap.add_argument("--previa")
    a = ap.parse_args()
    itens = json.load(open(a.lista, encoding="utf-8"))
    cfg = open(os.path.join(a.config, "config.json"), "rb").read()
    alg = open(os.path.join(a.config, "algorithmConfig.json"), "rb").read()
    nomes = []
    thumbs = []
    with zipfile.ZipFile(a.out, "w", zipfile.ZIP_DEFLATED) as z:
        for it in itens:
            nome = nfc(it["nome"]); nomes.append(nome)
            base = f"luts/{nome}/{nome}"
            z.writestr(base + ".cube", reescreve_cube(it["src"], nome))
            th = miniatura_conversao(nome) if it.get("tipo") == "conversao" else miniatura_look(it["src"], a.foto)
            buf = io.BytesIO(); th.save(buf, "JPEG", quality=86); z.writestr(base + ".jpeg", buf.getvalue())
            z.writestr(f"luts/{nome}/config.json", cfg)
            z.writestr(f"luts/{nome}/algorithmConfig.json", alg)
            thumbs.append((nome, th))
        man = {"id": a.id, "name": a.name, "version": a.version, "kind": "lut", "lut_dir": "luts", "luts": nomes}
        z.writestr("manifest.json", json.dumps(man, ensure_ascii=False, indent=1))
    print(f"{a.out}: {len(nomes)} LUTs, {os.path.getsize(a.out)/1e6:.1f} MB")
    if a.previa:
        cols = 6; W, H = 300, 200
        f = ImageFont.truetype(FONTES[0], 15)
        sheet = Image.new("RGB", (cols * (W + 10), ((len(thumbs) + cols - 1) // cols) * (H + 34)), (13, 15, 14)); d = ImageDraw.Draw(sheet)
        for i, (n, t) in enumerate(thumbs):
            x = (i % cols) * (W + 10); y = (i // cols) * (H + 34)
            sheet.paste(t.resize((W, H)), (x, y)); d.text((x + 2, y + H + 6), n[:38], font=f, fill=(244, 240, 228))
        sheet.save(a.previa, quality=85)


if __name__ == "__main__":
    main()
