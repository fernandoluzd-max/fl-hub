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
    for p in c['produtos']: p.pop('_preco', None)
    por = {p['key']: p for p in c['produtos']}
    k = c['kit']; k.pop('_preco', None)
    k['de'] = sum(por[x]['preco'] for x in k['inclui'])          # soma dos avulsos (ex.: 128)
    k['packs'] = [por[x]['pack'] for x in k['inclui']]
    return c

def parcela(valor, c):
    i, n = c['juros_mes'], c['parcelas']
    return valor * i / (1 - (1 + i) ** -n)

def brl(v, casas=0):
    s = f'{v:,.{casas}f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    return 'R$ ' + s

# A REGRA ÚNICA de oferta. Vai junto do catálogo para o site, as ferramentas e o app usarem a MESMA conta:
#   tem(pack) -> a conta tem acesso válido a esse pack?
#   devolve o que a conta tem, o que falta e, se fizer sentido, a oferta "liberar tudo o que falta" (preço do kit).
#   "todas" só existe quando faltam 2 ou mais E sai mais barato do que comprar as que faltam uma a uma.
REGRA = r"""window.CATALOGO_OFERTA = function (tem) {
  var C = window.CATALOGO, kit = C.kit, por = {}; C.produtos.forEach(function (p) { por[p.key] = p; });
  var J = kit ? kit.inclui.map(function (k) { return por[k]; }) : [];
  var tenho = J.filter(function (p) { return tem(p.pack); }), faltam = J.filter(function (p) { return !tem(p.pack); });
  var soma = faltam.reduce(function (n, p) { return n + p.preco; }, 0), todas = null, rs = 'R$ ' + (kit ? kit.preco : 0);
  if (kit && faltam.length >= 2 && kit.preco < soma) todas = {
    preco: kit.preco, de: soma, economia: soma - kit.preco, n: faltam.length,
    titulo: tenho.length ? 'Libere as outras ' + faltam.length + ' ferramentas' : 'As ' + J.length + ' ferramentas',
    rotulo: (tenho.length ? 'Liberar as outras ' + faltam.length + ' ferramentas' : 'Liberar as ' + J.length + ' ferramentas') + ' · ' + rs
  };
  return { tenho: tenho, faltam: faltam, todas: todas, completo: J.length > 0 && !faltam.length };
};
"""

if __name__ == '__main__':
    c = carrega()
    js = '// GERADO por tools/gera_catalogo.py a partir de catalogo.json. Não edite aqui.\nwindow.CATALOGO = ' + json.dumps(c, ensure_ascii=False, separators=(',', ':')) + ';\n' + REGRA
    for destino in ('catalogo.js', os.path.join('ui', 'catalogo.js')):
        with open(os.path.join(RAIZ, destino), 'w', encoding='utf-8') as f:
            f.write(js)
        print('ok', destino)
    if '--so-catalogo' not in sys.argv:
        for g in ('gera_paginas.py', 'gera_mood.py'):
            caminho = os.path.join(RAIZ, 'tools', g)
            if os.path.exists(caminho):
                subprocess.check_call([sys.executable, caminho])
