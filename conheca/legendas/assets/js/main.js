/* ==========================================================================
   Títulos Dinâmicos · scripts da página
   Sem bibliotecas. Animações só com transform/opacity e só quando visíveis.
   ========================================================================== */
(function () {
  "use strict";
  var CFG = window.PACK_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = false;   // decisão do produto: as demonstrações sempre rodam, no ritmo normal (antes ficavam paradas com "Reduzir movimento" ligado)

  /* ---------- 1. Configuração: preço, quantidade, links, checkout ---------- */
  function checkoutHref() {
    var url = CFG.CHECKOUT_URL || "#";
    if (!/^https?:/i.test(url)) return "#oferta";
    try {
      var u = new URL(url), inc = new URLSearchParams(location.search);
      // origem Base FL: ?de=app quando vem do app; senão "pagina"
      var de = inc.get("de") || "pagina"; inc.delete("de"); inc.delete("previa");      // "previa" é só da página: não vai para o checkout
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
    if (CFG.QUANTIDADE_EXATA) $$("[data-mais]").forEach(function (el) { el.remove(); });      // número exato: sai o "mais de" / "+"
    var gar = $("#garantia");
    if (gar && CFG.GARANTIA_DIAS) { $$("[data-garantia]").forEach(function (el) { el.textContent = CFG.GARANTIA_DIAS; }); gar.hidden = false; }
    else if (gar) gar.hidden = true;
    if (!CFG.GARANTIA_DIAS) $$("details").forEach(function (d) { if ($("[data-garantia]", d)) d.remove(); });       // sem prazo configurado, a pergunta da garantia sai
    var cr = $("#credencial");
    if (cr && CFG.CREDENCIAL_FERNANDO) { cr.textContent = CFG.CREDENCIAL_FERNANDO; cr.hidden = false; }
    var fx = $("#faqExtra");
    if (fx) (CFG.FAQ_EXTRA || []).forEach(function (q) {
      if (!q || !q.p || !q.r) return;
      var d = document.createElement("details"), sm = document.createElement("summary"), p = document.createElement("p");
      sm.textContent = q.p; p.textContent = q.r; d.appendChild(sm); d.appendChild(p); (q.segunda && $("#faqSegunda") || fx).appendChild(d);
    });
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
    });
    // mostra 12 por vez; o botão carrega os próximos (os vídeos só tocam quando aparecem)
    var POR = 12, vistos = POR, filtro = "all", more = $("#libMore"), nEl = $("#libN");
    if (nEl) nEl.textContent = cards.length;
    // contagem em cada filtro ("Títulos · 6")
    var completa = !!CFG.QUANTIDADE_EXATA && cards.length === +CFG.QUANTIDADE_DE_PRESETS;      // só conta quando a galeria tem o pack inteiro
    var hLib = $("#h-lib"); if (completa && hLib) hLib.textContent = "Os " + cards.length + " estilos do pack, em movimento.";
    $$(".tabs button").forEach(function (b) { var i = $("[data-n]", b); if (!i) return; if (!completa) { i.remove(); return; } var f = b.dataset.filter;
      i.textContent = " · " + cards.filter(function (c) { return f === "all" || c.dataset.cat === f; }).length; });
    function pinta() {
      var n = 0;
      cards.forEach(function (c) { var ok = filtro === "all" || c.dataset.cat === filtro; if (ok) n++; c.hidden = !ok || (filtro === "all" && n > vistos); });
      if (more) more.parentNode.style.display = filtro === "all" && cards.length > vistos ? "" : "none";
    }
    pinta();
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

    if (more) more.addEventListener("click", function () { vistos += POR; pinta(); });
    $$(".tabs button").forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".tabs button").forEach(function (x) { x.setAttribute("aria-selected", x === b ? "true" : "false"); });
        filtro = b.dataset.filter; pinta();
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
      var txt = h ? h + "h" + (r ? String(r).padStart(2, "0") : "") : r + " min";
      $("#oH").textContent = txt;
      // na oferta, o número vai arredondado: meia hora mais próxima; abaixo de 1h, de 10 em 10 minutos
      var eco = $("#calcEco");
      if (eco && mexeu) {
        var red;
        if (min < 60) { red = Math.max(10, Math.round(min / 10) * 10); red = red >= 60 ? "1h" : red + " min"; }
        else { var meias = Math.round(min / 30); red = Math.floor(meias / 2) + "h" + (meias % 2 ? "30" : ""); }
        $("#calcEcoH").textContent = red; eco.hidden = false;
      }
      $("#oN").textContent = "São cerca de " + titulos + " títulos criados do zero.";
      [iV, iT, iM].forEach(fill);
    }
    var mexeu = false;
    [iV, iT, iM].forEach(function (r) { r.addEventListener("input", function () { mexeu = true; upd(); }); });
    upd();
  }

  /* ---------- 6. Entrada das seções ao rolar ---------- */
  function reveals() {
    $$(".lane-clips li, .flow li").forEach(function (li) {
      li.style.setProperty("--i", Array.prototype.indexOf.call(li.parentNode.children, li));
    });
    var els = $$(".reveal, .compare, .flow, .laptop");
    if (reduce || !("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -12% 0px", threshold: .12 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- 7. Topo e barra fixa de compra ----------
     A barra só aparece depois que o comparador saiu da tela (ou o topo, se o comparador ainda não tem vídeo).
     O botão dela leva para a oferta; depois que a oferta já foi vista, leva direto para o checkout. */
  function chrome() {
    var top = $(".top"), sticky = $("#sticky"), heroEl = $(".hero"), cmp = $("#comparar"), offer = $("#oferta"), fin = $(".sec-final");
    var a = sticky && $("a", sticky), viuOferta = false, state = { offer: false, fin: false };
    function upd() {
      top.classList.toggle("scrolled", window.scrollY > 8);
      if (!sticky) return;
      var ref = cmp && !cmp.hidden ? cmp : heroEl;
      var show = ref.getBoundingClientRect().bottom < 0 && !state.offer && !state.fin;
      sticky.classList.toggle("show", show);
      sticky.setAttribute("aria-hidden", show ? "false" : "true");
      if (a) a.tabIndex = show ? 0 : -1;
    }
    window.addEventListener("scroll", upd, { passive: true });
    if (!sticky || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (e.target === offer) {
          state.offer = e.isIntersecting;
          if (e.isIntersecting && !viuOferta && a) {
            viuOferta = true; a.setAttribute("href", checkoutHref()); a.textContent = "Liberar o pack";
            a.addEventListener("click", function () { try { (window.dataLayer = window.dataLayer || []).push({ event: "cta_checkout", produto: "titulos_dinamicos", origem: "barra" }); } catch (x) {} });
          }
        } else state.fin = e.isIntersecting;
      });
      upd();
    }, { threshold: 0 });
    [offer, fin].forEach(function (el) { if (el) io.observe(el); });
    upd();
  }

  /* ---------- Instalação: app Base FL instala e os títulos aparecem no CapCut ---------- */
  function instalacao() {
    var box = $("#inst"); if (!box) return;
    var app = $("#instApp"), cc = $("#instCC"), cur = $("#instCur"), tag = $("#instTag");
    var PASTAS = ["Títulos - Ganchos", "Bold - Presets", "Clássico", "Divertido"];      // nomes reais das pastas do pack
    var TILES = ["Bold", "Neon", "Itálico", "Script", "Clássico", "Riscado"];
    var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };   // a espera é sempre a real: com "Reduzir movimento" a demonstração roda uma vez, no ritmo normal, e para
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
        $("#instTxt").textContent = "Instalando…"; log("Instalando Títulos Dinâmicos");
        void fill.offsetWidth; fill.style.transition = "width 2s linear"; fill.style.width = "100%";
        await wait(950); log("Colocando os títulos no CapCut");
        await wait(1150); log("Tudo instalado. Abra o CapCut.", true);
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

  /* ---------- Antes e depois: comparador de arrastar com dois vídeos em sincronia ---------- */
  function existe(url) {
    return fetch(url, { method: "HEAD" }).then(function (r) {
      return r.ok && !/text\/html/i.test(r.headers.get("content-type") || "");
    }).catch(function () { return false; });
  }
  function antesDepois() {
    var sec = $("#comparar"), box = $("#ba"), ver = $("[data-ver]");
    if (ver) ver.setAttribute("href", "#biblioteca");          // até confirmar que há vídeo
    if (!sec || !box || !CFG.VIDEO_SEM_PACK || !CFG.VIDEO_COM_PACK) return;
    var previa = /[?&]previa=1/.test(location.search);
    var p = { antes: CFG.VIDEO_SEM_PACK, depois: CFG.VIDEO_COM_PACK, capaA: CFG.CAPA_SEM_PACK, capaD: CFG.CAPA_COM_PACK, legenda: CFG.LEGENDA_COMPARADOR };
    Promise.all([existe(p.antes), existe(p.depois), p.capaA ? existe(p.capaA) : false, p.capaD ? existe(p.capaD) : false]).then(function (ok) {
      p.ok = ok[0] && ok[1]; if (!ok[2]) p.capaA = ""; if (!ok[3]) p.capaD = "";
      if (!p.ok && !previa) return;
      box.appendChild(comparador(p));
      sec.hidden = false; if (ver) ver.setAttribute("href", "#comparar");
    });
  }
  function comparador(p) {
    var fig = document.createElement("figure"); fig.className = "cmp";
    var palco = document.createElement("div"); palco.className = "cmp-palco"; palco.style.setProperty("--x", "50%");
    function lado(src, cls, rot, marca, capa) {
      var d = document.createElement("div"); d.className = "cmp-lado " + cls;
      if (p.ok) {
        // o arquivo só começa a baixar quando a seção chega perto da tela (ver "carrega" abaixo)
        var v = document.createElement("video"); v.muted = true; v.loop = true; v.playsInline = true; v.preload = "none"; v.dataset.src = src; if (capa) v.poster = capa;
        v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
        v.setAttribute("aria-hidden", "true"); v.tabIndex = -1; d.appendChild(v); d._v = v;
      } else { d.classList.add("vazio"); d.innerHTML = "<code>" + marca + "</code>"; }
      var t = document.createElement("span"); t.className = "cmp-tag"; t.textContent = rot; d.appendChild(t);
      return d;
    }
    var a = lado(p.antes, "antes", "Sem o pack", "sem-pack.mp4", p.capaA), d = lado(p.depois, "depois", "Com o pack", "com-pack.mp4", p.capaD);
    var linha = document.createElement("span"); linha.className = "cmp-linha"; linha.innerHTML = '<i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 6l-5 6 5 6M15 6l5 6-5 6"/></svg></i>';
    // o controle de verdade é um range (teclado e leitor de tela); o arrasto com dedo/mouse mexe nele
    var rng = document.createElement("input"); rng.type = "range"; rng.min = 0; rng.max = 100; rng.value = 50; rng.className = "cmp-rng";
    rng.setAttribute("aria-label", "Arraste para comparar o vídeo sem o pack e com o pack");
    var pp = document.createElement("button"); pp.type = "button"; pp.className = "cmp-pp"; pp.setAttribute("aria-label", "Pausar");
    pp.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="pa" d="M8 5v14M16 5v14"/><path class="pl" d="M8 5l11 7-11 7z"/></svg>';
    palco.appendChild(a); palco.appendChild(d); palco.appendChild(linha); palco.appendChild(rng); palco.appendChild(pp);
    fig.appendChild(palco);
    var cap = document.createElement("figcaption"); cap.className = "cmp-cap";
    cap.innerHTML = '<span class="cmp-dica"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l-5 6 5 6M15 6l5 6-5 6"/></svg>Arraste a linha</span>' + (p.legenda ? "<span>" + esc(p.legenda) + "</span>" : "");
    fig.appendChild(cap);

    var mexeu = false;
    function poe(x) { x = Math.max(0, Math.min(100, x)); rng.value = x; palco.style.setProperty("--x", x + "%"); }
    rng.addEventListener("input", function () { mexeu = true; fig.classList.add("usado"); poe(+rng.value); });
    // arrasto direto no palco (o range por cima cuida do toque; isto cobre o clique em qualquer ponto)
    var arr = false;
    function pos(e) { var r = palco.getBoundingClientRect(); poe((e.clientX - r.left) / r.width * 100); }
    palco.addEventListener("pointerdown", function (e) { if (e.target === pp || pp.contains(e.target)) return; arr = true; mexeu = true; fig.classList.add("usado"); try { palco.setPointerCapture(e.pointerId); } catch (x) {} pos(e); });
    palco.addEventListener("pointermove", function (e) { if (arr) pos(e); });
    ["pointerup", "pointercancel"].forEach(function (n) { palco.addEventListener(n, function () { arr = false; }); });

    var va = a._v, vd = d._v, pausado = false, visto = false, carregado = false;
    function carrega() { if (carregado || !va) return; carregado = true; [va, vd].forEach(function (v) { v.src = v.dataset.src; v.preload = "auto"; v.load(); }); }
    if (va && "IntersectionObserver" in window) { var pre = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { carrega(); pre.disconnect(); } }, { rootMargin: "700px 0px" }); pre.observe(palco); } else carrega();
    function toca(f) { if (!va || pausado || (reduce && !f)) return; carrega(); [vd, va].forEach(function (v) { var q = v.play(); if (q && q.catch) q.catch(function () {}); }); }
    function para() { if (va) { vd.pause(); va.pause(); } }
    if (va) {
      // o "depois" manda; o "antes" acompanha (corrige se desgarrar mais de 2 quadros)
      vd.addEventListener("timeupdate", function () { if (Math.abs(va.currentTime - vd.currentTime) > .08) { try { va.currentTime = vd.currentTime; } catch (e) {} } });
      vd.addEventListener("seeked", function () { try { va.currentTime = vd.currentTime; } catch (e) {} });
      pp.addEventListener("click", function () { pausado = !pausado; fig.classList.toggle("pausado", pausado); pp.setAttribute("aria-label", pausado ? "Tocar" : "Pausar"); if (pausado) para(); else toca(true); });
      if (reduce) { pausado = true; fig.classList.add("pausado"); pp.setAttribute("aria-label", "Tocar"); }
    } else pp.hidden = true;
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) {
        toca();
        // na primeira vez, a linha se mexe sozinha para mostrar que dá para arrastar
        if (!visto && !reduce) { visto = true; var passos = [[400, 32], [1100, 68], [1800, 50]]; passos.forEach(function (s) { setTimeout(function () { if (!mexeu) { palco.classList.add("guia"); poe(s[1]); } }, s[0]); }); setTimeout(function () { palco.classList.remove("guia"); }, 2600); }
      } else para();
    }, { threshold: .45 }).observe(palco);
    return fig;
  }

  /* ---------- Quem fez: se os prints não carregarem, não sobra título sem conteúdo ---------- */
  function semPrints() {
    var faixa = $(".sec-prova [data-prova]"); if (!faixa) return;
    function confere() { var tem = $$(".pv-print img", faixa).length > 0; $$("[data-so-com-prints]").forEach(function (e) { e.hidden = !tem; }); faixa.hidden = !tem; return tem; }
    if (confere()) return;
    var n = 0, t = setInterval(function () { if (confere() || ++n > 10) clearInterval(t); }, 500);
  }

  function init() { applyConfig(); semPrints(); hero(); antesDepois(); library(); calc(); reveals(); chrome(); instalacao(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
