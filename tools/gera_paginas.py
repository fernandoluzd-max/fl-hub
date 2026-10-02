# Gera as páginas de vendas em conheca/<slug>/index.html
# Cada página tem uma cor, uma demonstração animada e o mesmo esqueleto curto.
import os, sys, html

BASE = os.path.join(os.path.dirname(__file__), '..', 'conheca')

CSS_BASE = r"""
:root{
  --bg:#0B0C0C; --bg2:#121413; --card:#161918; --line:#252A27; --ink:#F4F0E4; --mute:#A8A89A; --dim:#6b6a61;
  --d:"Archivo",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  --f:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--bg)}
body{color:var(--ink);font:16px/1.55 var(--f);overflow-x:hidden;-webkit-font-smoothing:antialiased}
a{color:inherit}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px;position:relative;z-index:1}
.fx{position:absolute;inset:0 0 auto;height:900px;pointer-events:none;overflow:hidden;z-index:0}
.fx::before{content:"";position:absolute;width:1000px;height:700px;left:var(--fxx,70%);top:-300px;transform:translateX(-50%);background:radial-gradient(closest-side,color-mix(in srgb,var(--a) 26%,transparent),transparent 72%)}
.fx::after{content:"";position:absolute;inset:0;background-image:var(--pattern);mask-image:radial-gradient(ellipse 70% 60% at 60% 10%,#000 25%,transparent 75%);-webkit-mask-image:radial-gradient(ellipse 70% 60% at 60% 10%,#000 25%,transparent 75%)}
.top{display:flex;align-items:center;gap:12px;padding:20px 0}
.top a.mk{display:flex;align-items:center;gap:10px;text-decoration:none}
.top img{width:36px;height:36px;border-radius:10px}
.top b{font-family:var(--d);font-weight:800;font-size:16px;line-height:1.1;display:block}
.top small{display:block;color:var(--mute);font-size:12px}
.top .sp{flex:1}
.top .cta-s{font-weight:700;font-size:14px;text-decoration:none;border-radius:99px;padding:9px 16px;background:var(--a);color:var(--ai);cursor:pointer;border:0;font-family:var(--f)}
.kick{display:inline-flex;align-items:center;gap:8px;font-family:var(--d);font-weight:800;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--a);background:color-mix(in srgb,var(--a) 12%,transparent);border:1px solid color-mix(in srgb,var(--a) 40%,transparent);border-radius:99px;padding:6px 13px}
h1{font-family:var(--d);font-weight:850;font-stretch:110%;font-size:clamp(36px,5.6vw,62px);line-height:1;letter-spacing:-.035em;margin:18px 0 16px;text-wrap:balance}
h1 em{font-style:normal;color:var(--a)}
.lead{color:var(--mute);font-size:clamp(16px,1.9vw,18.5px);max-width:520px}
.lead b{color:var(--ink);font-weight:600}
.ctas{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:28px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;font:inherit;font-weight:750;font-size:17px;border:0;border-radius:16px;padding:17px 26px;cursor:pointer;background:var(--a);color:var(--ai);box-shadow:0 12px 40px -12px color-mix(in srgb,var(--a) 70%,transparent);transition:transform .15s,box-shadow .2s;text-decoration:none}
.btn:hover{transform:translateY(-2px);box-shadow:0 18px 50px -12px color-mix(in srgb,var(--a) 85%,transparent)}
.btn svg{width:18px;height:18px}
.nota{color:var(--mute);font-size:13.5px;line-height:1.4}
.nota b{color:var(--ink)}
.nota .parc{color:var(--mute)}
.parcf{color:var(--mute);font-size:15px;margin:2px 0 4px}
.parcf b{color:var(--ink)}
.nota .pcur{font-family:var(--d);font-weight:900;font-size:17px;color:var(--a)}
.hero{display:grid;grid-template-columns:1fr 1.05fr;gap:48px;align-items:center;padding:36px 0 20px}
.hero.empilha{grid-template-columns:1fr;text-align:center;gap:40px}
.hero.empilha .lead{margin:0 auto}
.hero.empilha .ctas{justify-content:center}
.palco{position:relative;border-radius:24px;border:1px solid var(--line);background:linear-gradient(180deg,#151817,#0f1110);box-shadow:0 40px 100px -30px rgba(0,0,0,.9),0 0 0 1px rgba(255,255,255,.02) inset;overflow:hidden;min-height:420px;text-align:left}
.palco::before{content:"";position:absolute;inset:-30% -10% auto;height:70%;background:radial-gradient(closest-side,color-mix(in srgb,var(--a) 18%,transparent),transparent);pointer-events:none}
.palco .rot{position:absolute;left:16px;bottom:14px;font-size:11.5px;color:var(--dim);letter-spacing:.04em;z-index:3}
section{padding:90px 0 0}
h2{font-family:var(--d);font-weight:850;font-stretch:106%;font-size:clamp(26px,3.8vw,40px);line-height:1.05;letter-spacing:-.03em;max-width:20ch;text-wrap:balance}
.sub2{color:var(--mute);font-size:16.5px;max-width:560px;margin-top:10px}
.bens{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:30px}
.bem{position:relative;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:24px 22px;overflow:hidden}
.bem::after{content:"";position:absolute;right:-60px;top:-60px;width:160px;height:160px;background:radial-gradient(closest-side,color-mix(in srgb,var(--a) 16%,transparent),transparent)}
.bem .n{font-family:var(--d);font-weight:900;font-size:13px;color:var(--a);letter-spacing:.1em}
.bem h3{font-size:19px;line-height:1.25;margin:10px 0 8px;font-weight:700}
.bem p{color:var(--mute);font-size:14.5px}
.inclui{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
.inclui span{display:inline-flex;align-items:center;gap:8px;background:var(--bg2);border:1px solid var(--line);border-radius:99px;padding:9px 15px;font-size:14px}
.inclui span::before{content:"";width:16px;height:16px;border-radius:5px;background:var(--a) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4 8.5l2.5 2.5L12 5.5' fill='none' stroke='%23111' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/12px no-repeat}
.ac{font-style:normal;color:var(--a)}
.cbs{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:24px}
.cb{position:relative;display:block;text-decoration:none;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px 18px 16px 20px;transition:border-color .2s,transform .2s}
.cb::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:4px;border-radius:0 4px 4px 0;background:var(--c)}
.cb:hover{border-color:var(--c);transform:translateY(-2px)}
.cb b{display:block;font-size:17px}
.cb span{display:block;color:var(--mute);font-size:14px;margin:4px 0 10px}
.cb em{font-style:normal;font-size:13px;font-weight:700;color:var(--c)}
.pss{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:28px;counter-reset:x}
.ps{position:relative;background:linear-gradient(180deg,var(--card),var(--bg2));border:1px solid var(--line);border-radius:22px;padding:24px 22px}
.ps .pn{display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,var(--a),var(--a2));color:var(--ai);font-family:var(--d);font-weight:900;font-size:20px;box-shadow:0 10px 26px -10px var(--a)}
.ps h3{font-size:19px;margin:16px 0 6px}
.ps p{color:var(--mute);font-size:14.5px}
.ps:not(:last-child)::after{content:"";position:absolute;right:-17px;top:44px;width:18px;height:2px;background:linear-gradient(90deg,var(--a),transparent)}
.ad{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:28px}
.av{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:24px}
.av.com{border-color:color-mix(in srgb,var(--a) 45%,var(--line));background:linear-gradient(180deg,color-mix(in srgb,var(--a) 8%,var(--card)),var(--card))}
.av h4{font-family:var(--d);font-weight:850;font-size:18px;margin-bottom:14px}
.av.com h4{color:var(--a)}
.av ul{list-style:none;display:flex;flex-direction:column;gap:11px}
.av li{display:flex;gap:10px;font-size:15px;line-height:1.4}
.av li::before{flex:none;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:900;margin-top:1px}
.nao li{color:var(--mute)}
.nao li::before{content:"✕";background:#2a2020;color:#e07a6e}
.sim li::before{content:"✓";background:var(--a);color:var(--ai)}
.faq{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;margin-top:26px}
details{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:15px 18px;font-weight:650;font-size:15px}
summary::-webkit-details-marker{display:none}
summary::after{content:"+";color:var(--a);font-size:20px;transition:transform .2s}
details[open] summary::after{transform:rotate(45deg)}
details p{padding:0 18px 16px;color:var(--mute);font-size:14.5px}
.final{position:relative;margin:90px 0 0;border-radius:28px;padding:50px 28px;text-align:center;overflow:hidden;background:linear-gradient(180deg,#181b1a,#111312);border:1px solid var(--line)}
.final::before{content:"";position:absolute;inset:auto -10% -70% -10%;height:130%;background:radial-gradient(closest-side,color-mix(in srgb,var(--a) 22%,transparent),transparent 70%)}
.final>*{position:relative}
.final h2{margin:0 auto 10px}
.final .preco{font-family:var(--d);font-weight:900;font-size:clamp(40px,6vw,58px);letter-spacing:-.03em;line-height:1;margin:18px 0 6px}
.final .preco small{font-size:.38em;color:var(--mute);font-weight:700;letter-spacing:0}
.final .ctas{justify-content:center}
.selos{display:flex;justify-content:center;gap:18px;flex-wrap:wrap;margin-top:18px;color:var(--mute);font-size:13.5px}
.selos span{display:flex;align-items:center;gap:7px}
.selos span::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--a)}
footer{color:var(--dim);font-size:12.5px;text-align:center;padding:40px 0 34px}
footer a{color:var(--mute)}
.rv{opacity:0;transform:translateY(24px);transition:opacity .7s ease,transform .7s cubic-bezier(.2,.8,.2,1)}
.rv.vis{opacity:1;transform:none}
.d1{transition-delay:.08s}.d2{transition-delay:.16s}
.toast{pointer-events:none;position:fixed;left:50%;bottom:24px;transform:translate(-50%,20px);opacity:0;background:var(--ink);color:#111;font-weight:700;font-size:14px;padding:11px 16px;border-radius:12px;transition:all .25s;z-index:50}
.toast.on{opacity:1;transform:translate(-50%,0)}
@media (max-width:900px){
  .hero{grid-template-columns:1fr;gap:30px;text-align:left}
  .bens,.faq,.pss,.ad{grid-template-columns:1fr}
  .ps:not(:last-child)::after{display:none}
  section{padding-top:70px}
  .palco{min-height:360px}
}
.testar{display:inline-flex;align-items:center;gap:8px;margin-top:16px;color:var(--ink);font-weight:650;font-size:15px;text-decoration:underline;text-underline-offset:4px;text-decoration-color:var(--a)}
.teste{border:1px solid var(--line);border-radius:26px;background:var(--card);padding:26px 22px 22px;text-align:center}
.teste h2{margin-bottom:8px}
.teste p{color:var(--mute);max-width:52ch;margin:0 auto 18px}
.teste iframe{display:block;width:100%;max-width:460px;height:760px;margin:0 auto;border:1px solid var(--line);border-radius:22px;background:#0D0F0E}
.kitb{border:1px solid var(--line);border-radius:26px;background:var(--card);padding:28px 24px;display:grid;grid-template-columns:1.3fr 1fr;gap:24px;align-items:center}
.kitb h2{font-size:clamp(24px,3.4vw,34px);margin-bottom:10px}
.kitb p{color:var(--mute);margin-bottom:14px}
.kitb .trilho{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:0;padding:0}
.kitb .trilho li{font-size:13.5px;font-weight:650;border:1px solid var(--line);border-radius:99px;padding:6px 12px;color:var(--ink)}
.kitb .trilho li.aqui{border-color:var(--a);color:var(--a)}
.kitb .lado{text-align:center}
.kitb .de{color:var(--mute);font-size:15px;text-decoration:line-through}
.kitb .por{font-family:var(--d);font-weight:900;font-size:46px;letter-spacing:-.03em;line-height:1;margin:4px 0 14px}
.kitb .por small{font-size:.36em;color:var(--mute);font-weight:700;letter-spacing:0}
.kitb a.btn{text-decoration:none;display:inline-flex}
.kitb .trilho li.meu{color:var(--mute);border-style:dashed}.kitb .trilho li.meu::after{content:" ✓ já é seu";font-weight:500}
.link-c{display:inline-flex;align-items:center;gap:6px;background:none;border:0;font:inherit;font-weight:650;font-size:15px;color:var(--mute);cursor:pointer;text-decoration:underline;text-underline-offset:4px;text-decoration-color:var(--line)}
.link-c:hover{color:var(--ink)}.link-c svg{width:16px;height:16px}
a.btn{text-decoration:none}
.teste h2{margin:0 auto 8px}
.of-inc{list-style:none;display:flex;flex-wrap:wrap;justify-content:center;gap:8px 10px;max-width:720px;margin:22px auto 4px;padding:0}
.of-inc li{display:inline-flex;align-items:center;gap:8px;background:var(--bg2);border:1px solid var(--line);border-radius:99px;padding:8px 14px;font-size:14px}
.of-inc li::before{content:"✓";color:var(--a);font-weight:900}
.of-gar{display:flex;gap:12px;align-items:flex-start;text-align:left;max-width:520px;margin:22px auto 0;padding:14px 16px;border:1px solid var(--line);border-radius:14px;color:var(--mute);font-size:14.5px}
.of-gar b{color:var(--ink)}.of-gar svg{flex:none;width:26px;height:26px;fill:none;stroke:var(--a);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.fecho{margin:90px 0 0;text-align:center}.fecho h2{margin:0 auto}.fecho .ctas{justify-content:center}.fecho .nota{margin-top:14px}
.conta{border:1px solid var(--line);border-left:3px solid var(--a);background:var(--card);border-radius:14px;padding:13px 16px;margin:0 0 18px;font-size:15px;color:var(--mute)}.conta b{color:var(--ink)}.conta a{color:var(--a)}
@media (max-width:760px){.kitb{grid-template-columns:1fr;text-align:center}.kitb .trilho{justify-content:center}.teste{padding:22px 12px 14px}.teste iframe{height:720px}}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.rv{opacity:1;transform:none}}
"""

JS_BASE = r"""
// ====== link de compra e preço: vêm do catalogo.json (não edite aqui) ======
const CHECKOUT = '__CHECKOUT__';
const PRECO = '__PRECO__';
const PRODUTO = '__SLUG__';
const ACESSO = '__ACESSO__';
const PACK = '__PACK__';
// ============================================================================
const $ = s => document.querySelector(s);
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
const dorme = ms => new Promise(r => setTimeout(r, calmo ? Math.min(ms, 60) : ms));
function toast(m){ const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2400); }
// link de compra com a origem Base FL (utm) — ?de=app quando vem do app
function linkCompra(){
  if (!/^https?:\/\//.test(CHECKOUT)) return '';
  const u = new URL(CHECKOUT), de = new URLSearchParams(location.search).get('de') || 'pagina';
  u.searchParams.set('utm_source', 'basefl'); u.searchParams.set('utm_medium', de); u.searchParams.set('utm_campaign', PRODUTO); u.searchParams.set('src', 'basefl-' + de);
  return u.toString();
}
// evento de uso (sem dados pessoais): ajuda a saber qual página vende
function evento(nome){
  try {
    let v = localStorage.getItem('fl_vis'); if (!v){ v = 'v' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); localStorage.setItem('fl_vis', v); }
    fetch('https://otlaexuqyavpzxwzcsfo.supabase.co/rest/v1/rpc/evento', { method:'POST', keepalive:true, headers:{ apikey:'sb_publishable_bAaw1t6NpZEgH8ePBztQWg_tE4kDfQR', 'Content-Type':'application/json' },
      body:JSON.stringify({ p_nome:nome, p_pack:PACK, p_visitante:v, p_dados:{ pagina:PRODUTO, de:new URLSearchParams(location.search).get('de') || 'pagina' } }) }).catch(() => {});
  } catch {}
}
window.FLV = { pack: PACK, slug: PRODUTO, ir: null };   // 'ir': quando a conta já tem o produto, o botão abre a ferramenta em vez do pagamento (oferta-venda.js)
function compra(){ if (FLV.ir){ location.href = FLV.ir; return; } const l = linkCompra(); if (l){ evento('checkout_clicked'); location.href = l; } else toast('Link de compra em breve.'); }
document.querySelectorAll('[data-comprar]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); compra(); }));
// o teste grátis embutido (a ferramenta de verdade) pede a compra por aqui
addEventListener('message', e => { if (e.origin === location.origin && e.data && e.data.fl === 'comprar') compra(); });
if (PRECO && !PRECO.startsWith('__')) document.querySelectorAll('.vpreco').forEach(e => { e.innerHTML = PRECO + ' <small>/ ' + ACESSO + '</small>'; e.hidden = false; });
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add('vis'); io.unobserve(e.target); } }), { threshold:.15 });
document.querySelectorAll('.rv').forEach(el => io.observe(el));
// a demonstração só roda enquanto está visível
let visivel = true;
new IntersectionObserver(es => { visivel = es[0].isIntersecting; }, { threshold:.1 }).observe($('.palco'));
async function enquantoVisivel(){ while (!visivel) await new Promise(r => setTimeout(r, 300)); }
"""

