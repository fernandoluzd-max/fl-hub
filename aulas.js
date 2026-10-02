/* Base FL · Aulas
   Player próprio + janela de aulas, usado no app e nas ferramentas do site.
   Fonte única: este arquivo na raiz do site. O app usa uma cópia idêntica em ui/aulas.js.
   A lista de aulas vem da tabela "aulas" do Supabase: para pôr ou trocar um vídeo, edite a tabela, sem mexer no app. */
(function () {
  if (window.Aulas) return;
  var SUPA = { url: 'https://otlaexuqyavpzxwzcsfo.supabase.co', key: 'sb_publishable_bAaw1t6NpZEgH8ePBztQWg_tE4kDfQR' };
  var lista = null, pedido = null, ouvintes = [];
  var mem = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var chave = function (a) { return 'fl_aula_' + a.id; };

  function carrega() {
    if (pedido) return pedido;
    pedido = fetch(SUPA.url + '/rest/v1/aulas?select=id,pack_id,titulo,descricao,url,capa,duracao,ordem,so_cliente&ativo=eq.true&order=ordem.asc', { headers: { apikey: SUPA.key, Authorization: 'Bearer ' + SUPA.key } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (j) { lista = Array.isArray(j) ? j.filter(function (a) { return a.url; }) : []; ouvintes.forEach(function (f) { try { f(); } catch (e) {} }); return lista; })
      .catch(function () { lista = []; return lista; });
    return pedido;
  }
  function de(packs) { packs = [].concat(packs); return (lista || []).filter(function (a) { return packs.indexOf(a.pack_id) >= 0; }).sort(function (a, b) { return packs.indexOf(a.pack_id) - packs.indexOf(b.pack_id) || (a.ordem || 0) - (b.ordem || 0); }); }
  function tem(packs) { return de(packs).length > 0; }
  var tempo = function (s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  var CSS = '\
.fla{position:fixed;top:0;left:0;right:0;bottom:0;z-index:9000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(8,9,9,.78);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);opacity:0;transition:opacity .2s;font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#F4F0E4;--k:242,165,65}\
.fla.on{opacity:1}\
.fla *{box-sizing:border-box}\
.fla-cx{width:100%;max-width:1040px;max-height:100%;display:flex;flex-direction:column;background:#151817;border:1px solid #2B302E;border-radius:22px;overflow:hidden;box-shadow:0 40px 90px -30px #000;transform:translateY(10px) scale(.985);transition:transform .25s cubic-bezier(.2,.8,.2,1)}\
.fla.on .fla-cx{transform:none}\
.fla-top{display:flex;align-items:center;gap:12px;padding:14px 16px 14px 18px;border-bottom:1px solid #262b29}\
.fla-top small{display:block;font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:rgb(var(--k))}\
.fla-top b{display:block;font-family:"Archivo",inherit;font-weight:800;font-size:17px;line-height:1.2}\
.fla-x{margin-left:auto;flex:none;width:36px;height:36px;border-radius:50%;border:1px solid #2B302E;background:#1d2120;color:#F4F0E4;font-size:15px;cursor:pointer}\
.fla-x:hover{background:#262b29}\
.fla-co{display:grid;grid-template-columns:minmax(0,1fr) 300px;min-height:0;flex:1}\
.fla-co.so{grid-template-columns:minmax(0,1fr)}\
.fla-pl{position:relative;background:#000;aspect-ratio:16/9;align-self:start;overflow:hidden;-webkit-user-select:none;user-select:none}\
.fla-pl video{position:absolute;top:0;left:0;width:100%;height:100%;display:block;background:#000}\
.fla-pl:fullscreen{aspect-ratio:auto;width:100%;height:100%}\
.fla-pl:-webkit-full-screen{aspect-ratio:auto;width:100%;height:100%}\
.fla-gr{position:absolute;top:50%;left:50%;width:76px;height:76px;margin:-38px 0 0 -38px;border-radius:50%;border:0;cursor:pointer;background:rgb(var(--k));color:#141615;display:grid;place-items:center;box-shadow:0 14px 40px -10px rgba(var(--k),.9);transition:transform .15s,opacity .2s}\
.fla-gr:hover{transform:scale(1.06)}\
.fla-gr svg{width:30px;height:30px;margin-left:4px;fill:currentColor}\
.fla-pl.toca .fla-gr{opacity:0;pointer-events:none}\
.fla-esp{position:absolute;top:50%;left:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid rgba(255,255,255,.2);border-top-color:#fff;animation:flagira .8s linear infinite;display:none;pointer-events:none}\
.fla-pl.esp .fla-esp{display:block}.fla-pl.esp .fla-gr{opacity:0}\
@keyframes flagira{to{transform:rotate(360deg)}}\
.fla-ct{position:absolute;left:0;right:0;bottom:0;padding:34px 14px 12px;background:linear-gradient(transparent,rgba(0,0,0,.82));display:flex;flex-direction:column;gap:8px;transition:opacity .25s;pointer-events:none}\
.fla-ct>*{pointer-events:auto}\
.fla-pl.some .fla-ct{opacity:0}.fla-pl.some .fla-ct>*{pointer-events:none}.fla-pl.some{cursor:none}\
.fla-bar{position:relative;height:16px;cursor:pointer;display:flex;align-items:center;touch-action:none}\
.fla-bar i{position:absolute;left:0;height:5px;border-radius:5px;pointer-events:none}\
.fla-bar .f{right:0;background:rgba(255,255,255,.22)}.fla-bar .b{background:rgba(255,255,255,.34)}.fla-bar .p{background:rgb(var(--k))}\
.fla-bar .d{position:absolute;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.5);pointer-events:none;transform:scale(0);transition:transform .15s}\
.fla-bar:hover .d,.fla-bar.arr .d{transform:scale(1)}\
.fla-ln{display:flex;align-items:center;gap:6px}\
.fla-ln button{flex:none;height:34px;min-width:34px;padding:0 8px;border:0;border-radius:9px;background:transparent;color:#fff;cursor:pointer;display:grid;place-items:center;font:700 13px/1 inherit;font-family:inherit}\
.fla-ln button:hover{background:rgba(255,255,255,.14)}\
.fla-ln svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}\
.fla-ln .cheio{fill:currentColor;stroke:none}\
.fla-tm{font-size:13px;font-variant-numeric:tabular-nums;color:#e8e6dc;margin:0 6px}\
.fla-ln .sp{flex:1}\
.fla-er{position:absolute;top:0;left:0;right:0;bottom:0;display:none;align-items:center;justify-content:center;text-align:center;padding:24px;background:#0c0d0d;color:#B3B4A2;font-size:15px;line-height:1.5}\
.fla-pl.erro .fla-er{display:flex}.fla-pl.erro .fla-gr,.fla-pl.erro .fla-ct{display:none}\
.fla-er b{display:block;color:#F4F0E4;font-size:17px;margin-bottom:4px}\
.fla-inf{padding:14px 18px 16px;border-top:1px solid #262b29}\
.fla-inf b{display:block;font-family:"Archivo",inherit;font-weight:800;font-size:18px}\
.fla-inf p{color:#B3B4A2;font-size:14.5px;line-height:1.45;margin-top:3px}\
.fla-li{border-left:1px solid #262b29;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:6px;min-height:0}\
.fla-it{display:flex;gap:11px;align-items:center;text-align:left;width:100%;padding:10px;border-radius:13px;border:1px solid transparent;background:transparent;color:inherit;cursor:pointer;font:inherit}\
.fla-it:hover{background:#1d2120}\
.fla-it.on{background:#1d2120;border-color:rgba(var(--k),.55)}\
.fla-it .n{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:12.5px;font-weight:800;background:#262b29;color:#B3B4A2}\
.fla-it.on .n{background:rgb(var(--k));color:#141615}\
.fla-it.ok .n{background:#7fce8f;color:#0b1a10}\
.fla-it>span:last-child{min-width:0}\
.fla-it b{display:block;font-size:14.5px;line-height:1.3}\
.fla-it small{display:block;color:#8d8e80;font-size:12.5px;margin-top:1px}\
.fla-pg{padding:6px 10px 10px;border-bottom:1px solid #262b29;margin-bottom:4px}\
.fla-pg span{display:flex;justify-content:space-between;font-size:12.5px;color:#B3B4A2;margin-bottom:7px}\
.fla-pg span b{color:#F4F0E4;font-weight:700}\
.fla-pg i{display:block;height:5px;border-radius:5px;background:#262b29;overflow:hidden}\
.fla-pg i u{display:block;height:100%;border-radius:5px;background:rgb(var(--k));transition:width .4s ease}\
.fla-au{display:flex;align-items:center;gap:9px;padding:8px 10px;margin-top:auto;font-size:13px;color:#B3B4A2;cursor:pointer;border-top:1px solid #262b29;padding-top:12px}\
.fla-au .tg{flex:none;width:36px;height:21px;border-radius:21px;background:#2c322e;position:relative;transition:background .2s}\
.fla-au .tg::after{content:"";position:absolute;left:3px;top:3px;width:15px;height:15px;border-radius:50%;background:#fff;transition:transform .2s}\
.fla-au.on .tg{background:rgb(var(--k))}.fla-au.on .tg::after{transform:translateX(15px)}\
.fla-px{position:absolute;top:0;left:0;right:0;bottom:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;padding:20px;background:rgba(8,9,9,.86)}\
.fla-pl.fim .fla-px{display:flex}.fla-pl.fim .fla-gr,.fla-pl.fim .fla-ct{display:none}\
.fla-px small{font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:rgb(var(--k))}\
.fla-px b{font-family:"Archivo",inherit;font-weight:800;font-size:22px;line-height:1.2;max-width:22ch}\
.fla-px .rd{position:relative;width:64px;height:64px;margin:10px 0 6px}\
.fla-px .rd svg{width:64px;height:64px;transform:rotate(-90deg)}\
.fla-px .rd circle{fill:none;stroke-width:4}\
.fla-px .rd .t{stroke:rgba(255,255,255,.16)}.fla-px .rd .c{stroke:rgb(var(--k));stroke-linecap:round;stroke-dasharray:176;stroke-dashoffset:176}\
.fla-px .rd em{position:absolute;top:0;left:0;right:0;bottom:0;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:22px}\
.fla-px .bs{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:6px}\
.fla-px button{border:0;border-radius:12px;padding:11px 18px;font:700 14.5px/1 inherit;font-family:inherit;cursor:pointer;background:rgb(var(--k));color:#141615}\
.fla-px button.gh{background:transparent;color:#F4F0E4;border:1px solid #3d4340}\
.fla-tr{padding:34px 24px;text-align:center}\
.fla-tr b{display:block;font-family:"Archivo",inherit;font-weight:800;font-size:20px;margin-bottom:6px}\
.fla-tr p{color:#B3B4A2;font-size:15px;max-width:42ch;margin:0 auto}\
@media (max-width:820px){.fla{padding:0;align-items:flex-end}.fla-cx{border-radius:20px 20px 0 0;max-height:94%}.fla-co{grid-template-columns:minmax(0,1fr);overflow-y:auto}.fla-li{border-left:0;border-top:1px solid #262b29;overflow:visible}.fla-gr{width:58px;height:58px;margin:-40px 0 0 -29px}.fla-gr svg{width:24px;height:24px}.fla-ct{padding:22px 10px 8px;gap:4px}.fla-ln button{height:32px;min-width:32px;padding:0 6px}.fla-tm{margin:0 2px;font-size:12px}}\
@media (prefers-reduced-motion:reduce){.fla,.fla-cx,.fla-gr{transition:none}}';

  var IC = {
    play: '<svg viewBox="0 0 24 24"><path class="cheio" d="M7 4.5v15l12.5-7.5z"/></svg>',
    pausa: '<svg viewBox="0 0 24 24"><path class="cheio" d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/></svg>',
    som: '<svg viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11"/></svg>',
    mudo: '<svg viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
    cheia: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    volta: '<svg viewBox="0 0 24 24"><path d="M11 5L6 8.5 11 12"/><path d="M6.5 8.5H13a6 6 0 1 1-5.6 8"/><text x="12.2" y="17.2" font-size="6.5" font-weight="800" fill="currentColor" stroke="none" font-family="sans-serif" text-anchor="middle">10</text></svg>',
    frente: '<svg viewBox="0 0 24 24"><path d="M13 5l5 3.5-5 3.5"/><path d="M17.5 8.5H11a6 6 0 1 0 5.6 8"/><text x="11.8" y="17.2" font-size="6.5" font-weight="800" fill="currentColor" stroke="none" font-family="sans-serif" text-anchor="middle">10</text></svg>'
  };

  var aberta = null;
  function fecha() {
    if (!aberta) return; var el = aberta; aberta = null;
    try { var v = el.querySelector('video'); if (v) { v.onended = null; v.pause(); v.removeAttribute('src'); v.load(); } } catch (e) {}
    if (el._para) el._para();
    document.removeEventListener('keydown', el._tecla, true);
    el.classList.remove('on'); setTimeout(function () { el.remove(); }, 220);
  }

  function abre(packs, op) {
    op = op || {}; fecha();
    if (!document.getElementById('fla-css')) { var st = document.createElement('style'); st.id = 'fla-css'; st.textContent = CSS; document.head.appendChild(st); }
    var todas = de(packs), dono = typeof op.dono === 'function' ? !!op.dono() : op.dono !== false;
    var aulas = todas.filter(function (a) { return dono || a.so_cliente === false; });
    var el = document.createElement('div'); el.className = 'fla'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Aulas');
    if (op.cor) el.style.setProperty('--k', op.cor);
    var topo = '<div class="fla-top"><span><small>Aulas</small><b></b></span><button class="fla-x" aria-label="Fechar">✕</button></div>';
    if (!aulas.length) {
      el.innerHTML = '<div class="fla-cx" style="max-width:520px">' + topo + '<div class="fla-tr"><b>' + (todas.length ? 'Aula liberada para quem tem o produto' : 'A aula ainda não foi publicada') + '</b><p>' + (todas.length ? 'Entre com o e-mail da compra para assistir.' : 'Assim que ela entrar no ar, aparece aqui.') + '</p></div></div>';
    } else {
      el.innerHTML = '<div class="fla-cx">' + topo + '<div class="fla-co' + (aulas.length > 1 ? '' : ' so') + '"><div><div class="fla-pl"><video playsinline preload="metadata"></video><div class="fla-esp"></div><button class="fla-gr" aria-label="Assistir">' + IC.play + '</button>' +
        '<div class="fla-ct"><div class="fla-bar" role="slider" aria-label="Posição do vídeo" tabindex="0"><i class="f"></i><i class="b"></i><i class="p"></i><span class="d"></span></div>' +
        '<div class="fla-ln"><button class="pp" aria-label="Tocar ou pausar">' + IC.play + '</button><button class="v10" aria-label="Voltar 10 segundos">' + IC.volta + '</button><button class="f10" aria-label="Avançar 10 segundos">' + IC.frente + '</button><span class="fla-tm">0:00 / 0:00</span><span class="sp"></span><button class="vel" aria-label="Velocidade">1x</button><button class="vol" aria-label="Som">' + IC.som + '</button><button class="tc" aria-label="Tela cheia">' + IC.cheia + '</button></div></div>' +
        '<div class="fla-px"></div><div class="fla-er"><span><b>Não consegui carregar esta aula</b>Confira sua internet e tente de novo.</span></div></div>' +
        '<div class="fla-inf"><b></b><p></p></div></div>' + (aulas.length > 1 ? '<div class="fla-li"></div>' : '') + '</div></div>';
    }
    el.querySelector('.fla-top b').textContent = op.titulo || 'Base FL';
    document.body.appendChild(el); aberta = el;
    requestAnimationFrame(function () { el.classList.add('on'); });
    el.querySelector('.fla-x').onclick = fecha;
    el.addEventListener('mousedown', function (e) { if (e.target === el) fecha(); });
    if (!aulas.length) { el._tecla = function (e) { if (e.key === 'Escape') fecha(); }; document.addEventListener('keydown', el._tecla, true); return; }

    var pl = el.querySelector('.fla-pl'), v = pl.querySelector('video'), bar = pl.querySelector('.fla-bar'), tm = pl.querySelector('.fla-tm'), pp = pl.querySelector('.pp'), li = el.querySelector('.fla-li');
    var at = -1, VEL = [1, 1.25, 1.5, 2], iv = Math.max(0, [1, 1.25, 1.5, 2].indexOf(parseFloat(mem.get('fl_aula_vel')))), some = 0, arr = false, auto = mem.get('fl_aula_auto') !== '0', conta = 0, px = pl.querySelector('.fla-px');
    pl.querySelector('.vel').textContent = String(VEL[iv]).replace('.', ',') + 'x';
    var visto = function (a) { return mem.get(chave(a)) === 'fim'; };
    function pintaLista() {
      if (!li) return; li.innerHTML = '';
      var feitas = aulas.filter(visto).length, pg = document.createElement('div'); pg.className = 'fla-pg';
      pg.innerHTML = '<span><b>' + feitas + ' de ' + aulas.length + ' aulas assistidas</b></span><i><u style="width:' + (feitas / aulas.length * 100) + '%"></u></i>'; li.appendChild(pg);
      aulas.forEach(function (a, i) {
        var b = document.createElement('button'); b.className = 'fla-it' + (i === at ? ' on' : '') + (visto(a) && i !== at ? ' ok' : '');
        b.innerHTML = '<span class="n"></span><span><b></b><small></small></span>';
        b.querySelector('.n').textContent = visto(a) && i !== at ? '✓' : (i + 1);
        b.querySelector('b').textContent = a.titulo || ('Aula ' + (i + 1)); b.querySelector('small').textContent = a.duracao || '';
        b.onclick = function () { toca(i, true); }; li.appendChild(b);
      });
      var au = document.createElement('div'); au.className = 'fla-au' + (auto ? ' on' : ''); au.setAttribute('role', 'switch'); au.setAttribute('aria-checked', auto); au.tabIndex = 0;
      au.innerHTML = '<span class="tg"></span>Passar para a próxima sozinho';
      au.onclick = function () { auto = !auto; mem.set('fl_aula_auto', auto ? '1' : '0'); pintaLista(); }; li.appendChild(au);
    }
    function toca(i, jaToca) {
      var a = aulas[i]; if (!a) return; at = i; clearInterval(conta);
      pl.classList.remove('erro', 'toca', 'fim'); pl.classList.add('esp');
      v.poster = a.capa || ''; v.src = a.url; v.playbackRate = VEL[iv];
      el.querySelector('.fla-inf b').textContent = a.titulo || ''; el.querySelector('.fla-inf p').textContent = a.descricao || '';
      var p = parseFloat(mem.get(chave(a)));
      v.onloadedmetadata = function () { pl.classList.remove('esp'); if (p > 3 && p < v.duration - 5) v.currentTime = p; atualiza(); };
      pintaLista(); if (jaToca) v.play().catch(function () {});
    }
    function atualiza() {
      var d = v.duration || 0, c = v.currentTime || 0, k = d ? c / d * 100 : 0;
      bar.querySelector('.p').style.width = k + '%'; bar.querySelector('.d').style.left = k + '%';
      try { if (v.buffered.length) bar.querySelector('.b').style.width = (d ? v.buffered.end(v.buffered.length - 1) / d * 100 : 0) + '%'; } catch (e) {}
      tm.textContent = tempo(c) + ' / ' + tempo(d);
    }
    function alterna() { if (v.paused) v.play().catch(function () {}); else v.pause(); }
    function mostra() { pl.classList.remove('some'); clearTimeout(some); if (!v.paused) some = setTimeout(function () { if (!arr) pl.classList.add('some'); }, 2400); }
    v.onplay = function () { pl.classList.add('toca'); pp.innerHTML = IC.pausa; mostra(); };
    v.onpause = function () { pp.innerHTML = IC.play; pl.classList.remove('some'); if (!v.ended) pl.classList.remove('toca'); };
    v.onwaiting = function () { pl.classList.add('esp'); }; v.onplaying = v.oncanplay = function () { pl.classList.remove('esp'); };
    v.onprogress = atualiza;
    v.ontimeupdate = function () { atualiza(); var a = aulas[at]; if (a && !visto(a) && v.currentTime > 3) mem.set(chave(a), String(Math.floor(v.currentTime))); };
    v.onended = function () {
      var a = aulas[at]; if (a) mem.set(chave(a), 'fim'); pl.classList.remove('toca', 'some'); pintaLista();
      var prox = aulas[at + 1]; pl.classList.add('fim');
      if (!prox) {   // terminou a última
        var todas = aulas.every(visto);
        px.innerHTML = '<small>' + (todas ? 'Tudo assistido' : 'Fim da aula') + '</small><b>' + (todas && aulas.length > 1 ? 'Você concluiu todas as aulas.' : 'Aula concluída.') + '</b><div class="bs"><button class="gh re">Assistir de novo</button><button class="ok">Fechar</button></div>';
        px.querySelector('.re').onclick = function () { mem.set(chave(aulas[at]), '0'); toca(at, true); }; px.querySelector('.ok').onclick = fecha; return;
      }
      px.innerHTML = '<small>A seguir</small><b></b>' + (auto ? '<div class="rd"><svg viewBox="0 0 64 64"><circle class="t" cx="32" cy="32" r="28"/><circle class="c" cx="32" cy="32" r="28"/></svg><em>5</em></div>' : '') + '<div class="bs">' + (auto ? '<button class="gh pa">Cancelar</button>' : '') + '<button class="vai">Assistir agora</button></div>';
      px.querySelector('b').textContent = prox.titulo || 'Próxima aula';
      px.querySelector('.vai').onclick = function () { toca(at + 1, true); };
      if (!auto) return;
      var n = 5, c = px.querySelector('.c'), em = px.querySelector('em');
      c.style.transition = 'stroke-dashoffset 5s linear'; requestAnimationFrame(function () { c.style.strokeDashoffset = '0'; });
      conta = setInterval(function () { n--; if (em) em.textContent = Math.max(n, 0); if (n <= 0) { clearInterval(conta); toca(at + 1, true); } }, 1000);
      px.querySelector('.pa').onclick = function () { clearInterval(conta); px.querySelector('.rd').remove(); this.remove(); px.querySelector('small').textContent = 'Próxima aula'; };
    };
    v.onerror = function () { pl.classList.remove('esp'); pl.classList.add('erro'); };
    v.onclick = alterna; pl.querySelector('.fla-gr').onclick = alterna; pp.onclick = alterna;
    pl.onmousemove = mostra; pl.ontouchstart = mostra;
    pl.querySelector('.vel').onclick = function () { iv = (iv + 1) % VEL.length; v.playbackRate = VEL[iv]; mem.set('fl_aula_vel', String(VEL[iv])); this.textContent = String(VEL[iv]).replace('.', ',') + 'x'; };
    var pula = function (d) { if (v.duration) { v.currentTime = Math.min(v.duration - .2, Math.max(0, v.currentTime + d)); atualiza(); mostra(); } };
    pl.querySelector('.v10').onclick = function () { pula(-10); }; pl.querySelector('.f10').onclick = function () { pula(10); };
    v.ondblclick = function () { pl.querySelector('.tc').click(); };
    pl.querySelector('.vol').onclick = function () { v.muted = !v.muted; this.innerHTML = v.muted ? IC.mudo : IC.som; };
    pl.querySelector('.tc').onclick = function () {
      var fs = document.fullscreenElement || document.webkitFullscreenElement;
      if (fs) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else if (pl.requestFullscreen) pl.requestFullscreen().catch(function () {});
      else if (pl.webkitRequestFullscreen) pl.webkitRequestFullscreen();
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
    };
    var vaiPara = function (e) { var r = bar.getBoundingClientRect(), k = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); if (v.duration) { v.currentTime = k * v.duration; atualiza(); } };
    bar.onpointerdown = function (e) { arr = true; bar.classList.add('arr'); try { bar.setPointerCapture(e.pointerId); } catch (x) {} vaiPara(e); };
    bar.onpointermove = function (e) { if (arr) vaiPara(e); };
    bar.onpointerup = bar.onpointercancel = function () { arr = false; bar.classList.remove('arr'); };
    el._tecla = function (e) {
      if (e.key === 'Escape') { if (document.fullscreenElement || document.webkitFullscreenElement) return; e.preventDefault(); fecha(); }
      else if (e.key === ' ' || e.key === 'k') { e.preventDefault(); alterna(); }
      else if (e.key === 'ArrowRight') pula(10);
      else if (e.key === 'ArrowLeft') pula(-10);
      else if (e.key === 'f') pl.querySelector('.tc').click();
    };
    document.addEventListener('keydown', el._tecla, true); el._para = function () { clearInterval(conta); clearTimeout(some); };
    var prim = 0; for (var i = 0; i < aulas.length; i++) if (!visto(aulas[i])) { prim = i; break; }   // começa na primeira que a pessoa ainda não terminou
    toca(prim, false);
  }

  // liga um botão já existente na página: ele só aparece se houver aula para o produto
  function liga(sel, packs, op) {
    var b = typeof sel === 'string' ? document.querySelector(sel) : sel; if (!b) return;
    var poe = function () { if (tem(packs)) { b.hidden = false; b.onclick = function () { abre(packs, op); }; } };
    if (lista) poe(); else carrega().then(poe);
  }

  window.Aulas = { carrega: carrega, tem: tem, de: de, abre: abre, fecha: fecha, liga: liga, aoCarregar: function (f) { if (lista) f(); else ouvintes.push(f); } };
})();
