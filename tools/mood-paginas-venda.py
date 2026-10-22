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
.dica{margin:18px auto 10px;font:700 11px var(--m);letter-spacing:.12em;text-transform:uppercase;color:var(--ambar);text-align:center}
.topo .demo{margin-top:6px;max-width:400px}
.topo .demo .looks{order:-1}
@media (max-width:760px){.topo .cmp{aspect-ratio:auto;height:44svh}}
.hero-cta{max-width:420px;margin:22px auto 0;text-align:center}
.hero-cta .gar-mini{margin-top:10px}
@media (max-width:760px){.bens,.quem{grid-template-columns:1fr}.bem{grid-template-columns:60px 1fr}.bem img{width:60px;height:60px}}
'''

def poe_js(t):
    t = re.sub(r'<script id="dd-js">.*?</script>\n', '', t, flags=re.S)
    return t.replace('</body>', DD_JS + '</body>', 1)

def poe_css(t):
    """troca (ou coloca) o bloco de CSS das seções de venda, sempre na versão atual deste gerador"""
    i = t.find('\n/* ===== seções de venda')
    if i >= 0: t = t[:i] + t[t.index('</style>', i):]
    return t.replace('</style>', CSS + DD_CSS + '</style>', 1)

# ---------------- seções novas ----------------
def sec_dores(titulo, linhas, virada):
    d = ''.join(f'<div class="dor"><b>0{i+1}</b><span>{l}</span></div>' for i, l in enumerate(linhas))
    return f'''<section class="sec w">
  <div class="cab"><span class="rot">O problema</span><h2>{titulo}</h2></div>
  <div class="dores">{d}</div>
  <p class="virada">{virada}</p>
</section>'''

# Seção "No dia a dia" interativa: problema -> Mood -> solução, com placar "x de 4 resolvidas".
D = '/lut/demo/'
DD_CARDS = [
  ('cor', 'Não sabe colorir?', 'Mexe em tudo, e a cor não chega.', 'Escolha uma referência. A parte técnica fica com o Mood.',
   f'''<div class="cena"><div class="th"><img class="p" src="{D}normal-709.webp" alt="" width="540" height="676" loading="lazy"><img class="s" src="{D}dourado.webp" alt="" width="540" height="676" loading="lazy"></div>
      <div class="ctl"><div class="roda"><i></i></div>
        <div class="sl s1"><small>Temperatura</small><span><b></b></span></div>
        <div class="sl s2"><small>Saturação</small><span><b></b></span></div>
        <div class="sl s3"><small>Contraste</small><span><b></b></span></div></div>
      <em class="ok">Cor da referência ✓</em></div>'''),
  ('tempo', 'Perde tempo ajustando cor?', 'Meia hora mexendo, e ainda não ficou bom.', 'A LUT sai em menos de um minuto e serve para a série inteira.',
   '''<div class="cena"><div class="anel"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42"/><circle class="v" cx="50" cy="50" r="42"/></svg><b class="rel">00:00</b></div>
      <div class="ctl"><small class="st p">Ajustando na mão…</small><small class="st s">LUT pronta ✓</small>
        <div class="sl s1"><span><b></b></span></div><div class="sl s2"><span><b></b></span></div><div class="sl s3"><span><b></b></span></div></div></div>'''),
  ('ref', 'Gostou da cor de outro vídeo?', 'Você vê a cor, mas não sabe como chegar nela.', 'Use um print dele como referência e leve aquele clima para o seu.',
   f'''<div class="cena"><figure class="rf"><img src="{D}ref-urbano.webp" alt="" width="300" height="300" loading="lazy"><figcaption>Referência</figcaption></figure>
      <div class="via"><i class="q">?</i><i class="g g1"></i><i class="g g2"></i><i class="g g3"></i><i class="g g4"></i></div>
      <figure class="vd"><div class="th"><img class="p" src="{D}normal-709.webp" alt="" width="540" height="676" loading="lazy"><img class="s" src="{D}urbano.webp" alt="" width="540" height="676" loading="lazy"></div><figcaption><span class="c1">Seu vídeo</span><span class="c2">Com a cor dela ✓</span></figcaption></figure></div>'''),
  ('estilos', 'Quer experimentar estilos?', 'Na mão, cada estilo é recomeçar os ajustes do zero.', 'Troque a referência e veja outro clima no mesmo vídeo. Toque nos estilos.',
   f'''<div class="cena"><div class="th"><img class="p" src="{D}normal-709.webp" alt="" width="540" height="676" loading="lazy">''' +
   ''.join(f'<img class="lk" data-l="{k}" src="{D}{k}.webp" alt="" width="540" height="676" loading="lazy">' for k in ['natural', 'dourado', 'urbano', 'pastel']) +
   '''<span class="refaz">Refazendo ajustes…</span></div>
      <div class="chips">''' + ''.join(f'<button type="button" data-l="{k}">{n}</button>' for k, n in [('natural', 'Natural'), ('dourado', 'Dourado'), ('urbano', 'Urbano'), ('pastel', 'Pastel')]) + '''</div></div>'''),
]

def sec_bens():
    cards = ''.join(f'''
    <article class="dd" data-k="{k}">
      {cena}
      <div class="tx"><h3>{q}</h3><p class="pp">{p}</p><p class="ps">{s}</p></div>
      <button class="vira" type="button" aria-pressed="false"><span>Sem o Mood</span><span>Com o Mood</span></button>
    </article>''' for k, q, p, s, cena in DD_CARDS)
    return f'''<section class="sec w" id="diaadia">
  <div class="cab"><span class="rot">No dia a dia</span><h2>O que muda na sua edição.</h2>
    <p class="sub">Quatro situações que todo editor conhece. Toque em <b>Com o Mood</b> e veja cada uma se resolver.</p></div>
  <div class="placar" aria-live="polite"><span class="pts"><i></i><i></i><i></i><i></i></span><span class="pt-t"><b id="ddN">0</b> de 4 resolvidas</span></div>
  <div class="dds">{cards}
  </div>
  <div class="dd-fim" id="ddFim" hidden><p>As quatro resolvidas. É isso que o Mood faz na sua edição.</p><a class="gu" href="#oferta">Quero meu Mood</a></div>
