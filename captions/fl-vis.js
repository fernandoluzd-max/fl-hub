/* Código do visitante (fl_vis) nos links do checkout da Greenn.
   A Greenn guarda parâmetros extras do link na venda; o webhook (origemDe) grava o fl_vis; a página de obrigado
   (/completa/upsell/) usa o MESMO fl_vis do navegador para o servidor achar a compra e escolher a oferta certa.
   Não guarda dado pessoal: só o código aleatório do visitante (o mesmo fl_vis usado em /oferta/mood/ e no rastreio). */
(function () {
  'use strict';
  var HOST = /(^|\.)payfast\.greenn\.com\.br$/;
  function vis() {
    var v = null; try { v = localStorage.getItem('fl_vis'); } catch (e) {}
    if (!v) { var m = document.cookie.match('(?:^|; )fl_vis=([^;]*)'); v = m ? decodeURIComponent(m[1]) : null; }
    if (!v || !/^v[a-z0-9]{10,30}$/.test(v)) {
      v = 'v' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
      try { localStorage.setItem('fl_vis', v); } catch (e) {}
      document.cookie = 'fl_vis=' + v + ';path=/;max-age=31536000;SameSite=Lax';
    }
    return v;
  }
  function comVis(u) {
    try { var x = new URL(u, location.href); if (!HOST.test(x.hostname)) return u; x.searchParams.set('fl_vis', vis()); return x.toString(); } catch (e) { return u; }
  }
  function marca(a) {
    ['href', 'data-destino'].forEach(function (at) { var v = a.getAttribute && a.getAttribute(at); if (v && v.indexOf('payfast.greenn.com.br') > -1) { var n = comVis(v); if (n !== v) a.setAttribute(at, n); } });
  }
  function todos() { var l = document.querySelectorAll('a[href*="payfast.greenn.com.br"],a[data-destino*="payfast.greenn.com.br"]'); for (var i = 0; i < l.length; i++) marca(l[i]); }
  function inicia() {
    todos();
    try { new MutationObserver(todos).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'data-destino'] }); } catch (e) {}
    document.addEventListener('click', function (e) { var a = e.target && e.target.closest && e.target.closest('a'); if (a) marca(a); }, true);   // última chance, antes de sair da página
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicia); else inicia();
})();
