"""Teste de ponta a ponta da tela do app (ui/index.html) num Chromium sem janela.

O que é SIMULADO: o Tauri (status/instalação) e o servidor (Supabase). Nada é instalado de verdade,
nenhum dado real é lido ou gravado. Serve para validar a TELA e a ORDEM das chamadas, não o CapCut.

Uso:  python3 tests-ui/e2e_camadas.py [pasta_das_capturas]
"""
import json, sys, os, pathlib
from playwright.sync_api import sync_playwright

RAIZ = pathlib.Path(__file__).resolve().parent.parent
UI = (RAIZ / 'ui' / 'index.html').as_uri()
SAIDA = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else RAIZ / 'tests-ui' / 'capturas')
SAIDA.mkdir(parents=True, exist_ok=True)
SUPA = 'https://otlaexuqyavpzxwzcsfo.supabase.co'

PACKS = [
    {'id': 'fl-legendas', 'name': 'Títulos', 'version': '2.0.0', 'file_path': 'legendas.flpack', 'buy_url': 'https://x'},
    {'id': 'fl-sons', 'name': 'Sons', 'version': '1.2.0', 'file_path': 'sons.flpack', 'buy_url': 'https://x'},
    {'id': 'fl-luts', 'name': 'LUTs', 'version': '1.0.0', 'file_path': 'luts.flpack', 'buy_url': 'https://x'},
    {'id': 'fl-assets', 'name': 'Assets', 'version': '1.0.0', 'file_path': 'assets.flpack', 'buy_url': 'https://x'},
]

# simulação do Tauri, injetada antes dos scripts da página
TAURI_MOCK = r"""
(() => {
  const cfg = window.__CFG__;
  const listeners = {};
  window.__CALLS__ = [];
  window.__INSTALADOS__ = cfg.instalados.slice();
  let instalacoes = 0;
  const status = () => ({ capcut_found: true, capcut_running: !!(cfg.capcutAbreDepois != null && instalacoes >= cfg.capcutAbreDepois) || !!cfg.capcutAberto,
    user_data: ['/x'], installed: window.__INSTALADOS__.slice(), system: 'Mac', version: '0.10.28' });
  window.__TAURI__ = {
    core: { invoke: async (cmd, args) => {
      window.__CALLS__.push([cmd, args || null]);
      if (cmd === 'status') return status();
      if (cmd === 'session_get') return JSON.stringify({ access_token: 't', refresh_token: 'r', expires_at: Math.floor(Date.now()/1000) + 36000, email: 'aluno.teste@exemplo.com' });
      if (cmd === 'session_set') return null;
      if (cmd === 'install_remote') {
        const id = args.packId;
        await new Promise(r => setTimeout(r, cfg.atraso || 400));
        if (cfg.falha && cfg.falha[id]) { const m = cfg.falha[id]; delete cfg.falha[id]; throw m; }
        (listeners['progress'] || []).forEach(f => f({ payload: 'Baixando… 50%' }));
        const v = cfg.versoes[id];
        window.__INSTALADOS__ = window.__INSTALADOS__.filter(x => x.id !== id).concat([{ id, version: v, kind: 'presets' }]);
        instalacoes++;
        return { id };
      }
      if (cmd === 'uninstall_pack') return null;
      return null;
    } },
    event: { listen: async (n, f) => { (listeners[n] = listeners[n] || []).push(f); return () => {}; } },
    opener: { openUrl: async () => null },
  };
})();
"""


