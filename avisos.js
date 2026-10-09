/* Base FL — RECADOS EM VÍDEO (avisos da plataforma)
   Um arquivo só, igual no app do computador (ui/avisos.js) e no site (/avisos.js).
   Os recados ficam em avisos.json (na raiz do site). Para publicar um recado novo, basta acrescentar um bloco lá:
   não precisa mexer nesta tela nem lançar versão nova do app.
   "Novo" = recado com destaque que este aparelho ainda não abriu (fica guardado no próprio aparelho). */
(function () {
  if (window.Avisos) return;
  var K = '242,165,65';
  var mem = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  // abrir link do botão: no app o site injeta um abridor (abre no navegador do computador); no site, abre numa aba nova.
  var abrirLink = null;
  function abreLink(u) { if (abrirLink) { try { abrirLink(u); return; } catch (e) {} } try { var w = window.open(u, '_blank', 'noopener'); if (!w) location.href = u; } catch (e) { location.href = u; } }
  var noSite = /^https?:$/.test(location.protocol) && /(^|\.)basefl\.com$|^localhost$|^127\.0\.0\.1$/.test(location.hostname);
  var RAIZ = noSite ? '' : 'https://basefl.com';
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var MESES_L = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  /* ---------- dados ---------- */
  // só entra o que tem id, título e um vídeo https hospedado no Base FL; o resto é ignorado (um bloco errado não derruba os outros)
  function hostOk(u) { try { var x = new URL(u, 'https://basefl.com'); return x.protocol === 'https:' && /(^|\.)basefl\.com$/.test(x.hostname); } catch (e) { return false; } }
  function texto(v, max) { return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : ''; }
  function limpa(j) {
    var l = j && Array.isArray(j.avisos) ? j.avisos : [], vistos = {}, out = [];
    l.forEach(function (a, i) {
      if (!a || typeof a !== 'object' || a.ativo === false) return;
      var id = texto(a.id, 60), tit = texto(a.titulo, 90), video = texto(a.video, 300);
      if (!/^[a-z0-9][a-z0-9-]*$/i.test(id) || vistos[id] || !tit || !/^https:\/\//i.test(video) || !hostOk(video)) return;
      vistos[id] = 1;
      var capa = texto(a.capa, 300); if (capa && !hostOk(capa)) capa = '';
      var d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto(a.data, 10)), seg = +a.capa_seg;
      // botão de ação do recado: só vale se tiver texto e um link https do próprio Base FL
      var ctaT = texto(a.cta_texto, 28), ctaL = texto(a.cta_link, 300);
      var cta = (ctaT && /^https:\/\//i.test(ctaL) && hostOk(ctaL)) ? { texto: ctaT, link: ctaL } : null;
      out.push({ id: id, titulo: tit, descricao: texto(a.descricao, 220), video: video, capa: capa, capa_seg: seg >= 0 && seg < 36000 ? seg : 1, cta: cta,
        data: d ? d[0] : '', duracao: /^\d{1,3}:\d{2}$/.test(texto(a.duracao, 8)) ? texto(a.duracao, 8) : '', destaque: a.destaque !== false, ordem: isFinite(+a.ordem) ? +a.ordem : 1000 + i, _i: i });
    });
    out.sort(function (a, b) { return a.ordem - b.ordem || (a.data < b.data ? 1 : a.data > b.data ? -1 : 0) || a._i - b._i; });
    return { titulo: texto(j && j.titulo, 40) || 'Recados do Base FL', avisos: out };
  }
  var dados = limpa(null), pedido = null, montados = [];
  (function () {       // primeira pintura: o que veio na última vez (ou o que veio junto com o app)
    var c = null; try { c = JSON.parse(mem.get('fl_avisos_cache') || 'null'); } catch (e) {}
    var d = limpa(c); if (!d.avisos.length && window.AVISOS_BASE) d = limpa(window.AVISOS_BASE);
    dados = d;
  })();
  function carrega() {
    if (pedido) return pedido;
    pedido = fetch(RAIZ + '/avisos.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) { var d = limpa(j); dados = d; mem.set('fl_avisos_cache', JSON.stringify(j)); pinta(); return d; })
      .catch(function () { return dados; });       // sem internet ou sem o arquivo: fica o que já estava
    return pedido;
  }
  function recarrega() { pedido = null; return carrega(); }

  /* ---------- visto / novo ---------- */
  function vistos() { try { var v = JSON.parse(mem.get('fl_avisos_vistos') || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
  var vistoAgora = {};      // sem armazenamento no aparelho, vale pelo menos enquanto a tela estiver aberta
  function visto(a) { return !!(vistoAgora[a.id] || vistos()[a.id]); }
  function marca(a) { vistoAgora[a.id] = 1; var v = vistos(); if (!v[a.id]) { v[a.id] = Date.now(); mem.set('fl_avisos_vistos', JSON.stringify(v)); } }
  function novo(a) { return a.destaque && !visto(a); }
  function novos() { return dados.avisos.filter(novo); }

  /* ---------- aparência ---------- */
  var IC = {
    sino: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/></svg>',
    seta: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5l6 6 6-6"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="cheio" d="M7 4.5v15l12.5-7.5z"/></svg>',
    pausa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="cheio" d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/></svg>',
    som: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11"/></svg>',
    mudo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
    cheia: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    dir: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    x: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg>'
  };
  /* A faixa usa as cores da tela onde está (app: --card/--line/--ink/--mute; site do celular: --card/--linha/--papel/--cinza). */
  var CSS = '\
.avs{--avk:' + K + ';--avc:var(--card,#171A18);--avf:var(--bg2,var(--card,#141615));--avl:var(--line,var(--linha,#262D28));--avi:var(--ink,var(--papel,#F4F0E4));--avm:var(--mute,var(--cinza,#9d998c));--avs:var(--sub,var(--cinza,#B3B4A2));\
display:block;border:1px solid var(--avl);background:var(--avf);border-radius:var(--radius,18px);overflow:hidden;font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:var(--avi);text-align:left}\
.avs *{box-sizing:border-box}\
.avs-h{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:10px;width:100%;min-height:48px;padding:9px 12px 9px 12px;cursor:pointer;-webkit-tap-highlight-color:transparent}\
.avs-h:focus-visible{outline:2px solid var(--avi);outline-offset:-3px;border-radius:14px}\
.avs-ic{flex:none;width:30px;height:30px;border-radius:10px;display:grid;place-items:center;color:var(--avm);background:rgba(127,127,127,.12);transition:background .3s,color .3s}\
.avs-ic svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}\
.avs.tem .avs-ic{color:rgb(var(--avk));background:rgba(var(--avk),.15)}\
.avs-t{font-size:12.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--avm);white-space:nowrap}\
.avs.tem .avs-t{color:var(--avi)}\
.avs-n{flex:none;font-size:11px;font-weight:800;line-height:1;color:#141615;background:rgb(var(--avk));border-radius:99px;padding:4px 8px;white-space:nowrap}\
.avs-n[hidden],.avs-q[hidden]{display:none}\
.avs-q{margin-left:auto;font-size:12.5px;color:var(--avm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}\
.avs-n+.avs-q{margin-left:auto}\
.avs-s{flex:none;width:28px;height:28px;display:grid;place-items:center;color:var(--avm);border-radius:9px;transition:transform .25s ease,background .15s}\
.avs-q[hidden]+.avs-s{margin-left:auto}\
.avs-h:hover .avs-s{background:rgba(127,127,127,.14);color:var(--avi)}\
.avs-s svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}\
.avs.aberto .avs-s{transform:rotate(180deg)}\
.avs-l{display:none;gap:10px;padding:2px 12px 12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr))}\
.avs.aberto .avs-l{display:grid}\
.avs-c{all:unset;box-sizing:border-box;display:flex;align-items:flex-start;gap:12px;min-width:0;max-width:600px;padding:10px;border-radius:14px;border:1px solid var(--avl);background:var(--avc);cursor:pointer;transition:transform .15s,border-color .15s,box-shadow .2s;-webkit-tap-highlight-color:transparent;animation:avsin .3s ease both}\
.avs-c:nth-child(2){animation-delay:.05s}.avs-c:nth-child(3){animation-delay:.1s}.avs-c:nth-child(n+4){animation-delay:.14s}\
@keyframes avsin{from{opacity:0;transform:translateY(4px)}}\
.avs-c:hover{transform:translateY(-1px);border-color:var(--hover,rgba(127,127,127,.5))}\
.avs-c:active{transform:scale(.99)}\
.avs-c:focus-visible{outline:2px solid var(--avi);outline-offset:2px}\
.avs-c.novo{border-color:rgba(var(--avk),.45);background:linear-gradient(100deg,rgba(var(--avk),.10),rgba(var(--avk),0) 62%),var(--avc)}\
.avs-c.novo:hover{border-color:rgba(var(--avk),.8)}\
.avs-th{position:relative;flex:none;width:132px;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:radial-gradient(120% 100% at 15% 0%,rgba(var(--avk),.30),rgba(var(--avk),0) 62%),#121514;box-shadow:0 0 0 1px rgba(255,255,255,.07) inset}\
.avs-th img,.avs-th video{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity .35s;pointer-events:none}\
.avs-th .ok{opacity:1}\
.avs-th::after{content:"";position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(rgba(0,0,0,.08) 35%,rgba(0,0,0,.6));pointer-events:none}\
.avs-pl{position:absolute;z-index:1;top:50%;left:50%;width:32px;height:32px;margin:-16px 0 0 -16px;border-radius:50%;display:grid;place-items:center;background:rgba(13,15,14,.62);border:1px solid rgba(255,255,255,.26);color:#fff;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);transition:transform .2s,background .2s,color .2s,border-color .2s}\
.avs-pl svg{width:13px;height:13px;margin-left:2px;fill:currentColor}\
.avs-c.novo .avs-pl,.avs-c:hover .avs-pl{background:rgb(var(--avk));border-color:transparent;color:#141615}\
.avs-c:hover .avs-pl{transform:scale(1.08)}\
.avs-du{position:absolute;z-index:1;right:6px;bottom:6px;font-size:10.5px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums;color:#fff;background:rgba(0,0,0,.68);border-radius:5px;padding:3px 5px}\
.avs-du:empty{display:none}\
.avs-b{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;padding-top:1px}\
.avs-m{display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--avm);line-height:1.2;min-height:17px}\
.avs-m svg{flex:none;width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}\
.avs-m span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.avs-tag{flex:none;margin-left:auto;font-style:normal;font-size:10px;font-weight:800;letter-spacing:.06em;color:#141615;background:rgb(var(--avk));border-radius:6px;padding:3px 6px;line-height:1}\
.avs-b b{display:block;font-size:14.5px;font-weight:700;line-height:1.25;color:var(--avi);letter-spacing:-.005em}\
.avs-d{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12.5px;line-height:1.4;color:var(--avm)}\
.avs-a{display:inline-flex;align-items:center;gap:4px;margin-top:3px;font-size:12.5px;font-weight:700;color:var(--avs)}\
.avs-a svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;transition:transform .2s}\
.avs-c.novo .avs-a{color:rgb(var(--avk))}\
.avs-c:hover .avs-a svg{transform:translateX(3px)}\
:root[data-tema="claro"] .avs-c.novo .avs-a,:root[data-tema="claro"] .avs.tem .avs-ic{filter:brightness(.72) saturate(1.3)}\
.avs.toque{border-radius:20px;margin-top:18px;--avf:var(--card,#141716)}\
.avs.toque .avs-h{min-height:54px;padding:11px 12px 11px 13px}\
.avs.toque .avs-t{font-size:13px}.avs.toque .avs-q{font-size:13.5px}\
.avs.toque .avs-l{padding:2px 10px 10px;gap:8px}\
.avs.toque .avs-c{padding:11px;border-radius:16px;background:rgba(0,0,0,.26)}\
.avs.toque .avs-c.novo{background:linear-gradient(100deg,rgba(var(--avk),.12),rgba(var(--avk),0) 62%),rgba(0,0,0,.26)}\
.avs.toque .avs-th{width:112px}\
.avs.toque .avs-b b{font-size:15.5px}.avs.toque .avs-d{font-size:13.5px}.avs.toque .avs-a{font-size:13.5px;min-height:20px}\
@media (max-width:360px){.avs.toque .avs-th{width:92px}}\
@media (prefers-reduced-motion:reduce){.avs-c,.avs-s,.avs-pl,.avs-th img,.avs-th video{transition:none;animation:none}}\
\
.flv{position:fixed;top:0;left:0;right:0;bottom:0;z-index:9100;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(8,9,9,.78);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);opacity:0;transition:opacity .2s;font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;line-height:1.5;color:#F4F0E4;--k:' + K + ';-webkit-user-select:none;user-select:none}\
.flv.on{opacity:1}\
.flv *{box-sizing:border-box}\
.flv-cx{position:relative;width:100%;max-width:880px;max-height:100%;display:flex;flex-direction:column;background:#151817;border:1px solid #2B302E;border-radius:22px;overflow:hidden;box-shadow:0 40px 90px -30px #000;transform:translateY(10px) scale(.985);transition:transform .25s cubic-bezier(.2,.8,.2,1)}\
.flv.on .flv-cx{transform:none}\
.flv-top{display:flex;align-items:center;gap:12px;padding:13px 14px 13px 16px;border-bottom:1px solid #262b29}\
.flv-top>i{flex:none;width:36px;height:36px;border-radius:11px;display:grid;place-items:center;color:rgb(var(--k));background:rgba(var(--k),.13);border:1px solid rgba(var(--k),.32)}\
.flv-top>i svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}\
.flv-top>span{min-width:0}\
.flv-top small{display:block;font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:rgb(var(--k))}\
.flv-top b{display:block;font-family:"Archivo",inherit;font-weight:800;font-size:17px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
.flv .flv-x{all:unset;box-sizing:border-box;margin-left:auto;flex:none;width:40px;height:40px;min-width:40px;border-radius:50%;border:1px solid #2B302E;background:#1d2120;color:#F4F0E4;cursor:pointer;display:grid;place-items:center;transition:background .15s,border-color .15s}\
.flv .flv-x svg{width:16px;height:16px;display:block;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;pointer-events:none}\
.flv .flv-x:focus-visible{outline:2px solid #F4F0E4;outline-offset:2px}\
.flv .flv-x:hover{background:#2b302e;border-color:#3a413e}\
.flv-co{min-height:0;overflow-y:auto;background:#000}\
.flv-pl{position:relative;background:#000;aspect-ratio:16/9;max-height:calc(100vh - 210px);max-height:calc(100dvh - 210px);min-height:180px;margin:0 auto;overflow:hidden}\
.flv-pl video{position:absolute;top:0;left:0;width:100%;height:100%;display:block;background:#000}\
.flv-pl:fullscreen{aspect-ratio:auto;width:100%;height:100%;max-height:none}\
.flv-pl:-webkit-full-screen{aspect-ratio:auto;width:100%;height:100%;max-height:none}\
.flv-gr{position:absolute;top:50%;left:50%;width:76px;height:76px;margin:-38px 0 0 -38px;border-radius:50%;border:0;padding:0;cursor:pointer;background:rgb(var(--k));color:#141615;display:grid;place-items:center;box-shadow:0 14px 40px -10px rgba(var(--k),.9);transition:transform .15s,opacity .2s}\
.flv-gr:hover{transform:scale(1.06)}\
.flv-gr svg{width:30px;height:30px;margin-left:4px;fill:currentColor}\
.flv-pl.toca .flv-gr{opacity:0;pointer-events:none}\
.flv-esp{position:absolute;top:50%;left:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid rgba(255,255,255,.2);border-top-color:#fff;animation:flvgira .8s linear infinite;display:none;pointer-events:none}\
.flv-pl.esp .flv-esp{display:block}.flv-pl.esp .flv-gr{opacity:0}\
@keyframes flvgira{to{transform:rotate(360deg)}}\
.flv-ct{position:absolute;left:0;right:0;bottom:0;padding:34px 14px 12px;background:linear-gradient(transparent,rgba(0,0,0,.82));display:flex;flex-direction:column;gap:8px;transition:opacity .25s;pointer-events:none}\
.flv-ct>*{pointer-events:auto}\
.flv-pl.some .flv-ct{opacity:0}.flv-pl.some .flv-ct>*{pointer-events:none}.flv-pl.some{cursor:none}\
.flv-bar{position:relative;height:16px;cursor:pointer;display:flex;align-items:center;touch-action:none}\
.flv-bar i{position:absolute;left:0;height:5px;border-radius:5px;pointer-events:none}\
.flv-bar .f{right:0;background:rgba(255,255,255,.22)}.flv-bar .b{background:rgba(255,255,255,.34)}.flv-bar .p{background:rgb(var(--k))}\
.flv-bar .d{position:absolute;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.5);pointer-events:none;transform:scale(0);transition:transform .15s}\
.flv-bar:hover .d,.flv-bar.arr .d{transform:scale(1)}\
.flv-bar:focus-visible{outline:2px solid #F4F0E4;outline-offset:3px;border-radius:6px}\
.flv-ln{display:flex;align-items:center;gap:6px}\
.flv-ln button{flex:none;height:34px;min-width:34px;padding:0 8px;border:0;border-radius:9px;background:transparent;color:#fff;cursor:pointer;display:grid;place-items:center;font:700 13px/1 inherit;font-family:inherit}\
.flv-ln button:hover{background:rgba(255,255,255,.14)}\
.flv-ln button:focus-visible{outline:2px solid #F4F0E4;outline-offset:1px}\
.flv-ln svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}\
.flv-ln .cheio{fill:currentColor;stroke:none}\
.flv-tm{font-size:13px;font-variant-numeric:tabular-nums;color:#e8e6dc;margin:0 6px}\
.flv-ln .sp{flex:1}\
.flv-er{position:absolute;top:0;left:0;right:0;bottom:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:24px;background:#0c0d0d;color:#B3B4A2;font-size:15px;line-height:1.5}\
.flv-pl.erro .flv-er{display:flex}.flv-pl.erro .flv-gr,.flv-pl.erro .flv-ct,.flv-pl.erro .flv-esp{display:none}\
.flv-er b{display:block;color:#F4F0E4;font-size:17px;margin-bottom:4px}\
.flv-px{position:absolute;top:0;left:0;right:0;bottom:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;padding:20px;background:rgba(8,9,9,.86)}\
.flv-pl.fim .flv-px{display:flex}.flv-pl.fim .flv-gr,.flv-pl.fim .flv-ct{display:none}\
.flv-px small{font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:rgb(var(--k))}\
.flv-px b{font-family:"Archivo",inherit;font-weight:800;font-size:20px;line-height:1.2;max-width:26ch}\
.flv-bs{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:12px}\
.flv-bs button,.flv-er button{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:0 18px;border-radius:12px;font:700 14px/1.2 inherit;font-family:inherit;cursor:pointer;background:rgb(var(--k));color:#141615;transition:filter .15s,background .15s}\
.flv-bs button:hover{filter:brightness(1.06)}\
.flv-bs button svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}\
.flv-bs .gh,.flv-er button{background:transparent;border:1px solid #2B302E;color:#F4F0E4}\
.flv-bs .gh:hover,.flv-er button:hover{background:#1d2120;filter:none}\
.flv-bs button:focus-visible,.flv-er button:focus-visible{outline:2px solid #F4F0E4;outline-offset:2px}\
.flv-inf{padding:15px 18px 17px;border-top:1px solid #262b29;background:#151817}\
.flv-cta{all:unset;position:relative;overflow:hidden;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:9px;width:100%;margin-top:14px;min-height:54px;padding:0 20px;border-radius:15px;color:#1a1205;font:800 15.5px/1.2 inherit;font-family:"Archivo",inherit;letter-spacing:.01em;cursor:pointer;text-align:center;background:linear-gradient(100deg,rgb(var(--k)),rgba(var(--k),.80) 55%,rgb(var(--k)));background-size:200% 100%;box-shadow:0 8px 24px rgba(var(--k),.34),0 0 0 1px rgba(255,255,255,.14) inset;animation:flvpulse 2.8s ease-in-out infinite,flvslide 6s ease-in-out infinite;transition:transform .14s,box-shadow .2s,filter .15s}\
.flv-cta::before{content:"";position:absolute;top:0;left:-65%;width:48%;height:100%;background:linear-gradient(100deg,rgba(255,255,255,0),rgba(255,255,255,.6),rgba(255,255,255,0));transform:skewX(-18deg);animation:flvshine 3.6s ease-in-out infinite;pointer-events:none}\
.flv-cta>span,.flv-cta>svg{position:relative;z-index:1}\
.flv-cta svg{flex:none;width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.8;stroke-linecap:round;stroke-linejoin:round;animation:flvnudge 1.7s ease-in-out infinite}\
.flv-cta:hover{filter:brightness(1.05);box-shadow:0 12px 30px rgba(var(--k),.48),0 0 0 1px rgba(255,255,255,.2) inset}\
.flv-cta:hover svg{animation-duration:.9s}\
.flv-cta:active{transform:scale(.985)}\
.flv-cta:focus-visible{outline:2px solid #F4F0E4;outline-offset:2px}\
@keyframes flvshine{0%{left:-65%}26%{left:135%}100%{left:135%}}\
@keyframes flvpulse{0%,100%{box-shadow:0 8px 22px rgba(var(--k),.30),0 0 0 1px rgba(255,255,255,.14) inset}50%{box-shadow:0 12px 32px rgba(var(--k),.54),0 0 0 1px rgba(255,255,255,.18) inset}}\
@keyframes flvslide{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}\
@keyframes flvnudge{0%,100%{transform:translateX(0)}50%{transform:translateX(4px)}}\
@media (prefers-reduced-motion:reduce){.flv-cta,.flv-cta::before,.flv-cta>svg{animation:none}}\
.flv-inf p{font-size:15px;line-height:1.5;color:#c9c8bb;max-width:68ch}\
.flv-inf p:empty{display:none}\
.flv-inf small{display:block;margin-top:8px;font-size:12.5px;color:#8d8e80}\
.flv-inf small:empty{display:none}\
.flv-inf p:empty+small{margin-top:0}\
@media (max-width:700px){.flv{padding:0;align-items:flex-end}.flv-cx{border-radius:20px 20px 0 0;max-height:94%;border-bottom:0}.flv-inf{padding:14px 16px calc(18px + env(safe-area-inset-bottom))}.flv-gr{width:64px;height:64px;margin:-32px 0 0 -32px}.flv-gr svg{width:26px;height:26px}.flv-top b{font-size:16px}}\
@media (prefers-reduced-motion:reduce){.flv,.flv-cx,.flv-gr{transition:none}}';
  function estilo() { if (!document.getElementById('avs-css')) { var st = document.createElement('style'); st.id = 'avs-css'; st.textContent = CSS; document.head.appendChild(st); } }
  function cria(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }
  function dataCurta(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? (+m[3]) + ' ' + MESES[+m[2] - 1] : ''; }
  function dataLonga(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? (+m[3]) + ' de ' + MESES_L[+m[2] - 1] + ' de ' + m[1] : ''; }
  function tempo(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60 + 100).slice(1); }
  function endereco(u) { return /^https?:\/\//i.test(u) ? u : RAIZ + (u.charAt(0) === '/' ? u : '/' + u); }

  /* ---------- a faixa na tela inicial ---------- */
  function assinatura() { return novos().map(function (a) { return a.id; }).join(','); }
  function aberto() { var p = mem.get('fl_avisos_dobra'), n = novos().length; return n ? p !== 'f|' + assinatura() : p === 'a'; }
  // capa: imagem (se o recado tiver) ou um quadro do próprio vídeo; enquanto nada carrega, fica o fundo da faixa
  function capa(th, a) {
    if (a.capa) { var im = new Image(); im.alt = ''; im.decoding = 'async'; im.onload = function () { im.className = 'ok'; }; im.src = endereco(a.capa); th.insertBefore(im, th.firstChild); return; }
    var v = document.createElement('video'); v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.preload = 'metadata'; v.tabIndex = -1; v.setAttribute('aria-hidden', 'true');
    v.setAttribute('disablepictureinpicture', ''); v.setAttribute('controlslist', 'nodownload noremoteplayback');
    v.onloadedmetadata = function () { var du = th.querySelector('.avs-du'); if (du && !du.textContent && isFinite(v.duration) && v.duration > 0) du.textContent = tempo(v.duration); };
    v.onloadeddata = v.onseeked = function () { if (v.readyState >= 2) v.className = 'ok'; };
    v.src = a.video + '#t=' + (a.capa_seg || 1); th.insertBefore(v, th.firstChild);
  }
  function cartao(a, op) {
    var c = cria('button', 'avs-c' + (novo(a) ? ' novo' : '')); c.type = 'button'; c.setAttribute('data-aviso', a.id);
    c.innerHTML = '<span class="avs-th"><span class="avs-pl">' + IC.play + '</span><span class="avs-du"></span></span>' +
      '<span class="avs-b"><span class="avs-m">' + IC.sino + '<span></span></span><b></b><span class="avs-d"></span><span class="avs-a"><span></span>' + IC.dir + '</span></span>';
    var dt = dataCurta(a.data), ehNovo = novo(a);
    c.querySelector('.avs-m span').textContent = dt || 'Recado';
    if (ehNovo) { var tg = cria('i', 'avs-tag'); tg.textContent = 'Novo'; c.querySelector('.avs-m').appendChild(tg); }
    c.querySelector('b').textContent = a.titulo; c.querySelector('.avs-d').textContent = a.descricao;
    c.querySelector('.avs-a span').textContent = visto(a) ? 'Assistir de novo' : 'Assistir aviso';
    c.querySelector('.avs-du').textContent = a.duracao;
    c.setAttribute('aria-label', (ehNovo ? 'Novo recado: ' : 'Recado: ') + a.titulo + (a.duracao ? ' (' + a.duracao + ')' : '') + '. Assistir.');
    c.onclick = function () { abre(a.id, op); };
    return c;
  }
  function pintaUm(m) {
    var el = m.el, op = m.op, l = dados.avisos, n = novos().length;
    if (!l.length) { el.hidden = true; el.innerHTML = ''; m.chave = ''; return; }
    estilo();
    // aberta ou recolhida: decide uma vez por abertura da tela (quem assiste ao último recado não vê a faixa fechar na cara);
    // só reabre sozinha se chegar um recado novo que ainda não estava na lista
    var sig = assinatura(), ids = sig ? sig.split(',') : [];
    if (m.aberta == null || ids.some(function (id) { return m.ids.indexOf(id) < 0; })) m.aberta = aberto();
    m.ids = ids;
    var ab = m.aberta, chave = JSON.stringify([l.map(function (a) { return [a.id, a.titulo, a.descricao, a.video, a.capa, a.data, a.duracao, novo(a), visto(a)]; }), dados.titulo, ab]);
    if (chave === m.chave && el.firstChild) { el.hidden = false; return; }       // nada mudou: não redesenha (não recarrega as capas)
    m.chave = chave;
    var cx = el.querySelector('.avs');
    if (!cx) {
      el.innerHTML = '';
      cx = cria('div', 'avs' + (op.toque ? ' toque' : ''));
      cx.innerHTML = '<button class="avs-h" type="button"><span class="avs-ic">' + IC.sino + '</span><span class="avs-t"></span><span class="avs-n" hidden></span><span class="avs-q"></span><span class="avs-s">' + IC.seta + '</span></button><div class="avs-l"></div>';
      var lid = 'avs-l-' + (montados.indexOf(m) + 1); cx.querySelector('.avs-l').id = lid; cx.querySelector('.avs-h').setAttribute('aria-controls', lid);
      cx.querySelector('.avs-h').onclick = function () { var vai = !cx.classList.contains('aberto'); mem.set('fl_avisos_dobra', vai ? 'a' : 'f|' + assinatura()); m.aberta = vai; pinta(); };
      el.appendChild(cx);
    }
    cx.classList.toggle('tem', n > 0); cx.classList.toggle('aberto', ab);
    cx.querySelector('.avs-t').textContent = dados.titulo;
    var pn = cx.querySelector('.avs-n'), pq = cx.querySelector('.avs-q'), h = cx.querySelector('.avs-h');
    pn.hidden = !n; pn.textContent = n === 1 ? '1 novo' : n + ' novos';
    pq.textContent = ab ? '' : n ? 'Mostrar' : (l.length === 1 ? '1 recado' : l.length + ' recados') + (op.toque ? '' : ' em vídeo'); pq.hidden = ab;
    h.setAttribute('aria-expanded', ab ? 'true' : 'false');
    h.setAttribute('aria-label', dados.titulo + ': ' + (n ? (n === 1 ? '1 recado novo' : n + ' recados novos') : (l.length === 1 ? '1 recado' : l.length + ' recados')) + '. ' + (ab ? 'Recolher' : 'Mostrar'));
    var li = cx.querySelector('.avs-l'), tinha = li.children.length > 0;
    // só monta os cards (e pede as capas) quando a faixa está aberta
    if (ab) {
      var antigos = {}; [].forEach.call(li.children, function (c) { antigos[c.getAttribute('data-aviso') + '|' + c.getAttribute('data-ch')] = c; });
      var frag = document.createDocumentFragment();
      l.forEach(function (a) {
        var ch = JSON.stringify([a.titulo, a.descricao, a.video, a.capa, a.data, a.duracao, novo(a), visto(a)]), c = antigos[a.id + '|' + ch];
        if (!c) { c = cartao(a, op); c.setAttribute('data-ch', ch); if (tinha) c.style.animation = 'none'; capa(c.querySelector('.avs-th'), a); }
        frag.appendChild(c);
      });
      li.innerHTML = ''; li.appendChild(frag);
    }
    el.hidden = false;
  }
  function pinta() { montados = montados.filter(function (m) { return m.el && m.el.isConnected !== false; }); montados.forEach(pintaUm); ouv.forEach(function (f) { try { f(); } catch (e) {} }); }
  var ouv = [];
  function monta(el, op) {
    if (!el) return; op = op || {};
    var m = null; montados.forEach(function (x) { if (x.el === el) m = x; });
    if (!m) { m = { el: el, op: op, chave: '', aberta: null, ids: [] }; montados.push(m); } else m.op = op;
    pintaUm(m); carrega();
  }
  function desmonta(el) { montados = montados.filter(function (m) { return m.el !== el; }); if (el) { el.hidden = true; el.innerHTML = ''; } }

  /* ---------- o recado aberto (por cima da tela, sem sair da página) ---------- */
  var aberta = null;
  function fecha() {
    if (!aberta) return; var el = aberta; aberta = null;
    try { var v = el.querySelector('video'); if (v) { v.onended = v.onerror = null; v.pause(); v.removeAttribute('src'); v.load(); } } catch (e) {}
    try { var fs = document.fullscreenElement || document.webkitFullscreenElement; if (fs && el.contains(fs)) (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {}
    clearTimeout(el._some); document.removeEventListener('keydown', el._tecla, true);
    document.documentElement.style.overflow = el._rolagem || '';
    el.classList.remove('on'); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
    try { if (el._foco && el._foco.isConnected !== false) { var alvo = document.querySelector('[data-aviso="' + el._id + '"]') || el._foco; alvo.focus({ preventScroll: true }); } } catch (e) {}
  }
  function abre(id, op) {
    var l = dados.avisos, a = null; l.forEach(function (x) { if (x.id === id) a = x; }); if (!a) return false;
    var foco = aberta ? aberta._foco : document.activeElement, rolagem = aberta ? aberta._rolagem : document.documentElement.style.overflow;
    fecha(); estilo(); op = op || {};
    var el = cria('div', 'flv'); el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Recado do Base FL: ' + a.titulo);
    el._foco = foco; el._id = a.id; el._rolagem = rolagem;
    el.innerHTML = '<div class="flv-cx"><div class="flv-top"><i>' + IC.sino + '</i><span><small>Recado do Base FL</small><b></b></span><button class="flv-x" type="button" aria-label="Fechar">' + IC.x + '</button></div>' +
      '<div class="flv-co"><div class="flv-pl esp"><video playsinline preload="metadata" disablepictureinpicture controlslist="nodownload noremoteplayback"></video><div class="flv-esp"></div><button class="flv-gr" type="button" aria-label="Assistir">' + IC.play + '</button>' +
      '<div class="flv-ct"><div class="flv-bar" role="slider" aria-label="Posição do vídeo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0"><i class="f"></i><i class="b"></i><i class="p"></i><span class="d"></span></div>' +
      '<div class="flv-ln"><button class="pp" type="button" aria-label="Tocar ou pausar">' + IC.play + '</button><span class="flv-tm">0:00 / 0:00</span><span class="sp"></span><button class="vol" type="button" aria-label="Som">' + IC.som + '</button><button class="tc" type="button" aria-label="Tela cheia">' + IC.cheia + '</button></div></div>' +
      '<div class="flv-px"></div><div class="flv-er"><span><b>Não consegui carregar este recado</b>Confira sua internet e tente de novo.</span><button type="button">Tentar de novo</button></div></div>' +
      '<div class="flv-inf"><p></p><small></small></div></div></div>';
    el.querySelector('.flv-top b').textContent = a.titulo;
    el.querySelector('.flv-inf p').textContent = a.descricao;
    var dl = dataLonga(a.data); el.querySelector('.flv-inf small').textContent = dl ? 'Publicado em ' + dl : '';
    if (a.cta) {       // botão de ação abaixo do vídeo (ex.: "Usar no celular")
      var ctaB = cria('button', 'flv-cta'); ctaB.type = 'button'; ctaB.innerHTML = '<span></span>' + IC.dir;
      ctaB.querySelector('span').textContent = a.cta.texto; ctaB.onclick = function () { abreLink(a.cta.link); };
      el.querySelector('.flv-inf').appendChild(ctaB);
    }
    var pl = el.querySelector('.flv-pl'), v = el.querySelector('video'), bar = el.querySelector('.flv-bar'), tm = el.querySelector('.flv-tm'), pp = el.querySelector('.pp'), px = el.querySelector('.flv-px'), arr = false;
    function atualiza() {
      var d = v.duration || 0, c = v.currentTime || 0, k = d ? c / d * 100 : 0;
      bar.querySelector('.p').style.width = k + '%'; bar.querySelector('.d').style.left = k + '%'; bar.setAttribute('aria-valuenow', Math.round(k));
      try { if (v.buffered.length) bar.querySelector('.b').style.width = (d ? v.buffered.end(v.buffered.length - 1) / d * 100 : 0) + '%'; } catch (e) {}
      tm.textContent = tempo(c) + ' / ' + tempo(d);
    }
    function alterna() { if (v.paused) v.play().catch(function () {}); else v.pause(); }
    function mostra() { pl.classList.remove('some'); clearTimeout(el._some); if (!v.paused) el._some = setTimeout(function () { if (!arr) pl.classList.add('some'); }, 2400); }
    function toca() { pl.classList.remove('erro', 'toca', 'fim'); pl.classList.add('esp'); if (a.capa) v.poster = endereco(a.capa); v.src = a.video; v.play().catch(function () {}); }
    v.onloadedmetadata = function () { pl.classList.remove('esp'); atualiza(); };
    v.onplay = function () { pl.classList.add('toca'); pl.classList.remove('fim'); pp.innerHTML = IC.pausa; mostra(); };
    v.onpause = function () { pp.innerHTML = IC.play; pl.classList.remove('some'); if (!v.ended) pl.classList.remove('toca'); };
    v.onwaiting = function () { pl.classList.add('esp'); }; v.onplaying = v.oncanplay = function () { pl.classList.remove('esp'); };
    v.onprogress = v.ontimeupdate = atualiza;
    v.onerror = function () { pl.classList.remove('esp', 'toca'); pl.classList.add('erro'); };
    v.oncontextmenu = function (e) { e.preventDefault(); };
    v.onended = function () {
      pl.classList.remove('toca', 'some'); pl.classList.add('fim');
      var outros = dados.avisos.filter(function (x) { return x.id !== a.id; }), prox = outros.filter(novo)[0] || null;
      px.innerHTML = '<small></small><b></b><div class="flv-bs"><button class="gh re" type="button">Assistir de novo</button><button class="vai" type="button"></button></div>';
      px.querySelector('small').textContent = (!a.cta && prox) ? 'Outro recado novo' : 'Fim do recado';
      px.querySelector('b').textContent = (!a.cta && prox) ? prox.titulo : a.titulo;
      var bv = px.querySelector('.vai');
      if (a.cta) { bv.innerHTML = '<span></span>' + IC.dir; bv.querySelector('span').textContent = a.cta.texto; bv.onclick = function () { abreLink(a.cta.link); }; }
      else { bv.innerHTML = prox ? '<span>Assistir agora</span>' + IC.dir : '<span>Fechar</span>'; bv.onclick = prox ? function () { abre(prox.id, op); } : fecha; }
      px.querySelector('.re').onclick = function () { pl.classList.remove('fim'); v.currentTime = 0; v.play().catch(function () {}); };
      try { bv.focus({ preventScroll: true }); } catch (e) {}
    };
    el.querySelector('.flv-er button').onclick = toca;
    v.onclick = alterna; el.querySelector('.flv-gr').onclick = alterna; pp.onclick = alterna;
    pl.onmousemove = mostra; pl.ontouchstart = mostra;
    var pula = function (d) { if (v.duration) { v.currentTime = Math.min(v.duration - .2, Math.max(0, v.currentTime + d)); atualiza(); mostra(); } };
    v.ondblclick = function () { el.querySelector('.tc').click(); };
    el.querySelector('.vol').onclick = function () { v.muted = !v.muted; this.innerHTML = v.muted ? IC.mudo : IC.som; };
    el.querySelector('.tc').onclick = function () {
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
      if (aberta !== el) return;
      if (e.key === 'Escape') { if (document.fullscreenElement || document.webkitFullscreenElement) return; e.preventDefault(); e.stopPropagation(); fecha(); }
      else if (e.key === 'Tab') {      // o foco fica dentro do recado enquanto ele está aberto
        var f = [].filter.call(el.querySelectorAll('button, [tabindex="0"]'), function (x) { return x.offsetParent !== null; }); if (!f.length) return;
        var i = f.indexOf(document.activeElement); e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
      else if (e.key === ' ' || e.key === 'k') { if ((e.target || {}).tagName === 'BUTTON' && e.key === ' ') return; e.preventDefault(); if (!pl.classList.contains('fim') && !pl.classList.contains('erro')) alterna(); }
      else if (e.key === 'ArrowRight') pula(5);
      else if (e.key === 'ArrowLeft') pula(-5);
    };
    document.addEventListener('keydown', el._tecla, true);
    el.querySelector('.flv-x').onclick = fecha;
    el.onmousedown = function (e) { el._fora = e.target === el; }; el.onclick = function (e) { if (e.target === el && el._fora) fecha(); };
    document.documentElement.style.overflow = 'hidden';
    document.body.appendChild(el); aberta = el; void el.offsetWidth; el.classList.add('on');
    try { el.querySelector('.flv-x').focus({ preventScroll: true }); } catch (e) {}
    marca(a); pinta();        // abriu: deixa de ser "Novo"
    toca();
    return true;
  }

  window.Avisos = { monta: monta, desmonta: desmonta, abre: abre, fecha: fecha, recarrega: recarrega, carrega: carrega,
    lista: function () { return dados.avisos.slice(); }, novos: function () { return novos().length; }, aoMudar: function (f) { ouv.push(f); },
    aoAbrirLink: function (f) { abrirLink = typeof f === 'function' ? f : null; } };
})();
