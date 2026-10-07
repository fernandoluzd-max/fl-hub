/* Base FL — Pixel da Meta, só nas páginas de venda (início, /conheca/ e /oferta/).
   NÃO entra nas ferramentas, na área do aluno nem nas páginas que o cliente do aluno abre (briefing, proposta, contrato, portfólio).
   Marca: PageView (abriu a página), ViewContent (viu um produto) e InitiateCheckout (clicou para ir ao pagamento).
   A compra em si (Purchase) acontece no checkout da Greenn: é lá que o mesmo pixel precisa estar cadastrado. */
(function () {
  var ID = '1933184040544551';
  if (window.FLPixel) return;
  var PRODUTOS = {
    'legendas': ['Títulos Dinâmicos', '195639'], 'efeitos-sonoros': ['Efeitos Sonoros', '195814'], 'luts': ['LUTs', '195812'], 'mood': ['Mood', '195947'],
    'kit-freelancer': ['Kit Freelancer', '195949'], 'gerador-de-briefing': ['Gerador de Briefing', '195949'], 'quanto-cobrar': ['Quanto Cobrar?', '195949'],
    'gerador-de-contrato': ['Gerador de Contrato', '195949'], 'financas-e-demandas': ['Base Demandas', '195949'], 'caseup': ['CaseUp', '195639']
  };
  var m = /^\/(conheca|oferta)\/([a-z0-9-]+)\//.exec(location.pathname), p = m && PRODUTOS[m[2]];
  var dados = p ? { content_name: p[0], content_ids: [p[1]], content_type: 'product', content_category: 'Base FL' } : null;
  try {
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', ID); fbq('track', 'PageView');
    if (dados) fbq('track', 'ViewContent', dados);
  } catch (e) {}
  var ultimo = 0;
  function checkout() {       // uma vez por clique (alguns botões são links e também chamam esta função)
    var agora = Date.now(); if (agora - ultimo < 1500) return; ultimo = agora;
    try { if (dados) fbq('track', 'InitiateCheckout', dados); else fbq('track', 'InitiateCheckout'); } catch (e) {}
  }
  // rede de segurança: qualquer link que aponte direto para o checkout
  document.addEventListener('click', function (e) { var a = e.target && e.target.closest && e.target.closest('a[href*="payfast.greenn.com.br"]'); if (a) checkout(); }, true);
  window.FLPixel = { id: ID, checkout: checkout };
})();