def pagina(p):
    G = CAT['garantia_dias']
    bens = ''.join(f'<div class="bem rv{" d"+str(i) if i else ""}"><span class="n">0{i+1}</span><h3>{t}</h3><p>{d}</p></div>' for i,(t,d) in enumerate(p['bens']))
    inclui = ''.join(f'<span>{x}</span>' for x in p['inclui'])
    faq = ''.join(f'<details><summary>{q}</summary><p>{a}</p></details>' for q,a in p['faq'] + [('E se eu comprar e não gostar?', f'Você tem {CAT["garantia_dias"]} dias de garantia. Dentro desse prazo é só pedir o reembolso e você recebe o valor de volta.')])
    passos = ''
    if p.get('passos'):
        it = ''.join(f'<div class="ps rv{" d"+str(i) if i else ""}"><span class="pn">{i+1}</span><h3>{t}</h3><p>{d}</p></div>' for i,(t,d) in enumerate(p['passos']))
        passos = f'<section><span class="kick rv">Como funciona</span><h2 class="rv" style="margin-top:14px">{p["passos_h2"]}</h2><div class="pss">{it}</div></section>'
    ad = ''
    if p.get('antes'):
        a = ''.join(f'<li>{x}</li>' for x in p['antes']); d = ''.join(f'<li>{x}</li>' for x in p['depois'])
        ad = f'<section><h2 class="rv">{p["ad_h2"]}</h2><div class="ad"><div class="av rv"><h4>Sem o {p["nome"]}</h4><ul class="nao">{a}</ul></div><div class="av com rv d1"><h4>Com o {p["nome"]}</h4><ul class="sim">{d}</ul></div></div></section>'
    combina = ''
    if p.get('combina'):
        itens = ''.join(f'<a class="cb" href="https://basefl.com/conheca/{sl}/" style="--c:{c}"><b>{n}</b><span>{t}</span><em>Ver produto →</em></a>' for sl,n,c,t in p['combina'])
        combina = f'<section><h2 class="rv">Funciona sozinho. <em class="ac">E combina com:</em></h2><p class="sub2 rv">Cada ferramenta é vendida separadamente. Se você tiver mais de uma, elas conversam entre si.</p><div class="cbs rv">{itens}</div></section>'
    seta = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
    hero_cls = 'hero empilha' if p.get('empilha') else 'hero'
    inclui_li = ''.join(f'<li>{x}</li>' for x in p['inclui'])
    # TOPO: quando a página tem algo para a pessoa VER ou TESTAR de verdade, esse é o botão principal
    # (o preço fica para a oferta, depois de ela entender o que recebe). Quem já decidiu tem o atalho ao lado.
    if p.get('ver'):
        url, rot = p['ver']
        hero_cta = f'''<div class="ctas"><a class="btn" href="{url}">{rot}</a><button class="link-c" data-comprar>Já conheço, quero liberar {seta}</button></div>
      <p class="nota" style="margin-top:14px">{p['nota']} · {CAT['garantia_dias']} dias de garantia</p>'''
    else:
        hero_cta = f'''<div class="ctas"><button class="btn" data-comprar>{p['cta']} {seta}</button><span class="nota"><b class="pcur">{p['preco']}</b> · {p['acesso_txt']}<br><span class="parc">ou 12x de {p['parc6']} no cartão · <b>{CAT['garantia_dias']} dias de garantia</b></span><br>{p['nota']}</span></div>'''
    # MIOLO: a página pode trazer a própria narrativa ('miolo'); senão, usa o molde comum
    if p.get('miolo'):
        miolo = p['miolo'].replace('__TESTE__', p.get('teste', ''))
    else:
        miolo = f'''{p.get('teste', '')}

  {passos}

  <section>
    <h2 class="rv">{p['h2']}</h2>
    <div class="bens">{bens}</div>
  </section>

  {ad}'''
    css = CSS_BASE + p['css']
    capa = p.get('capa') or f"https://basefl.com/capas/{p['slug']}.jpg"   # capa do produto ao compartilhar o link
    js = JS_BASE.replace('__PACK__', p.get('pack', '')).replace('__SLUG__', p['slug']).replace('__ACESSO__', p['acesso_curto']).replace('__CHECKOUT__', p['checkout']).replace('__PRECO__', p['preco']) + p['js']
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{p['nome']} — Base FL</title>
<meta name="description" content="{html.escape(p['desc'])}">
<link rel="icon" href="https://basefl.com/favicon.png">
<link rel="apple-touch-icon" href="https://basefl.com/apple-touch-icon.png">
<meta name="theme-color" content="#0B0C0C">
<meta property="og:title" content="{p['nome']} — Base FL">
<meta property="og:description" content="{html.escape(p['desc'])}">
<meta property="og:image" content="{capa}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..900&family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{{--a:{p['cor']};--a2:{p['cor2']};--ai:{p.get('ink','#111')};--pattern:{p['pattern']};--fxx:{p.get('fxx','70%')}}}
{css}
</style>
</head>
<body>
<div class="fx"></div>
<div class="wrap">
  <div class="top">
    <a class="mk" href="https://basefl.com/"><img src="https://basefl.com/logo.png" alt=""><span><b>Base FL</b><small>{p['secao']}</small></span></a>
    <span class="sp"></span>
    <button class="cta-s" data-comprar>Comprar</button>
  </div>
  <div class="conta" id="conta" hidden></div>

  <div class="{hero_cls}">
    <div>
      <span class="kick">{p['kick']}</span>
      <h1>{p['h1']}</h1>
      <p class="lead">{p['lead']}</p>
      {hero_cta}
    </div>
    <div class="palco" aria-label="Demonstração de {p['nome']}">{p['demo']}<span class="rot">{p['rot']}</span></div>
  </div>

  {miolo}

  {combina}

  <section id="oferta"><div class="final rv">
    <span class="kick">O que você leva</span>
    <h2 style="margin-top:16px">{p['fh2']}</h2>
    <ul class="of-inc">{inclui_li}</ul>
    <div class="preco vpreco" hidden></div>
    <div class="parcf">ou <b>12x de {p['parc6']}</b> no cartão · ou à vista no Pix</div>
    <div class="ctas"><button class="btn" data-comprar>{p.get('cta_oferta') or p['cta']} {seta}</button></div>
    <p class="of-gar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5.5c0 4.2-2.9 7.6-7 9.5-4.1-1.9-7-5.3-7-9.5V6z"/><path d="M8.800 12.200l2.300 2.300 4.200-4.600"/></svg><span><b>{G} dias de garantia.</b> Usou e não era o que esperava? Peça o reembolso nesse prazo e receba o valor de volta.</span></p>
    <div class="selos"><span>{p['acesso_selo']}</span><span>Liberado na hora da compra</span><span>Aula ensinando a usar</span><span>{p['selo']}</span></div>
  </div></section>

  {p.get('kit', '')}

  <section>
    <h2 class="rv">Perguntas rápidas</h2>
    <div class="faq rv">{faq}</div>
  </section>

  <div class="fecho rv">
    <h2>{p.get('fecho') or p['fh2']}</h2>
    <div class="ctas"><button class="btn" data-comprar>{p.get('cta_oferta') or p['cta']} {seta}</button></div>
    <p class="nota"><b class="pcur">{p['preco']}</b> · {p['acesso_txt']} · {G} dias de garantia</p>
  </div>

  <footer><a href="https://basefl.com/">Base FL</a> · o ecossistema do editor de vídeo</footer>
