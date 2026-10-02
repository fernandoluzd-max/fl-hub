#!/usr/bin/env python3
# Gera conheca/mood/index.html (página de vendas do Mood).
# A demonstração da página usa o MESMO motor de cor da ferramenta: ele é copiado de lut/index.html.
import os
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# preço, link de compra e parcelas: vêm do catalogo.json (fonte única)
import sys as _sys, os as _os
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
from gera_catalogo import carrega as _carrega
_CAT = _carrega(); _MOOD = next(p for p in _CAT['produtos'] if p['key'] == 'mood')
CHECKOUT = _MOOD['checkout']
PRECO = _MOOD['preco']
I, NP = _CAT['juros_mes'], _CAT['parcelas']
parc = PRECO * I / (1 - (1 + I) ** -NP)
PARC = f'{parc:.2f}'.replace('.', ',')

fer = open(os.path.join(RAIZ, 'lut/index.html'), encoding='utf-8').read()
motor = fer[fer.index('// ===================== cor: sRGB <-> Lab'):fer.index('// ===================== estado')]

LOGO = '<span class="mood" aria-label="Mood">M<svg viewBox="0 0 414 231" aria-hidden="true"><circle cx="115.5" cy="115.5" r="115.5" fill="url(#mg)"/><circle cx="298" cy="115.5" r="99.9" fill="none" stroke="currentColor" stroke-width="31.2"/></svg>d</span>'

