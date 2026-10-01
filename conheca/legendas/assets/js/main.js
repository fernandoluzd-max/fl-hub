/* ==========================================================================
   Títulos Dinâmicos · scripts da página
   Sem bibliotecas. Animações só com transform/opacity e só quando visíveis.
   ========================================================================== */
(function () {
  "use strict";
  var CFG = window.PACK_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Configuração: preço, quantidade, links, checkout ---------- */
  function checkoutHref() {
    var url = CFG.CHECKOUT_URL || "#";
    if (!/^https?:/i.test(url)) return "#oferta";
    try {
      var u = new URL(url), inc = new URLSearchParams(location.search);
      // origem Base FL: ?de=app quando vem do app; senão "pagina"
      var de = inc.get("de") || "pagina"; inc.delete("de");
      if (CFG.REPASSAR_PARAMETROS) inc.forEach(function (v, k) { if (!u.searchParams.has(k)) u.searchParams.set(k, v); });
      if (!u.searchParams.has("utm_source")) u.searchParams.set("utm_source", "basefl");
      if (!u.searchParams.has("utm_medium")) u.searchParams.set("utm_medium", de);
      if (!u.searchParams.has("utm_campaign")) u.searchParams.set("utm_campaign", "legendas");
      if (!u.searchParams.has("src")) u.searchParams.set("src", "basefl-" + de);
      return u.toString();
    } catch (e) { return url; }
  }
  function applyConfig() {
    var href = checkoutHref();
    $$("[data-checkout]").forEach(function (a) {
      a.setAttribute("href", href);
      a.addEventListener("click", function () {
        try { (window.dataLayer = window.dataLayer || []).push({ event: "cta_checkout", produto: "titulos_dinamicos" }); } catch (e) {}
      });
    });
    if (CFG.PRECO) $$("[data-preco]").forEach(function (el) { el.textContent = CFG.PRECO; });
    if (CFG.QUANTIDADE_DE_PRESETS) $$("[data-qtd]").forEach(function (el) { el.textContent = CFG.QUANTIDADE_DE_PRESETS; });
    var ig = $('[data-link="instagram"]'), sp = $('[data-link="suporte"]');
    if (ig) { if (CFG.LINK_INSTAGRAM && CFG.LINK_INSTAGRAM !== "#") ig.href = CFG.LINK_INSTAGRAM; else ig.remove(); }
    if (sp) { if (CFG.LINK_SUPORTE && CFG.LINK_SUPORTE !== "#") sp.href = CFG.LINK_SUPORTE; else sp.remove(); }
  }

  /* ---------- 2. Motor de títulos animados ---------- */
  var esc = function (s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  function build(el, style, text) {
    el.className = el.className.replace(/\bs-\S+/g, "").replace(/\b(on|out)\b/g, "").trim() + " s-" + style;
    var html = "", wi = 0, k = 0;
    text.split("|").forEach(function (line, l) {
      html += '<span class="ln" style="--l:' + l + '">';
      if (style === "type") {
        Array.prototype.forEach.call(line, function (ch) {
          html += '<span class="c" style="--k:' + (k++) + '">' + (ch === " " ? "&nbsp;" : esc(ch)) + "</span>";
        });
        html += '<span class="caret"></span>';
      } else {
        line.split(" ").forEach(function (w) {
          var cls = "", m = w.match(/^~([a-z])(?:\^([a-z]))?:(.*)$/);
          if (m) { cls = " f-" + m[1] + (m[2] ? " c-" + m[2] : ""); w = m[3]; }
          var hl = /^\*.*\*$/.test(w); w = w.replace(/\*/g, "");
          var inner = style === "fwave" ? Array.prototype.map.call(w, function (ch) { return '<span class="c" style="--k:' + (k++) + '">' + esc(ch) + "</span>"; }).join("") : esc(w);
          html += '<span class="w' + (hl ? " hl" : "") + cls + '" style="--i:' + (wi++) + '"><span class="wi">' + inner + "</span></span> ";
        });
      }
      html += "</span>";
    });
    el.innerHTML = html;
    fit(el);
    el._dur = style === "karaoke" ? wi * 420 + 1400 : style === "fword" ? wi * 230 + 1900 : (style === "type" || style === "fwave") ? k * 55 + 1900 : 2600 + wi * 90;
  }
  // Encaixa o título na largura: se uma palavra não couber, reduz a fonte só daquele título
  function fit(el) {
    el.style.fontSize = "";
    var avail = el.clientWidth; if (!avail) return;
    for (var n = 0; n < 6; n++) {
      var widest = 0;
      $$(".w", el).forEach(function (w) { widest = Math.max(widest, w.offsetWidth); });
      if (widest <= avail * 0.94) break;
      el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * avail * 0.94 / widest) + "px";
    }
  }
  function refit() { $$(".kt").forEach(function (el) { if (el.innerHTML) fit(el); }); }
  if (document.fonts) { if (document.fonts.ready) document.fonts.ready.then(refit); if (document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", refit); }
  window.addEventListener("load", function () { refit(); setTimeout(refit, 1200); });
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(refit, 150); });

  function play(el) {
    el.classList.remove("on", "out");
    void el.offsetWidth;
    el.classList.add("on");
  }
  // Cada card da biblioteca repete a própria animação enquanto está na tela
  function loopCard(el) {
    if (el._t) return;
    var tick = function () {
      el.classList.add("out");
      el._t2 = setTimeout(function () { play(el); el._t = setTimeout(tick, el._dur); }, 380);
    };
    play(el);
    el._t = setTimeout(tick, el._dur);
  }
  function stopCard(el) { clearTimeout(el._t); clearTimeout(el._t2); el._t = null; }

  /* ---------- 3. Hero: editor com painel de títulos e timeline ---------- */
  // Sequência do vídeo do topo (3,3 s por título, na mesma ordem do arquivo hero-titulos.mp4)
  var HERO = ["Bold Template", "Neon", "Itálico Rápido", "Script Rosa", "Nome em Vermelho"], SEG = 3.3;
  function hero() {
    var v = $("#heroVideo"), list = $("#heroList"), clips = $("#heroClips"), head = $("#heroHead"), tag = $("#heroTag");
    if (!v) return;
    list.innerHTML = HERO.map(function (n) { return "<li><i>Aa</i>" + esc(n) + "</li>"; }).join("");
    clips.innerHTML = HERO.map(function (n) { return '<span class="clip">' + esc(n) + "</span>"; }).join("");
    var items = $$("li", list), cl = $$(".clip", clips), cur = -1;
    function mark(i) {
      if (i === cur) return; cur = i;
      tag.textContent = HERO[i];
      items.forEach(function (li, k) { li.classList.toggle("on", k === i); });
      cl.forEach(function (c, k) { c.classList.toggle("on", k === i); });
      var c = cl[i]; if (c) head.style.left = (c.offsetLeft + 14 + c.offsetWidth * 0.5) + "px";
    }
    mark(0);
    v.addEventListener("timeupdate", function () { mark(Math.min(HERO.length - 1, Math.floor(v.currentTime / SEG))); });
    if (reduce) return;
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause();
    }, { threshold: .2 }).observe($(".stage"));
  }

  /* ---------- 4. Biblioteca: mídias reais, filtros e "ver mais" ---------- */
  function library() {
    var lib = $("#lib"); if (!lib) return;
    var cards = $$(".preset", lib);
    cards.forEach(function (card, i) {
      var media = $(".preset-media", card), v = card.dataset.video, g = card.dataset.gif, im = card.dataset.img;
      var kt = $(".kt", card);
      if (v) {
        var vid = document.createElement("video");
        vid.muted = true; vid.loop = true; vid.playsInline = true; vid.preload = "none"; if (card.dataset.poster) vid.poster = card.dataset.poster;
        vid.setAttribute("aria-label", ($(".preset-name", card) || {}).textContent || "Prévia do preset");
        var src = document.createElement("source"); src.src = v; src.type = /\.webm$/i.test(v) ? "video/webm" : "video/mp4";
        vid.appendChild(src); media.appendChild(vid); if (kt) kt.remove(); card._video = vid;
      } else if (g || im) {
        var img = document.createElement("img"); img.className = "media"; img.loading = "lazy"; img.decoding = "async";
        img.src = g || im; img.alt = "Prévia do estilo " + (($(".preset-name", card) || {}).textContent || "");
        media.appendChild(img); if (kt) kt.remove();
      } else if (kt) {
        build(kt, kt.dataset.style, kt.dataset.text);
      }
      if (i >= 6) card.classList.add("extra");
    });
    lib.classList.add("collapsed");
    // anima só o que está na tela
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        var card = e.target, kt = $(".kt", card);
        if (card._video) { if (e.isIntersecting) card._video.play().catch(function () {}); else card._video.pause(); return; }
        if (!kt) return;
        if (reduce) { kt.classList.add("on"); return; }
        if (e.isIntersecting) loopCard(kt); else stopCard(kt);
      });
    }, { threshold: .35 });
    cards.forEach(function (c) { io.observe(c); });

    var more = $("#libMore");
    if (more) more.addEventListener("click", function () {
      var open = lib.classList.toggle("collapsed");
      more.textContent = open ? "Ver mais estilos" : "Ver menos";
    });
    $$(".tabs button").forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".tabs button").forEach(function (x) { x.setAttribute("aria-selected", x === b ? "true" : "false"); });
        var f = b.dataset.filter;
        cards.forEach(function (c) { c.hidden = !(f === "all" || c.dataset.cat === f); });
        // filtrado: mostra todos os daquela categoria
        if (f !== "all") lib.classList.remove("collapsed");
        if (more) more.parentNode.style.display = f === "all" ? "" : "none";
      });
    });
  }

  /* ---------- 5. Calculadora de tempo (números do próprio visitante) ---------- */
  function calc() {
    var iV = $("#iV"), iT = $("#iT"), iM = $("#iM"); if (!iV) return;
    function fill(r) { r.style.setProperty("--p", ((r.value - r.min) / (r.max - r.min) * 100) + "%"); }
    function upd() {
      var v = +iV.value, t = +iT.value, m = +iM.value;
      $("#oV").textContent = v; $("#oT").textContent = t; $("#oM").textContent = m;
      var titulos = Math.round(v * t * 52 / 12), min = titulos * m, h = Math.floor(min / 60), r = min % 60;
      $("#oH").textContent = h ? h + "h" + (r ? String(r).padStart(2, "0") : "") : r + " min";
      $("#oN").textContent = "São cerca de " + titulos + " títulos criados do zero.";
      [iV, iT, iM].forEach(fill);
    }
    [iV, iT, iM].forEach(function (r) { r.addEventListener("input", upd); });
    upd();
  }

  /* ---------- 6. Entrada das seções ao rolar ---------- */
  function reveals() {
    $$(".chores li, .lane-clips li, .flow li").forEach(function (li) {
      li.style.setProperty("--i", Array.prototype.indexOf.call(li.parentNode.children, li));
    });
    var els = $$(".reveal, .chores, .compare, .flow, .laptop");
    if (reduce || !("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -12% 0px", threshold: .12 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- 7. Topo e barra fixa de compra ---------- */
  function chrome() {
    var top = $(".top"), sticky = $("#sticky"), heroEl = $(".hero"), offer = $("#oferta"), fin = $(".sec-final");
    window.addEventListener("scroll", function () { top.classList.toggle("scrolled", window.scrollY > 8); }, { passive: true });
    if (!sticky || !("IntersectionObserver" in window)) return;
    var state = { hero: true, offer: false, fin: false };
    function upd() {
      var show = !state.hero && !state.offer && !state.fin;
      sticky.classList.toggle("show", show);
      sticky.setAttribute("aria-hidden", show ? "false" : "true");
      var a = $("a", sticky); if (a) a.tabIndex = show ? 0 : -1;
    }
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (e.target === heroEl) state.hero = e.isIntersecting;
        else if (e.target === offer) state.offer = e.isIntersecting;
        else state.fin = e.isIntersecting;
      });
      upd();
    }, { threshold: 0 });
    [heroEl, offer, fin].forEach(function (el) { if (el) io.observe(el); });
  }

  /* ---------- Instalação: app Base FL instala e os títulos aparecem no CapCut ---------- */
  function instalacao() {
    var box = $("#inst"); if (!box) return;
    var app = $("#instApp"), cc = $("#instCC"), cur = $("#instCur"), tag = $("#instTag");
    var PASTAS = ["FL Títulos", "FL Ganchos", "FL Legendas"];
    var TILES = ["Bold", "Neon", "Itálico", "Script", "Clássico", "Riscado"];
    var wait = function (ms) { return new Promise(function (r) { setTimeout(r, reduce ? Math.min(ms, 80) : ms); }); };
    var visible = true;
    if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: .15 }).observe(box);
    function log(t, ok) { var d = document.createElement("div"); d.className = ok ? "ok" : "run"; d.innerHTML = "<i>" + (ok ? "✓" : "◌") + "</i><span></span>"; d.lastChild.textContent = t;
      $$("#instLog .run").forEach(function (x) { x.className = "ok"; x.firstChild.textContent = "✓"; }); $("#instLog").appendChild(d); }
    function goTo(el) { var a = el.getBoundingClientRect(), b = box.getBoundingClientRect(); cur.style.left = (a.left - b.left + a.width * .6) + "px"; cur.style.top = (a.top - b.top + a.height * .55) + "px"; }
    async function loop() {
      while (true) {
        while (!visible) await new Promise(function (r) { setTimeout(r, 300); });
        // reset
        cc.classList.remove("on"); app.classList.remove("off"); tag.textContent = "App Base FL";
        $("#instLog").innerHTML = ""; $("#instCard").classList.remove("on");
        $("#instMeta").textContent = "Liberado · não instalado"; $("#instTxt").textContent = "Instalar";
        var fill = $("#instFill"); fill.style.transition = "none"; fill.style.width = "0";
        cur.style.opacity = 1; cur.style.left = "82%"; cur.style.top = "88%";
        await wait(900); goTo($("#instBtn")); await wait(800);
        cur.classList.add("clk"); await wait(260); cur.classList.remove("clk");
        $("#instTxt").textContent = "Instalando…"; log("Baixando Legendas");
        void fill.offsetWidth; fill.style.transition = "width 2s linear"; fill.style.width = "100%";
        await wait(950); log("Colocando os títulos no CapCut");
        await wait(1150); log("Legendas instalado. Abra o CapCut.", true);
        $("#instCard").classList.add("on"); $("#instMeta").textContent = "Instalado · v1.0.0"; $("#instTxt").textContent = "Instalado ✓";
        await wait(1300);
        // troca para o CapCut
        cur.style.opacity = 0; app.classList.add("off"); cc.classList.add("on"); tag.textContent = "CapCut Desktop";
        $("#instPastas").innerHTML = PASTAS.map(function (p) { return '<div class="cc-p"><i></i>' + p + "</div>"; }).join("");
        $("#instTiles").innerHTML = TILES.map(function (t) { return '<div class="cc-t"><b>Aa</b><span>' + t + "</span></div>"; }).join("");
        var ps = $$("#instPastas .cc-p"), ts = $$("#instTiles .cc-t");
        for (var i = 0; i < ps.length; i++) { await wait(260); ps[i].classList.add("on"); }
        ps[0].classList.add("sel");
        for (var j = 0; j < ts.length; j++) { await wait(110); ts[j].classList.add("on"); }
        await wait(700); ts[1].classList.add("pick");
        await wait(2600);
        if (reduce) return;
      }
    }
    loop();
  }

  function init() { applyConfig(); hero(); library(); calc(); reveals(); chrome(); instalacao(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