</div>
<div class="toast" id="toast"></div>
<script>
{js}
</script>
<script src="/catalogo.js" defer></script>
<script src="/base.js" defer></script>
<script src="/oferta-venda.js" defer></script>
</body>
</html>
"""

FAQ_ACESSO = ('Como recebo o acesso?', 'Assim que a compra é aprovada, ele aparece liberado no app Base FL e no navegador. É só entrar com o mesmo e-mail da compra.')
FAQ_ANO = ('Quanto tempo de acesso?', '1 ano, com todas as atualizações desse período. Perto de vencer, o app avisa e você pode renovar.')
FAQ_VIT = ('Quanto tempo de acesso?', 'Vitalício. Comprou uma vez, fica liberado na sua conta para sempre, no app Base FL.')
FAQ_APP = ('Já tenho o app Base FL. Preciso baixar algo?', 'Não. O que você comprar aparece liberado no mesmo app, é só clicar em Instalar ou Abrir.')

PAGINAS = []

# ---------------------------------------------------------------- EFEITOS SONOROS
PAGINAS.append(dict(
  slug='efeitos-sonoros', nome='Efeitos Sonoros', secao='Kits · CapCut', cor='#5AB8FF', cor2='#2E7CF6',
  pattern='radial-gradient(rgba(90,184,255,.10) 1px,transparent 1.4px) 0 0/22px 22px', empilha=True, fxx='50%',
  kick='Kit para o CapCut', desc='65 efeitos sonoros organizados por categoria, direto nas predefinições do CapCut com um clique.',
  h1='O som que faltava no seu corte, <em>a um clique.</em>',
  lead='<b>65 whooshes, impactos, risers e foleys</b> organizados por categoria e instalados direto nas predefinições do seu CapCut. Sem baixar pasta, sem arrastar arquivo.',
  cta='Quero os efeitos', nota='Precisa do <b>CapCut para computador</b><br>Mac ou Windows',
  rot='Demonstração · predefinições do CapCut',
  demo='''<div class="cc">
    <div class="cc-top"><span class="cc-tab on">Áudio</span><span class="cc-tab">Texto</span><span class="cc-tab">Efeitos</span><span class="cc-sp"></span><span class="cc-inst" id="inst">Instalando no CapCut…</span></div>
    <div class="cc-body">
      <div class="cc-side"><small>PREDEFINIÇÕES</small><div id="pastas"></div></div>
      <div class="cc-grid" id="sons"></div>
    </div>
    <div class="cc-tl"><div class="cc-ph" id="ph"></div><div class="cc-v"></div><div class="cc-a" id="faixa"></div></div>
  </div>''',
  css=r'''
.palco{min-height:470px;max-width:980px;margin:0 auto;width:100%}
.cc{position:absolute;inset:18px 18px 40px;display:flex;flex-direction:column;border-radius:16px;background:#121414;border:1px solid #232827;overflow:hidden}
.cc-top{display:flex;align-items:center;gap:6px;padding:10px 12px;border-bottom:1px solid #222726}
.cc-tab{font-size:12px;color:#8d8c83;padding:5px 10px;border-radius:8px}
.cc-tab.on{background:#1f2423;color:var(--ink)}
.cc-sp{flex:1}
.cc-inst{font-size:11.5px;color:var(--a);opacity:0;transition:opacity .3s}
.cc-inst.on{opacity:1}
.cc-body{flex:1;display:grid;grid-template-columns:190px 1fr;min-height:0}
.cc-side{border-right:1px solid #222726;padding:12px 10px}
.cc-side small{font-size:10px;color:#77766d;letter-spacing:.08em}
.pasta{display:flex;align-items:center;gap:8px;font-size:12.5px;padding:8px 8px;border-radius:8px;margin-top:4px;opacity:0;transform:translateX(-10px);transition:all .35s cubic-bezier(.2,.8,.2,1)}
.pasta.on{opacity:1;transform:none}
.pasta.sel{background:color-mix(in srgb,var(--a) 16%,transparent);color:var(--ink)}
.pasta i{width:14px;height:11px;border-radius:2px;background:var(--a);opacity:.85;position:relative}
.pasta i::before{content:"";position:absolute;left:0;top:-3px;width:6px;height:4px;border-radius:2px 2px 0 0;background:var(--a)}
.cc-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:12px;align-content:start}
.som{position:relative;background:#181c1b;border:1px solid #242a29;border-radius:10px;padding:9px 10px 8px;opacity:0;transform:scale(.94);transition:opacity .3s,transform .3s,border-color .2s}
.som.on{opacity:1;transform:none}
.som b{display:block;font-size:11.5px;font-weight:600;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.som .w{display:flex;align-items:center;gap:2px;height:26px}
.som .w i{flex:1;background:#3a4645;border-radius:2px;transition:background .15s}
.som.toca{border-color:var(--a)}
.som.toca .w i{background:var(--a);animation:eq .5s ease-in-out infinite alternate}
.som.toca .w i:nth-child(3n){animation-delay:.12s}.som.toca .w i:nth-child(3n+1){animation-delay:.24s}
@keyframes eq{to{transform:scaleY(.35)}}
.cc-tl{position:relative;height:74px;border-top:1px solid #222726;background:#0f1110;padding:10px 12px}
.cc-v{height:22px;width:70%;border-radius:5px;background:linear-gradient(90deg,#2a3a5a,#33476b);opacity:.9}
.cc-a{position:absolute;left:12px;top:40px;height:22px;border-radius:5px;background:color-mix(in srgb,var(--a) 35%,#101311);border:1px solid var(--a);width:0;transition:width .5s ease;display:flex;align-items:center;padding-left:8px;font-size:10.5px;font-weight:700;white-space:nowrap;overflow:hidden}
.cc-ph{position:absolute;top:4px;bottom:4px;left:12px;width:2px;background:#fff;z-index:2;box-shadow:0 0 10px rgba(255,255,255,.6)}
@media (max-width:640px){.cc-body{grid-template-columns:104px minmax(0,1fr)}.pasta{font-size:11px;padding:7px 6px;gap:6px}.cc-grid{grid-template-columns:repeat(2,minmax(0,1fr));padding:10px;gap:6px}.som:nth-child(n+5){display:none}}
''',
  js=r'''
const PASTAS = ['Whooshes','Impactos','Risers','Foleys'];
const SONS = { Whooshes:['Whoosh rápido','Whoosh grave','Swish curto','Passagem','Whoosh duplo','Ar cortando'], Impactos:['Impacto grave','Batida seca','Boom','Hit cinema','Soco','Drop'], Risers:['Riser tenso','Subida curta','Build-up','Riser reverso','Tensão','Sobe e corta'], Foleys:['Clique','Papel','Passos','Teclado','Pop','Câmera'] };
const onda = () => Array.from({length:22}, () => `<i style="height:${20 + Math.random()*80}%"></i>`).join('');
async function demo(){
  while (true){
    await enquantoVisivel();
    $('#pastas').innerHTML = PASTAS.map(p => `<div class="pasta"><i></i>FL ${p}</div>`).join('');
    $('#sons').innerHTML = ''; $('#faixa').style.width = '0'; $('#faixa').textContent = ''; $('#ph').style.transition = 'none'; $('#ph').style.left = '12px';
    $('#inst').classList.add('on');
    for (const el of document.querySelectorAll('.pasta')){ await dorme(260); el.classList.add('on'); }
    await dorme(400); $('#inst').classList.remove('on');
    for (let k = 0; k < PASTAS.length; k++){
      document.querySelectorAll('.pasta').forEach((e, i) => e.classList.toggle('sel', i === k));
      $('#sons').innerHTML = SONS[PASTAS[k]].map(n => `<div class="som"><b>${n}</b><div class="w">${onda()}</div></div>`).join('');
      const tiles = [...document.querySelectorAll('.som')];
      for (const t of tiles){ await dorme(60); t.classList.add('on'); }
      const t = tiles[Math.floor(Math.random()*tiles.length)];
      await dorme(300); t.classList.add('toca');
      $('#faixa').textContent = t.querySelector('b').textContent; $('#faixa').style.left = (12 + k*18) + '%'; $('#faixa').style.width = '22%';
      const ph = $('#ph'); ph.style.transition = 'none'; ph.style.left = `calc(${12 + k*18}% - 2px)`; void ph.offsetWidth;
      ph.style.transition = 'left 1.2s linear'; ph.style.left = `calc(${34 + k*18}%)`;
      await dorme(1300); t.classList.remove('toca');
    }
    await dorme(900);
  }
}
demo();
''',
  h2='Efeitos certos, achados em segundos.',
  bens=[('Organizados por categoria','Pastas de whooshes, impactos, risers e foleys. Você acha o som pelo nome, sem ouvir 50 arquivos.'),
        ('Direto no CapCut','Ficam nas predefinições de áudio do CapCut. É só arrastar para a timeline do seu projeto.'),
        ('Instala e atualiza num clique','O app Base FL coloca tudo no lugar. Quando sair efeito novo, é só clicar em Atualizar.')],
  inclui=['65 efeitos sonoros','Whooshes','Impactos','Risers','Foleys','Acesso vitalício'],
  faq=[('Funciona em qual CapCut?','No CapCut para computador, no Mac ou no Windows. O app Base FL encontra o CapCut sozinho.'), FAQ_ACESSO, FAQ_VIT, FAQ_APP],
  fh2='Dê ritmo aos seus cortes hoje.', selo='Mac e Windows'))

# ---------------------------------------------------------------- LUTs
PAGINAS.append(dict(
  slug='luts', nome='LUTs', secao='Kits · CapCut', cor='#FF6FAE', cor2='#B45CFF',
  pattern='linear-gradient(115deg,rgba(255,111,174,.06),transparent 40%),repeating-linear-gradient(90deg,rgba(255,255,255,.025) 0 1px,transparent 1px 64px)',
  kick='Kit para o CapCut', desc='20 looks de finalização e 3 LUTs de conversão (Sony S-Log2, S-Log3 e Apple Log), direto em Ajuste › LUT no CapCut.',
  h1='Transforme a imagem do seu vídeo <em>com um clique.</em>',
  lead='<b>20 looks de cinema</b> para o seu vídeo de sempre, direto em Ajuste › LUT no CapCut. E, para quem grava em Log, <b>3 LUTs de conversão</b> que devolvem a cor certa na hora.',
  cta='Quero as LUTs', nota='Precisa do <b>CapCut para computador</b><br>Mac ou Windows',
  rot='Demonstração · foto: Pexels',
  demo='''<div class="cena">
    <div class="img antes" id="antes"><img src="https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1400" alt="" loading="eager"></div>
    <div class="img depois" id="depois"><img src="https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1400" alt=""></div>
    <div class="corte" id="corte"><span></span></div>
    <span class="tg l" id="tgl">Antes · Rec.709</span><span class="tg r" id="tgr">Depois</span>
  </div>
  <div class="lutbar"><small>Ajuste › LUT</small><div class="chips" id="chips"></div></div><svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><filter id="lut-teal" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0.95"/><feComponentTransfer><feFuncR type="table" tableValues="0.03 0.21 0.50 0.80 0.97"/><feFuncG type="table" tableValues="0.06 0.26 0.51 0.77 0.95"/><feFuncB type="table" tableValues="0.11 0.31 0.49 0.68 0.86"/></feComponentTransfer></filter><filter id="lut-quente" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0.85"/><feComponentTransfer><feFuncR type="table" tableValues="0.07 0.30 0.58 0.84 0.98"/><feFuncG type="table" tableValues="0.05 0.26 0.52 0.78 0.94"/><feFuncB type="table" tableValues="0.04 0.20 0.44 0.70 0.86"/></feComponentTransfer></filter><filter id="lut-frio" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0.8"/><feComponentTransfer><feFuncR type="table" tableValues="0.03 0.21 0.48 0.76 0.96"/><feFuncG type="table" tableValues="0.05 0.24 0.50 0.77 0.96"/><feFuncB type="table" tableValues="0.10 0.31 0.54 0.78 0.94"/></feComponentTransfer></filter><filter id="lut-pastel" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0.62"/><feComponentTransfer><feFuncR type="table" tableValues="0.10 0.30 0.55 0.80 0.97"/><feFuncG type="table" tableValues="0.10 0.30 0.54 0.79 0.96"/><feFuncB type="table" tableValues="0.12 0.31 0.53 0.77 0.94"/></feComponentTransfer></filter><filter id="lut-pb" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="table" tableValues="0.06 0.22 0.50 0.78 0.96"/><feFuncG type="table" tableValues="0.06 0.22 0.50 0.78 0.96"/><feFuncB type="table" tableValues="0.06 0.22 0.50 0.78 0.96"/></feComponentTransfer></filter><filter id="lut-flat" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0.42"/><feComponentTransfer><feFuncR type="table" tableValues="0.10 0.30 0.50 0.70 0.88"/><feFuncG type="table" tableValues="0.10 0.30 0.50 0.70 0.88"/><feFuncB type="table" tableValues="0.11 0.31 0.51 0.70 0.88"/></feComponentTransfer></filter><filter id="lut-log" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0.3"/><feComponentTransfer><feFuncR type="table" tableValues="0.20 0.36 0.50 0.63 0.76"/><feFuncG type="table" tableValues="0.20 0.36 0.50 0.63 0.76"/><feFuncB type="table" tableValues="0.20 0.36 0.50 0.63 0.76"/></feComponentTransfer></filter></defs></svg>''',
  css=r'''
.palco{min-height:470px;display:flex;flex-direction:column;padding:16px 16px 40px}
.cena{position:relative;flex:1;min-height:320px;border-radius:14px;overflow:hidden;border:1px solid #2a2a30;background:#1a1a1f}
.img{position:absolute;inset:0}
.img img{width:100%;height:100%;object-fit:cover;object-position:50% 50%;display:block}
.depois{clip-path:inset(0 0 0 50%)}
.corte{position:absolute;top:0;bottom:0;left:50%;width:2px;background:#fff;box-shadow:0 0 14px rgba(255,255,255,.7);z-index:2}
.corte span{position:absolute;top:50%;left:50%;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,.4)}
.corte span::before{content:"‹ ›";position:absolute;inset:0;display:grid;place-items:center;color:#111;font-weight:900;font-size:13px;letter-spacing:2px}
.tg{position:absolute;top:12px;font-size:11.5px;font-weight:700;padding:5px 10px;border-radius:99px;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);z-index:3;color:#fff}
.tg.l{left:12px}.tg.r{right:12px;background:color-mix(in srgb,var(--a) 75%,#000)}
.lutbar{margin-top:12px}
.lutbar small{font-size:10.5px;color:#7a7980;letter-spacing:.06em}
.chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.chip{font-size:12px;font-weight:600;padding:7px 11px;border-radius:9px;background:#1b1a1f;border:1px solid #2b2a31;color:#bdbbc4;transition:all .25s}
.chip.on{background:linear-gradient(135deg,var(--a),var(--a2));border-color:transparent;color:#fff;transform:translateY(-2px)}
.chip.cv{border-style:dashed}
''',
  js=r'''
// [perfil do "antes", filtro do antes, nome do look, filtro do depois]
const LOOKS = [
  ['Rec.709', 'url(#lut-flat)', 'Teal & Orange', 'url(#lut-teal)'],
  ['Rec.709', 'url(#lut-flat)', 'Filme quente', 'url(#lut-quente)'],
  ['Rec.709', 'url(#lut-flat)', 'Frio suave', 'url(#lut-frio)'],
  ['Rec.709', 'url(#lut-flat)', 'Pastel', 'url(#lut-pastel)'],
  ['Rec.709', 'url(#lut-flat)', 'P&B filme', 'url(#lut-pb)'],
  ['S-Log3', 'url(#lut-log)', 'Conversão S-Log3 → Rec.709', 'none'],
];
$('#chips').innerHTML = LOOKS.map(([, , n]) => `<span class="chip${n.startsWith('Conversão') ? ' cv' : ''}">${n}</span>`).join('');
const chips = [...document.querySelectorAll('.chip')];
let x = 50;
function corte(v){ x = v; $('#depois').style.clipPath = `inset(0 0 0 ${v}%)`; $('#corte').style.left = v + '%'; }
async function varre(de, ate, ms){
  const t0 = performance.now();
  await new Promise(fim => { const f = now => { const k = Math.min(1, (now - t0) / ms), e = k < .5 ? 2*k*k : 1 - Math.pow(-2*k + 2, 2)/2; corte(de + (ate - de) * e); k < 1 ? requestAnimationFrame(f) : fim(); }; requestAnimationFrame(f); });
}
async function demo(){
  let i = 0;
  while (true){
    await enquantoVisivel();
    const [pa, fa, n, fd] = LOOKS[i % LOOKS.length];
    chips.forEach((c, k) => c.classList.toggle('on', k === i % LOOKS.length));
    $('#antes').style.filter = fa; $('#depois').style.filter = fd;
    $('#tgl').textContent = 'Antes · ' + pa; $('#tgr').textContent = n;
    if (calmo){ corte(50); await dorme(2500); i++; continue; }
    await varre(x, 15, 900); await varre(15, 85, 1500); await varre(85, 45, 900);
    await dorme(700); i++;
  }
}
demo();
''',
  h2='Cor bonita sem virar colorista.',
  bens=[('20 looks de finalização','Do quente ao frio, do filme ao preto e branco. Escolha o clima do vídeo e ajuste a intensidade.'),
        ('Feitos para o vídeo de sempre','A maioria dos vídeos sai em Rec.709, o padrão do celular e da câmera. Os looks foram feitos para ele.'),
        ('3 LUTs de conversão','Grava em Log? Sony S-Log2 e S-Log3 (como na ZV-E10) e Apple Log (iPhone em ProRes Log) voltam para a cor normal num clique.')],
  inclui=['20 looks de finalização','Conversão Sony S-Log2','Conversão Sony S-Log3','Conversão Apple Log','Acesso vitalício'],
  faq=[('Funciona se eu não gravo em Log?','Sim. Os 20 looks são para vídeo comum (Rec.709), que é o padrão do celular e da maioria das câmeras. As 3 de conversão são só para quem grava em Log.'),
       ('O que é Rec.709?','É o perfil de cor padrão dos vídeos. Se você grava sem mexer em nada no celular ou na câmera, seu vídeo já está em Rec.709.'),
       ('Funciona em qual CapCut?','No CapCut para computador, no Mac ou no Windows.'), FAQ_ACESSO, FAQ_VIT],
  fh2='Dê cara de cinema ao seu próximo vídeo.', selo='Mac e Windows'))

# ---------------------------------------------------------------- QUANTO COBRAR?
PAGINAS.append(dict(
  slug='quanto-cobrar', nome='Quanto Cobrar?', secao='Ferramentas', cor='#7BD88F', cor2='#3FB86A',
  pattern='linear-gradient(rgba(123,216,143,.05) 1px,transparent 1px) 0 0/100% 38px', fxx='75%',
  kick='Ferramenta', desc='Descubra quanto cobrar por uma edição ou gravação em 1 minuto e mande a proposta por link para o cliente aprovar.',
  h1='Pare de chutar preço. <em>Saiba quanto cobrar.</em>',
  lead='Responda poucas perguntas sobre o trabalho e receba um <b>preço justo para o seu nível</b>, o valor dos pacotes e a <b>proposta pronta para o cliente aprovar</b>. Em 1 minuto.',
  cta='Quero saber meu preço', nota='Funciona no <b>celular e no computador</b>',
  rot='Demonstração',
  demo='''<div class="qc">
    <div class="qc-q" id="q"><small id="qn">01 / 04</small><b id="qt">Que tipo de vídeo?</b><div class="qc-o" id="qo"></div></div>
    <div class="qc-r" id="r"><small>Valor de referência</small><div class="qc-p">R$ <span id="v">0</span></div><div class="qc-f" id="fx">Faixa justa: R$ 1.150 a R$ 1.700</div>
      <div class="qc-b" id="zap"><b>Orçamento</b><br>Serviço: Edição caprichada de Reels<br>Entrega: 8 vídeos editados<br>Investimento: R$ 1.350</div></div>
    <div class="qc-tl"><div class="qc-tr" id="tr"></div><div class="qc-head" id="hd"></div></div>
  </div>''',
  css=r'''
.qc{position:absolute;inset:18px 18px 40px;display:flex;flex-direction:column}
.qc-q,.qc-r{flex:1;transition:opacity .35s,transform .35s}
.qc-q small,.qc-r small{font-size:12px;font-weight:700;color:var(--a);letter-spacing:.04em}
.qc-q b{display:block;font-family:var(--d);font-weight:850;font-size:26px;letter-spacing:-.02em;margin:6px 0 14px}
.qc-o{display:flex;flex-direction:column;gap:8px}
.op{position:relative;background:#171a19;border:1px solid #252a27;border-radius:13px;padding:12px 14px 12px 16px;font-size:14.5px;font-weight:600;transition:all .2s}
.op::before{content:"";position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:var(--a)}
.op.on{border-color:var(--a);background:#1c211e;transform:scale(.98)}
.qc-r{position:absolute;inset:0 0 70px;opacity:0;transform:translateY(12px);pointer-events:none}
.qc-r.on{opacity:1;transform:none}
.qc-q.off{opacity:0;transform:translateY(-10px)}
.qc-p{font-family:var(--d);font-weight:900;font-size:58px;letter-spacing:-.035em;line-height:1.05;margin:4px 0}
.qc-f{color:var(--mute);font-size:14px}
.qc-b{margin-top:18px;margin-left:auto;max-width:82%;background:#005C4B;border-radius:14px 4px 14px 14px;padding:11px 13px;font-size:13px;line-height:1.5;color:#e9edef;opacity:0;transform:translateY(14px) scale(.96);transition:all .4s cubic-bezier(.2,.8,.2,1)}
.qc-b.on{opacity:1;transform:none}
.qc-tl{position:relative;height:54px;margin-top:auto;background:#0f1211;border:1px solid #232826;border-radius:12px;padding:9px 10px;overflow:hidden}
.qc-tr{display:flex;gap:3px;height:34px}
.clp{height:34px;border-radius:6px;padding:0 10px;display:flex;align-items:center;font-size:11.5px;font-weight:700;white-space:nowrap;background:color-mix(in srgb,var(--c) 26%,#0f1211);border:1px solid color-mix(in srgb,var(--c) 70%,transparent);animation:clp .35s cubic-bezier(.2,.8,.2,1) both}
@keyframes clp{from{opacity:0;transform:translateY(-16px) scale(.9)}}
.qc-head{position:absolute;top:0;bottom:0;width:2px;background:var(--a);left:10px;box-shadow:0 0 10px var(--a);transition:left .4s}
''',
  js=r'''
const QS = [
  ['Que tipo de vídeo?', ['Reels / TikTok','YouTube','Comercial'], 0, 'Reels', '#3FB8AF'],
  ['Como é essa edição?', ['Simples','Caprichada','Avançada'], 1, 'Caprichada', '#9B7BF7'],
  ['Quantos vídeos?', ['1','4','8'], 2, '8 vídeos', '#5AA9F0'],
  ['E o prazo?', ['Normal','Urgente'], 0, 'Normal', '#F2A541'],
];
function conta(el, ate, ms){ const t0 = performance.now(); return new Promise(fim => { const f = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(2, -10*k); el.textContent = Math.round(ate * (k >= 1 ? 1 : e)).toLocaleString('pt-BR'); k < 1 ? requestAnimationFrame(f) : fim(); }; requestAnimationFrame(f); }); }
async function demo(){
  while (true){
    await enquantoVisivel();
    $('#tr').innerHTML = ''; $('#r').classList.remove('on'); $('#zap').classList.remove('on'); $('#q').classList.remove('off'); $('#hd').style.left = '10px'; $('#v').textContent = '0';
    for (let i = 0; i < QS.length; i++){
      const [t, ops, esc, lb, c] = QS[i];
      $('#qn').textContent = `0${i+1} / 04`; $('#qt').textContent = t;
      $('#qo').innerHTML = ops.map(o => `<div class="op">${o}</div>`).join('');
      await dorme(900);
      const b = document.querySelectorAll('.op')[esc]; b.classList.add('on');
      await dorme(350);
      const cl = document.createElement('div'); cl.className = 'clp'; cl.style.setProperty('--c', c); cl.textContent = lb; $('#tr').appendChild(cl);
      await dorme(30); $('#hd').style.left = (cl.offsetLeft + cl.offsetWidth + 10) + 'px';
      await dorme(450);
    }
    $('#q').classList.add('off'); await dorme(300);
    $('#r').classList.add('on'); await conta($('#v'), 1350, 1300);
    await dorme(500); $('#zap').classList.add('on');
    await dorme(3200);
  }
}
demo();
''',
  h2='Do “quanto você cobra?” à proposta aprovada.',
  bens=[('Preço pelo seu nível','Começando, 1 a 3 anos ou 3+ anos. O valor acompanha a sua experiência, com uma faixa justa para negociar.'),
        ('Pacotes sem conta de cabeça','4, 8, 12 ou 20 vídeos com o desconto já calculado. Você vende volume sem perder dinheiro.'),
        ('Proposta por link','O cliente abre no celular, vê serviço, prazo e valor, e aprova com um toque. As suas horas e o seu valor por hora ficam só com você.')],
  inclui=['Edição e gravação','Valor por hora do seu nível','Pacotes com desconto','Proposta por link','Orçamento em texto para o WhatsApp','Celular e computador'],
  faq=[('O cálculo grátis é igual ao da versão liberada?','É a mesma calculadora. Sem liberar, você faz 1 cálculo. Liberando, calcula quantas vezes quiser e manda a proposta por link.'), ('E se na minha cidade o preço for outro?','O valor é uma referência, calculada pelo tempo de trabalho e pelo seu nível. Antes de mandar a proposta você pode ajustar o valor final para a sua realidade.'), ('Serve para gravação também?','Sim. Você escolhe editar, gravar ou os dois, e ele considera horas de gravação, estrutura e custos extras.'), FAQ_ACESSO, FAQ_ANO],
  combina=[('gerador-de-briefing','Gerador de Briefing','#3FD0C2','As respostas do cliente abrem a calculadora já preenchida.'),('gerador-de-contrato','Gerador de Contrato','#A98BFF','O orçamento vira contrato sem digitar de novo.'),('financas-e-demandas','Base Demandas','#FFB347','O orçamento entra no seu quadro de trabalhos.')],
  fh2='Sua próxima proposta sai em 1 minuto.', selo='Celular e computador'))

# ---------------------------------------------------------------- CONTRATO
PAGINAS.append(dict(
  slug='gerador-de-contrato', nome='Gerador de Contrato', secao='Ferramentas', cor='#A98BFF', cor2='#7556F0', ink='#fff',
  pattern='repeating-linear-gradient(0deg,rgba(169,139,255,.05) 0 1px,transparent 1px 28px)', fxx='72%',
  kick='Ferramenta', desc='Contrato de edição pronto em 2 minutos. O cliente lê e aceita pelo celular, por um link. Também sai em PDF.',
  h1='Combinado bom é <em>combinado por escrito.</em>',
  lead='Gere um <b>termo rápido</b> ou um <b>contrato completo</b>, com prazo, revisões, pagamento e uso das imagens. Você manda um link e o cliente <b>lê e aceita pelo celular</b>. Também sai em PDF.',
  cta='Quero meu contrato', nota='Funciona no <b>celular e no computador</b>',
  rot='Demonstração',
  demo='''<div class="pp">
    <div class="pp-h"><b>CONTRATO DE PRESTAÇÃO DE SERVIÇO</b><small>Edição de vídeo</small></div>
    <div class="pp-c"><div><small>Contratante</small><span id="ca"></span></div><div><small>Valor</small><span id="cv"></span></div></div>
    <div class="pp-cl" id="cl"></div>
    <div class="pp-ass"><svg viewBox="0 0 220 60"><path id="ass" d="M8 40 C 30 10, 40 55, 60 30 S 90 15, 100 38 S 130 52, 145 25 C 155 10, 165 45, 180 32 S 205 28, 212 30" fill="none" stroke="#2b2b52" stroke-width="2.6" stroke-linecap="round"/></svg><small>Assinatura</small></div>
    <div class="pp-pdf" id="pdf">PDF pronto</div>
  </div>
  <div class="env" id="env">📎 Enviar PDF pro cliente</div>''',
  css=r'''
.palco{min-height:480px;background:radial-gradient(500px 300px at 70% 0%,color-mix(in srgb,var(--a) 18%,transparent),transparent),#121216}
.pp{position:absolute;left:50%;top:22px;width:min(86%,400px);transform:translateX(-50%) rotate(-1.5deg);background:#FBF9F4;color:#1d1d24;border-radius:6px;padding:22px 22px 18px;box-shadow:0 30px 60px -20px rgba(0,0,0,.7)}
.pp-h b{display:block;font-family:var(--d);font-size:13px;letter-spacing:.06em}
.pp-h small{color:#7a7886;font-size:11px}
.pp-c{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0;background:#F1EEF9;border-radius:6px;padding:9px 10px}
.pp-c small{display:block;font-size:9.5px;color:#7a7886;text-transform:uppercase;letter-spacing:.06em}
.pp-c span{font-size:13px;font-weight:700;min-height:18px;display:block}
.pp-c span::after{content:"";display:inline-block;width:1px;height:13px;background:#1d1d24;margin-left:1px;animation:pisca 1s steps(1) infinite;vertical-align:-2px}
@keyframes pisca{50%{opacity:0}}
.pp-cl{display:flex;flex-direction:column;gap:7px;min-height:150px}
.cl{display:flex;gap:8px;align-items:flex-start;font-size:11.5px;animation:clin .3s ease both}
@keyframes clin{from{opacity:0;transform:translateX(-6px)}}
.cl i{flex:none;font-style:normal;font-size:10px;font-weight:800;color:var(--a2);width:20px}
.cl b{display:block;font-size:11.5px}
.cl span{display:block;height:5px;border-radius:3px;background:#E3E0EC;margin-top:4px}
.pp-ass{margin-top:10px;border-top:1px solid #e3e0ec;padding-top:6px;width:60%}
.pp-ass svg{width:100%;height:44px}
.pp-ass small{font-size:9.5px;color:#7a7886}
#ass{stroke-dasharray:420;stroke-dashoffset:420}
.pp-pdf{position:absolute;right:-14px;bottom:24px;background:var(--a2);color:#fff;font-weight:800;font-size:12px;padding:7px 12px;border-radius:8px;transform:rotate(8deg) scale(0);transition:transform .35s cubic-bezier(.3,1.6,.5,1)}
.pp-pdf.on{transform:rotate(8deg) scale(1)}
.env{position:absolute;left:50%;bottom:40px;transform:translate(-50%,20px);opacity:0;background:var(--a);color:#fff;font-weight:750;font-size:14px;padding:11px 18px;border-radius:12px;transition:all .35s;white-space:nowrap;box-shadow:0 10px 30px -8px var(--a)}
.env.on{opacity:1;transform:translate(-50%,0)}
''',
  js=r'''
const CL = [['01','Objeto','Edição de 4 vídeos para Reels'],['02','Prazo','Entrega em até 5 dias úteis'],['03','Revisões','2 rodadas de ajustes incluídas'],['04','Pagamento','50% na entrada, 50% na entrega'],['05','Uso das imagens','Redes sociais do contratante']];
async function digita(el, t){ el.textContent = ''; for (const ch of t){ el.textContent += ch; await dorme(45); } }
async function demo(){
  while (true){
    await enquantoVisivel();
    $('#cl').innerHTML = ''; $('#pdf').classList.remove('on'); $('#env').classList.remove('on');
    const a = $('#ass'); a.style.transition = 'none'; a.style.strokeDashoffset = 420;
    $('#ca').textContent = ''; $('#cv').textContent = '';
    await dorme(400); await digita($('#ca'), 'Studio Ana'); await digita($('#cv'), 'R$ 1.350');
    for (const [n, t, d] of CL){ await dorme(380); const e = document.createElement('div'); e.className = 'cl'; e.innerHTML = `<i>${n}</i><div><b>${t}</b><span style="width:${55 + Math.random()*40}%"></span></div>`; e.title = d; $('#cl').appendChild(e); }
    await dorme(400); void a.getBoundingClientRect(); a.style.transition = 'stroke-dashoffset 1.4s ease'; a.style.strokeDashoffset = 0;
    await dorme(1500); $('#pdf').classList.add('on');
    await dorme(500); $('#env').classList.add('on');
    await dorme(3000);
  }
}
demo();
''',
  h2='Menos dor de cabeça, mais cliente sério.',
  bens=[('Aceite por link','O cliente abre o link, lê e aceita com o nome dele. Fica registrado com data e hora, e você vê na hora que foi aceito.'),
        ('Dois formatos','Termo rápido para trabalhos pequenos, ou contrato completo com 8 cláusulas, também em PDF, para os maiores.'),
        ('Pronto em poucos passos','Formato, partes, trabalho, prazo, valor e uso das imagens. Você toca nas opções e vê o contrato se montando na hora.'),
        ('Tudo que costuma dar briga','Prazo, revisões incluídas, forma de pagamento, atraso de material e uso das imagens, em linguagem simples.')],
  inclui=['Aceite por link','Termo rápido','Contrato em PDF','8 cláusulas','Celular e computador'],
  faq=[('O contrato tem validade?','É um modelo de referência claro e organizado para combinar o trabalho por escrito. Para casos específicos, vale consultar um advogado.'), ('Meu cliente vai estranhar receber contrato?','O texto é curto e em linguagem simples, e protege os dois lados: ele também fica com prazo, entrega e número de revisões por escrito. Para trabalhos pequenos, o termo rápido é ainda mais leve.'), ('Posso mudar o que está escrito?','Você escolhe prazo, número de revisões, forma de pagamento, se pode usar o trabalho no portfólio e se entrega os arquivos de projeto. O texto das cláusulas se ajusta a essas escolhas.'), ('O cliente precisa de conta?','Não. Ele abre o link no celular, lê e aceita. Se preferir, você manda o PDF ou o texto pelo WhatsApp.'), FAQ_ACESSO, FAQ_ANO],
  combina=[('quanto-cobrar','Quanto Cobrar?','#7BD88F','Gerou o orçamento? Um toque e ele vira contrato, já preenchido.')],
  fh2='Feche o próximo trabalho no papel.', selo='Celular e computador'))

# ---------------------------------------------------------------- BRIEFING
PAGINAS.append(dict(
  slug='gerador-de-briefing', nome='Gerador de Briefing', secao='Ferramentas', cor='#3FD0C2', cor2='#1C9C93',
  pattern='radial-gradient(circle at 1px 1px,rgba(63,208,194,.12) 1px,transparent 0) 0 0/26px 26px', fxx='30%',
  kick='Ferramenta', desc='Mande um link, o cliente responde em 1 minuto e o pedido chega organizado na sua conta, pronto para virar preço.',
  h1='Pare de perguntar. <em>Mande um link.</em>',
  lead='Mande o seu link. O cliente responde em 1 minuto, <b>só tocando nas opções</b>, e o pedido <b>chega organizado na sua conta</b>, com avisos do que observar antes de passar o preço. Ele ainda te avisa no WhatsApp.',
  cta='Quero o meu link', nota='O cliente <b>não precisa de conta</b><br>nem baixar nada',
  rot='Demonstração',
  demo='''<div class="cel">
    <div class="tela" id="t1"><div class="cab"><span class="av">F</span><b>Fernando Luz</b><small>Briefing rápido · 1 minuto</small></div>
      <div class="prog" id="prog"></div><b class="pq" id="pq">O que você precisa?</b><div id="ops"></div></div>
    <div class="tela zap" id="t2"><div class="zh"><span class="av">A</span><b>Ana Souza</b><small>online</small></div>
      <div class="dig" id="dig"><i></i><i></i><i></i></div>
      <div class="msg" id="msg"><b>Respondi o briefing:</b><br><b>Serviço:</b> Gravação + edição<br><b>Tipo:</b> Reels<br><b>Quantidade:</b> 2 a 4 vídeos<br><b>Prazo:</b> Em até 1 semana<br><span class="lk">Abrir no Base FL</span></div>
      <div class="calc" id="calc">Ver respostas organizadas →</div></div>
  </div>''',
  css=r'''
.palco{min-height:500px;display:grid;place-items:center;background:radial-gradient(420px 300px at 50% 40%,color-mix(in srgb,var(--a) 16%,transparent),transparent),#0f1312}
.cel{position:relative;width:250px;height:440px;border-radius:36px;background:#0b0d0c;border:7px solid #232826;box-shadow:0 30px 80px -20px rgba(0,0,0,.8);overflow:hidden;margin:16px 0 30px}
.cel::before{content:"";position:absolute;top:8px;left:50%;width:70px;height:18px;border-radius:12px;background:#000;transform:translateX(-50%);z-index:5}
.tela{position:absolute;inset:0;padding:38px 14px 14px;transition:transform .5s cubic-bezier(.2,.8,.2,1),opacity .4s}
.cab{display:grid;grid-template-columns:auto 1fr;column-gap:8px;align-items:center;margin-bottom:12px}
.cab .av,.zh .av{grid-row:span 2;width:28px;height:28px;border-radius:8px;background:#F2A541;color:#111;font-weight:900;display:grid;place-items:center;font-size:13px}
.cab b{font-size:12.5px}.cab small{font-size:10px;color:var(--mute)}
.prog{display:flex;gap:3px;margin-bottom:12px}
.prog i{flex:1;height:4px;border-radius:4px;background:#262b29;transition:background .3s}
.prog i.ok{background:var(--a)}
.pq{display:block;font-family:var(--d);font-weight:850;font-size:19px;line-height:1.1;margin-bottom:10px;min-height:42px}
.op{position:relative;background:#151918;border:1px solid #252b29;border-radius:11px;padding:10px 11px 10px 13px;font-size:12px;font-weight:600;margin-bottom:7px;transition:all .2s}
.op::before{content:"";position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:0 3px 3px 0;background:var(--a)}
.op.on{border-color:var(--a);background:#18201e}
.op.on::after{content:"✓";position:absolute;right:10px;top:50%;transform:translateY(-50%);width:18px;height:18px;border-radius:50%;background:var(--a);color:#062;font-size:10px;font-weight:900;display:grid;place-items:center}
.zap{background:#0b141a;transform:translateX(105%)}
.zap.on{transform:none}
#t1.off{transform:translateX(-30%);opacity:.3}
.zh{display:grid;grid-template-columns:auto 1fr;column-gap:8px;align-items:center;padding-bottom:10px;border-bottom:1px solid #1f2c33;margin-bottom:12px}
.zh .av{background:#8a7cff;color:#fff}
.zh b{font-size:12.5px}.zh small{font-size:10px;color:#8aa}
.dig{display:inline-flex;gap:4px;background:#1f2c33;border-radius:12px;padding:9px 11px;opacity:0;transition:opacity .2s}
.dig.on{opacity:1}
.dig i{width:6px;height:6px;border-radius:50%;background:#8aa;animation:dg 1s infinite}
.dig i:nth-child(2){animation-delay:.15s}.dig i:nth-child(3){animation-delay:.3s}
@keyframes dg{50%{transform:translateY(-4px);opacity:.5}}
.msg{background:#1f2c33;border-radius:4px 12px 12px 12px;padding:9px 10px;font-size:11px;line-height:1.5;color:#e9edef;opacity:0;transform:translateY(10px);transition:all .4s;margin-top:-30px}
.msg.on{opacity:1;transform:none}
.msg .lk{color:#53bdeb;text-decoration:underline}
.calc{margin-top:14px;text-align:center;background:var(--a);color:#062;font-weight:800;font-size:12.5px;padding:10px;border-radius:10px;opacity:0;transform:scale(.9);transition:all .35s cubic-bezier(.3,1.6,.5,1)}
.calc.on{opacity:1;transform:none;animation:pul 1.6s ease-in-out infinite .4s}
@keyframes pul{50%{box-shadow:0 0 0 7px color-mix(in srgb,var(--a) 22%,transparent)}}
''',
  js=r'''
const PQ = [['O que você precisa?', ['Só a edição','Gravação + edição','Só a gravação'], 1], ['Que tipo de vídeo?', ['Reels / TikTok','YouTube','Para empresa'], 0], ['Quantos vídeos?', ['1 vídeo','2 a 4 vídeos','5 a 8 vídeos'], 1], ['Para quando?', ['Urgente','Em até 1 semana','Sem pressa'], 1]];
async function demo(){
  while (true){
    await enquantoVisivel();
    $('#t1').classList.remove('off'); $('#t2').classList.remove('on'); ['#dig','#msg','#calc'].forEach(s => $(s).classList.remove('on'));
    $('#prog').innerHTML = PQ.map(() => '<i></i>').join('');
    for (let i = 0; i < PQ.length; i++){
      const [q, ops, k] = PQ[i];
      $('#pq').textContent = q; $('#ops').innerHTML = ops.map(o => `<div class="op">${o}</div>`).join('');
      await dorme(800); document.querySelectorAll('#ops .op')[k].classList.add('on');
      document.querySelectorAll('#prog i')[i].classList.add('ok'); await dorme(500);
    }
    await dorme(300); $('#t1').classList.add('off'); $('#t2').classList.add('on');
    await dorme(600); $('#dig').classList.add('on'); await dorme(1100); $('#dig').classList.remove('on'); $('#msg').classList.add('on');
    await dorme(900); $('#calc').classList.add('on');
    await dorme(3000);
  }
}
demo();
''',
  h2='Chega de “me passa mais detalhes?”',
  bens=[('Seu link pessoal','Com o seu nome. Mande no WhatsApp, coloque na bio ou na resposta automática.'),
        ('Só as perguntas que mudam o preço','Serviço, tipo, quantidade, duração, estilo, prazo e valor em mente. Nada de formulário cansativo.'),
        ('Avisos do que observar','Pedido urgente, pacote de vídeos, cliente que não soube responder, valor em mente: você vê tudo antes de responder.')],
  inclui=['Link com o seu nome','Briefings salvos na sua conta','Aviso no seu WhatsApp','Avisos do que observar','Resumo para copiar','Celular e computador'],
  faq=[('O cliente precisa baixar algo?','Não. Ele abre o link no celular, responde tocando nas opções e envia. Sem conta e sem app.'), ('E se o cliente não gostar de formulário?','São poucas perguntas, todas de tocar, e leva cerca de 1 minuto. No final ele pode escrever o que quiser e mandar um link de referência. Você pode testar como ele vê antes de mandar.'), ('Dá para mudar as perguntas?','As perguntas são fixas: são as que mudam o preço de um trabalho de vídeo. O campo de detalhes, no final, fica livre para o cliente escrever o resto.'), ('Preciso ter outra ferramenta?','Não. O briefing funciona sozinho. Se você também tiver o Quanto Cobrar?, que é vendido separadamente, as respostas abrem o cálculo já preenchido.'), FAQ_ACESSO, FAQ_ANO],
  combina=[('quanto-cobrar','Quanto Cobrar?','#7BD88F','As respostas do cliente abrem o cálculo do preço já preenchido.'),('financas-e-demandas','Base Demandas','#FFB347','O pedido entra direto no seu quadro de trabalhos.')],
  fh2='Receba o próximo pedido já organizado.', selo='Celular e computador'))

# ---------------------------------------------------------------- FINANÇAS E DEMANDAS
PAGINAS.append(dict(
  slug='financas-e-demandas', nome='Base Demandas', secao='Ferramentas', cor='#FFB347', cor2='#FF7A45',
  pattern='linear-gradient(90deg,rgba(255,179,71,.05) 1px,transparent 1px) 0 0/90px 100%', empilha=True, fxx='50%',
  kick='Ferramenta', desc='Seus trabalhos, prazos, pagamentos e custos fixos num só lugar, com meta do mês e comparativo com o mês passado.',
  h1='Saiba o que entregar, <em>e o que já entrou.</em>',
  lead='Um quadro com <b>todos os seus trabalhos</b>, do orçamento ao pagamento. Com <b>meta do mês</b>, o que falta receber e os <b>custos fixos</b> de quem vive de edição.',
  cta='Quero organizar', nota='Funciona no <b>celular e no computador</b>',
  rot='Demonstração',
  demo='''<div class="fd">
    <div class="kp"><div><small>Recebido em outubro</small><b>R$ <span id="rec">0</span></b><em id="cmp">↑ 18% vs setembro</em></div>
      <div class="meta"><small>Meta do mês · R$ 5.000</small><div class="mb"><i id="mb"></i></div></div>
      <div class="br" id="br"><i style="--h:40%"></i><i style="--h:55%"></i><i style="--h:35%"></i><i style="--h:62%"></i><i style="--h:58%"></i><i style="--h:80%" class="at"></i></div></div>
    <div class="kb" id="kb"><div class="col" data-c="0"><h6>Orçamento</h6></div><div class="col" data-c="1"><h6>Editando</h6></div><div class="col" data-c="2"><h6>Entregue</h6></div><div class="col" data-c="3"><h6>Pago</h6></div></div>
  </div>''',
  css=r'''
.palco{min-height:470px;max-width:980px;margin:0 auto;width:100%}
.fd{position:absolute;inset:18px 18px 40px;display:flex;flex-direction:column;gap:12px}
.kp{display:grid;grid-template-columns:1.1fr 1fr .9fr;gap:12px;background:#151715;border:1px solid #262a26;border-radius:14px;padding:14px 16px;align-items:center}
.kp small{display:block;font-size:11px;color:var(--mute)}
.kp b{display:block;font-family:var(--d);font-weight:900;font-size:28px;letter-spacing:-.02em;line-height:1.1}
.kp em{font-style:normal;font-size:11.5px;font-weight:700;color:#7fce8f;opacity:0;transition:opacity .4s}
.kp em.on{opacity:1}
.mb{height:9px;border-radius:9px;background:#262a26;margin-top:8px;overflow:hidden}
.mb i{display:block;height:100%;width:0;border-radius:9px;background:linear-gradient(90deg,var(--a),var(--a2));transition:width 1s cubic-bezier(.2,.8,.2,1)}
.br{display:flex;align-items:flex-end;gap:5px;height:52px}
.br i{flex:1;border-radius:4px 4px 2px 2px;background:#2d322d;height:0;transition:height .8s cubic-bezier(.2,.8,.2,1)}
.br.on i{height:var(--h)}
.br i.at{background:linear-gradient(180deg,var(--a),var(--a2))}
.kb{flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:10px;min-height:0}
.col{background:#121412;border:1px solid #232723;border-radius:12px;padding:10px 8px;display:flex;flex-direction:column;gap:7px}
.col h6{font-size:11px;color:var(--mute);font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin:0 2px 2px}
.cd{position:relative;background:#1a1d1a;border:1px solid #2a2f2a;border-radius:10px;padding:8px 9px 8px 11px;font-size:12px}
.cd::before{content:"";position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:0 3px 3px 0;background:var(--c,#888)}
.cd b{display:block;font-size:12px}
.cd small{color:var(--mute);font-size:10.5px}
.cd.voa{position:absolute;z-index:5;transition:left .7s cubic-bezier(.5,0,.2,1),top .7s cubic-bezier(.5,0,.2,1);box-shadow:0 14px 30px -10px rgba(0,0,0,.8);border-color:var(--a)}
.conf{position:absolute;width:7px;height:12px;border-radius:2px;z-index:6;pointer-events:none;animation:cai 1.4s ease-out forwards}
@keyframes cai{to{transform:translate(var(--x),var(--y)) rotate(540deg);opacity:0}}
@media (max-width:640px){.palco{min-height:640px}.kp{grid-template-columns:1fr 1fr}.br{display:none}.kb{grid-template-columns:repeat(2,1fr);grid-auto-rows:1fr}}
''',
  js=r'''
const CORES = ['#9A968A','#9B7BF7','#5AA9F0','#7fce8f'];
const FIXOS = [[0,'Studio Ana','4 Reels · R$ 600'],[1,'Clínica Viva','Institucional · R$ 1.800'],[2,'João Fit','8 Reels · R$ 1.150'],[3,'Café Grão','YouTube · R$ 900'],[3,'Loja Bela','Anúncio · R$ 700']];
const card = (n, d, c) => `<div class="cd" style="--c:${CORES[c]}"><b>${n}</b><small>${d}</small></div>`;
function conta(el, de, ate, ms){ const t0 = performance.now(); return new Promise(fim => { const f = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(2, -10*k); el.textContent = Math.round(de + (ate - de) * (k >= 1 ? 1 : e)).toLocaleString('pt-BR'); k < 1 ? requestAnimationFrame(f) : fim(); }; requestAnimationFrame(f); }); }
function confete(x, y){ const fd = $('.fd'); for (let i = 0; i < 26; i++){ const c = document.createElement('i'); c.className = 'conf'; c.style.cssText = `left:${x}px;top:${y}px;background:${['#FFB347','#7fce8f','#9B7BF7','#5AA9F0'][i%4]};--x:${(Math.random()-.5)*220}px;--y:${-40 - Math.random()*120}px`; fd.appendChild(c); setTimeout(() => c.remove(), 1500); } }
async function demo(){
  while (true){
    await enquantoVisivel();
    document.querySelectorAll('.col').forEach(c => c.querySelectorAll('.cd').forEach(x => x.remove()));
    FIXOS.forEach(([c, n, d]) => document.querySelector(`.col[data-c="${c}"]`).insertAdjacentHTML('beforeend', card(n, d, c)));
    const cols = [...document.querySelectorAll('.col')];
    cols[0].insertAdjacentHTML('afterbegin', ''); cols[0].querySelector('h6').insertAdjacentHTML('afterend', `<div class="cd" id="mv" style="--c:${CORES[0]}"><b>Marina Costa</b><small>8 Reels · R$ 1.350</small></div>`);
    $('#rec').textContent = '1.600'; $('#mb').style.width = '0'; $('#br').classList.remove('on'); $('#cmp').classList.remove('on');
    await dorme(500); $('#mb').style.width = '32%'; $('#br').classList.add('on');
    for (let k = 1; k <= 3; k++){
      await dorme(900);
      const mv = $('#mv'), fd = $('.fd').getBoundingClientRect(), a = mv.getBoundingClientRect();
      const destino = cols[k], ref = destino.querySelector('h6').getBoundingClientRect();
      const g = mv.cloneNode(true); g.id = ''; g.classList.add('voa'); g.style.left = (a.left - fd.left) + 'px'; g.style.top = (a.top - fd.top) + 'px'; g.style.width = a.width + 'px';
      $('.fd').appendChild(g); mv.style.visibility = 'hidden'; void g.offsetWidth;
      g.style.left = (ref.left - fd.left) + 'px'; g.style.top = (ref.bottom - fd.top + 7) + 'px';
      await dorme(720); g.remove(); mv.remove();
      destino.querySelector('h6').insertAdjacentHTML('afterend', `<div class="cd" id="mv" style="--c:${CORES[k]}"><b>Marina Costa</b><small>8 Reels · R$ 1.350</small></div>`);
      if (k === 3){ const r = $('#mv').getBoundingClientRect(); confete(r.left - fd.left + r.width/2, r.top - fd.top); await conta($('#rec'), 1600, 2950, 1000); $('#mb').style.width = '59%'; $('#cmp').classList.add('on'); }
    }
    await dorme(3200);
  }
}
demo();
''',
  h2='O lado do trabalho que ninguém te ensina.',
  bens=[('Do orçamento ao pago','Arraste cada trabalho pelas colunas e veja na hora o que está atrasado, em revisão ou esperando pagamento.'),
        ('Meta e comparativo','Defina sua meta do mês e compare com o mês passado. Você sabe se está crescendo ou não.'),
        ('Custos fixos','Internet, CapCut, Adobe, armazenamento, trilhas. Anote o que você paga todo mês e veja quanto isso pesa no que entrou.')],
  inclui=['Quadro de trabalhos','Contador de revisões','Mensagens prontas para o cliente','Meta do mês','A receber e previsto','Custos fixos'],
  faq=[('Meus dados ficam salvos?','Sim, na sua conta. Você acessa do celular ou do computador com o mesmo e-mail.'), ('Já uso planilha ou Trello. Por que trocar?','Dá para fazer em planilha, sim. A diferença é que aqui já vem pronto para trabalho de vídeo: colunas do orçamento ao pago, contador de revisões, mensagens para o cliente e os números do mês, sem montar nada.'), ('É difícil de usar no celular?','Não. No celular você move o trabalho de coluna tocando na seta do card, e os números do mês ficam no topo.'), ('Funciona sozinho?','Sim. Você cadastra seus trabalhos direto nele. Se tiver também o Briefing, o Quanto Cobrar? ou o Contrato, vendidos separadamente, os trabalhos entram aqui sozinhos.'), FAQ_ACESSO, FAQ_ANO],
  combina=[('quanto-cobrar','Quanto Cobrar?','#7BD88F','O orçamento entra no quadro com valor e prazo.'),('gerador-de-briefing','Gerador de Briefing','#3FD0C2','O pedido do cliente vira um card com as respostas.')],
  fh2='Feche o mês sabendo exatamente onde está.', selo='Celular e computador'))



QC_MIOLO = r'''
  <section class="dor">
    <div class="dor-g">
      <div>
        <span class="kick rv">A pergunta que trava</span>
        <h2 class="rv" style="margin-top:14px">O cliente pergunta o preço. <em class="ac">E você trava.</em></h2>
        <p class="sub2 rv">Você digita um valor, apaga, digita outro. Não é falta de talento: é que ninguém te mostrou a conta.</p>
        <ul class="dor-l rv">
          <li><b>Chuta baixo</b> e passa o mês trabalhando por menos do que vale.</li>
          <li><b>Chuta alto</b>, não sabe explicar de onde veio, e o cliente some.</li>
          <li><b>Demora pra responder</b> e ele fecha com quem respondeu primeiro.</li>
        </ul>
      </div>
      <div class="zap rv" aria-label="Conversa de exemplo no WhatsApp">
        <div class="zap-t"><i>C</i><span><b>Cliente</b><small>online</small></span></div>
        <div class="zap-c">
          <div class="bl in">Oi! Vi seus vídeos, gostei muito 👏</div>
          <div class="bl in">Quanto fica pra editar 8 Reels por mês?</div>
        </div>
        <div class="zap-d"><span id="zapTxt"></span><i class="zap-cur"></i></div>
      </div>
    </div>
  </section>

  __TESTE__

  <section class="conta-s">
    <span class="kick rv">De onde sai o número</span>
    <h2 class="rv" style="margin-top:14px">O preço sai do seu tempo de trabalho. <em class="ac">E você vê a conta.</em></h2>
    <p class="sub2 rv">Nada de tabela de internet. A calculadora estima as horas do trabalho e multiplica pelo valor da sua hora. Olha o mesmo pedido do cliente ali de cima:</p>
    <div class="cx-g"><div class="cx rv">
      <div class="cx-n" role="group" aria-label="Seu nível">
        <button type="button" data-n="comeco">Começando<small>R$ 40 por hora</small></button>
        <button type="button" data-n="medio" class="on">1 a 3 anos<small>R$ 70 por hora</small></button>
        <button type="button" data-n="pro">3+ anos<small>R$ 120 por hora</small></button>
      </div>
      <div class="cx-l"><span>Trabalho</span><b>8 Reels, edição caprichada</b></div>
      <div class="cx-l"><span>Tempo estimado por vídeo</span><b>2h42</b></div>
      <div class="cx-l"><span>Valor da sua hora</span><b>R$ <i id="cxH">70</i></b></div>
      <div class="cx-l"><span>Cada vídeo, sozinho</span><b>R$ <i id="cxU">189</i></b></div>
      <div class="cx-l"><span>Pacote de 8 vídeos</span><b>10% de desconto</b></div>
      <div class="cx-t"><span>Valor de referência</span><b>R$ <i id="cxR">1.350</i></b></div>
      <p class="cx-f">Faixa justa para negociar: <b>R$ <i id="cxMn">1.150</i> a R$ <i id="cxMx">1.700</i></b></p>
    </div>
    <div class="cx-o rv">
      <p><b>Seu nível muda, o preço acompanha.</b> Toque nos níveis ali em cima e veja.</p>
      <p><b>Pacotes de 4, 8, 12 ou 20 vídeos</b> já saem com o desconto calculado: 5%, 10%, 12% ou 15%.</p>
      <p><b>Urgente, em até 48 horas?</b> O valor sobe 40%.</p>
      <p><b>Gravação também entra:</b> horas de captação, estrutura e custos extras, como transporte.</p>
      <p class="cx-m">É uma referência para você decidir com segurança. O valor final é sempre seu: dá para ajustar antes de mandar.</p>
    </div></div>
  </section>

  <section class="prop">
    <div class="prop-g">
      <div class="fone rv" id="fone" aria-label="Exemplo da proposta que o cliente recebe">
        <div class="fone-t"><i>A</i><span><b>Ana Editora</b><small>Proposta de serviço</small></span></div>
        <div class="fone-c">
          <small class="pk">PROPOSTA</small><b class="pt">Para Studio Zeta</b>
          <div class="pl"><span>Serviço</span>Edição caprichada de Reels</div>
          <div class="pl"><span>O que você recebe</span>8 vídeos editados (até 1 min)</div>
          <div class="pl"><span>Prazo</span>Em até 5 dias úteis após receber o material</div>
          <div class="pl"><span>Revisões</span>2 rodadas de ajustes incluídas</div>
          <div class="pl"><span>Pagamento</span>50% na aprovação e 50% na entrega</div>
          <div class="pv"><span>Investimento</span><b>R$ 1.350</b></div>
        </div>
        <div class="fone-b" id="foneB"><span class="a">Aprovar proposta</span><span class="b">✓ Proposta aprovada</span></div>
      </div>
      <div>
        <span class="kick rv">O que o cliente recebe</span>
        <h2 class="rv" style="margin-top:14px">Ele não vê a sua conta. <em class="ac">Vê uma proposta.</em></h2>
        <p class="sub2 rv">Calculou, tocou em “Gerar o link da proposta”, mandou. Em vez de um número solto no WhatsApp, o cliente abre isto:</p>
        <ul class="prop-l rv">
          <li>Serviço, entrega, prazo, revisões, pagamento e valor, numa página só.</li>
          <li>Abre no celular dele, sem conta e sem baixar nada.</li>
          <li>Ele aprova com um toque, ou pede um ajuste. A resposta aparece na sua conta.</li>
          <li>As suas horas e o valor da sua hora <b>ficam só com você</b>.</li>
          <li>Prefere mandar texto? O orçamento também sai pronto pra colar no WhatsApp.</li>
        </ul>
      </div>
    </div>
  </section>
'''
QC_CSS = r'''
.dor-g,.prop-g{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center}
.prop-g{grid-template-columns:.8fr 1.2fr}
.dor-l,.prop-l{list-style:none;margin:22px 0 0;padding:0;display:grid;gap:12px;max-width:520px}
.dor-l li,.prop-l li{position:relative;padding-left:26px;color:var(--mute);font-size:16px}
.dor-l li b,.prop-l li b{color:var(--ink)}
.dor-l li::before{content:"";position:absolute;left:0;top:.55em;width:12px;height:2px;border-radius:2px;background:#ff8f7a}
.prop-l li::before{content:"✓";position:absolute;left:0;top:0;color:var(--a);font-weight:900}
.zap{max-width:400px;width:100%;margin-left:auto;border:1px solid var(--line);border-radius:22px;overflow:hidden;background:#0b141a}
.zap-t{display:flex;align-items:center;gap:10px;padding:12px 14px;background:#111b21;border-bottom:1px solid #1f2c33}
.zap-t i,.fone-t i{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:800;background:#2a3942;color:#e9edef}
.zap-t b,.fone-t b{display:block;font-size:14.5px}.zap-t small,.fone-t small{display:block;color:#8696a0;font-size:12px}
.zap-c{padding:16px 14px 6px;display:flex;flex-direction:column;gap:6px;min-height:150px}
.bl{max-width:82%;padding:8px 11px;border-radius:10px;font-size:14.5px;line-height:1.4;color:#e9edef}
.bl.in{background:#202c33;border-top-left-radius:2px;align-self:flex-start}
.zap-d{margin:10px 12px 14px;min-height:44px;display:flex;align-items:center;gap:2px;padding:10px 14px;border-radius:22px;background:#2a3942;font-size:15px;color:#e9edef}
.zap-cur{width:2px;height:18px;background:var(--a);animation:pisca .9s steps(1) infinite}
@keyframes pisca{50%{opacity:0}}
.cx-g{display:grid;grid-template-columns:1.15fr .85fr;gap:40px;align-items:center;margin-top:26px}
@media (max-width:900px){.cx-g{grid-template-columns:1fr;gap:22px}}
.cx{max-width:620px;border:1px solid var(--line);border-radius:22px;background:var(--card);padding:18px}
.cx-n{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}
.cx-n button{font:inherit;font-weight:700;font-size:14px;color:var(--mute);background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:10px 6px;cursor:pointer;transition:border-color .2s,color .2s,background .2s}
.cx-n button small{display:block;font-weight:500;font-size:12px;margin-top:2px}
.cx-n button.on{border-color:var(--a);color:var(--ink);background:color-mix(in srgb,var(--a) 12%,var(--bg2))}
.cx-l,.cx-t{display:flex;justify-content:space-between;align-items:baseline;gap:14px;padding:11px 4px;border-bottom:1px solid var(--line);font-size:15px}
.cx-l span,.cx-t span{color:var(--mute)}.cx i{font-style:normal;font-variant-numeric:tabular-nums}
.cx-t{border-bottom:0;padding-top:16px}.cx-t b{font-family:var(--d);font-weight:900;font-size:36px;letter-spacing:-.03em;line-height:1;color:var(--a)}
.cx-f{color:var(--mute);font-size:14px;text-align:right;padding:0 4px}.cx-f b{color:var(--ink)}
.cx-o{max-width:620px;display:grid;gap:10px;color:var(--mute);font-size:15.5px}.cx-o b{color:var(--ink)}
.cx-m{margin-top:6px;padding-top:14px;border-top:1px solid var(--line);font-size:14.5px}
.fone{max-width:330px;width:100%;border:1px solid var(--line);border-radius:30px;background:#0B0C0C;padding:16px 14px 18px;box-shadow:0 40px 90px -40px #000}
.fone-t{display:flex;align-items:center;gap:10px;margin-bottom:12px}.fone-t i{border-radius:11px;background:#F2A541;color:#141414}
.fone-c{background:#FAF7F0;color:#1b1a17;border-radius:16px;padding:16px 16px 14px}
.pk{font-weight:800;font-size:11px;letter-spacing:.1em;color:#a67a2a}.pt{display:block;font-family:var(--d);font-size:21px;font-weight:850;letter-spacing:-.02em;margin:2px 0 8px}
.pl{border-top:1px solid #e6e0d2;padding:8px 0;font-size:13.5px;line-height:1.35}.pl span{display:block;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6b665a}
.pv{border-top:1px solid #e6e0d2;padding-top:10px;display:flex;justify-content:space-between;align-items:baseline}.pv span{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6b665a}.pv b{font-family:var(--d);font-weight:900;font-size:28px;letter-spacing:-.03em}
.fone-b{position:relative;margin-top:12px;height:50px;border-radius:14px;background:#F2A541;color:#141414;font-weight:800;font-size:15.5px;overflow:hidden;transition:background .4s}
.fone-b span{position:absolute;inset:0;display:grid;place-items:center;transition:opacity .35s,transform .35s}
.fone-b .b{opacity:0;transform:translateY(10px)}
.fone-b.ok{background:var(--a)}.fone-b.ok .a{opacity:0;transform:translateY(-10px)}.fone-b.ok .b{opacity:1;transform:none}
@media (max-width:900px){.dor-g,.prop-g{grid-template-columns:1fr;gap:28px}.zap{margin:0 auto}.fone{margin:0 auto;order:2}}
'''
QC_JS = r'''
// conversa: o editor digita um valor, apaga, digita outro (enquanto a seção está visível)
(function(){
  const el = $('#zapTxt'); if (!el) return;
  const frases = ['R$ 400', 'R$ 800?', 'acho que uns 600...', 'deixa eu ver e já te falo'];
  let vis = false; new IntersectionObserver(e => { vis = e[0].isIntersecting; }, { threshold: .3 }).observe(el.parentNode);
  if (calmo) { el.textContent = frases[3]; return; }
  (async () => { while (true){ for (const f of frases){
    while (!vis) await dorme(300);
    for (let i = 1; i <= f.length; i++){ el.textContent = f.slice(0, i); await dorme(70); }
    await dorme(f === frases[3] ? 2600 : 900);
    for (let i = f.length; i >= 0; i--){ el.textContent = f.slice(0, i); await dorme(28); }
    await dorme(350);
  } } })();
})();
// a conta do exemplo: os números vêm das mesmas regras da calculadora
(function(){
  const N = {"comeco": {"h": 40, "um": 108, "ref": 780, "mn": 660, "mx": 980}, "medio": {"h": 70, "um": 189, "ref": 1350, "mn": 1150, "mx": 1700}, "pro": {"h": 120, "um": 324, "ref": 2350, "mn": 2000, "mx": 2950}}, f = v => v.toLocaleString('pt-BR');
  document.querySelectorAll('.cx-n button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.cx-n button').forEach(x => x.classList.toggle('on', x === b));
    const n = N[b.dataset.n]; $('#cxH').textContent = n.h; $('#cxU').textContent = f(n.um); $('#cxR').textContent = f(n.ref); $('#cxMn').textContent = f(n.mn); $('#cxMx').textContent = f(n.mx);
  }));
})();
// a proposta: o botão vira "aprovada" quando aparece na tela (e repete)
(function(){
  const b = $('#foneB'); if (!b) return;
  let vis = false; new IntersectionObserver(e => { vis = e[0].isIntersecting; }, { threshold: .6 }).observe(b);
  if (calmo) return;
  (async () => { while (true){ while (!vis) await dorme(300); await dorme(2200); b.classList.add('ok'); await dorme(3200); b.classList.remove('ok'); await dorme(600); } })();
})();
'''

GC_MIOLO = r'''
  <section class="briga">
    <span class="kick rv">Onde o combinado quebra</span>
    <h2 class="rv" style="margin-top:14px">Toda dor de cabeça com cliente <em class="ac">começa com uma mensagem assim.</em></h2>
    <p class="sub2 rv">Toque em uma e veja o trecho do contrato que já responde por você.</p>
    <div class="bg rv" id="briga">
      <div class="bg-m" role="tablist" aria-label="Mensagens do cliente">
        <button role="tab" aria-selected="true" data-i="0">“Só mais um ajustezinho, é rapidinho 🙏”<small>a quinta alteração</small></button>
        <button role="tab" aria-selected="false" data-i="1">“Te pago semana que vem. Já pode mandar o vídeo?”<small>o pagamento que escorrega</small></button>
        <button role="tab" aria-selected="false" data-i="2">“Ainda não te mandei os vídeos, mas o prazo continua sexta, né?”<small>o material que não chega</small></button>
        <button role="tab" aria-selected="false" data-i="3">“Me manda o projeto aberto também?”<small>o que não foi combinado</small></button>
        <button role="tab" aria-selected="false" data-i="4">“Desisti do projeto. Você devolve o sinal?”<small>o cancelamento no meio</small></button>
      </div>
      <div class="bg-c" role="tabpanel" aria-live="polite">
        <small class="bg-k">No seu contrato</small>
        <b id="bgT"></b>
        <p id="bgP"></p>
        <span class="bg-r" id="bgR"></span>
      </div>
    </div>
    <p class="bg-n rv">Os trechos acima são do contrato completo que a ferramenta gera. É um modelo de referência, em linguagem simples; para casos específicos, vale consultar um advogado.</p>
  </section>

  <section class="aceite">
    <div class="ac-g">
      <div>
        <span class="kick rv">Como o cliente aceita</span>
        <h2 class="rv" style="margin-top:14px">Ele não imprime nada. <em class="ac">Lê e aceita pelo celular.</em></h2>
        <p class="sub2 rv">Você manda um link. O cliente abre, lê o contrato inteiro e confirma com o nome dele.</p>
        <ul class="ac-l rv">
          <li>Sem conta, sem aplicativo, sem cartório.</li>
          <li>O aceite fica registrado com o <b>nome, a data e a hora</b>.</li>
          <li>Você vê na sua conta quando ele aceitou.</li>
          <li>Ele pode salvar o contrato em PDF ou tirar uma dúvida com você antes.</li>
          <li>Prefere do jeito antigo? O contrato também sai em <b>PDF</b>, com espaço para assinatura.</li>
        </ul>
      </div>
      <div class="fone rv" id="foneC" aria-label="Exemplo da tela em que o cliente aceita o contrato">
        <div class="fone-t"><i>A</i><span><b>Ana Editora</b><small>Contrato</small></span></div>
        <div class="fone-c">
          <b class="pt">Contrato de prestação de serviços de edição de vídeo</b>
          <div class="rs"><span>Serviço</span>Edição caprichada de Reels<span>Entrega</span>8 vídeos editados (até 1 min)<span>Revisões</span>2 rodadas de ajustes<span>Valor total</span>R$ 1.350</div>
          <p class="clx"><b>4. Revisões</b> Estão incluídas 2 rodadas de ajustes. Cada rodada reúne todos os pedidos de alteração de uma só vez…</p>
        </div>
        <div class="ace">
          <div class="cp"><small>Seu nome completo</small><span id="aceN"></span></div>
          <div class="ck" id="aceK"><i></i>Li o contrato acima e estou de acordo com tudo.</div>
          <div class="fone-b" id="aceB"><span class="a">Aceitar contrato</span><span class="b">✓ Aceito em 2 de outubro, 13:59</span></div>
        </div>
      </div>
    </div>
  </section>

  <section class="fmt">
    <span class="kick rv">Dois formatos</span>
    <h2 class="rv" style="margin-top:14px">Trabalho pequeno ou cliente grande. <em class="ac">Tem um para cada.</em></h2>
    <div class="fm rv">
      <div class="fm-c">
        <small>Para o trabalho rápido</small><b>Termo rápido</b>
        <p>Um acordo curto, direto ao ponto: serviço, entrega, prazo, revisões, pagamento, uso do vídeo e cancelamento.</p>
        <ul><li>Fica pronto em poucos toques</li><li>Vai por link ou como texto no WhatsApp</li><li>Bom para 1 vídeo, um freela de fim de semana</li></ul>
      </div>
      <div class="fm-c dest">
        <small>Para o trabalho maior</small><b>Contrato completo</b>
        <p>Documento com 8 cláusulas: o que será feito, entrega, prazo, revisões, valor e pagamento, responsabilidades, uso do vídeo, cancelamento e foro.</p>
        <ul><li>Vai por link, com aceite registrado</li><li>Também sai em PDF, com assinaturas</li><li>Bom para pacote mensal, empresa, valor alto</li></ul>
      </div>
    </div>
    <p class="fm-n rv">Nos dois, você só toca nas opções e preenche nome, prazo e valor. Se o trabalho veio do Quanto Cobrar?, já chega preenchido.</p>
  </section>
'''
GC_CSS = r'''
.bg{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:26px;align-items:stretch}
.bg-m{display:grid;gap:8px}
.bg-m button{font:inherit;text-align:left;font-weight:650;font-size:15.5px;line-height:1.35;color:var(--mute);background:#111b21;border:1px solid var(--line);border-radius:4px 16px 16px 16px;padding:12px 14px;cursor:pointer;transition:border-color .2s,color .2s,transform .2s}
.bg-m button small{display:block;margin-top:3px;font-weight:500;font-size:12px;color:var(--dim)}
.bg-m button[aria-selected=true]{border-color:var(--a);color:var(--ink);transform:translateX(4px)}
.bg-c{position:relative;background:#FAF7F0;color:#1b1a17;border-radius:20px;padding:26px 24px 22px;display:flex;flex-direction:column;box-shadow:0 30px 70px -40px #000}
.bg-k{font-weight:800;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#7556F0}
.bg-c b{font-family:var(--d);font-weight:850;font-size:22px;letter-spacing:-.02em;margin:6px 0 10px}
.bg-c p{font-family:Georgia,"Times New Roman",serif;font-size:16.5px;line-height:1.6;color:#2a2823;flex:1}
.bg-c p mark{background:#e9e2ff;color:inherit;padding:1px 3px;border-radius:4px}
.bg-r{margin-top:16px;padding-top:14px;border-top:1px solid #e6e0d2;font-size:14.5px;font-weight:650;color:#3b3930}
.bg-c.troca b,.bg-c.troca p,.bg-c.troca .bg-r{animation:bgin .35s cubic-bezier(.2,.8,.2,1) both}
@keyframes bgin{from{opacity:0;transform:translateY(8px)}}
.bg-n{margin-top:16px;color:var(--dim);font-size:13.5px;max-width:70ch}
.ac-g{display:grid;grid-template-columns:1.2fr .8fr;gap:48px;align-items:center}
.ac-l{list-style:none;margin:22px 0 0;padding:0;display:grid;gap:12px;max-width:520px}
.ac-l li{position:relative;padding-left:26px;color:var(--mute);font-size:16px}.ac-l li b{color:var(--ink)}
.ac-l li::before{content:"✓";position:absolute;left:0;top:0;color:var(--a);font-weight:900}
.fone{max-width:330px;width:100%;margin-left:auto;border:1px solid var(--line);border-radius:30px;background:#0B0C0C;padding:16px 14px 18px;box-shadow:0 40px 90px -40px #000}
.fone-t{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.fone-t i{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;font-style:normal;font-weight:800;background:#F2A541;color:#141414}
.fone-t b{display:block;font-size:14.5px}.fone-t small{display:block;color:#8696a0;font-size:12px}
.fone-c{background:#FAF7F0;color:#1b1a17;border-radius:16px;padding:16px 16px 12px}
.pt{display:block;font-family:var(--d);font-size:15.5px;font-weight:850;letter-spacing:-.01em;text-align:center;line-height:1.2}
.rs{margin-top:12px;background:#efe9db;border-radius:10px;padding:10px 12px;font-size:13px;line-height:1.3}
.rs span{display:block;margin-top:7px;font-size:9.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6b665a}.rs span:first-child{margin-top:0}
.clx{margin-top:10px;font-family:Georgia,serif;font-size:12.5px;line-height:1.5;color:#2a2823}.clx b{font-family:var(--f);display:block;font-size:12.5px}
.ace{margin-top:12px;border:1px solid var(--line);border-radius:16px;padding:12px;background:#121413}
.cp small{display:block;font-size:11.5px;font-weight:700;color:var(--mute);margin-bottom:5px}
.cp span{display:block;min-height:38px;border:1px solid var(--line);border-radius:10px;padding:8px 11px;font-size:14.5px;background:#0D0F0E}
.ck{display:flex;gap:9px;align-items:flex-start;margin:10px 0;font-size:12.5px;color:var(--mute);line-height:1.35}
.ck i{flex:none;width:18px;height:18px;border-radius:5px;border:1.5px solid #4a504c;display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:900;color:#141414;transition:background .2s,border-color .2s}
.ck.on i{background:#F2A541;border-color:#F2A541}.ck.on i::before{content:"✓"}
.fone-b{position:relative;height:48px;border-radius:13px;background:#F2A541;color:#141414;font-weight:800;font-size:14.5px;overflow:hidden;transition:background .4s}
.fone-b span{position:absolute;inset:0;display:grid;place-items:center;transition:opacity .35s,transform .35s}
.fone-b .b{opacity:0;transform:translateY(10px);font-size:13.5px}
.fone-b.ok{background:var(--a);color:#fff}.fone-b.ok .a{opacity:0;transform:translateY(-10px)}.fone-b.ok .b{opacity:1;transform:none}
.fm{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:26px}
.fm-c{border:1px solid var(--line);border-radius:22px;background:var(--card);padding:24px 22px}
.fm-c.dest{border-color:color-mix(in srgb,var(--a) 55%,transparent);background:linear-gradient(180deg,color-mix(in srgb,var(--a) 9%,var(--card)),var(--card))}
.fm-c small{font-weight:800;font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--a)}
.fm-c>b{display:block;font-family:var(--d);font-weight:850;font-size:24px;letter-spacing:-.02em;margin:6px 0 8px}
.fm-c p{color:var(--mute);font-size:15px}
.fm-c ul{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:8px;font-size:14.5px}
.fm-c li{position:relative;padding-left:22px}.fm-c li::before{content:"✓";position:absolute;left:0;color:var(--a);font-weight:900}
.fm-n{margin-top:16px;color:var(--mute);font-size:15px;max-width:70ch}
@media (max-width:900px){.bg,.ac-g,.fm{grid-template-columns:1fr}.ac-g{gap:28px}.fone{margin:0 auto}.bg-m button[aria-selected=true]{transform:none}
  /* celular: as mensagens viram uma fileira de arrastar, e o trecho do contrato fica logo abaixo, sempre à vista */
  .bg{gap:12px}.bg-m{grid-auto-flow:column;grid-auto-columns:76%;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -20px;padding:2px 20px 6px;scrollbar-width:none}.bg-m::-webkit-scrollbar{display:none}.bg-m button{scroll-snap-align:center}.bg-c{min-height:300px}}
'''
GC_JS = r'''
// mensagem do cliente -> trecho real do contrato completo (mesmo texto que a ferramenta gera)
(function(){
  const C = [
    ['4. Revisões', 'Estão incluídas 2 rodadas de ajustes. Cada rodada reúne todos os pedidos de alteração de uma só vez. <mark>Ajustes além disso, ou mudanças no que foi combinado aqui, serão orçados à parte.</mark>', 'Você responde sem briga: “claro, te passo o valor desse ajuste extra”.'],
    ['5. Valor e pagamento', 'O valor total é R$ 1.350, pago 50% na aprovação e 50% na entrega final. <mark>Os arquivos finais em alta qualidade são liberados após o pagamento combinado.</mark>', 'O vídeo final sai quando o pagamento entra. Está escrito.'],
    ['3. Prazo', 'Prazo de entrega: em até 5 dias úteis. <mark>O prazo começa a contar quando o CONTRATANTE envia todo o material</mark> e as informações necessárias. Atrasos no envio do material adiam a entrega na mesma proporção.', 'O atraso dele não vira madrugada sua.'],
    ['7. Uso do vídeo', 'Após o pagamento, o CONTRATANTE pode usar o vídeo final livremente em seus canais e campanhas. <mark>Os arquivos de projeto e o material bruto não fazem parte da entrega, salvo combinação por escrito.</mark>', 'Quer o projeto aberto? É outro combinado, com outro valor.'],
    ['8. Cancelamento e foro', '<mark>Se o CONTRATANTE cancelar depois que o trabalho começou, o valor já pago cobre o que foi feito até ali e não é devolvido.</mark> Se o CONTRATADO não puder concluir, devolve o valor proporcional ao que não foi entregue.', 'O que você já trabalhou está pago. Para os dois lados fica justo.'],
  ];
  const cx = document.querySelector('.bg-c'), bs = [...document.querySelectorAll('.bg-m button')]; if (!cx) return;
  let mexeu = false, vis = false, at = 0;
  function mostra(i){ at = i; bs.forEach((b, k) => b.setAttribute('aria-selected', k === i ? 'true' : 'false')); $('#bgT').textContent = C[i][0]; $('#bgP').innerHTML = C[i][1]; $('#bgR').textContent = C[i][2]; cx.classList.remove('troca'); void cx.offsetWidth; cx.classList.add('troca'); }
  bs.forEach((b, i) => b.addEventListener('click', () => { mexeu = true; mostra(i); }));
  const rolo = document.querySelector('.bg-m');
  mostra(0);
  new IntersectionObserver(e => { vis = e[0].isIntersecting; }, { threshold: .3 }).observe(cx);
  if (!calmo) (async () => { while (!mexeu){ await dorme(4200); if (vis && !mexeu){ mostra((at + 1) % C.length); if (rolo.scrollWidth > rolo.clientWidth + 4) rolo.scrollTo({ left: bs[at].offsetLeft - 20, behavior: 'smooth' }); } } })();
})();
// o aceite: o cliente escreve o nome, marca e aceita (repete enquanto está visível)
(function(){
  const b = $('#aceB'); if (!b) return; const n = $('#aceN'), k = $('#aceK'), nome = 'Marina Souza';
  if (calmo) { n.textContent = nome; k.classList.add('on'); b.classList.add('ok'); return; }
  let vis = false; new IntersectionObserver(e => { vis = e[0].isIntersecting; }, { threshold: .5 }).observe(b);
  (async () => { while (true){
    while (!vis) await dorme(300);
    n.textContent = ''; k.classList.remove('on'); b.classList.remove('ok'); await dorme(900);
    for (let i = 1; i <= nome.length; i++){ n.textContent = nome.slice(0, i); await dorme(75); }
    await dorme(500); k.classList.add('on'); await dorme(700); b.classList.add('ok'); await dorme(3800);
  } })();
})();
'''

BR_MIOLO = r'''
  <section class="vai">
    <span class="kick rv">Antes de qualquer orçamento</span>
    <h2 class="rv" style="margin-top:14px">Nove mensagens depois, <em class="ac">você ainda não sabe o prazo.</em></h2>
    <p class="sub2 rv">O cliente chega com “quero uns vídeos” e você vira entrevistador. Com o link, a conversa encurta para duas mensagens.</p>
    <div class="vv rv">
      <div class="zp" aria-label="Conversa sem o link de briefing">
        <div class="zp-h"><b>Sem o link</b><span>9 mensagens</span></div>
        <div class="zp-c">
          <div class="bl in">Oi, quero uns vídeos pro meu Instagram</div>
          <div class="bl eu">Oi! Claro. Quantos vídeos seriam?</div>
          <div class="bl in">Não sei ainda, uns 4?</div>
          <div class="bl eu">Você já tem o material gravado?</div>
          <div class="bl in">Tenho alguns</div>
          <div class="bl eu">De quanto tempo cada um, mais ou menos?</div>
          <div class="bl in">Curtinho</div>
          <div class="bl eu">E pra quando você precisa?</div>
          <div class="bl in vis">visto por último ontem às 22:14</div>
        </div>
      </div>
      <div class="zp com" aria-label="Conversa com o link de briefing">
        <div class="zp-h"><b>Com o link</b><span>2 mensagens</span></div>
        <div class="zp-c">
          <div class="bl in">Oi, quero uns vídeos pro meu Instagram</div>
          <div class="bl eu">Oi! Me conta o que você precisa por aqui, leva 1 minuto 👇<i>basefl.com/b/…</i></div>
          <div class="bl in ok">✅ Respondi o seu briefing!</div>
          <p class="zp-n">O pedido já está na sua conta, organizado.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="io">
    <span class="kick rv">O que entra, o que chega</span>
    <h2 class="rv" style="margin-top:14px">Ele toca nas opções. <em class="ac">Você recebe o pedido pronto.</em></h2>
    <div class="io-g">
      <div class="fone rv" aria-label="Exemplo do que o cliente vê">
        <small class="fn-r">O que o cliente vê</small>
        <div class="fone-t"><i>A</i><span><b>Ana Editora</b><small>Pedido de orçamento</small></span></div>
        <b class="q">Como você imagina a edição?</b>
        <div class="op2">Simples e direta<small>Cortes, limpeza e legenda</small></div>
        <div class="op2">Dinâmica<small>Ritmo rápido, zooms, efeitos sonoros e imagens de apoio</small></div>
        <div class="op2">Nível cinema<small>Animações, motion e cor de filme</small></div>
        <div class="op2 on">Não sei, quero uma sugestão</div>
        <p class="fn-n">Sem conta, sem baixar nada. Só as perguntas que mudam o preço: serviço, tipo, quantidade, duração, estilo, prazo e valor em mente.</p>
      </div>
      <div class="seta-io" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></div>
      <div class="rec rv" aria-label="Exemplo do que chega para o editor">
        <small class="fn-r">O que chega para você</small>
        <b class="rc-t">Clínica Sorriso Feliz</b>
        <div class="rc-l"><span>Serviço</span>Gravação + edição</div>
        <div class="rc-l"><span>Tipo de vídeo</span>Para empresa ou anúncio</div>
        <div class="rc-l"><span>Quantidade</span>5 a 8 vídeos</div>
        <div class="rc-l"><span>Estilo de edição</span>Não sei, quero uma sugestão</div>
        <div class="rc-l"><span>Prazo</span>Em até 1 semana</div>
        <div class="rc-l"><span>Valor em mente</span>R$ 800 a R$ 2.000</div>
        <div class="rc-l"><span>Referência</span>instagram.com/reel/…</div>
      </div>
    </div>
  </section>

  <section class="obs">
    <span class="kick rv">Não é só um formulário</span>
    <h2 class="rv" style="margin-top:14px">Ele te avisa <em class="ac">o que observar antes de passar o preço.</em></h2>
    <p class="sub2 rv">Junto com as respostas, o briefing aponta o que merece atenção naquele pedido. Estes são os avisos do exemplo acima:</p>
    <ul class="ob rv">
      <li><i>📦</i><span><b>5 a 8 vídeos.</b> Dá para oferecer pacote com desconto por volume.</span></li>
      <li><i>💭</i><span><b>Não soube dizer o estilo de edição.</b> Pergunte antes de fechar ou mande duas opções de preço.</span></li>
      <li><i>🔗</i><span><b>Mandou referência.</b> Abra o link para medir o nível da edição antes de calcular.</span></li>
      <li><i>💰</i><span><b>Valor em mente: R$ 800 a R$ 2.000.</b> Calcule o seu preço e compare. Se ficar acima, ofereça uma versão mais simples em vez de baixar o valor.</span></li>
    </ul>
  </section>

  <section class="onde">
    <span class="kick rv">Um link, para sempre</span>
    <h2 class="rv" style="margin-top:14px">Você cria uma vez <em class="ac">e usa em todo lugar.</em></h2>
    <div class="od rv">
      <div><b>No WhatsApp</b><p>Chegou cliente novo? Em vez de dez perguntas, você manda o link.</p></div>
      <div><b>Na bio do Instagram</b><p>Quem quer orçamento já chega com o pedido respondido.</p></div>
      <div><b>Na resposta automática</b><p>O cliente responde enquanto você está editando.</p></div>
    </div>
    <p class="od-n rv">Cada resposta fica salva na sua conta, na lista de briefings recebidos, e o cliente ainda te avisa no WhatsApp que respondeu.</p>
  </section>
'''
BR_CSS = r'''
.vv{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:26px;align-items:start}
.zp{border:1px solid var(--line);border-radius:22px;overflow:hidden;background:#0b141a}
.zp.com{border-color:color-mix(in srgb,var(--a) 55%,transparent)}
.zp-h{display:flex;justify-content:space-between;align-items:baseline;padding:12px 16px;background:#111b21;border-bottom:1px solid #1f2c33}
.zp-h b{font-family:var(--d);font-weight:800;font-size:16px}.zp-h span{font-size:12.5px;font-weight:700;color:var(--mute)}
.zp.com .zp-h span{color:var(--a)}
.zp-c{padding:14px 12px;display:flex;flex-direction:column;gap:6px}
.bl{max-width:84%;padding:8px 11px;border-radius:10px;font-size:14.5px;line-height:1.4;color:#e9edef}
.bl.in{background:#202c33;border-top-left-radius:2px;align-self:flex-start}
.bl.eu{background:#005c4b;border-top-right-radius:2px;align-self:flex-end}
.bl i{display:block;font-style:normal;color:#7ad8cc;text-decoration:underline;margin-top:2px}
.bl.vis{background:none;color:#8696a0;font-size:12px;padding:6px 2px 0}
.bl.ok{background:color-mix(in srgb,var(--a) 22%,#202c33);border:1px solid color-mix(in srgb,var(--a) 50%,transparent)}
.zp-n{margin-top:10px;font-size:14px;color:var(--mute)}
.io-g{display:grid;grid-template-columns:1fr auto 1fr;gap:22px;align-items:center;margin-top:28px}
.fone,.rec{position:relative;width:100%;max-width:360px;border:1px solid var(--line);border-radius:26px;background:#0D0F0E;padding:34px 16px 18px;box-shadow:0 40px 90px -40px #000}
.fone{margin-left:auto}.rec{border-color:color-mix(in srgb,var(--a) 45%,transparent);background:var(--card)}
.fn-r{position:absolute;top:12px;left:16px;font-weight:800;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim)}
.rec .fn-r{color:var(--a)}
.fone-t{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.fone-t i{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;font-style:normal;font-weight:800;background:#F2A541;color:#141414}
.fone-t b{display:block;font-size:14.5px}.fone-t small{display:block;color:#8696a0;font-size:12px}
.q{display:block;font-family:var(--d);font-weight:850;font-size:21px;letter-spacing:-.02em;margin-bottom:12px}
.op2{position:relative;background:#171a19;border:1px solid #252a27;border-radius:13px;padding:11px 14px 11px 16px;font-size:14.5px;font-weight:650;margin-bottom:8px;transition:border-color .3s,background .3s}
.op2 small{display:block;font-weight:500;font-size:12.5px;color:var(--mute)}
.op2::before{content:"";position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:var(--a)}
.op2.on{border-color:var(--a);background:#16211f}
.fn-n{margin-top:12px;font-size:13px;color:var(--mute)}
.seta-io{width:44px;height:44px;border-radius:50%;border:1px solid var(--line);display:grid;place-items:center}
.seta-io svg{width:20px;height:20px;fill:none;stroke:var(--a);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.rc-t{display:block;font-family:var(--d);font-weight:850;font-size:22px;letter-spacing:-.02em;margin-bottom:8px}
.rc-l{display:grid;grid-template-columns:42% 1fr;gap:10px;padding:10px 0 10px 12px;border-top:1px solid var(--line);font-size:14.5px;font-weight:650;position:relative}
.rc-l::before{content:"";position:absolute;left:0;top:11px;bottom:11px;width:3px;border-radius:3px;background:var(--a)}
.rc-l span{font-weight:500;color:var(--mute)}
.ob{list-style:none;margin:26px 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ob li{display:flex;gap:12px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;font-size:15px;color:var(--mute)}
.ob li i{font-style:normal;font-size:22px;line-height:1.1}.ob li b{color:var(--ink)}
.od{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:26px;border:1px solid var(--line);border-radius:20px;overflow:hidden;background:var(--card)}
.od>div{padding:22px 20px;border-left:1px solid var(--line)}.od>div:first-child{border-left:0}
.od b{font-family:var(--d);font-weight:800;font-size:18px}.od p{color:var(--mute);font-size:15px;margin-top:4px}
.od-n{margin-top:16px;color:var(--mute);font-size:15px;max-width:70ch}
@media (max-width:900px){.vv,.ob,.od{grid-template-columns:1fr}.io-g{grid-template-columns:1fr;justify-items:center}.fone{margin:0 auto}.seta-io{transform:rotate(90deg)}.od>div{border-left:0;border-top:1px solid var(--line)}.od>div:first-child{border-top:0}}
'''

PN_MIOLO = r'''
  <section class="caos">
    <span class="kick rv">O que escapa</span>
    <h2 class="rv" style="margin-top:14px">Editar você sabe. <em class="ac">O que some é o resto.</em></h2>
    <p class="sub2 rv">O prazo ficou num áudio, o valor numa conversa, a revisão na memória. Toque em “Organizar” e veja as mesmas dúvidas viradas em resposta.</p>
    <div class="cs rv" id="caos">
      <div class="cs-b">
        <div class="nt" style="--x:-14px;--y:10px;--r:-5deg"><b>Café Central</b><span class="p">o prazo era sexta ou segunda?</span><span class="r"><i style="--c:#9B7BF7"></i>Editando · entrega 07 de out</span></div>
        <div class="nt" style="--x:22px;--y:-8px;--r:4deg"><b>Loja Bella</b><span class="p">já mandei o vídeo dela?</span><span class="r"><i style="--c:#3FB8AF"></i>Entregue · falta pagar R$ 650</span></div>
        <div class="nt" style="--x:-6px;--y:18px;--r:7deg"><b>Clínica Sorriso</b><span class="p">é a 3ª ou a 4ª alteração?</span><span class="r"><i style="--c:#F2A541"></i>Em revisão · 1 de 2 usadas</span></div>
        <div class="nt" style="--x:16px;--y:14px;--r:-7deg"><b>Pedro Fitness</b><span class="p">fechou ou só pediu orçamento?</span><span class="r"><i style="--c:#5AA9F0"></i>Fechado · R$ 1.400</span></div>
        <div class="nt" style="--x:-20px;--y:-12px;--r:3deg"><b>Studio Ana</b><span class="p">a Ana já pagou?</span><span class="r"><i style="--c:#7BD88F"></i>Pago · R$ 720</span></div>
        <div class="nt" style="--x:10px;--y:-16px;--r:-3deg"><b>Este mês</b><span class="p">quanto entrou até agora?</span><span class="r"><i style="--c:#7BD88F"></i>Recebido R$ 980 de R$ 5.000</span></div>
      </div>
      <button type="button" class="cs-bt" id="caosBt" aria-pressed="false">Organizar</button>
    </div>
  </section>

  <section class="mesx">
    <span class="kick rv">O mês numa linha</span>
    <h2 class="rv" style="margin-top:14px">Quanto entrou, quanto falta, <em class="ac">quanto ainda vem.</em></h2>
    <p class="sub2 rv">No topo do quadro, cinco números que respondem o que todo editor se pergunta no dia 20.</p>
    <div class="mkp rv">
      <div class="mk1 gr"><span>Recebido no mês</span><b>R$ 980 <small>de R$ 5.000</small></b><i><u></u></i><em>Faltam R$ 4.020 para a meta</em></div>
      <div class="mk1"><span>A receber</span><b>R$ 650</b><em>entregue, falta pagar</em></div>
      <div class="mk1"><span>Previsto</span><b>R$ 3.920</b><em>fechado, em produção</em></div>
      <div class="mk1"><span>Custos fixos</span><b>R$ 224</b><em>por mês</em></div>
      <div class="mk1 al"><span>Atrasados</span><b>1</b><em>prazo já passou</em></div>
    </div>
    <p class="mkp-n rv">Você define a meta. O quadro compara com o mês passado e mostra quanto sobrou depois dos custos fixos: CapCut, armazenamento, trilhas, internet.</p>
  </section>

  <section class="dets">
    <span class="kick rv">Dentro de cada trabalho</span>
    <h2 class="rv" style="margin-top:14px">O que você <em class="ac">para de fazer de cabeça.</em></h2>
    <div class="dt">
      <div class="dt-c rv">
        <div class="dt-v"><span class="bol"><i class="on"></i><i class="on"></i><i class="ex"></i></span><small>3 de 2 usadas · <b>1 extra</b></small></div>
        <b>Contar revisão</b>
        <p>Cada trabalho mostra quantas rodadas de ajuste já foram. Passou do combinado, aparece em vermelho, e você sabe que é hora de cobrar o extra.</p>
      </div>
      <div class="dt-c rv">
        <div class="dt-v zapm">Oi, Bella! Passando para lembrar do pagamento de R$ 650 referente a anúncio de 30s. Qualquer dúvida, estou à disposição. Obrigado!</div>
        <b>Escrever a mensagem chata</b>
        <p>Pedir material, avisar que ficou pronto, confirmar a revisão, lembrar o pagamento. Quatro mensagens prontas, com o nome do cliente e o valor, direto no WhatsApp.</p>
      </div>
      <div class="dt-c rv">
        <div class="dt-v jr"><span>Briefing</span><span>Preço</span><span>Contrato</span><span class="on">Organizador</span></div>
        <b>Cadastrar o trabalho</b>
        <p>Dá para criar um trabalho direto no quadro. E se você usa o Briefing, o Quanto Cobrar? ou o Contrato, o trabalho aceito pelo cliente entra aqui sozinho, com valor e prazo.</p>
      </div>
    </div>
  </section>
'''
PN_CSS = r'''
.cs{margin-top:26px;border:1px solid var(--line);border-radius:24px;background:var(--card);padding:34px 40px 24px;text-align:center;overflow:hidden}
.cs-b{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:left}
.nt{background:#f3e7c4;color:#2a2416;border-radius:6px;padding:14px 14px 16px;min-height:96px;box-shadow:0 14px 26px -14px #000;transform:translate(var(--x),var(--y)) rotate(var(--r));transition:transform .7s cubic-bezier(.2,.8,.2,1),background .5s,color .5s,border-radius .5s,box-shadow .5s}
.nt b{display:block;font-family:var(--d);font-weight:850;font-size:16.5px;letter-spacing:-.01em}
.nt span{display:block;font-size:14.5px;line-height:1.35;margin-top:4px;transition:opacity .4s}
.nt .p{font-family:"Bradley Hand","Segoe Print","Comic Sans MS",cursive;font-size:16px}
.nt .r{display:none;font-weight:650}
.nt .r i{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--c);margin-right:7px}
.cs.ok .nt{transform:none;background:var(--bg2);color:var(--ink);border:1px solid var(--line);border-radius:14px;box-shadow:none}
.cs.ok .nt .p{display:none}.cs.ok .nt .r{display:block;color:var(--mute);animation:ntin .5s .25s both}
@keyframes ntin{from{opacity:0;transform:translateY(6px)}}
.cs-bt{margin-top:26px;font:inherit;font-weight:750;font-size:16px;border:0;border-radius:14px;padding:14px 28px;cursor:pointer;background:var(--a);color:var(--ai)}
.cs.ok .cs-bt{background:transparent;color:var(--mute);border:1px solid var(--line)}
.mkp{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr 1fr;gap:10px;margin-top:26px}
.mk1{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px 14px 12px;display:flex;flex-direction:column;gap:3px}
.mk1 span{font-size:13px;color:var(--mute)}
.mk1 b{font-family:var(--d);font-weight:850;font-size:22px;letter-spacing:-.02em}.mk1 b small{font-size:.55em;color:var(--mute);font-weight:700}
.mk1 em{font-style:normal;font-size:12.5px;color:var(--dim)}
.mk1 i{display:block;height:8px;border-radius:6px;background:var(--bg);border:1px solid var(--line);overflow:hidden;margin:6px 0 2px}
.mk1 u{display:block;height:100%;width:0;background:linear-gradient(90deg,#3FB8AF,#7BD88F);transition:width 1.2s cubic-bezier(.2,.8,.2,1) .3s}
.mkp.vis .mk1 u{width:19.600%}
.mk1.al b{color:#ff8f7a}
.mkp-n{margin-top:16px;color:var(--mute);font-size:15px;max-width:70ch}
.dt{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:26px}
.dt-c{border:1px solid var(--line);border-radius:20px;background:var(--card);padding:18px}
.dt-c>b{display:block;font-family:var(--d);font-weight:850;font-size:19px;letter-spacing:-.02em;margin:14px 0 6px}
.dt-c p{color:var(--mute);font-size:15px}
.dt-v{min-height:112px;border-radius:14px;background:var(--bg2);border:1px solid var(--line);padding:14px;display:flex;flex-direction:column;justify-content:center;gap:8px;font-size:13.5px;color:var(--mute)}
.dt-v small b{color:#ff8f7a}
.bol{display:flex;gap:8px}.bol i{width:16px;height:16px;border-radius:50%;border:2px solid #4a504c}
.bol i.on{background:var(--a);border-color:var(--a)}.bol i.ex{background:#ff8f7a;border-color:#ff8f7a}
.zapm{background:#005c4b;border-color:transparent;color:#e9edef;font-size:13.5px;line-height:1.45;border-radius:14px 4px 14px 14px}
.jr{flex-direction:row;flex-wrap:wrap;align-items:center;gap:6px}
.jr span{border:1px solid var(--line);border-radius:99px;padding:6px 10px;font-size:12.5px;font-weight:650}
.jr span.on{background:var(--a);color:var(--ai);border-color:transparent}
.jr span:not(:last-child)::after{content:"→";margin-left:8px;color:var(--dim)}
@media (max-width:900px){.cs-b{grid-template-columns:1fr 1fr}.mkp{grid-template-columns:1fr 1fr}.mk1.gr{grid-column:1/-1}.dt{grid-template-columns:1fr}.nt{--x:0px!important;--y:0px!important}}
@media (max-width:520px){.cs{padding:20px 14px 18px}.cs-b{gap:10px}.nt{padding:11px 11px 13px}.nt b{font-size:15px}.nt .p{font-size:14.5px}}
'''
PN_JS = r'''
// caos -> organizado: as mesmas seis dúvidas viram resposta
(function(){
  const c = $('#caos'), b = $('#caosBt'); if (!c) return;
  let mexeu = false;
  function poe(ok){ c.classList.toggle('ok', ok); b.textContent = ok ? 'Bagunçar de novo' : 'Organizar'; b.setAttribute('aria-pressed', ok ? 'true' : 'false'); }
  b.addEventListener('click', () => { mexeu = true; poe(!c.classList.contains('ok')); });
  if (calmo) { poe(true); return; }
  // se a pessoa não tocar, organiza sozinho depois de alguns segundos na tela
  const io = new IntersectionObserver(e => { if (e[0].isIntersecting){ io.disconnect(); setTimeout(() => { if (!mexeu) poe(true); }, 3200); } }, { threshold: .6 });
  io.observe(c);
})();
(function(){ const k = document.querySelector('.mkp'); if (!k) return; new IntersectionObserver((e, o) => { if (e[0].isIntersecting){ k.classList.add('vis'); o.disconnect(); } }, { threshold: .4 }).observe(k); })();
'''

KT_MIOLO = r'''
  <section class="jor" id="jornada">
    <span class="kick rv">Um trabalho, do começo ao fim</span>
    <h2 class="rv" style="margin-top:14px">Cinco passos. <em class="ac">Você digita uma vez só.</em></h2>
    <p class="sub2 rv">Acompanhe o mesmo trabalho passando pelas quatro ferramentas. Repare no que já chega preenchido em cada passo.</p>
    <div class="jx rv" id="jx">
      <div class="jx-t" role="tablist" aria-label="Passos do trabalho">
        <button role="tab" aria-selected="true" data-i="0"><i>1</i>Briefing</button>
        <button role="tab" aria-selected="false" data-i="1"><i>2</i>Preço</button>
        <button role="tab" aria-selected="false" data-i="2"><i>3</i>Proposta</button>
        <button role="tab" aria-selected="false" data-i="3"><i>4</i>Contrato</button>
        <button role="tab" aria-selected="false" data-i="4"><i>5</i>Organizador</button>
      </div>
      <div class="jx-p" role="tabpanel" aria-live="polite">
        <div class="jx-c" id="jxC"></div>
        <div class="jx-d"><small id="jxF"></small><b id="jxH"></b><p id="jxP"></p><span class="jx-v" id="jxV"></span></div>
      </div>
    </div>
  </section>

  <section class="sj">
    <span class="kick rv">Separadas ou juntas</span>
    <h2 class="rv" style="margin-top:14px">Cada uma funciona sozinha. <em class="ac">Juntas, uma preenche a outra.</em></h2>
    <div class="sj-g rv">
      <div class="sj-c">
        <small>Uma ferramenta só</small>
        <ul><li>Resolve aquele pedaço do trabalho</li><li>Você digita cliente, serviço, prazo e valor nela</li><li>Na ferramenta seguinte, digita de novo</li></ul>
      </div>
      <div class="sj-c dest">
        <small>As quatro, no kit</small>
        <ul><li>O que o cliente respondeu no briefing vira preço</li><li>O preço vira proposta, a proposta vira contrato</li><li>O contrato aceito vira um card no organizador, sozinho</li></ul>
      </div>
    </div>
    <p class="sj-n rv">Não precisa usar todas em todo trabalho. Trabalho pequeno? Às vezes é só preço e termo rápido. Elas estão lá quando você precisar.</p>
  </section>
'''
KT_CSS = r'''
.jx{margin-top:26px;border:1px solid var(--line);border-radius:24px;background:var(--card);overflow:hidden}
.jx-t{display:grid;grid-template-columns:repeat(5,1fr);border-bottom:1px solid var(--line)}
.jx-t button{font:inherit;font-weight:700;font-size:14.5px;color:var(--mute);background:none;border:0;border-right:1px solid var(--line);padding:14px 8px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;position:relative;transition:color .2s,background .2s}
.jx-t button:last-child{border-right:0}
.jx-t button i{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:800;border:1px solid var(--line);flex:none}
.jx-t button[aria-selected=true]{color:var(--ink);background:var(--bg2)}
.jx-t button[aria-selected=true] i{background:var(--a);color:var(--ai);border-color:transparent}
.jx-t button.feito i{border-color:var(--a);color:var(--a)}
.jx-p{display:grid;grid-template-columns:1fr 1fr;gap:30px;align-items:center;padding:28px}
.jx-c{background:#0D0F0E;border:1px solid var(--line);border-radius:18px;padding:18px;min-height:250px;display:flex;flex-direction:column;justify-content:center;gap:0}
.jx-c .tt{font-family:var(--d);font-weight:850;font-size:19px;letter-spacing:-.02em;margin-bottom:8px}
.jx-c .ln{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid var(--line);font-size:14.5px}
.jx-c .ln span{color:var(--mute)}.jx-c .ln b{text-align:right}
.jx-c .ln.veio b{color:var(--a)}
.jx-c .big{font-family:var(--d);font-weight:900;font-size:40px;letter-spacing:-.03em;color:var(--a);line-height:1;margin:6px 0 10px}
.jx-c .bt{margin-top:12px;border-radius:12px;padding:12px;text-align:center;font-weight:800;font-size:14.5px;background:var(--a);color:var(--ai)}
.jx-c .bt.ok{background:transparent;border:1px solid var(--a);color:var(--a)}
.jx-d small{font-weight:800;font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--a)}
.jx-d b{display:block;font-family:var(--d);font-weight:850;font-size:26px;letter-spacing:-.02em;line-height:1.1;margin:6px 0 8px}
.jx-d p{color:var(--mute);font-size:16px}
.jx-v{display:inline-block;margin-top:14px;font-size:13.5px;font-weight:650;border:1px dashed color-mix(in srgb,var(--a) 60%,transparent);border-radius:10px;padding:8px 12px;color:var(--ink)}
.jx-p.troca .jx-c,.jx-p.troca .jx-d{animation:jxin .4s cubic-bezier(.2,.8,.2,1) both}
@keyframes jxin{from{opacity:0;transform:translateY(10px)}}
.sj-g{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:26px}
.sj-c{border:1px solid var(--line);border-radius:22px;background:var(--card);padding:22px}
.sj-c.dest{border-color:color-mix(in srgb,var(--a) 55%,transparent);background:linear-gradient(180deg,color-mix(in srgb,var(--a) 9%,var(--card)),var(--card))}
.sj-c small{font-weight:800;font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--a)}
.sj-c ul{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:10px;font-size:15.5px}
.sj-c li{position:relative;padding-left:22px;color:var(--mute)}.sj-c li::before{content:"·";position:absolute;left:6px;color:var(--dim);font-weight:900}
.sj-c.dest li{color:var(--ink)}.sj-c.dest li::before{content:"✓";left:0;color:var(--a)}
.sj-n{margin-top:16px;color:var(--mute);font-size:15px;max-width:70ch}
@media (max-width:900px){.jx-p{grid-template-columns:1fr;gap:18px;padding:18px}.jx-d{order:-1}.sj-g{grid-template-columns:1fr}
  .jx-t button{flex-direction:column;gap:4px;font-size:11.5px;padding:10px 2px}.jx-c{min-height:0}}
'''
KT_JS = r'''
// um trabalho só passando pelas quatro ferramentas (o que aparece em destaque veio do passo anterior)
(function(){
  const ln = (a, b, v) => `<div class="ln${v ? ' veio' : ''}"><span>${a}</span><b>${b}</b></div>`;
  const P = [
    ['Gerador de Briefing', 'O cliente responde o seu link.', 'Em 1 minuto, pelo celular, tocando nas opções. O pedido chega organizado na sua conta.', 'Você digitou: nada',
      '<div class="tt">Studio Zeta</div>' + ln('Serviço', 'Só a edição') + ln('Tipo de vídeo', 'Reels / TikTok / Shorts') + ln('Quantidade', '5 a 8 vídeos') + ln('Prazo', 'Em até 1 semana')],
    ['Quanto Cobrar?', 'As respostas abrem a calculadora.', 'Tipo de vídeo, quantidade e prazo já vêm do briefing. Você só confere o estilo da edição e vê o valor para o seu nível.', 'Veio do briefing: tipo, quantidade e prazo',
      '<div class="tt">Valor de referência</div><div class="big">R$ 1.350</div>' + ln('Tipo de vídeo', 'Reels', 1) + ln('Quantidade', '8 vídeos', 1) + ln('Edição', 'Caprichada')],
    ['Quanto Cobrar? · proposta', 'O preço vira proposta por link.', 'Serviço, entrega, prazo e valor já estão montados. O cliente abre no celular e aprova com um toque.', 'Veio do preço: serviço, entrega e valor',
      '<div class="tt">Proposta para Studio Zeta</div>' + ln('Serviço', 'Edição caprichada de Reels', 1) + ln('Entrega', '8 vídeos editados', 1) + ln('Investimento', 'R$ 1.350', 1) + '<div class="bt">Aprovar proposta</div>'],
    ['Gerador de Contrato', 'A proposta aprovada vira contrato.', 'Cliente, serviço, prazo, revisões e valor entram sozinhos nas cláusulas. O cliente lê e aceita pelo celular.', 'Veio da proposta: cliente, serviço, prazo e valor',
      '<div class="tt">Contrato · Studio Zeta</div>' + ln('Serviço', 'Edição caprichada de Reels', 1) + ln('Revisões', '2 rodadas incluídas') + ln('Valor total', 'R$ 1.350', 1) + '<div class="bt ok">✓ Aceito pelo cliente</div>'],
    ['Base Demandas', 'O trabalho entra no quadro sozinho.', 'Assim que o cliente aceita, o card aparece em “Fechado”, com valor e prazo. Você só move de coluna e acompanha o pagamento.', 'Entrou sozinho: cliente, valor e prazo',
      '<div class="tt">Fechado</div>' + ln('Cliente', 'Studio Zeta', 1) + ln('Trabalho', '8 Reels', 1) + ln('Valor', 'R$ 1.350', 1) + ln('Revisões', '0 de 2 usadas')],
  ];
  const bs = [...document.querySelectorAll('.jx-t button')], pn = document.querySelector('.jx-p'); if (!pn) return;
  let at = 0, mexeu = false, vis = false;
  function mostra(i){ at = i; bs.forEach((b, k) => { b.setAttribute('aria-selected', k === i ? 'true' : 'false'); b.classList.toggle('feito', k < i); });
    $('#jxF').textContent = P[i][0]; $('#jxH').textContent = P[i][1]; $('#jxP').textContent = P[i][2]; $('#jxV').textContent = P[i][3]; $('#jxC').innerHTML = P[i][4];
    pn.classList.remove('troca'); void pn.offsetWidth; pn.classList.add('troca'); }
  bs.forEach((b, i) => b.addEventListener('click', () => { mexeu = true; mostra(i); }));
  mostra(0);
  new IntersectionObserver(e => { vis = e[0].isIntersecting; }, { threshold: .35 }).observe(pn);
  if (!calmo) (async () => { while (!mexeu){ await dorme(4200); if (vis && !mexeu) mostra((at + 1) % P.length); } })();
})();
'''
EXTRA = {
 'efeitos-sonoros': dict(),
 'luts': dict(),
 'quanto-cobrar': dict(miolo=QC_MIOLO, css=QC_CSS, js=QC_JS, cta_oferta='Liberar a calculadora completa', fecho='O próximo cliente vai perguntar o preço. <em class="ac">Você já vai saber.</em>',
   passos_h2='Do pedido do cliente à proposta enviada, em 1 minuto.',
   passos=[('Conte o trabalho','Editar, gravar ou os dois. Tipo de vídeo, duração, estilo e prazo, tocando nas opções.'),('Veja o seu preço','Valor de referência para o seu nível, faixa justa para negociar e preço de pacotes.'),('Mande a proposta','Um link com serviço, entrega, prazo e valor. O cliente aprova pelo celular. Se preferir, mande só o texto no WhatsApp.')],
   ad_h2='O que muda no seu jeito de cobrar.',
   antes=['Chuta um valor e torce para o cliente aceitar','Cobra igual por trabalhos bem diferentes','Monta o orçamento do zero toda vez','Dá desconto sem saber se ainda compensa'],
   depois=['Preço calculado pelo tempo de trabalho e pelo seu nível','Faixa justa para negociar com segurança','Proposta pronta em 1 minuto','Desconto de pacote já calculado'],
   mais=[('Gravação também','Horas de captação, estrutura e custos extras, como transporte, entram na conta.'),('Faixa para negociar','Valor mínimo e máximo justos, para você não baixar demais na conversa.'),('No meio da conversa','Funciona no celular. Calcula na hora, enquanto o cliente espera a resposta.')]),
 'gerador-de-contrato': dict(miolo=GC_MIOLO, css=GC_CSS, js=GC_JS, cta_oferta='Liberar o Gerador de Contrato', fecho='O próximo “só mais um ajustezinho” <em class="ac">já vai estar combinado.</em>',
   passos_h2='Contrato pronto em poucos toques.',
   passos=[('Escolha o formato','Termo rápido para trabalhos pequenos ou contrato completo em PDF para os maiores.'),('Responda o básico','Partes, trabalho, prazo, valor, pagamento e uso das imagens. Você vê o contrato se montando.'),('Envie para o cliente','Mande o link: ele lê e aceita pelo celular. Ou envie o PDF, na mesma hora.')],
   ad_h2='Menos briga, mais trabalho bem pago.',
   antes=['Tudo combinado só por áudio','Cliente pede a quinta alteração de graça','Pagamento atrasa e não tem o que mostrar','Vídeo usado em anúncio sem ter combinado'],
   depois=['Tudo combinado por escrito, em linguagem simples','Número de revisões definido desde o começo','Forma e data de pagamento claras','Uso das imagens combinado antes de começar'],
   mais=[('Sem juridiquês','Texto claro, que o cliente lê e entende sem precisar de advogado.'),('PDF com cara profissional','Resumo do trabalho, cláusulas numeradas e espaço para assinatura.'),('Direto do celular','Gere e envie o PDF pelo WhatsApp sem abrir o computador.')]),
 'gerador-de-briefing': dict(miolo=BR_MIOLO, css=BR_CSS, cta_oferta='Criar o meu link de briefing', fecho='O próximo cliente que disser “quero uns vídeos” <em class="ac">recebe um link.</em>',
   passos_h2='Três passos e o pedido chega organizado.',
   passos=[('Crie o seu link','Coloque seu nome e seu WhatsApp uma vez. O link fica pronto para sempre.'),('Mande para o cliente','Ele responde em 1 minuto, tocando nas opções, sem conta e sem app.'),('Receba tudo organizado','O briefing fica salvo na sua conta, com avisos do que observar antes de passar o preço. O cliente te avisa no WhatsApp.')],
   ad_h2='O fim do “me passa mais detalhes?”.',
   antes=['Dez mensagens até entender o pedido','Cliente responde pela metade','Você esquece de perguntar o prazo','O orçamento sai errado e precisa refazer'],
   depois=['Uma mensagem só, com tudo','As perguntas certas, sempre as mesmas','Prazo e valor em mente já respondidos','Você responde mais rápido e com mais segurança'],
   mais=[('Sem conta e sem app','O cliente só abre o link no celular e responde.'),('Na bio ou no automático','Use o mesmo link no Instagram e na resposta automática do WhatsApp.'),('Resumo para copiar','Cole nas suas anotações ou mande para quem trabalha com você.')]),
 'financas-e-demandas': dict(miolo=PN_MIOLO, css=PN_CSS, js=PN_JS, cta_oferta='Liberar o Base Demandas', fecho='No dia 20, você abre o quadro <em class="ac">e sabe como está o mês.</em>',
   passos_h2='Seu mês inteiro num quadro só.',
   passos=[('Cadastre o trabalho','Cliente, valor, prazo de entrega e quantas revisões estão incluídas.'),('Mova pelas colunas','Orçamento, fechado, editando, revisão, entregue e pago. Arraste ou toque na seta.'),('Acompanhe o mês','Quanto entrou, quanto falta para a meta e como está em relação ao mês passado.')],
   ad_h2='Organização de quem vive de edição.',
   antes=['Prazos anotados em vários lugares','Não lembra quem ainda não pagou','Não sabe quanto ganhou no mês','Não sabe quanto custa manter o próprio trabalho'],
   depois=['Todos os trabalhos num quadro só','Pagamentos pendentes à vista','Meta do mês e comparativo com o anterior','Custos fixos somados no seu mês'],
   mais=[('Contador de revisões','Veja quantas rodadas de ajuste o cliente já usou.'),('Mensagens prontas','Cobrança, entrega e pedido de material prontos para o WhatsApp.'),('Comemora com você','Trabalho pago vira confete na tela. Pequenas vitórias contam.')]),
}
# Preços, links de compra e parcelas vêm do catalogo.json (fonte única). Não escreva preço aqui.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gera_catalogo import carrega, parcela, brl
CAT = carrega()
POR_SLUG = {c['slug']: c for c in CAT['produtos']}
KIT = CAT['kit']
JORNADA = [c for c in sorted(CAT['produtos'], key=lambda c: c.get('jornada', 99)) if c.get('jornada')]
seta = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'

TESTE = {   # o que cada página oferece para experimentar antes de comprar (a ferramenta de verdade, com limite)
 'quanto-cobrar': ('Faça a conta do seu próximo trabalho.', 'É a calculadora de verdade, não uma demonstração. O primeiro cálculo é por nossa conta.', True),
 'gerador-de-briefing': ('Teste como o seu cliente vai responder', '', False),
 'gerador-de-contrato': ('Monte um contrato de teste', '', False),
 'financas-e-demandas': ('Mexa num quadro de exemplo', '', False),
}
for p in PAGINAS:
    c = POR_SLUG[p['slug']]; ex = EXTRA[p['slug']]; vit = c['acesso'] == 'vitalício'
    p['pack'] = c['pack']; p['checkout'] = c['checkout']; p['preco'] = brl(c['preco'])
    p['parc6'] = brl(parcela(c['preco'], CAT), 2)
    p['acesso_txt'] = 'acesso vitalício' if vit else 'acesso de 1 ano'
    p['acesso_selo'] = 'Acesso vitalício' if vit else 'Acesso de 1 ano'
    p['acesso_curto'] = 'acesso vitalício' if vit else '1 ano de acesso'
    for k in ('passos','passos_h2','antes','depois','ad_h2','miolo','cta_oferta','fecho'):
        if k in ex: p[k] = ex[k]
    p['css'] += ex.get('css', ''); p['js'] += ex.get('js', '')
    if 'mais' in ex: p['bens'] = p['bens'] + ex['mais']
    p['combina'] = None
    p['inclui'] = p['inclui'] + ['Aula ensinando a usar']
    p['faq'] = p['faq'] + [('Tem aula ensinando a usar?', 'Sim. Junto com o acesso vem uma aula mostrando, passo a passo, como usar e tirar o melhor proveito.')]
    if p['slug'] in TESTE:
        tit, txt, embutido = TESTE[p['slug']]
        if embutido:
            p['ver'] = ('#teste', 'Fazer 1 cálculo grátis ↓')
            p['teste'] = f'<section id="teste"><div class="teste rv"><h2>{tit}</h2><p>{txt}</p><iframe src="{c["url"]}?de=venda" title="{c["nome"]}" loading="lazy"></iframe></div></section>'
        else:
            p['ver'] = (c['url'] + '?de=venda', tit + ' →')
        # o kit: as quatro ferramentas, na ordem de um trabalho
        trilho = ''.join(f'<li data-k="{j["key"]}" class="{"aqui" if j["slug"] == p["slug"] else ""}">{i+1}. {j["nome"]}</li>' for i, j in enumerate(JORNADA))
        p['kit'] = f'''<section><div class="kitb rv"><div><span class="kick">{KIT["nome"]}</span><h2 style="margin-top:12px">Ou leve as quatro. <em class="ac">Uma preenche a outra.</em></h2>
          <p>O cliente responde o briefing, você calcula, manda a proposta, fecha o contrato e o trabalho entra sozinho no organizador. Sem digitar nada duas vezes.</p><ul class="trilho">{trilho}</ul></div>
          <div class="lado"><div class="de">{brl(KIT["de"])} separadas</div><div class="por">{brl(KIT["preco"])} <small>/ 1 ano</small></div><a class="btn" href="https://basefl.com/conheca/{KIT["slug"]}/?de={p["slug"]}">Ver o {KIT["nome"]} {seta}</a></div></div></section>'''
        p['faq'] = p['faq'] + [('E se eu quiser as outras ferramentas depois?', f'Você compra quando quiser, com o mesmo e-mail: o acesso entra na mesma conta, sem novo cadastro. E a qualquer momento você libera todas as que faltam por {brl(KIT["preco"])}.')]
    d = os.path.join(BASE, p['slug']); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(pagina(p))
    print('ok', p['slug'])

# ---------------------------------------------------------------- KIT FREELANCER (as quatro ferramentas, em ordem)
def pagina_kit():
    k = KIT
    passos_j = [('O cliente responde o briefing', 'Você manda um link. Ele responde em 1 minuto, pelo celular, sem conta.'),
                ('Você calcula o preço', 'As respostas já entram na calculadora. O valor sai para o seu nível, com faixa para negociar.'),
                ('Manda a proposta', 'Um link com serviço, prazo e valor. O cliente aprova com um toque. Suas horas ficam só com você.'),
                ('Fecha o contrato', 'Cliente, serviço, prazo e valor já vêm preenchidos. Ele lê e aceita pelo celular.'),
                ('O trabalho entra no organizador', 'Prazo, revisões e pagamento num quadro. Você só acompanha e entrega.')]
    linhas = ''.join(f'<div class="kl" data-k="{j["key"]}" style="--c:rgb({j["cor"]})"><img src="https://basefl.com/icones/{j["key"]}.png" alt="" width="44" height="44"><span><b>{j["nome"]}</b><small>{j["passo"]}</small></span><i>{brl(j["preco"])}</i></div>' for j in JORNADA)
    demo = f'<div class="kd">{linhas}<div class="kt"><span>Separadas</span><s>{brl(k["de"])}</s></div><div class="kt tot"><span>No kit</span><b>{brl(k["preco"])}</b></div></div>'
    css = """
