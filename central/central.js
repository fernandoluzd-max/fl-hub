(() => {
  // ========================================================================
  // helpers
  // ========================================================================
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const n = v => (+v || 0).toLocaleString('pt-BR');
  const pct = (a, b) => (a == null || !(b > 0)) ? null : Math.round(a / b * 100);
  const pctTx = (a, b) => { const p = pct(a, b); return p == null ? '—' : p + '%'; };
  const SP = -3 * 3600e3;                                 // São Paulo, sem horário de verão
  const diaSP = (ms = Date.now()) => new Date(ms + SP).toISOString().slice(0, 10);
  const inicioDia = d => new Date(d + 'T00:00:00-03:00');
  const somaDias = (d, k) => diaSP(inicioDia(d).getTime() + k * 864e5 + 3600e3);
  const reduzMovimento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COR = { abriu: 'var(--abriu)', teste: 'var(--teste)', checkout: 'var(--compra)', audio: 'var(--audio)' };
  const TX = { abriu: 'abriu a página', teste: 'tocou em Testar grátis (página antiga)', checkout: 'clicou para comprar', audio: 'tocou no botão da mensagem' };

  // ========================================================================
  // Prefs — localStorage centralizado, resiliente (Tarefas 1 + 11)
  // ========================================================================
  const Prefs = (() => {
    const KEY = 'central:v1';
    const padrao = { tab: 'visao', periodo: 'hoje', testes: false, de: '', ate: '', meta: null };
    let memoria = null;          // usado quando o localStorage não está disponível
    let avisoFalha = false;
    function ler() {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return { ...padrao };
        const obj = JSON.parse(raw);
        if (!obj || typeof obj !== 'object' || obj.v !== 1) return { ...padrao };
        return { ...padrao, ...obj };
      } catch { avisoFalha = true; return { ...(memoria || padrao) }; }
    }
    function salvar(patch) {
      const atual = ler();
      const novo = { ...atual, ...patch, v: 1 };
      memoria = novo;
      try { localStorage.setItem(KEY, JSON.stringify(novo)); }
      catch { avisoFalha = true; }
    }
    return { get: ler, set: salvar, falhouArmazenamento: () => avisoFalha };
  })();

  // ========================================================================
  // estado
  // ========================================================================
  const p0 = Prefs.get();
  const state = { tab: p0.tab, periodo: p0.periodo, testes: p0.testes };
  let timerVisao = null, timerPerfis = null, ocupadoVisao = false, ocupadoPerfis = false;
  let ultimoDado = null, ultimoAnterior = null, rz = null;
  let comprasAntes = null, chaveAntes = '';
  let vistos = new Set(), pfVistos = null;
  let seqVisao = 0, seqPerfis = 0;
  let ultimaAtualizacao = 0, falhaConexao = false;

  // ========================================================================
  // abas
  // ========================================================================
  const TABS = ['visao', 'disparos', 'custos', 'alunos', 'atividade'];
  function mostraAba(tab, foco) {
    if (!TABS.includes(tab)) tab = 'visao';
    state.tab = tab; Prefs.set({ tab });
    TABS.forEach(t => {
      const bt = $('tabbtn-' + t), pn = $('tab-' + t);
      const on = t === tab;
      bt.setAttribute('aria-selected', String(on));
      bt.tabIndex = on ? 0 : -1;
      pn.hidden = !on;
    });
    if (foco) $('tabbtn-' + tab).focus();
    if (tab === 'visao' && ultimoDado) { serie(ultimoDado[0], ultimoDado[1]); horas(ultimoDado[0]); }
  }
  document.querySelectorAll('.tabs button').forEach((bt, i) => {
    bt.onclick = () => mostraAba(bt.dataset.tab);
    bt.addEventListener('keydown', e => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const btns = Array.from(document.querySelectorAll('.tabs button'));
      let j = i;
      if (e.key === 'ArrowRight') j = (i + 1) % btns.length;
      if (e.key === 'ArrowLeft') j = (i - 1 + btns.length) % btns.length;
      if (e.key === 'Home') j = 0;
      if (e.key === 'End') j = btns.length - 1;
      mostraAba(btns[j].dataset.tab, true);
    });
  });

  // ========================================================================
  // filtros / período
  // ========================================================================
  function intervalo() {
    const hoje = diaSP();
    if (state.periodo === 'hoje') return { de: inicioDia(hoje), ate: new Date(Date.now() + 60e3), vivo: true, rot: 'hoje' };
    if (state.periodo === 'ontem') return { de: inicioDia(somaDias(hoje, -1)), ate: inicioDia(hoje), vivo: false, rot: 'ontem' };
    if (state.periodo === '7' || state.periodo === '30') { const k = +state.periodo; return { de: inicioDia(somaDias(hoje, -(k - 1))), ate: new Date(Date.now() + 60e3), vivo: true, rot: 'nos últimos ' + k + ' dias' }; }
    const a = $('de').value || hoje, b = $('ate').value || a;
    const [x, y] = a <= b ? [a, b] : [b, a];
    return { de: inicioDia(x), ate: inicioDia(somaDias(y, 1)), vivo: y >= hoje, rot: 'no período escolhido' };
  }
  // janela anterior: mesma duração, imediatamente antes de "de" — cobre hoje-parcial,
  // ontem, 7/30 dias e intervalo escolhido com uma única regra (Tarefa 2)
  function janelaAnterior(iv) {
    const fim = Math.min(iv.ate.getTime(), Date.now());
    const duracao = fim - iv.de.getTime();
    if (duracao <= 0) return null;
    return { de: new Date(iv.de.getTime() - duracao), ate: new Date(iv.de.getTime()) };
  }

  // ========================================================================
  // desenho — funil (reutilizável para o total e para cada campanha)
  // ========================================================================
  function funil(k, montarEm) {
    const passos = [
      ['Mensagens entregues', 'disparo com o vídeo', k.enviados, 'var(--mute)'],
      ['Tocaram no botão', '"Quero conhecer" ou "Manda o áudio"', k.audio, 'var(--audio)'],
      ['Abriram a página', 'pessoas únicas', k.visitantes, 'var(--abriu)'],
      ['Clicaram para comprar', 'intenção de compra · foram ao checkout', k.checkout, 'var(--compra)'],
      ['Compraram', 'pago na Greenn', k.compras, 'var(--venda)']
    ];
    const topo = Math.max(1, ...passos.map(p => p[2]));
    let ant = null;
    const linhas = passos.map(([nm, sub, v, cor]) => {
      const w = Math.max(v > 0 ? 1.5 : 0, v / topo * 100);
      const conv = ant == null ? '' : `<b>${pctTx(v, ant)}</b>da etapa anterior`;
      ant = v;
      return `<div class="et"><div class="nm">${nm}<small>${sub}</small></div>
        <div class="tr"><span style="width:${w}%;background:${cor}"></span><em class="${w < 18 ? 'fora' : ''}" style="${w < 18 ? `left:calc(${w}% + 8px)` : ''}">${n(v)}</em></div>
        <div class="pc">${conv}</div></div>`;
    }).join('');
    const vis = k.visitantes;
    // central_wpp's top-level kpi tem checkout_ab (abriu E clicou); o array por campanha não tem
    // esse campo — cai para "checkout" (campo real, não inventado) em vez de mostrar NaN%.
    const checkoutAb = k.checkout_ab != null ? k.checkout_ab : k.checkout;
    const ramo = `<div class="ramo">
      <div style="border-color:var(--compra)"><small>Clicaram para comprar</small><b>${n(k.checkout)}</b><small>${pctTx(checkoutAb, vis)} de quem abriu</small></div>
      <div style="border-color:var(--nada)"><small>Saíram sem clicar</small><b>${n(k.nenhum)}</b><small>${pctTx(k.nenhum, vis)} de quem abriu</small></div></div>`;
    $(montarEm).innerHTML = linhas + ramo;
  }

  // ---------- kpis com comparação (Tarefa 3) ----------
  function delta(atual, anteriorV) {
    if (anteriorV == null) return '';
    if (anteriorV === 0) return atual > 0 ? '<span class="delta up">novo</span>' : '';
    const v = Math.round((atual - anteriorV) / anteriorV * 100);
    if (v === 0) return '<span class="delta flat">= período anterior</span>';
    return `<span class="delta ${v > 0 ? 'up' : 'down'}">${v > 0 ? '▲' : '▼'} ${Math.abs(v)}%</span>`;
  }
  function kpis(k, kAnt) {
    const vis = k.visitantes;
    const c = [
      ['Cliques no link', k.aberturas, kAnt?.aberturas, `${n(vis)} pessoas únicas`, 'var(--abriu)'],
      ['Clicaram para comprar', k.checkout, kAnt?.checkout, `${pctTx(k.checkout_ab, vis)} de quem abriu · ${n(k.cliques_checkout)} cliques`, 'var(--compra)'],
      ['Saíram sem clicar', k.nenhum, kAnt?.nenhum, `${pctTx(k.nenhum, vis)} de quem abriu`, 'var(--nada)'],
      ['Compras', k.compras, kAnt?.compras, `${pctTx(k.compras, vis)} de quem abriu`, 'var(--venda)']
    ];
    $('kpis').innerHTML = c.map(([r, v, vAnt, s, cor]) =>
      `<div class="k"><span class="r"><i style="background:${cor}"></i>${r}</span><b data-v="${v}">${n(v)}</b><small>${s} ${delta(v, vAnt)}</small></div>`).join('');
    if (!reduzMovimento()) $('kpis').querySelectorAll('b[data-v]').forEach(b => Motion.countUp(b, b.dataset.vAnt, +b.dataset.v, n));
  }

  function leitura(k, rot) {
    const vis = k.visitantes, f = [];
    if (!k.enviados && !vis && !k.audio) { $('leitura').innerHTML = `Nenhum movimento ${rot} ainda.`; return; }
    f.push(`<b>${n(vis)}</b> ${vis === 1 ? 'pessoa abriu' : 'pessoas abriram'} a página ${rot}`);
    if (k.checkout) f.push(`<b>${n(k.checkout)}</b> ${k.checkout === 1 ? 'clicou' : 'clicaram'} para comprar (${pctTx(k.checkout_ab, vis)} de quem abriu)`);
    if (vis) f.push(`<b>${pctTx(k.nenhum, vis)}</b> abriram e saíram sem clicar`);
    if (k.checkout) f.push(`<b>${pctTx(k.compras, k.checkout)}</b> de quem clicou concluiu a compra`);
    if (k.compras) f.push(`<b>${n(k.compras)}</b> ${k.compras === 1 ? 'compra' : 'compras'}`);
    $('leitura').innerHTML = f.join('; ') + '.';
  }

  // ---------- saúde da operação (Tarefa 3) ----------
  function saude(kitPausado, kitMotivo) {
    const el = $('saude');
    if (falhaConexao) { el.className = 'saude critico'; $('saudeTx').textContent = 'Não foi possível atualizar agora. Mostrando as últimas informações disponíveis.'; return; }
    if (kitPausado) { el.className = 'saude atencao'; $('saudeTx').textContent = 'Kit Freelancer pausado: ' + (kitMotivo || 'envio desligado.'); return; }
    el.className = 'saude'; $('saudeTx').textContent = 'Operação normal.';
  }

  // ---------- séries e horários (iguais ao original) ----------
  function buckets(iv, passo) {
    const out = [], h = passo === 'hour';
    const fim = Math.min(iv.ate.getTime(), Date.now() + 1);
    for (let t = iv.de.getTime(); t < fim; t += h ? 3600e3 : 864e5) {
      const s = new Date(t + SP).toISOString();
      out.push(h ? s.slice(0, 13) + ':00' : s.slice(0, 10) + 'T00:00');
    }
    return out;
  }
  function rotB(b, passo, curto) {
    if (passo === 'hour') { const h = +b.slice(11, 13); return curto ? h + 'h' : `${b.slice(8, 10)}/${b.slice(5, 7)} ${h}h`; }
    return `${b.slice(8, 10)}/${b.slice(5, 7)}`;
  }
  function serie(d, iv) {
    const bs = buckets(iv, d.passo), m = {};
    (d.serie || []).forEach(x => { (m[x.b] = m[x.b] || {})[x.t] = x.n; });
    $('serieT').textContent = d.passo === 'hour' ? 'Movimento por hora' : 'Movimento por dia';
    const tipos = ['abriu', 'checkout'];
    const max = Math.max(1, ...bs.flatMap(b => tipos.map(t => (m[b] || {})[t] || 0)));
    if (!bs.length || !bs.some(b => m[b])) { $('serie').innerHTML = '<p class="vazio">Sem cliques no período.</p>'; return; }
    const W = Math.max(300, $('serie').clientWidth || 640), H = W < 500 ? 180 : 210, pl = 26, pb = 22, iw = W - pl - 4, ih = H - pb - 8, bw = iw / bs.length;
    const g = Math.max(1, Math.min(6, bw / 4.5)), barw = Math.max(1.5, (bw - g * 2) / 2);
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="max-width:100%;height:auto" role="img" aria-label="Cliques por ${d.passo === 'hour' ? 'hora' : 'dia'}">`;
    const passoY = max <= 4 ? 1 : Math.ceil(max / 4);
    for (let y = 0; y <= max; y += passoY) { const yy = 8 + ih - y / max * ih; s += `<line x1="${pl}" x2="${W}" y1="${yy}" y2="${yy}" stroke="#272D29"/><text x="${pl - 6}" y="${yy + 4}" text-anchor="end">${y}</text>`; }
    const cada = Math.ceil(bs.length / Math.max(4, Math.floor(W / 52)));
    bs.forEach((b, i) => {
      const x0 = pl + i * bw + g;
      tipos.forEach((t, j) => {
        const v = (m[b] || {})[t] || 0; if (!v) return;
        const hh = v / max * ih;
        s += `<rect x="${x0 + j * barw}" y="${8 + ih - hh}" width="${barw - .5}" height="${hh}" rx="1.5" fill="${COR[t]}"><title>${rotB(b, d.passo)} · ${TX[t]}: ${v}</title></rect>`;
      });
      if (i % cada === 0) s += `<text x="${pl + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${rotB(b, d.passo, true)}</text>`;
    });
    $('serie').innerHTML = s + '</svg>';
  }
  function horas(d) {
    const v = Array(24).fill(0); (d.horas || []).forEach(x => v[x.h] = x.n);
    const max = Math.max(...v);
    if (!max) { $('horas').innerHTML = '<p class="vazio">Sem cliques no período.</p>'; $('pico').textContent = ''; return; }
    const W = Math.max(280, $('horas').clientWidth || 360), H = 170, bw = W / 24, ih = H - 22;
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="max-width:100%;height:auto" role="img" aria-label="Cliques por hora do dia">`;
    v.forEach((x, h) => {
      const hh = x / max * (ih - 6), a = x ? .35 + .65 * x / max : 0;
      s += `<rect x="${h * bw + 1.5}" y="${ih - hh}" width="${bw - 3}" height="${Math.max(hh, x ? 2 : 1)}" rx="2" fill="${x ? `rgba(242,165,65,${a.toFixed(2)})` : '#272D29'}"><title>${h}h: ${x} cliques</title></rect>`;
      if (h % (W < 340 ? 4 : 3) === 0) s += `<text x="${h * bw + bw / 2}" y="${H - 5}" text-anchor="middle">${h}h</text>`;
    });
    $('horas').innerHTML = s + '</svg>';
    const top = v.map((x, h) => [x, h]).sort((a, b) => b[0] - a[0]).filter(x => x[0]).slice(0, 3);
    $('pico').innerHTML = 'Mais movimento: ' + top.map(([x, h]) => `<b>${h}h–${h + 1}h</b> (${x})`).join(', ');
  }

  // ---------- placar de campanhas (Visão geral) + grade de disparos (Tarefa 4) ----------
  function campResumo(campanhas) {
    const c = (campanhas || []).slice().sort((a, b) => b.compras - a.compras || b.visitantes - a.visitantes);
    if (!c.length) { $('campResumo').innerHTML = '<p class="vazio">Nenhum disparo no período.</p>'; return; }
    $('campResumo').innerHTML = `<table><thead><tr><th>Disparo</th><th>Visitantes</th><th>Compras</th><th>Intenção</th></tr></thead><tbody>` +
      c.map(x => `<tr><td class="cn">${esc(x.camp)}</td><td>${n(x.visitantes)}</td><td>${n(x.compras)}</td><td>${pctTx(x.checkout, x.visitantes)}</td></tr>`).join('') +
      `</tbody></table><p class="pico">Intenção = quem abriu a página e clicou para comprar. Ordenado por compras no período.</p>`;
  }
  function disparosGrid(campanhas, anteriores) {
    const c = campanhas || [];
    if (!c.length) { $('disparosGrid').innerHTML = '<section class="bloco campCard"><p class="vazio">Nenhum disparo no período.</p></section>'; return; }
    const porNomeAnt = new Map((anteriores || []).map(x => [x.camp, x]));
    $('disparosGrid').innerHTML = c.map(x => {
      const ant = porNomeAnt.get(x.camp);
      const comp = ant ? delta(x.compras, ant.compras) : (x.compras ? '<span class="delta up">nova neste período</span>' : '');
      return `<section class="bloco campCard">
        <h3>${esc(x.camp)}</h3>
        <span class="tag">${n(x.enviados)} entregues · ${n(x.compras)} compras ${comp}</span>
        <div id="campfunil-${esc(x.camp).replace(/[^a-z0-9]/gi, '_')}"></div>
      </section>`;
    }).join('');
    c.forEach(x => funil(x, 'campfunil-' + esc(x.camp).replace(/[^a-z0-9]/gi, '_')));
  }

  // ---------- feed (Visão geral: prévia · Atividade: completo) ----------
  function linhaFeed(e) {
    const t = new Date(e.em), dia = diaSP(t.getTime()), hoje = diaSP();
    const hora = new Date(t.getTime() + SP).toISOString().slice(11, 16);
    const quando = dia === hoje ? hora : `${dia.slice(8, 10)}/${dia.slice(5, 7)}<br>${hora}`;
    return { quando, cor: COR[e.t] || 'var(--dim)', quem: esc(e.quem || 'Alguém'), tx: TX[e.t] || esc(e.t), camp: esc(e.camp || '') };
  }
  function feedPreview(recentes) {
    const r = recentes || [];
    if (!r.length) { $('feedPreview').innerHTML = '<li><span></span><span class="vazio" style="padding:12px 0">Nada ainda no período.</span></li>'; return; }
    const primeira = vistos.size === 0;
    $('feedPreview').innerHTML = r.slice(0, 6).map(e => {
      const id = e.em + e.t + (e.quem || ''), novo = !primeira && !vistos.has(id); vistos.add(id);
      const L = linhaFeed(e);
      return `<li class="${novo ? 'novo' : ''}"><time>${L.quando}</time><span><span class="d" style="background:${L.cor}"></span><span class="q">${L.quem}</span> ${L.tx}<span class="c">${L.camp}</span></span></li>`;
    }).join('');
  }

  // ========================================================================
  // atividade — linha do tempo unificada (Tarefa 6)
  // ========================================================================
  const TX_AT = { ...TX, respondeu: 'respondeu o perfil', pulou: 'deixou para depois', kit_falhou: 'falha ao enviar o Kit Freelancer', kit_pausado: 'Kit Freelancer pausado' };
  const COR_AT = { ...COR, respondeu: 'var(--teste)', pulou: 'var(--dim)', kit_falhou: 'var(--nada)', kit_pausado: 'var(--compra)' };
  function mesclaAtividade(recentes, feedPerfil, kitLista, kitPausaMotivo) {
    const out = [];
    (recentes || []).forEach(e => out.push({ em: e.em, t: e.t, camp: e.camp, quem: e.quem || 'Alguém', id: 'ev-' + e.em + e.t + (e.quem || '') }));
    (feedPerfil || []).forEach(r => out.push({ em: r.em, t: r.t, camp: '', quem: r.nome || 'Aluno', id: 'pf-' + r.t + r.email + r.em }));
    (kitLista || []).forEach(r => { if (r.envio === 'falhou') out.push({ em: r.enviado_em, t: 'kit_falhou', camp: 'Kit Freelancer', quem: r.nome || r.email, id: 'kit-falha-' + r.email + '-' + r.enviado_em }); });
    if (kitPausaMotivo) out.push({ em: null, t: 'kit_pausado', camp: 'Kit Freelancer', quem: kitPausaMotivo, id: 'kit-pausa' });
    return out.filter(e => e.em !== undefined).sort((a, b) => (b.em ? Date.parse(b.em) : Infinity) - (a.em ? Date.parse(a.em) : Infinity));
  }
  function atividadeRender(lista) {
    const tipo = $('atTipo').value, camp = $('atCamp').value;
    const campanhas = [...new Set(lista.map(e => e.camp).filter(Boolean))].sort();
    const atCampEl = $('atCamp');
    if (atCampEl.dataset.rendered !== campanhas.join(',')) {
      atCampEl.innerHTML = '<option value="">Todas as campanhas</option>' + campanhas.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
      atCampEl.value = camp; atCampEl.dataset.rendered = campanhas.join(',');
    }
    const filtrada = lista.filter(e => (!tipo || e.t === tipo) && (!camp || e.camp === camp));
    if (!filtrada.length) { $('atividadeLista').innerHTML = '<li><span></span><span class="vazio" style="padding:12px 0">Nada encontrado com esses filtros.</span></li>'; return; }
    $('atividadeLista').innerHTML = filtrada.slice(0, 200).map(e => {
      const quando = e.em ? (() => { const t = new Date(e.em), dia = diaSP(t.getTime()), hoje = diaSP(); const hora = new Date(t.getTime() + SP).toISOString().slice(11, 16); return dia === hoje ? hora : `${dia.slice(8, 10)}/${dia.slice(5, 7)} ${hora}`; })() : '—';
      return `<li><time>${quando}</time><span><span class="d" style="background:${COR_AT[e.t] || 'var(--dim)'}"></span><span class="q">${esc(e.quem)}</span> ${TX_AT[e.t] || esc(e.t)}${e.camp ? `<span class="c">${esc(e.camp)}</span>` : ''}</span></li>`;
    }).join('');
  }
  $('atTipo').onchange = () => ultimaAtividade && atividadeRender(ultimaAtividade);
  $('atCamp').onchange = () => ultimaAtividade && atividadeRender(ultimaAtividade);
  let ultimaAtividade = [];

  // ========================================================================
  // metas de vendas (Tarefa 7)
  // ========================================================================
  const Goals = {
    get() { return Prefs.get().meta; },
    set(meta) {
      if (!meta || !(meta.valor > 0) || !['diaria', 'mensal'].includes(meta.tipo)) return false;
      Prefs.set({ meta });
      return true;
    },
    clear() { Prefs.set({ meta: null }); }
  };
  function metaWidget(comprasHoje) {
    const g = Goals.get();
    const falhou = Prefs.falhouArmazenamento();
    if (!g) {
      $('metaCard').innerHTML = `<h2>Meta de vendas</h2>
        <form class="metaForm" id="metaForm"><select id="metaTipo"><option value="diaria">Meta diária</option><option value="mensal">Meta mensal</option></select>
        <input type="number" id="metaValor" min="1" placeholder="quantidade"><button class="bt sec" type="submit">Definir meta</button></form>
        <p class="metaNota">A meta fica salva apenas neste navegador.</p>`;
      $('metaForm').onsubmit = e => { e.preventDefault(); const v = +$('metaValor').value; if (Goals.set({ tipo: $('metaTipo').value, valor: v })) metaWidget(comprasHoje); };
      return;
    }
    const atual = comprasHoje ?? 0, pctFill = Math.min(100, Math.round(atual / g.valor * 100));
    const superou = atual > g.valor;
    $('metaCard').innerHTML = `<h2>Meta ${g.tipo === 'diaria' ? 'diária' : 'mensal'} de vendas</h2>
      <div class="metaBarra"><span style="width:${pctFill}%"></span></div>
      <p class="metaTx"><b>${n(atual)}</b> de ${n(g.valor)} ${superou ? `<span class="metaSuperou">· superou em ${Math.round((atual / g.valor - 1) * 100)}%</span>` : ''}</p>
      <p class="metaNota">Salva apenas neste navegador. <button class="sair" type="button" id="metaEditar">editar</button></p>
      ${falhou ? '<p class="metaNota">Não consegui salvar no armazenamento deste navegador agora; a meta vale só para esta sessão.</p>' : ''}`;
    $('metaEditar').onclick = () => { Goals.clear(); metaWidget(comprasHoje); };
  }

  // ========================================================================
  // conquistas e sequência (Tarefa 8) — graus honestos de disponibilidade
  // ========================================================================
  const Achievements = (() => {
    let vistos = new Set(), baseline = false;
    const REGRAS = [
      ['primeira_venda_do_dia', 'Primeira venda do dia', (k) => k.compras >= 1],
      ['dez_vendas_no_dia', '10 vendas no dia', (k) => k.compras >= 10],
      ['primeira_resposta_quente', 'Primeira resposta quente', (_k, ctx) => ctx.temRespostaQuente],
      ['campanha_100_envios', 'Uma campanha passou de 100 envios', (_k, ctx) => ctx.algumaCampanha100],
    ];
    // Na primeira chamada (baseline=false) tudo que já é verdade entra em "vistos" sem
    // disparar comemoração; só a partir da segunda chamada uma regra nova vira celebração.
    function avalia(k, ctx, goalBatido) {
      const novas = [];
      REGRAS.forEach(([id, titulo, teste]) => { if (teste(k, ctx) && !vistos.has(id)) { vistos.add(id); if (baseline) novas.push({ id, titulo }); } });
      if (goalBatido && !vistos.has('meta_alcancada')) { vistos.add('meta_alcancada'); if (baseline) novas.push({ id: 'meta_alcancada', titulo: 'Meta alcançada' }); }
      baseline = true;
      return novas;
    }
    function selos() { return Array.from(vistos); }
    return { avalia, selos };
  })();
  const TITULOS_SELO = { primeira_venda_do_dia: 'Primeira venda do dia', dez_vendas_no_dia: '10 vendas no dia', primeira_resposta_quente: 'Primeira resposta quente', campanha_100_envios: '+100 envios numa campanha', meta_alcancada: 'Meta alcançada' };
  function desenhaConquistas(novas) {
    const todas = Achievements.selos();
    $('conquistas').innerHTML = todas.map(id => `<span class="selo ${novas?.some(x => x.id === id) ? 'novo' : ''}">🏅 ${TITULOS_SELO[id] || id}</span>`).join('') || '<span class="selo">Ainda sem conquistas neste período.</span>';
  }
  const Streaks = (() => {
    let disponivel = null; // null = não verificado, false = indisponível, true = ok
    async function probe() {
      if (disponivel !== null) return disponivel;
      try { await Base.rpc('central_vendas_serie', { p_de: new Date(0).toISOString(), p_ate: new Date().toISOString() }); disponivel = true; }
      catch { disponivel = false; }
      return disponivel;
    }
    return { probe, disponivel: () => disponivel };
  })();
  async function desenhaSequencia() {
    const ok = await Streaks.probe();
    $('sequencia').innerHTML = ok
      ? '' // quando o SQL (61-central-gamificacao.sql) for aplicado, a sequência real entra aqui
      : '<p class="sequenciaIndisp">Sequência de dias com vendas e recordes históricos: disponível quando o SQL de séries diárias (supabase/61-central-gamificacao.sql, proposto neste PR) for revisado e aplicado.</p>';
  }

  // ========================================================================
  // animação de números e comemorações (Tarefa 9)
  // ========================================================================
  const Motion = {
    countUp(el, from, to, formata) {
      from = +from; to = +to;
      if (!isFinite(from) || from === to || reduzMovimento()) { el.textContent = formata(to); el.dataset.vAnt = to; return; }
      const t0 = performance.now(), dur = 600;
      function passo(t) {
        const p = Math.min(1, (t - t0) / dur), ease = 1 - Math.pow(1 - p, 3);
        el.textContent = formata(Math.round(from + (to - from) * ease));
        if (p < 1) requestAnimationFrame(passo); else el.dataset.vAnt = to;
      }
      requestAnimationFrame(passo);
    },
    confete() {
      if (reduzMovimento()) return;
      const cores = ['var(--compra)', 'var(--teste)', 'var(--abriu)', 'var(--audio)'];
      for (let i = 0; i < 16; i++) {
        const d = document.createElement('div'); d.className = 'confete';
        d.style.left = Math.random() * 100 + 'vw'; d.style.background = cores[i % cores.length];
        d.style.animationDelay = (Math.random() * .3) + 's';
        document.body.appendChild(d);
        d.addEventListener('animationend', () => d.remove());
        setTimeout(() => d.remove(), 2200);
      }
    }
  };

  // ========================================================================
  // alertas (Tarefa 10)
  // ========================================================================
  const Alerts = (() => {
    let ultimaChave = '';
    function avalia({ kitPausaMotivo, erroConexao, storageFalhou }) {
      const lista = [];
      if (erroConexao) lista.push({ nivel: 'critico', texto: 'Não foi possível atualizar agora. Mostrando as últimas informações disponíveis.' });
      if (kitPausaMotivo) lista.push({ nivel: 'atencao', texto: 'Kit Freelancer pausado: ' + kitPausaMotivo });
      // fica persistente mesmo depois de uma atualização bem-sucedida — diferente do #erro de
      // conexão, que é limpo a cada poll que der certo (ver Review Focus do plano, Tarefa 11)
      if (storageFalhou) lista.push({ nivel: 'info', texto: 'O armazenamento deste navegador não está disponível agora; preferências e metas não serão salvas nesta sessão.' });
      return lista;
    }
    function render(lista) {
      const chave = lista.map(a => a.nivel + a.texto).join('|');
      if (chave === ultimaChave) return;
      ultimaChave = chave;
      $('alertas').innerHTML = lista.map(a => `<div class="alerta ${a.nivel}"><i></i>${esc(a.texto)}</div>`).join('');
    }
    return { avalia, render };
  })();

  // ========================================================================
  // avisos de venda / resposta quente (iguais ao original)
  // ========================================================================
  const temNotif = 'Notification' in window;
  function marcaAviso() { const on = temNotif && Notification.permission === 'granted'; $('avisoBt').classList.toggle('on', on); $('avisoBt').textContent = on ? '🔔 Avisos de venda ligados' : '🔔 Avisar vendas'; }
  function somVenda() { try { const c = new (window.AudioContext || window.webkitAudioContext)(); [[988, 0], [1319, .12]].forEach(([f, t]) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, c.currentTime + t); g.gain.exponentialRampToValueAtTime(.25, c.currentTime + t + .02); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + t + .5); o.connect(g).connect(c.destination); o.start(c.currentTime + t); o.stop(c.currentTime + t + .55); }); } catch {} }
  function avisaVenda(novas, total, teste) {
    const tx = teste ? 'TESTE · assim chega o aviso de uma venda 🎉' : novas === 1 ? 'Nova venda pelo WhatsApp! 🎉' : novas + ' novas vendas pelo WhatsApp! 🎉';
    let el = document.getElementById('venda'); if (!el) { el = document.createElement('div'); el.id = 'venda'; el.className = 'venda'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = teste ? tx : tx + ' Total no período: ' + total; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 12000);
    somVenda(); Motion.confete();
    const t0 = document.title; let i = 0; clearInterval(window._pisca); window._pisca = setInterval(() => { document.title = (i++ % 2) ? t0.replace(/^💰 [^·]*· /, '') : '💰 Venda! · ' + t0.replace(/^💰 [^·]*· /, ''); if (i > 20 || !document.hidden && i > 6) { clearInterval(window._pisca); document.title = t0.replace(/^💰 [^·]*· /, ''); } }, 1000);
    if (temNotif && Notification.permission === 'granted') { try { new Notification('💰 Nova venda', { body: tx.replace(' 🎉', ''), tag: 'venda' }); } catch {} }
  }
  function avisaResposta(r) {
    let el = document.getElementById('venda'); if (!el) { el = document.createElement('div'); el.id = 'venda'; el.className = 'venda'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = `Nova resposta: ${r.nome || 'aluno'} · ${PF.seg[r.segmento] ? PF.seg[r.segmento][0].replace(/s$/, '') : ''}`; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 8000);
  }

  // ========================================================================
  // dados — visão geral + disparos (com comparação de período)
  // ========================================================================
  async function carrega(silencioso) {
    if (ocupadoVisao) return; ocupadoVisao = true;
    const iv = intervalo(), minhaSeq = ++seqVisao;
    if (!silencioso) $('vivoTx').textContent = 'Atualizando…';
    try {
      const d = await Base.rpc('central_wpp', { p_de: iv.de.toISOString(), p_ate: iv.ate.toISOString(), p_testes: $('testes').checked });
      if (minhaSeq !== seqVisao) return; // resposta ultrapassada por uma chamada mais nova
      $('erro').hidden = true; falhaConexao = false;
      let dAnt = null; const janela = janelaAnterior(iv);
      if (janela) { try { dAnt = await Base.rpc('central_wpp', { p_de: janela.de.toISOString(), p_ate: janela.ate.toISOString(), p_testes: $('testes').checked }); } catch { dAnt = null; } }
      if (minhaSeq !== seqVisao) return;
      const k = d.kpi, kAnt = dAnt?.kpi || null;
      const chave = state.periodo + '|' + $('de').value + '|' + $('ate').value + '|' + $('testes').checked;
      if (chave === chaveAntes && comprasAntes != null && k.compras > comprasAntes) avisaVenda(k.compras - comprasAntes, k.compras);
      comprasAntes = k.compras; chaveAntes = chave;
      leitura(k, iv.rot); funil(k, 'funil'); kpis(k, kAnt); serie(d, iv); horas(d); campResumo(d.campanhas); disparosGrid(d.campanhas, dAnt?.campanhas); feedPreview(d.recentes);
      metaWidget(k.compras);
      carregaCustos(iv, minhaSeq); carregaBalanco(iv, minhaSeq);
      const ctx = { temRespostaQuente: ultimoPerfisQuente, algumaCampanha100: (d.campanhas || []).some(c => c.enviados >= 100) };
      const metaAtual = Goals.get(), bateu = metaAtual ? k.compras >= metaAtual.valor : false;
      const novasConquistas = Achievements.avalia(k, ctx, bateu);
      desenhaConquistas(novasConquistas);
      if (!sequenciaCarregada) { sequenciaCarregada = true; desenhaSequencia(); }
      ultimoDado = [d, iv]; ultimoAnterior = dAnt;
      ultimaAtualizacao = Date.now(); marcaVivo(iv);
      saude(ultimoKitPausado, ultimoKitMotivo);
      Alerts.render(Alerts.avalia({ kitPausaMotivo: ultimoKitPausado ? ultimoKitMotivo : null, erroConexao: false, storageFalhou: Prefs.falhouArmazenamento() }));
      ultimaAtividade = mesclaAtividade(d.recentes, ultimoPerfisFeed, ultimoKitLista, ultimoKitPausado ? ultimoKitMotivo : null);
      atividadeRender(ultimaAtividade);
    } catch (e) {
      if (minhaSeq !== seqVisao) return;
      if (/sem_acesso/.test(e.message)) return semAcesso();
      if (e.status === 401) return mostraPorta();
      falhaConexao = true;
      $('erro').hidden = false; $('erro').textContent = 'Não consegui atualizar agora (' + e.message + '). Tento de novo em 15 segundos.';
      $('vivoTx').textContent = 'Sem conexão';
      saude(ultimoKitPausado, ultimoKitMotivo);
      Alerts.render(Alerts.avalia({ kitPausaMotivo: ultimoKitPausado ? ultimoKitMotivo : null, erroConexao: true, storageFalhou: Prefs.falhouArmazenamento() }));
    } finally { ocupadoVisao = false; }
  }

  // ========================================================================
  // custos do WhatsApp (em reais; preço oficial da Meta x dólar em central_config)
  // ========================================================================
  const brl = v => (+v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const CAT = { marketing: 'Marketing', utilidade: 'Utilidade' };
  const hora = iso => { const t = new Date(Date.parse(iso) + SP).toISOString(); return `${t.slice(8, 10)}/${t.slice(5, 7)} ${t.slice(11, 16)}`; };
  const vezes = x => x == null ? '—' : x.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'x';
  async function carregaBalanco(iv, seq) {
    let b; try { b = await Base.rpc('central_balanco', { p_de: iv.de.toISOString(), p_ate: iv.ate.toISOString() }); } catch (e) { $('balNota').textContent = 'Não consegui calcular o balanço agora (' + e.message + ').'; return; }
    if (seq !== seqVisao) return;
    const tot = arr => (arr || []).find(x => x.disparo === '__total__') || { mensagens: 0, custo: 0, vendas: 0, faturamento: 0 };
    const P = tot(b.periodo), T = tot(b.total);
    const cpa = x => x.vendas > 0 ? brl(x.custo / x.vendas) : '—', ret = x => x.custo > 0 ? vezes(x.faturamento / x.custo) : '—';
    $('balKpis').innerHTML = [
      ['Vendas pelo WhatsApp ' + iv.rot, n(P.vendas), `${brl(P.faturamento)} em vendas`],
      ['Gasto ' + iv.rot, brl(P.custo), `${n(P.mensagens)} mensagens`],
      ['Custo por venda', cpa(P), P.vendas ? 'quanto custou trazer cada venda' : 'nenhuma venda no período'],
      ['Retorno', ret(P), P.custo > 0 ? `cada R$ 1 gasto voltou ${P.vendas ? brl(P.faturamento / P.custo) : 'R$ 0,00'}` : '—']
    ].map(([r, v, s2]) => `<div class="k"><div class="r">${esc(r)}</div><b>${esc(v)}</b><small>${esc(s2)}</small></div>`).join('');
    const L = (b.periodo || []).filter(x => x.disparo !== '__total__');
    $('balTabela').innerHTML = L.length ? `<table style="min-width:640px"><thead><tr><th>Disparo</th><th>Mensagens</th><th>Vendas</th><th>Conversão</th><th>Gasto</th><th>Custo por venda</th><th>Vendido</th><th>Retorno</th></tr></thead><tbody>${L.map(x => `<tr><td class="cn">${esc(x.disparo)}</td><td>${n(x.mensagens)}</td><td>${n(x.vendas)}</td><td>${/^Primeiro acesso|^Testes/.test(x.disparo) ? '—' : pctTx(x.compradores, x.mensagens)}</td><td>${brl(x.custo)}</td><td>${cpa(x)}</td><td>${brl(x.faturamento)}</td><td><b>${/^Primeiro acesso|^Testes/.test(x.disparo) ? '—' : ret(x)}</b></td></tr>`).join('')}<tr><td class="cn">Total</td><td>${n(P.mensagens)}</td><td>${n(P.vendas)}</td><td>${pctTx(P.compradores, P.mensagens)}</td><td>${brl(P.custo)}</td><td>${cpa(P)}</td><td>${brl(P.faturamento)}</td><td><b>${ret(P)}</b></td></tr></tbody></table>` : '<p class="vazio">Nenhuma mensagem no período.</p>';
    $('balNota').textContent = `Desde o início: ${n(T.vendas)} vendas, ${brl(T.faturamento)} vendidos, ${brl(T.custo)} gastos, custo por venda ${cpa(T)}, retorno ${ret(T)}. Conversão = pessoas que compraram ÷ mensagens. Venda conta quando a pessoa compra o produto oferecido (ou qualquer produto, nas recuperações) com o mesmo e-mail em até 7 dias depois da mensagem. Valor vendido pelo preço de tabela, sem a taxa da Greenn e sem impostos. Primeiro acesso é custo de operação, não de venda. No total, cada venda conta uma vez, mesmo que mais de um disparo tenha falado com a pessoa.`;
  }
  async function carregaCustos(iv, seq) {
    let c; try { c = await Base.rpc('central_custos', { p_de: iv.de.toISOString(), p_ate: iv.ate.toISOString() }); } catch (e) { $('custoNota').textContent = 'Não consegui carregar os custos agora (' + e.message + ').'; return; }
    if (seq !== seqVisao) return;
    const p = c.periodo, t = c.total, cf = c.config;
    const desde = t.desde ? new Date(Date.parse(t.desde) + SP).toISOString().slice(0, 10).split('-').reverse().join('/') : '—';
    $('custoKpis').innerHTML = [
      ['Gasto ' + iv.rot, brl(p.total), `${n(p.mensagens)} mensagens entregues`],
      ['Gasto desde o início', brl(t.total), `${n(t.mensagens)} mensagens desde ${desde}`],
      ['Ofertas (marketing)', n(p.marketing), `${brl(cf.marketing_brl)} cada · ${brl(p.marketing * cf.marketing_brl)} ${iv.rot}`],
      ['Acesso (utilidade)', n(p.utilidade), `${brl(cf.utilidade_brl)} cada · ${brl(p.utilidade * cf.utilidade_brl)} ${iv.rot}`]
    ].map(([r, v, s]) => `<div class="k"><div class="r">${esc(r)}</div><b>${esc(v)}</b><small>${esc(s)}</small></div>`).join('');
    const D = c.por_disparo || [];
    $('custoDisparos').innerHTML = D.length ? `<table style="min-width:480px"><thead><tr><th>Disparo</th><th>Tipo</th><th>Msgs ${esc(iv.rot)}</th><th>Gasto ${esc(iv.rot)}</th><th>Gasto total</th></tr></thead><tbody>${D.map(x => `<tr><td class="cn">${esc(x.disparo)}</td><td>${esc(CAT[x.categoria] || x.categoria)}</td><td>${n(x.qtd_periodo)}</td><td>${brl(x.brl_periodo)}</td><td><b>${brl(x.total_brl)}</b></td></tr>`).join('')}<tr><td class="cn">Total</td><td></td><td>${n(p.mensagens)}</td><td><b>${brl(p.total)}</b></td><td><b>${brl(t.total)}</b></td></tr></tbody></table>` : '<p class="vazio">Nenhuma mensagem cobrada ainda.</p>';
    const dias = c.por_dia || [], mx = Math.max(1, ...dias.map(d => +d.brl));
    $('custoDias').innerHTML = dias.length ? dias.slice().reverse().map(d => `<div style="display:grid;grid-template-columns:52px 1fr 78px;gap:8px;align-items:center;font-size:12.5px;margin:3px 0"><span style="color:var(--mute)">${d.dia.slice(8, 10)}/${d.dia.slice(5, 7)}</span><span style="height:8px;border-radius:4px;background:var(--compra);width:${Math.max(2, Math.round(d.brl / mx * 100))}%"></span><span style="text-align:right">${brl(d.brl)}</span></div>`).join('') : '<p class="vazio">Sem gastos nos últimos 30 dias.</p>';
    const L = (c.ultimas || []).filter(u => $('testes').checked || !u.teste);
    $('custoNota').textContent = `Valor por mensagem entregue, pela tabela oficial da Meta para o Brasil, com o dólar a ${brl(cf.dolar)}. Mostra as últimas ${n(L.length)} do período. Respostas que o robô manda depois que a pessoa toca no botão não entram: dentro da janela de 24 horas elas não têm custo de modelo.`;
    $('custoLista').innerHTML = L.length ? `<table style="min-width:520px"><thead><tr><th>Quando</th><th>Para</th><th>Disparo</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>${L.map(u => `<tr><td>${hora(u.em)}</td><td class="cn">${esc(u.nome)}${u.teste ? ' <small style="color:var(--mute)">teste</small>' : ''}</td><td>${esc(u.disparo)}</td><td>${esc(CAT[u.categoria] || u.categoria)}</td><td>${brl(u.brl)}</td></tr>`).join('')}</tbody></table>` : '<p class="vazio">Nenhuma mensagem cobrada no período.</p>';
  }
  let sequenciaCarregada = false;
  function marcaVivo(iv) {
    if (!ultimaAtualizacao) return;
    const on = iv.vivo && !document.hidden;
    $('vivo').classList.toggle('on', on);
    const h = new Date(ultimaAtualizacao + SP).toISOString().slice(11, 19);
    $('vivoTx').textContent = on ? `Ao vivo · atualizado às ${h}` : `Atualizado às ${h}`;
  }
  function agenda() { clearInterval(timerVisao); timerVisao = setInterval(() => { if (!document.hidden && intervalo().vivo) carrega(true); }, 15000); }

  // ========================================================================
  // perfis dos alunos (Tarefa 5) + Kit Freelancer (Tarefa 4)
  // ========================================================================
  const PF = {
    seg: { quente: ['Quentes', 'Oferecer o Kit Freelancer', 'var(--compra)'], morno: ['Mornos', 'Nutrir antes de oferecer', 'var(--abriu)'], frio: ['Frios', 'Editam para as próprias redes', 'var(--dim)'] },
    quem: { clientes: 'Para clientes', agencia: 'Agência ou produtora', redes: 'Próprias redes', aprendendo: 'Aprendendo' },
    editor: { capcut_pc: 'CapCut computador', capcut_cel: 'CapCut celular', premiere: 'Premiere', davinci: 'DaVinci', finalcut: 'Final Cut', outro: 'Outro' },
    ajuda: { cobrar: 'Cobrar e orçar', organizar: 'Organizar clientes', rapido: 'Editar mais rápido', bonito: 'Vídeos mais bonitos', clientes: 'Conseguir clientes' }
  };
  let pfDados = null, pfSel = 'quente';
  let ultimoPerfisQuente = false, ultimoPerfisFeed = [], ultimoKitPausado = false, ultimoKitMotivo = '', ultimoKitLista = [];
  const pfNome = (m, v) => String(v || '').split(', ').filter(Boolean).map(x => m[x] || x).join(', ');
  function pfFiltrada() {
    const busca = ($('pfBusca').value || '').trim().toLowerCase(), origem = $('pfOrigem').value;
    return (pfDados?.lista || []).filter(l => l.segmento === pfSel
      && (!busca || (l.email || '').toLowerCase().includes(busca))
      && (!origem || l.app === origem));
  }
  function pfDesenha() {
    const d = pfDados; if (!d) return; const r = d.resumo;
    $('pfResumo').innerHTML = `<b>${r.responderam}</b> responderam · <b>${r.pularam}</b> deixaram para depois`;
    $('pfSeg').innerHTML = Object.entries(PF.seg).map(([k, [t, s, c]]) => `<button type="button" data-s="${k}" aria-pressed="${k === pfSel}" style="border-top-color:${c}"><b>${r[k] || 0}</b>${t}<small>${s}</small></button>`).join('');
    $('pfSeg').querySelectorAll('button').forEach(b => b.onclick = () => { pfSel = b.dataset.s; pfDesenha(); });
    const col = (tit, obj, m, tot) => { const it = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]);
      return `<div><h3>${tit}</h3>${it.length ? it.map(([k, n]) => `<div class="pf-l"><span>${esc(m[k] || k)}</span><b>${n}</b><span class="barrinha" style="width:${Math.max(3, Math.round(n / Math.max(1, tot) * 100))}%"></span></div>`).join('') : '<p class="vazio" style="padding:10px 0">Ainda sem respostas</p>'}</div>`; };
    $('pfCols').innerHTML = col('Edita para quem', d.quem, PF.quem, r.responderam) + col('Editor', d.editor, PF.editor, r.responderam) + col('O que mais ajudaria', d.ajuda, PF.ajuda, r.responderam);
    const L = pfFiltrada();
    $('pfCsvTx').textContent = L.length ? `${L.length} na lista ${PF.seg[pfSel][0].toLowerCase()}` : '';
    $('pfCsv').disabled = !L.length;
    $('pfLista').innerHTML = L.length ? `<table><thead><tr><th>E-mail</th><th>Telefone</th><th>Edita para</th><th>Editor</th><th>Quer ajuda com</th><th>Já comprou</th><th>Kit</th><th>Respondeu</th></tr></thead><tbody>${L.map(l => `<tr><td class="cn">${esc(l.email)}${l.saiu_whatsapp ? ' <small style="color:var(--nada)">saiu</small>' : ''}</td><td>${esc(l.telefone || '—')}</td><td>${esc(PF.quem[l.quem] || l.quem || '')}</td><td>${esc(PF.editor[l.editor] || l.editor || '')}</td><td>${esc(pfNome(PF.ajuda, l.ajuda))}</td><td style="white-space:normal;max-width:240px">${esc(l.produtos || '—')}</td><td>${l.tem_kit ? 'Sim' : '—'}</td><td>${esc(new Date(new Date(l.respondido_em).getTime() + SP).toISOString().slice(0, 10).split('-').reverse().join('/'))}</td></tr>`).join('')}</tbody></table>`
      : '<p class="vazio">Ninguém nesta lista ainda com esse filtro.</p>';
  }
  const quando = iso => { if (!iso) return ''; const t = new Date(Date.parse(iso) + SP).toISOString(), dia = t.slice(0, 10), h = t.slice(11, 16); return dia === diaSP() ? h : `${dia.slice(8, 10)}/${dia.slice(5, 7)} ${h}`; };
  function pfFeed(d) {
    const F = d.feed || [], chave = r => r.t + '|' + r.email + '|' + r.em, primeira = pfVistos == null;
    const novos = primeira ? new Set() : new Set(F.filter(r => !pfVistos.has(chave(r))).map(chave));
    pfVistos = new Set(F.map(chave));
    if (!primeira) { const r = F.find(x => novos.has(chave(x)) && x.t === 'respondeu'); if (r) avisaResposta(r); }
    ultimoPerfisQuente = F.some(r => r.t === 'respondeu' && r.segmento === 'quente');
    ultimoPerfisFeed = F;
    $('pfFeed').innerHTML = F.length ? F.map(r => `<li class="${novos.has(chave(r)) ? 'novo' : ''}"><time>${quando(r.em)}</time><span><span class="q">${esc(r.nome || 'Aluno')}</span> ${r.t === 'respondeu'
      ? `respondeu ${r.app === 'web' ? 'no site' : 'no app'}<span class="c"><span class="pf-chip ${esc(r.segmento)}">${esc(PF.seg[r.segmento] ? PF.seg[r.segmento][0].replace(/s$/, '') : '')}</span>${esc(PF.quem[r.quem] || '')} · ${esc(PF.editor[r.editor] || '')} · ${esc(pfNome(PF.ajuda, r.ajuda))}</span>`
      : `deixou para depois<span class="c">volta a ver as perguntas em 12 horas</span>`}</span></li>`).join('')
      : '<li><span></span><span class="vazio" style="padding:10px 0">Ainda sem respostas.</span></li>';
  }
  const KST = { reservado: 'Enviando', enviado: 'Enviada', entregue: 'Entregue', lido: 'Lida', falhou: 'Falhou' };
  function kitDesenha(d) {
    const k = d.kit; if (!k) return;
    ultimoKitPausado = !k.ligado; ultimoKitMotivo = k.pausa_motivo || (k.ligado ? '' : 'Envio desligado.'); ultimoKitLista = k.lista || [];
    $('kitSt').innerHTML = k.ligado ? '<b>Ligado.</b> Quem responde como quente recebe a mensagem 24 horas depois, das 8h às 22h.' : `<span class="off"><b>Pausado.</b> ${esc(k.pausa_motivo || 'Envio desligado.')}</span>`;
    const it = [['Na fila', k.na_fila], ['Enviadas', k.enviados], ['Entregues', k.entregues], ['Lidas', k.lidos], ['Tocaram em Quero ver', k.tocaram], ['Abriram a página', k.abriram], ['Compraram', k.compraram], ['Falharam', k.falharam]];
    $('kitN').innerHTML = it.map(([t, v]) => `<div><b>${n(v)}</b><small>${t}</small></div>`).join('');
    const L = k.lista || [], si = b => b ? '<span class="ok">✓</span>' : '—';
    $('kitLista').innerHTML = L.length ? `<table style="min-width:440px"><thead><tr><th>Aluno</th><th>Situação</th><th>Quero ver</th><th>Abriu</th><th>Comprou</th></tr></thead><tbody>${L.map(r => `<tr><td class="cn">${esc(r.nome || r.email)}${r.saiu ? ' <small style="color:var(--nada)">saiu</small>' : ''}</td><td>${r.envio ? esc(KST[r.envio] || r.envio) + ' · ' + quando(r.enviado_em) : 'Na fila · envia ' + quando(r.envia_em)}</td><td>${si(r.tocou)}</td><td>${si(r.abriu)}</td><td>${si(r.comprou)}</td></tr>`).join('')}</tbody></table>`
      : '<p class="vazio">Ninguém na fila ainda.</p>';
  }
  async function carregaPerfis() {
    const minhaSeq = ++seqPerfis;
    try { const d = await Base.rpc('central_perfis', {}); if (minhaSeq !== seqPerfis) return; pfDados = d; pfDesenha(); pfFeed(d); kitDesenha(d); }
    catch (e) { $('pfResumo').textContent = 'Não consegui carregar os perfis agora (' + e.message + ').'; }
  }
  $('pfCsv').onclick = () => {
    const L = pfFiltrada(); if (!L.length) return;
    const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const linhas = [['email', 'telefone', 'lista', 'edita_para', 'editor', 'quer_ajuda_com', 'ja_comprou', 'tem_kit', 'saiu_whatsapp', 'respondeu_em'].join(';')]
      .concat(L.map(l => [l.email, l.telefone, l.segmento, PF.quem[l.quem] || l.quem, PF.editor[l.editor] || l.editor, pfNome(PF.ajuda, l.ajuda), l.produtos, l.tem_kit ? 'sim' : 'nao', l.saiu_whatsapp ? 'sim' : 'nao', l.respondido_em].map(q).join(';')));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = `alunos-${pfSel}-${diaSP()}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $('pfBusca').oninput = () => pfDesenha();
  $('pfOrigem').onchange = () => pfDesenha();
  function agendaPerfis() { clearInterval(timerPerfis); timerPerfis = setInterval(() => { if (!document.hidden && !$('app').hidden) carregaPerfis(); }, 15000); }

  // ========================================================================
  // acesso
  // ========================================================================
  function mostraPorta(msg) { $('app').hidden = true; $('porta').hidden = false; if (msg) $('portaTx').textContent = msg; clearInterval(timerVisao); clearInterval(timerPerfis); }
  function semAcesso() { mostraPorta(`O e-mail ${Base.email()} não tem acesso a esta central. Entre com o e-mail autorizado.`); Base.sair(); }
  $('avisoBt').onclick = async () => { if (!temNotif) { somVenda(); return; } if (Notification.permission !== 'granted') { try { await Notification.requestPermission(); } catch {} } marcaAviso(); if (Notification.permission === 'granted') { try { new Notification('Avisos ligados', { body: 'Quando sair uma venda pelo WhatsApp, você recebe um aviso aqui.' }); } catch {} somVenda(); } };
  marcaAviso();
  function abre() {
    $('porta').hidden = true; $('app').hidden = false; vistos = new Set();
    mostraAba(state.tab);
    carrega(); agenda(); carregaPerfis(); agendaPerfis();
    if (/[?&]teste=aviso/.test(location.search)) setTimeout(() => avisaVenda(1, 0, true), 3000);
  }
  $('entrar').onclick = async () => { const ok = await Base.login(); if (ok || Base.sessao()) abre(); };
  $('sair').onclick = () => { Base.sair(); mostraPorta('Você saiu. Entre de novo para ver a central.'); };

  // ---------- filtros de período (iguais ao original + persistência) ----------
  document.querySelectorAll('.seg button').forEach(b => b.onclick = () => {
    state.periodo = b.dataset.p; Prefs.set({ periodo: state.periodo });
    document.querySelectorAll('.seg button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $('custom').classList.toggle('on', state.periodo === 'custom');
    if (state.periodo === 'custom' && !$('de').value) { $('ate').value = diaSP(); $('de').value = somaDias(diaSP(), -6); }
    vistos = new Set(); carrega();
  });
  $('de').onchange = $('ate').onchange = () => { Prefs.set({ de: $('de').value, ate: $('ate').value }); vistos = new Set(); carrega(); };
  $('testes').onchange = () => { Prefs.set({ testes: $('testes').checked }); vistos = new Set(); carrega(); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !$('app').hidden) { carrega(true); carregaPerfis(); } else marcaVivo(intervalo()); });
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (ultimoDado && state.tab === 'visao') { serie(...ultimoDado); horas(ultimoDado[0]); } }, 200); });

  // ---------- restaura preferências salvas ----------
  (() => {
    state.periodo = p0.periodo || 'hoje'; state.testes = !!p0.testes;
    document.querySelectorAll('.seg button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.p === state.periodo)));
    $('custom').classList.toggle('on', state.periodo === 'custom');
    if (p0.de) $('de').value = p0.de; if (p0.ate) $('ate').value = p0.ate;
    $('testes').checked = state.testes;
  })();

  if (Base.sessao()) abre(); else mostraPorta();
})();
