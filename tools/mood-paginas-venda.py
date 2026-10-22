#!/usr/bin/env python3
"""Mood: 3 páginas 100% de vendas (sem teste grátis), a partir da página de upsell.
   - oferta/mood/  (upsell pós-Títulos, 1 clique Greenn)  -> só copy e seções do meio
   - v/            (WhatsApp, lista própria)              -> página nova
   - conheca/mood/ (bio do Instagram, público frio)       -> página nova
Uso: gera.py <repo>"""
import sys, pathlib, re
R = pathlib.Path(sys.argv[1])
base = (R / 'oferta/mood/index.html').read_text(encoding='utf-8')
# .sec/.fim/.topo usavam padding em atalho e zeravam a margem lateral do .w no celular
for _a, _b in [('.sec{padding:64px 0 0}', '.sec{padding-top:64px}'), ('.fim{text-align:center;padding:64px 0 120px}', '.fim{text-align:center;padding-top:64px;padding-bottom:120px}'), ('.topo{padding:28px 0 18px;', '.topo{padding-top:28px;padding-bottom:18px;')]:
    base = base.replace(_a, _b)
# passos do topo em "você"
base = base.replace('Escolhe a referência</span>', 'Escolha a referência</span>').replace('Sobe o teu vídeo</span>', 'Envie o seu vídeo</span>').replace('Aplica no editor</span>', 'Aplique no editor</span>')

def entre(t, a, b, inclui_b=True):
    i = t.index(a); j = t.index(b, i + len(a))
    return t[i:j + (len(b) if inclui_b else 0)]

OK = '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>'
NO = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'
CK = 'https://payfast.greenn.com.br/195947/offer/yf7yxj?ch_id=144304'

# ---------------- pedaços reaproveitados da página de upsell ----------------
HEAD = base[:base.index('</head>')]
SEC_CMP = entre(base, '<section class="sec w">\n  <div class="cab">\n    <span class="rot">Veja no meu vídeo</span>', '</section>')
SEC_FLX = entre(base, '<section class="sec w">\n  <div class="cab"><span class="rot">Como funciona</span>', '</section>')
SEC_GAR = entre(base, '<section class="sec w">\n    <div class="gar-fl">', '</section>').replace('Teste por 7 dias. Risco zero.', 'Use por 7 dias. Risco zero.')
SCR = base[base.index('<script src="/pixel.js"></script>'):]
JS_CMP = entre(SCR, '  // ===== comparador com referências', '  // ===== como funciona', False)
JS_FLX = entre(SCR, '  // ===== como funciona', '  // ===== 1 clique', False)
JS_FIX = entre(SCR, '  // ===== barra fixa do celular', '})();\n</script>', False)
METRICS = re.search(r'<script src="https://metrics\.basefl\.com/t\.js"[^>]*></script>', SCR).group(0)
PASSOS3 = entre(base, '<div class="passos3"', '\n  </div>\n')
AVISO = entre(base, '<div class="aviso">', '</div>')
GARMINI = entre(base, '<p class="gar-mini">', '</p>')

