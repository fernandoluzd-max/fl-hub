/* Base FL — AVALIAÇÃO DO APP (carinhas)
   Um módulo só, carregado no app (ui/aval.js). Abre uma vez depois de uma instalação bem-sucedida
   (momento bom), e também pode ser aberto na mão pelo botão "Avaliar".
   - Carinhas animadas (Péssimo → Excelente), com somzinho e confete nas notas altas.
   - Nota alta: comemora e convida a comentar/compartilhar.
   - Nota baixa: pergunta o que melhorar e oferece o suporte (a reclamação vem em privado, não vira nota pública).
   Liga/desliga por um arquivo: /aval.json  ->  { "ativo": true, "titulo": "...", "sub": "..." }
   Nada é mostrado se "ativo" for false.
   Integração (no app): Aval.init({ enviar, versao, suporte, abrirLink }). */
(function () {
  if (window.Aval) return;
  var K = '242,165,65';
  var mem = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var noSite = /^https?:$/.test(location.protocol) && /(^|\.)basefl\.com$|^localhost$|^127\.0\.0\.1$/.test(location.hostname);
  var RAIZ = noSite ? '' : 'https://basefl.com';

  var cfg = { ativo: false, titulo: 'O que você está achando do Base FL?', sub: 'Sua opinião ajuda a melhorar o app. Leva 5 segundos.' };
  var hooks = { enviar: null, versao: function () { return ''; }, suporte: null, abrirLink: null };
  var carregou = false, aberta = null;

  /* ---------- carinhas (SVG, desenhadas no padrão do app) ---------- */
  // cada carinha: olhos + boca que muda do triste ao feliz
  var CARAS = [
    { v: 1, nome: 'Péssimo', cor: '233,88,80', olho: 'M8.5 9.8l2.6 2.6M11.1 9.8l-2.6 2.6 M15.5 9.8l2.6 2.6M18.1 9.8l-2.6 2.6', boca: 'M8.6 17.4q4.4-4 8.8 0' },
    { v: 2, nome: 'Ruim', cor: '232,140,70', olho: 'M9.8 11.2h0.02M16.2 11.2h0.02', boca: 'M9 16.6q3.6-1.8 8 0' },
    { v: 3, nome: 'Ok', cor: '226,196,74', olho: 'M9.8 11h0.02M16.2 11h0.02', boca: 'M9 16.1h8' },
    { v: 4, nome: 'Bom', cor: '150,200,96', olho: 'M9.8 11h0.02M16.2 11h0.02', boca: 'M8.8 15.2q4.2 3.2 8.4 0' },
    { v: 5, nome: 'Excelente', cor: '90,198,120', olho: 'M8.6 11.4q1.2-1.6 2.4 0M15 11.4q1.2-1.6 2.4 0', boca: 'M8.2 14.6q4.3 4.6 8.6 0' }
  ];
  function svgCara(c) {
    return '<svg viewBox="0 0 26 26" aria-hidden="true">' +
      '<circle class="rosto" cx="13" cy="13" r="11"/>' +
      '<path class="tr" d="' + c.olho + '"/>' +
      '<path class="tr boca" d="' + c.boca + '"/></svg>';
  }

  /* ---------- som (sintetizado, sem arquivo; só no clique) ---------- */
  var ac = null;
  function audio() { if (ac) return ac; try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } return ac; }
  function tom(freq, t0, dur, vol, tipo) {
    var a = audio(); if (!a) return;
    try {
      var o = a.createOscillator(), g = a.createGain();
      o.type = tipo || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) {}
  }
  function somPop(nota) { var a = audio(); if (!a) return; if (a.state === 'suspended') { try { a.resume(); } catch (e) {} } var f = 420 + (nota || 3) * 70; tom(f, a.currentTime, 0.12, 0.09, 'triangle'); }
  function somAlegre() { var a = audio(); if (!a) return; if (a.state === 'suspended') { try { a.resume(); } catch (e) {} } var t = a.currentTime, n = [523.25, 659.25, 783.99, 1046.5]; n.forEach(function (f, i) { tom(f, t + i * 0.09, 0.22, 0.08, 'triangle'); }); }
  function somSuave() { var a = audio(); if (!a) return; if (a.state === 'suspended') { try { a.resume(); } catch (e) {} } var t = a.currentTime; tom(392, t, 0.26, 0.07, 'sine'); tom(523.25, t + 0.1, 0.26, 0.06, 'sine'); }

  /* ---------- confete ---------- */
  function confete(host) {
    var cx = cria('div', 'avl-cf'); host.appendChild(cx);
    var cores = ['rgb(' + K + ')', '#5ac678', '#96c860', '#F4F0E4', '#ffd27a'];
    for (var i = 0; i < 46; i++) {
      var p = cria('i'); var x = (Math.random() * 100), r = (Math.random() * 360) | 0, d = 0.9 + Math.random() * 0.8, delay = Math.random() * 0.18, sz = 6 + Math.random() * 7;
      p.style.cssText = 'left:' + x + '%;width:' + sz + 'px;height:' + (sz * 0.5) + 'px;background:' + cores[i % cores.length] + ';animation-duration:' + d + 's;animation-delay:' + delay + 's;transform:rotate(' + r + 'deg)';
      cx.appendChild(p);
    }
    setTimeout(function () { if (cx.parentNode) cx.parentNode.removeChild(cx); }, 2200);
  }

  /* ---------- util ---------- */
  function cria(t, c) { var e = document.createElement(t); if (c) e.className = c; return e; }
  function texto(v, max) { return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : ''; }
  function feito() { return mem.get('fl_aval_feito') === '1'; }
  function dispensado() { return mem.get('fl_aval_nao') === '1'; }

  /* ---------- estilo ---------- */
  var CSS = '\
.avl{position:fixed;inset:0;z-index:9200;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(8,9,9,.80);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);opacity:0;transition:opacity .22s;font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#F4F0E4;--k:' + K + ';-webkit-user-select:none;user-select:none}\
.avl.on{opacity:1}\
.avl *{box-sizing:border-box}\
.avl-cx{position:relative;width:100%;max-width:440px;background:linear-gradient(180deg,#171a18,#121514);border:1px solid #262D28;border-radius:22px;padding:26px 24px 22px;box-shadow:0 30px 80px rgba(0,0,0,.5);transform:translateY(10px) scale(.98);transition:transform .25s cubic-bezier(.2,.9,.3,1.2);overflow:hidden}\
.avl.on .avl-cx{transform:none}\
.avl-x{position:absolute;top:12px;right:12px;width:34px;height:34px;display:grid;place-items:center;border:0;background:transparent;color:#9d998c;border-radius:10px;cursor:pointer}\
.avl-x:hover{background:rgba(127,127,127,.14);color:#F4F0E4}\
.avl-x svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round}\
.avl-h{text-align:center;margin-bottom:18px}\
.avl-selo{display:inline-block;font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgb(var(--k));margin-bottom:9px}\
.avl-h h3{font-family:"Archivo",inherit;font-weight:800;font-size:21px;line-height:1.2;margin:0 0 6px}\
.avl-h p{font-size:13.5px;line-height:1.45;color:#B3B4A2;margin:0;max-width:34ch;margin-inline:auto}\
.avl-caras{display:flex;justify-content:center;gap:6px;margin:4px 0 6px}\
.avl-c{position:relative;flex:1;max-width:72px;border:0;background:transparent;cursor:pointer;padding:8px 2px 6px;border-radius:14px;transition:transform .16s cubic-bezier(.2,.9,.3,1.3),background .15s;-webkit-tap-highlight-color:transparent}\
.avl-c:hover{background:rgba(255,255,255,.04)}\
.avl-c svg{width:100%;height:auto;max-width:48px;display:block;margin:0 auto;overflow:visible}\
.avl-c .rosto{fill:rgba(127,127,127,.14);stroke:#6f6f68;stroke-width:1.4;transition:fill .18s,stroke .18s}\
.avl-c .tr{fill:none;stroke:#8a877d;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;transition:stroke .18s}\
.avl-c .boca{stroke-width:2.1}\
.avl-lab{display:block;margin-top:5px;font-size:10.5px;font-weight:700;letter-spacing:.02em;color:#8a877d;transition:color .18s;white-space:nowrap}\
.avl-c:hover{transform:translateY(-4px) scale(1.09)}\
.avl-c:hover .rosto,.avl-c.sel .rosto{fill:rgba(var(--cc),.20);stroke:rgb(var(--cc))}\
.avl-c:hover .tr,.avl-c.sel .tr{stroke:rgb(var(--cc))}\
.avl-c:hover .avl-lab,.avl-c.sel .avl-lab{color:rgb(var(--cc))}\
.avl-c.sel{transform:translateY(-4px) scale(1.16);animation:avlpop .45s cubic-bezier(.2,.9,.3,1.4)}\
.avl-c.sel .rosto{fill:rgba(var(--cc),.26)}\
.avl-c.apaga{opacity:.32;transform:scale(.9)}\
@keyframes avlpop{0%{transform:translateY(-4px) scale(1)}45%{transform:translateY(-8px) scale(1.28)}100%{transform:translateY(-4px) scale(1.16)}}\
.avl-prog{height:6px;border-radius:99px;background:rgba(127,127,127,.16);overflow:hidden;margin:10px 30px 0}\
.avl-prog i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#e95850,#e2c44a 55%,#5ac678);transition:width .4s cubic-bezier(.2,.9,.3,1)}\
.avl-fim{overflow:hidden;max-height:0;opacity:0;transition:max-height .4s ease,opacity .3s ease,margin .3s}\
.avl-fim.ab{max-height:360px;opacity:1;margin-top:16px}\
.avl-msg{text-align:center;font-family:"Archivo",inherit;font-weight:800;font-size:18px;margin:0 0 4px}\
.avl-msg2{text-align:center;font-size:13px;color:#B3B4A2;margin:0 auto 12px;max-width:32ch;line-height:1.45}\
.avl-ta{width:100%;min-height:74px;resize:vertical;border-radius:12px;border:1px solid #2B302E;background:#0f1211;color:#F4F0E4;padding:11px 12px;font:inherit;font-size:13.5px;line-height:1.4;outline:none;transition:border-color .15s}\
.avl-ta:focus{border-color:rgb(var(--k))}\
.avl-ta::placeholder{color:#6f6f68}\
.avl-bs{display:flex;flex-wrap:wrap;gap:9px;margin-top:12px}\
.avl-b{all:unset;box-sizing:border-box;flex:1;min-width:130px;display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:48px;padding:0 16px;border-radius:13px;font:800 14.5px/1.2 "Archivo",inherit;cursor:pointer;text-align:center;transition:filter .15s,transform .12s,background .15s;position:relative;overflow:hidden}\
.avl-b.pri{background:rgb(var(--k));color:#1a1205;box-shadow:0 8px 22px rgba(var(--k),.32)}\
.avl-b.pri::before{content:"";position:absolute;top:0;left:-65%;width:48%;height:100%;background:linear-gradient(100deg,rgba(255,255,255,0),rgba(255,255,255,.55),rgba(255,255,255,0));transform:skewX(-18deg);animation:avlsh 3.4s ease-in-out infinite}\
.avl-b.pri:hover{filter:brightness(1.05)}.avl-b:active{transform:scale(.98)}\
.avl-b.gh{background:transparent;border:1px solid #2B302E;color:#F4F0E4}\
.avl-b.gh:hover{background:#1d2120}\
.avl-b svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;position:relative;z-index:1}\
.avl-b span{position:relative;z-index:1}\
.avl-cf{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:5}\
.avl-cf i{position:absolute;top:-14px;border-radius:2px;animation:avlfall linear forwards;opacity:.95}\
@keyframes avlfall{to{transform:translateY(560px) rotate(540deg);opacity:0}}\
@keyframes avlsh{0%{left:-65%}26%{left:135%}100%{left:135%}}\
@media (max-width:480px){.avl{align-items:flex-end;padding:0}.avl-cx{max-width:none;border-radius:22px 22px 0 0;padding:24px 18px calc(20px + env(safe-area-inset-bottom))}.avl-caras{gap:3px}.avl-lab{font-size:9.5px}}\
@media (prefers-reduced-motion:reduce){.avl,.avl-cx,.avl-c,.avl-c.sel,.avl-b.pri::before,.avl-cf i{transition:none;animation:none}}\
';
  function estilo() { if (document.getElementById('avl-css')) return; var s = cria('style'); s.id = 'avl-css'; s.textContent = CSS; document.head.appendChild(s); }

  var IC = { x: '<svg viewBox="0 0 16 16"><path d="M3 3l10 10M13 3L3 13"/></svg>', dir: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>', chat: '<svg viewBox="0 0 24 24"><path d="M5 5h14v10H9l-4 4z"/></svg>' };

  /* ---------- carregar config ---------- */
  function carrega() {
    if (carregou) return Promise.resolve(cfg);
    return fetch(RAIZ + '/aval.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) { carregou = true; cfg = { ativo: j && j.ativo === true, titulo: texto(j && j.titulo, 80) || cfg.titulo, sub: texto(j && j.sub, 160) || cfg.sub }; return cfg; })
      .catch(function () { carregou = true; cfg = { ativo: false, titulo: cfg.titulo, sub: cfg.sub }; return cfg; });
  }

  function elegivel() { return cfg.ativo && !feito() && !dispensado(); }

  /* ---------- abrir ---------- */
  function fecha() { if (!aberta) return; var el = aberta; aberta = null; el.classList.remove('on'); document.removeEventListener('keydown', el._tecla, true); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 240); }

  function abrir(manual) {
    if (aberta) return true;
    if (!cfg.ativo) return false;
    if (!manual && !elegivel()) return false;
    estilo();
    var el = cria('div', 'avl'); el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Avaliar o Base FL');
    el.innerHTML = '<div class="avl-cx"><button class="avl-x" type="button" aria-label="Fechar">' + IC.x + '</button>' +
      '<div class="avl-h"><span class="avl-selo">Sua opinião</span><h3></h3><p></p></div>' +
      '<div class="avl-caras"></div><div class="avl-prog"><i></i></div>' +
      '<div class="avl-fim"></div></div>';
    el.querySelector('.avl-h h3').textContent = cfg.titulo;
    el.querySelector('.avl-h p').textContent = cfg.sub;
    var caras = el.querySelector('.avl-caras'), prog = el.querySelector('.avl-prog i'), fim = el.querySelector('.avl-fim'), escolhida = 0;

    CARAS.forEach(function (c) {
      var b = cria('button', 'avl-c'); b.type = 'button'; b.style.setProperty('--cc', c.cor); b.setAttribute('aria-label', c.nome);
      b.innerHTML = svgCara(c) + '<span class="avl-lab">' + c.nome + '</span>';
      b.onmouseenter = function () { if (!escolhida) prog.style.width = (c.v * 20) + '%'; };
      b.onclick = function () { escolhe(c, b); };
      caras.appendChild(b);
    });
    caras.onmouseleave = function () { if (!escolhida) prog.style.width = '0%'; };

    function escolhe(c, b) {
      escolhida = c.v;
      [].forEach.call(caras.children, function (x) { x.classList.remove('sel'); x.classList.add('apaga'); });
      b.classList.remove('apaga'); b.classList.add('sel');
      prog.style.width = (c.v * 20) + '%';
      somPop(c.v);
      var alta = c.v >= 4;
      if (alta) { confete(el.querySelector('.avl-cx')); somAlegre(); } else somSuave();
      montaFim(c, alta);
    }

    function montaFim(c, alta) {
      var msg = alta ? (c.v === 5 ? 'Uhuul! Que alegria! 🎉' : 'Que bom que está curtindo! 🙌') : 'Obrigado por contar!';
      var sub = alta ? 'Se puder, deixa um comentário rapidinho (opcional).' : 'O que a gente pode melhorar? Isso vai direto pra equipe.';
      fim.innerHTML = '<p class="avl-msg"></p><p class="avl-msg2"></p>' +
        '<textarea class="avl-ta" maxlength="1000" placeholder="' + (alta ? 'O que você mais gostou?' : 'Conta rapidinho o que aconteceu…') + '"></textarea>' +
        '<div class="avl-bs"></div>';
      fim.querySelector('.avl-msg').textContent = msg;
      fim.querySelector('.avl-msg2').textContent = sub;
      var bs = fim.querySelector('.avl-bs');
      var env = cria('button', 'avl-b pri'); env.type = 'button'; env.innerHTML = '<span>Enviar</span>' + IC.dir;
      env.onclick = function () { enviar(c.v, fim.querySelector('.avl-ta').value, alta); };
      bs.appendChild(env);
      if (!alta && hooks.suporte) {
        var sup = cria('button', 'avl-b gh'); sup.type = 'button'; sup.innerHTML = IC.chat + '<span>Falar com o suporte</span>';
        sup.onclick = function () { marca(); try { hooks.suporte(); } catch (e) {} fecha(); };
        bs.appendChild(sup);
      }
      void fim.offsetWidth; fim.classList.add('ab');
      try { fim.querySelector('.avl-ta').focus({ preventScroll: true }); } catch (e) {}
    }

    function enviar(nota, com, alta) {
      marca();
      var bs = fim.querySelector('.avl-bs'); if (bs) { [].forEach.call(bs.querySelectorAll('button'), function (x) { x.disabled = true; }); }
      var app = ''; try { app = String(hooks.versao() || ''); } catch (e) {}
      var p = hooks.enviar ? hooks.enviar(nota, texto(com, 1000), app) : Promise.resolve();
      Promise.resolve(p).catch(function () {}).then(function () {
        fim.innerHTML = '<p class="avl-msg">Valeu demais! 💛</p><p class="avl-msg2">' + (alta ? 'Sua avaliação foi registrada. Obrigado por fazer parte do Base FL!' : 'Recebemos seu recado. Vamos cuidar disso.') + '</p><div class="avl-bs"></div>';
        var ok = cria('button', 'avl-b pri'); ok.type = 'button'; ok.innerHTML = '<span>Fechar</span>'; ok.onclick = fecha; fim.querySelector('.avl-bs').appendChild(ok);
        setTimeout(fecha, 2600);
      });
    }

    el._tecla = function (e) { if (aberta === el && e.key === 'Escape') { e.preventDefault(); naoAgora(); } };
    function naoAgora() { if (!feito()) mem.set('fl_aval_nao', '1'); fecha(); }
    el.querySelector('.avl-x').onclick = naoAgora;
    el.onmousedown = function (e) { el._fora = e.target === el; };
    el.onclick = function (e) { if (e.target === el && el._fora) naoAgora(); };
    document.addEventListener('keydown', el._tecla, true);
    document.body.appendChild(el); aberta = el; void el.offsetWidth; el.classList.add('on');
    try { audio(); } catch (e) {}
    return true;
  }
  function marca() { mem.set('fl_aval_feito', '1'); }

  /* ---------- API ---------- */
  window.Aval = {
    init: function (h) { h = h || {}; if (typeof h.enviar === 'function') hooks.enviar = h.enviar; if (typeof h.versao === 'function') hooks.versao = h.versao; if (typeof h.suporte === 'function') hooks.suporte = h.suporte; if (typeof h.abrirLink === 'function') hooks.abrirLink = h.abrirLink; carrega(); },
    aposInstalar: function () { carrega().then(function () { if (elegivel()) setTimeout(function () { abrir(false); }, 900); }); },
    abrir: function () { return carrega().then(function () { return abrir(true); }); },
    elegivel: function () { return elegivel(); },
    jaAvaliou: function () { return feito(); },
    recarrega: function () { carregou = false; return carrega(); }
  };
})();
