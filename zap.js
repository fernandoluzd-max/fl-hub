// ============================================================
// BOTÃO FLUTUANTE DO WHATSAPP (atendimento Base FL)
// Em cada página abre o WhatsApp do atendimento já com uma primeira mensagem sobre a ferramenta da página.
// Fica acima das barras fixas de compra (não cobre o botão de comprar) e abaixo das janelas (z-index 800).
// Para trocar o número: só aqui.
// ============================================================
(function () {
  if (window.FLZap) return;
  var NUMERO = '5547996974735';

  // página -> como a pessoa pergunta
  var PAGINAS = {
    'legendas': 'Oi! Gostaria de saber mais sobre os Títulos Dinâmicos.',
    'kit-freelancer': 'Oi! Gostaria de saber como funciona o Kit Freelancer.',
    'mood': 'Oi! Gostaria de saber como funciona o Mood.',
    'luts': 'Oi! Gostaria de saber mais sobre as LUTs.',
    'efeitos-sonoros': 'Oi! Gostaria de saber mais sobre os Efeitos Sonoros.',
    'quanto-cobrar': 'Oi! Gostaria de saber como funciona o Quanto Cobrar.',
    'gerador-de-briefing': 'Oi! Gostaria de saber como funciona o Gerador de Briefing.',
    'gerador-de-contrato': 'Oi! Gostaria de saber como funciona o Gerador de Contrato.',
    'financas-e-demandas': 'Oi! Gostaria de saber como funciona o Base Demandas.',
    'caseup': 'Oi! Gostaria de saber como funciona o CaseUp.',
    'instalar': 'Oi! Preciso de ajuda para instalar o Base FL.',
    'docs': 'Oi! Preciso de ajuda com o Base FL.'
  };
  var PADRAO = 'Oi! Gostaria de saber mais sobre o Base FL.';

  function mensagem() {
    var el = document.currentScript || document.querySelector('script[src*="zap.js"]');
    var propria = el && el.getAttribute('data-msg');
    if (propria) return propria;
    var partes = location.pathname.split('/').filter(Boolean);
    var chave = partes[0] === 'conheca' ? partes[1] : partes[0];
    return PAGINAS[chave] || PADRAO;
  }
  var MSG = mensagem();
  var link = function () { return 'https://wa.me/' + NUMERO + '?text=' + encodeURIComponent(MSG); };

  function montar() {
    var css = document.createElement('style');
    css.textContent =
      '.flzap{position:fixed;right:16px;bottom:16px;z-index:800;width:56px;height:56px;border-radius:50%;display:grid;place-items:center;' +
      'background:#25D366;color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.35);text-decoration:none;transition:transform .15s ease,bottom .2s ease;' +
      '-webkit-tap-highlight-color:transparent}' +
      '.flzap:hover{transform:scale(1.06)}.flzap:active{transform:scale(.96)}' +
      '.flzap svg{width:30px;height:30px;display:block}' +
      '.flzap:focus-visible{outline:3px solid #fff;outline-offset:3px}' +
      '@media (min-width:720px){.flzap{right:24px;bottom:24px;width:60px;height:60px}}' +
      '@media print{.flzap{display:none}}';
    document.head.appendChild(css);

    var a = document.createElement('a');
    a.className = 'flzap';
    a.href = link();
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('aria-label', 'Tirar dúvidas no WhatsApp');
    a.title = 'Tirar dúvidas no WhatsApp';
    a.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 3C8.8 3 3 8.7 3 15.8c0 2.3.6 4.5 1.8 6.5L3 29l6.9-1.8c1.9 1 4 1.6 6.1 1.6 7.2 0 13-5.7 13-12.8C29 8.7 23.2 3 16 3zm0 23.5c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-4.1 1.1 1.1-4-.3-.4c-1.1-1.7-1.6-3.6-1.6-5.6 0-5.9 4.9-10.6 10.8-10.6s10.8 4.8 10.8 10.6S21.9 26.5 16 26.5zm5.9-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.2 1.4 3.4c.2.2 2.4 3.6 5.8 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"/></svg>';
    a.addEventListener('click', function () {
      try { if (window.fbq) fbq('track', 'Contact'); } catch (e) {}
    });
    document.body.appendChild(a);

    // barras fixas no rodapé (botão de comprar): o botão sobe para ficar acima delas
    var barras = [];
    var todos = document.body.getElementsByTagName('*');
    for (var i = 0; i < todos.length; i++) {
      var el = todos[i];
      if (el === a || a.contains(el)) continue;
      var cs = getComputedStyle(el);
      if (cs.position === 'fixed' && cs.bottom === '0px' && cs.left === '0px' && cs.right === '0px') barras.push(el);
    }
    var agendado = false;
    function ajustar() {
      agendado = false;
      var base = innerWidth >= 720 ? 24 : 16, extra = 0;
      for (var j = 0; j < barras.length; j++) {
        var b = barras[j], s = getComputedStyle(b);
        if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.1) continue;
        var r = b.getBoundingClientRect();
        if (r.height && r.top < innerHeight - 4) extra = Math.max(extra, innerHeight - r.top);
      }
      a.style.bottom = (base + extra) + 'px';
    }
    function agendar() { if (!agendado) { agendado = true; requestAnimationFrame(ajustar); } }
    addEventListener('scroll', agendar, { passive: true });
    addEventListener('resize', agendar);
    setInterval(agendar, 800);   // barras que aparecem por classe ou animação
    ajustar();
  }

  window.FLZap = { numero: NUMERO, link: link };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
