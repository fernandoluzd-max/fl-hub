/* Base FL — envio de leads das páginas de venda.
   Uso: FLLead.salvar({ nome, email, celular, origem: 'base-captions', motivo: 'so-celular' })
   Grava pela função salvar_lead do Supabase. A tabela fica trancada:
   a página só consegue enviar, nunca ler a lista. As UTMs da URL vão junto. */
(function () {
  'use strict';
  if (window.FLLead) return;
  var SUPA = { url: 'https://otlaexuqyavpzxwzcsfo.supabase.co', key: 'sb_publishable_bAaw1t6NpZEgH8ePBztQWg_tE4kDfQR' };
  function utms() {
    var o = {}, q = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) { var v = q.get(k); if (v) o[k] = v; });
    return o;
  }
  function salvar(d) {
    d = d || {};
    return fetch(SUPA.url + '/rest/v1/rpc/salvar_lead', {
      method: 'POST',
      headers: { apikey: SUPA.key, Authorization: 'Bearer ' + SUPA.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_nome: d.nome || null, p_email: d.email || '', p_celular: d.celular || null,
        p_origem: d.origem || 'site', p_motivo: d.motivo || null, p_utm: utms()
      }),
      keepalive: true
    }).then(function (r) { if (!r.ok) throw new Error('lead ' + r.status); });
  }
  window.FLLead = { salvar: salvar };
})();
