/* ==========================================================================
   BASE CAPTIONS · PÁGINA DE VENDAS (oferta de lançamento)
   A mesma dinâmica da página da Black Friday (palco, três funções, 8 estilos, a virada, cartões),
   com a copy da página oficial. Configuração: assets/js/config.js.
   ========================================================================== */
(function () {
  "use strict";
  var CFG = window.PACK_CONFIG || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var html = document.documentElement; html.classList.add("js");
  var params = new URLSearchParams(location.search);
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function fase(p, a, b) { return clamp((p - a) / (b - a)); }
  function suave(t) { return 1 - Math.pow(1 - t, 3); }
  var calmoG = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // VÍDEOS_OTIMIZADOS: usa as versões da pasta /web/ (mesmos nomes), geradas pelo otimizar-videos.sh
  (function () {
    if (CFG.VIDEOS_OTIMIZADOS !== true) return;
    function web(u) { return typeof u === "string" ? u.replace(/^(https:\/\/aulas\.basefl\.com\/)(?!web\/)/, "$1web/") : u; }
    ["VIDEO_PRINCIPAL", "VIDEO_PRINCIPAL_LEVE", "VIDEO_TRECHO_AULA"].forEach(function (k) { CFG[k] = web(CFG[k]); });
    (CFG.ESTILOS || []).forEach(function (e) { e.video = web(e.video); });
  })();

  // Prévia animada: troca a imagem só depois que a nova carregou (sem piscar). Imagem animada roda mesmo quando o vídeo é bloqueado.
  function animada(img, src, pronto) {
    if (!img || !src || img.getAttribute("data-anim") === src) return;
    img.setAttribute("data-anim", src);
    var p = new Image(); p.decoding = "async";
    p.onload = function () { if (img.getAttribute("data-anim") === src) { img.src = src; if (pronto) pronto(); } };
    p.src = src;
  }

  // Autoplay bloqueado (iPhone em economia de energia, por exemplo): o primeiro toque na página destrava os vídeos que estão na tela.
  var travados = [];
  function destrava(v, quando) {
    if (!travados.some(function (t) { return t.v === v; })) travados.push({ v: v, ok: quando });
    if (destrava.armado) return; destrava.armado = true;
    var tipos = ["touchend", "click", "keydown"];
    function tenta() {
      travados = travados.filter(function (t) {
        if (t.ok && !t.ok()) return true;                                         // ainda fora da tela: espera o próximo toque
        var q = t.v.play(); if (q && q.catch) q.catch(function () {});
        return false;
      });
      if (!travados.length) { tipos.forEach(function (x) { document.removeEventListener(x, tenta, true); }); destrava.armado = false; }
    }
    tipos.forEach(function (x) { document.addEventListener(x, tenta, { capture: true, passive: true }); });
  }

  /* ---------- 1. Medição (dataLayer + Pixel), com as UTMs da visita ---------- */
  var UTM = (function () {
    var o = {}, tem = false;
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "src"].forEach(function (k) { var v = params.get(k); if (v) { o[k] = v; tem = true; } });
    try { if (tem) sessionStorage.setItem("bc_utm", JSON.stringify(o)); else o = JSON.parse(sessionStorage.getItem("bc_utm") || "{}"); } catch (e) {}
    return o;
  })();
  function evento(nome, extra) {
    var o = { event: nome, produto: "base_captions", pagina: "captions" }, k;
    for (k in UTM) o[k] = UTM[k];
    for (k in (extra || {})) o[k] = extra[k];
    try { (window.dataLayer = window.dataLayer || []).push(o); } catch (e) {}
    try { if (typeof window.fbq === "function") window.fbq("trackCustom", nome, extra || {}); } catch (e) {}
  }

  /* ---------- 2. Configuração: checkout (com UTMs), preço, quantidade, garantia, FAQ, links ---------- */
  function checkoutHref() {
    var url = CFG.CHECKOUT_URL || "#";
    if (!/^https?:/i.test(url)) return "#oferta";
    try {
      var u = new URL(url), inc = new URLSearchParams(location.search);
      var de = inc.get("de") || "pagina"; inc.delete("de"); inc.delete("previa");
      if (CFG.REPASSAR_PARAMETROS) inc.forEach(function (v, k) { if (!u.searchParams.has(k)) u.searchParams.set(k, v); });
      if (!u.searchParams.has("utm_source")) u.searchParams.set("utm_source", "basefl");
      if (!u.searchParams.has("utm_medium")) u.searchParams.set("utm_medium", de);
      if (!u.searchParams.has("utm_campaign")) u.searchParams.set("utm_campaign", "legendas");
      if (!u.searchParams.has("src")) u.searchParams.set("src", "basefl-" + de);
      return u.toString();
    } catch (e) { return url; }
  }
  function config() {
    var href = checkoutHref();
    // os botões de compra guardam o checkout em data-destino: o aviso "só computador" abre antes e depois segue para lá
    $$("[data-checkout]").forEach(function (a) {
      if (/^https?:/i.test(href)) { a.setAttribute("data-destino", href); a.setAttribute("href", "#oferta"); } else a.setAttribute("href", href);
      a.addEventListener("click", function () { evento("cta_checkout", { posicao: a.getAttribute("data-cta") }); });
    });
    if (CFG.PRECO) $$("[data-preco]").forEach(function (el) { el.textContent = CFG.PRECO; });
    if (CFG.QUANTIDADE_DE_PRESETS) $$("[data-qtd]").forEach(function (el) { el.textContent = CFG.QUANTIDADE_DE_PRESETS; });
    if (CFG.QUANTIDADE_EXATA) $$("[data-mais]").forEach(function (el) { el.remove(); });
    var gar = $("#garantia");
    if (CFG.GARANTIA_DIAS) { $$("[data-garantia]").forEach(function (el) { el.textContent = CFG.GARANTIA_DIAS; }); if (gar) gar.hidden = false; }
    else { if (gar) gar.hidden = true; $$("[data-faq-garantia]").forEach(function (d) { d.remove(); }); }
    var cr = $("#credencial");
    if (cr && CFG.CREDENCIAL_FERNANDO) { cr.textContent = CFG.CREDENCIAL_FERNANDO; cr.hidden = false; }
    var gratis = CFG.CAPCUT_GRATUITO !== false;
    if (!gratis) $$("[data-capcut-gratis]").forEach(function (el) { el.remove(); });
    var fx = $("#faqExtra");
    if (fx) (CFG.FAQ_EXTRA || []).forEach(function (q) {
      if (!q || !q.p || !q.r || (q.gratuito && !gratis)) return;
      var d = document.createElement("details"), sm = document.createElement("summary"), p = document.createElement("p");
      sm.textContent = q.p; p.textContent = q.r; d.appendChild(sm); d.appendChild(p); (q.segunda && $("#faqSegunda") || fx).appendChild(d);
    });
    $$('[data-link="instagram"]').forEach(function (a) { if (CFG.LINK_INSTAGRAM) a.href = CFG.LINK_INSTAGRAM; });
    $$('[data-link="suporte"]').forEach(function (a) { if (CFG.LINK_SUPORTE) a.href = CFG.LINK_SUPORTE; });
  }

  /* ---------- 2b. Faixa de lançamento, fixa no topo: um trilho com o texto repetido, andando com transform (sem saltos no loop) ---------- */
  function faixa() {
    var f = $("[data-faixa]"), esp = $("[data-faixa-espaco]"), tr = $("[data-faixa-trilho]"); if (!f || !tr) return;
    if (CFG.FAIXA_ATIVA === false) { f.remove(); if (esp) esp.remove(); html.style.setProperty("--fh", "0px"); return; }
    var preco = String(CFG.PRECO || "67").replace(".", ",");
    var itens = ['<span class="fl-i fl-forte"><i class="fl-ponto"></i>Oferta de lançamento</span>',
      '<span class="fl-i">Base Captions por <b>R$ ' + preco + '</b> à vista</span>'];
    if (CFG.FAIXA_PARCELAS) itens.push('<span class="fl-i fl-fraco">' + CFG.FAIXA_PARCELAS + "</span>");
    itens.push(CFG.FAIXA_TEMPO_LIMITADO ? '<span class="fl-i">Condição especial por tempo limitado</span>' : '<span class="fl-i">Condição especial de lançamento</span>');
    var sep = '<span class="fl-sep" aria-hidden="true"></span>', seq = itens.join(sep) + sep;
    f.setAttribute("aria-label", "Oferta de lançamento: Base Captions por R$ " + preco + " à vista" + (CFG.FAIXA_PARCELAS ? ", " + CFG.FAIXA_PARCELAS : "") + (CFG.FAIXA_TEMPO_LIMITADO ? ". Condição especial por tempo limitado." : "."));
    function monta() {
      tr.innerHTML = '<div class="fl-grupo">' + seq + "</div>";
      var g = tr.firstChild, n = 1, alvo = Math.max(window.innerWidth, 640) + 40;
      while (g.scrollWidth < alvo && n < 8) { g.insertAdjacentHTML("beforeend", seq); n++; }   // um grupo sempre mais largo que a tela
      tr.appendChild(g.cloneNode(true));                                                        // duas cópias iguais: anda 50% e volta sem salto
      dur = Math.max(20, Math.round((g.scrollWidth || 1600) / 42)) * (calmoG ? 1.4 : 1);   // ~42 px por segundo (mais calmo com movimento reduzido)
      tr.style.setProperty("--fdur", dur + "s"); tr.style.animationDuration = dur + "s";   // valor direto: o Safari não aceita bem calc() na duração
      if (anim && anim.effect && anim.effect.updateTiming) anim.effect.updateTiming({ duration: dur * 1000 });
    }
    var dur = 40, anim = null;
    monta();
    // plano B: se em 1,5 s o trilho não saiu do lugar (navegador que ignora a animação CSS), anima pelo JavaScript
    setTimeout(function () {
      var m = getComputedStyle(tr).transform;
      if (anim || !tr.animate || (m && m !== "none" && !/^matrix\(1, 0, 0, 1, 0, 0\)$/.test(m))) return;
      tr.style.animation = "none";
      anim = tr.animate([{ transform: "translate3d(0,0,0)" }, { transform: "translate3d(-50%,0,0)" }], { duration: dur * 1000, iterations: Infinity });
      evento("faixa_plano_b");
    }, 1500);
    var larg = window.innerWidth;
    window.addEventListener("resize", function () { if (Math.abs(window.innerWidth - larg) > 80) { larg = window.innerWidth; monta(); } });
  }

  /* ---------- 3. Botões que levam a uma parte da página (com correção, porque a página muda de altura ao rolar) ---------- */
  function ancoras() {
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href"); if (id.length < 2 || a.hasAttribute("data-destino")) return;
        var alvo = $(id); if (!alvo) return;
        e.preventDefault();
        var bloco = id === "#oferta" ? "start" : "start";
        alvo.scrollIntoView({ behavior: "smooth", block: bloco });
        setTimeout(function () { alvo.scrollIntoView({ behavior: "smooth", block: bloco }); }, 900);
        if (a.hasAttribute("data-cta")) evento("cta_oferta", { posicao: a.getAttribute("data-cta") });
      });
    });
  }

  /* ---------- 4. Aparecer ao rolar ---------- */
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
  function riscas() { $$("s.risca").forEach(function (r) { quandoVer(r, function () { r.classList.add("on"); }, .9); }); }

  /* ---------- 5. Os 8 estilos: um único vídeo, embaixo das capas (nome + amostra).
     Tocou num estilo: a capa dele aparece na hora, o vídeo troca por baixo e a capa sai quando o primeiro quadro aparece.
     Nada de tela preta, nada de fila: toques rápidos carregam só o último; o vídeo anterior é descartado (memória livre).
     Sozinho, passa de um estilo para o outro no fim de cada vídeo; tocou num estilo, fica nele em loop. ---------- */
  function estilos() {
    var box = $("[data-ev]"), E = CFG.ESTILOS || []; if (!box || !E.length) return;
    var lista = $("[data-ev-lista]", box), quadro = $("[data-ev-quadro]", box), nome = $("[data-ev-nome]", box), num = $("[data-ev-num]", box), barra = $("[data-ev-barra]", box);
    var i = 0, timer = null, auto = true, visivel = false, camadas = [], token = 0, adiado = null, falhas = {};
    var primeira = $(".ev-capa", quadro);
    E.forEach(function (e, k) {
      var im = k === 0 ? primeira : document.createElement("div");
      if (k) {
        im.className = "ev-capa"; im.setAttribute("aria-hidden", "true");
        im.innerHTML = '<span class="ev-capa-n">Estilo ' + pad(k + 1) + '</span><b class="ev-capa-nome">' + e.nome + '</b>' +
          '<img class="ev-capa-am" src="' + e.img + '" alt="" loading="lazy" decoding="async">';
        quadro.insertBefore(im, primeira.nextSibling);
      }
      camadas[k] = im;
      var b = document.createElement("button");
      b.type = "button"; b.className = "ev-t"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", k === 0 ? "true" : "false"); b.tabIndex = k === 0 ? 0 : -1;
      b.setAttribute("aria-label", "Estilo " + (k + 1) + " de " + E.length + ": " + e.nome);
      b.innerHTML = '<i class="ev-t-capa"><img src="' + e.img + '" alt="" loading="lazy" decoding="async"></i><span>' + pad(k + 1) + "</span><small>" + e.nome + "</small>";
      b.addEventListener("click", function () { vai(k, true); });
      lista.appendChild(b);
    });
    // o único vídeo do componente
    var v = document.createElement("video");
    v.className = "ev-vid"; v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = "none"; v.tabIndex = -1;
    ["muted", "playsinline", "webkit-playsinline", "autoplay", "disablepictureinpicture", "disableremoteplayback", "aria-hidden"].forEach(function (a) { v.setAttribute(a, a === "aria-hidden" ? "true" : ""); });
    v._k = -1;
    quadro.insertBefore(v, quadro.firstChild);
    var botoesT = $$(".ev-t", lista), abrir = $("[data-ev-abrir]", box);
    function revela(t) {
      function vai2() {
        if (t !== token || v._k !== i) return;
        quadro.classList.remove("carrega", "previa-anim"); quadro.classList.add("tocando"); box.classList.remove("bloqueado");
        if (auto && v.duration) { box.style.setProperty("--evdur", Math.max(500, (v.duration - v.currentTime) * 1000) + "ms"); barra.classList.remove("anda"); void barra.offsetWidth; barra.classList.add("anda"); }
      }
      if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(vai2); else setTimeout(vai2, 80);   // só tira a capa com um quadro já na tela
    }
    v.addEventListener("playing", function () { revela(token); });
    v.addEventListener("ended", function () { if (auto && v._k === i) vai(i + 1, false); });
    v.addEventListener("error", function () { if (v._k < 0 || !v.getAttribute("src")) return; falhas[v._k] = true; if (v._k === i) falhou(i); });
    // sem vídeo (rede, bloqueio ou a prévia privada): fica a capa, troca no tempo e oferece abrir o vídeo
    function falhou(k) {
      quadro.classList.remove("carrega", "tocando");
      if (abrir && E[k].video) { abrir.href = E[k].video; abrir.hidden = false; }
      if (auto && visivel) { clearTimeout(timer); timer = setTimeout(function () { vai(i + 1, false); }, 3600); }
    }
    function toca(k) {
      clearTimeout(timer); clearTimeout(adiado); if (abrir) abrir.hidden = true;
      if (!visivel || document.hidden) { v.pause(); return; }
      var e = E[k];
      if (!e.video || falhas[k]) { falhou(k); return; }
      v.loop = !auto;
      if (v._k === k && v.getAttribute("src")) {                                  // o mesmo estilo: só continua
        var q0 = v.play(); if (q0 && q0.catch) q0.catch(bloqueou(token));
        if (!v.paused && v.readyState > 2) revela(token);
        return;
      }
      var t = ++token, tocava = quadro.classList.contains("tocando");
      quadro.classList.remove("tocando");                                         // a capa do estilo novo cobre o vídeo antigo na hora
      adiado = setTimeout(function () {                                           // espera a capa cobrir; toque rápido cancela este e vale o próximo
        if (t !== token) return;
        v._k = k; v.preload = "auto"; v.src = e.video;                           // trocar o src descarta o download e o quadro anterior
        quadro.classList.add("carrega");
        var q = v.play(); if (q && q.catch) q.catch(bloqueou(t));
      }, tocava ? 130 : 0);
    }
    function bloqueou(t) {
      return function (er) {
        if (t !== token) return;
        quadro.classList.remove("carrega");
        if (v.error) { falhas[v._k] = true; falhou(v._k); }
        else if (er && er.name === "NotAllowedError") { box.classList.add("bloqueado"); destrava(v, function () { return visivel; }); mostraPrevia(v._k); }
      };
    }
    // vídeo bloqueado pelo celular: mostra a prévia animada do estilo (imagem leve que se mexe sozinha)
    var prev = null;
    function mostraPrevia(k) {
      var src = E[k] && E[k].previa; if (!src) return;
      if (!prev) { prev = document.createElement("img"); prev.className = "ev-prev"; prev.alt = ""; prev.setAttribute("aria-hidden", "true"); quadro.insertBefore(prev, $(".ev-rot", quadro)); }
      animada(prev, src, function () { quadro.classList.add("previa-anim"); });
    }
    function vai(k, manual) {
      k = (k + E.length) % E.length; i = k;
      camadas.forEach(function (im, n) { im.classList.toggle("on", n === k); });
      if (box.classList.contains("bloqueado")) mostraPrevia(k);
      if (manual) { auto = false; box.classList.add("parado"); clearTimeout(timer); evento("estilo", { estilo: k + 1, nome: E[k].nome }); }
      toca(k);
      num.textContent = pad(k + 1) + " / " + pad(E.length); nome.textContent = E[k].nome;
      botoesT.forEach(function (b, n) { b.setAttribute("aria-selected", n === k ? "true" : "false"); b.tabIndex = n === k ? 0 : -1; });
      var bt = botoesT[k], alvo = bt.offsetLeft - (lista.clientWidth - bt.offsetWidth) / 2;
      if (lista.scrollWidth > lista.clientWidth) lista.scrollTo({ left: alvo, behavior: calmoG ? "auto" : "smooth" });
    }
    var bp = $("[data-ev-play]", box);
    if (bp) bp.addEventListener("click", function () { box.classList.remove("bloqueado"); var q = v.play(); if (q && q.catch) q.catch(function () {}); if (!v.getAttribute("src")) toca(i); });
    $("[data-ev-ant]", box).addEventListener("click", function () { vai(i - 1, true); });
    $("[data-ev-prox]", box).addEventListener("click", function () { vai(i + 1, true); });
    lista.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!d) return;
      e.preventDefault(); vai(i + d, true); botoesT[i].focus();
    });
    // arrastar para o lado no vídeo troca de estilo (só quando o gesto é claramente horizontal: não atrapalha a rolagem)
    var x0 = null, y0 = 0;
    quadro.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    quadro.addEventListener("touchend", function (e) {
      if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) vai(i + (dx < 0 ? 1 : -1), true);
    }, { passive: true });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) {
      visivel = en[0].isIntersecting;
      if (visivel) toca(i); else { clearTimeout(timer); clearTimeout(adiado); v.pause(); }
    }, { threshold: .35 }).observe(quadro);
    else { visivel = true; toca(0); }
    document.addEventListener("visibilitychange", function () { if (document.hidden) v.pause(); else if (visivel) toca(i); });
  }

  /* ---------- 6. As três funções (legendas, cortes, zoom): passa sozinho até a pessoa tocar ---------- */
  function tres() {
    var box = $("[data-tres]"); if (!box) return;
    var abas = $$("[role=tab]", box), paineis = $$(".tres-p", box), v = $(".tres-vid", box), i = 0, timer = null, volta = null, auto = true, visivel = false, DUR = 6500;
    function vai(k, manual) {
      i = (k + 3) % 3;
      box.removeAttribute("data-m"); void box.offsetWidth; box.setAttribute("data-m", i);
      abas.forEach(function (b, n) { b.setAttribute("aria-selected", n === i ? "true" : "false"); b.tabIndex = n === i ? 0 : -1; });
      paineis.forEach(function (p, n) { p.hidden = n !== i; });
      box.style.setProperty("--tdur", DUR + "ms");
      if (manual) { auto = false; box.classList.add("parado"); clearTimeout(timer); clearTimeout(volta); volta = setTimeout(function () { auto = true; box.classList.remove("parado"); agenda(); }, 10000); evento("funcao", { funcao: ["legendas", "cortes", "zoom"][i] }); }
      else agenda();
    }
    function agenda() { clearTimeout(timer); if (auto && visivel) timer = setTimeout(function () { vai(i + 1, false); }, DUR); }
    abas.forEach(function (b, n) { b.addEventListener("click", function () { vai(n, true); }); });
    $(".tres-abas", box).addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!d) return;
      e.preventDefault(); vai(i + d, true); abas[i].focus();
    });
    // o vídeo: sem som, em loop, visível embaixo da capa (o iPhone não deixa tocar sozinho um vídeo com opacidade 0).
    // Começa a baixar pouco antes de aparecer, toca enquanto o quadro está na tela e pausa fora dela.
    var quadroT = $(".tres-quadro", box) || box, videoNaTela = false;
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.loop = true; v.setAttribute("autoplay", ""); v.setAttribute("webkit-playsinline", "");
    function carrega() { if (!v.src && CFG.VIDEO_COM_PACK) { v.preload = "auto"; v.src = CFG.VIDEO_COM_PACK; } }
    function toca() {
      if (!videoNaTela || document.hidden) return;
      carrega(); var q = v.play();
      if (q && q.catch) q.catch(function () {
        if (v.error) return;
        destrava(v, function () { return videoNaTela; });
        if (CFG.PREVIA_CORTES) animada($(".tres-poster", box), CFG.PREVIA_CORTES);
      });
    }
    v.addEventListener("playing", function () { box.classList.add("tocando"); });
    v.addEventListener("error", function () { box.classList.remove("tocando"); });          // sem vídeo: a capa fica, nada preto
    vai(0, false);
    if (!("IntersectionObserver" in window)) { visivel = videoNaTela = true; toca(); agenda(); return; }
    new IntersectionObserver(function (en) { if (en[0].isIntersecting) carrega(); }, { rootMargin: "400px 0px" }).observe(quadroT);
    new IntersectionObserver(function (en) { videoNaTela = en[0].isIntersecting; if (videoNaTela) toca(); else v.pause(); }, { threshold: .25 }).observe(quadroT);
    new IntersectionObserver(function (en) {
      visivel = en[0].isIntersecting;
      if (visivel) vai(i, false); else clearTimeout(timer);
    }, { threshold: .15 }).observe(box);
    document.addEventListener("visibilitychange", function () { if (document.hidden) v.pause(); else toca(); });
  }

  /* ---------- 7. Tempo: a barra escolhe quantos vídeos; os dois cards mostram o total sem e com o Base Captions ---------- */
  function tempo() {
    quandoVer($("[data-obj]"), function () { $("[data-obj]").classList.add("vivo"); }, .35);
    var r = $("#calcN"), box = $("[data-tp]"); if (!r || !box) return;
    var MAN = +CFG.MINUTOS_MANUAL || 90, BC = +CFG.MINUTOS_BASE_CAPTIONS || 2, MAX = +r.max || 20, MIN = +r.min || 1;
    var calmo = false;
    function fmt(min) { min = Math.round(min); var h = Math.floor(min / 60), m = min % 60; return h ? h + "h" + (m ? pad(m) : "") : m + " min"; }
    var out = $("#calcOut"), elSem = $("[data-tc-sem]", box), elCom = $("[data-tc-com]", box), elEco = $("[data-tc-eco]", box);
    var bSem = $("[data-tc-barra-sem]", box), bCom = $("[data-tc-barra-com]", box), mexeu = false, raf = null;
    var at = { sem: 5 * MAN, com: 5 * BC, eco: 5 * (MAN - BC) };
    $$(".tc-por", box)[0].textContent = fmt(MAN) + " por vídeo, com as legendas feitas à mão";
    $$(".tc-por", box)[1].textContent = "cerca de " + fmt(BC) + " por vídeo, com as legendas geradas pelo app";
    function pula(el) { el.classList.remove("pula"); void el.offsetWidth; el.classList.add("pula"); }
    function anima(alvo) {
      cancelAnimationFrame(raf);
      if (calmo) { at = alvo; elSem.textContent = fmt(alvo.sem); elCom.textContent = fmt(alvo.com); elEco.textContent = fmt(alvo.eco); return; }
      var de = { sem: at.sem, com: at.com, eco: at.eco }, t0 = performance.now();
      (function passo(agora) {
        var k = Math.min(1, (agora - t0) / 420), q = 1 - Math.pow(1 - k, 3);
        ["sem", "com", "eco"].forEach(function (c) { at[c] = de[c] + (alvo[c] - de[c]) * q; });
        elSem.textContent = fmt(k < 1 ? at.sem : alvo.sem); elCom.textContent = fmt(k < 1 ? at.com : alvo.com); elEco.textContent = fmt(k < 1 ? at.eco : alvo.eco);
        if (k < 1) raf = requestAnimationFrame(passo); else at = alvo;
      })(t0);
    }
    function upd(primeira) {
      var n = +r.value, sem = n * MAN, com = n * BC;
      r.style.setProperty("--p", ((n - MIN) / (MAX - MIN) * 100) + "%");
      out.innerHTML = "<b>" + n + "</b> " + (n === 1 ? "vídeo" : "vídeos");
      r.setAttribute("aria-valuetext", n + (n === 1 ? " vídeo" : " vídeos") + ": " + fmt(sem) + " sem o Base Captions, " + fmt(com) + " com o Base Captions");
      box.style.setProperty("--n", n);
      bSem.style.width = (n / MAX * 100).toFixed(2) + "%";                         // cada bloco vermelho é um vídeo de 1h30
      bCom.style.width = (com / (MAX * MAN) * 100).toFixed(3) + "%";                // na mesma escala: quase nada
      anima({ sem: sem, com: com, eco: sem - com });
      if (!primeira) { pula(elSem); pula(elCom); }
    }
    r.addEventListener("input", function () { if (!mexeu) { mexeu = true; evento("calculadora_usada"); } upd(); });
    upd(true);
    quandoVer(box, function () { box.classList.add("vivo"); }, .25);
  }

  /* ---------- 8. Os bônus: composição com movimento próprio. Começa quando aparece e segue sozinha;
     a rolagem continua livre (nada preso na tela). Os bônus giram devagar em volta do Base Captions,
     os de trás menores e atrás da logo, os da frente maiores e na frente. ---------- */
  function virada() {
    var box = $("[data-vir]"); if (!box) return;
    var palco = $("[data-vir-palco]", box), ul = $("[data-vir-orbita]", box);
    var ITENS = [["Títulos Dinâmicos", "assets/img/icones/titulos.webp"], ["CaseUp", "assets/img/icones/caseup.webp"], ["ChronoCut", "assets/img/icones/chronocut.webp"], ["Backgrounds & Overlays", "assets/img/icones/pack.webp"], ["Aulas", ""]];
    ul.innerHTML = ITENS.map(function (it, k) {
      return '<li style="--k:' + k + '"><span class="oc">' + (it[1] ? '<img src="' + it[1] + '" alt="" width="120" height="120" loading="lazy" decoding="async">' : '<span class="oc-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8.6 5.4v13.2L19 12z" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/></svg></span>') +
        "</span><small>" + it[0].replace("&", "&amp;") + "</small></li>";
    }).join("");
    var lis = $$("li", ul), N = lis.length;
    var lento = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var W = 0, H = 0, raf = 0, t0 = 0, parado = 0, rodando = false, comecou = false;
    function mede() { W = palco.clientWidth; H = palco.clientHeight; var l = W >= 480; palco.style.setProperty("--rx", (l ? 40 : 36) + "%"); palco.style.setProperty("--ry", (l ? 31 : 30) + "%"); }
    function sai(x) { var c = 1.4; x = x - 1; return 1 + (c + 1) * x * x * x + c * x * x; }       // sai do centro e assenta, com uma folga leve
    function quadro(agora) {
      if (!t0) t0 = agora;
      var t = (agora - t0) / 1000, larga = W >= 480;
      var rx = W * (larga ? .4 : .36), ry = H * (larga ? .31 : .3);
      var giro = t * Math.PI * 2 / (lento ? 48 : 40);                                         // uma volta a cada 40 s (48 s com movimento reduzido)
      lis.forEach(function (li, k) {
        var e = lento ? suave(clamp((t - .3 - k * .1) / 1.2)) : sai(clamp((t - .5 - k * .12) / 1.1));
        var ang = k / N * Math.PI * 2 - Math.PI / 2 + .62 + giro, sn = Math.sin(ang), d = (sn + 1) / 2;
        var x = Math.cos(ang) * rx * e, y = sn * ry * e, esc = (.25 + .75 * Math.min(1, e)) * (.78 + .22 * d);
        li.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) scale(" + esc.toFixed(3) + ")";
        li.style.opacity = (clamp(e * 1.6) * (.5 + .5 * d)).toFixed(3);
        li.style.zIndex = sn > -.2 ? 5 : 1;
      });
      if (rodando) raf = requestAnimationFrame(quadro);
    }
    function liga() {
      if (rodando) return; rodando = true; mede();
      if (!comecou) { comecou = true; box.classList.add("play"); evento("bonus_composicao_vista"); }
      if (parado && t0) t0 += performance.now() - parado;
      raf = requestAnimationFrame(quadro);
    }
    function desliga() { if (!rodando) return; rodando = false; cancelAnimationFrame(raf); parado = performance.now(); }
    window.addEventListener("resize", function () { mede(); if (!rodando && comecou) requestAnimationFrame(quadro); });
    mede();
    // liga quando o palco está na tela, pela posição dele (funciona igual em qualquer navegador, inclusive dentro de apps)
    var pendente = false;
    function confere() {
      pendente = false;
      var r = palco.getBoundingClientRect(), alt = window.innerHeight || document.documentElement.clientHeight;
      if (!document.hidden && r.bottom > alt * .08 && r.top < alt * .92) liga(); else desliga();
    }
    function agenda() { if (!pendente) { pendente = true; requestAnimationFrame(confere); } }
    window.addEventListener("scroll", agenda, { passive: true });
    window.addEventListener("resize", agenda);
    document.addEventListener("visibilitychange", confere);
    window.addEventListener("pageshow", confere);
    confere(); setTimeout(confere, 600);
  }

  /* ---------- 9. Títulos Dinâmicos: o mural, com os títulos tocando juntos (arquivos pequenos), só enquanto estão na tela ---------- */
  function titulos() {
    var box = $("[data-mural]"), g = $("[data-mural-grade]"), T = CFG.TITULOS || []; if (!box || !g || !T.length) return;
    g.innerHTML = T.map(function (t, k) {
      return '<li class="rv" style="--i:' + k + '"><video muted loop playsinline preload="none" poster="' + t.capa + '" data-src="' + t.video + '" aria-label="Título animado: ' + t.nome + '"></video><span><b>' + t.nome + "</b>" + t.tipo + "</span></li>";
    }).join("");
    var vs = $$("video", g);
    vs.forEach(function (v) { v.muted = true; v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.addEventListener("playing", function () { v.parentNode.classList.add("tocando"); }); });
    function toca(on) {
      vs.forEach(function (v, k) {
        if (on) { if (!v.src) v.src = v.getAttribute("data-src"); setTimeout(function () { var q = v.play(); if (q && q.catch) q.catch(function (er) {
          if (v.error || !er || er.name !== "NotAllowedError") return;
          destrava(v, function () { return true; });
          var li = v.parentNode, src = T[k] && T[k].previa;
          if (src && !$(".mural-prev", li)) { var im = document.createElement("img"); im.className = "mural-prev"; im.alt = ""; im.setAttribute("aria-hidden", "true"); im.decoding = "async"; im.src = src; li.insertBefore(im, v.nextSibling); }
        }); }, k * 450); }
        else v.pause();
      });
    }
    $$(".rv", g).forEach(function (li) { quandoVer(li, function () { li.classList.add("in"); }, .1); });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { toca(en[0].isIntersecting); }, { threshold: .2 }).observe(g);
    else toca(true);
  }

  /* ---------- 10. Vídeo do app no bloco das aulas: ilustração. Sempre sem som, em loop, sem controles e sem botão.
     Começa a baixar pouco antes de aparecer, toca enquanto está na tela e pausa fora dela.
     Se o navegador bloquear o autoplay, a capa fica e o vídeo começa no primeiro toque na página. ---------- */
  function aula() {
    var box = $("[data-aula]"); if (!box) return;
    if (!CFG.VIDEO_TRECHO_AULA) { box.hidden = true; return; }
    var tela = $("[data-aula-tela]", box) || box, capa = $(".aula-capa", box);
    if (CFG.CAPA_TRECHO_AULA && capa) capa.src = CFG.CAPA_TRECHO_AULA;
    var v = document.createElement("video");
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.preload = "none"; v.tabIndex = -1; v.controls = false;
    ["muted", "playsinline", "webkit-playsinline", "loop", "disablepictureinpicture", "disableremoteplayback"].forEach(function (a) { v.setAttribute(a, ""); });
    v.setAttribute("aria-label", "O Base Captions em uso: trecho da aula, sem som");
    if (CFG.CAPA_TRECHO_AULA) v.poster = CFG.CAPA_TRECHO_AULA;
    v.className = "aula-vid";
    v.addEventListener("playing", function () { box.classList.add("rodando"); });
    v.addEventListener("playing", function () { evento("aula_trecho_play"); }, { once: true });
    v.addEventListener("volumechange", function () { if (!v.muted) v.muted = true; });              // ilustração: nunca com som
    v.addEventListener("error", function () { v.remove(); box.classList.remove("rodando"); });
    tela.appendChild(v);
    var naTela = false, posto = false, armado = false;
    function carrega() { if (!posto) { posto = true; v.preload = "auto"; v.src = CFG.VIDEO_TRECHO_AULA; } }
    function toca() {
      if (!naTela || document.hidden) return;
      carrega(); var q = v.play();
      if (q && q.catch) q.catch(function () { if (v.error) return; arma(); if (CFG.PREVIA_APP) animada(capa, CFG.PREVIA_APP); });
    }
    function arma() {
      if (armado) return; armado = true;
      var tipos = ["touchend", "click", "keydown"];
      function tenta() { var q = v.play(); if (q && q.then) q.then(function () { tipos.forEach(function (t) { document.removeEventListener(t, tenta, true); }); }, function () {}); }
      tipos.forEach(function (t) { document.addEventListener(t, tenta, { capture: true, passive: true }); });
    }
    if (!("IntersectionObserver" in window)) { naTela = true; toca(); return; }
    new IntersectionObserver(function (en) { if (en[0].isIntersecting) carrega(); }, { rootMargin: "300px 0px" }).observe(box);
    new IntersectionObserver(function (en) { naTela = en[0].isIntersecting; if (naTela) toca(); else v.pause(); }, { threshold: .25 }).observe(box);
    document.addEventListener("visibilitychange", function () { if (document.hidden) v.pause(); else toca(); });
  }

  /* ---------- 10b. Vídeo principal, como um player de VSL:
     prévia sem som (alguns segundos da versão leve, em loop) assim que o navegador deixa → botão grande "assistir com som" →
     o vídeo completo do início, com som e controles próprios. 4K no computador; no celular ou em rede lenta, a versão 1080p
     do mesmo vídeo. Se a 4K travar, troca sozinha para a 1080p no mesmo ponto. Nada pesado carrega antes da página. ---------- */
  function vsl() {
    var box = $("[data-vsl]"); if (!box) return;
    var HD = CFG.VIDEO_PRINCIPAL, LEVE = CFG.VIDEO_PRINCIPAL_LEVE || HD;
    if (!HD && !LEVE) { box.hidden = true; return; }
    var quadro = $("[data-vsl-quadro]", box), cta = $("[data-vsl-cta]", box), legenda = $("[data-vsl-legenda]", box);
    var ctrl = $("[data-vsl-ctrl]", box), pp = $("[data-vsl-pp]", box), prog = $("[data-vsl-prog]", box), tempo = $("[data-vsl-tempo]", box);
    var mudo = $("[data-vsl-mudo]", box), tela = $("[data-vsl-tela]", box), retoma = $("[data-vsl-retoma]", box), fim = $("[data-vsl-fim]", box), denovo = $("[data-vsl-denovo]", box), abrir = $("[data-vsl-abrir]", box);
    var INI = +CFG.PREVIA_INICIO || 0, FIMP = +CFG.PREVIA_FIM || 6;
    var toque = window.matchMedia && matchMedia("(hover: none)").matches;
    var calmo = false;
    // o vídeo já vem no HTML (muted + playsinline): é o jeito mais confiável de o iPhone e o Android aceitarem a prévia sozinha
    var v = $("[data-vsl-vid]", box);
    if (!v) { v = document.createElement("video"); v.className = "vsl-vid"; quadro.insertBefore(v, quadro.firstChild); }
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.disablePictureInPicture = true;
    v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", "");
    if (CFG.CAPA_VIDEO_PRINCIPAL) v.poster = CFG.CAPA_VIDEO_PRINCIPAL;
    var modo = "capa", naTela = false, travas = 0, fonte = "", marcos = {}, esconde = null, voltas = 0, armado = false;
    var rede = navigator.connection || {}, poupa = !!rede.saveData;
    // o texto embaixo do botão é uma legenda dinâmica, do jeito que o Base Captions faz
    function diz(palavras) {
      if (!legenda) return;
      var ps = $$("span, em", legenda);
      ps[0].textContent = palavras[0]; ps[1].textContent = palavras[1];
      ps[2].firstChild.nodeValue = palavras[2];
      legenda.classList.remove("canta"); void legenda.offsetWidth; legenda.classList.add("canta");
    }
    var verbo = toque ? "Toque" : "Clique";
    diz([verbo, "para", "assistir"]);
    function fmt(t) { t = Math.max(0, Math.round(t || 0)); return Math.floor(t / 60) + ":" + pad(t % 60); }
    function escolhe() {
      var grande = window.innerWidth >= 900 && Math.min(screen.width, screen.height) >= 700;
      var lenta = poupa || /(^|-)(2g|3g)$/.test(rede.effectiveType || "") || (rede.downlink && rede.downlink < 8);
      return grande && !lenta && HD ? HD : LEVE;
    }
    var tCarga = null;
    function carregando(on) {                                                // só aparece se o vídeo travar de verdade (passou 350 ms sem andar)
      clearTimeout(tCarga);
      if (!on) { quadro.classList.remove("carregando"); return; }
      tCarga = setTimeout(function () { if (modo === "completo" && (v.paused || v.readyState < 3)) quadro.classList.add("carregando"); }, 350);
    }
    function andando() {                                                     // o vídeo com som está rodando: tira o "carregando" e mostra os controles
      if (modo !== "completo" || v.paused) return;
      carregando(false);
      if (!box.classList.contains("rodou")) { box.classList.add("rodou"); box.classList.add("completo"); pp.setAttribute("aria-label", "Pausar"); box.classList.remove("pausado"); mostraCtrl(); }
    }
    function falhou() {
      carregando(false);
      if (modo === "completo" && fonte === HD && LEVE && LEVE !== HD) { troca(LEVE); return; }
      box.classList.add("sem-video"); if (abrir) { abrir.href = HD || LEVE; abrir.hidden = false; }
    }
    function troca(url) {
      var t = v.currentTime || 0, tocava = !v.paused || modo === "completo";
      fonte = url; v.src = url;
      v.addEventListener("loadedmetadata", function f() { v.removeEventListener("loadedmetadata", f); try { v.currentTime = t; } catch (e) {} if (tocava) v.play().catch(function () {}); });
      evento("video_principal_troca", { para: url === HD ? "4k" : "1080p" });
    }
    // ---- prévia sem som: começa assim que o player aparece, sem esperar o resto da página
    function previa() {
      if (modo !== "capa" && modo !== "previa") return;
      if (!naTela || document.hidden) { if (modo === "previa" && !v.paused) v.pause(); return; }
      if (calmo && voltas >= 1) return;                                     // movimento reduzido: a prévia passa uma vez e para
      if (!fonte) { fonte = LEVE; v.preload = "auto"; v.src = LEVE; try { v.currentTime = INI; } catch (e) {} }
      modo = "previa";
      var q = v.play();
      if (q && q.catch) q.catch(function (e) {
        if (v.error) { falhou(); return; }
        if (modo !== "previa") return;
        modo = "capa"; box.classList.add("previa-bloqueada"); armaToque();   // bloqueado (economia de energia, por exemplo)
        if (CFG.PREVIA_ANIMADA) animada($(".vsl-capa", box), CFG.PREVIA_ANIMADA, function () { box.classList.add("previa-anim"); });
      });
    }
    // bloqueou: tenta de novo no primeiro toque em qualquer lugar da página (o toque no próprio botão já abre o vídeo com som)
    function armaToque() {
      if (armado) return; armado = true;
      var tipos = ["touchend", "click", "keydown"];
      function solta() { tipos.forEach(function (t) { document.removeEventListener(t, tenta, true); }); armado = false; }
      function tenta(e) {
        if (modo === "completo") { solta(); return; }
        if (e && e.target && cta.contains(e.target)) return;
        if (modo !== "capa") return;
        modo = "previa";
        var q = v.play(); if (q && q.then) q.then(solta, function () { if (modo === "previa") modo = "capa"; });
      }
      tipos.forEach(function (t) { document.addEventListener(t, tenta, { capture: true, passive: true }); });
    }
    v.addEventListener("timeupdate", function () {
      if (modo === "previa") {
        if (v.currentTime >= FIMP - .35) box.classList.add("vsl-dip");     // escurece um instante antes de voltar ao começo
        if (v.currentTime >= FIMP) {
          voltas++;
          volta();
        }
        return;
      }
      if (modo !== "completo" || !v.duration) return;
      var p = v.currentTime / v.duration;
      prog.value = Math.round(p * 1000); prog.style.setProperty("--p", (p * 100).toFixed(2) + "%");
      tempo.textContent = fmt(v.currentTime) + " / " + fmt(v.duration);
      [25, 50, 75].forEach(function (m) { if (!marcos[m] && p * 100 >= m) { marcos[m] = 1; evento("video_principal_progresso", { porcento: m }); } });
    });
    function volta() {                                                       // fim do trecho da prévia: volta ao começo e segue tocando
      if (calmo) { v.pause(); box.classList.remove("vsl-dip"); return; }
      try { v.currentTime = INI; } catch (e) {}
      if (v.paused && naTela && !document.hidden) { var q = v.play(); if (q && q.catch) q.catch(function () {}); }
    }
    // o arquivo 4K tem uma borda preta fina nos primeiros segundos: até lá, amplia um pouco (sem cortar conteúdo)
    var BORDA = +CFG.VIDEO_PRINCIPAL_BORDA_ATE || 0;
    function borda() { box.classList.toggle("corta-borda", BORDA > 0 && fonte === HD && HD !== LEVE && (v.currentTime || 0) < BORDA); }
    ["timeupdate", "seeked", "loadeddata", "play"].forEach(function (t) { v.addEventListener(t, borda); });
    v.addEventListener("seeked", function () {
      if (modo !== "previa" || !box.classList.contains("vsl-dip")) return;
      box.classList.remove("vsl-dip"); diz([verbo, "para", "ouvir"]);
    });
    // no iPhone, quando a prévia já estava rodando, o "playing" pode não vir de novo: qualquer sinal de que o vídeo andou serve
    var tAnt = -1;
    v.addEventListener("timeupdate", function () { if (modo === "completo" && v.currentTime !== tAnt) { tAnt = v.currentTime; if (v.readyState >= 2) andando(); } });
    ["seeked", "canplay", "canplaythrough", "play"].forEach(function (t) { v.addEventListener(t, function () { if (v.readyState >= 3) andando(); }); });
    v.addEventListener("playing", function () {
      carregando(false); box.classList.remove("previa-bloqueada");
      if (modo === "completo") { box.classList.add("completo"); pp.setAttribute("aria-label", "Pausar"); box.classList.remove("pausado"); mostraCtrl(); return; }
      if (!box.classList.contains("previa-on")) { box.classList.add("previa-on"); diz([verbo, "para", "ouvir"]); }
    });
    v.addEventListener("waiting", function () {
      if (modo !== "completo") return;
      carregando(true);
      if (fonte === HD && LEVE !== HD && ++travas >= 2) troca(LEVE);     // a 4K está travando: segue na 1080p, no mesmo ponto
    });
    v.addEventListener("error", function () { if (modo === "previa" || modo === "capa") { box.classList.remove("previa-on"); if (v.error) falhou(); } else falhou(); });
    v.addEventListener("pause", function () { if (modo === "completo" && !v.ended) { box.classList.add("pausado"); pp.setAttribute("aria-label", "Continuar"); mostraCtrl(true); } });
    v.addEventListener("ended", function () {
      if (modo === "previa") { voltas++; volta(); return; }                  // vídeo mais curto que o trecho da prévia
      if (modo !== "completo") return;
      box.classList.add("acabou"); box.classList.remove("pausado"); fim.hidden = false; ctrl.hidden = true;
      requestAnimationFrame(function () { fim.classList.add("entra"); });
      evento("video_principal_progresso", { porcento: 100 });
    });
    // ---- o vídeo completo, com som (no celular é o mesmo arquivo da prévia: só liga o som e volta ao começo)
    function assiste() {
      modo = "completo"; marcos = {}; travas = 0; tAnt = -1; box.classList.remove("rodou");
      box.classList.add("completo"); box.classList.remove("previa-on", "previa-bloqueada", "acabou", "pausado", "vsl-dip"); cta.hidden = true; fim.hidden = true; fim.classList.remove("entra"); ctrl.hidden = false;
      var url = escolhe();
      if (fonte !== url) { fonte = url; v.preload = "auto"; v.src = url; }
      v.muted = false; v.defaultMuted = false; v.removeAttribute("muted"); v.loop = false;
      try { v.currentTime = 0; } catch (e) {}
      carregando(true);
      var q = v.play();                                                      // dentro do clique: o navegador libera o som
      if (q && q.then) q.then(function () { if (v.readyState >= 2) andando(); }, function () { if (v.error) falhou(); else { carregando(false); box.classList.add("pausado"); } });
      mudo.setAttribute("aria-label", "Tirar o som"); box.classList.remove("mudo");
      evento("video_principal_play", { qualidade: url === HD ? "4k" : "1080p" });
    }
    cta.addEventListener("click", assiste);
    // o botão do fim leva para "o que está incluso" (a seção da oferta), não para o checkout. Se estiver em tela cheia, sai antes.
    var fimCta = $("[data-vsl-fim-cta]", box);
    if (fimCta) fimCta.addEventListener("click", function () {
      var d = document;
      if (d.fullscreenElement || d.webkitFullscreenElement) { try { (d.exitFullscreen || d.webkitExitFullscreen).call(d); } catch (e) {} }
    }, true);
    denovo.addEventListener("click", assiste);
    function alterna() { if (v.paused) v.play().catch(function () {}); else v.pause(); }
    pp.addEventListener("click", alterna);
    retoma.addEventListener("click", function () { v.play().catch(function () {}); });
    v.addEventListener("click", function () { if (modo === "completo") { if (toque && !box.classList.contains("ctrl-on")) mostraCtrl(); else alterna(); } });
    prog.addEventListener("input", function () { if (v.duration) { v.currentTime = prog.value / 1000 * v.duration; prog.style.setProperty("--p", (prog.value / 10) + "%"); } mostraCtrl(); });
    mudo.addEventListener("click", function () { v.muted = !v.muted; box.classList.toggle("mudo", v.muted); mudo.setAttribute("aria-label", v.muted ? "Ligar o som" : "Tirar o som"); mostraCtrl(); });
    tela.addEventListener("click", function () {
      var d = document;
      if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
      if (quadro.requestFullscreen) quadro.requestFullscreen().catch(function () {});
      else if (quadro.webkitRequestFullscreen) quadro.webkitRequestFullscreen();
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();               // iPhone: tela cheia do próprio vídeo
    });
    function mostraCtrl(fica) {
      box.classList.add("ctrl-on"); clearTimeout(esconde);
      if (!fica) esconde = setTimeout(function () { if (!v.paused) box.classList.remove("ctrl-on"); }, 2600);
    }
    quadro.addEventListener("pointermove", function (e) { if (modo === "completo" && e.pointerType === "mouse") mostraCtrl(); });
    // ---- a prévia roda só enquanto o player está na tela. Já na abertura: o player está na primeira dobra
    var r = box.getBoundingClientRect();
    naTela = r.top < (window.innerHeight || 800) && r.bottom > 0;
    previa();
    document.addEventListener("visibilitychange", previa);
    window.addEventListener("pageshow", function (e) { if (e.persisted) previa(); });   // voltou pelo botão "voltar" do navegador
    if (!("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (en) {
      naTela = en[0].isIntersecting;
      if (modo === "completo") return;                                       // com som, quem manda é a pessoa
      previa();
    }, { threshold: .15 }).observe(box);
  }

  /* ---------- 6b. Grifo nos dois benefícios (8 estilos e +70 títulos): passa por trás das palavras, um depois do outro ---------- */
  function grifos() {
    var topo = $$(".hero-sub [data-grifo]");
    topo.forEach(function (g, k) { g.style.transitionDelay = (k ? 1.05 : 0) + "s"; });
    setTimeout(function () { topo.forEach(function (g) { g.classList.add("on"); }); }, 750);
    $$("[data-grifo]").forEach(function (g) {
      if (topo.indexOf(g) >= 0) return;
      quandoVer(g, function () { setTimeout(function () { g.classList.add("on"); }, 250); }, 1);
    });
  }

  /* ---------- 6c. Cartões ao lado do vídeo (computador largo): amostras reais dos estilos passando e um título animado ---------- */
  function chips() {
    var a = $("[data-chip-estilos]"), b = $("[data-chip-titulos]");
    if (!a || !window.matchMedia) return;
    var mq = matchMedia("(min-width: 1100px)"), feito = false;
    function monta() {
      if (feito || !mq.matches) return; feito = true;
      var E = (CFG.ESTILOS || []).filter(function (e) { return e.img; }), am = $("[data-chip-am]", a), n = $("[data-chip-n]", a), i = 0;
      E.forEach(function (e, k) { var im = new Image(); im.src = e.img; im.alt = ""; im.decoding = "async"; if (!k) im.className = "on"; am.appendChild(im); });
      var calmo = false;
      if (E.length > 1) setInterval(function () {
        if (document.hidden) return;
        var ims = am.children; ims[i].className = ""; i = (i + 1) % ims.length; ims[i].className = "on"; n.textContent = pad(i + 1);
      }, 2400);
      var T = (CFG.TITULOS || [])[0], th = b && $("[data-chip-th]", b);
      if (T && th) {
        var v = document.createElement("video"); v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = !calmo; v.preload = calmo ? "none" : "auto";
        v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); if (T.capa) v.poster = T.capa; v.src = T.video; th.appendChild(v);
        if (!calmo && "IntersectionObserver" in window) new IntersectionObserver(function (en) { if (en[0].isIntersecting) { var q = v.play(); if (q && q.catch) q.catch(function () {}); } else v.pause(); }).observe(th);
      }
    }
    monta(); if (mq.addEventListener) mq.addEventListener("change", monta);
  }

  /* ---------- 11. Barra fixa do celular: aparece depois do topo e some quando outro botão está na tela ---------- */
  function barra() {
    var b = $("[data-barra]"); if (!b || !("IntersectionObserver" in window)) return;
    var vistos = new Set(), passouTopo = false, link = $("a", b);
    function decide() {
      var on = passouTopo && vistos.size === 0;
      b.classList.toggle("on", on); b.setAttribute("aria-hidden", on ? "false" : "true"); link.tabIndex = on ? 0 : -1;
    }
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) vistos.add(x.target); else vistos.delete(x.target); }); decide(); }, { threshold: .2 });
    $$("[data-cta]").forEach(function (a) { if (!b.contains(a)) io.observe(a); });
    new IntersectionObserver(function (en) { passouTopo = !en[0].isIntersecting && en[0].boundingClientRect.top < 0; decide(); }).observe($(".hero-cta"));
  }

  /* ---------- 12. Medição de seções e da rolagem ---------- */
  function medicao() {
    evento("pagina_vista");
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { evento("secao", { secao: x.target.getAttribute("data-secao") }); io.unobserve(x.target); } }); }, { threshold: .35 });
      $$("[data-secao]").forEach(function (s) { io.observe(s); });
    }
    var marcos = [25, 50, 75, 100], feitos = {}, pedido = 0;
    function mede() {
      pedido = 0;
      var d = document.documentElement, pct = (window.scrollY + window.innerHeight) / d.scrollHeight * 100;
      marcos.forEach(function (m) { if (!feitos[m] && pct >= m - .5) { feitos[m] = 1; evento("rolagem", { porcento: m }); } });
    }
    window.addEventListener("scroll", function () { if (!pedido) pedido = requestAnimationFrame(mede); }, { passive: true });
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
    config(); faixa(); ancoras(); aparece(); riscas(); vsl(); grifos(); chips(); estilos(); tres(); tempo(); virada(); titulos(); aula(); barra(); demo();
    setTimeout(medicao, 600);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
