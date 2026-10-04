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

  // ---------- passo a passo de instalação: uma folha que sobe do pé da tela, sem trocar de página ----------
  var CSS = '.flg-f{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.62);display:flex;align-items:flex-end;justify-content:center;animation:flgf .25s both}@keyframes flgf{from{opacity:0}}' +
    '.flg{width:100%;max-width:520px;background:#0D0F0E;color:#F4F0E4;border-radius:26px 26px 0 0;border:1px solid #262D28;border-bottom:0;padding:10px 16px calc(env(safe-area-inset-bottom) + 16px);font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;animation:flgs .35s cubic-bezier(.2,.8,.2,1) both;max-height:96dvh;overflow:auto}@keyframes flgs{from{transform:translateY(60px);opacity:0}}' +
    '.flg-p{width:42px;height:5px;border-radius:9px;background:#2c342f;margin:0 auto 12px}' +
    '.flg-h{display:flex;align-items:center;gap:12px;margin-bottom:12px}.flg-h img{width:44px;height:44px;border-radius:12px}.flg-h b{display:block;font-family:"Archivo",sans-serif;font-weight:800;font-size:19px;line-height:1.15}.flg-h small{display:block;color:#A9B0AA;font-size:13.5px}.flg-h span{flex:1}' +
    '.flg-x{border:1px solid #262D28;background:transparent;color:#A9B0AA;border-radius:50%;width:40px;height:40px;font-size:20px;line-height:1;cursor:pointer}' +
    '.flg .guia{border:0;padding:0;background:transparent}' + '/* passo a passo: uma tela de celular desenhada, que mostra onde tocar */.guia{border:1px solid #262D28;border-radius:24px;background:#121413;padding:16px;display:grid;gap:14px}.guia-c{display:flex;align-items:center;justify-content:space-between;gap:12px}.guia-c small{font-weight:800;font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:#F2A541}.guia-p{display:flex;gap:6px}.guia-p i{width:22px;height:4px;border-radius:9px;background:#262D28;transition:background .3s}.guia-p i.on{background:#F2A541}.guia-tela{position:relative;height:250px;border-radius:22px;background:#07090a;border:1px solid #1c211e;overflow:hidden}.guia-t b{display:block;font-family:"Archivo",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-stretch:108%;font-weight:800;font-size:21px;line-height:1.15;letter-spacing:-.01em}.guia-t{min-height:112px}.guia-t p{color:#A9B0AA;font-size:15.5px;margin-top:6px}.guia-nav{display:grid;grid-template-columns:auto 1fr;gap:10px}.guia-nav button{font:inherit;font-weight:750;font-size:16px;border-radius:14px;padding:14px 18px;min-height:52px;border:1px solid #262D28;background:transparent;color:#F4F0E4;cursor:pointer}.guia-nav button.vai{background:#F2A541;border-color:#F2A541;color:#1a1206}.guia-nav button:disabled{opacity:.35}/* peças do desenho */.gt{position:absolute;inset:0;animation:gt .45s cubic-bezier(.2,.8,.2,1) both}@keyframes gt{from{opacity:0;transform:translateX(14px)}}.gt .pag{position:absolute;inset:0 0 46px;padding:16px;display:grid;gap:9px;align-content:start}.gt .pag i{display:block;height:9px;border-radius:9px;background:#191e1b}.gt .pag i:nth-child(1){width:54%;height:14px;background:#232a26}.gt .pag i:nth-child(3){width:82%}.gt .pag i:nth-child(4){width:64%}.gt .barra{position:absolute;left:0;right:0;bottom:0;height:46px;background:#121614;border-top:1px solid #1f2622;display:flex;align-items:center;justify-content:space-around;padding:0 10px}.gt .barra.cima{top:0;bottom:auto;border-top:0;border-bottom:1px solid #1f2622;justify-content:space-between;gap:10px}.gt .barra.cima+.pag{inset:46px 0 0}.gt .url{flex:1;height:26px;border-radius:9px;background:#1b211d;color:#6f7a72;font-size:11.5px;display:flex;align-items:center;padding:0 10px}.gt .ic{width:30px;height:30px;display:grid;place-items:center;border-radius:50%;position:relative;color:#5e6962}.gt .ic svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.gt .alvo{color:#F2A541}.gt .alvo::before,.gt .alvo::after{content:"";position:absolute;inset:-5px;border-radius:inherit;border:2px solid #F2A541;animation:pulso 1.6s ease-out infinite}.gt .alvo::after{animation-delay:.8s}@keyframes pulso{from{opacity:.9;transform:scale(.8)}to{opacity:0;transform:scale(1.7)}}.gt .folha{position:absolute;left:10px;right:10px;bottom:10px;border-radius:18px;background:#171c19;border:1px solid #242b27;padding:8px;display:grid;gap:6px;animation:sobe .5s cubic-bezier(.2,.8,.2,1) both}.gt .folha.cima{bottom:auto;top:10px;left:auto;width:74%;animation-name:desce}@keyframes sobe{from{transform:translateY(40px);opacity:0}}@keyframes desce{from{transform:translateY(-20px);opacity:0}}.gt .linha{display:flex;align-items:center;justify-content:space-between;gap:10px;border-radius:12px;padding:11px 12px;font-size:13.5px;color:#7d8880;background:#1d2320;position:relative}.gt .linha svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}.gt .linha.alvo{color:#1a1206;background:#F2A541;font-weight:800}.gt .linha.alvo::before,.gt .linha.alvo::after{border-radius:14px;inset:-4px}@keyframes pulso2{from{opacity:.8}to{opacity:0;transform:scale(1.06,1.35)}}.gt .linha.alvo::before,.gt .linha.alvo::after{animation-name:pulso2}.gt .casa{position:absolute;inset:0;padding:22px 20px;display:grid;grid-template-columns:repeat(4,1fr);gap:16px 12px;align-content:start;background:linear-gradient(160deg,#16201c,#0a0d0c)}.gt .casa i{aspect-ratio:1;border-radius:26%;background:#1d2622}.gt .casa span{display:grid;justify-items:center;gap:4px;font-size:9.5px;color:#F4F0E4;font-weight:650;animation:cai .7s cubic-bezier(.2,1.4,.3,1) .25s both}.gt .casa span img{width:100%;aspect-ratio:1;border-radius:26%;box-shadow:0 8px 22px -6px rgba(242,165,65,.8)}@keyframes cai{from{transform:scale(.2);opacity:0}}.gt .conf{position:absolute;left:14px;right:14px;top:50%;transform:translateY(-50%);border-radius:18px;background:#171c19;border:1px solid #242b27;padding:14px;display:grid;gap:12px;animation:sobe .5s both}.gt .conf .app{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:700}.gt .conf .app img{width:38px;height:38px;border-radius:10px}.gt .conf .app small{display:block;font-weight:500;color:#7d8880;font-size:11.5px}.gt .conf .bts{display:flex;justify-content:flex-end;gap:8px}.gt .conf .bts em{font-style:normal;font-size:13px;padding:9px 14px;border-radius:10px;color:#7d8880;position:relative}.gt .conf .bts em.alvo{background:#F2A541;color:#1a1206;font-weight:800}.gt .conf .bts em.alvo::before,.gt .conf .bts em.alvo::after{border-radius:12px;inset:-4px;animation-name:pulso2}';
  function poeCss() { if (document.getElementById('flg-css')) return; var s = document.createElement('style'); s.id = 'flg-css'; s.textContent = CSS; document.head.appendChild(s); }
  var IC = { comp: '<svg viewBox="0 0 24 24"><path d="M12 15V4M8 7.500l4-4 4 4M6 11H5v9h14v-9h-1"/></svg>', mais: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 9v6M9 12h6"/></svg>',
    pts: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.300" fill="currentColor"/><circle cx="12" cy="12" r="1.300" fill="currentColor"/><circle cx="12" cy="19" r="1.300" fill="currentColor"/></svg>', fora: '<svg viewBox="0 0 24 24"><path d="M14 5h5v5M19 5l-8 8M11 6H6a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-5"/></svg>',
    seta: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>', casa: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10.500l5 5 5-5M5 20h14"/></svg>' };
  function passos() {
    var pag = '<div class="pag"><i></i><i></i><i></i><i></i></div>', NAV = ios ? 'Safari' : 'Chrome';
    var tIos = '<div class="gt">' + pag + '<div class="barra"><span class="ic">' + IC.seta + '</span><span class="ic alvo">' + IC.comp + '</span><span class="ic">' + IC.mais + '</span></div></div>';
    var tAnd = '<div class="gt"><div class="barra cima"><span class="url">basefl.com/app</span><span class="ic alvo">' + IC.pts + '</span></div>' + pag + '</div>';
    var folha = function (linhas, cima) { return '<div class="gt">' + (cima ? '<div class="barra cima"><span class="url">basefl.com/app</span><span class="ic">' + IC.pts + '</span></div>' : '') + pag + '<div class="folha' + (cima ? ' cima' : '') + '">' + linhas.map(function (l) { return '<div class="linha' + (l[2] ? ' alvo' : '') + '"><span>' + l[0] + '</span>' + l[1] + '</div>'; }).join('') + '</div></div>'; };
    var conf = function (bt) { return '<div class="gt">' + pag + '<div class="conf"><div class="app"><img src="/app/icone-192.png" alt=""><span>Base FL<small>basefl.com</small></span></div><div class="bts"><em>Cancelar</em><em class="alvo">' + bt + '</em></div></div></div>'; };
    var casa = '<div class="gt"><div class="casa"><i></i><i></i><i></i><i></i><i></i><span><img src="/app/icone-192.png" alt="">Base FL</span><i></i><i></i></div></div>';
    if (dentro) return { nav: NAV, lista: [
      ['Toque nos três pontinhos', 'Ficam no canto de cima da tela, neste app em que você está agora.', tAnd],
      ['Escolha “Abrir no navegador”', 'Pode aparecer como “Abrir no ' + NAV + '”. A página abre de novo e, lá, dá para colocar o Base FL na tela do celular.', folha([['Copiar link', ''], ['Abrir no navegador', IC.fora, 1], ['Compartilhar', '']], true)]] };
    if (ios) return { nav: NAV, lista: [
      ['Toque em Compartilhar', 'É o quadradinho com a seta para cima, na barra do navegador.', tIos],
      ['Escolha “Adicionar à Tela de Início”', 'Se não aparecer de primeira, role a lista um pouco para baixo.', folha([['Copiar', ''], ['Adicionar à Tela de Início', IC.mais, 1], ['Adicionar aos Favoritos', '']])],
      ['Toque em Adicionar', 'Fica no canto de cima da tela. Pronto: o ícone do Base FL aparece na tela do seu celular.', conf('Adicionar')]] };
    return { nav: NAV, lista: [
      ['Toque nos três pontinhos', 'Ficam no canto de cima do navegador.', tAnd],
      ['Escolha “Adicionar à tela inicial”', 'Em alguns celulares aparece como “Instalar app”.', folha([['Nova guia', ''], ['Adicionar à tela inicial', IC.casa, 1], ['Configurações', '']], true)],
      ['Toque em Instalar', 'Pronto: o ícone do Base FL aparece na tela do seu celular.', conf('Instalar')]] };
  }
  function guia() {
    poeCss();
    var P = passos(), L = P.lista, at = 0, relogio = null, mexeu = false;
    var f = document.createElement('div'); f.className = 'flg-f'; f.setAttribute('role', 'dialog'); f.setAttribute('aria-modal', 'true'); f.setAttribute('aria-label', 'Como colocar o Base FL na tela do celular');
    f.innerHTML = '<div class="flg"><div class="flg-p"></div><div class="flg-h"><img src="/app/icone-192.png" alt=""><span><b>' + (dentro ? 'Primeiro, abra no navegador' : 'Base FL na tela do celular') + '</b><small>' + (dentro ? 'Aqui dentro o celular não deixa instalar.' : 'São ' + L.length + ' toques. Olha onde:') + '</small></span><button class="flg-x" type="button" aria-label="Fechar">×</button></div>' +
      '<div class="guia"><div class="guia-c"><small id="flg-n"></small><span class="guia-p" id="flg-pp">' + L.map(function () { return '<i></i>'; }).join('') + '</span></div><div class="guia-tela" id="flg-tela" aria-hidden="true"></div><div class="guia-t"><b id="flg-t"></b><p id="flg-d"></p></div>' +
      '<div class="guia-nav"><button type="button" id="flg-volta">Voltar</button><button type="button" class="vai" id="flg-vai">Próximo</button></div></div></div>';
    document.body.appendChild(f);
    var q = function (id) { return f.querySelector('#' + id); };
    function fecha() { clearInterval(relogio); f.remove(); }
    function passo(i) {
      at = Math.max(0, Math.min(L.length - 1, i));
      q('flg-n').textContent = 'Passo ' + (at + 1) + ' de ' + L.length; q('flg-t').textContent = L[at][0]; q('flg-d').textContent = L[at][1]; q('flg-tela').innerHTML = L[at][2];
      [].forEach.call(q('flg-pp').children, function (e, k) { e.classList.toggle('on', k <= at); });
      q('flg-volta').disabled = at === 0;
      q('flg-vai').textContent = at < L.length - 1 ? 'Próximo' : dentro ? 'Copiar o link' : 'Entendi';
    }
    var para = function () { mexeu = true; clearInterval(relogio); };
    q('flg-volta').onclick = function () { para(); passo(at - 1); };
    q('flg-vai').onclick = function () {
      para(); if (at < L.length - 1) return passo(at + 1);
      if (!dentro) return fecha();
      window.FLPWA.copia('https://basefl.com/app/').then(function (ok) { q('flg-vai').textContent = ok ? 'Link copiado. Cole no ' + P.nav : 'basefl.com/app'; });
    };
    f.querySelector('.flg-x').onclick = fecha;
    f.addEventListener('click', function (e) { if (e.target === f) fecha(); });
    var x0 = null, tela = q('flg-tela');
    tela.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    tela.addEventListener('touchend', function (e) { if (x0 == null) return; var d = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(d) > 40) { para(); passo(at + (d < 0 ? 1 : -1)); } }, { passive: true });
    passo(0);
    var calmo = false; try { calmo = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (!calmo) relogio = setInterval(function () { if (!mexeu) passo((at + 1) % L.length); }, 4200);
  }

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
    // o botão "Instalar" de qualquer tela chama isto: instala com um toque quando o aparelho deixa; senão, mostra onde tocar
    pedir: function () { return this.instala().then(function (r) { if (r === 'manual') guia(); return r; }); },
    guia: guia,
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
