// Base FL — páginas de venda: adapta a oferta à conta de quem está logado.
// A regra (o que tem, o que falta, o que oferecer) NÃO mora aqui: vem de Base.oferta() no base.js.
// Aqui só se desenha: nunca oferecer o que a pessoa já tem, e mostrar o que a compra libera.
(function () {
  if (!window.Base || !window.FLV) return;
  var V = window.FLV, esc = Base.esc, brl = Base.brl;
  function $(s) { return document.querySelector(s); }
  function $$(s) { return [].slice.call(document.querySelectorAll(s)); }
  var kitb = $('.kitb'), kitb0 = kitb ? kitb.innerHTML : '';
  function botoes(txt, url) {
    $$('[data-comprar]').forEach(function (b) {
      if (b.dataset.o == null) b.dataset.o = b.innerHTML;
      b.innerHTML = txt == null ? b.dataset.o : esc(txt);
    });
    V.ir = url || null;
  }
  function aviso(html) { var c = $('#conta'); if (!c) return; c.innerHTML = html; c.hidden = !html; }
  function lista(l) { return '<b>' + esc(Base.nomes(l)) + '</b>'; }
  function venda(p) { return '/conheca/' + p.slug + '/?de=conta'; }

  function ajusta() {
    botoes(null); aviso('');
    if (kitb) { kitb.innerHTML = kitb0; kitb.closest('section').hidden = false; }
    $$('.kl').forEach(function (l) { l.classList.remove('meu'); });
    if (!Base.sessao()) return;
    var o = Base.oferta(), tenho = {}; o.tenho.forEach(function (p) { tenho[p.key] = 1; });

    if (V.pack === 'kit') {
      $$('.kl[data-k]').forEach(function (l) { if (tenho[l.dataset.k]) l.classList.add('meu'); });
      if (o.completo) { aviso('Você já tem as ' + o.tenho.length + ' ferramentas nesta conta. Não precisa comprar de novo.'); botoes('Abrir minhas ferramentas', Base.jornada[0].url); }
      else if (!o.todas) {
        aviso('Você já tem ' + lista(o.tenho) + '. ' + (o.faltam.length > 1 ? 'Faltam só ' : 'Falta só ') +
          o.faltam.map(function (p) { return '<a href="' + venda(p) + '">' + esc(p.nome) + ' (' + brl(p.preco) + ')</a>'; }).join(' e ') + '. Para você, sai melhor liberar ' + (o.faltam.length > 1 ? 'separadas' : 'só ela') + '.');
        botoes('Ver ' + o.faltam[0].nome, venda(o.faltam[0]));
      }
      else if (o.tenho.length) { aviso('Você já tem ' + lista(o.tenho) + '. Esta compra libera ' + lista(o.faltam) + ' na mesma conta, por ' + brl(o.todas.preco) + '.'); botoes('Liberar as outras ' + o.faltam.length + ' ferramentas'); }
      return;
    }

    var p = Base.produto(V.pack);
    if (p && p.url && Base.tem(p.pack)) { aviso('Você já tem ' + lista([p]) + ' liberado nesta conta. Não precisa comprar de novo.'); botoes('Abrir ' + p.nome, p.url); }
    if (!kitb) return;
    if (!o.todas) { kitb.closest('section').hidden = true; return; }
    $$('.kitb .trilho li[data-k]').forEach(function (l) { if (tenho[l.dataset.k]) l.classList.add('meu'); });
    if (o.tenho.length) {
      var h = kitb.querySelector('h2'), t = kitb.querySelector('p'), de = kitb.querySelector('.de'), a = kitb.querySelector('a.btn');
      if (h) h.innerHTML = 'Libere as outras ' + o.faltam.length + '. <em class="ac">Uma preenche a outra.</em>';
      if (t) t.innerHTML = 'Você já tem ' + lista(o.tenho) + '. Por ' + brl(o.todas.preco) + ' você libera ' + lista(o.faltam) + ' na mesma conta.';
      if (de) de.textContent = brl(o.todas.de) + ' separadas';
      if (a) a.firstChild.textContent = 'Liberar as outras ' + o.faltam.length + ' ';
    }
  }
  Base.pronto.then(ajusta, ajusta);
  Base.aoMudar(ajusta);
})();
