/* Base FL — núcleo das ferramentas (uma conta, uma sessão, vários produtos)
   Tudo que as ferramentas têm em comum mora aqui:
     • sessão única (não derruba o login quando há várias abas abertas)
     • produtos liberados da conta, lidos de uma vez só
     • catálogo (nomes, preços e links vêm de /catalogo.js)
     • entrar / sair, teste grátis, eventos de uso e o bloco de "próximo passo"
   As páginas que o CLIENTE do editor abre (/b/, /p/, /c/) NÃO carregam este arquivo. */
(function () {
  'use strict';
  var SUPA = { url: 'https://otlaexuqyavpzxwzcsfo.supabase.co', key: 'sb_publishable_bAaw1t6NpZEgH8ePBztQWg_tE4kDfQR' };
  var CAT = window.CATALOGO || { produtos: [], kit: null };
  var POR_KEY = {}, POR_PACK = {};
  CAT.produtos.forEach(function (p) { POR_KEY[p.key] = p; POR_PACK[p.pack] = p; });
  var JORNADA = CAT.produtos.filter(function (p) { return p.jornada; }).sort(function (a, b) { return a.jornada - b.jornada; });

  // ---------- guarda local (se o navegador bloquear, segue na memória) ----------
  var mem = {}, temLS = (function () { try { var k = '__fl_t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; } })();
  var cofre = {
    get: function (k) { if (temLS) { try { return localStorage.getItem(k); } catch (e) {} } return k in mem ? mem[k] : null; },
    set: function (k, v) {
      if (temLS) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); return; } catch (e) {} }
      if (v == null) delete mem[k]; else mem[k] = v;
    },
    json: function (k) { try { return JSON.parse(cofre.get(k) || 'null'); } catch (e) { return null; } }
  };
  var agora = function () { return Date.now() / 1000; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var brl = function (v) { return 'R$ ' + Math.round(+v || 0).toLocaleString('pt-BR'); };

  function traduz(m) {
    m = String(m || '');
    var x;
    if ((x = m.match(/only request this after (\d+)/i))) return 'Aguarde ' + x[1] + ' segundos para pedir outro código.';
    if (/expired|invalid/i.test(m) && /token|otp|link/i.test(m)) return 'Código inválido ou expirado. Confira ou peça outro.';
    if (/rate limit/i.test(m)) return 'Muitas tentativas. Aguarde alguns minutos.';
    if (/failed to fetch|network|load failed/i.test(m)) return 'Sem conexão com a internet.';
    if (/row-level security|permission denied/i.test(m)) return 'Seu acesso a esta ferramenta não está ativo.';
    if (/JWT expired/i.test(m)) return 'Sua sessão expirou. Entre de novo.';
    return m;
  }

  // ---------- chamadas ao servidor ----------
  function cru(path, op) {
    op = op || {};
    var h = { apikey: SUPA.key, 'Content-Type': 'application/json' };
    if (op.token) h.Authorization = 'Bearer ' + op.token;
    if (op.prefer) h.Prefer = op.prefer;
    return fetch(SUPA.url + path, { method: op.method || 'GET', headers: h, body: op.body !== undefined ? JSON.stringify(op.body) : undefined, keepalive: !!op.keepalive })
      .then(function (r) {
        return r.text().then(function (t) {
          var j; try { j = t ? JSON.parse(t) : null; } catch (e) { j = t; }
          if (!r.ok) { var er = new Error(traduz((j && (j.msg || j.message || j.error_description || j.error)) || ('Erro ' + r.status))); er.status = r.status; er.code = j && (j.code || j.error_code); throw er; }
          return j;
        });
      }, function (e) { var er = new Error(traduz(e && e.message || 'Failed to fetch')); er.status = 0; throw er; });
  }

  // ---------- sessão (uma só, compartilhada por todas as ferramentas e abas) ----------
  var KS = 'fl_sess', ouvintes = [];
  function le() { var s = cofre.json(KS); return s && s.access_token && s.refresh_token ? s : null; }
  function grava(s) { cofre.set(KS, s ? JSON.stringify(s) : null); if (s && s.email) cofre.set('fl_email', s.email); }
  function deAuth(r, email) { return { access_token: r.access_token, refresh_token: r.refresh_token, expires_at: r.expires_at || Math.floor(agora()) + (r.expires_in || 3600), email: (r.user && r.user.email) || email }; }
  function comTrava(fn) { return (navigator.locks && navigator.locks.request) ? navigator.locks.request('fl_sess_renova', fn) : Promise.resolve().then(fn); }
  var renovando = null;
  function renova(forcar) {
    if (renovando) return renovando;
    renovando = comTrava(function () {
      var a = le(); if (!a) return false;
      if (!forcar && a.expires_at - agora() > 90) return true;                 // outra aba já renovou enquanto esperávamos
      return cru('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: a.refresh_token } }).then(function (r) {
        var agoraTem = le();
        if (!agoraTem) return false;                                             // a pessoa saiu enquanto a renovação estava no ar: não ressuscita o login
        if (agoraTem.refresh_token === a.refresh_token) grava(deAuth(r, a.email));
        return true;
      }, function (e) {
        if (e.status >= 400 && e.status < 500) {
          var b = le();
          if (b && b.refresh_token !== a.refresh_token) return true;            // outra aba renovou no meio do caminho: usa a dela
          grava(null); limpaEstado(); avisa(); return false;                    // a sessão acabou de verdade
        }
        return true;                                                           // sem internet: não derruba o login
      });
    }).then(function (v) { renovando = null; return v; }, function () { renovando = null; return !!le(); });
    return renovando;
  }
  function valida() { var s = le(); if (!s) return Promise.resolve(false); if (s.expires_at - agora() > 90) return Promise.resolve(true); return renova(false); }

  // ---------- imagens (foto e capas do CaseUp): envia o arquivo para a pasta do próprio usuário ----------
  function envia(caminho, blob) {
    return valida().then(function () {
      var s = le(); if (!s) throw new Error('Entre na sua conta para continuar.');
      return fetch(SUPA.url + '/storage/v1/object/' + caminho, { method: 'POST', body: blob,
        headers: { apikey: SUPA.key, Authorization: 'Bearer ' + s.access_token, 'Content-Type': blob.type || 'image/jpeg', 'cache-control': 'max-age=31536000' } })      // sem "x-upsert": cada imagem tem nome próprio, e o upsert exigia uma permissão a mais e era recusado
        .then(function (r) { if (!r.ok) throw new Error('Não consegui enviar a imagem. Tente de novo.'); return true; },
              function () { throw new Error('Sem conexão. Tente de novo.'); });
    });
  }
  function arquivo(caminho) { return SUPA.url + '/storage/v1/object/public/' + caminho; }

  function api(path, op) {
    op = op || {};
    if (op.auth === false) return cru(path, op);
    return valida().then(function () {
      var s = le(), o = Object.assign({}, op, { token: s ? s.access_token : null });
      return cru(path, o).catch(function (e) {
        if (e.status !== 401 || !s || op._de_novo) throw e;
        var b = le();                                                          // 401: o acesso venceu antes da hora. Renova uma vez e tenta de novo.
        var p = (b && b.access_token !== s.access_token) ? Promise.resolve(true) : renova(true);
        return p.then(function (ok) { if (!ok) throw e; return api(path, Object.assign({}, op, { _de_novo: true })); });
      });
    });
  }
  function rpc(nome, args, op) { return api('/rest/v1/rpc/' + nome, Object.assign({ method: 'POST', body: args || {} }, op || {})); }

  // ---------- estado da conta: produtos, perfil, trabalhos ----------
  var E = novoEstado(), carregando = null;
  function novoEstado() { return { logado: false, email: '', packs: {}, perfil: null, custo_mes: 0, trabalhos: [], testes: {}, jornada: true, fresco: false }; }
  function limpaEstado() { E = novoEstado(); Base.eu = E; cofre.set('fl_lic', null); carregando = null; }
  function aplica(r, email) {
    var packs = {};
    (r.licencas || []).forEach(function (l) { packs[l.pack] = { ate: l.ate ? new Date(l.ate).getTime() : null, valida: l.valida !== false }; });
    E = { logado: true, email: r.email || email, packs: packs, perfil: r.perfil || null, custo_mes: +r.custo_mes || 0, trabalhos: r.trabalhos || [], testes: r.testes || {}, jornada: r.jornada !== false, fresco: true };
    Base.eu = E;
    cofre.set('fl_lic', JSON.stringify({ email: E.email, packs: packs, em: Date.now() }));
  }
  function carrega(forcar) {
    if (carregando && !forcar) return carregando;
    carregando = valida().then(function (ok) {
      var s = le();
      if (!ok || !s) { limpaEstado(); return E; }
      return rpc('eu').then(function (r) {
        if (!r || r.ok === false) { limpaEstado(); return E; }
        aplica(r, s.email); return E;
      }, function (e) {
        if (e.status === 404) {       // banco ainda sem a jornada: lê só os produtos, do jeito antigo
          return api('/rest/v1/licenses?select=pack_id,status,expires_at').then(function (l) {
            aplica({ jornada: false, licencas: l.filter(function (x) { return x.status === 'active'; }).map(function (x) { return { pack: x.pack_id, ate: x.expires_at, valida: !x.expires_at || new Date(x.expires_at).getTime() > Date.now() }; }) }, s.email);
            return E;
          });
        }
        if (e.status === 401) { limpaEstado(); return E; }
        // sem internet: fica com o que já se sabia desta conta
        var c = cofre.json('fl_lic');
        if (c && c.email === s.email) { E = Object.assign(novoEstado(), { logado: true, email: c.email, packs: c.packs, fresco: false }); Base.eu = E; }
        return E;
      });
    });
    carregando.then(avisa, avisa);
    return carregando;
  }
  function avisa() { ouvintes.slice().forEach(function (f) { try { f(E); } catch (e) {} }); }
  // o que já se sabia desta conta aparece na hora (o servidor confirma em seguida, e é ele quem manda)
  (function () { var s = le(), c = cofre.json('fl_lic'); if (s && c && c.email === s.email) E = Object.assign(novoEstado(), { logado: true, email: c.email, packs: c.packs || {} }); else if (s) E = Object.assign(novoEstado(), { logado: true, email: s.email }); })();

  function tem(pack) { var l = E.packs[pack]; return !!l && (l.ate === null || l.ate > Date.now()) && l.valida !== false; }
  function vencido(pack) { var l = E.packs[pack]; return !!l && !tem(pack); }
  function diasRestantes(pack) { var l = E.packs[pack]; return l && l.ate ? Math.ceil((l.ate - Date.now()) / 864e5) : null; }

  // outra aba entrou ou saiu: esta acompanha, sem pedir código de novo
  // (troca de chave da mesma conta não precisa de nada: só recarrega se entrou, saiu ou mudou de conta)
  addEventListener('storage', function (e) {
    if (e.key !== KS) return;
    var s = le();
    if (!s) { if (E.logado) { limpaEstado(); avisa(); } return; }
    if (!E.logado || E.email !== s.email) { carregando = null; carrega(true); }
  });

  // ---------- chegou do app com um passe: entra direto, sem pedir código ----------
  // Se este navegador nunca usou essa conta, pergunta antes de entrar (um link de passe mandado por um estranho não loga ninguém à força).
  var passe = (function () {
    var m = location.hash.match(/(?:^#|&)passe=([\w-]+)/); if (!m) return Promise.resolve();
    try { history.replaceState(null, '', location.pathname + location.search + location.hash.replace(/(^#|&)passe=[\w-]+/, '$1').replace(/^#$/, '').replace(/^#&/, '#')); } catch (e) {}
    if (le()) return Promise.resolve();
    var tenta = function (tipo) { return cru('/auth/v1/verify', { method: 'POST', body: { type: tipo, token_hash: m[1] } }); };
    return tenta('magiclink').catch(function () { return tenta('email'); }).then(function (r) {
      if (!r || !r.access_token) return;
      var s = deAuth(r);
      if (s.email && s.email === cofre.get('fl_email')) { grava(s); return; }
      var f = abreFolha('<h2>Entrar nesta conta?</h2><p>Você veio do app Base FL. Entrar neste navegador como <b style="color:#F4F0E4">' + esc(s.email || '') + '</b>?</p><button class="flb-btn" id="flb-sim">Entrar</button><button class="flb-btn fantasma" id="flb-nao">Agora não</button>');
      f.corpo.querySelector('#flb-sim').onclick = function () { grava(s); fechaFolha(true); };
      f.corpo.querySelector('#flb-nao').onclick = function () { fechaFolha(false); };
      return f.fim;
    }, function () {});
  })();

  // ---------- visitante e eventos ----------
  function biscoito(k, v) {
    if (v === undefined) { var m = document.cookie.match(new RegExp('(?:^|; )' + k + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; }
    try { document.cookie = k + '=' + encodeURIComponent(v) + '; max-age=31536000; path=/; SameSite=Lax'; } catch (e) {}
  }
  function visitante() {
    var v = cofre.get('fl_vis') || biscoito('fl_vis');
    if (!v) { v = 'v' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); }
    cofre.set('fl_vis', v); biscoito('fl_vis', v); return v;
  }
  function evento(nome, pack, dados) {
    try {
      var s = le(), ok = s && s.expires_at - agora() > 5;
      cru('/rest/v1/rpc/evento', { method: 'POST', keepalive: true, token: ok ? s.access_token : null, body: { p_nome: nome, p_pack: pack || null, p_visitante: visitante(), p_dados: dados || null } }).catch(function () {});
    } catch (e) {}
  }

  // ---------- teste grátis: aparelho (guarda local + cookie) e conta (servidor) ----------
  var teste = {
    limite: function (pack) { var p = POR_PACK[pack]; return p && p.teste_gratis ? p.teste_gratis : 0; },
    usos: function (pack) { var k = 'fl_t_' + pack; return Math.max(+cofre.get(k) || 0, +biscoito(k) || 0, +(E.testes && E.testes[pack]) || 0); },
    resta: function (pack) { return Math.max(0, teste.limite(pack) - teste.usos(pack)); },
    usar: function (pack) {
      var k = 'fl_t_' + pack, n = teste.usos(pack) + 1;
      cofre.set(k, String(n)); biscoito(k, String(n));
      if (E.logado && E.jornada) rpc('teste', { p_pack: pack, p_usar: true }).then(function (r) { if (r && r.usos) { E.testes[pack] = r.usos; } }, function () {});
      return n;
    }
  };

  // ---------- visual compartilhado (entrar, próximo passo, trilha) ----------
  var css = '' +
    '.flb-veu{position:fixed;inset:0;z-index:900;background:rgba(5,6,6,.66);opacity:0;pointer-events:none;transition:opacity .2s}.flb-veu.on{opacity:1;pointer-events:auto}' +
    '.flb-folha{position:fixed;z-index:901;left:0;right:0;bottom:0;max-width:480px;margin:0 auto;background:#121513;border:1px solid #272D29;border-bottom:0;border-radius:24px 24px 0 0;padding:22px 20px calc(24px + env(safe-area-inset-bottom));transform:translateY(105%);transition:transform .3s cubic-bezier(.2,.8,.2,1);color:#F4F0E4;font:16px/1.5 "Archivo",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}' +
    '.flb-folha.on{transform:none}' +
    '@media (min-width:700px){.flb-folha{bottom:auto;top:50%;border-radius:24px;border-bottom:1px solid #272D29;transform:translateY(-46%);opacity:0;pointer-events:none;transition:all .2s}.flb-folha.on{transform:translateY(-50%);opacity:1;pointer-events:auto}}' +
    '.flb-folha h2{font-weight:850;font-stretch:114%;font-size:24px;line-height:1.1;letter-spacing:-.02em;margin:0 0 6px}' +
    '.flb-folha p{color:#9A968A;font-size:14.5px;margin:0 0 16px}' +
    '.flb-inp{width:100%;box-sizing:border-box;background:#151816;color:#F4F0E4;border:1px solid #272D29;border-radius:14px;padding:14px 16px;font:inherit;font-size:16px;outline:none}.flb-inp:focus{border-color:#F2A541}' +
    '.flb-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;box-sizing:border-box;cursor:pointer;font:inherit;font-weight:750;font-size:16px;border-radius:15px;padding:15px 18px;border:1px solid #F2A541;background:#F2A541;color:#17130B;margin-top:12px;text-decoration:none}' +
    '.flb-btn:disabled{opacity:.5;cursor:default}.flb-btn.fantasma{background:transparent;color:#F4F0E4;border-color:#272D29}' +
    '.flb-erro{color:#ff8f7a;font-size:14px;min-height:20px;margin-top:8px}' +
    '.flb-x{position:absolute;right:14px;top:14px;width:34px;height:34px;border-radius:50%;border:0;background:#1B1F1C;color:#9A968A;font-size:18px;cursor:pointer}' +
    '.flb-prox{position:relative;border:1px solid #272D29;border-radius:18px;padding:16px 16px 16px 18px;margin-top:22px;background:#151816;overflow:hidden;text-align:left}' +
    '.flb-prox::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:4px;border-radius:0 4px 4px 0;background:rgb(var(--flc,242,165,65))}' +
    '.flb-prox .rot{display:block;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9A968A;margin-bottom:4px}' +
    '.flb-prox b{display:block;font-size:17px;font-weight:800;line-height:1.25;color:#F4F0E4}' +
    '.flb-prox span.tx{display:block;color:#9A968A;font-size:14px;margin-top:3px}' +
    '.flb-prox .flb-btn{margin-top:14px;padding:13px 16px;font-size:15.5px}' +
    '.flb-prox .tem{display:block;margin-top:10px;font-size:13.5px;line-height:1.45;color:#9A968A}.flb-prox .tem i{font-style:normal;color:#F4F0E4}' +
    '.flb-prox .kit{display:block;margin-top:10px;text-align:center;font-size:13px;color:#9A968A;text-decoration:underline;text-underline-offset:3px;cursor:pointer;background:none;border:0;width:100%;font-family:inherit}' +
    '.flb-prox.trancado b::before{content:"";display:inline-block;width:15px;height:15px;margin-right:7px;vertical-align:-1px;background:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23F2A541\' stroke-width=\'2.6\' stroke-linecap=\'round\'%3E%3Crect x=\'5\' y=\'11\' width=\'14\' height=\'10\' rx=\'2\'/%3E%3Cpath d=\'M8 11V7a4 4 0 0 1 8 0v4\'/%3E%3C/svg%3E") center/contain no-repeat}' +
    '.flb-trilha{display:flex;gap:4px;margin:0 0 18px;padding:0;list-style:none;font:600 11.5px/1.2 "Archivo",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:#5f5c55}' +
    '.flb-trilha li{flex:1;min-width:0;text-align:center}' +
    '.flb-trilha a,.flb-trilha span{display:block;color:inherit;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-top:8px;border-top:3px solid #272D29;border-radius:2px}' +
    '.flb-trilha .ok a,.flb-trilha .ok span{border-top-color:rgba(242,165,65,.55);color:#9A968A}' +
    '.flb-trilha .at a,.flb-trilha .at span{border-top-color:#F2A541;color:#F4F0E4}';
  function poeCss() { if (document.getElementById('flb-css')) return; var s = document.createElement('style'); s.id = 'flb-css'; s.textContent = css; document.head.appendChild(s); }

  // ---------- entrar (uma tela só, para todas as ferramentas) ----------
  var folhaAberta = null;
  function fechaFolha(valor) {
    if (!folhaAberta) return; var f = folhaAberta; folhaAberta = null;
    f.veu.classList.remove('on'); f.el.classList.remove('on'); removeEventListener('keydown', f.tecla);
    setTimeout(function () { f.veu.remove(); f.el.remove(); }, 320);
    f.fim(valor);
  }
  function abreFolha(html) {
    poeCss(); if (folhaAberta) fechaFolha(false);
    var veu = document.createElement('div'); veu.className = 'flb-veu';
    var el = document.createElement('div'); el.className = 'flb-folha'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<button class="flb-x" aria-label="Fechar">×</button><div class="flb-c">' + html + '</div>';
    document.body.appendChild(veu); document.body.appendChild(el);
    var fim, p = new Promise(function (ok) { fim = ok; });
    var tecla = function (e) { if (e.key === 'Escape') fechaFolha(false); };
    folhaAberta = { veu: veu, el: el, fim: fim, tecla: tecla };
    veu.onclick = function () { fechaFolha(false); }; el.querySelector('.flb-x').onclick = function () { fechaFolha(false); };
    addEventListener('keydown', tecla);
    requestAnimationFrame(function () { veu.classList.add('on'); el.classList.add('on'); });
    return { el: el, corpo: el.querySelector('.flb-c'), fim: p };
  }
  // devolve uma promessa: true se entrou
  function login(op) {
    op = op || {};
    var f = abreFolha(''), email = cofre.get('fl_email') || '';
    var etapa = function (codigo) {
      f.corpo.innerHTML = '<h2>' + (codigo ? 'Digite o código' : 'Entre na sua conta') + '</h2>' +
        '<p>' + (codigo ? 'Enviamos um código para <b style="color:#F4F0E4">' + esc(email) + '</b>. Confira também o spam.' : 'Use o e-mail da compra. Você entra uma vez só e todas as suas ferramentas ficam liberadas neste aparelho.') + '</p>' +
        '<input class="flb-inp" id="flb-campo" ' + (codigo ? 'inputmode="numeric" autocomplete="one-time-code" placeholder="Código de 6 números"' : 'type="email" autocomplete="email" placeholder="seu@email.com" value="' + esc(email) + '"') + '>' +
        '<button class="flb-btn" id="flb-ir">' + (codigo ? 'Entrar' : 'Enviar código') + '</button>' +
        (codigo ? '<button class="flb-btn fantasma" id="flb-volta">Usar outro e-mail</button>' : '') + '<div class="flb-erro" id="flb-erro"></div>';
      var campo = f.corpo.querySelector('#flb-campo'), ir = f.corpo.querySelector('#flb-ir'), erro = f.corpo.querySelector('#flb-erro');
      setTimeout(function () { try { campo.focus(); } catch (e) {} }, 260);
      campo.onkeydown = function (e) { if (e.key === 'Enter') ir.click(); };
      if (codigo) f.corpo.querySelector('#flb-volta').onclick = function () { etapa(false); };
      ir.onclick = function () {
        ir.disabled = true; erro.textContent = '';
        var p;
        if (!codigo) {
          email = campo.value.trim().toLowerCase();
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { erro.textContent = 'Digite um e-mail válido.'; ir.disabled = false; return; }
          p = cru('/auth/v1/otp', { method: 'POST', body: { email: email, create_user: true } }).then(function () { etapa(true); });
        } else {
          var token = campo.value.replace(/\D/g, '');
          if (token.length < 6) { erro.textContent = 'Digite o código que chegou no e-mail.'; ir.disabled = false; return; }
          p = cru('/auth/v1/verify', { method: 'POST', body: { type: 'email', email: email, token: token } }).then(function (r) {
            grava(deAuth(r, email)); evento('login');
            return carrega(true).then(function () { fechaFolha(true); });
          });
        }
        p.catch(function (e) { erro.textContent = traduz(e.message); ir.disabled = false; });
      };
    };
    etapa(false);
    return f.fim;
  }
  function sair() { grava(null); limpaEstado(); avisa(); }

  // ---------- OFERTA: a regra única de "o que esta conta tem, o que falta e o que faz sentido oferecer" ----------
  // Todas as telas (ferramentas, páginas de venda, app) perguntam aqui. Nada de preço ou regra solta em outra tela.
  // A conta em si fica no catálogo (CATALOGO_OFERTA, gerada por tools/gera_catalogo.py), igual para site e app.
  function calculaOferta(temPack) {
    if (window.CATALOGO_OFERTA) return window.CATALOGO_OFERTA(temPack);
    var J = CAT.kit ? CAT.kit.inclui.map(function (k) { return POR_KEY[k]; }) : [];      // catálogo antigo em cache: sem oferta de conjunto
    return { tenho: J.filter(function (p) { return temPack(p.pack); }), faltam: J.filter(function (p) { return !temPack(p.pack); }), todas: null, completo: false };
  }
  function oferta() { return calculaOferta(tem); }
  function nomes(l) { l = l.map(function (p) { return p.nome; }); return l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]; }

  // ---------- comprar: sempre pela página do produto, com a origem anotada ----------
  // Nunca leva ao pagamento de algo que a conta já tem: nesse caso abre a ferramenta.
  function destinoCompra(key) {
    var o = oferta();
    if (key === 'kit') {
      if (o.completo) return { abrir: '/' };
      return { key: 'kit' };
    }
    var p = POR_KEY[key] || POR_PACK[key];
    if (p && tem(p.pack)) return { abrir: p.url || '/' };
    if (p && p.so_no_kit) return { key: 'kit' };              // as 4 ferramentas só são vendidas no Kit Freelancer
    if (p && p.bonus && p.bonus_de) return { key: p.bonus_de }; // bônus: quem vende é o produto principal
    return { key: p ? p.key : key };
  }
  function linkCompra(key, origem) {
    var d = destinoCompra(key); if (d.abrir) return d.abrir;
    var p = d.key === 'kit' ? CAT.kit : POR_KEY[d.key]; if (!p) return '/';
    return '/conheca/' + p.slug + '/?de=' + encodeURIComponent(origem || 'ferramenta');
  }
  function comprar(key, origem) {
    var d = destinoCompra(key);
    if (d.abrir) { (window.top || window).location.href = d.abrir; return; }
    var p = d.key === 'kit' ? CAT.kit : POR_KEY[d.key];
    // ferramenta aberta dentro da página de vendas (teste grátis): quem leva ao pagamento é a própria página
    try { if (window.top !== window && window.top.location.pathname.indexOf('/conheca/' + p.slug + '/') === 0) { window.top.postMessage({ fl: 'comprar' }, location.origin); return; } } catch (e) {}
    evento('checkout_clicked', p && p.pack || 'kit', { de: origem || 'ferramenta' });
    (window.top || window).location.href = linkCompra(d.key, origem);
  }

  // ---------- "Próximo passo": abre se a pessoa tem; mostra como liberar se não tem ----------
  // op: { alvo:'preco', titulo, texto, botao, abrir: url | função, origem:'briefing', rotulo }
  function proximo(op) {
    poeCss();
    var p = POR_KEY[op.alvo], d = document.createElement('div'), dono = tem(p.pack);
    d.className = 'flb-prox' + (dono ? '' : ' trancado'); d.style.setProperty('--flc', p.cor);
    var o = oferta(), avulsa = (vencido(p.pack) ? 'Renovar ' : 'Liberar ') + esc(p.nome) + ' · ' + brl(p.preco), h;
    if (dono) h = '<button class="flb-btn" data-a="abrir">' + esc(op.botao || 'Continuar') + ' →</button>';
    else if (o.todas && o.tenho.length)      // já é cliente: a oferta principal é liberar tudo o que falta
      h = '<span class="tem">Você já tem: <i>' + esc(nomes(o.tenho)) + '</i>. Faltam: <i>' + esc(nomes(o.faltam)) + '</i>.</span>' +
          '<button class="flb-btn" data-a="kit">' + esc(o.todas.rotulo) + '</button>' +
          (p.so_no_kit ? '' : '<button class="kit" data-a="liberar">ou só ' + esc(p.nome) + ' por ' + brl(p.preco) + '</button>');
    else if (p.so_no_kit) h = '<button class="flb-btn" data-a="kit">Conhecer o ' + esc(CAT.kit.nome) + ' · ' + brl(CAT.kit.preco) + '</button>';
    else h = '<button class="flb-btn" data-a="liberar">' + avulsa + '</button>' +
          (o.todas ? '<button class="kit" data-a="kit">ou ' + esc(o.todas.titulo.toLowerCase()) + ' por ' + brl(o.todas.preco) + '</button>' : '');
    d.innerHTML = '<span class="rot">' + esc(op.rotulo || 'Próximo passo') + '</span><b>' + esc(op.titulo) + '</b>' + (op.texto ? '<span class="tx">' + esc(op.texto) + '</span>' : '') + h;
    d.addEventListener('click', function (e) {
      var a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'abrir') { if (typeof op.abrir === 'function') op.abrir(); else location.href = op.abrir; }
      else { evento('locked_feature_clicked', p.pack, { de: op.origem || '' }); comprar(a.dataset.a === 'kit' ? 'kit' : op.alvo, 'jornada-' + (op.origem || 'ferramenta')); }
    });
    return d;
  }

  // ---------- trilha: Briefing · Preço · Proposta · Contrato · Organizar ----------
  var PASSOS = [['briefing', 'Briefing', 'briefing'], ['preco', 'Preço', 'preco'], ['proposta', 'Proposta', 'preco'], ['contrato', 'Contrato', 'contrato'], ['organizar', 'Organizar', 'painel']];
  function feitos(t) {
    if (!t) return {};
    return { briefing: !!t.tem_briefing || !!t.briefing, preco: !!t.tem_preco || !!t.preco, proposta: !!t.proposta_status, contrato: !!t.contrato_status, organizar: !!t.organizado || !!t.demanda_feita };
  }
  function trilha(atual, t) {
    poeCss();
    var ul = document.createElement('ul'), f = feitos(t); ul.className = 'flb-trilha'; ul.setAttribute('aria-label', 'Etapas do trabalho');
    ul.innerHTML = PASSOS.map(function (p) {
      var prod = POR_KEY[p[2]], dono = tem(prod.pack), cls = p[0] === atual ? 'at' : f[p[0]] ? 'ok' : '';
      var url = prod.url + (t && t.id ? '?t=' + t.id : '');
      return '<li class="' + cls + '">' + (dono && p[0] !== atual ? '<a href="' + url + '">' + p[1] + '</a>' : '<span>' + p[1] + '</span>') + '</li>';
    }).join('');
    return ul;
  }
  function trabalhoDaUrl() { var t = new URLSearchParams(location.search).get('t'); return t && /^[0-9a-f-]{36}$/i.test(t) ? t : null; }

  var Base = {
    SUPA: SUPA, CAT: CAT, produto: function (k) { return POR_KEY[k] || POR_PACK[k] || null; }, jornada: JORNADA,
    eu: E, sessao: le, email: function () { var s = le(); return s ? s.email : ''; },
    pronto: null, carrega: carrega, tem: tem, vencido: vencido, dias: diasRestantes,
    api: api, rpc: rpc, envia: envia, arquivo: arquivo, traduz: traduz, login: login, sair: sair, aoMudar: function (f) { ouvintes.push(f); },
    evento: evento, teste: teste, comprar: comprar, linkCompra: linkCompra, oferta: oferta, calculaOferta: calculaOferta, nomes: nomes, proximo: proximo, trilha: trilha, trabalhoDaUrl: trabalhoDaUrl,
    folha: abreFolha, fechaFolha: fechaFolha, esc: esc, brl: brl, cofre: cofre
  };
  window.Base = Base;
  Base.pronto = passe.then(function () { return carrega(true); });
})();