# ---------------- CSS novo (seções das páginas de venda) ----------------
CSS = '''
/* ===== seções de venda (WhatsApp, bio e upsell) ===== */
.dores{max-width:760px;margin:0 auto;display:grid;gap:10px}
.dor{display:flex;gap:14px;align-items:flex-start;background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:16px 18px;font-size:16px}
.dor b{flex:none;font:700 12px var(--m);color:var(--ambar);padding-top:4px}
.virada{max-width:640px;margin:22px auto 0;text-align:center;font:700 clamp(19px,2.6vw,23px)/1.35 var(--d);letter-spacing:-.01em}
.virada em{font-style:normal;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.bens{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.bem{display:grid;grid-template-columns:74px 1fr;gap:16px;align-items:center;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:16px}
.bem img{width:74px;height:74px;border-radius:12px;object-fit:cover}
.bem h3{font-size:18px;font-weight:800;margin-bottom:4px}
.bem p{color:var(--mute);font-size:15px}
.quem{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.qm{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:18px}
.qm h3{font-size:17px;font-weight:800;margin-bottom:6px}
.qm p{color:var(--mute);font-size:15px}
.nao-e{max-width:760px;margin:14px auto 0;display:grid;gap:8px}
.nao-e li{list-style:none;display:flex;gap:10px;align-items:flex-start;color:var(--mute);font-size:15px}
.nao-e svg{flex:none;width:18px;height:18px;margin-top:3px;fill:none;stroke:var(--dim);stroke-width:2.4;stroke-linecap:round}
.esperar .lista li{font-size:15px}
.esperar .cx.v .lista svg{stroke:var(--ambar)}
.editor{max-width:760px;margin:12px auto 0;display:flex;gap:12px;align-items:flex-start;background:var(--panel2);border:1px solid var(--line);border-radius:16px;padding:16px 18px;font-size:15px;color:var(--mute)}
.editor svg{flex:none;width:22px;height:22px;color:var(--ambar);margin-top:1px}
.editor b{color:var(--ink)}
.leva{max-width:560px;margin:0 auto}
.oferta .sob{margin-top:10px;font-size:13.5px;color:var(--mute)}
a.gu{text-decoration:none}
@media (max-width:760px){.bens,.quem{grid-template-columns:1fr}.bem{grid-template-columns:60px 1fr}.bem img{width:60px;height:60px}}
'''

# ---------------- seções novas ----------------
def sec_dores(titulo, linhas, virada):
    d = ''.join(f'<div class="dor"><b>0{i+1}</b><span>{l}</span></div>' for i, l in enumerate(linhas))
    return f'''<section class="sec w">
  <div class="cab"><span class="rot">O problema</span><h2>{titulo}</h2></div>
  <div class="dores">{d}</div>
  <p class="virada">{virada}</p>
</section>'''

BENS = [
    ('ref-natural', 'Não sabe colorir?', 'Comece por uma referência. A parte técnica fica com o Mood.'),
    ('ref-dourado', 'Perde tempo ajustando cor?', 'A LUT sai em menos de um minuto e serve para a série inteira.'),
    ('ref-urbano', 'Gostou da cor de outro vídeo?', 'Use um print dele como referência e leve aquele clima para o seu.'),
    ('ref-pastel', 'Quer experimentar estilos?', 'Troque a referência e veja outro clima no mesmo vídeo.'),
]
def sec_bens():
    b = ''.join(f'<div class="bem"><img src="/lut/demo/{img}.webp" alt="" width="150" height="150" loading="lazy"><div><h3>{t}</h3><p>{p}</p></div></div>' for img, t, p in BENS)
    return f'''<section class="sec w">
  <div class="cab"><span class="rot">No dia a dia</span><h2>O que muda na sua edição.</h2></div>
  <div class="bens">{b}</div>
</section>'''

QUEM = [
    ('Não sabe fazer color grade', 'Quer o vídeo mais bonito, mas não sabe por onde começar a mexer na cor.'),
    ('Criador de conteúdo', 'Grava e posta toda semana e não pode perder meia hora acertando cor.'),
    ('Editor iniciante', 'Já edita, mas ainda não domina correção e tratamento de cor.'),
    ('Não curte a parte técnica', 'Não quer aprender curva, roda de cor e temperatura só para o vídeo ficar bonito.'),
    ('Editor que quer agilidade', 'Já sabe editar e quer chegar num estilo mais rápido, partindo de uma referência.'),
    ('Viu uma cor bonita por aí', 'Achou um vídeo ou foto com uma cor linda e quer algo parecido no seu.'),
]
def sec_quem():
    q = ''.join(f'<div class="qm"><h3>{t}</h3><p>{p}</p></div>' for t, p in QUEM)
    return f'''<section class="sec w">
  <div class="cab"><span class="rot">Pra quem é</span><h2>Pra quem é o Mood?</h2></div>
  <div class="quem">{q}</div>
  <ul class="nao-e">
    <li>{NO}<span><b>Não é pra quem edita só no CapCut do celular:</b> ele não aceita LUT importada.</span></li>
    <li>{NO}<span><b>Não é pra quem espera um vídeo idêntico à referência</b> em qualquer gravação. Leia o que esperar logo abaixo.</span></li>
  </ul>
</section>'''

