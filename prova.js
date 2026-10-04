// Base FL — PROVA SOCIAL da página dos Títulos Dinâmicos: os PRINTS REAIS dos alunos, num carrossel contínuo.
//
// REGRAS (não quebre):
//  • São prints reais de alunos do curso Reels Academy, do Fernando Luz, sem edição no texto.
//  • Eles falam do CURSO, não do pack. A página diz isso ao lado do carrossel. Nunca escreva "compradores deste produto".
//  • Para acrescentar um print: salve a imagem na pasta abaixo e acrescente uma linha em PRINTS (arquivo, largura, altura).
//
// Uso:  <div data-prova="faixa" data-linhas="2"></div>
(function () {
  var PASTA = '/conheca/legendas/assets/images/depoimentos/';
  var PRINTS = [
    ['depoimento-01.webp',901,600],
    ['depoimento-02.webp',600,600],
    ['depoimento-03.webp',748,600],
    ['depoimento-04.webp',1100,420],
    ['depoimento-05.webp',654,600],
    ['depoimento-06.webp',1100,562],
    ['depoimento-07.webp',674,600],
    ['depoimento-08.webp',1100,596],
    ['depoimento-09.webp',586,600],
    ['depoimento-10.webp',874,600],
    ['depoimento-11.webp',752,600],
    ['depoimento-12.webp',1100,566],
    ['depoimento-13.webp',803,600],
    ['depoimento-14.webp',893,600],
    ['depoimento-15.webp',595,600],
    ['depoimento-16.webp',770,600],
    ['depoimento-17.webp',580,600],
    ['depoimento-18.webp',602,600]
  ];
  var CSS = '.pv-faixa{position:relative;margin:0 calc(var(--pv-gut,20px)*-1)}' +
    '.pv-linha{display:flex;gap:14px;overflow-x:auto;padding:7px var(--pv-gut,20px);scrollbar-width:none;-webkit-overflow-scrolling:touch;cursor:grab}' +
    '.pv-linha::-webkit-scrollbar{display:none}' +
    '.pv-faixa::before,.pv-faixa::after{content:"";position:absolute;top:0;bottom:0;width:40px;z-index:2;pointer-events:none}' +
    '.pv-faixa::before{left:0;background:linear-gradient(90deg,var(--pv-bg,#0a0908),transparent)}' +
    '.pv-faixa::after{right:0;background:linear-gradient(270deg,var(--pv-bg,#0a0908),transparent)}' +
    '.pv-print{flex:none;height:var(--pv-alt,250px);padding:0;border:1px solid var(--pv-line,rgba(255,236,220,.14));border-radius:16px;overflow:hidden;background:#101214;cursor:zoom-in;user-select:none;-webkit-user-select:none}' +
    '.pv-print img{display:block;height:100%;width:auto;pointer-events:none;-webkit-user-drag:none}' +
    '.pv-print:focus-visible{outline:2px solid var(--pv-acc,#58d6c9);outline-offset:2px}' +
    '.pv-zoom{position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:18px;background:rgba(5,5,5,.9);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);cursor:zoom-out}' +
    '.pv-zoom img{max-width:100%;max-height:calc(100vh - 36px);width:auto;height:auto;border-radius:14px;box-shadow:0 30px 80px #000}' +
    '.pv-zoom button{position:fixed;top:14px;right:14px;width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;font-size:22px;cursor:pointer}' +
    '@media (min-width:760px){.pv-print{height:var(--pv-alt-d,320px)}.pv-faixa::before,.pv-faixa::after{width:120px}}';
  var calmo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function print(p, i, copia) {
    return '<button type="button" class="pv-print" data-i="' + i + '"' + (copia ? ' tabindex="-1" aria-hidden="true"' : ' aria-label="Ampliar depoimento ' + (i + 1) + ' de ' + PRINTS.length + '"') + '>' +
      '<img src="' + PASTA + p[0] + '" width="' + p[1] + '" height="' + p[2] + '" loading="lazy" decoding="async" alt="' + (copia ? '' : 'Print de mensagem de aluno do curso Reels Academy') + '"></button>';
  }
  function zoom(i) {
    var d = document.createElement('div'); d.className = 'pv-zoom'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Depoimento ampliado');
    d.innerHTML = '<button type="button" aria-label="Fechar">×</button><img src="' + PASTA + PRINTS[i][0] + '" alt="Print de mensagem de aluno do curso Reels Academy">';
    function fecha() { d.remove(); document.removeEventListener('keydown', tecla); }
    function tecla(e) { if (e.key === 'Escape') fecha(); }
    d.addEventListener('click', fecha); document.addEventListener('keydown', tecla);
    document.body.appendChild(d); d.firstChild.focus();
  }
  function anda(linha, dir) {
    // rolagem contínua por scrollLeft: o dedo (ou o mouse) pode arrastar a qualquer momento
    var meio, parado = false, visivel = false, x = 0, ult = 0, vel = 28 * dir, arrastou = false;
    function mede() { var c = linha.querySelectorAll('.pv-print'); var m = c[Math.floor(c.length / 2)]; meio = c.length > 1 && m ? m.offsetLeft - c[0].offsetLeft : linha.scrollWidth / 2; if (dir < 0 && !linha.scrollLeft) linha.scrollLeft = meio; x = linha.scrollLeft; }
    function passo(t) {
      if (!visivel) { ult = 0; return; }
      if (ult && !parado && meio > 0) {
        x += vel * Math.min(.05, (t - ult) / 1000);
        if (x >= meio) x -= meio; else if (x <= 0) x += meio;
        linha.scrollLeft = x;
      } else x = linha.scrollLeft;
      ult = t; requestAnimationFrame(passo);
    }
    var solta;
    function pausa() { parado = true; clearTimeout(solta); }
    function volta(ms) { clearTimeout(solta); solta = setTimeout(function () { x = linha.scrollLeft; if (x >= meio) { x -= meio; linha.scrollLeft = x; } parado = false; }, ms); }
    linha.addEventListener('mouseenter', pausa); linha.addEventListener('mouseleave', function () { volta(200); });
    linha.addEventListener('touchstart', pausa, { passive: true }); linha.addEventListener('touchend', function () { volta(2600); }, { passive: true });
    linha.addEventListener('focusin', pausa); linha.addEventListener('focusout', function () { volta(400); });
    var px = null, sx = 0;
    linha.addEventListener('mousedown', function (e) { px = e.clientX; sx = linha.scrollLeft; arrastou = false; });
    window.addEventListener('mousemove', function (e) { if (px != null) { if (Math.abs(e.clientX - px) > 6) arrastou = true; linha.scrollLeft = sx - (e.clientX - px); } });
    window.addEventListener('mouseup', function () { px = null; });
    linha.addEventListener('click', function (e) { var b = e.target.closest('.pv-print'); if (b && !arrastou) zoom(+b.dataset.i); arrastou = false; });
    window.addEventListener('resize', mede); linha.addEventListener('load', mede, true);
    if (calmo || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (en) {
      var v = en[0].isIntersecting; if (v && !visivel) { visivel = true; mede(); requestAnimationFrame(passo); } else visivel = v;
    }, { threshold: 0 }).observe(linha);
  }
  function monta() {
    var els = [].slice.call(document.querySelectorAll('[data-prova]')); if (!els.length) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    els.forEach(function (el) {
      var n = Math.max(1, Math.min(2, +el.getAttribute('data-linhas') || 1)), linhas = [];
      for (var i = 0; i < n; i++) linhas.push([]);
      PRINTS.forEach(function (p, i) { linhas[i % n].push([p, i]); });
      el.className += ' pv-faixa';
      el.innerHTML = linhas.map(function (l) {
        var a = l.map(function (x) { return print(x[0], x[1], false); }).join(''), b = calmo ? '' : l.map(function (x) { return print(x[0], x[1], true); }).join('');
        return '<div class="pv-linha" role="group" aria-label="Prints de depoimentos de alunos do curso">' + a + b + '</div>';
      }).join('');
      [].slice.call(el.querySelectorAll('.pv-linha')).forEach(function (l, i) { anda(l, i % 2 ? -1 : 1); });
    });
  }
  window.ProvaFL = { prints: PRINTS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', monta); else monta();
})();