</section>'''

DD_CSS = '''
/* ===== No dia a dia: problema -> Mood -> solução ===== */
.placar{display:flex;align-items:center;justify-content:center;gap:12px;margin:-6px auto 18px;font:700 12px var(--m);letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}
.placar b{color:var(--ink)}
.pts{display:flex;gap:6px}
.pts i{width:22px;height:6px;border-radius:9px;background:var(--line2);transition:background .4s,box-shadow .4s}
.pts i.on{background:var(--ambar);box-shadow:0 0 12px rgba(242,165,65,.55)}
.dds{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.dd{position:relative;display:grid;grid-template-rows:auto 1fr auto;gap:14px;padding:14px;background:var(--panel);border:1px solid var(--line);border-radius:20px;overflow:hidden;transition:border-color .4s,transform .25s,box-shadow .4s}
.dd:hover{transform:translateY(-2px)}
.dd.ok{border-color:rgba(242,165,65,.45);box-shadow:0 18px 50px -34px rgba(242,165,65,.7)}
.dd .tx h3{font-size:19px;font-weight:800;margin-bottom:4px}
.dd .tx p{color:var(--mute);font-size:15px}
.dd .ps{display:none}
.dd.ok .pp{display:none}
.dd.ok .ps{display:block;color:var(--ink)}
.vira{position:relative;display:grid;grid-template-columns:1fr 1fr;padding:3px;border:1px solid var(--line2);border-radius:999px;background:var(--bg);cursor:pointer;font:700 13.5px var(--f);color:var(--mute)}
.vira span{position:relative;z-index:1;min-height:38px;display:grid;place-items:center;transition:color .3s}
.vira::before{content:"";position:absolute;top:3px;bottom:3px;left:3px;width:calc(50% - 3px);border-radius:999px;background:var(--panel2);border:1px solid var(--line2);transition:transform .45s cubic-bezier(.3,1.3,.5,1),background .3s}
.vira span:first-child{color:var(--ink)}
.dd.ok .vira::before{transform:translateX(100%);background:var(--grad);border-color:transparent}
.dd.ok .vira span:first-child{color:var(--mute)}
.dd.ok .vira span:last-child{color:#14070e}
.dd.cutuca:not(.ok) .vira{animation:cutuca 1.6s ease-in-out infinite}
@keyframes cutuca{0%,100%{box-shadow:0 0 0 0 rgba(242,165,65,0)}50%{box-shadow:0 0 0 5px rgba(242,165,65,.22)}}

.cena{position:relative;height:172px;border-radius:14px;background:var(--bg);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;gap:16px;padding:14px;overflow:hidden}
.th{position:relative;width:104px;height:130px;flex:none;border-radius:10px;overflow:hidden;background:#000}
.th img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 25%}
.th .s,.th .lk{opacity:0;transition:opacity .6s}
.ctl{flex:1;max-width:170px;display:grid;gap:9px}
.sl small{display:block;font:700 9.5px var(--m);letter-spacing:.1em;text-transform:uppercase;color:var(--dim);margin-bottom:5px}
.sl span{position:relative;display:block;height:4px;border-radius:9px;background:var(--line2)}
.sl b{position:absolute;top:50%;left:50%;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:var(--ink);box-shadow:0 1px 6px rgba(0,0,0,.5);transition:left .7s cubic-bezier(.3,1.2,.4,1),background .4s}
.roda{position:relative;width:46px;height:46px;border-radius:50%;background:conic-gradient(#ff5a5a,#ffd25a,#7cff6b,#5ae0ff,#6b7cff,#e05aff,#ff5a5a);margin-bottom:2px;-webkit-mask:radial-gradient(circle,transparent 9px,#000 10px);mask:radial-gradient(circle,transparent 9px,#000 10px)}
.roda i{position:absolute;width:8px;height:8px;border-radius:50%;background:#fff;border:2px solid #111;left:50%;top:6px;margin-left:-4px}
.cena .ok{position:absolute;left:10px;bottom:10px;padding:4px 9px;border-radius:999px;background:rgba(10,11,11,.82);font:700 10px var(--m);letter-spacing:.06em;font-style:normal;color:var(--ok);opacity:0;transform:translateY(6px);transition:opacity .35s .5s,transform .45s .5s}

/* 1 · cor: tudo mexendo, nada assenta */
.dd[data-k="cor"].vis:not(.ok) .th .p{animation:chuta 2.6s steps(1) infinite}
@keyframes chuta{0%{filter:hue-rotate(0) saturate(1)}20%{filter:hue-rotate(-28deg) saturate(1.7)}40%{filter:hue-rotate(35deg) saturate(.6) contrast(1.3)}60%{filter:hue-rotate(80deg) saturate(1.3)}80%{filter:sepia(.5) contrast(.8)}}
.dd.vis:not(.ok) .s1 b{animation:sl1 2.6s ease-in-out infinite}
.dd.vis:not(.ok) .s2 b{animation:sl2 2.1s ease-in-out infinite}
.dd.vis:not(.ok) .s3 b{animation:sl3 3s ease-in-out infinite}
@keyframes sl1{0%,100%{left:20%}35%{left:85%}65%{left:40%}}
@keyframes sl2{0%,100%{left:75%}40%{left:10%}70%{left:60%}}
@keyframes sl3{0%,100%{left:35%}30%{left:15%}60%{left:90%}}
.dd[data-k="cor"].vis:not(.ok) .roda i{animation:roda 2.4s linear infinite;transform-origin:4px 17px}
@keyframes roda{0%{transform:rotate(0)}30%{transform:rotate(140deg)}55%{transform:rotate(60deg)}100%{transform:rotate(360deg)}}
.dd.ok .s1 b{left:62%;background:var(--ambar)}.dd.ok .s2 b{left:44%;background:var(--ambar)}.dd.ok .s3 b{left:57%;background:var(--ambar)}
.dd[data-k="cor"].ok .roda i{transform:rotate(38deg);transform-origin:4px 17px;transition:transform .7s}
.dd.ok .th .s{opacity:1}
.dd.ok .cena .ok{opacity:1;transform:none}

/* 2 · tempo: o relógio corre, o anel nunca fecha */
.anel{position:relative;width:118px;height:118px;flex:none}
.anel svg{width:100%;height:100%;transform:rotate(-90deg)}
.anel circle{fill:none;stroke:var(--line2);stroke-width:7}
.anel .v{stroke:var(--nada,#ff8f7a);stroke-linecap:round;stroke-dasharray:264;stroke-dashoffset:264;transition:stroke-dashoffset .8s cubic-bezier(.3,.9,.3,1),stroke .4s}
.dd[data-k="tempo"].vis:not(.ok) .anel .v{animation:quase 3.2s cubic-bezier(.2,.7,.3,1) infinite}
@keyframes quase{0%{stroke-dashoffset:264}80%{stroke-dashoffset:52}100%{stroke-dashoffset:52;opacity:.2}}
.anel .rel{position:absolute;inset:0;display:grid;place-items:center;font:700 17px var(--m);color:var(--ink)}
.dd[data-k="tempo"].ok .anel .v{stroke:var(--ambar);stroke-dashoffset:0}
.st{font:700 11px var(--m);letter-spacing:.08em;text-transform:uppercase}
.st.p{color:#ff8f7a}.st.s{color:var(--ok);display:none}
.dd.ok .st.p{display:none}.dd.ok .st.s{display:block}

/* 3 · referência: a cor atravessa para o seu vídeo */
.cena figure{margin:0;text-align:center}
.cena figcaption{margin-top:6px;font:700 9.5px var(--m);letter-spacing:.1em;text-transform:uppercase;color:var(--dim)}
.rf img{width:84px;height:84px;border-radius:10px;object-fit:cover;display:block}
.vd .th{width:84px;height:105px}
.via{position:relative;flex:1;max-width:120px;height:2px;background:repeating-linear-gradient(90deg,var(--line2) 0 5px,transparent 5px 10px);margin-bottom:18px}
.via .q{position:absolute;left:50%;top:50%;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;display:grid;place-items:center;background:var(--panel2);border:1px solid var(--line2);font:800 13px var(--f);font-style:normal;color:var(--mute);transition:opacity .3s,transform .3s}
.dd[data-k="ref"].vis:not(.ok) .via .q{animation:duvida 1.8s ease-in-out infinite}
@keyframes duvida{50%{transform:translateY(-4px)}}
.via .g{position:absolute;top:-5px;left:0;width:12px;height:12px;border-radius:50%;opacity:0}
.g1{background:#1f6f78}.g2{background:#f0a35c}.g3{background:#2b3c52}.g4{background:#d9c7a8}
.vd .c2{display:none;color:var(--ok)}.dd.ok .vd .c1{display:none}.dd.ok .vd .c2{display:inline}
.dd[data-k="ref"].ok .via{background:repeating-linear-gradient(90deg,var(--ambar) 0 5px,transparent 5px 10px)}
.dd[data-k="ref"].ok .via .q{opacity:0;transform:scale(.4)}
.dd[data-k="ref"].ok .via .g{animation:viaja 1s cubic-bezier(.5,0,.3,1) both}
.dd[data-k="ref"].ok .g2{animation-delay:.12s}.dd[data-k="ref"].ok .g3{animation-delay:.24s}.dd[data-k="ref"].ok .g4{animation-delay:.36s}
@keyframes viaja{0%{left:0;opacity:0;transform:scale(.5)}15%{opacity:1;transform:scale(1)}85%{opacity:1}100%{left:calc(100% - 12px);opacity:0;transform:scale(.4)}}
.dd[data-k="ref"] .th .s{clip-path:inset(0 100% 0 0);opacity:1;transition:clip-path 0s}
.dd[data-k="ref"].ok .th .s{clip-path:inset(0 0 0 0);transition:clip-path .9s 1s cubic-bezier(.65,0,.35,1)}

/* 4 · estilos: na mão recomeça; com o Mood troca num toque */
.dd[data-k="estilos"] .cena{flex-direction:row}
.dd[data-k="estilos"] .th{width:104px}
.refaz{position:absolute;left:6px;right:6px;bottom:6px;padding:4px 6px;border-radius:7px;background:rgba(10,11,11,.82);font:700 8.5px var(--m);letter-spacing:.05em;text-transform:uppercase;color:#ff8f7a;text-align:center;transition:opacity .3s}
.dd[data-k="estilos"].vis:not(.ok) .th .p{animation:recomeca 2.4s ease-in-out infinite}
@keyframes recomeca{0%,100%{filter:none}45%{filter:saturate(1.6) hue-rotate(-20deg)}55%{filter:blur(2px) brightness(.6)}}
.dd[data-k="estilos"].ok .refaz{opacity:0}
.dd[data-k="estilos"] .lk.on{opacity:1}
.chips{display:grid;grid-template-columns:1fr 1fr;gap:6px;width:150px}
.chips button{min-height:36px;border:1px solid var(--line2);border-radius:10px;background:var(--panel);color:var(--mute);font:700 12.5px var(--f);cursor:pointer;transition:background .25s,color .25s,border-color .25s,transform .15s}
.chips button:active{transform:scale(.95)}
.chips button.on{background:var(--ink);color:#111312;border-color:var(--ink)}

.dd-fim{margin:22px auto 0;max-width:460px;text-align:center}
.dd-fim p{font:700 18px/1.35 var(--d);margin-bottom:14px}
.dd-fim:not([hidden]){animation:sobe .5s cubic-bezier(.3,1.2,.4,1)}
@keyframes sobe{from{opacity:0;transform:translateY(10px)}}
@media (max-width:760px){.dds{grid-template-columns:1fr}.cena{height:160px;gap:12px}.th{width:96px;height:120px}}
@media (hover:none){.dd:hover{transform:none}}
@media (prefers-reduced-motion:reduce){.dd *,.dd *::before,.dd::before{animation:none!important;transition-duration:.01s!important;transition-delay:0s!important}.dd-fim{animation:none!important}}
'''

DD_JS = '''<script id="dd-js">
/* No dia a dia: cada card troca Sem o Mood / Com o Mood; o placar conta quantas a pessoa resolveu. */
(() => {
  const sec = document.getElementById('diaadia'); if (!sec) return;
  const cards = [...sec.querySelectorAll('.dd')], pts = [...sec.querySelectorAll('.pts i')], N = document.getElementById('ddN'), fim = document.getElementById('ddFim');
  const feitos = new Set(), calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ev = (n, d) => { try { window.FLMood && FLMood(n, d); } catch {} };
  const placar = () => { N.textContent = feitos.size; pts.forEach((p, i) => p.classList.toggle('on', i < feitos.size)); if (feitos.size === 4 && fim.hidden) { fim.hidden = false; ev('mood_diaadia_completo'); } };
  // relógio do card "tempo": corre rápido enquanto está sem o Mood
  const rel = sec.querySelector('.dd[data-k="tempo"] .rel'); let seg = 0, tRel = 0;
  const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  const relogio = on => { clearInterval(tRel); if (!on) return; tRel = setInterval(() => { seg = (seg + 23) % 2700; rel.textContent = fmt(seg); }, 80); };
  // estilos: com o Mood os looks se alternam sozinhos até a pessoa tocar num
  const est = sec.querySelector('.dd[data-k="estilos"]'), lks = [...est.querySelectorAll('.lk')], chs = [...est.querySelectorAll('.chips button')];
  let iL = 0, tL = 0, tocouL = false;
  const look = k => { lks.forEach(l => l.classList.toggle('on', l.dataset.l === k)); chs.forEach(c => c.classList.toggle('on', c.dataset.l === k)); };
  const roda = on => { clearInterval(tL); if (!on || tocouL || calmo) return; tL = setInterval(() => { iL = (iL + 1) % 4; look(lks[iL].dataset.l); }, 1300); };
  const vira = (c, ok) => {
    c.classList.toggle('ok', ok); c.classList.remove('cutuca');
    c.querySelector('.vira').setAttribute('aria-pressed', ok ? 'true' : 'false');
    const k = c.dataset.k;
    if (k === 'tempo') { relogio(!ok && c.classList.contains('vis') && !calmo); if (ok) rel.textContent = '48 s'; }
    if (k === 'estilos') { if (ok) { look(lks[iL].dataset.l); roda(c.classList.contains('vis')); } else { clearInterval(tL); lks.forEach(l => l.classList.remove('on')); chs.forEach(x => x.classList.remove('on')); } }
    if (ok && !feitos.has(k)) { feitos.add(k); ev('mood_diaadia', { card: k }); placar(); }
  };
  cards.forEach(c => c.querySelector('.vira').addEventListener('click', () => vira(c, !c.classList.contains('ok'))));
  chs.forEach(b => b.addEventListener('click', () => { tocouL = true; clearInterval(tL); iL = lks.findIndex(l => l.dataset.l === b.dataset.l); if (!est.classList.contains('ok')) vira(est, true); look(b.dataset.l); }));
  // só anima o que está na tela; depois de 3,5 s parado, o botão dá um sinal discreto
  const cut = new Map();
  try { const io = new IntersectionObserver(es => es.forEach(e => {
    const c = e.target, k = c.dataset.k; c.classList.toggle('vis', e.isIntersecting);
    if (k === 'tempo') relogio(e.isIntersecting && !c.classList.contains('ok') && !calmo);
    if (k === 'estilos') roda(e.isIntersecting && c.classList.contains('ok'));
    clearTimeout(cut.get(c));
    if (e.isIntersecting && !c.classList.contains('ok')) cut.set(c, setTimeout(() => c.classList.add('cutuca'), 3500));
  }), { threshold:.45 }); cards.forEach(c => io.observe(c)); } catch { cards.forEach(c => c.classList.add('vis')); }
})();
</script>
'''

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
  <div class="oferta leva" id="oferta">
    <p class="mono">Mood · acesso de 1 ano</p>
    <ul class="lista" style="text-align:left;margin:6px 0 18px">{li}</ul>
    <div class="preco" aria-label="79 reais"><small>R$</small><span>79</span></div>
    <p class="parc">à vista, ou 12x de R$ 8,12</p>
    <a class="gu" href="{href}" data-compra="oferta">{cta}</a>
    <p class="sob">Pix ou cartão. O acesso chega no seu e-mail logo depois do pagamento.</p>
    {AVISO}
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

DEMO = SEC_CMP[SEC_CMP.index('<div class="demo">'):SEC_CMP.rindex('</section>')].rstrip()
def hero_venda(rot, h1, sub, cta):
    return f'''<section class="topo w">
  <div class="marca"><span class="mood">Mood</span><span class="de">BASE FL</span></div>
  <p class="rot">{rot}</p>
  <h1>{h1}</h1>
  <p class="sub">{sub}</p>
  {PASSOS3}
  <p class="dica">Toque numa referência e veja a cor mudar no meu vídeo. Arraste para comparar.</p>
  {DEMO}
  <div class="hero-cta"><a class="gu" id="heroCta" href="#oferta">{cta}</a>{GARMINI}</div>
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

def pagina(titulo_html, desc, og, corpo, fim_h2, fim_sub, cta_fim, href, js_compra, rodape_fixo_cta, venda=False):
    h = HEAD
    h = re.sub(r'<title>.*?</title>', f'<title>{titulo_html}</title>', h, flags=re.S)
    h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">', h)
    h = h.replace('<link rel="preload" as="video" href="https://aulas.basefl.com/upssel.mp4" type="video/mp4">', '<link rel="preload" as="video" href="/oferta/mood/antes-depois.mp4" type="video/mp4">')
    h = h.replace('/* Upsell do Mood depois da compra dos Títulos Dinâmicos (Greenn, 1 clique · upsell 7205 · oferta R$ 79). */', '/* Página de vendas do Mood (100% venda). Gerada a partir de /oferta/mood/ — estilos compartilhados. */')
    if og: h = h.replace('<meta name="theme-color"', og + '\n<meta name="theme-color"')
    h = poe_css(h)
    return f'''{h}</head>
<body>

<main>
{corpo}

{'' if venda else f"""<section class="fim w">
  <h2>{fim_h2}</h2>
  <p class="sub" style="margin:12px auto 22px">{fim_sub}</p>
  <a class="gu" href="{href}" data-compra="fim">{cta_fim}</a>
</section>"""}
</main>

<footer class="rodape w">Base FL · o ecossistema do editor de vídeo · <a href="https://basefl.com/termos/">Termos de uso</a> · <a href="https://basefl.com/privacidade/">Privacidade</a></footer>

{FIXO_VENDA.replace('CTA', rodape_fixo_cta) if venda else f'<div class="fixo" id="fixo" aria-hidden="true"><span><b>Mood · R$ 79</b>ou 12x de R$ 8,12</span><a href="{href}" tabindex="-1" data-compra="barra">{rodape_fixo_cta}</a></div>'}

<script src="/pixel.js"></script>
{METRICS}
<script>
(() => {{
  const $ = s => document.querySelector(s);
{js_compra}
{JS_CMP}{JS_FLX}{JS_FIX_VENDA if venda else JS_FIX}}})();
</script>
</body>
</html>
'''

FIXO_VENDA = '<div class="fixo" id="fixo" aria-hidden="true"><span><b>Mood</b>Cor bonita sem saber color grade</span><a href="#oferta" tabindex="-1">CTA</a></div>'
JS_FIX_VENDA = '''  // ===== barra fixa do celular: aparece depois do botão do topo e some quando a oferta (no fim) está na tela =====
  const fixo = $('#fixo'), hc = $('#heroCta'), of = $('#oferta'); let passou = false, vendo = false;
  const atualiza = () => fixo.classList.toggle('on', passou && !vendo);
  try {
    new IntersectionObserver(es => es.forEach(e => { passou = !e.isIntersecting && e.boundingClientRect.top < 0; atualiza(); })).observe(hc);
    new IntersectionObserver(es => es.forEach(e => { vendo = e.isIntersecting; atualiza(); })).observe(of);
  } catch {}
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
  window.FLMood = EV;
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
    hero_venda('Uma ferramenta nova, feita por mim',
         'Criei uma ferramenta para acertar a cor dos seus vídeos.',
         'Você mostra um vídeo com a cor que gosta, mostra o seu, e o Mood cria a LUT pronta para o seu editor.',
         'Quero facilitar minhas edições'),
    sec_dores('Você grava, edita… e trava na cor.', [
        'Mexe em contraste, saturação e temperatura, e a imagem fica diferente, não melhor.',
        'Vê um vídeo com uma cor linda e não faz ideia de como chegar nela.',
        'Perde meia hora num ajuste que no fim nem ficou bom.'],
        'Foi pra isso que eu fiz o Mood: <em>você mostra a cor que quer</em>, ele faz a parte técnica.'),
    SEC_FLX, sec_bens(), sec_quem(), sec_esperar(), sec_faq(FAQ_PUB),
    sec_leva(LEVA, 'Garantir meu acesso', V_HREF), SEC_GAR])
v = pagina('Mood · Base FL', 'Uma ferramenta para acertar a cor do seu vídeo usando outro vídeo como referência.',
    '<meta property="og:title" content="Mood · Base FL">\n<meta property="og:description" content="Cor bonita no seu vídeo, sem saber color grade.">\n<meta property="og:image" content="https://basefl.com/lut/demo/og-mood.jpg">',
    v_corpo, 'Sua próxima edição já pode sair com a cor que você gosta.', 'Mood por R$ 79, ou 12x de R$ 8,12. Com 7 dias de garantia.',
    'Garantir meu acesso', V_HREF, v_js, 'Quero meu Mood', venda=True)
(R / 'v/index.html').write_text(poe_js(v), encoding='utf-8')

# ================= Bio do Instagram =================
B_HREF = CK + '&utm_source=instagram&utm_medium=bio&utm_campaign=mood&utm_content=pagina'
b_js = js_eventos('bio') + '''  // ?de= (bio-instagram, app, site…) vira utm_medium/src no checkout, como antes
  const de = new URLSearchParams(location.search).get('de');
  if (de && /^[a-z0-9-]{2,40}$/i.test(de)) document.querySelectorAll('[data-compra]').forEach(a => { const u = new URL(a.href); u.searchParams.set('utm_medium', de); u.searchParams.set('src', 'basefl-' + de); a.href = u.toString(); });
'''
b_corpo = '\n\n'.join([
    hero_venda('Colorização por referência',
         'Cor bonita no seu vídeo, sem precisar saber color grade.',
         'Escolha um vídeo ou uma foto com a cor que você gosta. O Mood usa essa referência para criar a LUT do seu vídeo.',
         'Quero meu Mood'),
    sec_dores('Você grava, edita… e trava na cor.', [
        'Mexe em contraste, saturação e temperatura, e a imagem fica diferente, não melhor.',
        'Salva referências no Instagram e no Pinterest, mas não consegue levar aquilo para o seu vídeo.',
        'Perde meia hora num ajuste que no fim nem ficou bom.'],
        'O Mood troca o ajuste no escuro por uma referência: <em>você mostra a cor que quer</em>, ele faz a parte técnica.'),
    SEC_FLX, sec_bens(), sec_quem(), sec_esperar(), sec_faq(FAQ_PUB),
    sec_leva(LEVA, 'Garantir meu acesso', B_HREF), SEC_GAR])
b = pagina('Mood — cor bonita no seu vídeo, sem saber color grade · Base FL', 'Use um vídeo ou foto como referência e crie a LUT do seu vídeo. Para CapCut no computador, Premiere, DaVinci e Final Cut.',
    '<meta property="og:title" content="Mood · Base FL">\n<meta property="og:description" content="Cor bonita no seu vídeo, sem precisar saber color grade.">\n<meta property="og:image" content="https://basefl.com/lut/demo/og-mood.jpg">',
    b_corpo, 'Sua próxima edição já pode sair com a cor que você gosta.', 'Mood por R$ 79, ou 12x de R$ 8,12. Com 7 dias de garantia.',
    'Garantir meu acesso', B_HREF, b_js, 'Quero meu Mood', venda=True)
b = b.replace('<meta name="robots" content="noindex, nofollow">\n', '')
(R / 'conheca/mood/index.html').write_text(poe_js(b), encoding='utf-8')

# ================= Upsell: copy + seções do meio (1 clique e scripts intactos) =================
u = base
def tr(a, c, n=1):
    global u
    if a not in u and c in u: return          # já aplicado (gerador roda de novo sobre a página pronta)
    if u.count(a) != n: sys.exit(f'upsell: âncora {u.count(a)}x: {a[:90]!r}')
    u = u.replace(a, c)
h1 = re.search(r'(<section class="topo w">.*?<h1>)(.*?)(</h1>\s*<p class="sub">)(.*?)(</p>)', u, re.S)
u = u[:h1.start(2)] + 'Facilitou os títulos. Agora facilite a cor.' + u[h1.end(2):h1.start(4)] + 'Com o Mood você usa um vídeo com a cor que gosta como referência e aplica no seu. Sem mexer em curva, roda de cor ou temperatura.' + u[h1.end(4):]
tr('onclick="startLoading(this)">Sim, quero o Mood</button>', 'onclick="startLoading(this)">Sim, quero meu Mood</button>')
u = poe_css(u)
# seções do meio: depois do "Como funciona", benefícios + pra quem é + o que esperar (no lugar do bloco "O que você leva / Pra quem é")
duas = entre(u, '<section class="sec w">\n  <div class="duas">', '</section>') if '<section class="sec w">\n  <div class="duas">' in u else None
leva_up = '''<section class="sec w">
  <div class="cx leva"><h3>O que você leva</h3>
    <ul class="lista">''' + ''.join(f'<li class="s">{OK}{x}</li>' for x in ['LUTs ilimitadas durante 1 ano', 'CapCut do computador, Premiere, DaVinci e Final Cut', 'Vídeo normal ou em Log', 'Pele protegida e ajuste de intensidade', 'Liberado na mesma conta Base FL dos Títulos']) + '''</ul>
  </div>
</section>'''
if duas: u = u.replace(duas, '\n\n'.join([sec_bens(), sec_quem(), sec_esperar(), leva_up]))
u = u.replace('Teste por 7 dias. Risco zero.', 'Use por 7 dias. Risco zero.')
# seção "No dia a dia" sempre na versão atual
_m = re.search(r'<section class="sec w"( id="diaadia")?>\n  <div class="cab"><span class="rot">No dia a dia</span>.*?</section>', u, re.S)
if _m: u = u[:_m.start()] + sec_bens() + u[_m.end():]
u = poe_js(u)
(R / 'oferta/mood/index.html').write_text(u, encoding='utf-8')
print('ok')
