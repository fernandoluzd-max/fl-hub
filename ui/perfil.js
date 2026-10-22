/* Base FL · Perfil do aluno (3 perguntas no primeiro acesso)
   Um módulo só, usado no app de computador (ui/perfil.js) e no app do site (/perfil.js).
   Integração:  Perfil.init({ rpc: (nome, args) => Promise, app: 'desktop' | 'web' });  depois  Perfil.talvez();
   O banco decide se pergunta (perfil_meu). "Responder depois" volta a perguntar depois de 12 horas. */
(function () {
  var cfg = { rpc: null, app: '' }, aberto = false;
  var Q = [
    { id: 'quem', titulo: 'Você edita vídeos para quem?', opcoes: [
      ['clientes', 'Para clientes', 'Sou freelancer'],
      ['agencia', 'Para uma agência ou produtora', 'Trabalho numa ou tenho a minha'],
      ['redes', 'Para as minhas redes', 'Meu conteúdo ou da minha marca'],
      ['aprendendo', 'Estou aprendendo', 'E quero começar a atender clientes']] },
    { id: 'editor', titulo: 'Qual editor você mais usa?', opcoes: [
      ['capcut_pc', 'CapCut no computador'], ['capcut_cel', 'CapCut no celular'], ['premiere', 'Premiere Pro'],
      ['davinci', 'DaVinci Resolve'], ['finalcut', 'Final Cut Pro'], ['outro', 'Outro']] },
    { id: 'ajuda', titulo: 'O que mais te ajudaria agora?', sub: 'Pode marcar até 2.', multi: 2, opcoes: [
      ['cobrar', 'Cobrar e fazer orçamentos'], ['organizar', 'Organizar clientes e prazos'], ['rapido', 'Editar mais rápido'],
      ['bonito', 'Deixar os vídeos mais bonitos'], ['clientes', 'Conseguir clientes']] }
  ];
  var CSS = '.pf-fundo{position:fixed;inset:0;z-index:9999;background:rgba(8,9,8,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;animation:pf-in .2s ease-out}' +
    '@keyframes pf-in{from{opacity:0}to{opacity:1}}' +
    '.pf{width:min(440px,100%);max-height:calc(100vh - 32px);overflow:auto;background:#151816;color:#F4F0E4;border:1px solid #272D29;border-radius:20px;padding:22px 20px 18px;box-shadow:0 24px 60px rgba(0,0,0,.5);font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}' +
    '.pf-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}' +
    '.pf-passo{font-size:12.5px;color:#9A968A}' +
    '.pf-barra{display:flex;gap:5px}.pf-barra i{width:22px;height:4px;border-radius:2px;background:#272D29}.pf-barra i.on{background:var(--accent,#F2A541)}' +
    '.pf h2{font-size:21px;line-height:1.2;font-weight:750;margin:0 0 4px;letter-spacing:-.01em}' +
    '.pf p.pf-sub{color:#9A968A;font-size:13.5px;margin:0 0 14px}' +
    '.pf-ops{display:grid;gap:8px;margin-top:12px}' +
    '.pf-op{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:#1B1F1C;border:1px solid #272D29;border-radius:14px;padding:13px 14px;color:inherit;font:inherit;cursor:pointer;transition:border-color .12s,background .12s}' +
    '.pf-op:hover{border-color:#3a423c}.pf-op:focus-visible{outline:2px solid var(--accent,#F2A541);outline-offset:2px}' +
    '.pf-op b{display:block;font-weight:650;font-size:15px}.pf-op small{display:block;color:#9A968A;font-size:12.5px;margin-top:1px}' +
    '.pf-op .pf-ck{flex:none;width:20px;height:20px;border-radius:50%;border:2px solid #3a423c;display:grid;place-items:center}' +
    '.pf-op.sel{border-color:var(--accent,#F2A541);background:rgba(242,165,65,.08)}.pf-op.sel .pf-ck{border-color:var(--accent,#F2A541);background:var(--accent,#F2A541)}' +
    '.pf-op.sel .pf-ck:after{content:"";width:6px;height:10px;border:solid #17130B;border-width:0 2px 2px 0;transform:rotate(45deg) translate(-1px,-1px)}' +
    '.pf-multi .pf-ck{border-radius:6px}.pf-op.cheio{opacity:.45}' +
    '.pf-pe{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:16px}' +
    '.pf-depois{background:none;border:0;color:#7d7a70;font:inherit;font-size:13px;cursor:pointer;text-decoration:underline;text-underline-offset:3px;padding:6px 0}' +
    '.pf-ir{background:var(--accent,#F2A541);color:#17130B;border:0;border-radius:12px;padding:11px 18px;font:inherit;font-weight:750;cursor:pointer}' +
    '.pf-ir:disabled{opacity:.35;cursor:default}' +
    '.pf-fim{text-align:center;padding:20px 4px 8px}.pf-fim .pf-ok{width:52px;height:52px;border-radius:50%;margin:0 auto 12px;background:rgba(127,206,143,.15);display:grid;place-items:center}' +
    '.pf-fim .pf-ok:after{content:"";width:12px;height:22px;border:solid #7fce8f;border-width:0 3px 3px 0;transform:rotate(45deg) translate(-2px,-3px)}' +
    '.pf-erro{color:#ff8f7a;font-size:13px;margin-top:10px;min-height:1px}' +
    '@media (prefers-reduced-motion:reduce){.pf-fundo{animation:none}.pf-op{transition:none}}';

  function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function estilo() { if (document.getElementById('pf-css')) return; var s = el('style'); s.id = 'pf-css'; s.textContent = CSS; document.head.appendChild(s); }

  function abre() {
    if (aberto) return; aberto = true; estilo();
    var resp = { quem: null, editor: null, ajuda: [] }, passo = 0;
    var fundo = el('div', 'pf-fundo'), box = el('div', 'pf'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'pf-t');
    fundo.appendChild(box); document.body.appendChild(fundo);
    function fecha() { aberto = false; if (fundo.parentNode) fundo.parentNode.removeChild(fundo); }
    function depois() { try { cfg.rpc('perfil_pular', { p_app: cfg.app }); } catch (e) {} fecha(); }
    function desenha() {
      var q = Q[passo], multi = !!q.multi, vals = multi ? resp[q.id] : [resp[q.id]];
      box.innerHTML = '';
      var top = el('div', 'pf-top');
      top.appendChild(el('span', 'pf-passo', passo === 0 ? 'Antes de começar: 3 perguntas rápidas' : 'Pergunta ' + (passo + 1) + ' de 3'));
      var b = el('div', 'pf-barra'); for (var i = 0; i < Q.length; i++) b.appendChild(el('i', i <= passo ? 'on' : ''));
      top.appendChild(b); box.appendChild(top);
      var h = el('h2', '', esc(q.titulo)); h.id = 'pf-t'; box.appendChild(h);
      box.appendChild(el('p', 'pf-sub', passo === 0 ? 'Assim o Base FL mostra o que faz sentido para o seu trabalho.' : esc(q.sub || ' ')));
      var ops = el('div', 'pf-ops' + (multi ? ' pf-multi' : '')); ops.setAttribute('role', multi ? 'group' : 'radiogroup');
      q.opcoes.forEach(function (o) {
        var cheio = multi && vals.length >= q.multi && vals.indexOf(o[0]) < 0;
        var bt = el('button', 'pf-op' + (vals.indexOf(o[0]) >= 0 ? ' sel' : '') + (cheio ? ' cheio' : ''), '<span class="pf-ck" aria-hidden="true"></span><span><b>' + esc(o[1]) + '</b>' + (o[2] ? '<small>' + esc(o[2]) + '</small>' : '') + '</span>');
        bt.type = 'button'; bt.setAttribute(multi ? 'aria-pressed' : 'aria-checked', vals.indexOf(o[0]) >= 0 ? 'true' : 'false'); if (!multi) bt.setAttribute('role', 'radio');
        bt.onclick = function () {
          if (!multi) { resp[q.id] = o[0]; passo++; desenha(); return; }
          var a = resp[q.id], k = a.indexOf(o[0]);
          if (k >= 0) a.splice(k, 1); else if (a.length < q.multi) a.push(o[0]); else return;
          desenha();
        };
        ops.appendChild(bt);
      });
      box.appendChild(ops);
      var pe = el('div', 'pf-pe'), dep = el('button', 'pf-depois', 'Responder depois'); dep.type = 'button'; dep.onclick = depois; pe.appendChild(dep);
      if (multi) {
        var ir = el('button', 'pf-ir', 'Concluir'); ir.type = 'button'; ir.disabled = resp.ajuda.length === 0;
        ir.onclick = function () { ir.disabled = true; salva(); }; pe.appendChild(ir);
      } else if (passo > 0) {
        var volta = el('button', 'pf-depois', '← Voltar'); volta.type = 'button'; volta.onclick = function () { passo--; desenha(); }; pe.insertBefore(volta, dep);
      }
      box.appendChild(pe);
      box.appendChild(el('div', 'pf-erro'));
      var f = box.querySelector('.pf-op'); if (f) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) {} }, 30);
    }
    function salva() {
      Promise.resolve(cfg.rpc('perfil_salvar', { p_quem: resp.quem, p_editor: resp.editor, p_ajuda: resp.ajuda, p_app: cfg.app })).then(function () {
        box.innerHTML = '<div class="pf-fim"><div class="pf-ok" aria-hidden="true"></div><h2 id="pf-t">Pronto, obrigado!</h2><p class="pf-sub">Agora é com você. Bom trabalho!</p></div>';
        setTimeout(fecha, 1400);
      }, function () {
        var e = box.querySelector('.pf-erro'); if (e) e.textContent = 'Não consegui salvar agora. Toque em Concluir de novo.';
        var ir = box.querySelector('.pf-ir'); if (ir) ir.disabled = false;
      });
    }
    fundo.addEventListener('keydown', function (e) { if (e.key === 'Escape') depois(); });
    desenha();
  }

  window.Perfil = {
    init: function (o) { cfg.rpc = o.rpc; cfg.app = o.app || ''; },
    talvez: function () {
      if (!cfg.rpc || aberto) return Promise.resolve(false);
      return Promise.resolve(cfg.rpc('perfil_meu', {})).then(function (r) {
        if (r && r.perguntar) { abre(); return true; } return false;
      }, function () { return false; });   // banco fora do ar ou sem a função: não atrapalha o app
    },
    abrir: abre
  };
})();
