'use strict';
// Seção do Base FL que apresenta o Base Captions (ferramenta do Base FL; o programa é baixado à parte) e o aviso de primeira abertura.
// Regras:
//  • O Base Captions e os Títulos Dinâmicos são produtos SEPARADOS. Ter um não libera o outro.
//  • Quem tem a licença fl-captions ativa vê os botões de baixar. Quem não tem vê o cartão com cadeado e o convite de compra.
//  • O preço do Base Captions é único para todos (R$ 47, acesso por 1 ano). Não existe "preço de aluno".
//  • Os instaladores ficam num repositório público só de downloads, com nomes fixos de arquivo (nunca no fl-hub, cujas releases são do próprio Base FL).
(function () {
  var BASE = 'https://github.com/fernandoluzd-max/base-captions-releases/releases/latest/download/';
  var APP = { pack: 'fl-captions', nome: 'Base Captions', icone: 'icones/captions.png', cor: '255,225,77',
    desc: 'Legendas automáticas para o CapCut Desktop. Ferramenta do Base FL: o programa é baixado à parte, em Mac ou Windows.',
    links: { mac: BASE + 'Base-Captions-Mac.dmg', win: BASE + 'Base-Captions-Windows.exe' } };
  var PACK_TITULOS = 'fl-legendas', PRECO = 47;               // preço oficial do Base Captions (o mesmo da Greenn, produto 203539)
  var PAGINA = 'https://basefl.com/conheca/base-captions/?de=app';
  var CHAVE_AVISO = 'fl_apps_banner_v1';                     // guardado neste aparelho: depois que a pessoa fecha o banner, ele não volta
  var reais = function (n) { return 'R$ ' + String(Number(n)).replace('.', ','); };
  var CADEADO = '<svg viewBox="0 0 24 24" fill="none" stroke="#F2A541" stroke-width="2.4" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

  function so() { var u = (typeof navigator !== 'undefined' && navigator.userAgent) || ''; return /Windows/i.test(u) ? 'win' : /Mac/i.test(u) ? 'mac' : null; }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function botao(txt, cls, fn) { var b = el('button', cls, txt); b.type = 'button'; b.onclick = fn; return b; }
  var mem = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  /** Qual dos 4 casos de acesso é este cliente: 'ambos' | 'captions' | 'titulos' | 'nenhum'. Só olha as licenças ativas. */
  function estado(owned) {
    var tem = function (k) { return !!(owned && owned.has && owned.has(k)); };
    var c = tem(APP.pack), t = tem(PACK_TITULOS);
    return c && t ? 'ambos' : c ? 'captions' : t ? 'titulos' : 'nenhum';
  }

  /** o = { ok: boolean (catálogo carregou), owned: Set de pack_id com licença válida, abre: function (url) } */
  function desenha(o) {
    var sec = document.getElementById('s-apps'); if (!sec) return; var cards = sec.querySelector('.cards'); cards.textContent = '';
    if (!o || !o.ok) { sec.hidden = true; return; }              // catálogo não carregou: não mostra cadeado para quem pode ser dono
    sec.hidden = false;
    var est = estado(o.owned), tem = est === 'captions' || est === 'ambos', abre = o.abre;
    var c = el('div', 'card k-captions' + (tem ? ' on' : ' locked clica')); c.style.setProperty('--c', APP.cor);
    var ic = el('div', 'icon'); var img = el('img'); img.src = APP.icone; img.alt = ''; img.width = 72; img.height = 72; img.draggable = false; ic.appendChild(img);
    if (!tem) { var cad = el('span', 'lock'); cad.innerHTML = CADEADO; ic.appendChild(cad); c.appendChild(el('span', 'selo', 'Conheça')); }
    c.appendChild(ic); c.appendChild(el('h3', null, APP.nome)); c.appendChild(el('p', null, APP.desc));
    var b = el('div', 'btns');
    if (tem) {
      var meu = so(), outro = meu === 'win' ? 'mac' : 'win';
      var meta = el('div', 'meta'); meta.appendChild(el('span', 'dot ok')); meta.appendChild(document.createTextNode('Liberado na sua conta · baixa à parte')); c.appendChild(meta);
      var dica = el('p', null, 'Depois de instalar, abra o Base Captions e entre com este mesmo e-mail.'); dica.style.fontSize = '12.5px'; c.appendChild(dica);
      if (est === 'ambos') { var dois = el('p', null, 'Seus Títulos Dinâmicos continuam aqui no Base FL.'); dois.style.fontSize = '12.5px'; c.appendChild(dois); }
      if (meu) b.appendChild(botao(meu === 'win' ? 'Baixar para Windows' : 'Baixar para Mac', 'primary', function () { abre(APP.links[meu]); }));
      else b.appendChild(botao('Baixar para Mac', 'primary', function () { abre(APP.links.mac); }));
      b.appendChild(botao(meu ? (outro === 'win' ? 'Windows' : 'Mac') : 'Baixar para Windows', 'ghost', function () { abre(APP.links[meu ? outro : 'win']); }));
      c.appendChild(b);
      if (meu !== 'win') { var n = el('p', null, 'Mac com chip Apple (M1 ou mais novo).'); n.style.fontSize = '12px'; n.style.opacity = '.7'; c.appendChild(n); }
    } else {
      var m2 = el('div', 'meta'), ofe = el('span', 'oferta');
      ofe.appendChild(el('b', null, reais(PRECO))); ofe.appendChild(document.createTextNode(' · acesso por 1 ano')); m2.appendChild(ofe); c.appendChild(m2);
      var nota = el('p', null, est === 'titulos'
        ? 'Seus Títulos Dinâmicos continuam aqui no Base FL. O Base Captions é outra ferramenta do Base FL, com compra própria.'
        : 'Ainda não está na sua conta do Base FL. Conheça quando quiser.');
      nota.style.fontSize = '12.5px'; c.appendChild(nota);
      var ir = function () { abre(PAGINA); };
      b.appendChild(botao('Conhecer o Base Captions  →', 'primary cta', ir)); c.appendChild(b);
      c.onclick = function (e) { if (!e.target.closest('button')) ir(); };
    }
    cards.appendChild(c);
    banner(o, est);
  }

  /** Banner de destaque no topo da tela inicial (sem vídeo). Texto diferente para quem tem e para quem não tem o Base Captions.
   *  Fica até a pessoa fechar no X; depois de fechado não volta mais neste aparelho. */
  function banner(o, est) {
    var box = document.getElementById('apps-banner'); if (!box) return;
    box.textContent = '';
    if (mem.get(CHAVE_AVISO)) { box.hidden = true; return; }
    box.hidden = false;
    var tem = est === 'captions' || est === 'ambos', abre = o.abre;
    var b = el('div', 'ab'); b.setAttribute('role', 'region'); b.setAttribute('aria-label', 'Novidade: Base Captions');
    var ic = el('img', 'ab-ic'); ic.src = APP.icone; ic.alt = ''; ic.width = 64; ic.height = 64; ic.draggable = false; b.appendChild(ic);
    var tx = el('div', 'ab-tx');
    tx.appendChild(el('span', 'ab-sel', tem ? 'Liberado na sua conta' : 'Novidade no Base FL'));
    tx.appendChild(el('h3', null, tem ? 'Seu Base Captions está liberado!' : 'Chegou o Base Captions: legendas automáticas no CapCut'));
    tx.appendChild(el('p', null, tem
      ? 'É a ferramenta de legendas do Base FL. Baixe o programa, instale e entre com este mesmo e-mail. Seus outros produtos continuam aqui.'
      : 'Uma ferramenta nova do Base FL: legendas prontas em poucos cliques. ' + reais(PRECO) + ' · acesso por 1 ano. Seus produtos atuais continuam aqui.'));
    b.appendChild(tx);
    var ac = el('div', 'ab-ac');
    if (tem) { var meu = so() || 'mac'; ac.appendChild(botao(meu === 'win' ? 'Baixar para Windows' : 'Baixar para Mac', 'primary', function () { abre(APP.links[meu]); })); }
    else ac.appendChild(botao('Conhecer o Base Captions  →', 'primary', function () { abre(PAGINA); }));
    b.appendChild(ac);
    var x = botao('×', 'ab-x', function () { mem.set(CHAVE_AVISO, '1'); box.hidden = true; box.textContent = ''; }); x.setAttribute('aria-label', 'Fechar aviso'); b.appendChild(x);
    box.appendChild(b);
  }
  window.AppsFL = { desenha: desenha, _estado: estado, _app: APP, _so: so, _preco: PRECO, _chave: CHAVE_AVISO };
})();
