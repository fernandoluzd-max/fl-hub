/* color.js — tudo que envolve cor: extrair paleta de uma imagem (canvas, local,
   sem rede), converter HSL/HEX, "encaixar" uma cor do cliente dentro dos limites
   de um estilo (preservando o HUE do cliente, só prendendo saturação/luminosidade),
   e calcular contraste WCAG para o aviso de legibilidade da legenda. */

const BaseFLColor = (() => {
  // ---------- conversões ----------

  function hexParaRgb(hex) {
    hex = String(hex || "").replace("#", "").trim();
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    if (hex.length !== 6) return { r: 0, g: 0, b: 0 };
    const num = parseInt(hex, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function rgbParaHex(r, g, b) {
    const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
    return "#" + c(r) + c(g) + c(b);
  }

  function rgbParaHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    const d = max - min;
    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      switch (max) {
        case r: h = ((g - b) / d) % 6; break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h, s: s * 100, l: l * 100 };
  }

  function hslParaRgb(h, s, l) {
    s /= 100; l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
  }

  function hexParaHsl(hex) {
    const { r, g, b } = hexParaRgb(hex);
    return rgbParaHsl(r, g, b);
  }

  function hslParaHex(h, s, l) {
    const { r, g, b } = hslParaRgb(h, s, l);
    return rgbParaHex(r, g, b);
  }

  // ---------- extração de paleta de uma imagem (canvas oculto) ----------

  function carregarImagemDeBlobOuUrl(fonte) {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        if (fonte instanceof Blob) {
          img.src = URL.createObjectURL(fonte);
        } else {
          img.crossOrigin = "anonymous";
          img.src = fonte;
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Extrai as cores dominantes de uma imagem.
   * Abordagem: desenha a imagem reduzida num canvas oculto (performance),
   * amostra 1 em cada N pixels, agrupa por "balde" de HSL (quantização simples
   * por faixas de matiz/saturação/luminosidade — não é k-means real, mas é
   * leve, roda 100% no navegador e dá resultado bom o suficiente para logo/fotos
   * de cliente). Retorna as cores mais frequentes.
   */
  async function extrairPaletaDeImagem(fonteImagem, maxCores = 6) {
    const img = await carregarImagemDeBlobOuUrl(fonteImagem);
    const ladoMax = 160; // reduz bastante antes de amostrar: suficiente para pegar a paleta, rápido mesmo em fotos grandes
    const escala = Math.min(1, ladoMax / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    const w = Math.max(1, Math.round((img.naturalWidth || img.width) * escala));
    const h = Math.max(1, Math.round((img.naturalHeight || img.height) * escala));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);

    let dados;
    try {
      dados = ctx.getImageData(0, 0, w, h).data;
    } catch (e) {
      // getImageData pode falhar por CORS se a imagem vier de outra origem — não deve acontecer aqui pois é tudo local
      throw new Error("Não foi possível ler os pixels da imagem (CORS?).");
    }

    const baldes = new Map(); // chave "hBucket-sBucket-lBucket" -> {h,s,l,count,r,g,b}
    const passo = 2; // a cada 2 pixels (já reduzimos a imagem antes, então isso é só um reforço de performance)

    for (let i = 0; i < dados.length; i += 4 * passo) {
      const r = dados[i], g = dados[i + 1], b = dados[i + 2], a = dados[i + 3];
      if (a < 120) continue; // ignora pixels muito transparentes (logos com fundo vazado)
      const { h, s, l } = rgbParaHsl(r, g, b);
      if (l < 4 || l > 97) continue; // ignora preto/branco quase puro — raramente é "a cor da marca"
      const hBucket = Math.round(h / 15) * 15;
      const sBucket = Math.round(s / 20) * 20;
      const lBucket = Math.round(l / 20) * 20;
      const chave = hBucket + "-" + sBucket + "-" + lBucket;
      if (!baldes.has(chave)) {
        baldes.set(chave, { somaR: 0, somaG: 0, somaB: 0, count: 0 });
      }
      const bucket = baldes.get(chave);
      bucket.somaR += r;
      bucket.somaG += g;
      bucket.somaB += b;
      bucket.count += 1;
    }

    const lista = Array.from(baldes.values())
      .filter((b) => b.count > 2)
      .map((b) => {
        const r = b.somaR / b.count, g = b.somaG / b.count, bl = b.somaB / b.count;
        return { hex: rgbParaHex(r, g, bl), count: b.count, ...rgbParaHsl(r, g, bl) };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, maxCores);

    try { URL.revokeObjectURL(img.src); } catch (e) {}

    return lista;
  }

  // ---------- encaixe de cor no "papel" de um estilo ----------

  /**
   * Recebe uma cor (hex) do cliente e os limites de um papel da paleta do estilo
   * ({saturacaoMin,saturacaoMax,luminosidadeMin,luminosidadeMax}).
   * Preserva o HUE da cor do cliente (é o que carrega a identidade da marca) e
   * prende saturação/luminosidade dentro da faixa — assim o estilo nunca sai
   * do ar, só "veste" a cor do cliente.
   */
  function encaixarCorNoPapel(corHex, limites) {
    if (!corHex || !limites) return corHex;
    const { h, s, l } = hexParaHsl(corHex);
    const sAlvo = Math.max(limites.saturacaoMin, Math.min(limites.saturacaoMax, s));
    const lAlvo = Math.max(limites.luminosidadeMin, Math.min(limites.luminosidadeMax, l));
    return hslParaHex(h, sAlvo, lAlvo);
  }

  /** Monta a paleta final do cliente dentro de um estilo: para cada papel
   *  (fundo/texto/destaque/apoio) escolhe a melhor cor extraída do cliente e
   *  encaixa dentro dos limites daquele papel. Se não houver cores extraídas,
   *  usa o meio da faixa do próprio estilo (neutro) como respaldo. */
  function montarPaletaCliente(estilo, coresCliente) {
    const papeis = ["fundo", "texto", "destaque", "apoio"];
    const cores = (coresCliente && coresCliente.length ? coresCliente : []).slice();
    const resultado = {};
    papeis.forEach((papel, idx) => {
      const limites = estilo.paleta[papel];
      let corBase = cores[idx % Math.max(1, cores.length)];
      if (!corBase) {
        // fallback: meio da faixa do próprio estilo, hue neutro âmbar (210 só pra ter algo definido)
        const lMid = (limites.luminosidadeMin + limites.luminosidadeMax) / 2;
        const sMid = (limites.saturacaoMin + limites.saturacaoMax) / 2;
        resultado[papel] = hslParaHex(36, sMid, lMid);
        return;
      }
      resultado[papel] = encaixarCorNoPapel(corBase.hex || corBase, limites);
    });
    return resultado;
  }

  // ---------- contraste WCAG ----------

  function canalParaLinear(c) {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function luminanciaRelativa(hex) {
    const { r, g, b } = hexParaRgb(hex);
    const R = canalParaLinear(r), G = canalParaLinear(g), B = canalParaLinear(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }

  function contraste(hexA, hexB) {
    const l1 = luminanciaRelativa(hexA);
    const l2 = luminanciaRelativa(hexB);
    const claro = Math.max(l1, l2), escuro = Math.min(l1, l2);
    return (claro + 0.05) / (escuro + 0.05);
  }

  // ---------- compatibilidade personalidade-cliente x estilo ----------

  function distanciaPersonalidade(a, b) {
    const dx = (a.sobrioVibrante || 0) - (b.sobrioVibrante || 0);
    const dy = (a.classicoModerno || 0) - (b.classicoModerno || 0);
    const dz = (a.serioLeve || 0) - (b.serioLeve || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /** Quanto MAIOR, melhor o encaixe. Distância máxima possível é sqrt(12) ≈ 3.46
   *  (cada eixo varia -1..1, diferença máxima 2 por eixo). Normalizamos para 0-100
   *  e aplicamos bônus/penalidade de nicho. */
  function compatibilidadeEstilo(cliente, estilo) {
    const dist = distanciaPersonalidade(cliente.personalidade || {}, estilo.personalidade || {});
    const distMax = Math.sqrt(12);
    let score = (1 - dist / distMax) * 100;
    const nicho = cliente.nicho;
    if (nicho && Array.isArray(estilo.nichosRecomendados) && estilo.nichosRecomendados.includes(nicho)) {
      score += 12;
    }
    if (nicho && Array.isArray(estilo.nichosEvitar) && estilo.nichosEvitar.includes(nicho)) {
      score -= 18;
    }
    return Math.max(0, Math.min(100, score));
  }

  function melhoresDirecoes(cliente, estilos, quantidade = 3) {
    return estilos
      .map((e) => ({ estilo: e, score: compatibilidadeEstilo(cliente, e) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, quantidade);
  }

  return {
    hexParaRgb,
    rgbParaHex,
    rgbParaHsl,
    hslParaRgb,
    hexParaHsl,
    hslParaHex,
    extrairPaletaDeImagem,
    encaixarCorNoPapel,
    montarPaletaCliente,
    luminanciaRelativa,
    contraste,
    distanciaPersonalidade,
    compatibilidadeEstilo,
    melhoresDirecoes,
  };
})();
