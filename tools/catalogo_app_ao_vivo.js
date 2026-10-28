// AO VIVO NO APP INSTALADO (anexado ao catalogo.js por tools/gera_catalogo.py).
// O app carrega https://basefl.com/catalogo.js toda vez que abre. Este trecho atualiza a tela dos apps
// antigos sem precisar baixar de novo: troca a linha antiga "Backgrounds e Overlays" pelas pastas de bônus do catálogo.
// Só roda dentro do app (window.__TAURI__). Nos apps novos (0.10.30+) a linha antiga não existe e nada muda.
(function () {
  if (typeof window === 'undefined' || !window.__TAURI__ || typeof document === 'undefined') return;
  var leg = (window.CATALOGO && window.CATALOGO.produtos || []).filter(function (p) { return p.key === 'legendas'; })[0] || {};
  var P = (leg.bonus_pastas || []).filter(function (x) { return x && /^https:\/\/drive\.google\.com\//.test(String(x.link || '')); });
  if (!P.length) return;
  var IC = { antes: 'bonus-antes', camadas: 'bonus-overlays', musica: 'bonus-musicas' };
  function troca() {
    var linhas = document.querySelectorAll('.bon-i');
    for (var i = 0; i < linhas.length; i++) {
      var li = linhas[i], b = li.querySelector('b');
      if (!b || b.textContent.trim() !== 'Backgrounds e Overlays') continue;
      var velho = li.querySelector('button'), cor = li.style.getPropertyValue('--b'), bx = li.closest('.bon'), frag = document.createDocumentFragment();
      P.forEach(function (x) {
        var n = document.createElement('div'); n.className = 'bon-i'; if (cor) n.style.setProperty('--b', cor);
        n.innerHTML = '<img src="https://basefl.com/ui/icones/' + (IC[x.icone] || 'bonus-overlays') + '.png" alt="" width="44" height="44" draggable="false"><span><b></b><small></small></span>';
        n.querySelector('b').textContent = String(x.nome || 'Pasta de bônus');
        n.querySelector('small').textContent = String(x.txt || '');
        if (velho) {   // só quem comprou os Títulos tem o botão Abrir
          var bt = velho.cloneNode(true);
          bt.onclick = function () { try { window.__TAURI__.opener.openUrl(x.link); } catch (e) {} };
          n.appendChild(bt);
        } else { var em = document.createElement('em'); em.textContent = 'Bônus'; n.appendChild(em); }
        frag.appendChild(n);
      });
      li.parentNode.replaceChild(frag, li);
      if (bx) { var t = bx.querySelector('.bon-t b'); if (t) t.textContent = '+ ' + bx.querySelectorAll('.bon-i').length + ' bônus'; }
    }
  }
  try { new MutationObserver(troca).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', troca); else troca();
})();