def sec_esperar():
    bom = ['Luz parecida: dia com dia, ambiente interno com interno', 'Vídeo bem exposto, nem escuro nem estourado', 'Cenas do mesmo tipo: pessoa com pessoa, rua com rua']
    TIL = '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>'
    var = ['Luz muito diferente entre a referência e o seu vídeo', 'Vídeo muito escuro, estourado ou com pouca qualidade', 'Referência com filtro pesado ou efeito exagerado']
    li = lambda xs: ''.join(f'<li class="s">{OK}{x}</li>' for x in xs)
    return f'''<section class="sec w esperar">
  <div class="cab"><span class="rot">Sem promessa milagrosa</span><h2>O que esperar do resultado.</h2>
    <p class="sub">O Mood leva o clima da referência para o seu vídeo. Quanto mais parecidas as duas cenas, mais perto o resultado fica.</p></div>
  <div class="duas">
    <div class="cx"><h3>Fica melhor quando</h3><ul class="lista">{li(bom)}</ul></div>
    <div class="cx v"><h3>Pode variar quando</h3><ul class="lista">{''.join(f'<li class="s">{TIL}{x}</li>' for x in var)}</ul></div>
  </div>
  <div class="editor"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>
    <span><b>Como chega no seu editor:</b> o Mood gera uma LUT (arquivo .cube). Você aplica no CapCut do computador, no Premiere, no DaVinci ou no Final Cut. Dá para criar a LUT pelo celular, mas ela é aplicada no computador.</span></div>
</section>'''

def sec_leva(itens, cta, href):
    li = ''.join(f'<li class="s">{OK}{x}</li>' for x in itens)
    return f'''<section class="sec w">
  <div class="cab"><span class="rot">A oferta</span><h2>Tudo o que vem no Mood.</h2></div>
  <div class="oferta leva" id="oferta2">
    <p class="mono">Mood · acesso de 1 ano</p>
    <ul class="lista" style="text-align:left;margin:6px 0 18px">{li}</ul>
    <div class="preco" aria-label="79 reais"><small>R$</small><span>79</span></div>
    <p class="parc">à vista, ou 12x de R$ 8,12</p>
    <a class="gu" href="{href}" data-compra="oferta">{cta}</a>
    <p class="sob">Pix ou cartão. O acesso chega no seu e-mail logo depois do pagamento.</p>
    {GARMINI}
  </div>
</section>'''

def sec_faq(itens):
    d = ''.join(f'<details><summary>{q}</summary><p>{a}</p></details>' for q, a in itens)
    return f'''<section class="sec w">
  <div class="cab"><span class="rot">Perguntas</span><h2>Antes de decidir</h2></div>
  <div class="faq">{d}</div>
</section>'''

FAQ_PUB = [
    ('Preciso entender de cor?', 'Não. Você escolhe a referência e o Mood monta a LUT. Se quiser, ajusta a intensidade e protege o tom de pele antes de baixar.'),
    ('Fica igual à referência?', 'Fica com o clima dela. Quanto mais parecidas a luz e a cena, mais perto fica. Com cenas muito diferentes, ele leva o clima da cor, mas não faz milagre.'),
    ('Funciona no celular?', 'Você pode criar a LUT pelo celular, mas ela é aplicada no editor do computador: CapCut, Premiere, DaVinci ou Final Cut. O CapCut do celular não aceita LUT importada.'),
    ('Funciona com vídeo em Log?', 'Sim. Funciona com vídeo normal e com Log (Apple Log, S-Log2, S-Log3).'),
    ('Como recebo o acesso?', 'Logo depois do pagamento chega um e-mail, e o Mood aparece liberado na sua conta Base FL com o mesmo e-mail da compra.'),
    ('Por quanto tempo posso usar?', '1 ano, com LUTs ilimitadas nesse período.'),
    ('E se eu não gostar?', 'Você tem 7 dias de garantia. Dentro desse prazo é só pedir o reembolso e você recebe o valor de volta.'),
]

def hero(rot, h1, sub, oferta_html):
    return f'''<section class="topo w">
  <div class="marca"><span class="mood">Mood</span><span class="de">BASE FL</span></div>
  <p class="rot">{rot}</p>
  <h1>{h1}</h1>
  <p class="sub">{sub}</p>
  {PASSOS3}
  <div class="palco">
  <div class="ad" aria-label="O mesmo vídeo antes e depois do Mood">
    <video src="/oferta/mood/antes-depois.mp4" poster="/oferta/mood/antes-depois.jpg" autoplay muted loop playsinline webkit-playsinline disablepictureinpicture preload="auto"></video>
  </div>
{oferta_html}
  </div>
</section>'''

