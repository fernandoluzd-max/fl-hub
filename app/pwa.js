// Base FL no celular: descobre o aparelho e cuida do "Instalar".
// Usado pela área de membros (/app/) e pela página de instalar (/instalar/).
(function () {
  var ua = navigator.userAgent, u = ua.toLowerCase();
  var ipad = /ipad/.test(u) || (/macintosh/.test(u) && navigator.maxTouchPoints > 1);     // o iPad se apresenta como Mac
  var ios = /iphone|ipod/.test(u) || ipad, android = /android/.test(u);
  var celular = ios || android || /mobile/.test(u);
  // navegador de dentro de outro app (Instagram, Facebook, TikTok...): ali não existe "adicionar à tela inicial"
  var dentro = /instagram|fban|fbav|fb_iab|tiktok|musical_ly|bytedance|line\/|snapchat|linkedinapp|twitter|pinterest/.test(u);
  var instalado = false;
  try { instalado = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) {}
  var pedido = null, ouvintes = [];
  function avisa() { ouvintes.forEach(function (f) { try { f(); } catch (e) {} }); }
  // Android (Chrome, Edge, Samsung): o navegador entrega um pedido de instalação que a gente dispara no toque do botão
  addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); pedido = e; avisa(); });
  addEventListener('appinstalled', function () { pedido = null; instalado = true; avisa(); });
  if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' }).catch(function () {}); } catch (e) {} }

  window.FLPWA = {
    celular: celular, ios: ios, android: android, dentro: dentro,
    instalado: function () { return instalado; },
    direto: function () { return !!pedido; },                 // dá para instalar com um toque?
    // devolve 'instalado', 'recusado' ou 'manual' (quando o aparelho exige o caminho pelo menu)
    instala: function () {
      if (!pedido) return Promise.resolve('manual');
      var p = pedido; pedido = null;
      return p.prompt().then(function () { return p.userChoice; }).then(function (r) {
        avisa(); return r && r.outcome === 'accepted' ? 'instalado' : 'recusado';
      }, function () { avisa(); return 'manual'; });
    },
    aoMudar: function (f) { ouvintes.push(f); },
    // manda um link para a própria pessoa: usa o compartilhar do celular; se não houver, o WhatsApp
    manda: function (titulo, texto, link) {
      if (navigator.share) return navigator.share({ title: titulo, text: texto, url: link }).then(function () { return true; }, function () { return false; });
      location.href = 'https://wa.me/?text=' + encodeURIComponent(texto + ' ' + link); return Promise.resolve(true);
    },
    copia: function (txt) {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt).then(function () { return true; }, function () { return false; });
      try { var a = document.createElement('textarea'); a.value = txt; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); var ok = document.execCommand('copy'); a.remove(); return Promise.resolve(ok); }
      catch (e) { return Promise.resolve(false); }
    }
  };
})();
