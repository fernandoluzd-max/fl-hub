# Lê catalogo.json (fonte única de nomes, preços e links) e gera:
#   catalogo.js      -> usado pelo site e pelas ferramentas
#   ui/catalogo.js   -> usado pelo app
# Depois regera as páginas de vendas, que também leem o catalogo.json.
import json, os, subprocess, sys
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def carrega():
    with open(os.path.join(RAIZ, 'catalogo.json'), encoding='utf-8') as f:
        c = json.load(f)
    c.pop('_leia', None)
    por = {p['key']: p for p in c['produtos']}
    k = c['kit']
    k['de'] = sum(por[x]['preco'] for x in k['inclui'])          # soma dos avulsos (ex.: 128)
    k['packs'] = [por[x]['pack'] for x in k['inclui']]
    return c

def parcela(valor, c):
    i, n = c['juros_mes'], c['parcelas']
    return valor * i / (1 - (1 + i) ** -n)

def brl(v, casas=0):
    s = f'{v:,.{casas}f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    return 'R$ ' + s

if __name__ == '__main__':
    c = carrega()
    js = '// GERADO por tools/gera_catalogo.py a partir de catalogo.json. Não edite aqui.\nwindow.CATALOGO = ' + json.dumps(c, ensure_ascii=False, separators=(',', ':')) + ';\n'
    for destino in ('catalogo.js', os.path.join('ui', 'catalogo.js')):
        with open(os.path.join(RAIZ, destino), 'w', encoding='utf-8') as f:
            f.write(js)
        print('ok', destino)
    if '--so-catalogo' not in sys.argv:
        for g in ('gera_paginas.py', 'gera_mood.py'):
            caminho = os.path.join(RAIZ, 'tools', g)
            if os.path.exists(caminho):
                subprocess.check_call([sys.executable, caminho])