def roda(nome, *, licencas, instalados=(), falha=None, capcut_abre_depois=None, capcut_aberto=False, acao=None):
    cfg = {'instalados': list(instalados), 'versoes': {p['id']: p['version'] for p in PACKS},
           'falha': falha or {}, 'capcutAbreDepois': capcut_abre_depois, 'capcutAberto': capcut_aberto, 'atraso': 450}
    aceites = []
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        pg = b.new_page(viewport={'width': 1180, 'height': 860})
        pg.add_init_script('window.__CFG__ = ' + json.dumps(cfg) + ';' + TAURI_MOCK)

        def rota(route):
            url = route.request.url
            if url.startswith('file://'):
                return route.continue_()
            if url.startswith(SUPA):
                path = url[len(SUPA):]
                if path.startswith('/rest/v1/packs'):
                    return route.fulfill(json=PACKS)
                if path.startswith('/rest/v1/licenses'):
                    return route.fulfill(json=[{'pack_id': p, 'status': 'active', 'expires_at': None} for p in licencas])
                if path.startswith('/rest/v1/rpc/aceite_registrar'):
                    aceites.append(json.loads(route.request.post_data or '{}'))
                    return route.fulfill(json=True)
                if path.startswith('/storage/v1/object/sign/'):
                    return route.fulfill(json={'signedURL': '/object/sign/packs/x?token=teste'})
                if path.startswith('/rest/v1/rpc/'):
                    return route.fulfill(json=[])
                return route.fulfill(json=[])
            return route.abort()   # internet de fora (fontes, GitHub, basefl.com) fica bloqueada: o app usa as cópias locais
        pg.route('**/*', rota)
        pg.goto(UI)
        pg.wait_for_timeout(1500)
        r = {'nome': nome}
        if acao:
            acao(pg, r)
        r['calls'] = [c for c in pg.evaluate('window.__CALLS__') if c[0] == 'install_remote']
        r['ordem'] = [c[1]['packId'] for c in r['calls']]
        r['aceites'] = [a.get('p_pack') for a in aceites]
        r['log'] = pg.evaluate("[...document.querySelectorAll('#log .step span')].map(s => s.textContent)")
        r['card_visivel'] = pg.evaluate("!document.getElementById('s-camadas').hidden")
        r['cards_individuais'] = pg.evaluate("[...document.querySelectorAll('#s-kits .cards .card h3')].map(h => h.textContent)")
        b.close()
    return r


def foto(pg, arq):
    pg.locator('#s-kits').screenshot(path=str(SAIDA / arq))


def clica_instalar(pg):
    pg.locator('#s-camadas button.cta').click()
    pg.wait_for_timeout(300)


def aceita(pg, r, arq=None):
    r['termo_lista'] = pg.evaluate("[...document.querySelectorAll('#termo .termo-l li')].map(l => l.textContent)")
    if arq:
        pg.locator('#termo .box').screenshot(path=str(SAIDA / arq))
    pg.locator('#t-ok').check()
    pg.locator('#t-vai').click()


TODOS = ['fl-legendas', 'fl-sons', 'fl-luts', 'fl-assets']
resultados = []

# 1) quem NÃO tem os 4: card não aparece, cards individuais seguem iguais
r = roda('tres_produtos', licencas=['fl-legendas', 'fl-sons', 'fl-luts'],
         acao=lambda pg, r: foto(pg, '1-tres-produtos-sem-card.png'))
assert not r['card_visivel'], r
assert {'Títulos Dinâmicos', 'Efeitos Sonoros', 'LUTs', 'Base FL Assets'} <= set(r['cards_individuais']), r
resultados.append(r)

# 2) tem os 4, nada instalado: instala tudo em sequência, Assets por último, aceite único
def acao2(pg, r):
    foto(pg, '2a-card-4-camadas.png')
    r['botao'] = pg.locator('#s-camadas button.cta').inner_text()
    clica_instalar(pg)
    aceita(pg, r, '2b-aceite-unico.png')
    pg.wait_for_function("document.querySelector('#s-camadas .cam-p small').textContent.startsWith('Camada 2')", timeout=8000)
    foto(pg, '2c-instalando-camada-2.png')
    pg.wait_for_function("document.querySelector('#s-camadas .kitx-ok')", timeout=15000)
    foto(pg, '2d-tudo-instalado.png')
r = roda('quatro_do_zero', licencas=TODOS, acao=acao2)
assert r['card_visivel'] and r['botao'] == 'Instalar as 4 camadas', r
assert r['ordem'] == TODOS, r['ordem']
assert sorted(r['aceites']) == sorted(TODOS), r['aceites']
assert len(r['termo_lista']) == 4, r['termo_lista']
assert any('Pronto!' in l for l in r['log']), r['log']
resultados.append(r)

# 3) parte já instalada: instala só o que falta, Assets por último
def acao3(pg, r):
    r['botao'] = pg.locator('#s-camadas button.cta').inner_text()
    foto(pg, '3-parcial-instalado.png')
    clica_instalar(pg); aceita(pg, r)
    pg.wait_for_function("document.querySelector('#s-camadas .kitx-ok')", timeout=15000)
r = roda('parcial', licencas=TODOS, instalados=[{'id': 'fl-legendas', 'version': '2.0.0'}, {'id': 'fl-luts', 'version': '1.0.0'}], acao=acao3)
assert r['botao'] == 'Instalar o que falta (2)', r['botao']
assert r['ordem'] == ['fl-sons', 'fl-assets'], r['ordem']
resultados.append(r)

