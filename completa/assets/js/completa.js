/* ==========================================================================
   COMPLETE SUA BASE FL · lógica compartilhada pelas 8 páginas
   A página diz quem é (data-campanha, data-perfil, data-pagina). O servidor diz
   o que o aluno tem, o que falta, o preço e o checkout. A página só apresenta.
   ========================================================================== */
(function () {
  "use strict";
  var d = document, html = d.documentElement, W = window;
  var CFG = W.COMPLETA_CONFIG || {}, C = W.COMPLETA;
  if (!C) return;
  var PREVIA = CFG.MODO !== "producao";
  var CAMP = html.getAttribute("data-campanha"), PERFIL = +html.getAttribute("data-perfil"), PAGINA = html.getAttribute("data-pagina");
  var K = C.campanhas[CAMP], PG = C.paginas[CAMP][PERFIL], P = C.produtos, R = K.r;
  var css = d.querySelector('link[rel="stylesheet"]'), RAIZ = css ? css.getAttribute("href").split("assets/")[0] : "";
  var params = new URLSearchParams(location.search);
  var reduz = W.matchMedia && W.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }
  function num(n) { n = Math.round(n * 100) / 100; return n % 1 ? n.toFixed(2).replace(".", ",") : String(n); }
  function brl(n) { return "R$ " + num(n); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ico(id, cls) { return '<svg class="' + (cls || "ico") + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function img(src, w, alt) { return '<img src="' + RAIZ + "assets/img/" + src + '" alt="' + esc(alt || "") + '" width="' + w + '" height="' + w + '" loading="lazy" decoding="async">'; }
  function lista(nomes) { return nomes.length < 2 ? nomes.join("") : nomes.slice(0, -1).join(", ") + " e " + nomes[nomes.length - 1]; }

  /* ---------- 1. Eventos (dataLayer, pixel se existir, servidor) ---------- */
  var ORIGEM = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "src", "sck", "ref"].forEach(function (k) { var v = params.get(k); if (v) ORIGEM[k] = v.slice(0, 120); });
  var D = null, logPrevia = [];
  function evento(nome, extra) {
    var o = { event: nome, pagina_id: PAGINA, campanha: K.id, perfil_comercial: PERFIL, origem: ORIGEM.utm_source || ORIGEM.src || "direto" };
    var k; for (k in ORIGEM) o[k] = ORIGEM[k];
    if (D && D.aluno && D.aluno.ref) o.aluno_ref = D.aluno.ref;
    for (k in (extra || {})) o[k] = extra[k];
    try { (W.dataLayer = W.dataLayer || []).push(o); } catch (e) {}
    try {
      if (typeof W.fbq === "function") {
        W.fbq("trackCustom", nome, o);
        if (nome === "completa_pagina_vista") W.fbq("track", "ViewContent", { content_name: PAGINA });
        if (nome === "completa_checkout_iniciado") W.fbq("track", "InitiateCheckout", { value: o.valor || 0, currency: "BRL", content_name: PAGINA });
      }
    } catch (e) {}
    if (PREVIA) { logPrevia.unshift(new Date().toTimeString().slice(0, 8) + "  " + nome + (extra && extra.posicao ? " · " + extra.posicao : "")); var l = $("[data-pv-log]"); if (l) l.textContent = logPrevia.slice(0, 12).join("\n"); }
    else if (CFG.EVENTO_URL && navigator.sendBeacon) { try { navigator.sendBeacon(CFG.EVENTO_URL, new Blob([JSON.stringify(token ? Object.assign({ token: token }, o) : o)], { type: "text/plain;charset=UTF-8" })); } catch (e) {} }
  }

  /* ---------- 2. Hora: a do servidor; o relógio do aparelho é só o plano B ---------- */
  var desvio = 0, fonteHora = "aparelho";
  function agora() { return Date.now() + desvio; }
  function acertaHora(iso, t0, t1) { var s = Date.parse(iso); if (isNaN(s)) return; desvio = s - (t0 + t1) / 2; fonteHora = "servidor"; }
  function horaDoCabecalho() {
    if (fonteHora !== "aparelho" || !/^https?:$/.test(location.protocol) || !W.fetch) return;
    var t0 = Date.now();
    fetch(location.pathname + "?hora=" + t0, { method: "HEAD", cache: "no-store" }).then(function (r) {
      if (fonteHora !== "aparelho") return; var h = r.headers.get("date"); if (h) { acertaHora(h, t0, Date.now()); desvio += 500; fonteHora = "cabecalho"; marca(); }
    }).catch(function () {});
  }

  /* ---------- 3. Texto com valores: {preco} {ref} {eco} {pct} e *destaque* ---------- */
  function valoresEsperados() {
    var p = C.perfis[PERFIL], ref = p.referencia, pr = p.preco;
    return { referencia_total: ref, preco: pr, economia: ref - pr, economia_pct: Math.round((ref - pr) / ref * 100), parcelas: "" };
  }
  function txt(modelo, V, extra) {
    var t = esc(modelo).replace(/\*([^*]+)\*/g, "<em>$1</em>");
    var mapa = { preco: brl(V.preco), ref: brl(V.referencia_total), eco: brl(V.economia), pct: V.economia_pct + "%" };
    t = t.replace(/\{(preco|ref|eco|pct)\}/g, function (_, k) { return '<span class="v" data-v="' + k + '">' + mapa[k] + "</span>"; });
    if (extra) t = t.replace(/\{(\w+)\}/g, function (m, k) { return k in extra ? extra[k] : m; });
    return t;
  }

  /* ---------- 4. Elegibilidade ---------- */
  var token = params.get("t") || "";
  function guardaToken() {
    try { if (token) sessionStorage.setItem("completa_t", token); else token = sessionStorage.getItem("completa_t") || ""; } catch (e) {}
    if (params.get("t") && W.history && history.replaceState) {   // o token não fica na barra de endereço nem em prints
      params.delete("t"); var q = params.toString(); history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
    }
  }
  function comTempo(pr, ms) { return new Promise(function (ok, erro) { var t = setTimeout(function () { erro(new Error("tempo")); }, ms); pr.then(function (v) { clearTimeout(t); ok(v); }, function (e) { clearTimeout(t); erro(e); }); }); }
  function post(url, corpo) {
    return comTempo(fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo), cache: "no-store", credentials: "same-origin" })
      .then(function (r) { return r.json().catch(function () { return { ok: false, motivo: "resposta_invalida" }; }); }), CFG.TEMPO_LIMITE_MS || 8000);
  }
  function normaliza(j) {
    if (!j || typeof j !== "object") return null;
    var v = j.valores || {}, ref = +v.referencia_total, pr = +v.preco;
    if (!(ref > 0) || !(pr > 0) || pr >= ref) return null;
    j.valores = { referencia: v.referencia || {}, referencia_total: ref, preco: pr, economia: +v.economia || ref - pr,
      economia_pct: +v.economia_pct || Math.round((ref - pr) / ref * 100), parcelas: typeof v.parcelas === "string" ? v.parcelas : "" };
    j.possui = (j.possui || []).filter(function (id) { return P[id]; });
    j.faltam = (j.faltam || []).filter(function (id) { return P[id]; });
    j.campanha = j.campanha || {};
    return j;
  }
  // prévia: o "servidor" é simulado aqui, com a mesma regra do esboço do servidor
  var simTem = null, simEstado = null;
  function combinacaoPadrao() { return PERFIL === 0 ? [] : PERFIL === 3 ? C.extras.slice() : PERFIL === 1 ? ["efeitos"] : ["efeitos", "luts"]; }
  function lerPrevia() {
    var h = location.hash.replace("#", ""), m;
    var q = params.get("tem"); if (q != null) simTem = q ? q.split(/[,-]/) : [];
    if ((m = /^tem-([a-z-]+)$/.exec(h))) simTem = m[1].split("-");
    var e = params.get("estado") || (/^(fim|ultimo-minuto|bloqueada|breve|aberta)$/.test(h) ? h : null);
    if (e) simEstado = e;
    if (!simTem || simTem.filter(function (x) { return C.extras.indexOf(x) > -1; }).length !== PERFIL) simTem = combinacaoPadrao();
  }
  function simulado() {
    var tem = simTem.slice(), faltaExtras = C.extras.filter(function (x) { return tem.indexOf(x) < 0; });
    var faltam = ["mood", "kit"].concat(faltaExtras), refs = {};
    faltam.forEach(function (id) { refs[id] = P[id].referencia; });
    var V = valoresEsperados(), ag = params.get("agora"), fim = Date.parse(K.fim);
    var ini = K.inicio ? Date.parse(K.inicio) : null, base = ini && Date.now() < ini ? ini + 9 * 864e5 : Date.now();   // Natal ainda não abriu: a prévia simula 10/12
    var agoraSim = ag && !isNaN(Date.parse(ag)) ? Date.parse(ag) : simEstado === "fim" ? fim + 1000 : simEstado === "ultimo-minuto" ? fim - 65000 : simEstado === "breve" ? (ini ? ini - 3 * 864e5 : Date.now()) : base;
    var r = {
      elegivel: simEstado !== "bloqueada", motivo: simEstado === "bloqueada" ? "token_invalido" : "",
      agora: agoraSim ? new Date(agoraSim).toISOString() : null, pagina: PAGINA, perfil: PERFIL,
      campanha: { id: K.id, inicio: simEstado === "breve" && !ini ? new Date(Date.now() + 3 * 864e5).toISOString() : K.inicio, encerra_em: K.fim },
      aluno: { ref: "previa-0000", primeiro_nome: "" },
      possui: C.base.concat(tem), faltam: faltam,
      valores: { referencia: refs, referencia_total: V.referencia_total, preco: V.preco, economia: V.economia, economia_pct: V.economia_pct, parcelas: "" },
      oferta_id: K.id + "-p" + PERFIL + "-" + faltam.join("-")
    };
    return r;
  }
  function carrega() {
    if (PREVIA) { lerPrevia(); var t0 = Date.now(); var r = simulado(); if (r.agora) acertaHora(r.agora, t0, t0); else desvio = 0; return Promise.resolve(r); }
    if (!token) return Promise.resolve({ elegivel: false, motivo: "sem_token" });
    var t0 = Date.now();
    return post(CFG.ELEGIBILIDADE_URL, { token: token, pagina: PAGINA }).then(function (j) {
      if (j && j.agora) acertaHora(j.agora, t0, Date.now());
      return j;
    });
  }

  /* ---------- 5. Desenho a partir dos dados ---------- */
  var VIT = C.vitalicio && K.vitalicio;
  function vitChip(t) { return VIT ? '<span class="vit"><svg viewBox="0 0 48 24" aria-hidden="true"><use href="#i-inf"/></svg>' + esc(t || C.vitalicio.selo) + "</span>" : ""; }
  function pend(t) { return PREVIA ? '<p class="pend">' + ico("i-info") + "<span>A CONFIRMAR · " + esc(t) + "</span></p>" : ""; }

  function aplicaValores(V) {
    var mapa = { preco: brl(V.preco), ref: brl(V.referencia_total), eco: brl(V.economia), pct: V.economia_pct + "%", "preco-num": num(V.preco) };
    $$("[data-v]").forEach(function (el) { var k = el.getAttribute("data-v"); if (k in mapa) el.textContent = mapa[k]; });
    var of = $(".of-preco"); if (of) of.setAttribute("aria-label", "por " + mapa.preco);
    var b = $("[data-barra-preco]"); if (b) b.style.setProperty("--w", (V.preco / V.referencia_total).toFixed(3));
    var parc = $("[data-parcelas]"); if (parc) parc.textContent = V.parcelas || "";
    $$("[data-cta]").forEach(function (a) { var s = $("[data-cta-txt]", a); if (s) s.innerHTML = txt(PG.cta, V); });
    var ot = $("[data-of-txt]"); if (ot) ot.innerHTML = txt(PG.oferta, V);
    var ft = $("#t-final"); if (ft) ft.innerHTML = txt(PG.final_t, V);
    var fs = $("#final .lead"); if (fs) fs.innerHTML = txt(PG.final_sub, V);
    var sub = $(".hero .lead"); if (sub && /\{(ref|preco)\}/.test(PG.sub)) sub.innerHTML = txt(PG.sub, V);
  }
  function tile(id, t) {
    var p = P[id];
    return '<li class="tile" data-t="' + t + '" data-id="' + id + '"><span class="tile-ic">' + img(p.icone, 96) + '<span class="tile-b">' + ico(t === "tem" ? "i-ok" : "i-mais") + '</span></span><span class="tile-n">' + esc(p.nome) + "</span></li>";
  }
  function desenhaColecao(dd) {
    var g = $("[data-col-grade]"); if (!g) return;
    var ordem = C.base.concat(C.extras, C.ferramentas), tem = 0;
    g.innerHTML = ordem.map(function (id) { var t = dd.possui.indexOf(id) > -1 ? "tem" : "falta"; if (t === "tem") tem++; return tile(id, t); }).join("");
    var c = $("[data-col-cont]"); if (c) c.innerHTML = "<em>" + tem + "</em> de " + ordem.length;
    var b = $("[data-col-barra]"); if (b) b.style.setProperty("--tem", tem);
    g.setAttribute("aria-label", "Você tem " + tem + " dos " + ordem.length + " itens desta coleção. Faltam: " + lista(dd.faltam.map(function (id) { return P[id].nome; })) + ".");
  }
  function desenhaJa(dd) {
    var ul = $("[data-ja]"); if (!ul) return;
    ul.innerHTML = dd.possui.map(function (id) {
      var p = P[id], extra = C.extras.indexOf(id) > -1;
      return '<li class="ja-c rv in"' + (extra ? " data-extra" : "") + ">" + img(p.icone, 52) + '<div><b>' + esc(p.nome) + "</b><small>" + esc(p.sub) + '</small><span class="ja-tem">' + ico("i-ok") + "Você já tem</span></div></li>";
    }).join("");
    var n = $("[data-ja-nota]"); if (n) n.textContent = dd.possui.length + " itens na sua conta. Nenhum deles entra na conta desta oferta.";
  }
  function cardProduto(id, V) {
    var p = P[id], ref = V.referencia && V.referencia[id] != null ? +V.referencia[id] : p.referencia;
    return '<article class="prod rv in" data-prod="' + id + '">' +
      '<div class="prod-cab">' + img(p.icone, 60) + '<div><p class="prod-tipo">' + esc(p.tipo) + '</p><h3 class="prod-nome">' + esc(p.nome) + "</h3></div></div>" +
      '<p class="prod-serve">' + esc(p.serve) + "</p>" +
      '<p class="prod-desc">' + esc(p.desc) + "</p>" +
      '<ul class="prod-ben">' + p.beneficios.map(function (b) { return "<li>" + ico("i-ok") + "<span>" + esc(b) + "</span></li>"; }).join("") + "</ul>" +
      (p.aviso ? '<p class="prod-aviso">' + ico("i-info") + "<span>" + esc(p.aviso) + "</span></p>" : "") +
      '<div class="prod-pe"><div class="prod-meta"><span class="chip">' + ico("i-pc") + esc(p.requisito) + "</span>" + vitChip(C.vitalicio && C.vitalicio.chip) + "</div>" +
      '<p class="prod-ref">Referência <b>' + brl(ref) + "</b></p></div>" +
      (p.referencia_status === "divergente" ? pend(p.referencia_fonte) : "") +
      "</article>";
  }
  function desenhaFaltam(dd) {
    var box = $("[data-faltam]"); if (!box) return;
    var fer = dd.faltam.filter(function (id) { return C.ferramentas.indexOf(id) > -1; }), ext = dd.faltam.filter(function (id) { return C.extras.indexOf(id) > -1; });
    var h = "";
    if (fer.length) h += '<p class="grupo-k">Ferramentas</p><div class="prods dois">' + fer.map(function (id) { return cardProduto(id, dd.valores); }).join("") + "</div>";
    if (ext.length) h += '<p class="grupo-k">' + (ext.length === 1 ? "O pacote extra que falta" : "Pacotes extras") + '</p><div class="prods' + (ext.length === 1 ? " um" : ext.length === 2 ? " dois" : "") + '">' + ext.map(function (id) { return cardProduto(id, dd.valores); }).join("") + "</div>";
    box.innerHTML = h;
  }
  function desenhaConta(dd) {
    var box = $("[data-conta-linhas]"); if (!box) return;
    box.innerHTML = dd.faltam.map(function (id) {
      var p = P[id], ref = dd.valores.referencia[id] != null ? +dd.valores.referencia[id] : p.referencia;
      return '<div class="conta-l">' + img(p.icone, 30) + "<span>" + esc(p.nome) + "<small>" + esc(p.sub) + "</small></span><b>" + brl(ref) + "</b></div>";
    }).join("");
    $$("[data-ref-prod]").forEach(function (el) { var id = el.getAttribute("data-ref-prod"); var r = dd.valores.referencia[id]; el.textContent = r != null ? "Referência " + brl(r) : ""; });
  }
  function desenhaOferta(dd) {
    var ul = $("[data-of-itens]"); if (ul) ul.innerHTML = dd.faltam.map(function (id) { return "<li>" + img(P[id].icone, 24) + esc(P[id].nome) + "</li>"; }).join("");
    var fi = $("[data-final-icones]"); if (fi) fi.innerHTML = dd.faltam.map(function (id) { return img(P[id].icone, 46); }).join("");
  }
  function desenhaRecon(dd) {
    var el = $("[data-recon]"), extras = dd.possui.filter(function (id) { return C.extras.indexOf(id) > -1; }), falta = dd.faltam.filter(function (id) { return C.extras.indexOf(id) > -1; });
    if (el && PG.recon_pers && extras.length) {
      el.innerHTML = txt(PG.recon_pers, dd.valores, {
        extras_possui: "<b>" + lista(extras.map(function (id) { return esc(P[id].artigo || P[id].nome); })) + "</b>",
        extra_falta: "<b>" + lista(falta.map(function (id) { return esc(P[id].artigo || P[id].nome); })) + "</b>"
      });
    }
    var ola = $("[data-ola]"), nome = dd.aluno && dd.aluno.primeiro_nome ? String(dd.aluno.primeiro_nome).trim().split(/\s+/)[0].slice(0, 30) : "";
    if (ola) ola.textContent = nome ? "Oi, " + nome + "." : "";
  }
  function desenhaFaq(dd) {
    $$("[data-faq-id]").forEach(function (det) {
      var id = det.getAttribute("data-faq-id"), r = $(".r", det);
      if (id === "instalacao") r.innerHTML = dd.faltam.map(function (k) { return "<p>" + esc(P[k].instalacao) + "</p>"; }).join("");
      if (id === "celular") r.innerHTML = "<p>Depende da ferramenta.</p>" + dd.faltam.map(function (k) { return "<p>" + esc(P[k].celular) + "</p>"; }).join("");
    });
  }
  function desenha(dd) {
    aplicaValores(dd.valores); desenhaColecao(dd); desenhaJa(dd); desenhaFaltam(dd); desenhaConta(dd); desenhaOferta(dd); desenhaRecon(dd); desenhaFaq(dd);
    html.classList.add("pronto");
  }

  /* ---------- 6. Estados e contador (datas fixas: recarregar não reinicia nada) ---------- */
  var estado = "carregando", bloqueio = null, FIM = Date.parse(K.fim), INICIO = K.inicio ? Date.parse(K.inicio) : null;
  function calcEstado(t) {
    if (bloqueio) return "bloqueada";
    if (!D) return "carregando";
    if (INICIO && t < INICIO) return "breve";
    return t < FIM ? "aberta" : "encerrada";
  }
  function aplicaEstado() {
    html.setAttribute("data-estado", estado);
    var aberta = estado === "aberta" || estado === "carregando";
    $$("[data-cta]").forEach(function (a) {
      if (aberta) { a.removeAttribute("aria-disabled"); a.setAttribute("href", "#oferta"); }
      else { a.setAttribute("aria-disabled", "true"); a.removeAttribute("href"); }
    });
    if (estado === "breve") $$("[data-breve-txt]").forEach(function (p) { p.textContent = "Ela abre em " + new Date(INICIO).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) + " (horário de Brasília)."; });
    var topo = $("[data-topo]"); if (topo && estado === "encerrada") topo.textContent = K.nome + " · encerrada";
  }
  function setU(b, v) { if (b.textContent === v) return; b.textContent = v; if (!reduz) { b.classList.remove("virou"); void b.offsetWidth; b.classList.add("virou"); } }
  function marca() {
    var t = agora(), novo = calcEstado(t);
    if (novo !== estado) { var era = estado; estado = novo; aplicaEstado(); if (novo === "encerrada" && era === "aberta") evento("completa_encerrada", { fonte_hora: fonteHora }); }
    var falta = Math.max(0, FIM - t), dd = Math.floor(falta / 864e5), h = Math.floor(falta % 864e5 / 36e5), m = Math.floor(falta % 36e5 / 6e4), s = Math.floor(falta % 6e4 / 1e3);
    var v = { d: pad(dd), h: pad(h), m: pad(m), s: pad(s) };
    $$("[data-u]").forEach(function (b) { setU(b, v[b.getAttribute("data-u")]); });
    var curto = (dd ? dd + "d " : "") + v.h + "h " + v.m + "m " + v.s + "s";
    $$("[data-prazo-mini]").forEach(function (b) { b.textContent = curto; });
    $$("[data-barra-ct]").forEach(function (b) { b.textContent = "termina em " + curto; });
  }
  function relogio() { marca(); setTimeout(relogio, 1000 - (agora() % 1000) + 12); }
  d.addEventListener("visibilitychange", function () { if (!d.hidden) marca(); });

  /* ---------- 7. Botões: o checkout só existe depois que o servidor confirma ---------- */
  var ocupado = false, esperando = null;
  function msg(t) { $$("[data-cta-msg]").forEach(function (p) { p.textContent = t || ""; }); }
  function destinoValido(u) {
    try { var x = new URL(u); return x.protocol === "https:" && (CFG.CHECKOUT_HOSTS || []).some(function (h) { return x.hostname === h || x.hostname.slice(-h.length - 1) === "." + h; }); } catch (e) { return false; }
  }
  function comOrigem(u) {
    if (!CFG.REPASSAR_PARAMETROS) return u;
    try { var x = new URL(u); Object.keys(ORIGEM).forEach(function (k) { if (!x.searchParams.has(k)) x.searchParams.set(k, ORIGEM[k]); }); return x.toString(); } catch (e) { return u; }
  }
  function pedeCheckout() {
    if (PREVIA) return Promise.resolve(null);
    return post(CFG.CHECKOUT_URL, { token: token, pagina: PAGINA, oferta_id: D.oferta_id, origem: ORIGEM }).then(function (j) {
      if (j && j.ok && destinoValido(j.checkout_url)) return comOrigem(j.checkout_url);
      var m = j && j.motivo;
      if (m === "campanha_encerrada") { FIM = Math.min(FIM, agora()); marca(); }
      throw new Error(m === "campanha_encerrada" ? "Esta condição já foi encerrada." : m === "campanha_nao_comecou" ? "Esta condição ainda não começou." : m === "condicao_mudou" ? "A sua conta mudou desde que você abriu a página. Atualize para ver a sua condição." : m === "checkout_nao_configurado" ? "O checkout desta condição ainda não está disponível. Tente de novo em instantes." : "Não consegui abrir o checkout agora. Tente de novo ou fale com o suporte.");
    });
  }
  function clique(e) {
    var a = e.currentTarget, pos = a.getAttribute("data-cta");
    e.preventDefault();
    if (a.getAttribute("aria-disabled") === "true") return;
    evento("completa_cta_clique", { posicao: pos });
    if (estado === "carregando") { esperando = pos; msg("Confirmando a condição da sua conta…"); return; }
    if (estado !== "aberta" || ocupado) return;
    ocupado = true; a.setAttribute("data-carregando", "1"); msg("");
    pedeCheckout().then(function (url) {
      evento("completa_checkout_iniciado", { posicao: pos, oferta_id: D.oferta_id, valor: D.valores.preco, moeda: "BRL" });
      if (PREVIA) abreSimulado(pos); else location.assign(url);
    }).catch(function (err) { msg(err && err.message || "Não consegui abrir o checkout agora."); })
      .then(function () { ocupado = false; a.removeAttribute("data-carregando"); });
  }
  function abreSimulado(pos) {
    var s = $("[data-sim]"); if (!s) return;
    var linhas = [["Página", PAGINA], ["Campanha", K.id], ["Perfil", PERFIL + " pacote(s) extra(s)"], ["Libera", lista(D.faltam.map(function (id) { return P[id].nome; }))],
      ["Preço", brl(D.valores.preco) + " (servidor confirma)"], ["Acesso", VIT ? "Vitalício" : "—"], ["Oferta", D.oferta_id], ["Botão", pos], ["Destino", "checkout da Greenn desta oferta, entregue pelo servidor (ainda não configurado)"],
      ["Origem", Object.keys(ORIGEM).length ? Object.keys(ORIGEM).map(function (k) { return k + "=" + ORIGEM[k]; }).join(" · ") : "direto"]];
    $("[data-sim-dados]", s).innerHTML = linhas.map(function (l) { return "<dt>" + esc(l[0]) + "</dt><dd>" + esc(l[1]) + "</dd>"; }).join("");
    s.hidden = false; var f = $("[data-sim-fechar]", s); f.focus();
    function fecha() { s.hidden = true; d.removeEventListener("keydown", tecla); }
    function tecla(ev) { if (ev.key === "Escape") fecha(); }
    f.onclick = fecha; s.onclick = function (ev) { if (ev.target === s) fecha(); }; d.addEventListener("keydown", tecla);
  }

  /* ---------- 8. Movimento ---------- */
  function quandoVer(el, fn, lim, sai) {
    if (!el) return;
    if (!("IntersectionObserver" in W)) { fn(); return; }
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { fn(); if (!sai) io.disconnect(); } else if (sai) sai(); }); }, { threshold: lim || 0.15 });
    io.observe(el);
  }
  function aparece() {
    // o que já está na primeira tela aparece sem depender do IntersectionObserver
    // (alguns navegadores dentro de apps e páginas dentro de iframes só avisam depois da primeira rolagem)
    var alt = W.innerHeight || 800;
    $$(".rv:not(.in)").forEach(function (e) { var r = e.getBoundingClientRect(); if (r.top < alt && r.bottom > 0) e.classList.add("in"); });
    setTimeout(function () { $$(".rv:not(.in)").forEach(function (e) { var r = e.getBoundingClientRect(); if (r.top < (W.innerHeight || 800) && r.bottom > 0) e.classList.add("in"); }); }, 1800);
    var els = $$(".rv:not(.in)");
    if (!("IntersectionObserver" in W)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }); }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach(function (e) { io.observe(e); });
  }
  var riscou = false;
  function riscas() {
    if (riscou) return; riscou = true;
    $$("[data-risca]").forEach(function (r) { quandoVer(r, function () { r.classList.add("on"); }, 0.9); });
    var b = $("[data-barras]"); quandoVer(b, function () { b.classList.add("on"); }, 0.6);
  }
  function faixa() {
    var tr = $("[data-faixa-trilho]"); if (!tr) return;
    var g = $(".faixa-g", tr), base = g.innerHTML;
    var n = 0; while (g.scrollWidth < W.innerWidth * 1.2 && n++ < 8) g.innerHTML += base;
    tr.appendChild(g.cloneNode(true));
    tr.style.setProperty("--fdur", Math.max(24, Math.round(g.scrollWidth / 40)) + "s");
  }
  function acende() {
    var g = $("[data-col-grade]"); if (!g) return;
    var i = 0, timer = null;
    function passo() { var f = $$('.tile[data-t="falta"]', g); if (!f.length) return; f.forEach(function (t) { t.classList.remove("acende"); }); var t = f[i++ % f.length]; void t.offsetWidth; t.classList.add("acende"); }
    quandoVer(g, function () { if (!timer) { passo(); timer = setInterval(passo, reduz ? 2600 : 1700); } }, 0.2, function () { clearInterval(timer); timer = null; });
  }
  function mood() {
    var box = $("[data-cmp]"); if (!box) return;
    var rg = $("[data-cmp-range]", box), depois = $("[data-cmp-depois]", box), rot = $("[data-cmp-rot]", box), bts = $$("[data-look]");
    var mexeu = false, auto = null, k = 0;
    function pos(v) { box.style.setProperty("--p", v + "%"); rg.value = v; }
    rg.addEventListener("input", function () { mexeu = true; box.classList.remove("solta"); pos(+rg.value); para(); });
    function look(i, doUsuario) {
      k = i; var b = bts[i], id = b.getAttribute("data-look");
      bts.forEach(function (x, j) { x.setAttribute("aria-pressed", j === i ? "true" : "false"); });
      var src = RAIZ + "assets/img/mood/" + id + ".webp", im = new Image();
      im.onload = function () { depois.src = src; rot.textContent = "LUT · " + b.textContent.trim(); };
      im.src = src;
      if (doUsuario) { mexeu = true; para(); evento("completa_mood_referencia", { referencia: id }); }
    }
    bts.forEach(function (b, i) { b.addEventListener("click", function () { look(i, true); }); });
    bts.forEach(function (b) { var im = new Image(); im.src = RAIZ + "assets/img/mood/" + b.getAttribute("data-look") + ".webp"; });
    function para() { clearInterval(auto); auto = null; }
    quandoVer(box, function () {
      if (mexeu) return;
      box.classList.add("solta"); pos(84); setTimeout(function () { pos(46); }, 650); setTimeout(function () { box.classList.remove("solta"); }, 1700);
      if (!auto) auto = setInterval(function () { if (mexeu) return para(); look((k + 1) % bts.length, false); }, reduz ? 5200 : 3400);
    }, 0.4, para);
  }
  function kit() {
    var f = $("[data-fluxo]"); if (!f) return;
    var et = $$(".etapa", f), i = 0, auto = null, mexeu = false;
    function abre(j) { i = j; et.forEach(function (e, n) { e.setAttribute("aria-expanded", n === j ? "true" : "false"); }); f.style.setProperty("--prog", (j / (et.length - 1)).toFixed(3)); }
    et.forEach(function (e, n) { e.addEventListener("click", function () { mexeu = true; clearInterval(auto); auto = null; abre(n); }); });
    abre(0);
    quandoVer(f, function () { if (!mexeu && !auto) auto = setInterval(function () { abre((i + 1) % et.length); }, reduz ? 4200 : 2800); }, 0.35, function () { clearInterval(auto); auto = null; });
  }
  function barra() {
    var b = $("[data-barra]"), hero = $(".hero-cta"), alvo = [$("#oferta"), $("#final")]; if (!b || !hero || !("IntersectionObserver" in W)) return;
    var passou = false, perto = { oferta: false, final: false };
    function upd() { var on = passou && !perto.oferta && !perto.final && (estado === "aberta" || estado === "carregando"); b.classList.toggle("on", on); b.setAttribute("aria-hidden", on ? "false" : "true"); var a = $("a", b); if (a) a.tabIndex = on ? 0 : -1; }
    new IntersectionObserver(function (en) { passou = !en[0].isIntersecting && en[0].boundingClientRect.top < 0; upd(); }).observe(hero);
    new IntersectionObserver(function (en) { en.forEach(function (x) { perto[x.target.id] = x.isIntersecting; }); upd(); }, { threshold: 0.12 }).observe(alvo[0]);
    new IntersectionObserver(function (en) { en.forEach(function (x) { perto[x.target.id] = x.isIntersecting; }); upd(); }, { threshold: 0.12 }).observe(alvo[1]);
  }
  function faqEventos() { $$("[data-faq-id]").forEach(function (det) { det.addEventListener("toggle", function () { if (det.open) evento("completa_faq", { pergunta: det.getAttribute("data-faq-id") }); }); }); }

  /* ---------- 9. Painel da prévia (não existe em produção) ---------- */
  function painel() {
    if (!PREVIA) return;
    var combos = PERFIL === 1 ? [["efeitos"], ["assets"], ["luts"]] : PERFIL === 2 ? [["efeitos", "assets"], ["efeitos", "luts"], ["assets", "luts"]] : null;
    var paginas = [], camp;
    for (camp in C.campanhas) for (var n = 0; n < 4; n++) paginas.push([camp, n]);
    var h = '<button type="button" class="pv-btn" aria-expanded="false" aria-controls="pv-p">Prévia · ' + esc(PAGINA) + '</button><div class="pv-p" id="pv-p" hidden>' +
      "<h5>As 8 páginas</h5><div class=\"pv-grid\">" + paginas.map(function (x) {
        var id = C.campanhas[x[0]].prefixo + x[1], atual = id === PAGINA;
        return '<a href="' + RAIZ + C.campanhas[x[0]].slug + "/" + x[1] + '/index.html"' + (atual ? ' aria-current="true"' : "") + ' title="' + id + '">' + (x[0] === "bf" ? "BF " : "Natal ") + x[1] + "</a>";
      }).join("") + "</div>" +
      (combos ? "<h5>O aluno já tem</h5><div class=\"pv-ops\">" + combos.map(function (c) { return '<button type="button" class="op" data-pv-tem="' + c.join(",") + '">' + esc(lista(c.map(function (id) { return P[id].nome; }))) + "</button>"; }).join("") + "</div>" : "") +
      '<h5>Estado da condição</h5><div class="pv-grid" style="grid-template-columns:repeat(2,1fr)">' +
      [["aberta", "Aberta"], ["ultimo-minuto", "Último minuto"], ["fim", "Encerrada"], ["bloqueada", "Sem acesso"]].map(function (o) { return '<button type="button" class="op" data-pv-estado="' + o[0] + '">' + o[1] + "</button>"; }).join("") + "</div>" +
      '<h5>Revisão</h5><div class="pv-ops"><button type="button" class="op" data-pv-pend aria-pressed="false">Ver como o aluno (sem marcações)</button></div>' +
      '<h5>Pendências</h5><ul class="pv-pend">' + (C.pendencias || []).map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" +
      '<h5>Eventos</h5><div class="pv-log" data-pv-log>—</div></div>';
    var box = d.createElement("div"); box.className = "pv"; box.innerHTML = h; d.body.appendChild(box);
    var bt = $(".pv-btn", box), pp = $(".pv-p", box);
    bt.addEventListener("click", function () { var a = pp.hidden; pp.hidden = !a; bt.setAttribute("aria-expanded", a ? "true" : "false"); });
    function marcaOps() {
      $$("[data-pv-tem]", box).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-pv-tem") === (simTem || []).join(",") ? "true" : "false"); });
      $$("[data-pv-estado]", box).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-pv-estado") === (simEstado || "aberta") ? "true" : "false"); });
    }
    $$("[data-pv-tem]", box).forEach(function (b) { b.addEventListener("click", function () { simTem = b.getAttribute("data-pv-tem").split(","); reinicia(); marcaOps(); }); });
    $$("[data-pv-estado]", box).forEach(function (b) { b.addEventListener("click", function () { simEstado = b.getAttribute("data-pv-estado"); if (simEstado === "aberta") simEstado = null; reinicia(); marcaOps(); }); });
    $("[data-pv-pend]", box).addEventListener("click", function () { var on = html.classList.toggle("sem-pend"); this.setAttribute("aria-pressed", on ? "true" : "false"); });
    marcaOps();
  }
  function reinicia() {   // prévia: refaz a "resposta do servidor" com a nova escolha
    FIM = Date.parse(K.fim); INICIO = K.inicio ? Date.parse(K.inicio) : null; bloqueio = null;
    var r = simulado(), t0 = Date.now(); if (r.agora) acertaHora(r.agora, t0, t0); else desvio = 0;
    recebe(r, true);
  }

  /* ---------- 10. Início ---------- */
  function bloqueia(motivo) {
    bloqueio = motivo || "indisponivel";
    var t = "Esta página é da sua conta.", p = "Abra pelo link que você recebeu no app Base FL. Se precisar, eu te ajudo pelo suporte.";
    if (motivo === "perfil_fora" || motivo === "ja_completo") { t = "A sua condição é outra."; p = motivo === "ja_completo" ? "Você já tem todos os itens desta coleção. Obrigado por estar com a Base FL desde o começo." : "Pelo que já está na sua conta, esta página não é a sua condição. Fale com o suporte que eu confiro para você."; }
    if (motivo === "erro") { t = "Não consegui confirmar a sua condição agora."; p = "Atualize a página em instantes. Se continuar, fale com o suporte."; }
    $$("[data-bloq-t]").forEach(function (e) { e.textContent = t; }); $$("[data-bloq-txt]").forEach(function (e) { e.textContent = p; });
    evento("completa_elegibilidade", { elegivel: false, motivo: bloqueio });
    marca();
  }
  function recebe(j, deNovo) {
    if (!j || j.elegivel === false) { D = null; bloqueia(j && j.motivo); return; }
    // o servidor manda a página certa para esta conta; o aluno não escolhe perfil
    if (j.pagina && j.pagina !== PAGINA) {
      var u = String(j.url_pagina || "");
      if (/^\/[^/\\]/.test(u)) { evento("completa_redireciona", { para: j.pagina }); location.replace(u); return; }
      bloqueia("perfil_fora"); return;
    }
    var n = normaliza(j); if (!n) { bloqueia("erro"); return; }
    D = n; bloqueio = null;
    if (n.campanha.encerra_em && !isNaN(Date.parse(n.campanha.encerra_em))) FIM = Date.parse(n.campanha.encerra_em);
    if (n.campanha.inicio && !isNaN(Date.parse(n.campanha.inicio))) INICIO = Date.parse(n.campanha.inicio);
    desenha(n);
    marca();
    if (!deNovo) { evento("completa_elegibilidade", { elegivel: true }); evento("completa_pagina_vista", { fonte_hora: fonteHora }); }
    riscas();
    if (esperando && estado === "aberta") { var a = $('[data-cta="' + esperando + '"]'); esperando = null; msg(""); if (a) a.click(); }
  }
  function init() {
    html.classList.add("js");
    if (!PREVIA) guardaToken(); else lerPrevia();
    faixa(); aparece(); acende(); mood(); kit(); barra(); faqEventos(); painel();
    $$("[data-cta]").forEach(function (a) { a.addEventListener("click", clique); });
    horaDoCabecalho();
    relogio();
    carrega().then(function (j) { recebe(j); }, function () { bloqueia("erro"); });
    W.addEventListener("hashchange", function () { if (PREVIA) { lerPrevia(); reinicia(); } });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})();