HTML = r'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Mood — copie a cor de qualquer vídeo | Base FL</title>
<meta name="description" content="Mostre a referência, mostre o seu vídeo e baixe a LUT pronta. Sem saber color grading.">
<meta property="og:title" content="Mood — copie a cor de qualquer vídeo">
<meta property="og:description" content="Mostre a referência, mostre o seu vídeo e baixe a LUT pronta. Sem saber color grading.">
<meta property="og:image" content="https://basefl.com/capas/mood.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:type" content="website">
<link rel="icon" type="image/svg+xml" href="https://basefl.com/lut/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="https://basefl.com/lut/favicon-32.png">
<link rel="apple-touch-icon" href="https://basefl.com/lut/apple-touch-icon.png">
<meta name="theme-color" content="#111312">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="preconnect" href="https://images.pexels.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400..900&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#111312; --panel:#191C1B; --panel2:#202423; --line:#2B302E; --ink:#F4F0E4; --mute:#B3B4A2; --dim:#74756a;
  --grad:linear-gradient(125deg,#FFB347,#FF6FAE 38%,#B45CFF 70%,#5AB8FF);
  --d:"Archivo",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  --f:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  --m:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html{scroll-behavior:smooth}
html,body{background:var(--bg)}
body{color:var(--ink);font:17px/1.55 var(--f);overflow-x:hidden;-webkit-font-smoothing:antialiased}
body::before{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(900px 620px at 85% -10%,rgba(180,92,255,.20),transparent 70%),radial-gradient(700px 480px at -8% 2%,rgba(255,179,71,.09),transparent 70%)}
a{color:inherit}
button{font:inherit;color:inherit}
:focus-visible{outline:2px solid #B45CFF;outline-offset:3px;border-radius:10px}
.w{position:relative;max-width:1080px;margin:0 auto;padding:0 20px}
.mono{font-family:var(--m);font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--mute)}
.kick{display:inline-flex;align-items:center;gap:10px}
.kick::before{content:"";width:26px;height:2px;border-radius:2px;background:var(--grad)}
em{font-style:normal;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}

nav{display:flex;align-items:center;gap:12px;padding:18px 0}
.mood{font-family:var(--d);font-weight:800;font-size:30px;line-height:1;letter-spacing:-.02em;display:inline-flex;align-items:baseline;color:var(--ink);text-decoration:none}
.mood svg{height:.56em;width:1em;margin:0 .035em;flex:none}
nav .de{font-family:var(--m);font-size:10.5px;letter-spacing:.16em;color:var(--dim);text-transform:uppercase;padding-left:12px;border-left:1px solid var(--line);text-decoration:none}
nav .sp{flex:1}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;cursor:pointer;text-decoration:none;font-weight:750;font-size:17px;border-radius:16px;padding:16px 26px;border:0;background:var(--grad);color:#14070e;transition:transform .12s,filter .15s;box-shadow:0 14px 40px -14px rgba(180,92,255,.9)}
.btn:hover{filter:brightness(1.07);transform:translateY(-1px)}
.btn.sm{font-size:14px;padding:10px 16px;border-radius:12px;box-shadow:none}
.btn.gh{background:transparent;color:var(--ink);border:1px solid #3d4340;box-shadow:none}
.btn.gh:hover{border-color:var(--ink)}
.btn.full{width:100%}

.hero{text-align:center;padding:34px 0 26px}
h1{font-family:var(--d);font-weight:800;font-size:clamp(38px,7.4vw,76px);line-height:.98;letter-spacing:-.035em;margin:14px auto 16px;max-width:13ch;text-wrap:balance}
.lead{color:var(--mute);font-size:clamp(17px,2.2vw,20px);max-width:56ch;margin:0 auto 26px;text-wrap:pretty}
.lead b{color:var(--ink);font-weight:600}
.cta{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.sob{color:var(--dim);font-size:14px;margin-top:14px}

/* demonstração real */
.demo{position:relative;margin:26px auto 0;max-width:940px}
.demo::before{content:"";position:absolute;inset:8% 4% -4%;background:var(--grad);filter:blur(70px);opacity:.28;z-index:0;border-radius:50%}
.tela{position:relative;z-index:1;border-radius:26px;overflow:hidden;border:1px solid #3a3f3c;background:#0b0c0c;aspect-ratio:16/10;touch-action:pan-y;user-select:none;-webkit-user-select:none;box-shadow:0 40px 90px -40px #000}
.tela canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.tela .corte{position:absolute;top:0;bottom:0;width:2px;background:#fff;box-shadow:0 0 14px rgba(255,255,255,.7);z-index:2;cursor:ew-resize}
.tela .corte span{position:absolute;top:50%;left:50%;width:42px;height:42px;margin:-21px 0 0 -21px;border-radius:50%;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,.45);display:grid;place-items:center;color:#111;font-weight:900;font-size:13px;letter-spacing:2px}
.tg{position:absolute;top:14px;z-index:3;font-size:12px;font-weight:700;padding:6px 11px;border-radius:99px;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);pointer-events:none}
.tg.l{left:14px}.tg.r{right:14px;background:var(--grad);color:#111}
.refb{position:absolute;left:14px;bottom:14px;z-index:3;display:flex;align-items:center;gap:10px;padding:7px 14px 7px 7px;border-radius:99px;background:rgba(0,0,0,.62);backdrop-filter:blur(8px);pointer-events:none}
.refb canvas{position:static;width:46px;height:46px;border-radius:50%;box-shadow:0 0 0 2px #FF6FAE}
.refb b{display:block;font-size:13.5px;line-height:1.2;text-align:left}
.refb small{display:block;font-family:var(--m);font-size:9.5px;letter-spacing:.14em;color:var(--mute);text-align:left}
.pct{position:absolute;right:14px;bottom:14px;z-index:3;padding:9px 14px;border-radius:16px;background:rgba(0,0,0,.62);backdrop-filter:blur(8px);text-align:right;pointer-events:none}
.pct b{display:block;font-family:var(--d);font-weight:800;font-size:24px;line-height:1;font-variant-numeric:tabular-nums}
.pct small{font-size:11.5px;color:var(--mute)}
.tela.lendo::after{content:"";position:absolute;top:0;bottom:0;width:30%;left:-34%;z-index:2;background:linear-gradient(90deg,transparent,rgba(255,111,174,.30),rgba(180,92,255,.45),transparent);animation:varre .9s ease-in-out infinite}
@keyframes varre{to{left:110%}}
.esc{position:relative;z-index:1;margin-top:14px;text-align:left}
.esc .mono{display:block;margin:0 0 9px 4px}
.refs{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.rf{position:relative;cursor:pointer;border-radius:16px;overflow:hidden;border:2px solid transparent;background:var(--panel);padding:0;aspect-ratio:16/10;transition:transform .15s}
.rf:hover{transform:translateY(-2px)}
.rf canvas{width:100%;height:100%;display:block;object-fit:cover}
.rf span{position:absolute;left:8px;bottom:8px;font-size:12.5px;font-weight:700;padding:4px 9px;border-radius:99px;background:rgba(0,0,0,.62);backdrop-filter:blur(6px)}
.rf.on{border-color:transparent;background:var(--grad);box-shadow:0 10px 30px -12px rgba(180,92,255,.9)}
.rf.on canvas{border-radius:13px}
.real{margin-top:12px;text-align:center;color:var(--dim);font-size:13.5px}
.real i{display:inline-block;width:8px;height:8px;border-radius:50%;background:#7fce8f;margin-right:7px;box-shadow:0 0 0 0 rgba(127,206,143,.6);animation:pulsa 2s infinite}
@keyframes pulsa{70%{box-shadow:0 0 0 9px rgba(127,206,143,0)}100%{box-shadow:0 0 0 0 rgba(127,206,143,0)}}
.semfoto .tela{background:#141615 url(https://basefl.com/lut/capa.png) center/cover}
.semfoto .esc,.semfoto .real,.semfoto .tela>*{display:none}

section{padding:74px 0 0}
h2{font-family:var(--d);font-weight:800;font-size:clamp(28px,4.6vw,46px);line-height:1.04;letter-spacing:-.03em;margin:12px 0 12px;max-width:18ch;text-wrap:balance}
.sec-p{color:var(--mute);max-width:58ch;font-size:17.5px}
.rv{opacity:0;transform:translateY(16px);transition:opacity .6s ease,transform .6s cubic-bezier(.2,.8,.2,1)}
.rv.vis{opacity:1;transform:none}
.d1{transition-delay:.08s}.d2{transition-delay:.16s}.d3{transition-delay:.24s}

.tres{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:28px}
.ps{background:var(--panel);border:1px solid var(--line);border-radius:24px;padding:22px}
.ps .il{height:104px;border-radius:16px;background:var(--panel2);margin-bottom:16px;display:grid;place-items:center;position:relative;overflow:hidden}
.ps .bola{width:58px;height:58px;border-radius:50%}
.ps .bola.r{background:var(--grad)}
.ps .bola.v{border:9px solid var(--ink)}
.ps .par{display:flex}.ps .par .bola.v{margin-left:-16px}
.ps .cube{font-family:var(--m);font-size:12px;color:#111;background:var(--grad);border-radius:12px;padding:12px 16px;white-space:nowrap}
.ps .cube i{font-style:normal}
.ps .n{font-family:var(--m);font-size:11px;letter-spacing:.16em;color:var(--mute)}
.ps h3{font-family:var(--d);font-weight:800;font-size:21px;margin:4px 0 6px;letter-spacing:-.01em}
.ps p{color:var(--mute);font-size:15.5px}

.duo{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:28px}
.cx{background:var(--panel);border:1px solid var(--line);border-radius:24px;padding:24px}
.cx h3{font-family:var(--d);font-weight:800;font-size:20px;margin-bottom:12px}
.cx ul{list-style:none;display:flex;flex-direction:column;gap:11px}
.cx li{display:flex;gap:11px;color:var(--mute);font-size:16px;line-height:1.4}
.cx li::before{content:"";flex:none;width:20px;height:20px;margin-top:2px;border-radius:50%}
.cx.nao li::before{background:#2c302e url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M6.5 6.5l7 7M13.5 6.5l-7 7' stroke='%2374756a' stroke-width='1.8' stroke-linecap='round'/%3E%3C/svg%3E")}
.cx.sim{border-color:transparent;background:linear-gradient(var(--panel),var(--panel)) padding-box,var(--grad) border-box;border:1.5px solid transparent}
.cx.sim li{color:var(--ink)}
.cx.sim li::before{background:#7fce8f url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M5.5 10.5l3 3 6-7' fill='none' stroke='%230b1a10' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")}

.bens{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:28px}
.bem{background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:20px}
.bem h3{font-size:17.5px;font-weight:700;margin-bottom:5px}
.bem p{color:var(--mute);font-size:15px;line-height:1.45}
.bem .ic{width:42px;height:42px;border-radius:13px;background:var(--panel2);border:1px solid var(--line);display:grid;place-items:center;margin-bottom:12px}
.bem .ic svg{width:22px;height:22px;fill:none;stroke:url(#mg);stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}

.onde{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:28px}
.od{background:var(--panel);border:1px solid var(--line);border-radius:24px;padding:24px}
.od .mono{display:block;margin-bottom:8px}
.od h3{font-family:var(--d);font-weight:800;font-size:22px;margin-bottom:6px}
.od p{color:var(--mute);font-size:15.5px}
.chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px}
.chips span{font-size:13.5px;font-weight:700;padding:7px 12px;border-radius:99px;background:var(--panel2);border:1px solid var(--line)}
.nota{margin-top:14px;padding:12px 14px;border-radius:14px;background:rgba(255,179,71,.08);border:1px solid rgba(255,179,71,.28);color:#e9d3ad;font-size:14.5px;line-height:1.45}

.oferta{margin-top:74px;position:relative;border-radius:32px;padding:1.5px;background:var(--grad)}
.oferta .in{border-radius:31px;background:#141716;padding:38px 28px;text-align:center;position:relative;overflow:hidden}
.oferta .in::before{content:"";position:absolute;left:50%;top:-180px;width:560px;height:360px;transform:translateX(-50%);background:var(--grad);filter:blur(90px);opacity:.22}
.oferta .in>*{position:relative}
.oferta h2{margin:10px auto 8px;max-width:16ch}
.preco{font-family:var(--d);font-weight:800;font-size:clamp(54px,10vw,84px);line-height:1;letter-spacing:-.04em;margin-top:16px}
.preco small{font-size:.32em;letter-spacing:0;font-weight:700;color:var(--mute);margin-right:6px;vertical-align:.9em}
.parc{color:var(--mute);margin:8px 0 22px;font-size:16px}
.parc b{color:var(--ink)}
.inc{display:grid;grid-template-columns:1fr 1fr;gap:10px 22px;max-width:620px;margin:0 auto 26px;text-align:left}
.inc span{display:flex;gap:10px;font-size:15.5px;line-height:1.35}
.inc span::before{content:"";flex:none;width:20px;height:20px;border-radius:50%;background:#7fce8f url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M5.5 10.5l3 3 6-7' fill='none' stroke='%230b1a10' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")}
.oferta .btn{min-width:min(100%,360px)}
.oferta .ou{display:block;margin-top:14px;color:var(--mute);font-size:15px}

.faq{max-width:760px;margin-top:26px}
details{border-bottom:1px solid var(--line)}
summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:16px;align-items:center;padding:18px 0;font-weight:700;font-size:17px}
summary::-webkit-details-marker{display:none}
summary::after{content:"+";flex:none;font-size:22px;font-weight:400;color:#B45CFF}
details[open] summary::after{content:"–"}
details p{color:var(--mute);padding:0 0 18px;max-width:64ch;font-size:16px}

.fim{text-align:center;padding:84px 0 30px}
.fim h2{margin:12px auto 18px;max-width:15ch}
footer{text-align:center;color:var(--dim);font-size:13.5px;padding:26px 0 110px}
footer a{color:var(--mute)}
.fixo{position:fixed;left:0;right:0;bottom:0;z-index:20;display:flex;align-items:center;gap:12px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:rgba(17,19,18,.9);backdrop-filter:blur(14px);border-top:1px solid var(--line);transform:translateY(110%);transition:transform .3s}
.fixo.on{transform:none}
.fixo span{flex:1;font-size:14px;color:var(--mute);line-height:1.25}
.fixo span b{display:block;color:var(--ink);font-size:16px}
.fixo .btn{padding:13px 20px;font-size:15.5px;box-shadow:none}
.toast{pointer-events:none;position:fixed;left:50%;bottom:90px;transform:translate(-50%,20px);opacity:0;background:var(--ink);color:#111;font-weight:700;font-size:14px;padding:11px 16px;border-radius:12px;transition:all .25s;z-index:30}
.toast.on{opacity:1;transform:translate(-50%,0)}
@media (max-width:820px){
  .tres,.bens{grid-template-columns:1fr}.duo,.onde{grid-template-columns:1fr}
  .ps{display:grid;grid-template-columns:96px 1fr;gap:0 16px;align-items:center;padding:16px}
  .ps .cube i{display:none}.ps .cube{padding:10px 9px;font-size:11px}
  .ps .il{height:96px;margin:0;grid-row:span 3}.ps .bola{width:44px;height:44px}.ps .bola.v{border-width:7px}
  section{padding-top:60px}
}
@media (max-width:560px){
  body{font-size:16px}
  .w{padding:0 16px}
  nav .de{display:none}
  .hero{padding-top:18px}
  .cta .btn{width:100%}
  .tela{border-radius:20px;aspect-ratio:4/3.3}
  .refs{gap:7px}.rf{border-radius:12px}.rf span{font-size:10.5px;left:5px;bottom:5px;padding:3px 7px}
  .refb{left:10px;bottom:10px;padding:5px 11px 5px 5px}.refb canvas{width:36px;height:36px}.refb b{font-size:12.5px}
  .pct{right:10px;bottom:10px;padding:7px 11px}.pct b{font-size:19px}
  .inc{grid-template-columns:1fr}
  .oferta .in{padding:30px 18px}
}
@media (min-width:821px){.fixo{display:none}}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.rv{opacity:1;transform:none}}
</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="mg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="298" y2="231"><stop offset="0" stop-color="#FFB347"/><stop offset=".38" stop-color="#FF6FAE"/><stop offset=".7" stop-color="#B45CFF"/><stop offset="1" stop-color="#5AB8FF"/></linearGradient></defs></svg>
<div class="w">
  <nav>
    <a href="https://basefl.com/" style="text-decoration:none">__LOGO__</a>
    <a class="de" href="https://basefl.com/">Base FL</a>
    <div class="sp"></div>
    <a class="btn sm" href="#oferta">Quero o Mood</a>
  </nav>

  <header class="hero">
    <span class="mono kick">Sem saber color grading</span>
    <h1>Copie a cor de <em>qualquer vídeo</em>.</h1>
    <p class="lead">Sabe aquele vídeo com a cor que você queria no seu? Mostre ele para o Mood, mostre o seu vídeo, e baixe a <b>LUT pronta</b>. Leva menos de um minuto.</p>
    <div class="cta">
      <a class="btn" href="#oferta" data-comprar>Quero o Mood · R$ __PRECO__</a>
      <a class="btn gh" href="https://basefl.com/lut/" data-testar>Testar agora, de graça</a>
    </div>
    <p class="sob">Você testa com o seu próprio vídeo antes de comprar.</p>

    <div class="demo" id="demo">
      <div class="tela" id="tela">
        <canvas id="dA" width="800" height="500"></canvas><canvas id="dD" width="800" height="500"></canvas>
        <div class="corte" id="ct"><span>‹ ›</span></div>
        <span class="tg l">Seu vídeo</span><span class="tg r">Com a LUT do Mood</span>
        <div class="refb"><canvas id="rM" width="92" height="92"></canvas><span><small>REFERÊNCIA</small><b id="rN">–</b></span></div>
        <div class="pct"><b id="pc">–</b><small>parecido com a referência</small></div>
      </div>
      <div class="esc"><span class="mono">Toque numa referência e veja o seu vídeo mudar</span><div class="refs" id="refs"></div></div>
      <p class="real"><i></i>Demonstração de verdade: o Mood está rodando agora nesta página.</p>
    </div>
  </header>

  <section id="como">
    <span class="mono kick rv">Como funciona</span>
    <h2 class="rv">Três passos. Nenhum deles é difícil.</h2>
    <div class="tres">
      <div class="ps rv"><div class="il"><span class="bola r"></span></div><span class="n">01</span><h3>Mostre a referência</h3><p>Um print ou o próprio vídeo que tem a cor que você gostou. Filme, clipe, Reels de outro criador.</p></div>
      <div class="ps rv d1"><div class="il"><span class="par"><span class="bola r"></span><span class="bola v"></span></span></div><span class="n">02</span><h3>Mostre o seu vídeo</h3><p>O Mood lê a luz, as sombras e os tons dos dois e monta a cor na hora. Você vê o antes e depois.</p></div>
      <div class="ps rv d2"><div class="il"><span class="cube"><i>LUT Base FL </i>001.cube</span></div><span class="n">03</span><h3>Baixe a LUT</h3><p>Um arquivo pronto para aplicar no seu editor. Um clique e o vídeo inteiro fica com aquela cor.</p></div>
    </div>
  </section>

  <section>
    <span class="mono kick rv">Feito para quem edita, não para colorista</span>
    <h2 class="rv">Você não precisa entender de cor.</h2>
    <p class="sec-p rv">Colorir do jeito tradicional pede curvas, rodas de cor e muita tentativa. O Mood troca tudo isso por uma pergunta só: <b style="color:var(--ink)">qual cor você quer?</b></p>
    <div class="duo">
      <div class="cx nao rv"><h3>Sem o Mood</h3><ul><li>Horas mexendo em curva e roda de cor</li><li>Testar pack de LUT atrás de pack, e nenhum fica igual</li><li>A pele fica laranja, o céu fica estranho</li><li>Cada vídeo começa do zero</li></ul></div>
      <div class="cx sim rv d1"><h3>Com o Mood</h3><ul><li>A cor que você escolheu, em menos de um minuto</li><li>Uma LUT feita para o seu vídeo, não um look genérico</li><li>Pele natural protegida com um botão</li><li>Salvou a LUT, usa em todos os vídeos da série</li></ul></div>
    </div>
  </section>

  <section>
    <span class="mono kick rv">O que tem dentro</span>
    <h2 class="rv">Simples por fora, caprichado por dentro.</h2>
    <div class="bens">
      <div class="bem rv"><span class="ic"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z"/></svg></span><h3>Aceita o vídeo direto</h3><p>Não precisa tirar print. Solte o arquivo e o Mood lê vários momentos dele sozinho.</p></div>
      <div class="bem rv d1"><span class="ic"><svg viewBox="0 0 24 24"><path d="M4 12h16M4 6h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="#191C1B"/><circle cx="15" cy="12" r="2" fill="#191C1B"/><circle cx="8" cy="18" r="2" fill="#191C1B"/></svg></span><h3>Suave, Fiel ou Intenso</h3><p>Três botões e um controle de intensidade. O ajuste fino existe, mas fica guardado para quem quiser.</p></div>
      <div class="bem rv d2"><span class="ic"><svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/></svg></span><h3>Pele natural</h3><p>Um botão segura os tons de pele para ninguém sair laranja ou esverdeado.</p></div>
      <div class="bem rv"><span class="ic"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7v5l3 2"/></svg></span><h3>Medidor de semelhança</h3><p>Mostra em porcentagem o quanto o seu vídeo ficou parecido com a referência.</p></div>
      <div class="bem rv d1"><span class="ic"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="8" height="7" rx="1.5"/><rect x="13" y="4" width="8" height="7" rx="1.5"/><rect x="3" y="13" width="8" height="7" rx="1.5"/><rect x="13" y="13" width="8" height="7" rx="1.5"/></svg></span><h3>Confere em outras cenas</h3><p>Antes de baixar, veja a LUT aplicada em outros momentos do mesmo vídeo.</p></div>
      <div class="bem rv d2"><span class="ic"><svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></span><h3>Seus vídeos ficam com você</h3><p>Tudo acontece no seu aparelho. Nenhum vídeo ou print é enviado para lugar nenhum.</p></div>
    </div>
  </section>

  <section>
    <span class="mono kick rv">Onde funciona</span>
    <h2 class="rv">Cria no celular. Cria no computador.</h2>
    <div class="onde">
      <div class="od rv"><span class="mono">Para criar a LUT</span><h3>Celular e computador</h3><p>O Mood abre no navegador. Não precisa instalar nada: viu uma referência no celular, cria a LUT ali mesmo.</p><div class="chips"><span>iPhone</span><span>Android</span><span>Mac</span><span>Windows</span></div></div>
      <div class="od rv d1"><span class="mono">Para usar a LUT</span><h3>No seu editor</h3><p>O arquivo é o padrão do mercado (.cube), com o passo a passo de cada programa na tela.</p><div class="chips"><span>CapCut no computador</span><span>Premiere</span><span>DaVinci Resolve</span><span>Final Cut</span></div>
        <div class="nota">O CapCut do celular ainda não deixa importar LUT de fora, só o do computador. Se você edita no celular, pode criar a LUT por lá e aplicar no CapCut do computador.</div></div>
    </div>
  </section>

  <div class="oferta rv" id="oferta"><div class="in">
    <span class="mono kick">Acesso de 1 ano</span>
    <h2>Todas as cores que você quiser copiar.</h2>
    <div class="preco"><small>R$</small>__PRECO__</div>
    <p class="parc">à vista, ou <b>12x de R$ __PARC__</b></p>
    <div class="inc"><span>7 dias de garantia</span><span>LUTs ilimitadas durante 1 ano</span><span>Funciona no celular e no computador</span><span>Aula ensinando a usar</span><span>Liberado na hora da compra</span><span>Passo a passo para CapCut, Premiere, DaVinci e Final Cut</span><span>Atualizações incluídas no período</span></div>
    <a class="btn" href="#" data-comprar>Quero o Mood</a>
    <a class="ou" href="https://basefl.com/lut/" data-testar>ou teste antes, com o seu vídeo</a>
  </div></div>

  <section>
    <span class="mono kick rv">Dúvidas</span>
    <h2 class="rv">Antes de você perguntar.</h2>
    <div class="faq rv">
      <details><summary>Preciso saber color grading?</summary><p>Não. Você escolhe a referência e o Mood faz a parte técnica. Se quiser mexer, tem três botões (Suave, Fiel, Intenso) e um controle de intensidade.</p></details>
      <details><summary>Dá para usar pelo celular?</summary><p>Dá para criar e baixar a LUT pelo celular, direto no navegador. Para aplicar, hoje é o CapCut do computador que aceita LUT de fora; o do celular ainda não tem essa opção. Premiere, DaVinci Resolve e Final Cut também aceitam.</p></details>
      <details><summary>Fica igual à referência com qualquer vídeo?</summary><p>Quanto mais parecidas as cenas, mais igual fica: pessoa com pessoa, rua com rua, dia com dia. Com cenas muito diferentes, o Mood leva o clima da cor, mas não faz milagre. Por isso dá para testar de graça antes, com o seu vídeo.</p></details>
      <details><summary>E se eu comprar e não gostar?</summary><p>Você tem 7 dias de garantia. Dentro desse prazo é só pedir o reembolso e você recebe o valor de volta.</p></details>
      <details><summary>Quantas LUTs eu posso criar?</summary><p>Quantas quiser, durante 1 ano. As LUTs que você baixou são suas e continuam funcionando para sempre.</p></details>
      <details><summary>Meus vídeos são enviados para algum servidor?</summary><p>Não. A leitura das cores acontece dentro do seu aparelho. Nada é enviado.</p></details>
      <details><summary>Como recebo o acesso?</summary><p>Assim que a compra é aprovada, é só entrar na ferramenta com o e-mail da compra. Você recebe um código por e-mail, sem senha para decorar. O Mood também aparece liberado no app Base FL.</p></details>
      <details><summary>Preciso ter o app Base FL?</summary><p>Não. O Mood funciona sozinho no navegador. Ele é uma ferramenta vendida separadamente dos outros produtos da Base FL.</p></details>
    </div>
  </section>

  <div class="fim">
    <span class="mono kick rv">Mood</span>
    <h2 class="rv">A cor daquele vídeo, no seu.</h2>
    <div class="cta rv"><a class="btn" href="#oferta" data-comprar>Quero o Mood · R$ __PRECO__</a><a class="btn gh" href="https://basefl.com/lut/" data-testar>Testar agora, de graça</a></div>
  </div>
  <footer><a href="https://basefl.com/">Base FL</a> · o ecossistema do editor de vídeo</footer>
</div>
<div class="fixo" id="fixo"><span><b>Mood · R$ __PRECO__</b>ou 12x de R$ __PARC__</span><a class="btn" href="#oferta" data-comprar>Quero o Mood</a></div>
<div class="toast" id="toast"></div>

<script>
// ====== COLE AQUI o link de checkout da Greenn ======
const CHECKOUT = '__CHECKOUT__';
const PRODUTO = 'mood';
// ====================================================
const $ = s => document.querySelector(s);
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
const espera = ms => new Promise(r => setTimeout(r, ms));
function toast(m){ const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2400); }
const DE = new URLSearchParams(location.search).get('de') || 'pagina';
function linkCompra(){   // link de compra com a origem Base FL (utm); ?de=app quando vem do app
  if (!/^https?:\/\//.test(CHECKOUT)) return '';
  const u = new URL(CHECKOUT);
  u.searchParams.set('utm_source', 'basefl'); u.searchParams.set('utm_medium', DE); u.searchParams.set('utm_campaign', PRODUTO); u.searchParams.set('src', 'basefl-' + DE);
  return u.toString();
}
document.querySelectorAll('[data-comprar]').forEach(b => b.addEventListener('click', e => {
  const l = linkCompra();
  if (l){ e.preventDefault(); location.href = l; return; }
  if (b.getAttribute('href') === '#'){ e.preventDefault(); toast('Link de compra em breve.'); }   // sem checkout ainda: os outros botões só rolam até a oferta
}));
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add('vis'); io.unobserve(e.target); } }), { threshold:.12 });
document.querySelectorAll('.rv').forEach(el => io.observe(el));
// barra fixa do celular: aparece depois da primeira tela e some quando a oferta está visível
let passouTopo = false, naOferta = false; const fixo = $('#fixo'), atualizaFixo = () => fixo.classList.toggle('on', passouTopo && !naOferta);
new IntersectionObserver(es => { passouTopo = !es[0].isIntersecting; atualizaFixo(); }).observe($('.hero .cta'));
new IntersectionObserver(es => { naOferta = es[0].isIntersecting; atualizaFixo(); }, { threshold:.2 }).observe($('#oferta'));

// ===================== O MOTOR DO MOOD (o mesmo da ferramenta) =====================
const N = 33;
__MOTOR__
// ===================== a demonstração =====================
const FOTO = (id, w) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
const VIDEO = 11455928;
const REFS = [{ id:27674497, n:'Tarde' }, { id:36701246, n:'Dourado' }, { id:35161204, n:'Neon' }, { id:30933293, n:'Inverno' }];
function foto(id, w, W, H){   // carrega e recorta no formato da tela
  return new Promise((ok, erro) => { const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => { const h = Math.min(im.height, Math.round(im.width * H / W)), c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d', { willReadFrequently:true }).drawImage(im, 0, (im.height - h) * .38, im.width, h, 0, 0, W, H); ok(c); };
    im.onerror = () => erro(new Error('foto')); im.src = FOTO(id, w); });
}
(async () => {
  const tela = $('#tela'), dA = $('#dA'), dD = $('#dD'), ct = $('#ct');
  let src, S, atual = -1, mexeu = false, ocupado = false, corteX = 100, visivel = true;
  const cortar = v => { corteX = clamp(v, 0, 100); dD.style.clipPath = `inset(0 0 0 ${corteX}%)`; ct.style.left = corteX + '%'; };
  const desliza = async (para, ms) => { if (calmo){ cortar(para); return; } const de = corteX, t0 = performance.now(); await new Promise(fim => { const q = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); cortar(de + (para - de) * e); k < 1 ? requestAnimationFrame(q) : fim(); }; requestAnimationFrame(q); }); };
  cortar(100);
  try {
    src = await foto(VIDEO, 900, 800, 500); dA.getContext('2d').drawImage(src, 0, 0); dD.getContext('2d').drawImage(src, 0, 0);
    await Promise.all(REFS.map(async r => { r.cv = await foto(r.id, 500, 400, 250); }));
  } catch { $('#demo').classList.add('semfoto'); return; }
  S = amostra([src], 220);
  $('#refs').innerHTML = REFS.map((r, i) => `<button class="rf" data-i="${i}" aria-label="Referência ${r.n}"><canvas width="400" height="250"></canvas><span>${r.n}</span></button>`).join('');
  document.querySelectorAll('.rf').forEach((b, i) => { b.querySelector('canvas').getContext('2d').drawImage(REFS[i].cv, 0, 0); b.onclick = () => { mexeu = true; escolhe(i); }; });
  async function escolhe(i){
    if (ocupado || i === atual) return; ocupado = true; atual = i; const r = REFS[i];
    document.querySelectorAll('.rf').forEach((b, k) => b.classList.toggle('on', k === i));
    $('#rN').textContent = r.n; const m = $('#rM').getContext('2d'); m.drawImage(r.cv, 75, 0, 250, 250, 0, 0, 92, 92);
    tela.classList.add('lendo'); await desliza(100, 260); await espera(30);
    if (!r.lut){ prepara(S, amostra([r.cv], 220)); A = { ...PADRAO }; LUT = null; montaLUT(); r.lut = LUT; r.pct = semelhanca(); }
    LUT = r.lut; aplica(src, dD);
    await espera(calmo ? 0 : 380); tela.classList.remove('lendo');
    $('#pc').textContent = r.pct + '%';
    await desliza(mexeu ? 30 : 0, 900); if (!mexeu){ await espera(1500); await desliza(50, 700); }
    ocupado = false;
  }
  let arr = false;
  const mov = e => { const q = tela.getBoundingClientRect(); cortar((e.clientX - q.left) / q.width * 100); };
  tela.onpointerdown = e => { if (ocupado) return; mexeu = true; arr = true; tela.setPointerCapture(e.pointerId); mov(e); };
  tela.onpointermove = e => { if (arr) mov(e); }; tela.onpointerup = tela.onpointercancel = () => arr = false;
  new IntersectionObserver(es => { visivel = es[0].isIntersecting; }, { threshold:.2 }).observe(tela);
  await escolhe(0);
  while (!mexeu){ await espera(2200); if (mexeu) break; if (visivel && !ocupado) await escolhe((atual + 1) % REFS.length); }
})();
</script>
</body>
</html>
'''
out = (HTML.replace('__MOTOR__', motor).replace('__LOGO__', LOGO).replace('__PRECO__', str(PRECO)).replace('__PARC__', PARC).replace('__CHECKOUT__', CHECKOUT))
dest = os.path.join(RAIZ, 'conheca/mood/index.html')
os.makedirs(os.path.dirname(dest), exist_ok=True)
open(dest, 'w', encoding='utf-8').write(out)
print('ok', len(out), '12x de', PARC)

# ===== página curta de UPSELL (aparece depois da compra das Legendas) =====
CHECKOUT_UPSELL = ''                    # vazio de propósito: o botão de compra desta página é o upsell de 1 clique da Greenn (abaixo)
UPSELL_ID = '6786'                      # número do upsell 'Upsell Mood' criado na Greenn
RECUSA = 'https://basefl.com/'          # para onde vai quem recusa: a página de baixar o app
cab = out[:out.index('<body>')].replace('<title>Mood — copie a cor de qualquer vídeo | Base FL</title>', '<title>Uma oferta antes de continuar — Mood</title>\n<meta name="robots" content="noindex">')
demo = out[out.index('    <div class="demo" id="demo">'):out.index('  </header>')]
script = out[out.index('<script>'):out.index('</body>')]
script = script.replace("const CHECKOUT = '" + CHECKOUT + "';", "const CHECKOUT = '" + CHECKOUT_UPSELL + "';").replace("|| 'pagina';", "|| 'upsell';")
corpo = f"""<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="mg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="298" y2="231"><stop offset="0" stop-color="#FFB347"/><stop offset=".38" stop-color="#FF6FAE"/><stop offset=".7" stop-color="#B45CFF"/><stop offset="1" stop-color="#5AB8FF"/></linearGradient></defs></svg>
<style>
.okb{{display:flex;align-items:center;justify-content:center;gap:10px;margin:18px auto 0;max-width:560px;padding:11px 16px;border-radius:14px;background:rgba(127,206,143,.10);border:1px solid rgba(127,206,143,.35);color:#bfe9c8;font-size:15px;font-weight:600}}
.okb i{{flex:none;width:20px;height:20px;border-radius:50%;background:#7fce8f url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M5.5 10.5l3 3 6-7' fill='none' stroke='%230b1a10' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")}}
.hero{{padding-top:22px}} h1{{font-size:clamp(32px,6vw,58px);max-width:16ch}}
.nao{{display:block;margin:16px auto 0;color:var(--mute);font-size:15px;text-underline-offset:3px}}
.oferta{{margin-top:44px}} footer{{padding-bottom:110px}}
.btn.gu{{font-family:var(--f);min-height:58px;min-width:min(100%,360px)}} .btn.gu svg{{width:28px;height:28px}} .btn.gu svg path{{fill:#14070e}}
.um{{color:var(--dim);font-size:13.5px;margin-top:14px}}
</style>
<div class="w">
  <nav><span>{LOGO}</span><span class="de">Base FL</span><div class="sp"></div></nav>
  <div class="okb"><i></i>Compra confirmada. Seu acesso aos Títulos Dinâmicos chega no e-mail.</div>
  <header class="hero">
    <span class="mono kick">Só nesta página</span>
    <h1>Antes de ir: e a <em>cor</em> dos seus vídeos?</h1>
    <p class="lead">Você já resolveu os títulos. O <b>Mood</b> resolve a cor: mostre um vídeo com a cor que você gosta, mostre o seu, e baixe a LUT pronta para o CapCut. Sem saber color grading.</p>
    <div class="cta"><a class="btn" href="#oferta" data-comprar>Sim, quero o Mood · R$ {PRECO}</a></div>
{demo}  </header>

  <div class="oferta rv" id="oferta"><div class="in">
    <span class="mono kick">Acesso de 1 ano</span>
    <h2>Adicione o Mood ao seu pedido.</h2>
    <div class="preco"><small>R$</small>{PRECO}</div>
    <p class="parc">à vista, ou <b>12x de R$ {PARC}</b></p>
    <div class="inc"><span>7 dias de garantia</span><span>LUTs ilimitadas durante 1 ano</span><span>Cria no celular e no computador</span><span>Aula ensinando a usar</span><span>Aparece liberado no mesmo app</span></div>
    <!-- Botão de upsell de 1 clique da Greenn. NÃO mexer no atributo data-greenn-upsell. -->
    <button class="btn gu" data-greenn-upsell="{UPSELL_ID}" data-loading="false" onclick="startLoading(this)">Sim, quero o Mood</button>
    <a class="nao" id="not-buy-link" href="{RECUSA}" rel="noopener noreferrer">Não, obrigado. Quero só os Títulos Dinâmicos.</a>
    <p class="um">Um clique e pronto: usa o mesmo pagamento da compra que você acabou de fazer.</p>
  </div></div>
  <footer><a href="https://basefl.com/">Base FL</a> · o ecossistema do editor de vídeo</footer>
</div>
<div class="fixo" id="fixo"><span><b>Mood · R$ {PRECO}</b>ou 12x de R$ {PARC}</span><a class="btn" href="#oferta" data-comprar>Sim, quero</a></div>
<div class="toast" id="toast"></div>
"""
GREENN = r"""<script> window.startLoading = function(button) { const originalHTML = button.innerHTML; button.setAttribute('data-loading', 'true'); button.innerHTML = ` <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"> <path fill="#ffffff" d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/> <path fill="#ffffff" d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z"> <animateTransform attributeName="transform" dur="0.75s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/> </path> </svg>`; setTimeout(() => { button.setAttribute('data-loading', 'false'); button.innerHTML = originalHTML; }, 3000); }; (function (w, d, s, t) { if (w._greennUp) return; w._greennUp = t; var f = d.getElementsByTagName(s)[0], j = d.createElement(s); j.async = true; j.src = "https://payfast.greenn.com.br/assets/upsell.js?v=" + t; f.parentNode.insertBefore(j, f); })(window, document, "script", Date.now()); </script>
"""
up = cab + corpo + GREENN + script + '</body>\n</html>\n'
d2 = os.path.join(RAIZ, 'oferta/mood/index.html'); os.makedirs(os.path.dirname(d2), exist_ok=True)
open(d2, 'w', encoding='utf-8').write(up); print('upsell ok', len(up))
