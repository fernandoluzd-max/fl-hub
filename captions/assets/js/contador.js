/* Contador de alunos da Base FL ao vivo. Número REAL vindo do servidor (licenças ativas distintas); sem número, o selo não aparece. */
(function () {
  var URL_RPC = "https://otlaexuqyavpzxwzcsfo.supabase.co/rest/v1/rpc/contador_alunos";
  var CHAVE = "sb_publishable_bAaw1t6NpZEgH8ePBztQWg_tE4kDfQR";   // chave pública (só permite ler este número)
  var el = document.querySelector("[data-alunos]"); if (!el) return;
  var num = el.querySelector(".al-num"), mais = el.querySelector(".al-mais"), topo = el.parentNode;
  var atual = null, anim = null;
  var reduz = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var fmt = function (n) { try { return n.toLocaleString("pt-BR"); } catch (e) { return String(n); } };
  function conta(de, para, ms) {
    if (anim) cancelAnimationFrame(anim);
    if (reduz || de === para) { num.textContent = fmt(para); return; }
    var t0 = null;
    (function passo(t) { if (t0 === null) t0 = t; var p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3); num.textContent = fmt(Math.round(de + (para - de) * e)); if (p < 1) anim = requestAnimationFrame(passo); })(performance.now());
  }
  function recebe(v) {
    if (typeof v !== "number" || !isFinite(v) || v < 1) return;
    if (atual === null) { el.hidden = false; topo.classList.add("com-alunos"); num.textContent = "0"; conta(0, v, 1400); }
    else if (v > atual) { conta(atual, v, 900); if (mais) mais.textContent = "+" + (v - atual); el.classList.remove("sobe"); void el.offsetWidth; el.classList.add("sobe"); }
    else if (v < atual) { conta(atual, v, 400); }
    atual = v; el.setAttribute("aria-label", fmt(v) + " alunos na Base FL");
  }
  function busca() {
    if (document.hidden) return;
    try { fetch(URL_RPC, { method: "POST", headers: { apikey: CHAVE, "Content-Type": "application/json" }, body: "{}" }).then(function (r) { return r.ok ? r.json() : null; }).then(recebe).catch(function () {}); } catch (e) {}
  }
  busca(); setInterval(busca, 30000); document.addEventListener("visibilitychange", function () { if (!document.hidden) busca(); });
})();
