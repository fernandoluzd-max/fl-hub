#!/usr/bin/env python3
# Sistema de ícones do Base FL: UMA fonte (as capas quadradas) -> todos os tamanhos usados no site e no app.
# Para trocar o ícone de um produto: troque a capa quadrada dele e rode este script de novo.
# uso: python3 tools/gera_icones.py /caminho/para/capas-base-fl-conjunto
import sys, os
from PIL import Image
import numpy as np
ORIGEM = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/work/capas'
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# chave usada no código  ->  (arquivo da capa, pasta da página de vendas)
PRODUTOS = {
  'legendas': ('01-legendas', 'legendas'),
  'sons':     ('02-efeitos-sonoros', 'efeitos-sonoros'),
  'luts':     ('03-luts', 'luts'),
  'mood':     ('04-mood', 'mood'),
  'preco':    ('05-quanto-cobrar', 'quanto-cobrar'),
  'contrato': ('06-gerador-de-contrato', 'gerador-de-contrato'),
  'briefing': ('07-gerador-de-briefing', 'gerador-de-briefing'),
  'painel':   ('08-base-demandas', 'financas-e-demandas'),
  'case':     ('10-caseup', 'caseup'),
}
FOLGA = 1.34   # espaço em volta do desenho: igual para todos, para nenhum parecer maior que o outro
def recorte(im):
    W, H = im.size; a = np.asarray(im.convert('RGB')).astype(int)
    x0, x1, y0, y1 = int(W*.04), int(W*.50), int(H*.24), int(H*.80)      # região do desenho (à esquerda do nome)
    reg = a[y0:y1, x0:x1]; fundo = np.median(reg.reshape(-1, 3), axis=0)
    dif = np.abs(reg - fundo).max(axis=2) > 60                              # o desenho em si, sem o brilho em volta
    ys, xs = np.where(dif); bx0, bx1, by0, by1 = xs.min()+x0, xs.max()+x0, ys.min()+y0, ys.max()+y0
    cx, cy, lado = (bx0+bx1)/2, (by0+by1)/2, max(bx1-bx0, by1-by0) * FOLGA
    lado = min(lado, 2 * (W*.515 - cx))                                      # não deixa o recorte encostar no nome do produto
    l = int(round(lado)); X = int(round(cx - l/2)); Y = int(round(cy - l/2))
    return im.crop((X, Y, X+l, Y+l)), (bx1-bx0, by1-by0, l)
for pasta in ['icones', 'ui/icones', 'capas']: os.makedirs(os.path.join(RAIZ, pasta), exist_ok=True)
for chave, (arq, slug) in PRODUTOS.items():
    q = Image.open(f'{ORIGEM}/quadrada/{arq}-quadrada-1200x1200.png').convert('RGB')
    ic, info = recorte(q)
    for tam, dest in [(256, f'icones/{chave}.png'), (64, f'icones/{chave}-64.png'), (192, f'ui/icones/{chave}.png')]:
        ic.resize((tam, tam), Image.LANCZOS).quantize(colors=200, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG).save(os.path.join(RAIZ, dest), optimize=True)
    Image.open(f'{ORIGEM}/horizontal/{arq}-horizontal-1250x747.png').convert('RGB').save(os.path.join(RAIZ, f'capas/{slug}.jpg'), quality=86, optimize=True, progressive=True)
    print(chave, info, os.path.getsize(os.path.join(RAIZ, f'icones/{chave}.png')), os.path.getsize(os.path.join(RAIZ, f'capas/{slug}.jpg')))
