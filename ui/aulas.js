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

  // Quem está logado manda o próprio acesso: o servidor só entrega o vídeo das aulas dos produtos que a pessoa tem.
  // Visitante recebe só as aulas abertas.
  var fonteToken = null;
  function token() {
    try {
      if (fonteToken) return Promise.resolve(fonteToken()).catch(function () { return null; });
      if (window.Base) return window.Base.pronto.then(function () { var s = window.Base.sessao(); return s && s.expires_at - Date.now() / 1000 > 5 ? s.access_token : null; }).catch(function () { return null; });
    } catch (e) {}
    return Promise.resolve(null);
  }
  // colunas novas (módulo e XP) entram com o arquivo 25 do Supabase; sem ele, a lista vem do jeito antigo e tudo continua funcionando
  var COLS = 'id,pack_id,titulo,descricao,url,capa,duracao,ordem,so_cliente', NOVAS = ',modulo,modulo_desc,modulo_ordem,xp', CTA = ',cta_texto,cta_url,cta_segundos,cta_pack,cta_inicio';
  function pede(tok, cols) { return fetch(SUPA.url + '/rest/v1/aulas?select=' + cols + '&ativo=eq.true&order=ordem.asc', { headers: { apikey: SUPA.key, Authorization: 'Bearer ' + (tok || SUPA.key) } }); }
  function busca(tok) {
    return pede(tok, COLS + NOVAS + CTA).then(function (r) { return r.ok ? r : pede(tok, COLS + NOVAS); }).then(function (r) { return r.ok ? r : pede(tok, COLS); })
      .then(function (r) { if (r.ok) return r.json(); if (tok) return busca(null); return []; });
  }
  // módulos cadastrados (tabela aulas_modulos, arquivo 26): dão nome e texto ao módulo e deixam um módulo existir sem aula ("Em breve")
  var modsSrv = [];
  function buscaMods() { return fetch(SUPA.url + '/rest/v1/aulas_modulos?select=pack_id,ordem,nome,descricao&ativo=eq.true&order=ordem.asc', { headers: { apikey: SUPA.key, Authorization: 'Bearer ' + SUPA.key } }).then(function (r) { return r.ok ? r.json() : []; }).then(function (j) { modsSrv = Array.isArray(j) ? j : []; }).catch(function () { modsSrv = []; }); }
  function carrega() {
    if (pedido) return pedido;
    pedido = token().then(function (tok) { return Promise.all([busca(tok), buscaMods()]).then(function (x) { return [x[0], tok]; }); })
      .then(function (x) { lista = Array.isArray(x[0]) ? x[0].filter(function (a) { return a.url; }) : []; avisa(); if (x[1]) sincroniza(x[1]); return lista; })
      .catch(function () { lista = []; return lista; });
    return pedido;
  }
  function avisa() { ouvintes.forEach(function (f) { try { f(); } catch (e) {} }); }
  function recarrega() { pedido = null; return carrega(); }
  function de(packs) { packs = [].concat(packs); return (lista || []).filter(function (a) { return packs.indexOf(a.pack_id) >= 0; }).sort(function (a, b) { return packs.indexOf(a.pack_id) - packs.indexOf(b.pack_id) || (a.modulo_ordem || 1) - (b.modulo_ordem || 1) || (a.ordem || 0) - (b.ordem || 0); }); }
  // a mesma aula pode estar em mais de um produto (ex.: a aula do Kit nas quatro ferramentas): na tela ela aparece uma vez só
  function unicas(l) { var v = {}; return l.filter(function (a) { if (v[a.url]) return false; v[a.url] = 1; return true; }); }
  function tem(packs) { return de(packs).length > 0; }

  /* ---------- progresso: salvo no aparelho e, com login, na conta (vale em todo lugar) ---------- */
  var srv = { feitas: {}, xp: null }, ouvProg = [];
  function rpc(tok, fn, corpo) { return fetch(SUPA.url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: SUPA.key, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo || {}) }).then(function (r) { if (!r.ok) throw new Error('rpc'); return r.json(); }); }
  function recebe(j) { if (!j || !Array.isArray(j.feitas)) return; srv.feitas = {}; j.feitas.forEach(function (id) { srv.feitas[id] = 1; }); srv.xp = +j.xp || 0; }
  function mesmas(a) { return (lista || []).filter(function (x) { return x.url === a.url; }); }      // a aula e as cópias dela em outros produtos
  function feita(a) { return mesmas(a).some(function (x) { return srv.feitas[x.id] || mem.get(chave(x)) === 'fim'; }); }
  function comecou(a) { return !feita(a) && mesmas(a).some(function (x) { return parseFloat(mem.get(chave(x))) > 3; }); }
  function avisaProg() { ouvProg.forEach(function (f) { try { f(); } catch (e) {} }); }
  function sincroniza(tok) {
    return rpc(tok, 'aulas_meu_progresso').then(function (j) {
      recebe(j);
      // o que foi concluído neste aparelho antes de existir o progresso na conta sobe agora
      var faltam = (lista || []).filter(function (a) { return mem.get(chave(a)) === 'fim' && !srv.feitas[a.id]; });
      (lista || []).forEach(function (a) { if (srv.feitas[a.id]) mem.set(chave(a), 'fim'); });
      avisaProg();
      return faltam.reduce(function (p, a) { return p.then(function () { return rpc(tok, 'aula_concluir', { p_aula: a.id, p_feita: true }).then(recebe); }); }, Promise.resolve()).then(avisaProg);
    }).catch(function () {});       // sem o arquivo 25 ou sem internet: fica o progresso do aparelho
  }
  function conclui(a, sim) {
    mesmas(a).forEach(function (x) { mem.set(chave(x), sim ? 'fim' : '0'); if (!sim) delete srv.feitas[x.id]; });
    avisaProg();
    return token().then(function (tok) { if (!tok) return; return rpc(tok, 'aula_concluir', { p_aula: a.id, p_feita: !!sim }).then(function (j) { recebe(j); if (sim) mesmas(a).forEach(function (x) { mem.set(chave(x), 'fim'); }); avisaProg(); }); }).catch(function () {});
  }
  // PARA O DONO CONFERIR: quem já tem o produto não vê a oferta. Abrindo a página com ?oferta=teste no endereço, o botão aparece mesmo assim (só nessa aba).
  var PREVIA = false; try { if (/[?&]oferta=teste\b/.test(location.search)) sessionStorage.setItem('fl_oferta_teste', '1'); PREVIA = sessionStorage.getItem('fl_oferta_teste') === '1'; } catch (e) {}
  var tenho = {};      // produto do botão de oferta -> a pessoa já tem?
  function jaTem(pack) {
    if (!pack || PREVIA) return Promise.resolve(false); if (pack in tenho) return Promise.resolve(tenho[pack]);
    try { if (window.Base && window.Base.tem && window.Base.tem(pack)) { tenho[pack] = true; return Promise.resolve(true); } } catch (e) {}
    return token().then(function (tok) { if (!tok) return false; return rpc(tok, 'tem_licenca', { p_pack: pack }).then(function (r) { tenho[pack] = r === true; return tenho[pack]; }); }).catch(function () { return false; });
  }
  // clique no botão de oferta: entra na mesma tabela de eventos do site (checkout_clicked), marcado como vindo da aula
  function registra(a) {
    try {
      if (window.Base && window.Base.evento) { window.Base.evento('checkout_clicked', a.cta_pack || a.pack_id, { de: 'aula', aula: a.id }); return; }
      var v = mem.get('fl_vis'); if (!v) { v = 'v' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); mem.set('fl_vis', v); }
      token().then(function (tok) { fetch(SUPA.url + '/rest/v1/rpc/evento', { method: 'POST', keepalive: true, headers: { apikey: SUPA.key, Authorization: 'Bearer ' + (tok || SUPA.key), 'Content-Type': 'application/json' }, body: JSON.stringify({ p_nome: 'checkout_clicked', p_pack: a.cta_pack || a.pack_id, p_visitante: v, p_dados: { de: 'aula', aula: a.id } }) }).catch(function () {}); });
    } catch (e) {}
  }
  function xpDe(l) { return l.filter(feita).reduce(function (t, a) { return t + (a.xp == null ? 10 : +a.xp); }, 0); }
  // resumo de um produto (ou de vários juntos): usado nos cards do app, do site e da área de membros
  function progresso(packs) {
    var l = unicas(de(packs)), f = l.filter(feita).length, and = l.some(comecou);
    return { total: l.length, feitas: f, pct: l.length ? Math.round(f / l.length * 100) : 0, xp: xpDe(l), estado: !l.length ? 'sem' : f === l.length ? 'feito' : (f || and) ? 'andamento' : 'novo' };
  }
  function xpTotal() { return xpDe(unicas(lista || [])); }
  var ROTULO = { novo: 'Não iniciado', andamento: 'Em andamento', feito: 'Concluído' };
  // faixa de progresso pronta para pôr em qualquer card: Aulas.selo(elemento, ['fl-legendas'])
  function selo(el, packs, op) {
    if (!el) return; estilo(); op = op || {};
    var visto = false, fora = 0, sai = function () { [ouvintes, ouvProg].forEach(function (l) { var k = l.indexOf(pinta); if (k >= 0) l.splice(k, 1); }); };
    var pinta = function () {
      if (!el.isConnected) { if (visto || ++fora > 3) { sai(); return; } } else visto = true;       // o card pode ser montado antes de entrar na página; depois que saiu dela, para de acompanhar
      var p = progresso(packs);
      if (!p.total) { el.hidden = true; return; } el.hidden = false; el.className = 'flp ' + p.estado + (op.classe ? ' ' + op.classe : '');
      if (op.cor) el.style.setProperty('--k', op.cor);
      el.innerHTML = '<span class="flp-t"><b>' + (p.total === 1 ? (p.estado === 'feito' ? 'Aula concluída' : p.estado === 'andamento' ? 'Aula em andamento' : '1 aula') : p.feitas + ' de ' + p.total + ' aulas') + '</b><em>' + (p.estado === 'feito' ? '✓ ' : '') + (p.total === 1 ? ROTULO[p.estado] : p.pct + '%') + '</em></span><i><u style="width:' + p.pct + '%"></u></i>';
    };
    ouvintes.push(pinta); ouvProg.push(pinta); if (lista) pinta(); else carrega();
  }
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
.fla .fla-x{all:unset;box-sizing:border-box;margin-left:auto;flex:none;width:40px;height:40px;min-width:40px;border-radius:50%;border:1px solid #2B302E;background:#1d2120;color:#F4F0E4;cursor:pointer;display:grid;place-items:center;transition:background .15s,border-color .15s}\
.fla .fla-x svg{width:16px;height:16px;display:block;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;pointer-events:none}\
.fla .fla-x:focus-visible{outline:2px solid #F4F0E4;outline-offset:2px}\
.fla .fla-x:hover{background:#2b302e;border-color:#3a413e}\
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
.fla-vt{all:unset;box-sizing:border-box;flex:none;display:none;align-items:center;gap:6px;height:36px;padding:0 12px 0 8px;border-radius:99px;border:1px solid #2B302E;background:#1d2120;color:#F4F0E4;font:600 13.5px/1 inherit;font-family:inherit;cursor:pointer}\
.fla-vt svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}\
.fla-vt:hover{background:#2b302e}.fla-vt:focus-visible{outline:2px solid #F4F0E4;outline-offset:2px}\
.fla.v-aula.multi .fla-vt{display:inline-flex}\
.fla-xp{margin-left:auto;flex:none;display:inline-flex;align-items:baseline;gap:5px;padding:7px 12px;border-radius:99px;border:1px solid rgba(var(--k),.35);background:rgba(var(--k),.1);font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:rgb(var(--k))}\
.fla-xp b{display:inline;font-family:inherit;font-size:13px;font-weight:700;color:#F4F0E4}\
.fla-xp.pulo{animation:flapulo .5s cubic-bezier(.34,1.56,.64,1)}\
@keyframes flapulo{40%{transform:scale(1.12)}}\
.fla-top .fla-x{margin-left:10px}\
.fla.v-home .fla-co,.fla.v-aula .fla-home{display:none}\
.fla-home{overflow-y:auto;padding:20px 20px 26px;min-height:0;flex:1}\
.fla-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 16px;align-items:end;padding:18px 18px 16px;border-radius:16px;background:linear-gradient(180deg,rgba(var(--k),.1),transparent 80%),#1a1e1c;border:1px solid #2B302E}\
.fla-hero small{display:block;font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#8d8e80}\
.fla-hero b{display:block;margin-top:4px;font-family:"Archivo",inherit;font-weight:800;font-size:22px;line-height:1.15}\
.fla-hero em{font-style:normal;font-family:"Archivo",inherit;font-weight:800;font-size:30px;line-height:1;color:rgb(var(--k));font-variant-numeric:tabular-nums}\
.fla-hero>i{grid-column:1/-1}\
.fla-tr2{display:block;height:6px;border-radius:6px;background:#262b29;overflow:hidden}\
.fla-tr2 u{display:block;height:100%;width:0;border-radius:6px;background:rgb(var(--k));transition:width .7s cubic-bezier(.2,.8,.2,1)}\
.fla-cont{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:12px;width:100%;margin-top:10px;padding:13px 16px;border-radius:14px;background:rgb(var(--k));color:#141615;cursor:pointer;transition:transform .15s,filter .15s}\
.fla-cont:hover{transform:translateY(-1px);filter:brightness(1.05)}.fla-cont:focus-visible{outline:2px solid #F4F0E4;outline-offset:2px}\
.fla-cont svg{flex:none;width:20px;height:20px;fill:currentColor}\
.fla-cont span{min-width:0}.fla-cont small{display:block;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.7}\
.fla-cont b{display:block;font-size:15.5px;font-weight:800;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
.fla-mod{margin-top:26px}\
.fla-mh{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 14px;align-items:end;margin-bottom:10px}\
.fla-mh small{font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:rgb(var(--k))}\
.fla-mh b{grid-column:1;font-family:"Archivo",inherit;font-weight:800;font-size:19px;line-height:1.2}\
.fla-mh span{grid-column:2;grid-row:1/3;align-self:end;font-size:12.5px;color:#B3B4A2;font-variant-numeric:tabular-nums;white-space:nowrap}\
.fla-mh p{grid-column:1/-1;margin:4px 0 0;color:#B3B4A2;font-size:14px;line-height:1.5;max-width:64ch}\
.fla-mh i{grid-column:1/-1;margin-top:10px;height:3px}\
.fla-cards{display:grid;gap:6px}\
.fla-cta{position:absolute;right:14px;top:14px;z-index:3;display:flex;align-items:center;gap:12px;max-width:calc(100% - 28px);padding:10px 10px 10px 16px;border-radius:14px;background:rgba(16,19,18,.86);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(var(--k),.55);box-shadow:0 14px 34px -12px #000;color:#F4F0E4;text-decoration:none;opacity:0;transform:translateY(-10px);transition:opacity .45s ease,transform .55s cubic-bezier(.2,.8,.2,1),border-color .2s,background .2s}\
.fla-cta[hidden]{display:none}\
.fla-cta.on{opacity:1;transform:none}\
.fla-cta:hover{background:rgba(22,26,24,.95);border-color:rgb(var(--k))}.fla-cta:focus-visible{outline:2px solid #F4F0E4;outline-offset:2px}\
.fla-cta span{min-width:0}\
.fla-cta small{display:block;font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:rgb(var(--k))}\
.fla-cta b{display:block;margin-top:2px;font-size:15px;font-weight:800;line-height:1.2}\
.fla-cta i{flex:none;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:rgb(var(--k));color:#141615;transition:transform .2s}\
.fla-cta:hover i{transform:translateX(2px)}\
.fla-cta i svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}\
@media (min-width:821px){.fla-pl.fim .fla-cta{top:auto;bottom:16px;right:50%;transform:translate(50%,8px)}.fla-pl.fim .fla-cta.on{transform:translate(50%,0)}}\
@media (max-width:820px){.fla-cta{right:8px;top:8px;gap:9px;padding:7px 7px 7px 11px;border-radius:12px}.fla-cta small{display:none}.fla-cta b{margin:0;font-size:13px}.fla-cta i{width:28px;height:28px;border-radius:8px}}\
@media (prefers-reduced-motion:reduce){.fla-cta{transition:opacity .2s}}\
.fla-breve{display:flex;align-items:center;gap:14px;padding:16px 14px;border-radius:14px;border:1px dashed #343a37;color:#8d8e80;font-size:13.5px;line-height:1.4}\
.fla-breve i{flex:none;width:38px;height:38px;border-radius:11px;background:repeating-linear-gradient(135deg,#1f2422 0 6px,#262b29 6px 12px)}\
.fla-breve b{display:block;font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:#B3B4A2;margin-bottom:2px}\
.fla-mod.breve .fla-mh b{color:#B3B4A2}\
.fla-card{all:unset;box-sizing:border-box;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:14px;align-items:center;width:100%;padding:13px 14px;border-radius:14px;border:1px solid #262b29;background:#191d1b;cursor:pointer;transition:border-color .2s,background .2s,transform .2s}\
.fla-card:hover{border-color:rgba(var(--k),.5);background:#1d2120;transform:translateX(2px)}\
.fla-card:focus-visible{outline:2px solid #F4F0E4;outline-offset:2px}\
.fla-card .n{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:#262b29;font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:12.5px;font-weight:700;color:#B3B4A2;transition:background .3s,color .3s}\
.fla-card .n svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}\
.fla-card b{display:block;font-size:15.5px;font-weight:700;line-height:1.3}\
.fla-card small{display:block;margin-top:2px;color:#8d8e80;font-size:13px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}\
.fla-card .st{font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8d8e80;white-space:nowrap;text-align:right}\
.fla-card.and .n{background:rgba(var(--k),.18);color:rgb(var(--k))}.fla-card.and .st{color:rgb(var(--k))}\
.fla-card.ok .n{background:#7fce8f;color:#0b1a10}.fla-card.ok .st{color:#7fce8f}\
.fla-card.ok.novo .n{animation:flacheck .5s cubic-bezier(.34,1.56,.64,1)}\
@keyframes flacheck{0%{transform:scale(.6)}}\
.fla-inf{display:grid;grid-template-columns:minmax(0,1fr);gap:0}\
.fla-inf small{display:block;font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgb(var(--k));margin-bottom:4px}\
.fla-nav{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;margin-top:14px}\
.fla-nav button{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:0 14px;border-radius:12px;border:1px solid #2B302E;color:#F4F0E4;font:600 14px/1.2 inherit;font-family:inherit;cursor:pointer;text-align:center;transition:background .15s,border-color .15s,opacity .15s}\
.fla-nav button:hover{background:#1d2120;border-color:#3a413e}.fla-nav button:focus-visible{outline:2px solid #F4F0E4;outline-offset:2px}\
.fla-nav button[disabled]{opacity:.3;cursor:default;pointer-events:none}\
.fla-nav svg{flex:none;width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}\
.fla-nav .conc{background:rgb(var(--k));border-color:transparent;color:#141615;font-weight:800}\
.fla-nav .conc:hover{background:rgb(var(--k));filter:brightness(1.06)}\
.fla-nav .conc.ok{background:rgba(127,206,143,.12);border-color:rgba(127,206,143,.4);color:#9fe0ac}\
.fla-nav.so{grid-template-columns:minmax(0,1fr)}.fla-nav.so .ant,.fla-nav.so .prx{display:none}\
.fla-it .n svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2.8;stroke-linecap:round;stroke-linejoin:round}\
.fla-lm{padding:10px 10px 2px;font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:#8d8e80;display:flex;justify-content:space-between;gap:8px}\
.fla-toast{position:absolute;left:50%;top:70px;z-index:5;display:flex;align-items:center;gap:10px;padding:10px 16px 10px 10px;border-radius:99px;background:#101312;border:1px solid rgba(127,206,143,.45);box-shadow:0 18px 40px -14px #000;font-size:14px;font-weight:600;white-space:nowrap;transform:translate(-50%,-14px);opacity:0;pointer-events:none;transition:transform .35s cubic-bezier(.34,1.56,.64,1),opacity .25s}\
.fla-toast.on{transform:translate(-50%,0);opacity:1}\
.fla-toast i{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#7fce8f;color:#0b1a10}\
.fla-toast i svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:22;stroke-dashoffset:22}\
.fla-toast.on i svg{transition:stroke-dashoffset .4s .15s ease;stroke-dashoffset:0}\
.fla-toast b{color:#9fe0ac;font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:12.5px;letter-spacing:.06em}\
.fla-fim{margin-top:10px;padding:14px 16px;border-radius:14px;border:1px solid rgba(127,206,143,.35);background:rgba(127,206,143,.07);color:#B3B4A2;font-size:14.5px;line-height:1.45}\
.fla-fim b{display:block;color:#F4F0E4;font-family:"Archivo",inherit;font-weight:800;font-size:17px}\
.fla-cx{position:relative}\
[data-aula=feito]::after{content:"✓";margin-left:6px;color:#7fce8f;font-weight:800}[data-aula=andamento]::after{content:"";display:inline-block;width:7px;height:7px;margin-left:7px;border-radius:50%;background:currentColor;opacity:.8;vertical-align:middle}\
.flp{display:block;font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;--k:242,165,65}\
.flp[hidden]{display:none}\
.flp-t{display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-size:12.5px;line-height:1.3;color:#B3B4A2}\
.flp-t b{font-weight:600;color:inherit}.flp-t em{font-style:normal;font-variant-numeric:tabular-nums;color:#8d8e80;white-space:nowrap}\
.flp i{display:block;height:4px;margin-top:6px;border-radius:4px;background:rgba(255,255,255,.09);overflow:hidden}\
.flp i u{display:block;height:100%;border-radius:4px;background:rgb(var(--k));transition:width .6s cubic-bezier(.2,.8,.2,1)}\
.flp.andamento .flp-t em{color:rgb(var(--k))}.flp.feito .flp-t em{color:#7fce8f}.flp.feito i u{background:#7fce8f}\
@media (max-width:820px){.fla-home{padding:14px 14px 22px}.fla-hero b{font-size:19px}.fla-hero em{font-size:26px}.fla-card{grid-template-columns:auto minmax(0,1fr);gap:12px}.fla-card .st{grid-column:2;text-align:left;margin-top:-2px}.fla-nav{grid-template-columns:1fr 1fr;position:sticky;bottom:0;margin:14px -18px -16px;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:#151817;border-top:1px solid #262b29}.fla-nav .conc{grid-column:1/-1;grid-row:1;min-height:50px;font-size:15px}.fla-nav.so{grid-template-columns:1fr}.fla-xp{padding:6px 10px}.fla-top b{font-size:15.5px}.fla-vt span{display:none}.fla-vt{padding:0 9px}.fla-toast{top:62px}}\
@media (prefers-reduced-motion:reduce){.fla,.fla-cx,.fla-gr,.fla-tr2 u,.flp i u,.fla-toast,.fla-card{transition:none}.fla-card.ok.novo .n,.fla-xp.pulo{animation:none}}';
  function estilo() { if (!document.getElementById('fla-css')) { var st = document.createElement('style'); st.id = 'fla-css'; st.textContent = CSS; document.head.appendChild(st); } }


  var IC = {
    play: '<svg viewBox="0 0 24 24"><path class="cheio" d="M7 4.5v15l12.5-7.5z"/></svg>',
    pausa: '<svg viewBox="0 0 24 24"><path class="cheio" d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/></svg>',
    som: '<svg viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11"/></svg>',
    mudo: '<svg viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
    cheia: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    volta: '<svg viewBox="0 0 24 24"><path d="M11 5L6 8.5 11 12"/><path d="M6.5 8.5H13a6 6 0 1 1-5.6 8"/><text x="12.2" y="17.2" font-size="6.5" font-weight="800" fill="currentColor" stroke="none" font-family="sans-serif" text-anchor="middle">10</text></svg>',
    frente: '<svg viewBox="0 0 24 24"><path d="M13 5l5 3.5-5 3.5"/><path d="M17.5 8.5H11a6 6 0 1 0 5.6 8"/><text x="11.8" y="17.2" font-size="6.5" font-weight="800" fill="currentColor" stroke="none" font-family="sans-serif" text-anchor="middle">10</text></svg>'
  };

  IC.ok = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  IC.esq = '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>';
  IC.dir = '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>';
  var dois = function (n) { return (n < 10 ? '0' : '') + n; };
  var aberta = null;
  function fecha() {
    if (!aberta) return; var el = aberta; aberta = null;
    try { var v = el.querySelector('video'); if (v) { v.onended = null; v.pause(); v.removeAttribute('src'); v.load(); } } catch (e) {}
    if (el._para) el._para();
    document.removeEventListener('keydown', el._tecla, true);
    el.classList.remove('on'); setTimeout(function () { el.remove(); }, 220);
  }

  /* A ÁREA DE AULAS (igual em todo o Base FL)
     Mais de uma aula: abre no painel (progresso, módulos, cards); cada card leva ao player.
     Uma aula só: abre direto no player, com o mesmo "Concluir aula". */
  function abre(packs, op) {
    op = op || {}; fecha(); estilo();
    var todas = unicas(de(packs)), dono = typeof op.dono === 'function' ? !!op.dono() : op.dono !== false;
    var aulas = todas.filter(function (a) { return dono || a.so_cliente === false; });
    var el = document.createElement('div'); el.className = 'fla'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Aulas');
    if (op.cor) el.style.setProperty('--k', op.cor);
    var multi = aulas.length > 1;
    var topo = '<div class="fla-top"><button class="fla-vt" type="button">' + IC.esq + '<span>Todas as aulas</span></button><span><small>Aulas</small><b></b></span>' + (aulas.length ? '<span class="fla-xp" title="Cada aula concluída soma pontos"><b>0</b> XP</span>' : '') + '<button class="fla-x" type="button" aria-label="Fechar"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg></button></div>';
    if (!aulas.length) {
      el.innerHTML = '<div class="fla-cx" style="max-width:520px">' + topo + '<div class="fla-tr"><b>' + (todas.length ? 'Aula liberada para quem tem o produto' : 'A aula ainda não foi publicada') + '</b><p>' + (todas.length ? 'Entre com o e-mail da compra para assistir.' : 'Assim que ela entrar no ar, aparece aqui.') + '</p></div></div>';
    } else {
      el.innerHTML = '<div class="fla-cx">' + topo + '<div class="fla-toast" role="status"><i>' + IC.ok + '</i><span></span><b></b></div>' +
        (multi ? '<div class="fla-home"></div>' : '') +
        '<div class="fla-co' + (multi ? '' : ' so') + '"><div><div class="fla-pl"><video playsinline preload="metadata"></video><div class="fla-esp"></div><button class="fla-gr" aria-label="Assistir">' + IC.play + '</button>' +
        '<div class="fla-ct"><div class="fla-bar" role="slider" aria-label="Posição do vídeo" tabindex="0"><i class="f"></i><i class="b"></i><i class="p"></i><span class="d"></span></div>' +
        '<div class="fla-ln"><button class="pp" aria-label="Tocar ou pausar">' + IC.play + '</button><button class="v10" aria-label="Voltar 10 segundos">' + IC.volta + '</button><button class="f10" aria-label="Avançar 10 segundos">' + IC.frente + '</button><span class="fla-tm">0:00 / 0:00</span><span class="sp"></span><button class="vel" aria-label="Velocidade">1x</button><button class="vol" aria-label="Som">' + IC.som + '</button><button class="tc" aria-label="Tela cheia">' + IC.cheia + '</button></div></div>' +
        '<a class="fla-cta" target="_blank" rel="noopener" hidden><span><small>Citado nesta aula</small><b></b></span><i>' + IC.dir + '</i></a><div class="fla-px"></div><div class="fla-er"><span><b>Não consegui carregar esta aula</b>Confira sua internet e tente de novo.</span></div></div>' +
        '<div class="fla-inf"><small></small><b></b><p></p><div class="fla-nav' + (multi ? '' : ' so') + '"><button class="ant" type="button">' + IC.esq + '<span>Aula anterior</span></button><button class="conc" type="button"></button><button class="prx" type="button"><span>Próxima aula</span>' + IC.dir + '</button></div></div></div>' + (multi ? '<div class="fla-li"></div>' : '') + '</div></div>';
    }
    el.querySelector('.fla-top b').textContent = op.titulo || 'Base FL';
    document.body.appendChild(el); aberta = el;
    requestAnimationFrame(function () { el.classList.add('on'); });
    el.querySelector('.fla-x').onclick = fecha;
    el.addEventListener('mousedown', function (e) { if (e.target === el) fecha(); });
    if (!aulas.length) { el._tecla = function (e) { if (e.key === 'Escape') fecha(); }; document.addEventListener('keydown', el._tecla, true); return; }
    if (multi) el.classList.add('multi');

    var pl = el.querySelector('.fla-pl'), v = pl.querySelector('video'), bar = pl.querySelector('.fla-bar'), tm = pl.querySelector('.fla-tm'), pp = pl.querySelector('.pp'), li = el.querySelector('.fla-li'), home = el.querySelector('.fla-home');
    var nav = el.querySelector('.fla-nav'), bConc = nav.querySelector('.conc'), bAnt = nav.querySelector('.ant'), bPrx = nav.querySelector('.prx'), xpEl = el.querySelector('.fla-xp'), toast = el.querySelector('.fla-toast'), tToast = 0;
    var at = -1, VEL = [1, 1.25, 1.5, 2], iv = Math.max(0, [1, 1.25, 1.5, 2].indexOf(parseFloat(mem.get('fl_aula_vel')))), some = 0, arr = false, auto = mem.get('fl_aula_auto') !== '0', conta = 0, px = pl.querySelector('.fla-px'), recem = null;
    pl.querySelector('.vel').textContent = String(VEL[iv]).replace('.', ',') + 'x';
    // módulos, na ordem; aulas sem módulo ficam num grupo só
    var mods = []; aulas.forEach(function (a, i) { var n = a.modulo || '', m = mods[mods.length - 1]; if (!m || m.nome !== n) { m = { nome: n, desc: '', aulas: [], ordem: a.modulo_ordem || 1, pack: a.pack_id }; mods.push(m); } if (a.modulo_desc && !m.desc) m.desc = a.modulo_desc; m.aulas.push(i); });
    // nome e texto oficiais do módulo; e os módulos que ainda não têm aula entram como "Em breve"
    var pk = [].concat(packs);
    modsSrv.filter(function (x) { return pk.indexOf(x.pack_id) >= 0; }).forEach(function (x) {
      var m = null; mods.forEach(function (y) { if (y.pack === x.pack_id && y.ordem === x.ordem && y.nome) m = y; });
      if (m) { m.nome = x.nome || m.nome; if (x.descricao) m.desc = x.descricao; }
      else if (mods.some(function (y) { return y.nome; }) || !mods.length) mods.push({ nome: x.nome, desc: x.descricao || '', aulas: [], ordem: x.ordem, pack: x.pack_id, breve: true });
    });
    mods.sort(function (a, b) { return pk.indexOf(a.pack) - pk.indexOf(b.pack) || a.ordem - b.ordem; });
    var dur = function (a) { var d = parseFloat(mem.get('fl_aula_d_' + a.id)); return a.duracao || (d > 0 ? Math.max(1, Math.round(d / 60)) + ' min' : ''); };
    var est = function (a) { return feita(a) ? 'ok' : comecou(a) ? 'and' : 'novo0'; };
    var rot = function (a) { return feita(a) ? 'Concluída' : comecou(a) ? 'Em andamento' : (dur(a) || 'Não iniciada'); };
    var xpA = function (a) { return a.xp == null ? 10 : +a.xp; };
    function proxima() { for (var i = 0; i < aulas.length; i++) if (!feita(aulas[i])) return i; return -1; }

    function pintaXp(pulo) { var n = xpDe(unicas(lista || [])); xpEl.querySelector('b').textContent = n; if (pulo) { xpEl.classList.remove('pulo'); void xpEl.offsetWidth; xpEl.classList.add('pulo'); } }
    function pintaHome() {
      if (!home) return;
      var f = aulas.filter(feita).length, pct = Math.round(f / aulas.length * 100), px1 = proxima(), h = '';
      h += '<div class="fla-hero"><div><small>Seu progresso</small><b>' + (f === aulas.length ? 'Você concluiu as ' + aulas.length + ' aulas' : f + ' de ' + aulas.length + ' aulas concluídas') + '</b></div><em>' + pct + '%</em><i class="fla-tr2"><u data-w="' + pct + '"></u></i></div>';
      if (px1 >= 0) h += '<button class="fla-cont" type="button" data-i="' + px1 + '">' + IC.play + '<span><small>' + (f || aulas.some(comecou) ? 'Continuar de onde parou' : 'Começar') + '</small><b></b></span></button>';
      else h += '<div class="fla-fim"><b>Tudo assistido.</b>Você pode rever qualquer aula quando quiser.</div>';
      mods.forEach(function (m, k) {
        var mf = m.aulas.filter(function (i) { return feita(aulas[i]); }).length;
        if (!m.aulas.length) { h += '<section class="fla-mod breve"><div class="fla-mh"><small>Módulo ' + dois(k + 1) + '</small><b data-mn="' + k + '"></b><span>Em breve</span>' + (m.desc ? '<p data-md="' + k + '"></p>' : '') + '</div><div class="fla-breve"><i></i><span><b>Em breve</b>As aulas deste módulo entram aqui.</span></div></section>'; return; }
        h += '<section class="fla-mod"><div class="fla-mh">' + (m.nome ? '<small>Módulo ' + dois(k + 1) + '</small><b data-mn="' + k + '"></b>' : '<small>Aulas</small><b>Todas as aulas</b>') + '<span>' + mf + '/' + m.aulas.length + ' concluída' + (m.aulas.length > 1 ? 's' : '') + '</span>' + (m.desc ? '<p data-md="' + k + '"></p>' : '') + '<i class="fla-tr2"><u data-w="' + (mf / m.aulas.length * 100) + '"></u></i></div><div class="fla-cards">' +
          m.aulas.map(function (i) { var a = aulas[i], e = est(a); return '<button class="fla-card ' + e + (recem === a.id ? ' novo' : '') + '" type="button" data-i="' + i + '"><span class="n">' + (e === 'ok' ? IC.ok : dois(i + 1)) + '</span><span><b></b><small></small></span><span class="st">' + rot(a) + '</span></button>'; }).join('') + '</div></section>';
      });
      home.innerHTML = h;
      // textos entram como texto (nunca como HTML): vêm da tabela
      mods.forEach(function (m, k) { var b = home.querySelector('[data-mn="' + k + '"]'), d = home.querySelector('[data-md="' + k + '"]'); if (b) b.textContent = m.nome; if (d) d.textContent = m.desc; });
      [].forEach.call(home.querySelectorAll('.fla-card'), function (c) { var a = aulas[+c.dataset.i]; c.querySelector('b').textContent = a.titulo || ('Aula ' + (+c.dataset.i + 1)); c.querySelector('small').textContent = a.descricao || ''; c.setAttribute('aria-label', 'Aula ' + (+c.dataset.i + 1) + ': ' + (a.titulo || '') + '. ' + rot(a)); c.onclick = function () { vaiAula(+c.dataset.i, true); }; });
      var ct = home.querySelector('.fla-cont'); if (ct) { var pa = aulas[+ct.dataset.i]; ct.querySelector('b').textContent = 'Aula ' + dois(+ct.dataset.i + 1) + ' · ' + (pa.titulo || ''); ct.onclick = function () { vaiAula(+ct.dataset.i, true); }; }
      requestAnimationFrame(function () { [].forEach.call(home.querySelectorAll('.fla-tr2 u'), function (u) { u.style.width = u.dataset.w + '%'; }); });      // a barra enche na frente da pessoa
      recem = null;
    }
    function pintaLista() {
      if (!li) return; li.innerHTML = '';
      var feitas = aulas.filter(feita).length, pg = document.createElement('div'); pg.className = 'fla-pg';
      pg.innerHTML = '<span><b>' + feitas + ' de ' + aulas.length + ' aulas concluídas</b><em style="font-style:normal">' + Math.round(feitas / aulas.length * 100) + '%</em></span><i><u style="width:' + (feitas / aulas.length * 100) + '%"></u></i>'; li.appendChild(pg);
      mods.forEach(function (m, k) {
        if (m.nome) { var t = document.createElement('div'); t.className = 'fla-lm'; var mf = m.aulas.filter(function (i) { return feita(aulas[i]); }).length; t.innerHTML = '<span></span><span>' + (m.aulas.length ? mf + '/' + m.aulas.length : 'em breve') + '</span>'; t.firstChild.textContent = m.nome; li.appendChild(t); }
        m.aulas.forEach(function (i) {
          var a = aulas[i], b = document.createElement('button'), ok = feita(a); b.className = 'fla-it' + (i === at ? ' on' : '') + (ok && i !== at ? ' ok' : '');
          b.innerHTML = '<span class="n"></span><span><b></b><small></small></span>';
          if (ok && i !== at) b.querySelector('.n').innerHTML = IC.ok; else b.querySelector('.n').textContent = i + 1;
          b.querySelector('b').textContent = a.titulo || ('Aula ' + (i + 1)); b.querySelector('small').textContent = ok ? 'Concluída' : comecou(a) ? 'Em andamento' : dur(a);
          b.onclick = function () { toca(i, true); }; li.appendChild(b);
        });
      });
      var au = document.createElement('div'); au.className = 'fla-au' + (auto ? ' on' : ''); au.setAttribute('role', 'switch'); au.setAttribute('aria-checked', auto); au.tabIndex = 0;
      au.innerHTML = '<span class="tg"></span>Passar para a próxima sozinho';
      au.onclick = function () { auto = !auto; mem.set('fl_aula_auto', auto ? '1' : '0'); pintaLista(); }; li.appendChild(au);
    }
    function pintaNav() {
      var a = aulas[at]; if (!a) return; var ok = feita(a), ult = at === aulas.length - 1;
      bConc.className = 'conc' + (ok ? ' ok' : '');
      bConc.innerHTML = ok ? IC.ok + '<span>Aula concluída</span>' : '<span>' + (multi && !ult ? 'Concluir aula e continuar' : 'Marcar como concluída') + '</span>';
      bConc.title = ok ? 'Clique para desmarcar' : ''; bConc.setAttribute('aria-pressed', ok);
      bAnt.disabled = at <= 0; bPrx.disabled = ult;
    }
    function tudo() { pintaXp(); pintaHome(); pintaLista(); pintaNav(); }
    function avisaToast(txt, xp) { toast.querySelector('span').textContent = txt; toast.querySelector('b').textContent = xp ? '+' + xp + ' XP' : ''; toast.classList.remove('on'); void toast.offsetWidth; toast.classList.add('on'); clearTimeout(tToast); tToast = setTimeout(function () { toast.classList.remove('on'); }, 2600); }
    // concluir: salva, mostra o retorno e (se pedido) segue para a próxima
    function marca(a, segue) {
      var ja = feita(a); if (!ja) { recem = a.id; conclui(a, true); avisaToast(aulas.every(feita) && multi ? 'Você concluiu todas as aulas' : 'Aula concluída', xpA(a)); pintaXp(true); }
      tudo(); if (segue && at < aulas.length - 1) setTimeout(function () { if (aberta === el) toca(at + 1, true); }, ja ? 0 : 900); else if (segue && multi && aulas.every(feita)) setTimeout(function () { if (aberta === el) vaiHome(); }, 1300);
    }
    function vaiHome() { if (!multi) return; try { v.pause(); } catch (e) {} clearInterval(conta); el.classList.remove('v-aula'); el.classList.add('v-home'); pintaHome(); el.querySelector('.fla-top small').textContent = 'Aulas'; }
    function vaiAula(i, jaToca) { el.classList.remove('v-home'); el.classList.add('v-aula'); toca(i, jaToca); }
    el.querySelector('.fla-vt').onclick = vaiHome;
    bConc.onclick = function () { var a = aulas[at]; if (!a) return; if (feita(a)) { conclui(a, false); tudo(); } else marca(a, true); };
    bAnt.onclick = function () { if (at > 0) toca(at - 1, true); }; bPrx.onclick = function () { if (at < aulas.length - 1) toca(at + 1, true); };

    // BOTÃO DE OFERTA: só nas aulas que têm link cadastrado, a partir do momento marcado (cta_inicio, em segundos) ou, sem ele, no último minuto.
    // Voltou o vídeo, some; avançou de novo, volta. Quem já tem o produto não vê.
    var cta = pl.querySelector('.fla-cta'), ctaOk = false;
    function ctaVe() {
      var a = aulas[at], d = v.duration || 0, mostra = !!(ctaOk && a && d > 0 && v.currentTime >= (a.cta_inicio > 0 ? Math.min(a.cta_inicio, Math.max(0, d - 5)) : Math.max(0, d - (a.cta_segundos || 60))) && !pl.classList.contains('erro'));
      if (mostra && cta.hidden) { cta.hidden = false; void cta.offsetWidth; cta.classList.add('on'); }
      else if (!mostra && !cta.hidden) { cta.classList.remove('on'); cta.hidden = true; }
    }
    function ctaPrepara(a) {
      ctaOk = false; cta.classList.remove('on'); cta.hidden = true;
      if (!a.cta_url || !a.cta_texto || !/^https?:\/\//i.test(a.cta_url)) return;
      cta.href = a.cta_url; cta.querySelector('b').textContent = a.cta_texto;
      jaTem(a.cta_pack).then(function (tem) { if (aulas[at] === a && !tem) { ctaOk = true; ctaVe(); } });
    }
    cta.onclick = function (e) { var a = aulas[at]; if (!a) return; registra(a); if (typeof op.abreLink === 'function') { e.preventDefault(); op.abreLink(a.cta_url); } };
    function toca(i, jaToca) {
      var a = aulas[i]; if (!a) return; at = i; clearInterval(conta); ctaPrepara(a);
      pl.classList.remove('erro', 'toca', 'fim'); pl.classList.add('esp');
      v.poster = a.capa || ''; v.src = a.url; v.playbackRate = VEL[iv];
      var inf = el.querySelector('.fla-inf');
      inf.querySelector('small').textContent = multi ? 'Aula ' + dois(i + 1) + ' de ' + dois(aulas.length) + (a.modulo ? ' · ' + a.modulo : '') : 'Aula';
      inf.querySelector('b').textContent = a.titulo || ''; inf.querySelector('p').textContent = a.descricao || '';
      var p = parseFloat(mem.get(chave(a)));
      v.onloadedmetadata = function () { pl.classList.remove('esp'); if (v.duration) mem.set('fl_aula_d_' + a.id, String(Math.round(v.duration))); if (p > 3 && p < v.duration - 5) v.currentTime = p; atualiza(); };
      pintaLista(); pintaNav(); if (jaToca) v.play().catch(function () {});
      var co = el.querySelector('.fla-co'); if (co && co.scrollTo) co.scrollTo(0, 0);
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
    v.onseeked = ctaVe;
    v.ontimeupdate = function () { atualiza(); ctaVe(); var a = aulas[at]; if (a && !feita(a) && v.currentTime > 3) mem.set(chave(a), String(Math.floor(v.currentTime))); };
    v.onended = function () {
      var a = aulas[at]; pl.classList.remove('toca', 'some'); if (a) marca(a, false);       // assistiu até o fim: conta como concluída
      var prox = aulas[at + 1]; pl.classList.add('fim');
      if (!prox) {   // terminou a última
        var tds = aulas.every(feita);
        px.innerHTML = '<small>' + (tds ? 'Tudo assistido' : 'Fim da aula') + '</small><b>' + (tds && multi ? 'Você concluiu todas as aulas.' : 'Aula concluída.') + '</b><div class="bs"><button class="gh re">Assistir de novo</button><button class="ok">' + (multi ? 'Ver todas as aulas' : 'Fechar') + '</button></div>';
        px.querySelector('.re').onclick = function () { toca(at, true); }; px.querySelector('.ok').onclick = multi ? vaiHome : fecha; return;
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
    var naAula = function () { return !multi || el.classList.contains('v-aula'); };
    el._tecla = function (e) {
      if (e.key === 'Escape') { if (document.fullscreenElement || document.webkitFullscreenElement) return; e.preventDefault(); if (multi && naAula()) vaiHome(); else fecha(); }
      else if (!naAula() || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || '')) return;
      else if (e.key === ' ' || e.key === 'k') { if ((e.target || {}).tagName === 'BUTTON' && e.key === ' ') return; e.preventDefault(); alterna(); }
      else if (e.key === 'ArrowRight') pula(10);
      else if (e.key === 'ArrowLeft') pula(-10);
      else if (e.key === 'f') pl.querySelector('.tc').click();
    };
    document.addEventListener('keydown', el._tecla, true);
    // o progresso pode chegar da conta depois de a janela abrir: a tela acompanha
    var ouve = function () { if (aberta === el) { pintaXp(); if (!naAula()) pintaHome(); pintaLista(); pintaNav(); } }; ouvProg.push(ouve);
    el._para = function () { clearInterval(conta); clearTimeout(some); clearTimeout(tToast); var k = ouvProg.indexOf(ouve); if (k >= 0) ouvProg.splice(k, 1); };
    pintaXp();
    if (multi && typeof op.aula !== 'number') { el.classList.add('v-home'); pintaHome(); var pr = proxima(); at = -1; pintaLista(); toca(pr < 0 ? 0 : pr, false); el.classList.remove('v-aula'); }
    else { el.classList.add('v-aula'); var prim = typeof op.aula === 'number' ? op.aula : Math.max(0, proxima()); toca(prim, false); }
  }

  // liga um botão já existente na página: ele só aparece se houver aula para o produto, e mostra o estado (não iniciado, em andamento, concluído)
  function liga(sel, packs, op) {
    var b = typeof sel === 'string' ? document.querySelector(sel) : sel; if (!b) return; estilo();
    var poe = function () { if (!b.isConnected) return; b.hidden = !tem(packs); b.onclick = function () { abre(packs, op); }; var p = progresso(packs); b.dataset.aula = p.estado; if (p.total) b.title = (p.total > 1 ? p.feitas + ' de ' + p.total + ' aulas · ' : '') + ROTULO[p.estado]; };
    ouvintes.push(poe); ouvProg.push(poe);
    if (lista) poe(); else carrega();
  }

  window.Aulas = { carrega: carrega, recarrega: recarrega, comToken: function (f) { fonteToken = f; }, tem: tem, de: de, abre: abre, fecha: fecha, liga: liga, progresso: progresso, xp: xpTotal, selo: selo, rotulo: ROTULO,
    aoCarregar: function (f) { ouvintes.push(f); if (lista) f(); }, aoProgresso: function (f) { ouvProg.push(f); } };
  // entrou ou saiu da conta: as aulas liberadas mudam
  if (window.Base) { var logado = !!window.Base.sessao(); window.Base.aoMudar(function () { var l = !!window.Base.sessao(); if (l !== logado) { logado = l; recarrega(); } }); }
})();