.kd{width:100%;max-width:420px;display:flex;flex-direction:column;gap:8px}
.kl{display:flex;align-items:center;gap:12px;background:#171a19;border:1px solid #252a27;border-left:3px solid var(--c);border-radius:14px;padding:10px 14px 10px 12px;opacity:0;transform:translateY(8px);animation:kl .5s cubic-bezier(.2,.8,.2,1) forwards}
.kl:nth-child(2){animation-delay:.12s}.kl:nth-child(3){animation-delay:.24s}.kl:nth-child(4){animation-delay:.36s}
.kl img{border-radius:11px;flex:none}
.kl span{flex:1;min-width:0;text-align:left}
.kl b{display:block;font-family:var(--d);font-weight:800;font-size:15.5px}
.kl small{display:block;color:var(--mute);font-size:12.5px}
.kl i{font-style:normal;color:var(--mute);font-size:13.5px;font-variant-numeric:tabular-nums;text-decoration:line-through}
.kt{display:flex;justify-content:space-between;align-items:baseline;padding:4px 6px 0;color:var(--mute);font-size:14px}
.kt.tot{color:var(--ink)}
.kl.meu b{color:var(--mute)}.kl.meu i{text-decoration:none;color:var(--a)}.kl.meu i::before{content:"✓ já é seu";}.kl.meu i{font-size:0}.kl.meu i::before{font-size:13px}
.kt.tot b{font-family:var(--d);font-weight:900;font-size:34px;letter-spacing:-.03em;color:var(--a)}
@keyframes kl{to{opacity:1;transform:none}}
"""
    p = dict(slug=k['slug'], pack='kit', nome=k['nome'], secao='Kit · 4 ferramentas', cor='#F2A541', cor2='#FF7A45',
      pattern='linear-gradient(rgba(242,165,65,.05) 1px,transparent 1px) 0 0/100% 40px', fxx='70%', capa='https://basefl.com/icon-512.png',
      kick='Kit · as 4 ferramentas', desc=f'Briefing, preço, proposta, contrato e organizador trabalhando juntos. As quatro ferramentas do freelancer por {brl(k["preco"])}.',
      h1='Do primeiro contato ao pagamento. <em>Sem retrabalho.</em>',
      lead='As quatro ferramentas do editor freelancer, <b>em ordem</b>: o cliente responde o briefing, você calcula, manda a proposta, fecha o contrato e o trabalho <b>entra sozinho no organizador</b>. Nada é digitado duas vezes.',
      cta='Quero o Kit Freelancer', nota='Funciona no <b>celular e no computador</b>', rot='O que vem no kit', demo=demo, css=css + KT_CSS, js=KT_JS,
      miolo=KT_MIOLO, ver=('#jornada', 'Ver um trabalho do começo ao fim ↓'), cta_oferta='Liberar as quatro ferramentas', fecho='Seu próximo trabalho, do pedido ao pagamento, <em class="ac">sem digitar duas vezes.</em>',
      checkout=k['checkout'], preco=brl(k['preco']), parc6=brl(parcela(k['preco'], CAT), 2),
      acesso_txt=f'acesso de 1 ano · em vez de {brl(k["de"])}', acesso_selo='Acesso de 1 ano', acesso_curto='1 ano de acesso',
      passos_h2='Um trabalho inteiro, do pedido ao pagamento.', passos=passos_j,
      h2='Quatro ferramentas. Um processo só.',
      bens=[(j['nome'], j['desc'] + f' <b>Separada: {brl(j["preco"])}.</b>') for j in JORNADA],
      inclui=[j['nome'] for j in JORNADA] + ['Uma conta só', 'Celular e computador', 'Aula ensinando a usar'],
      ad_h2='O que muda na sua rotina.',
      antes=['Dez mensagens para entender o pedido', 'Preço no chute, orçamento montado do zero', 'Combinado só por áudio', 'Prazos e pagamentos espalhados'],
      depois=['Pedido organizado em 1 minuto', 'Preço calculado e proposta por link', 'Contrato aceito pelo celular', 'Tudo num quadro, com o que falta receber'],
      combina=None,
      faq=[('Já tenho uma das ferramentas. Vale a pena?', f'Vale. Por {brl(k["preco"])} você libera todas as que ainda não tem, na mesma conta, sem novo cadastro e sem perder nada do que já fez. Entre com o seu e-mail e esta página mostra o que você já tem e o que será liberado. Se faltar só uma, ela mesma avisa e leva você para a ferramenta avulsa.'),
           ('Preciso usar todas?', 'Não. Cada uma funciona sozinha. Juntas, uma preenche a outra e você não digita nada duas vezes.'),
           ('O meu cliente vê os meus preços internos?', 'Não. O cliente só abre o que você manda para ele: o briefing para responder, a proposta para aprovar e o contrato para aceitar. Horas, valor por hora e a sua organização ficam só com você.'),
           FAQ_ACESSO, FAQ_ANO, ('Tem aula ensinando a usar?', 'Sim. Junto com o acesso vem uma aula mostrando, passo a passo, como usar cada ferramenta.')],
      fh2='Seu próximo trabalho, do começo ao fim, num lugar só.', selo='Celular e computador')
    d = os.path.join(BASE, k['slug']); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(pagina(p))
    print('ok', k['slug'])
pagina_kit()