def oferta_pub(titulo, cta, href):
    return f'''  <div class="oferta" id="oferta">
    <p class="mono">Mood · acesso de 1 ano</p>
    <h3>{titulo}</h3>
    <div class="preco" aria-label="79 reais"><small>R$</small><span>79</span></div>
    <p class="parc">à vista, ou 12x de R$ 8,12</p>
    <a class="gu" href="{href}" data-compra="topo">{cta}</a>
    <p class="sob">Pix ou cartão · acesso liberado na hora</p>
    {AVISO}
    {GARMINI}
  </div>'''

LEVA = ['LUTs ilimitadas durante 1 ano', 'Videoaula mostrando como usar', 'CapCut do computador, Premiere, DaVinci e Final Cut', 'Vídeo normal ou em Log', 'Pele protegida e ajuste de intensidade', '7 dias de garantia']

def pagina(titulo_html, desc, og, corpo, fim_h2, fim_sub, cta_fim, href, js_compra, rodape_fixo_cta):
    h = HEAD
    h = re.sub(r'<title>.*?</title>', f'<title>{titulo_html}</title>', h, flags=re.S)
    h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">', h)
    h = h.replace('<link rel="preload" as="video" href="https://aulas.basefl.com/upssel.mp4" type="video/mp4">', '<link rel="preload" as="video" href="/oferta/mood/antes-depois.mp4" type="video/mp4">')
    h = h.replace('/* Upsell do Mood depois da compra dos Títulos Dinâmicos (Greenn, 1 clique · upsell 7205 · oferta R$ 79). */', '/* Página de vendas do Mood (100% venda). Gerada a partir de /oferta/mood/ — estilos compartilhados. */')
    if og: h = h.replace('<meta name="theme-color"', og + '\n<meta name="theme-color"')
    if '/* ===== seções de venda' not in h: h = h.replace('</style>', CSS + '</style>')
    return f'''{h}</head>
<body>

<main>
{corpo}

<section class="fim w">
  <h2>{fim_h2}</h2>
  <p class="sub" style="margin:12px auto 22px">{fim_sub}</p>
  <a class="gu" href="{href}" data-compra="fim">{cta_fim}</a>
</section>
</main>

<footer class="rodape w">Base FL · o ecossistema do editor de vídeo · <a href="https://basefl.com/termos/">Termos de uso</a> · <a href="https://basefl.com/privacidade/">Privacidade</a></footer>

<div class="fixo" id="fixo" aria-hidden="true"><span><b>Mood · R$ 79</b>ou 12x de R$ 8,12</span><a href="{href}" tabindex="-1" data-compra="barra">{rodape_fixo_cta}</a></div>

<script src="/pixel.js"></script>
{METRICS}
<script>
(() => {{
  const $ = s => document.querySelector(s);
{js_compra}
{JS_CMP}{JS_FLX}{JS_FIX}}})();
</script>
</body>
</html>
'''

# eventos de intenção de compra (mesmo banco/visitante da página de upsell): mood_pagina_viu · mood_compra_clique
def js_eventos(origem):
    return '''  // ===== eventos de intenção de compra (rpc evento · pack fl-lut): mood_pagina_viu e mood_compra_clique, com a origem
  const EV = (() => {
    const URL_ = 'https://otlaexuqyavpzxwzcsfo.supabase.co/rest/v1/rpc/evento', KEY = 'sb_publishable_bAaw1t6NpZEgH8ePBztQWg_tE4kDfQR';
    const ck = n => { const m = document.cookie.match('(?:^|; )' + n + '=([^;]*)'); return m ? decodeURIComponent(m[1]) : null; };
    let vis = null; try { vis = localStorage.getItem('fl_vis'); } catch {} vis = vis || ck('fl_vis');
    if (!vis || !/^v[a-z0-9]{10,30}$/.test(vis)) { vis = 'v' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); try { localStorage.setItem('fl_vis', vis); } catch {} document.cookie = 'fl_vis=' + vis + ';path=/;max-age=31536000;SameSite=Lax'; }
    return (nome, extra) => { try { fetch(URL_, { method:'POST', keepalive:true, headers:{ 'Content-Type':'application/json', apikey:KEY, Authorization:'Bearer ' + KEY }, body: JSON.stringify({ p_nome:nome, p_pack:'fl-lut', p_visitante:vis, p_dados:Object.assign({ origem:ORIGEM }, extra || {}) }) }).catch(() => {}); } catch {} };
  })();
  EV('mood_pagina_viu');
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-compra]'); if (!b) return;
    EV('mood_compra_clique', { onde: b.dataset.compra });
    try { window.FLPixel && FLPixel.checkout(); } catch {}
  }, true);
'''.replace('ORIGEM', repr(origem))

