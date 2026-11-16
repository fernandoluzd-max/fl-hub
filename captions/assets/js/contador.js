/* Contador de alunos da Base FL ao vivo, estilo Flip Clock. Número REAL vindo do servidor (licenças ativas distintas); sem número, o selo não aparece. */
(function () {
  var URL_RPC = "https://otlaexuqyavpzxwzcsfo.supabase.co/rest/v1/rpc/contador_alunos";
  var CHAVE = "sb_publishable_bAaw1t6NpZEgH8ePBztQWg_tE4kDfQR";   // chave pública (só permite ler este número)
  var el = document.querySelector("[data-alunos]"); if (!el) return;
  var box = el.querySelector("[data-digits]"), mais = el.querySelector(".al-mais"), topo = el.parentNode;
  var atual = null, cells = [], reduz = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var fmt = function (n) { try { return n.toLocaleString("pt-BR"); } catch (e) { return String(n); } };
  function cell(ch) { var d = document.createElement("div"); d.className = "fd"; d.dataset.v = ch; d.innerHTML = '<div class="t"><span>' + ch + '</span></div><div class="b"><span>' + ch + '</span></div><div class="ft"><span>' + ch + '</span></div><div class="fb"><span>' + ch + '</span></div>'; return d; }
  function set(d, ch) {
    if (d.dataset.v === ch) return; var old = d.dataset.v; d.dataset.v = ch;
    var q = function (c) { return d.querySelector(c + " span"); };
    if (reduz) { q(".t").textContent = q(".b").textContent = q(".ft").textContent = q(".fb").textContent = ch; return; }
    q(".t").textContent = ch; q(".b").textContent = old; q(".ft").textContent = old; q(".fb").textContent = ch;
    d.classList.remove("go"); void d.offsetWidth; d.classList.add("go");
    setTimeout(function () { q(".b").textContent = ch; q(".ft").textContent = ch; d.classList.remove("go"); }, 380);
  }
  function monta(str) { box.textContent = ""; cells = []; for (var i = 0; i < str.length; i++) { var c = str.charAt(i); if (c >= "0" && c <= "9") { var d = cell("0"); cells.push(d); box.appendChild(d); } else { var s = document.createElement("i"); s.className = "fsep"; s.textContent = c; box.appendChild(s); } } }
  function mostra(str, escalonado) { var k = 0; for (var i = 0; i < str.length; i++) { var c = str.charAt(i); if (c >= "0" && c <= "9") { (function (d, ch, n) { if (escalonado) setTimeout(function () { set(d, ch); }, n * 140); else set(d, ch); })(cells[k], c, k); k++; } } }
  function recebe(v) {
    if (typeof v !== "number" || !isFinite(v) || v < 1) return;
    var str = fmt(v);
    if (atual === null) { monta(str); el.hidden = false; topo.classList.add("com-alunos"); setTimeout(function () { mostra(str, true); }, 350); }
    else if (v !== atual) { if (fmt(atual).length !== str.length) { monta(str); mostra(str, false); } else mostra(str, false); if (v > atual && mais) { mais.textContent = "+" + (v - atual); el.classList.remove("sobe"); void el.offsetWidth; el.classList.add("sobe"); } }
    atual = v; el.setAttribute("aria-label", fmt(v) + " alunos na Base FL");
  }
  function busca() {
    if (document.hidden) return;
    try { fetch(URL_RPC, { method: "POST", headers: { apikey: CHAVE, "Content-Type": "application/json" }, body: "{}" }).then(function (r) { return r.ok ? r.json() : null; }).then(recebe).catch(function () {}); } catch (e) {}
  }
  busca(); setInterval(busca, 30000); document.addEventListener("visibilitychange", function () { if (!document.hidden) busca(); });
})();
