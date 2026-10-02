// Base FL — PROVA SOCIAL (um lugar só para todas as páginas de venda)
//
// REGRAS (não quebre):
//  • São depoimentos REAIS de alunos do curso Reels Academy, do Fernando Luz. O texto é o que a pessoa
//    escreveu, sem reescrever. Quando só um trecho é usado, ele começa ou termina com "…".
//  • NÃO são avaliações das ferramentas nem dos packs. Toda seção que usa isto diz, na própria página,
//    que são alunos do curso. Nunca escreva "compradores deste produto".
//  • Para acrescentar um depoimento: copie do print, palavra por palavra, e marque os temas.
//
// Uso na página:
//   <div data-prova="faixa" data-temas="legendas,didatica" data-linhas="2"></div>   carrossel contínuo
//   <div data-prova="trio"  data-ids="dm-legendas,falcone,pumpup"></div>            3 depoimentos fixos
(function () {
  var D = [
    { id: 'cliente', t: 'Ah, @Fernando Luz eu fechei minha primeira cliente de edição de vídeo. Ela amou o jeito que eu editei o vídeo. Graças ao seu curso consegui entregar um resultado muito legal para ela. Ainda falta melhorar algumas coisas, mas é só o começo! 🔥', q: 'Aluna', o: 'WhatsApp', k: 'trabalho' },
    { id: 'modulo-legendas', t: '… O conteúdo referente a legendas é top, comprei basicamente por causa desse módulo e saí satisfeito. Já que tem atualizações constantes, aguardo mais aulas. Abraço!', q: 'Aluno', o: 'Instagram', k: 'legendas' },
    { id: 'sunset', t: 'Muito bom ! seu curso. Eu gostei, e ele ensina muito bem de modo simples e fácil de aplicar. Sucesso. Abriu cabeça. Parabéns e sucesso. 🎯💪🍀', q: '@agenciasunset', o: 'Instagram', k: 'didatica' },
    { id: 'pumpup', t: 'Melhor curso de edição de vídeo e fora as legendas 100% praticidade e sem enrolação', q: '@pumpupdigital', o: 'Instagram', k: 'legendas,didatica' },
    { id: 'anny', t: 'O curso dele é completo!!! Ele ensina até para uma criança que NUNCA mexeu no capcut, é didático, simples e o melhor: DO COMEÇO AO FIM COMPLETÍSSIMO! 👏🏻', q: '@annyglw', o: 'Instagram', k: 'didatica,capcut' },
    { id: 'fora-da-curva', t: 'Faala Fernando, comprei seu curso de edição e achei ele muito fora da curva.. bizarro custar esse preço', q: 'Aluno', o: 'Mensagem direta', k: 'valor' },
    { id: 'joaopaulo', t: 'Treinamento muito bom! Realmente entrega conteúdo que dá pra colocar em prática.', q: '@joaopaulo_varejo', o: 'Instagram', k: 'didatica,trabalho' },
    { id: 'falcone', t: 'SURREAL, eu pagava um app pra so pra legendar e pagava 69,90/mes. Comprei seu curso tem 14 minutos e ja aprendi o que precisava!!!!! Show de bola 🚀', q: '@lcsfalcone', o: 'Instagram', k: 'legendas,valor' },
    { id: 'dm-legendas', t: 'Bom dia, parabéns pelo curso, gostei bastante, conteúdo leve e de fácil absorção!! Comprei mais por conta das legendas dinâmicas. Mas o conteúdo inteiro é excelente!!!', q: 'Aluno', o: 'Mensagem direta', k: 'legendas,didatica' },
    { id: 'michelly', t: 'Eu fiz o curso e é simplesmente maravilhoso, me ajudou muito nos meus trabalhos e é super prático e simples de entender 👏🏻👏🏻👏🏻', q: '@michellychiminacio', o: 'Instagram', k: 'trabalho,didatica' },
    { id: 'mara', t: 'Amo esse curso todas as vezes que preciso revisito ele e sempre tem novidades 👏🏻👏🏻👏🏻', q: '@mararasmussen_', o: 'Instagram', k: 'geral' },
    { id: 'lincoln', t: 'Acabei de finalizar o Módulo 05 e achei excelente a metodologia do @Fernando Luz em fazer um exercício de ponta a ponta, fornecendo o material de apoio. Obrigado @Fernando Luz, você é muito bom.', q: 'Lincoln', o: 'WhatsApp', k: 'didatica,material' },
    { id: 'dowglas', t: 'Sou aluno e afirmo: O curso desse cara mudou meu trabalho pra crl@@@', q: '@dowglas.socialmedia', o: 'Instagram', k: 'trabalho' },
    { id: 'luh', t: 'Comprei o curso, ainda estou nos primeiros vídeos e de cara a apresentação já me segurou, diferente de muitos cursos que iniciei e já cansaram no início. Tem bastante conteúdo e é bem explicado. Já recomendo de agora', q: '@luhreisss', o: 'Instagram', k: 'didatica' },
    { id: 'lavine', t: 'Ele explica como se tivesse explicando pra um jumento... exatamente o que eu precisava. Obrigada pelas aulas! 🙏🏻', q: '@lavineak', o: 'Instagram', k: 'didatica' },
    { id: 'anuncio', t: '… Comprei o curso, sem mesmo lhe conhecer ou acompanhar seu trabalho. Hoje assisti algumas aulas, e foi muito legal. Aprendi várias ferramentas bacanas que sem dúvidas me auxiliaram no processo de criação. …', q: 'Aluna', o: 'Mensagem direta', k: 'geral,material' },
    { id: 'iara', t: 'Sim, curso bem estruturado e completo! Realmente, BARATO demais para o que oferece', q: '@iara.barros___', o: 'Instagram', k: 'valor' },
    { id: 'isadora', t: 'eu comprei o curso hoje, geralmente não sou mt de me manifestar kkk mas já assisti mts aulas pq tenho trabalhado com edições de vídeos e simplesmente to impressionada com a entrega de conteúdo, estou mt feliz cm a compra!', q: 'Isadora', o: 'WhatsApp', k: 'trabalho,valor' },
    { id: 'ramon', t: 'Ensino direto e rápido. Tooop', q: '@ramonmenezesp', o: 'Instagram', k: 'didatica' },
    { id: 'jf', t: 'Muito bom. Comprei faz 2 dias , tenho aprendido muito , curso sem enrolação, é cumpre o que diz.', q: '@jf.socialmidia', o: 'Instagram', k: 'didatica,valor' },
    { id: 'simplicidade', t: 'Boa noite! Comprei seu curso e estou gostando bastante. Quero parabenizar pela didática, mas principalmente pela simplicidade na explicação e nos equipamentos para começar. Ficou super acessível para qualquer profissional aprender e começar a fazer', q: 'Aluno', o: 'Mensagem direta', k: 'didatica' },
    { id: 'marcello', t: 'O curso é ótimo! Podem comprar sem medo.', q: '@marcelloalramos', o: 'Instagram', k: 'geral' },
    { id: 'concurseira', t: 'Eu tô amando o curso, gente. Compra que vale a pena', q: '@concurseiraquecorre', o: 'Instagram', k: 'geral' },
    { id: 'ricardo', t: 'Comprei o curso ontem e maratonei, muito bom!', q: '@ricardo.eccel', o: 'Instagram', k: 'geral' },
    { id: 'antonio', t: 'Parabéns didática muito boa 👏🏻', q: '@drantonio.ortopedista', o: 'Instagram', k: 'didatica' },
    { id: 'saude', t: '… O que mais me encantou foi como o curso traz soluções acessíveis, mostrando que dá pra ter um ótimo resultado sem gastar muito. Sua didática ajuda demais, deixa tudo leve e possível. …', q: 'Aluna, área da saúde', o: 'WhatsApp', k: 'didatica,valor' }
  ];
  var POR = {}; D.forEach(function (d) { d.k = d.k.split(','); POR[d.id] = d; });

  var CSS = '.pv-faixa{position:relative;margin:0 calc(var(--pv-gut,20px)*-1)}' +
    '.pv-linha{display:flex;gap:14px;overflow-x:auto;padding:7px var(--pv-gut,20px);scrollbar-width:none;-webkit-overflow-scrolling:touch;cursor:grab}' +
    '.pv-linha::-webkit-scrollbar{display:none}' +
    '.pv-faixa::before,.pv-faixa::after{content:"";position:absolute;top:0;bottom:0;width:56px;z-index:2;pointer-events:none}' +
    '.pv-faixa::before{left:0;background:linear-gradient(90deg,var(--pv-bg,#0a0908),transparent)}' +
    '.pv-faixa::after{right:0;background:linear-gradient(270deg,var(--pv-bg,#0a0908),transparent)}' +
    '.pv-card{flex:none;width:min(78vw,340px);margin:0;display:flex;flex-direction:column;justify-content:space-between;gap:14px;padding:18px 18px 16px;border-radius:18px;background:var(--pv-card,#141210);border:1px solid var(--pv-line,rgba(255,236,220,.1));user-select:none;-webkit-user-select:none}' +
    '.pv-card blockquote{margin:0;font-size:15.5px;line-height:1.5;color:var(--pv-ink,#f4f0e4);overflow-wrap:anywhere}' +
    '.pv-card blockquote::before{content:"\\201C";display:block;height:22px;font:900 40px/1 Georgia,serif;color:var(--pv-acc,#58d6c9)}' +
    '.pv-card figcaption{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--pv-mute,#aaa59b)}' +
    '.pv-card figcaption b{color:var(--pv-ink,#f4f0e4);font-weight:600}' +
    '.pv-card figcaption i{font-style:normal;margin-left:auto;padding:3px 8px;border-radius:99px;border:1px solid var(--pv-line,rgba(255,236,220,.1));font-size:11.5px;white-space:nowrap}' +
    '.pv-trio{display:grid;gap:12px}.pv-trio .pv-card{width:auto}' +
    '@media (min-width:760px){.pv-trio{grid-template-columns:repeat(3,minmax(0,1fr))}.pv-trio.dois{grid-template-columns:repeat(2,minmax(0,1fr))}.pv-faixa::before,.pv-faixa::after{width:120px}}';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function card(d) { return '<figure class="pv-card"><blockquote>' + esc(d.t) + '</blockquote><figcaption><b>' + esc(d.q) + '</b><i>' + esc(d.o) + '</i></figcaption></figure>'; }
  function escolhe(temas) {
    if (!temas.length) return D.slice();
    // primeiro os que combinam com os temas da página (na ordem pedida), depois o resto
    var a = [], visto = {};
    temas.forEach(function (t) { D.forEach(function (d) { if (!visto[d.id] && d.k.indexOf(t) >= 0) { visto[d.id] = 1; a.push(d); } }); });
    D.forEach(function (d) { if (!visto[d.id]) a.push(d); });
    return a;
  }
  var calmo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function anda(linha, dir) {
    // rolagem contínua por scrollLeft: o dedo (ou o mouse) pode arrastar a qualquer momento
    var meio, parado = false, visivel = false, x = 0, ult = 0, vel = 26 * dir;   // px por segundo
    function mede() { var c = linha.querySelectorAll('.pv-card'); meio = c.length > 1 ? c[c.length / 2].offsetLeft - c[0].offsetLeft : linha.scrollWidth / 2; if (dir < 0 && !linha.scrollLeft) { linha.scrollLeft = meio; } x = linha.scrollLeft; }
    function passo(t) {
      if (!visivel) { ult = 0; return; }
      if (ult && !parado) {
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
    // arrastar com o mouse
    var px = null, sx = 0;
    linha.addEventListener('mousedown', function (e) { px = e.clientX; sx = linha.scrollLeft; });
    window.addEventListener('mousemove', function (e) { if (px != null) linha.scrollLeft = sx - (e.clientX - px); });
    window.addEventListener('mouseup', function () { px = null; });
    window.addEventListener('resize', mede);
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (en) {
      var v = en[0].isIntersecting; if (v && !visivel) { visivel = true; mede(); requestAnimationFrame(passo); } else visivel = v;
    }, { threshold: 0 }).observe(linha);
  }
  function monta() {
    var els = [].slice.call(document.querySelectorAll('[data-prova]')); if (!els.length) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    els.forEach(function (el) {
      var tipo = el.getAttribute('data-prova');
      if (tipo === 'trio') {
        var ids = (el.getAttribute('data-ids') || '').split(',').map(function (s) { return POR[s.trim()]; }).filter(Boolean);
        el.className += ' pv-trio' + (ids.length === 2 ? ' dois' : ''); el.innerHTML = ids.map(card).join(''); return;
      }
      var lista = escolhe((el.getAttribute('data-temas') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean));
      var fora = (el.getAttribute('data-sem') || '').split(',');
      lista = lista.filter(function (d) { return fora.indexOf(d.id) < 0; });
      var n = Math.max(1, Math.min(2, +el.getAttribute('data-linhas') || 1)), linhas = [];
      for (var i = 0; i < n; i++) linhas.push([]);
      lista.forEach(function (d, i) { linhas[i % n].push(d); });
      el.className += ' pv-faixa';
      el.innerHTML = linhas.map(function (l) {
        var h = l.map(card).join('');
        // a 2ª cópia só existe para o laço ficar contínuo: escondida de leitores de tela
        return '<div class="pv-linha" tabindex="0" role="group" aria-label="Depoimentos de alunos do curso">' + h + (calmo ? '' : '<div aria-hidden="true" style="display:contents">' + h + '</div>') + '</div>';
      }).join('');
      if (!calmo) [].slice.call(el.querySelectorAll('.pv-linha')).forEach(function (l, i) { anda(l, i % 2 ? -1 : 1); });
    });
  }
  window.ProvaFL = { dados: D };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', monta); else monta();
})();