# ================= WhatsApp =================
V_HREF = CK + '&utm_source=whatsapp&utm_medium=disparo&utm_campaign=mood&utm_content=pagina'
v_js = js_eventos('whatsapp') + '''  // ===== link do disparo (basefl.com/v/?t=CÓDIGO): abertura e clique passam pelo /camp/ir (central do WhatsApp)
  const q = new URLSearchParams(location.search), t = q.get('t') || '';
  if (/^[a-f0-9]{12,40}$/.test(t)) {
    const ir = d => { const u = new URL('https://otlaexuqyavpzxwzcsfo.supabase.co/functions/v1/camp/ir'); u.searchParams.set('t', t); u.searchParams.set('o', 'whatsapp'); u.searchParams.set('d', d); return u.toString(); };
    document.querySelectorAll('[data-compra]').forEach(a => a.href = ir('checkout'));
    try { fetch(ir('abriu'), { mode:'no-cors', keepalive:true, cache:'no-store' }).catch(() => {}); } catch {}
  }
'''
v_corpo = '\n\n'.join([
    hero('Uma ferramenta nova, feita por mim',
         'Criei uma ferramenta para acertar a cor dos seus vídeos.',
         'Você mostra um vídeo com a cor que gosta, mostra o seu, e o Mood cria a LUT pronta para o seu editor.',
         oferta_pub('Garanta seu acesso', 'Quero facilitar minhas edições', V_HREF)),
    sec_dores('Você grava, edita… e trava na cor.', [
        'Mexe em contraste, saturação e temperatura, e a imagem fica diferente, não melhor.',
        'Vê um vídeo com uma cor linda e não faz ideia de como chegar nela.',
        'Perde meia hora num ajuste que no fim nem ficou bom.'],
        'Foi pra isso que eu fiz o Mood: <em>você mostra a cor que quer</em>, ele faz a parte técnica.'),
    SEC_CMP, SEC_FLX, sec_bens(), sec_quem(), sec_esperar(),
    sec_leva(LEVA, 'Quero meu Mood', V_HREF), SEC_GAR, sec_faq(FAQ_PUB)])
v = pagina('Mood · Base FL', 'Uma ferramenta para acertar a cor do seu vídeo usando outro vídeo como referência.',
    '<meta property="og:title" content="Mood · Base FL">\n<meta property="og:description" content="Cor bonita no seu vídeo, sem saber color grade.">\n<meta property="og:image" content="https://basefl.com/lut/demo/og-mood.jpg">',
    v_corpo, 'Sua próxima edição já pode sair com a cor que você gosta.', 'Mood por R$ 79, ou 12x de R$ 8,12. Com 7 dias de garantia.',
    'Garantir meu acesso', V_HREF, v_js, 'Quero meu Mood')
(R / 'v/index.html').write_text(v, encoding='utf-8')

