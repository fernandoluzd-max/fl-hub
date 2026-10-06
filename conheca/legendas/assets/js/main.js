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

  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  function evento(nome, extra) { try { var o = { event: nome, produto: "titulos_dinamicos" }; for (var k in (extra || {})) o[k] = extra[k]; (window.dataLayer = window.dataLayer || []).push(o); } catch (e) {} }

  /* ---------- 2. Galeria dos estilos: o editor, agora de tocar ----------
     PARA TROCAR OU ACRESCENTAR UM ESTILO: mexa só nesta lista.
     O arquivo é o mesmo nome em assets/videos/*.mp4 e assets/images/posters/*.jpg.
     O "centro do título" serve para o texto aparecer bem no meio do quadro (um pouco acima do centro, como na área segura de Reels). */
  var ESTILOS = [
    // nome · família (só as três que representam o pack) · arquivo · cor · centro do título dentro do vídeo (x%, y%)
    ["Bold Template",       "Bold Template",          "titulo-bold-template",  "#d9d06a", 49.8, 49.3],
    ["Clássico Fernando",   "Clássicos do Fernando",  "titulo-classico",       "#d8d4cc", 47.2, 49.6],
    ["Duas Linhas",         "Divertidos",             "legenda-duas-linhas",   "#5fe0ea", 50.0, 54.4],
    ["Nome em Destaque",    "Bold Template",          "titulo-nome-vermelho",  "#ff5a4d", 51.0, 49.5]
  ];
  function galeria() {
    var box = $("#gal"), v = $("#galVideo"); if (!box || !v) return;
    var list = $("#galList"), clips = $("#galClips"), tag = $("#galTag"), nome = $("#galNome"), tipo = $("#galTipo"), pp = $("#galPP"), frame = $("#galFrame");
    var nEl = $("#galN"); if (nEl) nEl.textContent = ESTILOS.length;
    var num = function (i) { return (i < 9 ? "0" : "") + (i + 1); };
    list.innerHTML = ESTILOS.map(function (e, i) {
      return '<button type="button" role="tab" id="galT' + i + '" aria-selected="false" aria-controls="galFrame" tabindex="-1" style="--c:' + e[3] + '"><i>' + num(i) + "</i><span><b>" + esc(e[0]) + "</b><small>" + esc(e[1]) + "</small></span></button>";
    }).join("");
    // a faixa de texto da timeline também é controle (no celular é o controle principal)
    clips.innerHTML = ESTILOS.map(function (e, i) { return '<button type="button" class="clip" tabindex="-1" style="--c:' + e[3] + '"><i>' + num(i) + "</i>" + esc(e[0]) + "</button>"; }).join("");
    var tabs = $$("button", list), cl = $$(".clip", clips), cur = -1, auto = true, visivel = false, pausado = false, capas = false;
    function arq(i, capa) { return capa ? "assets/images/posters/" + ESTILOS[i][2] + ".jpg" : "assets/videos/" + ESTILOS[i][2] + ".mp4"; }
    function toca() { if (pausado || !visivel) return; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    function vai(i, dedo) {
      i = (i + ESTILOS.length) % ESTILOS.length;
      if (dedo) { auto = false; pausado = false; box.classList.remove("pausado"); pp.setAttribute("aria-label", "Pausar"); evento("estilo_visto", { estilo: ESTILOS[i][0] }); }
      if (i === cur) { try { v.currentTime = 0; } catch (e) {} toca(); return; }
      cur = i; var e = ESTILOS[i];
      box.style.setProperty("--c", e[3]);
      v.style.setProperty("--cx", (e[4] || 50) + "%"); v.style.setProperty("--cy", (e[5] || 49) + "%");
      tabs.forEach(function (b, k) { var on = k === i; b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1; });
      cl.forEach(function (c, k) { c.classList.toggle("on", k === i); c.style.setProperty("--p", "0%"); });
      tag.textContent = e[1]; nome.textContent = e[0]; tipo.textContent = num(i) + " de " + num(ESTILOS.length - 1);
      frame.classList.remove("troca"); void frame.offsetWidth; frame.classList.add("troca");
      v.poster = arq(i, true); v.src = arq(i); v.load(); toca();
      // no celular a faixa rola sozinha até o estilo escolhido (sem puxar a página)
      var c = cl[i]; if (c && clips.scrollWidth > clips.clientWidth + 4) clips.scrollTo({ left: c.offsetLeft - (clips.clientWidth - c.offsetWidth) / 2, behavior: "smooth" });
    }
    v.addEventListener("timeupdate", function () { if (cl[cur] && v.duration) cl[cur].style.setProperty("--p", Math.min(100, v.currentTime / v.duration * 100) + "%"); });
    // sozinha, a galeria passa de estilo em estilo; depois do primeiro toque, fica no estilo que a pessoa escolheu
    v.addEventListener("ended", function () { if (auto) vai(cur + 1); else { try { v.currentTime = 0; } catch (e) {} toca(); } });
    tabs.forEach(function (b, i) { b.addEventListener("click", function () { vai(i, true); }); });
    cl.forEach(function (c, i) { c.addEventListener("click", function () { vai(i, true); }); });
    list.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
      if (e.key === "Home") { e.preventDefault(); vai(0, true); tabs[0].focus(); return; }
      if (e.key === "End") { e.preventDefault(); vai(ESTILOS.length - 1, true); tabs[cur].focus(); return; }
      if (!d) return; e.preventDefault(); vai(cur + d, true); tabs[cur].focus();
    });
    pp.addEventListener("click", function () { pausado = !pausado; box.classList.toggle("pausado", pausado); pp.setAttribute("aria-label", pausado ? "Tocar" : "Pausar"); if (pausado) v.pause(); else toca(); });
    // nada baixa antes de a galeria chegar perto da tela
    function prepara() { if (capas) return; capas = true; ESTILOS.forEach(function (e, i) { var im = new Image(); im.src = arq(i, true); }); vai(0); }
    if (!("IntersectionObserver" in window)) { visivel = true; prepara(); return; }
    new IntersectionObserver(function (en) { if (en[0].isIntersecting) prepara(); }, { rootMargin: "500px 0px" }).observe(box);
    new IntersectionObserver(function (en) { visivel = en[0].isIntersecting; if (visivel) toca(); else v.pause(); }, { threshold: .25 }).observe(frame);
  }

  /* ---------- 3. Trecho da aula: o endereço vem do config.js. Vazio, fica o quadro "em breve". ---------- */
  function aula() {
    var tela = $("#aulaTela"); if (!tela || !CFG.VIDEO_TRECHO_AULA) return;
    var v = document.createElement("video");
    v.controls = true; v.playsInline = true; v.preload = "none"; v.setAttribute("playsinline", "");
    if (CFG.CAPA_TRECHO_AULA) v.poster = CFG.CAPA_TRECHO_AULA; else v.preload = "metadata";
    v.setAttribute("aria-label", "Trecho da aula de instalação e uso");
    // vídeo em pé (9:16) ou deitado (16:9): o quadro se ajusta ao arquivo
    v.addEventListener("loadedmetadata", function () { if (v.videoWidth && v.videoHeight) tela.style.aspectRatio = v.videoWidth + " / " + v.videoHeight; tela.classList.toggle("em-pe", v.videoHeight > v.videoWidth); });
    v.addEventListener("play", function () { evento("aula_trecho_play"); }, { once: true });
    v.addEventListener("error", function () { tela.classList.remove("tem"); v.remove(); });       // endereço errado: volta o quadro "em breve"
    v.src = CFG.VIDEO_TRECHO_AULA;
    tela.appendChild(v); tela.classList.add("tem");
  }

  /* ---------- 6. Entrada das seções ao rolar ---------- */
  function reveals() {
    $$(".lane-clips li, .flow li, .rota li, .sem-d i").forEach(function (li) {
      li.style.setProperty("--i", Array.prototype.indexOf.call(li.parentNode.children, li));
    });
    $$(".sem-d i").forEach(function (b, k) { b.style.setProperty("--i", k); });       // os blocos da semana entram em fila, de segunda a sexta
    var els = $$(".reveal, .compare, .flow, .laptop");
    if (reduce || !("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -12% 0px", threshold: .12 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- 7. Topo e barra fixa de compra ----------
     A barra só aparece depois que o topo (com o comparador) saiu da tela.
     O botão dela leva para a oferta; depois que a oferta já foi vista, leva direto para o checkout. */
  function chrome() {
    var top = $(".top"), sticky = $("#sticky"), heroEl = $(".hero"), offer = $("#oferta"), fin = $(".sec-final");
    var a = sticky && $("a", sticky), viuOferta = false, state = { offer: false, fin: false };
    function upd() {
      top.classList.toggle("scrolled", window.scrollY > 8);
      if (!sticky) return;
      var ref = heroEl;
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
            viuOferta = true; a.setAttribute("href", checkoutHref()); a.textContent = "Quero o pack";
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

  /* ---------- Sem x com os títulos: comparador de arrastar, dois vídeos em sincronia, no topo da página ---------- */
  function antesDepois() {
    var box = $("#ba"); if (!box || !CFG.VIDEO_SEM_PACK || !CFG.VIDEO_COM_PACK) return;
    box.appendChild(comparador({ antes: CFG.VIDEO_SEM_PACK, depois: CFG.VIDEO_COM_PACK, capaA: CFG.CAPA_SEM_PACK, capaD: CFG.CAPA_COM_PACK, legenda: CFG.LEGENDA_COMPARADOR }));
  }
  function comparador(p) {
    var fig = document.createElement("figure"); fig.className = "cmp";
    var palco = document.createElement("div"); palco.className = "cmp-palco"; palco.style.setProperty("--x", "50%");
    function lado(src, cls, rot, capa) {
      var d = document.createElement("div"); d.className = "cmp-lado " + cls;
      // a capa aparece na hora; o arquivo do vídeo só começa a baixar depois que a página terminou de carregar (ver "carrega")
      var v = document.createElement("video"); v.muted = true; v.loop = true; v.playsInline = true; v.preload = "none"; v.dataset.src = src; if (capa) v.poster = capa;
      v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true"); v.tabIndex = -1; d.appendChild(v); d._v = v;
      var t = document.createElement("span"); t.className = "cmp-tag"; t.textContent = rot; d.appendChild(t);
      return d;
    }
    var a = lado(p.antes, "antes", "Sem", p.capaA), d = lado(p.depois, "depois", "Com os títulos", p.capaD);
    var linha = document.createElement("span"); linha.className = "cmp-linha"; linha.innerHTML = '<i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 6l-5 6 5 6M15 6l5 6-5 6"/></svg></i>';
    // o controle de verdade é um range (teclado e leitor de tela); o arrasto com dedo/mouse mexe nele
    var rng = document.createElement("input"); rng.type = "range"; rng.min = 0; rng.max = 100; rng.value = 50; rng.className = "cmp-rng";
    rng.setAttribute("aria-label", "Arraste para comparar o vídeo sem os títulos e com os títulos");
    var pp = document.createElement("button"); pp.type = "button"; pp.className = "cmp-pp"; pp.setAttribute("aria-label", "Pausar");
    pp.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="pa" d="M8 5v14M16 5v14"/><path class="pl" d="M8 5l11 7-11 7z"/></svg>';
    var som = document.createElement("button"); som.type = "button"; som.className = "cmp-som"; som.setAttribute("aria-pressed", "false");
    som.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path class="on" d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11"/><path class="off" d="M16 9.5l5 5M21 9.5l-5 5"/></svg><span>Ativar som</span>';
    palco.appendChild(a); palco.appendChild(d); palco.appendChild(linha); palco.appendChild(rng); palco.appendChild(pp); palco.appendChild(som);
    fig.appendChild(palco);
    var cap = document.createElement("figcaption"); cap.className = "cmp-cap";
    cap.innerHTML = '<span class="cmp-dica"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l-5 6 5 6M15 6l5 6-5 6"/></svg>O mesmo vídeo · arraste a linha</span>' + (p.legenda ? "<span>" + esc(p.legenda) + "</span>" : "");
    fig.appendChild(cap);

    var mexeu = false;
    function poe(x) { x = Math.max(0, Math.min(100, x)); rng.value = x; palco.style.setProperty("--x", x + "%"); }
    function usou() { if (!mexeu) evento("comparador_arrastado"); mexeu = true; fig.classList.add("usado"); }
    rng.addEventListener("input", function () { usou(); poe(+rng.value); });
    // arrasto direto no palco: vale o toque em qualquer ponto. Na vertical o dedo continua rolando a página (touch-action: pan-y).
    var arr = false;
    function pos(e) { var r = palco.getBoundingClientRect(); poe((e.clientX - r.left) / r.width * 100); }
    function botao(e) { return pp.contains(e.target) || som.contains(e.target); }
    palco.addEventListener("pointerdown", function (e) { if (botao(e)) return; arr = true; usou(); try { palco.setPointerCapture(e.pointerId); } catch (x) {} pos(e); });
    palco.addEventListener("pointermove", function (e) { if (arr) pos(e); });
    ["pointerup", "pointercancel"].forEach(function (n) { palco.addEventListener(n, function () { arr = false; }); });

    var va = a._v, vd = d._v, pausado = false, visto = false, carregado = false, naTela = false;
    function carrega() { if (carregado) return; carregado = true; [va, vd].forEach(function (v) { v.src = v.dataset.src; v.preload = "auto"; v.load(); }); if (naTela) toca(); }
    function toca(f) { if (pausado && !f) return; carrega(); [vd, va].forEach(function (v) { var q = v.play(); if (q && q.catch) q.catch(function () {}); }); }
    function para() { vd.pause(); va.pause(); }
    // o "com" manda; o "sem" acompanha (corrige se desgarrar mais de 2 quadros)
    vd.addEventListener("timeupdate", function () { if (Math.abs(va.currentTime - vd.currentTime) > .08) { try { va.currentTime = vd.currentTime; } catch (e) {} } });
    vd.addEventListener("seeked", function () { try { va.currentTime = vd.currentTime; } catch (e) {} });
    pp.addEventListener("click", function () { pausado = !pausado; fig.classList.toggle("pausado", pausado); pp.setAttribute("aria-label", pausado ? "Tocar" : "Pausar"); if (pausado) para(); else toca(true); });
    // som: o áudio é o do vídeo "com". Ligar o som recomeça do início, para a fala fazer sentido.
    som.addEventListener("click", function () {
      var liga = vd.muted; vd.muted = !liga; if (liga) vd.removeAttribute("muted");
      som.setAttribute("aria-pressed", liga ? "true" : "false"); fig.classList.toggle("com-som", liga); som.lastChild.textContent = liga ? "Som ligado" : "Ativar som";
      if (liga) { evento("comparador_som"); pausado = false; fig.classList.remove("pausado"); pp.setAttribute("aria-label", "Pausar"); carrega(); try { vd.currentTime = 0; va.currentTime = 0; } catch (e) {} toca(true); }
    });
    // o vídeo do topo é a demonstração principal: começa a carregar na hora (a capa já está na tela) e toca sozinho, sem som
    carrega();
    [va, vd].forEach(function (v) { v.addEventListener("canplay", function () { if (naTela && !pausado && v.paused) toca(); }); });
    // alguns celulares (modo de pouca energia, por exemplo) seguram o autoplay: o primeiro toque ou rolagem na página libera
    var solta = function () { if (naTela && !pausado && (vd.paused || va.paused)) toca(); };
    ["touchend", "pointerdown", "scroll", "keydown"].forEach(function (n) { window.addEventListener(n, solta, { passive: true, capture: true }); });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) solta(); });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) {
      naTela = en[en.length - 1].isIntersecting;      // vale a leitura mais recente
      if (naTela) {
        if (carregado) toca();
        // na primeira vez, a linha se mexe sozinha para mostrar que dá para arrastar
        if (!visto) { visto = true; [[900, 30], [1650, 70], [2400, 50]].forEach(function (s) { setTimeout(function () { if (!mexeu) { palco.classList.add("guia"); poe(s[1]); } }, s[0]); }); setTimeout(function () { palco.classList.remove("guia"); }, 3200); }
      } else { para(); if (!vd.muted) som.click(); }       // saiu da tela: para e desliga o som
    }, { threshold: .3 }).observe(palco); else { naTela = true; }
    return fig;
  }

  /* ---------- Quem fez: se os prints não carregarem, não sobra título sem conteúdo ---------- */
  function semPrints() {
    var faixa = $(".sec-prova [data-prova]"); if (!faixa) return;
    function confere() { var tem = $$(".pv-print img", faixa).length > 0; $$("[data-so-com-prints]").forEach(function (e) { e.hidden = !tem; }); faixa.hidden = !tem; return tem; }
    if (confere()) return;
    var n = 0, t = setInterval(function () { if (confere() || ++n > 10) clearInterval(t); }, 500);
  }

  function init() { applyConfig(); semPrints(); antesDepois(); aula(); galeria(); reveals(); chrome(); instalacao(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