# 4) CapCut aberto no meio (depois de 2 camadas): para antes da 3ª; o clique seguinte continua de onde parou
def acao4(pg, r):
    clica_instalar(pg); aceita(pg, r)
    pg.wait_for_function("!document.querySelector('#s-camadas').hidden && [...document.querySelectorAll('#log .step span')].some(s => /CapCut foi aberto/.test(s.textContent))", timeout=15000)
    pg.screenshot(path=str(SAIDA / '4-capcut-aberto-no-meio.png'))
    r['ordem_1'] = [c[1]['packId'] for c in pg.evaluate('window.__CALLS__') if c[0] == 'install_remote']
    pg.evaluate("window.__CFG__.capcutAbreDepois = null")   # aluno fechou o CapCut
    pg.wait_for_timeout(3500)                                 # o app atualiza o status sozinho a cada 3 s
    clica_instalar(pg)
    pg.wait_for_function("document.querySelector('#s-camadas .kitx-ok')", timeout=15000)
r = roda('capcut_no_meio', licencas=TODOS, capcut_abre_depois=2, acao=acao4)
assert r['ordem_1'] == ['fl-legendas', 'fl-sons'], r['ordem_1']
assert r['ordem'] == TODOS, r['ordem']   # nada reinstalado, só continuou
resultados.append(r)

# 5) internet cai na 3ª camada: mantém as 2 primeiras, explica e retoma
def acao5(pg, r):
    clica_instalar(pg); aceita(pg, r)
    pg.wait_for_function("[...document.querySelectorAll('#log .step span')].some(s => /internet caiu/.test(s.textContent))", timeout=15000)
    pg.screenshot(path=str(SAIDA / '5-internet-caiu.png'))
    r['etapa_falha'] = pg.evaluate("[...document.querySelectorAll('#log .step')].filter(d => /Camada 3 de 4/.test(d.textContent)).map(d => d.className)")
    pg.wait_for_timeout(500)
    clica_instalar(pg)
    pg.wait_for_function("document.querySelector('#s-camadas .kitx-ok')", timeout=15000)
r = roda('internet', licencas=TODOS, falha={'fl-luts': 'Download interrompido: connection reset'}, acao=acao5)
assert r['ordem'] == ['fl-legendas', 'fl-sons', 'fl-luts', 'fl-luts', 'fl-assets'], r['ordem']
assert r['etapa_falha'][0] == 'step err', r['etapa_falha']
resultados.append(r)

# 6) falta espaço nos Assets (último): explica e retoma só os Assets
def acao6(pg, r):
    clica_instalar(pg); aceita(pg, r)
    pg.wait_for_function("[...document.querySelectorAll('#log .step span')].some(s => /Falta espaço/.test(s.textContent))", timeout=15000)
    pg.screenshot(path=str(SAIDA / '6-falta-espaco.png'))
    r['botao_depois'] = pg.locator('#s-camadas button.cta').inner_text()
r = roda('espaco', licencas=TODOS, falha={'fl-assets': 'A instalação falhou e foi desfeita: copiar o arquivo a.mov: No space left on device (os error 28) (falta espaço no disco?)'}, acao=acao6)
assert r['botao_depois'] == 'Instalar o que falta (1)', r['botao_depois']
resultados.append(r)

# 7) CapCut aberto antes de começar: botão desabilitado, nada instalado
r = roda('capcut_aberto', licencas=TODOS, capcut_aberto=True, acao=lambda pg, r: (foto(pg, '7-capcut-aberto.png'), r.update(desab=pg.locator('#s-camadas button.cta').is_disabled())))
assert r['desab'] and r['ordem'] == [], r
resultados.append(r)

# 8) card individual continua funcionando (só Títulos liberado)
def acao8(pg, r):
    pg.locator('#s-kits .cards .card.k-legendas button.primary').click()
    aceita(pg, r)
    pg.wait_for_timeout(1500)
r = roda('individual', licencas=['fl-legendas'], acao=acao8)
assert not r['card_visivel'] and r['ordem'] == ['fl-legendas'] and r['aceites'] == ['fl-legendas'], r
resultados.append(r)

for x in resultados:
    print('OK  ', x['nome'], '| ordem:', x['ordem'])
print('capturas em', SAIDA)