# ================= Bio do Instagram =================
B_HREF = CK + '&utm_source=instagram&utm_medium=bio&utm_campaign=mood&utm_content=pagina'
b_js = js_eventos('bio') + '''  // ?de= (bio-instagram, app, site…) vira utm_medium/src no checkout, como antes
  const de = new URLSearchParams(location.search).get('de');
  if (de && /^[a-z0-9-]{2,40}$/i.test(de)) document.querySelectorAll('[data-compra]').forEach(a => { const u = new URL(a.href); u.searchParams.set('utm_medium', de); u.searchParams.set('src', 'basefl-' + de); a.href = u.toString(); });
'''
b_corpo = '\n\n'.join([
    hero('Colorização por referência',
         'Cor bonita no seu vídeo, sem precisar saber color grade.',
         'Escolha um vídeo ou uma foto com a cor que você gosta. O Mood usa essa referência para criar a LUT do seu vídeo.',
         oferta_pub('Garanta seu acesso', 'Quero meu Mood', B_HREF)),
    sec_dores('Você grava, edita… e trava na cor.', [
        'Mexe em contraste, saturação e temperatura, e a imagem fica diferente, não melhor.',
        'Salva referências no Instagram e no Pinterest, mas não consegue levar aquilo para o seu vídeo.',
        'Perde meia hora num ajuste que no fim nem ficou bom.'],
        'O Mood troca o ajuste no escuro por uma referência: <em>você mostra a cor que quer</em>, ele faz a parte técnica.'),
    SEC_CMP, SEC_FLX, sec_bens(), sec_quem(), sec_esperar(),
    sec_leva(LEVA, 'Quero meu Mood', B_HREF), SEC_GAR, sec_faq(FAQ_PUB)])
b = pagina('Mood — cor bonita no seu vídeo, sem saber color grade · Base FL', 'Use um vídeo ou foto como referência e crie a LUT do seu vídeo. Para CapCut no computador, Premiere, DaVinci e Final Cut.',
    '<meta property="og:title" content="Mood · Base FL">\n<meta property="og:description" content="Cor bonita no seu vídeo, sem precisar saber color grade.">\n<meta property="og:image" content="https://basefl.com/lut/demo/og-mood.jpg">',
    b_corpo, 'Sua próxima edição já pode sair com a cor que você gosta.', 'Mood por R$ 79, ou 12x de R$ 8,12. Com 7 dias de garantia.',
    'Garantir meu acesso', B_HREF, b_js, 'Quero meu Mood')
b = b.replace('<meta name="robots" content="noindex, nofollow">\n', '')
(R / 'conheca/mood/index.html').write_text(b, encoding='utf-8')

# ================= Upsell: copy + seções do meio (1 clique e scripts intactos) =================
u = base
def tr(a, c, n=1):
    global u
    if u.count(a) != n: sys.exit(f'upsell: âncora {u.count(a)}x: {a[:90]!r}')
    u = u.replace(a, c)
h1 = re.search(r'(<section class="topo w">.*?<h1>)(.*?)(</h1>\s*<p class="sub">)(.*?)(</p>)', u, re.S)
u = u[:h1.start(2)] + 'Facilitou os títulos. Agora facilite a cor.' + u[h1.end(2):h1.start(4)] + 'Com o Mood você usa um vídeo com a cor que gosta como referência e aplica no seu. Sem mexer em curva, roda de cor ou temperatura.' + u[h1.end(4):]
tr('onclick="startLoading(this)">Sim, quero o Mood</button>', 'onclick="startLoading(this)">Sim, quero meu Mood</button>')
if '/* ===== seções de venda' not in u: u = u.replace('</style>', CSS + '</style>', 1)
# seções do meio: depois do "Como funciona", benefícios + pra quem é + o que esperar (no lugar do bloco "O que você leva / Pra quem é")
duas = entre(u, '<section class="sec w">\n  <div class="duas">', '</section>')
leva_up = '''<section class="sec w">
  <div class="cx leva"><h3>O que você leva</h3>
    <ul class="lista">''' + ''.join(f'<li class="s">{OK}{x}</li>' for x in ['LUTs ilimitadas durante 1 ano', 'CapCut do computador, Premiere, DaVinci e Final Cut', 'Vídeo normal ou em Log', 'Pele protegida e ajuste de intensidade', 'Liberado na mesma conta Base FL dos Títulos']) + '''</ul>
  </div>
</section>'''
u = u.replace(duas, '\n\n'.join([sec_bens(), sec_quem(), sec_esperar(), leva_up]))
u = u.replace('Teste por 7 dias. Risco zero.', 'Use por 7 dias. Risco zero.')
(R / 'oferta/mood/index.html').write_text(u, encoding='utf-8')
print('ok')
