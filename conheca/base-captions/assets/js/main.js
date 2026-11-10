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
      if (!u.searchParams.has("utm_campaign")) u.searchParams.set("utm_campaign", "base-captions");
      if (!u.searchParams.has("src")) u.searchParams.set("src", "basefl-" + de);
      return u.toString();
    } catch (e) { return url; }
  }
  function applyConfig() {
    var href = checkoutHref();
    $$("[data-checkout]").forEach(function (a) {
      if (/^https?:/i.test(href)) { a.setAttribute("data-destino", href); a.setAttribute("href", "#oferta"); } else a.setAttribute("href", href);
      a.addEventListener("click", function () {
        try { (window.dataLayer = window.dataLayer || []).push({ event: "cta_checkout", produto: "base_captions" }); } catch (e) {}
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
  function evento(nome, extra) { try { var o = { event: nome, produto: "base_captions" }; for (var k in (extra || {})) o[k] = extra[k]; (window.dataLayer = window.dataLayer || []).push(o); } catch (e) {} }

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
    // é só uma amostra de que as aulas existem: toca sozinho, sem som, em loop, sem botão nenhum
    var v = document.createElement("video");
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.controls = false; v.preload = "none"; v.tabIndex = -1;
    v.setAttribute("autoplay", "");
    v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("disablepictureinpicture", ""); v.setAttribute("disableremoteplayback", "");
    if (CFG.CAPA_TRECHO_AULA) v.poster = CFG.CAPA_TRECHO_AULA;
    v.setAttribute("aria-label", "Trecho da aula de instalação e uso");
    // vídeo em pé (9:16) ou deitado (16:9): o quadro se ajusta ao arquivo
    v.addEventListener("loadedmetadata", function () { if (v.videoWidth && v.videoHeight) tela.style.aspectRatio = v.videoWidth + " / " + v.videoHeight; tela.classList.toggle("em-pe", v.videoHeight > v.videoWidth); });
    v.addEventListener("playing", function () { tela.classList.add("rodando"); });
    v.addEventListener("playing", function () { evento("aula_trecho_play"); }, { once: true });
    v.addEventListener("error", function () { tela.classList.remove("tem"); v.remove(); });       // endereço errado: volta o quadro "em breve"
    tela.appendChild(v); tela.classList.add("tem", "auto");
    var naTela = false, posto = false;
    function toca() { if (!naTela || document.hidden) return; if (!posto) { posto = true; v.src = CFG.VIDEO_TRECHO_AULA; } var q = v.play(); if (q && q.catch) q.catch(function () {}); }
    if (!("IntersectionObserver" in window)) { naTela = true; toca(); return; }
    new IntersectionObserver(function (en) { if (en[en.length - 1].isIntersecting && !posto) { posto = true; v.preload = "auto"; v.src = CFG.VIDEO_TRECHO_AULA; } }, { rootMargin: "700px 0px" }).observe(tela);
    new IntersectionObserver(function (en) { naTela = en[en.length - 1].isIntersecting; if (naTela) toca(); else v.pause(); }, { threshold: .3 }).observe(tela);
    // celular que segura o autoplay: o primeiro toque ou rolagem libera
    ["touchend", "pointerdown", "scroll"].forEach(function (n) { window.addEventListener(n, function () { if (naTela && v.paused) toca(); }, { passive: true }); });
    document.addEventListener("visibilitychange", toca);
  }

  /* ---------- Amostra da oferta: os 4 estilos tocando, um começando depois do outro ---------- */
  function amostra() {
    var box = $("#kitAmostra"); if (!box) return;
    var vs = $$("video", box), posto = false, naTela = false;
    function toca() {
      if (!naTela) return;
      vs.forEach(function (v, k) {
        if (!posto) { v.muted = true; v.src = v.dataset.src; }
        setTimeout(function () { if (!naTela) return; var q = v.play(); if (q && q.catch) q.catch(function () {}); }, posto ? 0 : k * 450);
      });
      posto = true;
    }
    if (!("IntersectionObserver" in window)) { naTela = true; toca(); return; }
    new IntersectionObserver(function (en) { naTela = en[en.length - 1].isIntersecting; if (naTela) toca(); else vs.forEach(function (v) { v.pause(); }); }, { threshold: .2 }).observe(box);
    ["touchend", "scroll"].forEach(function (n) { window.addEventListener(n, function () { if (naTela && posto && vs[0].paused) toca(); }, { passive: true }); });
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
            viuOferta = true; a.setAttribute("data-destino", checkoutHref()); a.textContent = "Quero o Base Captions";
            a.addEventListener("click", function () { try { (window.dataLayer = window.dataLayer || []).push({ event: "cta_checkout", produto: "base_captions", origem: "barra" }); } catch (x) {} });
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
    function log(t, ok) { var d = document.createElement("div"); d.className = ok ? "ok" : "run"; d.innerHTML = "<i>" + (ok ? '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>' : '<b class="spin"></b>') + "</i><span></span>"; d.lastChild.textContent = t;
      $$("#instLog .run").forEach(function (x) { x.className = "ok"; x.firstChild.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>'; }); $("#instLog").appendChild(d); }
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
        $("#instCard").classList.add("on"); $("#instMeta").textContent = "Instalado · v1.0.0"; $("#instTxt").textContent = "Instalado";
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
    var a = lado(p.antes, "antes", CFG.ROTULO_ANTES || "Sem", p.capaA), d = lado(p.depois, "depois", CFG.ROTULO_DEPOIS || "Com os títulos", p.capaD);
    var linha = document.createElement("span"); linha.className = "cmp-linha"; linha.innerHTML = '<i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 6l-5 6 5 6M15 6l5 6-5 6"/></svg></i>';
    // o controle de verdade é um range (teclado e leitor de tela); o arrasto com dedo/mouse mexe nele
    var rng = document.createElement("input"); rng.type = "range"; rng.min = 0; rng.max = 100; rng.value = 50; rng.className = "cmp-rng";
    rng.setAttribute("aria-label", "Arraste para comparar o vídeo antes e depois do Base Captions");
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

  /* ---------- Comparação de tempo: os dois blocos ganham vida quando aparecem; o slider calcula a economia do dia ---------- */
  function tempo() {
    var box = $("#tempo"), r = $("#calcN");
    var MAN = +CFG.MINUTOS_MANUAL || 90, BC = +CFG.MINUTOS_BASE_CAPTIONS || 2;
    function fmt(min) { min = Math.round(min); var h = Math.floor(min / 60), m = min % 60; return h ? h + "h" + (m ? " " + m + "min" : "") : m + " min"; }
    function fmtCurto(min) { min = Math.round(min); var h = Math.floor(min / 60), m = min % 60; return h ? h + "h" + (m < 10 ? "0" : "") + m : m + " min"; }
    if (box) {
      var num = $("[data-conta]", box), feito = false;
      function conta() {
        if (feito) return; feito = true; box.classList.add("vivo");
        if (!num) return; var alvo = +num.getAttribute("data-conta"), t0 = performance.now(), dur = 1500;
        (function passo(agora) { var k = Math.min(1, (agora - t0) / dur), q = 1 - Math.pow(1 - k, 3); num.textContent = fmtCurto(alvo * q); if (k < 1) requestAnimationFrame(passo); else num.textContent = fmtCurto(alvo); })(t0);
      }
      if (!("IntersectionObserver" in window)) conta();
      else new IntersectionObserver(function (en) { en.forEach(function (e) { box.classList.toggle("ativo", e.isIntersecting); if (e.isIntersecting) conta(); }); }, { threshold: .35 }).observe(box);
    }
    if (!r) return;
    var out = $("#calcOut"), eco = $('[data-calc="eco"]'), MAX = +r.max || 10, mexeu = false, raf = null, atual = 5 * (MAN - BC);
    function anima(alvo) {
      cancelAnimationFrame(raf); var de = atual, t0 = performance.now();
      (function passo(agora) { var k = Math.min(1, (agora - t0) / 380), q = 1 - Math.pow(1 - k, 3); atual = de + (alvo - de) * q; eco.textContent = fmt(k < 1 ? atual : alvo); if (k < 1) raf = requestAnimationFrame(passo); else atual = alvo; })(t0);
    }
    function upd() {
      var n = +r.value;
      r.style.setProperty("--p", ((n - 1) / (MAX - 1) * 100) + "%");
      out.innerHTML = "<b>" + n + "</b> " + (n === 1 ? "vídeo" : "vídeos");
      r.setAttribute("aria-valuetext", n + (n === 1 ? " vídeo" : " vídeos") + " por dia: " + fmt(n * (MAN - BC)) + " economizados nessa etapa");
      anima(n * (MAN - BC));
    }
    r.addEventListener("input", function () { if (!mexeu) { mexeu = true; evento("calculadora_usada"); } upd(); });
    upd();
  }

  /* ---------- Depoimentos: carrossel contínuo, sem fim, sempre rodando (no celular também).
     Segurar o dedo ou passar o mouse dá uma pausa curta para ler; soltou, volta a rodar. ---------- */
  function rolo() {
    var box = $("#rolo"); if (!box) return;
    var trilho = $(".rolo-trilho", box), VEL = 38, solta = null, larg = window.innerWidth;      // px por segundo
    function mede() { var w = trilho.scrollWidth / 2; if (w > 0) trilho.style.setProperty("--dur", Math.round(w / VEL) + "s"); }
    function pausa(on) { box.classList.toggle("pausado", on); }
    mede();
    window.addEventListener("resize", function () { if (window.innerWidth !== larg) { larg = window.innerWidth; mede(); } });
    $$("img", trilho).forEach(function (im) { if (!im.complete) im.addEventListener("load", mede, { once: true }); });
    box.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") pausa(true); });
    box.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") pausa(false); });
    box.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") { clearTimeout(solta); pausa(true); } });
    ["pointerup", "pointercancel"].forEach(function (n) { box.addEventListener(n, function (e) { if (e.pointerType !== "mouse") { clearTimeout(solta); solta = setTimeout(function () { pausa(false); }, 1200); } }); });
    box.addEventListener("focusin", function () { if (box.matches(":focus-visible")) pausa(true); });
    box.addEventListener("focusout", function () { pausa(false); });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { box.classList.toggle("fora", !en[0].isIntersecting); }, { threshold: 0 }).observe(box);
  }

  /* ---------- Quem fez: se os prints não carregarem, não sobra título sem conteúdo ---------- */
  function semPrints() {
    var faixa = $(".sec-prova [data-prova]"); if (!faixa) return;
    function confere() { var tem = $$(".pv-print img", faixa).length > 0; $$("[data-so-com-prints]").forEach(function (e) { e.hidden = !tem; }); faixa.hidden = !tem; return tem; }
    if (confere()) return;
    var n = 0, t = setInterval(function () { if (confere() || ++n > 10) clearInterval(t); }, 500);
  }

  /* ---------- Traço nos valores "de": risca quando o número aparece na tela ---------- */
  function riscas() {
    var els = $$("s.risca").filter(function (s) { return !$("[data-num]", s); }); if (!els.length) return;
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("on"); }); return; }
    var io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } }); }, { threshold: 1, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- App independente: o fluxo do Base Captions roda só enquanto está na tela, sempre a partir do começo ---------- */
  function independente() {
    var box = $("#ixCom"); if (!box) return;
    if (!("IntersectionObserver" in window)) { box.classList.add("ativo"); return; }
    new IntersectionObserver(function (en) { box.classList.toggle("ativo", en[en.length - 1].isIntersecting); }, { threshold: .3 }).observe(box);
  }

  /* ---------- Números: contam do zero quando aparecem na tela. Os riscados ganham o traço quando a conta termina ---------- */
  function contagem() {
    var els = $$("[data-num]"); if (!els.length) return;
    function fim(el) { var s = el.closest ? el.closest("s.risca") : null; if (s) s.classList.add("on"); }
    els.forEach(function (el) {
      var alvo = parseInt(el.textContent.replace(/\D/g, ""), 10); el._alvo = alvo;
      if (alvo > 0) { el.style.minWidth = String(alvo).length + "ch"; el.textContent = "0"; }
    });
    function roda(el) {
      var alvo = el._alvo; if (!(alvo > 0)) { fim(el); return; }
      var dur = alvo < 10 ? 700 : 1100, t0 = performance.now();
      (function passo(agora) {
        var k = Math.min(1, (agora - t0) / dur), q = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(alvo * q);
        if (k < 1) requestAnimationFrame(passo); else { el.textContent = alvo; fim(el); }
      })(t0);
    }
    if (!("IntersectionObserver" in window)) { els.forEach(function (el) { el.textContent = el._alvo; fim(el); }); return; }
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { io.unobserve(x.target); roda(x.target); } }); }, { threshold: 1, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Listas e cartões entram em cascata quando aparecem na tela ---------- */
  function cascata() {
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("cai"); io.unobserve(x.target); } }); }, { threshold: .15, rootMargin: "0px 0px -6% 0px" });
    $$(".cpt, .combo, .ix-dest, .of-lista, .of-ben, .autor-n, .faq").forEach(function (g) {
      g.classList.add("st"); Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty("--j", Math.min(i, 8)); }); io.observe(g);
    });
  }

  function init() { applyConfig(); semPrints(); antesDepois(); demo(); tempo(); rolo(); riscas(); contagem(); cascata(); independente(); aula(); amostra(); galeria(); reveals(); chrome(); instalacao(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
