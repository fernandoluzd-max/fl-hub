/* ==========================================================================
   BLACK FRIDAY BASE FL 2026 · EDIÇÃO EXCLUSIVA PARA ALUNOS
   Estados da campanha (pré-lançamento, oferta aberta, encerrada) pela hora real de Brasília,
   contador, botões do grupo, seletor dos 8 estilos, a virada, a vitrine e a medição.
   Configuração: assets/js/config.js (datas, links, preço, catálogo e estilos).
   ========================================================================== */
(function () {
  "use strict";
  var CFG = window.BF || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var html = document.documentElement; html.classList.add("js");
  var params = new URLSearchParams(location.search);
  var PREVIA = CFG.PREVIA === true;
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function fase(p, a, b) { return clamp((p - a) / (b - a)); }
  function suave(t) { return 1 - Math.pow(1 - t, 3); }

  /* ---------- 1. Medição: cliques no botão do grupo (clique ≠ entrada confirmada no WhatsApp), estilos, seções e rolagem ---------- */
  var UTM = (function () {
    var o = {}, tem = false;
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "src"].forEach(function (k) { var v = params.get(k); if (v) { o[k] = v; tem = true; } });
    try { if (tem) sessionStorage.setItem("bf_utm", JSON.stringify(o)); else o = JSON.parse(sessionStorage.getItem("bf_utm") || "{}"); } catch (e) {}
    return o;
  })();
  var estado = "pre";
  function evento(nome, extra) {
    var o = { event: nome, campanha: "black_friday_2026", publico: PUBLICO, estado_campanha: estado }, k;
    for (k in UTM) o[k] = UTM[k];
    for (k in (extra || {})) o[k] = extra[k];
    try { (window.dataLayer = window.dataLayer || []).push(o); } catch (e) {}
    try { if (typeof window.fbq === "function") window.fbq("trackCustom", nome, extra || {}); } catch (e) {}
    if (PREVIA && window.console) console.log("[medição]", nome, o);
  }

  /* ---------- 2. Hora real: cabeçalho "Date" do servidor; o relógio do aparelho é só o plano B ---------- */
  var ABRE = Date.parse(CFG.ABERTURA), FECHA = Date.parse(CFG.ENCERRAMENTO);
  var desvio = 0, fonte = "aparelho";
  if (PREVIA) { var ag = params.get("agora"); if (ag && !isNaN(Date.parse(ag))) { desvio = Date.parse(ag) - Date.now(); fonte = "simulado"; } }
  function agora() { return Date.now() + desvio; }
  function sincroniza() {
    if (fonte === "simulado" || !/^https?:$/.test(location.protocol) || !window.fetch) return;
    var t0 = Date.now();
    fetch(location.pathname + "?hora=" + t0, { method: "HEAD", cache: "no-store" }).then(function (r) {
      var d = Date.parse(r.headers.get("date") || ""); if (isNaN(d)) return;
      var t1 = Date.now(); desvio = d + 500 - (t0 + t1) / 2; fonte = "servidor"; marca();
    }).catch(function () {});
  }

  /* ---------- 3. Estados da campanha ---------- */
  // prévia: ?estado=aberta no site, ou #estado-aberta (a prévia privada só passa o #)
  function lerForcado() { if (!PREVIA) return null; var m = /^#estado-(pre|aberta|encerrada)$/.exec(location.hash); return m ? m[1] : params.get("estado"); }
  var forcado = lerForcado();
  function calcEstado(t) {
    if (forcado === "pre" || forcado === "aberta" || forcado === "encerrada") return forcado;
    return t < ABRE ? "pre" : t < FECHA ? "aberta" : "encerrada";
  }
  var PUBLICO = html.getAttribute("data-publico") === "geral" ? "geral" : "alunos", ALUNOS = PUBLICO === "alunos";
  var OF = null;                                           // a oferta (preço, checkout) do público desta página, só depois que o arquivo sobe
  var TXT = ALUNOS ? {
    pre: { topo: "Revelação 19/11 · 20h", titulo: "Falta pouco para eu revelar tudo.", quando: "Quinta, 19 de novembro, às 20h · horário de Brasília",
           sr: "Revelação da oferta em 19 de novembro de 2026, às 20h, horário de Brasília.", barra: "Revelação em" },
    aberta: { topo: "Vendas abertas até 30/11", titulo: "A sua condição termina em", quando: "Segunda, 30 de novembro, às 23h59 · horário de Brasília",
              sr: "A sua condição vai até 30 de novembro de 2026, às 23h59, horário de Brasília.", barra: "Termina em" },
    encerrada: { topo: "Campanha encerrada", titulo: "A campanha terminou.", quando: "", sr: "A Black Friday Base FL 2026 foi encerrada em 30 de novembro, às 23h59.", barra: "" }
  } : {
    pre: { topo: "Começa 19/11 · 20h", titulo: "A Black Friday começa em", quando: "Quinta, 19 de novembro, às 20h · horário de Brasília",
           sr: "A Black Friday Base FL começa em 19 de novembro de 2026, às 20h, horário de Brasília.", barra: "Começa em" },
    aberta: { topo: "Black Friday · até 30/11", titulo: "A Black Friday termina em", quando: "Segunda, 30 de novembro, às 23h59 · horário de Brasília",
              sr: "A oferta vai até 30 de novembro de 2026, às 23h59, horário de Brasília.", barra: "Termina em" },
    encerrada: { topo: "Black Friday encerrada", titulo: "A Black Friday terminou.", quando: "", sr: "A Black Friday Base FL 2026 foi encerrada em 30 de novembro, às 23h59.", barra: "" }
  };
  function texto(sel, t) { $$(sel).forEach(function (el) { el.textContent = t; }); }
  function precoTxt() { return OF && OF.PRECO ? "R$ " + OF.PRECO : ""; }
  // para onde os botões levam, em cada público e estado
  function destino() {
    if (ALUNOS) {
      if (estado === "aberta" && OF && OF.CHECKOUT_LIBERADO === "api") return { href: "#oferta", tipo: "checkout" };
      if (estado === "encerrada") return { href: "", tipo: "fechado" };
      return { href: "#oferta", tipo: "oferta" };
    }
    if (estado === "pre") return { href: "", tipo: "fechado" };
    if (OF && /^https:\/\//.test(OF.CHECKOUT || "")) return { href: OF.CHECKOUT, tipo: "checkout" };
    return { href: "#oferta", tipo: "oferta" };               // checkout público ainda não configurado
  }
  function aplicaEstado() {
    html.setAttribute("data-estado", estado);
    var T = TXT[estado], d = destino();
    var U = urgencia();
    texto("[data-topo]", estado === "aberta" && ALUNOS ? U.topo : T.topo); texto("[data-ct-titulo]", T.titulo);
    if (estado === "aberta") { var h1 = $(".h-hero .l1"), h2 = $(".h-hero .l2"); if (h1 && h1.innerHTML !== U.h1) h1.innerHTML = U.h1; if (h2) h2.textContent = U.l2; texto("[data-urg-eyebrow]", U.eyebrow); texto("[data-urg-nota]", U.nota); texto("[data-urg-final]", U.final); }
    if (estado === "encerrada") { var e1 = $(".h-hero .l1"), e2 = $(".h-hero .l2"); if (e1) e1.innerHTML = "A Black Friday <em>terminou.</em>"; if (e2) e2.textContent = "Obrigado a todos os alunos que participaram.";
      texto("[data-urg-eyebrow]", "Black Friday Base FL 2026 · encerrada"); texto("[data-hero-sub]", ""); } texto("[data-ct-quando]", T.quando); texto("[data-ct-sr]", T.sr);
    $$("[data-cta]").forEach(function (a) {
      var t = $("[data-cta-txt]", a);
      if (!a._txt) a._txt = t.textContent;
      var rotulo = a._txt;
      // com o checkout liberado, o botão é de compra: texto de compra e ícone de carrinho (não o do WhatsApp)
      var ic = $("use", a); if (ic && !a._ic) a._ic = ic.getAttribute("href");
      if (d.tipo === "checkout") { rotulo = (OF && OF.CTA ? OF.CTA : "Quero garantir agora") + (precoTxt() ? " por " + precoTxt() : ""); if (ic) ic.setAttribute("href", "#i-carrinho"); }
      else if (ic && a._ic) ic.setAttribute("href", a._ic);
      if (d.tipo === "fechado") rotulo = ALUNOS ? "Condição encerrada" : "Abre quinta, 19/11, às 20h";
      t.textContent = rotulo; a.setAttribute("data-tipo", d.tipo);
      if (d.tipo === "fechado") { a.setAttribute("aria-disabled", "true"); a.removeAttribute("href"); }
      else { a.removeAttribute("aria-disabled"); a.href = d.href; }
      if (d.tipo === "grupo") { a.target = "_blank"; a.rel = "noopener"; } else { a.removeAttribute("target"); a.removeAttribute("rel"); }
    });
    $$("[data-cta-nota]").forEach(function (p) {
      if (!p._txt) p._txt = p.textContent;
      var n = p._txt;
      if (estado === "aberta") n = ALUNOS ? urgencia().nota : (OF && OF.PRECO_DE ? "De R$ " + OF.PRECO_DE + " por " + precoTxt() + " · até 30 de novembro." : "Até 30 de novembro, às 23h59.");
      if (!ALUNOS && estado === "pre") n = "A Black Friday abre quinta, 19 de novembro, às 20h.";
      p.textContent = n;
    });
    // preço: só com a oferta aberta e o arquivo da oferta publicado (antes disso ele nem existe no código)
    var pode = estado === "aberta" && !!OF && OF.PRECO_AUTORIZADO === true && String(OF.PRECO || "").trim() !== "";
    $$("[data-preco-caixa],[data-rev-oferta]").forEach(function (cx) { cx.hidden = !pode; });
    if (pode) {
      texto("[data-preco]", String(OF.PRECO).trim()); texto("[data-preco-de]", String(OF.PRECO_DE || "").trim());
      if (OF.ROTULO) texto("[data-preco-rotulo]", OF.ROTULO);
      $$("s.risca").forEach(function (r) { quandoVer(r, function () { r.classList.add("on"); }, .9); });
    }
    if (estado === "aberta") carregaOferta();
  }

  /* ---------- 4. Contador (datas fixas: recarregar a página não reinicia nada) ---------- */
  function marca() {
    var t = agora(), novo = calcEstado(t);
    if (novo !== estado) { var era = estado; estado = novo; aplicaEstado(); if (era) evento("bf_estado", { de: era, para: novo, fonte_hora: fonte }); }
    var alvo = estado === "pre" ? ABRE : FECHA, falta = Math.max(0, alvo - t);
    var v = { d: pad(Math.floor(falta / 864e5)), h: pad(Math.floor(falta % 864e5 / 36e5)), m: pad(Math.floor(falta % 36e5 / 6e4)), s: pad(Math.floor(falta % 6e4 / 1e3)) };
    $$("[data-u]").forEach(function (b) {
      var k = b.getAttribute("data-u"); if (b.textContent === v[k]) return;
      b.textContent = v[k]; b.classList.remove("virou"); void b.offsetWidth; b.classList.add("virou");
    });
    $$("[data-mini]").forEach(function (b) { b.textContent = v[b.getAttribute("data-mini")]; });
    var bt = $("[data-barra-ct]");
    if (bt) bt.innerHTML = estado === "encerrada" ? "" : (!ALUNOS && estado === "aberta" && precoTxt() ? precoTxt() + " · " : "") + TXT[estado].barra + " <b>" + (+v.d ? +v.d + "d " : "") + v.h + "h " + v.m + "min " + v.s + "s</b>";
  }
  function relogio() { marca(); confereDia(); setTimeout(relogio, 1000 - (agora() % 1000) + 8); }

  /* ---------- 5. Botões do grupo ---------- */
  function botoes() {
    $$("[data-cta]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        if (a.getAttribute("aria-disabled") === "true") return;
        if (a.getAttribute("data-tipo") === "oferta") {          // sem checkout ainda: leva até a oferta (com correção, porque a página muda de altura ao rolar)
          var alvo = $("#oferta"); if (alvo) { e.preventDefault(); alvo.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(function () { alvo.scrollIntoView({ behavior: "smooth", block: "center" }); }, 900); }
        }
        if (a.getAttribute("data-tipo") === "checkout") { e.preventDefault(); vaiCheckout(a); }
        evento(a.getAttribute("data-tipo") === "checkout" ? "bf_clique_checkout" : "bf_clique_oferta", { posicao: a.getAttribute("data-cta") });
      });
    });
    var s = $("[data-suporte]"); if (s && CFG.LINK_SUPORTE) s.href = CFG.LINK_SUPORTE;
  }

  /* ---------- 6. Aparecer ao rolar ---------- */
  function aparece() {
    var els = $$(".rv");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }); }, { threshold: .12, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (e) { io.observe(e); });
  }
  function quandoVer(el, fn, limite) {
    if (!el) return;
    if (!("IntersectionObserver" in window)) { fn(); return; }
    var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { fn(); io.disconnect(); } }, { threshold: limite || .3 });
    io.observe(el);
  }

  /* ---------- 7. Os 8 estilos: troca animada, sozinho até a pessoa tocar ---------- */
  function estilos() {
    var box = $("[data-ev]"), E = CFG.ESTILOS || []; if (!box || !E.length) return;
    var lista = $("[data-ev-lista]", box), quadro = $("[data-ev-quadro]", box), nome = $("[data-ev-nome]", box), num = $("[data-ev-num]", box), barra = $("[data-ev-barra]", box);
    var i = 0, timer = null, volta = null, auto = true, visivel = false, tocou = false, camadas = [], vids = {};
    // capa de cada estilo: nome + uma amostra real da legenda (recortada do próprio vídeo), sem a imagem de fundo
    var primeira = $(".ev-capa", quadro);
    E.forEach(function (e, k) {
      var im = k === 0 ? primeira : document.createElement("div");
      if (k) {
        im.className = "ev-capa"; im.setAttribute("aria-hidden", "true");
        im.innerHTML = '<span class="ev-capa-n">Estilo ' + pad(k + 1) + '</span><b class="ev-capa-nome">' + e.nome + '</b>' +
          '<img class="ev-capa-am" src="' + e.img + '" alt="" loading="lazy" decoding="async">';
        quadro.insertBefore(im, quadro.firstChild);
      }
      camadas[k] = im;
      if (e.video) {
        var v = document.createElement("video"); v.className = "ev-vid"; v.muted = true; v.loop = true; v.playsInline = true; v.preload = "none";
        v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true"); if (e.poster) v.poster = e.poster; v._src = e.video;
        v.addEventListener("playing", function () { if (i === k) { v.classList.add("on"); quadro.classList.remove("carrega"); quadro.classList.add("tocando"); } });
        v.addEventListener("error", function () { v._falhou = true; if (i === k) falhou(k); });
        quadro.insertBefore(v, $(".ev-rot", quadro)); vids[k] = v;
      }
      var b = document.createElement("button");
      b.type = "button"; b.className = "ev-t"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", k === 0 ? "true" : "false"); b.tabIndex = k === 0 ? 0 : -1;
      b.setAttribute("aria-label", "Estilo " + (k + 1) + " de " + E.length + ": " + e.nome);
      b.innerHTML = '<i class="ev-t-capa"><img src="' + e.img + '" alt="" loading="lazy" decoding="async"></i><span>' + pad(k + 1) + "</span><small>" + e.nome + "</small>";
      b.addEventListener("click", function () { vai(k, true); });
      lista.appendChild(b);
    });
    var botoesT = $$(".ev-t", lista), abrir = $("[data-ev-abrir]", box);
    // se o vídeo não carregar (rede, bloqueio do navegador ou a prévia privada), oferece abrir o vídeo em outra aba
    function falhou(k) {
      quadro.classList.remove("carrega");
      if (abrir && E[k].video) { abrir.href = E[k].video; abrir.hidden = false; }
    }
    function toca(k) {
      // os vídeos só carregam depois que a pessoa toca num estilo (cada um tem uns 3,6 MB): antes disso, só as prévias
      quadro.classList.remove("carrega", "tocando"); if (abrir) abrir.hidden = true;
      Object.keys(vids).forEach(function (n) {
        var v = vids[n];
        if (+n === k && visivel && tocou && v._falhou) { falhou(k); }
        else if (+n === k && visivel && tocou) {
          if (!v.src) v.src = v._src;
          if (!v.classList.contains("on")) quadro.classList.add("carrega");
          var q = v.play(); if (q && q.catch) q.catch(function () { if (v.error) { v._falhou = true; if (i === +n) falhou(+n); } else quadro.classList.remove("carrega"); });
        } else { v.pause(); v.classList.remove("on"); }
      });
    }
    function vai(k, manual) {
      k = (k + E.length) % E.length; i = k;
      if (manual && !tocou) { tocou = true; box.classList.add("tocou"); }
      camadas.forEach(function (im, n) { im.classList.toggle("on", n === k); });
      toca(k);
      num.textContent = pad(k + 1) + " / " + pad(E.length); nome.textContent = E[k].nome;
      botoesT.forEach(function (b, n) { b.setAttribute("aria-selected", n === k ? "true" : "false"); b.tabIndex = n === k ? 0 : -1; });
      var bt = botoesT[k], alvo = bt.offsetLeft - (lista.clientWidth - bt.offsetWidth) / 2;
      if (lista.scrollWidth > lista.clientWidth) lista.scrollTo({ left: alvo, behavior: "smooth" });
      if (manual) {
        // depois do primeiro toque a pessoa comanda: para a troca automática e passa a mostrar os vídeos
        auto = false; box.classList.add("parado"); clearTimeout(timer); clearTimeout(volta);
        evento("bf_estilo", { estilo: k + 1, nome: E[k].nome, video: !!E[k].video });
      } else agenda();
    }
    function agenda() {
      clearTimeout(timer); if (!auto || !visivel) return;
      var dur = E[i].video ? 7000 : 3600;
      box.style.setProperty("--evdur", dur + "ms"); barra.classList.remove("anda"); void barra.offsetWidth; barra.classList.add("anda");
      timer = setTimeout(function () { vai(i + 1, false); }, dur);
    }
    var bp = $("[data-ev-play]", box); if (bp) bp.addEventListener("click", function () { vai(i, true); });
    $("[data-ev-ant]", box).addEventListener("click", function () { vai(i - 1, true); });
    $("[data-ev-prox]", box).addEventListener("click", function () { vai(i + 1, true); });
    lista.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!d) return;
      e.preventDefault(); vai(i + d, true); botoesT[i].focus();
    });
    var x0 = null;
    quadro.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    quadro.addEventListener("touchend", function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) vai(i + (dx < 0 ? 1 : -1), true); }, { passive: true });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) {
      visivel = en[0].isIntersecting;
      if (visivel) { toca(i); agenda(); } else { clearTimeout(timer); toca(-1); }
    }, { threshold: .35 }).observe(quadro);
    else { visivel = true; agenda(); }
  }

  /* ---------- 7b. As três funções (legendas, cortes, zoom): passa sozinho de uma para outra até a pessoa tocar ---------- */
  function tres() {
    var box = $("[data-tres]"); if (!box) return;
    var abas = $$("[role=tab]", box), paineis = $$(".tres-p", box), v = $(".tres-vid", box), i = 0, timer = null, volta = null, auto = true, visivel = false, DUR = 6500;
    function vai(k, manual) {
      i = (k + 3) % 3;
      box.removeAttribute("data-m"); void box.offsetWidth; box.setAttribute("data-m", i);
      abas.forEach(function (b, n) { b.setAttribute("aria-selected", n === i ? "true" : "false"); b.tabIndex = n === i ? 0 : -1; });
      paineis.forEach(function (p, n) { p.hidden = n !== i; });
      box.style.setProperty("--tdur", DUR + "ms");
      if (manual) { auto = false; box.classList.add("parado"); clearTimeout(timer); clearTimeout(volta); volta = setTimeout(function () { auto = true; box.classList.remove("parado"); agenda(); }, 10000); evento("bf_funcao", { funcao: ["legendas", "cortes", "zoom"][i] }); }
      else agenda();
    }
    function agenda() { clearTimeout(timer); if (auto && visivel) timer = setTimeout(function () { vai(i + 1, false); }, DUR); }
    abas.forEach(function (b, n) { b.addEventListener("click", function () { vai(n, true); }); });
    $(".tres-abas", box).addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!d) return;
      e.preventDefault(); vai(i + d, true); abas[i].focus();
    });
    function toca() { if (!v.src && CFG.VIDEO_COM_PACK) v.src = CFG.VIDEO_COM_PACK; var q = v.play(); if (q && q.catch) q.catch(function () {}); }
    v.addEventListener("playing", function () { box.classList.add("tocando"); });
    vai(0, false);
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) {
      visivel = en[0].isIntersecting;
      if (visivel) { toca(); vai(i, false); } else { clearTimeout(timer); v.pause(); }
    }, { threshold: .3 }).observe(box);
    else { visivel = true; toca(); agenda(); }
  }

  /* ---------- 8. Tempo e objeção: animam quando aparecem ---------- */
  function vivos() {
    quandoVer($("[data-tp]"), function () { $("[data-tp]").classList.add("vivo"); }, .3);
    quandoVer($("[data-obj]"), function () { $("[data-obj]").classList.add("vivo"); }, .45);
  }

  /* ---------- 9. A virada: o Base Captions se afasta e os outros produtos aparecem em volta ---------- */
  function virada() {
    var sec = $("#virada"); if (!sec) return;
    var cena = $(".vir-cena", sec), ul = $("[data-vir-orbita]", sec);
    // peças em segredo: mosaicos sem nome. A quantidade aqui é só visual, não é a quantidade da oferta.
    var PECAS = [1, 4, 7, 2, 9, 5, 3, 8, 6, 4], lis = [], N = 0, pedido = 0, perto = false;
    function monta(html) { ul.innerHTML = html.join(""); lis = $$("li", ul); N = lis.length; if (perto) pede(); else quadro(); }
    monta(PECAS.map(function (n, k) {
      return '<li><button type="button" class="oc" data-oculto aria-label="Item em segredo até 19 de novembro"><img src="/completa/bf-alunos/assets/img/oculto/o' + n + '.webp" alt="" width="192" height="192" loading="lazy" decoding="async"' + (k % 3 === 1 ? ' style="transform:scaleX(-1)"' : "") + "></button></li>";
    }));
    orbitaReal = function (prods) {     // na abertura: as peças viram os produtos de verdade
      monta(prods.map(function (p) { return '<li><span class="oc oc-real"><img src="' + p.icone + '" alt="' + p.nome + '" width="192" height="192" decoding="async"></span></li>'; }));
    };
    sec.classList.add("js");
    function quadro() {
      pedido = 0;
      var r = sec.getBoundingClientRect(), vh = window.innerHeight, total = r.height - vh;
      var p = clamp(-r.top / (total || 1));
      var a = fase(p, .03, .14) * (1 - fase(p, .36, .46));
      var b = fase(p, .24, .64);
      var c = fase(p, .62, .76);
      cena.style.setProperty("--a", a.toFixed(3)); cena.style.setProperty("--b", b.toFixed(3)); cena.style.setProperty("--c", c.toFixed(3));
      var W = cena.clientWidth, H = cena.clientHeight, larga = W >= 760;
      var rx = Math.min(W * (larga ? .36 : .42), 560), ry = Math.min(H * (larga ? .23 : .2), 250), giro = b * .5;
      lis.forEach(function (li, k) {
        var e = suave(clamp((b - k * .045) / (1 - (N - 1) * .045)));
        var ang = (k / N) * Math.PI * 2 - Math.PI / 2 + giro;
        var x = Math.cos(ang) * rx * e, y = Math.sin(ang) * ry * e - H * (larga ? .1 : .06);
        li.style.transform = "translate(-50%,-50%) translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) scale(" + (.35 + .65 * e).toFixed(3) + ")";
        li.style.opacity = e.toFixed(3);
        li.style.pointerEvents = e > .6 ? "auto" : "none";
      });
    }
    function pede() { if (!pedido) pedido = requestAnimationFrame(quadro); }
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) {
      var era = perto; perto = en[0].isIntersecting;
      if (perto && !era) { window.addEventListener("scroll", pede, { passive: true }); pede(); }
      if (!perto && era) window.removeEventListener("scroll", pede);
    }, { rootMargin: "200px 0px" }).observe(sec);
    else window.addEventListener("scroll", pede, { passive: true });
    window.addEventListener("resize", pede);
  }

  /* ---------- 9b. A revelação (abertura, 19/11 às 20h): busca o revelacao.js, que só sobe nesse dia ---------- */
  var orbitaReal = null, revCarregando = false, revFeita = false;
  function arquivo(src, ok, falha) {
    var sc = document.createElement("script"); sc.src = src + "?t=" + Math.floor(agora() / 6e4);
    sc.onload = ok; sc.onerror = function () { sc.remove(); falha(); }; document.head.appendChild(sc);
  }
  function carregaOferta() {
    if (revFeita || revCarregando) return;
    revCarregando = true;
    var falta = 2, erro = false;
    function fim() {
      if (--falta) return; revCarregando = false;
      if (erro || !window.BF_PRODUTOS || !window.BF_OFERTA) { setTimeout(function () { if (estado === "aberta") carregaOferta(); }, 30000); return; }   // ainda não subiu: tenta de novo
      OF = window.BF_OFERTA; elegibilidade(function () { revela(window.BF_PRODUTOS); });
    }
    window.BF_PRODUTOS ? fim() : arquivo("/completa/bf-alunos/assets/oferta/produtos.js", fim, function () { erro = true; fim(); });
    window.BF_OFERTA = window.BF_OFERTA || { ELEGIBILIDADE: { modo: "completa-api" } }; fim();
  }
  /* ---------- 9c. A condição de cada aluno (28/11): vem do servidor, pela mesma regra do app (completa-api) ----------
     O link pessoal (?t=) vira a conta do aluno no servidor. A página nunca confia em preço da URL:
     produtos, valores e checkout são recalculados lá, e o link da Greenn só sai no clique. */
  var API = CFG.API || {}, D = null;                       // D = resposta da elegibilidade
  var IDS = { "base-captions": "captions", "titulos": "titulos", "caseup": "caseup", "chronocut": "chronocut", "efeitos": "efeitos", "luts": "luts", "assets": "assets", "mood": "mood", "kit": "kit" };
  var NOME_POSSE = { "base-captions": "o Base Captions", "titulos": "os Títulos Dinâmicos", "materiais-titulos": "os materiais extras dos Títulos", "caseup": "o CaseUp", "chronocut": "o ChronoCut",
                     "efeitos": "os Efeitos Sonoros", "luts": "os LUTs", "assets": "o Base FL Assets" };
  var NOME_FALTA = { efeitos: "Efeitos Sonoros", luts: "LUTs", assets: "Base FL Assets", mood: "Mood", kit: "Kit Freelancer" };
  var AVISOS = {
    sem_token: "Este link é pessoal. Abra pelo botão da mensagem que você recebeu no WhatsApp ou pelo aplicativo Base FL para ver a sua condição.",
    token_invalido: "Este link é pessoal e não foi reconhecido. Abra pelo botão da mensagem que você recebeu no WhatsApp ou pelo aplicativo Base FL.",
    ja_completo: "Você já tem todos os produtos desta condição. Obrigado por estar com a gente!",
    compra_em_liberacao: "A sua compra já foi aprovada e os produtos estão sendo liberados na sua conta.",
    perfil_fora: "A sua conta já tem parte dos produtos desta condição. Fala com o suporte que a gente te ajuda.",
    sem_base_captions: "Esta condição é para quem já tem o Base Captions na conta. Se você comprou com outro e-mail, fala com o suporte.",
    pagamento_pendente: "Você já tem um pagamento desta condição em aberto (Pix ou boleto). Conclua ele ou fale com o suporte.",
    erro: "Não consegui carregar a sua condição agora. Recarregue a página em alguns segundos."
  };
  var brl = function (v) { v = +v; return (v % 1 ? v.toFixed(2).replace(".", ",") : String(v)); };
  var lista = function (a) { return a.length < 2 ? (a[0] || "") : a.slice(0, -1).join(", ") + " e " + a[a.length - 1]; };
  var esc = function (x) { return String(x).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  // urgência real: acompanha o dia em Brasília (sábado 28: últimos 3 dias · domingo 29: termina amanhã · segunda 30: último dia)
  function diaBR() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(agora())); }
  function urgencia() {
    var dia = diaBR(), L2 = "Uma condição que não é para todo mundo: só para quem já é meu aluno.";
    if (dia === "2026-11-30") return { h1: "Último dia da <em>Black Friday.</em>", l2: "Termina hoje, às 23h59. Só para quem já é meu aluno.",
      topo: "Último dia · até 23h59", eyebrow: "Último dia · a condição termina hoje, às 23h59",
      nota: "Último dia: a condição termina hoje, às 23h59 · horário de Brasília.", final: "É o último dia. A sua condição termina hoje, às 23h59." };
    if (dia === "2026-11-29") return { h1: "Últimos 2 dias da <em>Black Friday.</em>", l2: L2,
      topo: "Últimos 2 dias · até 30/11", eyebrow: "Últimos 2 dias · termina amanhã, 30/11, às 23h59",
      nota: "Últimos 2 dias: termina amanhã, segunda, 30 de novembro, às 23h59 · horário de Brasília.", final: "São os últimos 2 dias. A sua condição termina amanhã, segunda, 30 de novembro, às 23h59." };
    if (dia === "2026-11-28") return { h1: "Últimos 3 dias da <em>Black Friday.</em>", l2: L2,
      topo: "Últimos 3 dias · até 30/11", eyebrow: "Últimos 3 dias · só para alunos da Base FL",
      nota: "Últimos 3 dias: vai até segunda, 30 de novembro, às 23h59 · horário de Brasília.", final: "São os últimos 3 dias. A sua condição vai até segunda, 30 de novembro, às 23h59." };
    return { h1: "Uma condição que <em>não é para todo mundo.</em>", l2: "É para quem já é meu aluno.",
      topo: "Vendas abertas até 30/11", eyebrow: "Exclusivo para quem já é aluno da Base FL",
      nota: "Condição exclusiva para alunos. Vai até segunda, 30 de novembro, às 23h59.", final: "A sua condição vai até segunda, 30 de novembro, às 23h59." };
  }
  // virou o dia em Brasília com a página aberta: troca headline e urgência na hora, sem recarregar
  var diaVisto = null;
  function confereDia() { var d = diaBR(); if (diaVisto !== null && d !== diaVisto) aplicaEstado(); diaVisto = d; }

  // link pessoal: guarda o código na sessão e tira da barra de endereço (não fica em print nem em compartilhamento)
  var token = params.get("t") || "";
  try { if (token) sessionStorage.setItem("completa_t", token); else token = sessionStorage.getItem("completa_t") || ""; } catch (e) {}
  if (params.get("t") && history.replaceState) { params.delete("t"); var q = params.toString(); history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash); }
  var PAGINA = "BF_BASEFL_" + ((/\/([0-3])\/?$/.exec(location.pathname) || [0, "0"])[1]);
  function post(url, corpo, ms) {
    return new Promise(function (ok, falha) {
      var tm = setTimeout(function () { falha(new Error("tempo")); }, ms || 9000);
      fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo), cache: "no-store" })
        .then(function (r) { return r.json().catch(function () { return { motivo: "erro" }; }).then(function (j) { j._status = r.status; return j; }); })
        .then(function (j) { clearTimeout(tm); ok(j); }, function (e) { clearTimeout(tm); falha(e); });
    });
  }
  function avisa(nome) { try { if (API.EVENTO && token && navigator.sendBeacon) { var o = { token: token, pagina: (D && D.pagina) || PAGINA, event: nome }; for (var k in UTM) o[k] = UTM[k]; navigator.sendBeacon(API.EVENTO, new Blob([JSON.stringify(o)], { type: "application/json" })); } } catch (e) {} }

  // prévia local (só com PREVIA: true): ?perfil=0..3 ou ?motivo=sem_token|ja_completo|...
  function simulado() {
    var m = params.get("motivo"); if (m) return { elegivel: false, motivo: m };
    var p = Math.max(0, Math.min(3, +(params.get("perfil") || 0))), tem = ["efeitos", "assets", "luts"].slice(0, p);
    var faltam = ["efeitos", "assets", "luts"].filter(function (x) { return tem.indexOf(x) < 0; }).concat(["mood", "kit"]);
    var REF = { efeitos: 17, assets: 17, luts: 17, mood: 97, kit: 97 }, ref = 0, r = {}; faltam.forEach(function (x) { r[x] = REF[x]; ref += REF[x]; });
    var pr = (14700 - 1700 * p) / 100;
    return { elegivel: true, pagina: "BF_BASEFL_" + p, perfil: p, possui: ["base-captions", "materiais-titulos", "caseup", "chronocut"].concat(params.get("titulos") ? ["titulos"] : [], tem),
      faltam: faltam, valores: { referencia: r, referencia_total: ref, preco: pr, economia: ref - pr, economia_pct: Math.round((ref - pr) / ref * 100) }, oferta_id: "previa-p" + p };
  }
  function elegibilidade(pronto) {
    var fim = function (j) {
      j = j || { motivo: "erro" };
      var v = j.valores || {};
      if (j.elegivel && !(+v.referencia_total > +v.preco && +v.preco > 0)) j = { elegivel: false, motivo: "erro" };   // valores incoerentes: não vende
      D = j;
      if (D.elegivel) { OF.PRECO = brl(v.preco); OF.PRECO_DE = brl(v.referencia_total); OF.PRECO_AUTORIZADO = true; OF.CTA = "Completar a minha Base FL"; OF.CHECKOUT_LIBERADO = "api"; avisa("completa_pagina_vista"); }
      else { OF.PRECO = ""; OF.PRECO_AUTORIZADO = false; OF.CHECKOUT_LIBERADO = ""; }
      evento("bf_elegibilidade", { elegivel: !!D.elegivel, motivo: D.motivo || "", perfil: D.perfil });
      pronto();
    };
    if (PREVIA && (params.get("perfil") != null || params.get("motivo"))) return fim(simulado());
    if (!token) return fim({ elegivel: false, motivo: "sem_token" });
    if (!API.ELEGIBILIDADE) return fim({ elegivel: false, motivo: "erro" });
    post(API.ELEGIBILIDADE, { token: token, pagina: PAGINA }).then(fim, function () { fim({ elegivel: false, motivo: "erro" }); });
  }
  function vaiCheckout(a) {
    if (!D || !D.elegivel || a._indo) return;
    var txt = $("[data-cta-txt]", a), antes = txt.textContent; a._indo = true; txt.textContent = "Abrindo o pagamento…";
    var volta = function (motivo) { a._indo = false; txt.textContent = antes; mostraAviso(motivo); };
    avisa("completa_cta_clique");
    if (PREVIA && params.get("perfil") != null) { setTimeout(function () { volta(""); alert("Prévia: aqui abriria o checkout da Greenn da faixa " + D.perfil + " (R$ " + OF.PRECO + ")."); }, 300); return; }
    var origem = {}; for (var k in UTM) origem[k] = UTM[k];
    post(API.CHECKOUT, { token: token, pagina: D.pagina, oferta_id: D.oferta_id, origem: origem }).then(function (j) {
      if (j && j._status === 409) { location.reload(); return; }                    // a condição mudou (comprou algo agora): recarrega com a nova
      var u = j && j.ok && j.checkout_url;
      try { var x = new URL(u); if (x.protocol !== "https:" || !/(^|\.)greenn\.com\.br$/.test(x.hostname)) u = ""; else { for (var k in UTM) if (!x.searchParams.has(k)) x.searchParams.set(k, UTM[k]); u = x.toString(); } } catch (e) { u = ""; }
      if (u) location.href = u; else volta((j && j.motivo) || "erro");
    }, function () { volta("erro"); });
  }
  function mostraAviso(motivo) {
    var av = $("[data-rev-aviso]"); if (!av) return;
    if (!motivo) { av.hidden = true; return; }
    av.innerHTML = esc(AVISOS[motivo] || AVISOS.erro) + (/perfil_fora|sem_base_captions|pagamento_pendente|token_invalido/.test(motivo) ? ' <a href="' + esc(CFG.LINK_SUPORTE || "https://wa.me/5547996974735") + '" target="_blank" rel="noopener">Falar com o suporte</a>' : "");
    av.hidden = false;
  }
  function midia(m, nome) {
    if (!m) return "";
    if (m.video) return '<video muted loop playsinline preload="none" data-src="' + m.video + '"' + (m.poster ? ' poster="' + m.poster + '"' : "") + ' aria-label="Prévia: ' + nome + '"></video>';
    return '<img data-src="' + m.img + '" alt="Prévia: ' + nome + '" decoding="async">';
  }
  function cartao(p, k, extra) {
    var mos = "/completa/bf-alunos/assets/img/oculto/o" + ((k % 9) + 1) + ".webp", tem = !!(p.mais || p.midia), id = "rv-" + (p.id || k);
    return '<article class="rv-p' + (extra.princ ? " rv-princ" : "") + (tem ? " rv-tem" : "") + '" style="--i:' + k + '">' +
      '<span class="rv-chip' + (extra.seu ? " rv-chip-seu" : "") + '">' + extra.chip + "</span>" +
      '<div class="rv-topo"><span class="rv-ic">' + (extra.princ ? "" : '<img class="rv-mos" src="' + mos + '" alt="">') + '<img class="rv-real" src="' + p.icone + '" alt="" loading="lazy" decoding="async"></span>' +
      '<div class="rv-tx"><b>' + p.nome + "</b><p>" + (extra.serve || p.serve) + "</p></div></div>" +
      (p.beneficio && !extra.princ ? '<p class="rv-ben"><svg aria-hidden="true"><use href="#i-ok"/></svg>' + p.beneficio + "</p>" : "") +
      (tem && !extra.princ ? '<button type="button" class="rv-mais" aria-expanded="false" aria-controls="' + id + '"><span>Ver como funciona</span><i aria-hidden="true">+</i></button>' +
             '<div class="rv-extra" id="' + id + '" hidden>' + (p.midia ? '<div class="rv-midia">' + midia(p.midia, p.nome) + "</div>" : "") + (p.mais ? "<p>" + p.mais + "</p>" : "") + "</div>" : "") +
      "</article>";
  }
  function revela(R) {
    if (revFeita) return; revFeita = true;
    html.classList.add("revelado");
    var P = {}; (R.PRODUTOS || []).forEach(function (p) { P[p.id] = p; });
    var caixa = $("[data-rev-oferta]");
    if (!D || !D.elegivel) {                                            // sem condição para esta conta: nada de preço nem botão de compra
      html.classList.add("sem-condicao");
      texto("[data-rev-titulo]", "A sua condição");
      texto("[data-rev-lead]", "");
      if (caixa) { caixa.hidden = false; caixa.classList.add("so-aviso"); }
      var aviso = AVISOS[D && D.motivo] || AVISOS.erro;
      texto("[data-hero-sub]", aviso);
      mostraAviso((D && D.motivo) || "erro");
      aplicaEstado(); return;
    }
    var possui = D.possui || [], faltam = (D.faltam || []).filter(function (id) { return P[IDS[id]] && NOME_FALTA[id]; });
    var temNomes = ["base-captions", "titulos", "materiais-titulos", "caseup", "chronocut", "efeitos", "assets", "luts"].filter(function (id) { return possui.indexOf(id) > -1; }).map(function (id) { return NOME_POSSE[id]; });
    var faltaNomes = faltam.map(function (id) { return NOME_FALTA[id]; }), V = D.valores;
    texto("[data-hero-sub]", "Você já tem " + lista(temNomes.slice(0, 1).concat(possui.filter(function (x) { return ["efeitos", "luts", "assets"].indexOf(x) > -1; }).map(function (x) { return NOME_POSSE[x]; }))) +
      ". Por isso, a sua condição traz só o que ainda falta para completar a sua Base FL: " + lista(faltaNomes) + ". Com acesso vitalício.");
    texto("[data-rev-titulo]", "Só o que falta.");
    texto("[data-rev-lead]", "Você já tem " + lista(temNomes) + ". Isso fica fora do preço. Na sua condição entram só " + (faltam.length === 2 ? "as duas ferramentas que faltam" : "os " + faltam.length + " produtos que faltam") + ", com acesso vitalício.");
    var g = $("[data-rev-grade]");
    if (g) {
      var ORDEM = ["titulos", "materiais-titulos", "caseup", "chronocut", "efeitos", "assets", "luts"];
      var bonus = ORDEM.filter(function (x) { return possui.indexOf(x) > -1; }).map(function (x) { return NOME_POSSE[x].replace(/^(o|os|a|as) /, ""); });
      var html1 = cartao(P.captions, 0, { princ: true, seu: true, chip: "Já é seu · fora do preço", serve: "Já está na sua conta" + (bonus.length ? ", junto com " + lista(bonus) : "") + ". Nada disso é cobrado de novo." });
      g.innerHTML = html1 + faltam.map(function (id, k) { return cartao(P[IDS[id]], k + 1, { chip: "Entra na sua condição" }); }).join("");
      quandoVer(g, function () { g.classList.add("in"); }, .1);
      g.addEventListener("click", function (e) {
        var b = e.target.closest && e.target.closest(".rv-mais"); if (!b) return;
        var card = b.closest(".rv-p"), ex = $("#" + b.getAttribute("aria-controls")), abre = b.getAttribute("aria-expanded") !== "true";
        b.setAttribute("aria-expanded", abre ? "true" : "false"); $("span", b).textContent = abre ? "Fechar" : "Ver como funciona";
        card.classList.toggle("aberto", abre); ex.hidden = !abre;
        $$("[data-src]", ex).forEach(function (m) { if (!m.src) m.src = m.getAttribute("data-src"); if (m.tagName === "VIDEO") { if (abre) { var q = m.play(); if (q && q.catch) q.catch(function () {}); } else m.pause(); } });
        if (abre) evento("bf_produto", { produto: $("b", card).textContent });
      });
    }
    var an = $("[data-rev-ancora]");
    if (an) an.innerHTML = '<p class="anc-k">Se você comprasse cada um separado</p><ul>' + faltam.map(function (id) {
      return '<li><span>' + NOME_FALTA[id] + '</span><b>R$ ' + brl((V.referencia || {})[id] || 0) + "</b></li>"; }).join("") +
      '<li class="anc-tot"><span>Total separado</span><b>R$ ' + brl(V.referencia_total) + "</b></li></ul>";
    var eco = $("[data-rev-eco]"); if (eco) eco.innerHTML = "Você economiza <b>R$ " + brl(V.economia) + "</b> (" + Math.round(+V.economia_pct) + "%) e não paga de novo pelo que já tem.";
    var li = $("[data-rev-lista]");
    if (li) li.innerHTML = ["Pagamento único, sem mensalidade", "Acesso vitalício a " + (faltam.length === 2 ? "Mood e Kit Freelancer" : "esses " + faltam.length + " produtos"), "As atualizações dessas ferramentas", "O que você já tem continua liberado"]
      .map(function (x) { return '<li><svg aria-hidden="true"><use href="#i-ok"/></svg>' + x + "</li>"; }).join("");
    var orb = faltam.map(function (id) { return P[IDS[id]]; });
    $$(".palco-orbita img").forEach(function (im, k) { var p = orb[k % orb.length]; if (!p) return; im.src = p.icone; im.classList.add("real"); });
    if (orbitaReal && orb.length) orbitaReal(orb);
    $$("[data-oculto]").forEach(function (el) { if (!el.closest("#virada")) el.removeAttribute("data-oculto"); });
    aplicaEstado();
    evento("bf_revelacao", { perfil: D.perfil, produtos: faltam.length });
  }
  function midia(m, nome) {
    if (!m) return "";
    if (m.video) return '<video muted loop playsinline preload="none" data-src="' + m.video + '"' + (m.poster ? ' poster="' + m.poster + '"' : "") + ' aria-label="Prévia: ' + nome + '"></video>';
    return '<img data-src="' + m.img + '" alt="Prévia: ' + nome + '" decoding="async">';
  }

  /* ---------- 10. O segredo: as peças entram em cena, e quem tenta ver leva um "ainda não" ---------- */
  function vitrine() {
    var box = $("[data-vitrine]"); if (box) quandoVer(box, function () { box.classList.add("in"); }, .08);
    var msg = $("[data-segredo-msg]"), n = 0, t = null;
    var FRASES = ["Isso aparece na sua condição.", "Role até a sua condição.", "Está logo abaixo."];
    document.addEventListener("click", function (e) {
      var el = e.target.closest && e.target.closest("[data-oculto]"); if (!el || !msg) return;
      el.classList.remove("espia"); void el.offsetWidth; el.classList.add("espia");
      msg.textContent = FRASES[n % FRASES.length]; n++;
      msg.classList.add("on"); clearTimeout(t); t = setTimeout(function () { msg.classList.remove("on"); }, 2600);
      evento("bf_curiosidade", { tentativa: n, onde: el.closest("#virada") ? "virada" : "surpresa" });
    });
  }

  /* ---------- 11. Carta: as linhas acendem conforme a leitura ---------- */
  function carta() {
    var box = $("[data-carta]"); if (!box) return;
    var linhas = $$(".cl", box), pedido = 0;
    function quadro() { pedido = 0; var lim = window.innerHeight * .68; linhas.forEach(function (l) { l.classList.toggle("lida", l.getBoundingClientRect().top < lim); }); }
    function pede() { if (!pedido) pedido = requestAnimationFrame(quadro); }
    window.addEventListener("scroll", pede, { passive: true }); quadro();
  }

  /* ---------- 12. Barra fixa do celular: aparece depois do topo e some quando outro botão está na tela ---------- */
  function barra() {
    var b = $("[data-barra]"); if (!b || !("IntersectionObserver" in window)) return;
    var vistos = new Set(), passouTopo = false, link = $("a", b);
    function decide() {
      var on = passouTopo && vistos.size === 0 && estado !== "encerrada";
      b.classList.toggle("on", on); b.setAttribute("aria-hidden", on ? "false" : "true"); link.tabIndex = on ? 0 : -1;
    }
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) vistos.add(x.target); else vistos.delete(x.target); }); decide(); }, { threshold: .2 });
    $$("[data-cta]").forEach(function (a) { if (!b.contains(a)) io.observe(a); });
    var topo = $(".hero-cta");
    new IntersectionObserver(function (en) { passouTopo = !en[0].isIntersecting && en[0].boundingClientRect.top < 0; decide(); }).observe(topo);
  }

  /* ---------- 13. Medição de seções e da rolagem ---------- */
  function medicao() {
    evento("bf_pagina", { fonte_hora: fonte });
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { evento("bf_secao", { secao: x.target.getAttribute("data-secao") }); io.unobserve(x.target); } }); }, { threshold: .35 });
      $$("[data-secao]").forEach(function (s) { io.observe(s); });
    }
    var marcos = [25, 50, 75, 100], feitos = {}, pedido = 0;
    function mede() {
      pedido = 0;
      var d = document.documentElement, pct = (window.scrollY + window.innerHeight) / d.scrollHeight * 100;
      marcos.forEach(function (m) { if (!feitos[m] && pct >= m - .5) { feitos[m] = 1; evento("bf_rolagem", { porcento: m }); } });
    }
    window.addEventListener("scroll", function () { if (!pedido) pedido = requestAnimationFrame(mede); }, { passive: true });
  }

  /* ---------- 14. Foto do topo (quando houver) e prévia ---------- */
  function extras() {
    if (CFG.FOTO_HERO) { var f = $(".palco-foto"); f.src = CFG.FOTO_HERO; f.hidden = false; }
    if (!PREVIA) return;
    html.classList.add("previa");
    var fx = $("[data-previa]"); if (!fx) return;
    function monta() {
      var atual = forcado || "";
      fx.innerHTML = "<span style='padding:5px 4px 5px 8px'>PRÉVIA</span>" + [["", "agora"], ["pre", "pré"], ["aberta", "aberta"], ["encerrada", "encerrada"]].map(function (o) {
        return '<a href="#' + (o[0] ? "estado-" + o[0] : "agora") + '"' + (atual === o[0] ? ' aria-current="true"' : "") + ">" + o[1] + "</a>";
      }).join("");
    }
    monta(); fx.hidden = false;
    window.addEventListener("hashchange", function () {
      var novo = lerForcado();
      if (revFeita && novo !== "aberta") { forcado = novo; try { location.reload(); return; } catch (e) {} }
      forcado = novo; marca(); monta();
    });
  }

  /* ---------- Base Captions: demonstração animada, com as telas reais do app ----------
     6 etapas em loop (importar, estilo, cortes, extras, gerar, pronto), igual no celular e no computador.
     Roda sempre, mesmo com "Reduzir movimento" ligado (decisão do produto). Só gasta enquanto está na tela. */
  function demo() {
    var box = $("#bcDemo"); if (!box) return;
    var win = $(".bcd-win", box), v = $(".bcd-cv video", box), cur = $(".bcd-cur", box), file = $(".bcd-file", box);
    var drop = $(".bcd-drop", box), cont = $(".bcd-cont", box), tiles = $$(".bcd-grade li", box), nav = $$(".bcd-nav li", box), passos = $$(".bcd-passos button", box);
    var nome = $(".bcd-nome", box), lLeg = $(".bcd-leg .bcd-row", box), lCor = $(".bcd-cor .bcd-row", box), opc = $$(".bcd-opc li", box), ext = $$(".bcd-ext .bcd-row", box);
    var DUR = [3700, 6200, 4200, 4000, 3600, 3200], NOMES = ["Contraponto", "Dynamic Bold", "Minimal Bold", "Serif Bold"];
    var e = 0, timer = null, subs = [], naTela = false, posto = false, larg = 0;
    function carrega() { if (posto || !CFG.VIDEO_COM_PACK) return; posto = true; v.src = CFG.VIDEO_COM_PACK; v.preload = "auto"; }
    function depois(ms, fn) { subs.push(setTimeout(fn, ms)); }
    function limpa() { subs.forEach(clearTimeout); subs = []; }
    function pos(el, fx, fy) { var a = el.getBoundingClientRect(), b = win.getBoundingClientRect(); return [a.left - b.left + a.width * fx, a.top - b.top + a.height * fy]; }
    function poe(el, xy, rapido) { el.style.transition = rapido ? "none" : ""; el.style.transform = "translate(" + Math.round(xy[0]) + "px," + Math.round(xy[1]) + "px)"; if (rapido) void el.offsetWidth; }
    function mira(el, ms, fn) { depois(ms, function () { poe(cur, pos(el, .5, .55)); }); if (fn) depois(ms + 720, fn); }
    function clica(el, ms, fn) {
      mira(el, ms, function () { box.classList.add("clique"); el.classList.add("apertou"); if (fn) fn(); });
      depois(ms + 980, function () { box.classList.remove("clique"); el.classList.remove("apertou"); });
    }
    function toca() { var q = v.play(); if (q && q.catch) q.catch(function () {}); }
    function liga(el, on) { el.classList.toggle("on", !!on); }
    function mostra(i) { nome.textContent = NOMES[i]; nome.classList.add("on"); }
    function foco(i) { tiles.forEach(function (x, k) { x.classList.toggle("foco", k === i); }); }
    function escolhe(i) { tiles.forEach(function (x, k) { x.classList.toggle("sel", k === i); }); }
    function marca(n) { nav.forEach(function (li, i) { li.classList.toggle("on", i === n); li.classList.toggle("feito", i < n); }); }
    function estado(n) {             // o que as etapas anteriores já deixaram feito
      box.classList.toggle("solto", n >= 1); box.classList.toggle("lido", n >= 1); box.classList.remove("clique", "arrasta");
      liga(lLeg, n >= 2); foco(-1); escolhe(n >= 2 ? 0 : -1);
      if (n >= 2) mostra(0); else nome.classList.remove("on");
      liga(lCor, n >= 3); box.classList.toggle("cortou", n >= 3);
      opc[0].classList.toggle("sel", n < 3); opc[1].classList.toggle("sel", n >= 3);
      ext.forEach(function (x) { liga(x, n >= 4); });
    }
    function vai(n) {
      limpa(); e = n; box.setAttribute("data-s", n + 1); box.style.setProperty("--dur", DUR[n] + "ms");
      passos.forEach(function (b, i) { b.classList.toggle("on", i === n); b.classList.toggle("feito", i < n); if (i === n) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
      marca(n < 4 ? n : n === 4 ? 4 : 5);
      estado(n);
      if (n === 0) {                   // o arquivo entra na janela e é solto na área de envio; a fala acende e continua
        var w = win.getBoundingClientRect().width, ini = [w * .5, 30];
        box.classList.add("arrasta"); poe(file, ini, true); poe(cur, [ini[0] + 64, ini[1] + 20], true);
        depois(300, function () { var a = pos(drop, .5, .5); poe(file, [a[0] - 64, a[1] - 20]); poe(cur, [a[0], a[1]]); });
        depois(1600, function () { box.classList.add("solto"); box.classList.remove("arrasta"); });
        depois(1750, function () { box.classList.add("lido"); });
        clica(cont, 2300);
      }
      if (n === 1) {                   // liga a legenda, passa por dois estilos, escolhe o Contraponto, pausa e continua
        clica($(".tg", lLeg), 100, function () { liga(lLeg, true); });
        mira(tiles[1], 950, function () { foco(1); mostra(1); });
        mira(tiles[3], 1850, function () { foco(3); mostra(3); });
        clica(tiles[0], 2850, function () { foco(0); escolhe(0); mostra(0); });
        depois(4400, function () { foco(-1); });
        clica(cont, 4700);
      }
      if (n === 2) {                   // liga os cortes de silêncio (os silêncios somem da onda) e escolhe o J-Cut
        clica($(".tg", lCor), 100, function () { liga(lCor, true); box.classList.add("cortou"); });
        clica(opc[1], 1500, function () { opc[0].classList.remove("sel"); opc[1].classList.add("sel"); });
        clica(cont, 2850);
      }
      if (n === 3) {                   // zoom dinâmico e efeito sonoro
        clica($(".tg", ext[0]), 100, function () { liga(ext[0], true); });
        clica($(".tg", ext[1]), 1300, function () { liga(ext[1], true); });
        clica(cont, 2600);
      }
      if (n === 4) { carrega(); try { v.currentTime = 0; } catch (x) {} toca(); }
      if (n === 5) { carrega(); toca(); }
      if (n < 4) v.pause();
    }
    function segue() { clearTimeout(timer); if (!naTela) return; timer = setTimeout(function () { vai((e + 1) % 6); segue(); }, DUR[e]); }
    passos.forEach(function (b, i) { b.addEventListener("click", function () { vai(i); segue(); evento("demo_etapa", { etapa: i + 1 }); }); });
    vai(0);
    if (!("IntersectionObserver" in window)) { naTela = true; segue(); return; }
    new IntersectionObserver(function (en) { if (en[0].isIntersecting) carrega(); }, { rootMargin: "500px 0px" }).observe(box);
    new IntersectionObserver(function (en) {
      var antes = naTela; naTela = en[en.length - 1].isIntersecting;
      if (naTela && !antes) { vai(0); segue(); } else if (!naTela) { clearTimeout(timer); limpa(); v.pause(); }
    }, { threshold: .3 }).observe(box);
    document.addEventListener("visibilitychange", function () { if (document.hidden) { clearTimeout(timer); v.pause(); } else if (naTela) { if (e >= 4) toca(); segue(); } });
    // celular: a barra do navegador some e aparece ao rolar e dispara "resize"; só recomeça a etapa se a largura mudou
    larg = window.innerWidth;
    window.addEventListener("resize", function () { if (window.innerWidth === larg) return; larg = window.innerWidth; if (naTela) { vai(e); segue(); } });
    // celular que segura o vídeo (modo de pouca energia): o primeiro toque libera
    ["touchend", "pointerdown"].forEach(function (n) { window.addEventListener(n, function () { if (naTela && e >= 4 && v.paused) toca(); }, { passive: true }); });
  }



  function init() {
    estado = calcEstado(agora());
    aplicaEstado(); relogio(); sincroniza(); setTimeout(medicao, 1600);   // a medição espera a hora do servidor
    setInterval(sincroniza, 5 * 60 * 1000);
    botoes(); aparece(); estilos(); tres(); vivos(); virada(); vitrine(); carta(); barra(); demo(); extras();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
