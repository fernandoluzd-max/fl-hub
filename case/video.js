// CaseUp — entende o link de um vídeo: de que site é, como tocar dentro da página e que capa usar.
// Usado pela tela do editor (/case/) e pela página pública do portfólio (/e/).
(function () {
  var TIPOS = { reels: 'Reels', anuncio: 'Anúncio', youtube: 'YouTube', institucional: 'Institucional', evento: 'Evento', outro: 'Outro' };
  var NOMES = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', vimeo: 'Vimeo', drive: 'Google Drive' };
  function le(url) {
    var u; try { u = new URL(String(url || '').trim()); } catch (e) { return null; }
    if (u.protocol !== 'https:') return null;
    var h = u.hostname.replace(/^www\.|^m\./, ''), p = u.pathname, m;
    if (h === 'youtu.be' && (m = p.match(/^\/([\w-]{6,})/))) return yt(m[1], false);
    if (/(^|\.)youtube\.com$/.test(h)) {
      if ((m = p.match(/^\/shorts\/([\w-]{6,})/))) return yt(m[1], true);
      if ((m = p.match(/^\/(?:embed|live)\/([\w-]{6,})/))) return yt(m[1], false);
      if (u.searchParams.get('v')) return yt(u.searchParams.get('v').replace(/[^\w-]/g, ''), false);
      return null;
    }
    if (/(^|\.)instagram\.com$/.test(h) && (m = p.match(/\/(reel|reels|p|tv)\/([\w-]{5,})/)))
      return { site: 'instagram', id: m[2], vertical: true, embed: 'https://www.instagram.com/' + (m[1] === 'p' ? 'p' : 'reel') + '/' + m[2] + '/embed/', capa: null };
    if (/(^|\.)tiktok\.com$/.test(h)) {
      if ((m = p.match(/\/video\/(\d{8,})/))) return { site: 'tiktok', id: m[1], vertical: true, embed: 'https://www.tiktok.com/embed/v2/' + m[1], capa: null };
      return { site: 'tiktok', id: null, vertical: true, embed: null, capa: null };          // link curto (vm.tiktok.com): abre no TikTok
    }
    if (/(^|\.)vimeo\.com$/.test(h) && (m = p.match(/\/(\d{6,})/)))
      return { site: 'vimeo', id: m[1], vertical: false, embed: 'https://player.vimeo.com/video/' + m[1] + '?autoplay=1', capa: null };
    if (h === 'drive.google.com' && (m = p.match(/\/file\/d\/([\w-]{10,})/)))
      return { site: 'drive', id: m[1], vertical: false, embed: 'https://drive.google.com/file/d/' + m[1] + '/preview', capa: null };
    return null;
  }
  function yt(id, curto) {
    if (!id) return null;
    return { site: 'youtube', id: id, vertical: curto, embed: 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1', capa: 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' };
  }
  // capa pelo próprio site, quando ele informa (TikTok e Vimeo). Se não der, fica sem capa: o cartão mostra o nome do site.
  function buscaCapa(url) {
    var v = le(url); if (!v) return Promise.resolve(null);
    if (v.capa) return Promise.resolve(v.capa);
    var api = v.site === 'tiktok' ? 'https://www.tiktok.com/oembed?url=' : v.site === 'vimeo' ? 'https://vimeo.com/api/oembed.json?url=' : null;
    if (!api) return Promise.resolve(null);
    var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, 4000);
    return fetch(api + encodeURIComponent(url), { signal: ctl.signal }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { clearTimeout(t); var c = j && j.thumbnail_url; return c && /^https:\/\//.test(c) ? c : null; })
      .catch(function () { clearTimeout(t); return null; });
  }
  window.CaseVideo = { le: le, buscaCapa: buscaCapa, TIPOS: TIPOS, NOMES: NOMES };
})();
