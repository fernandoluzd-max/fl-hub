/* lut.js — gera uma LUT 3D .cube (33x33x33) a partir dos parâmetros de "cor do
   vídeo" de um estilo (temperatura, contraste, saturação) e de uma intensidade
   0-100% (mistura entre a imagem original e o look completo).

   Decisão de implementação: a mesma ordem de operações usada aqui (temperatura
   -> saturação -> contraste) é a que o Estúdio usa para description/preview,
   para que a LUT exportada combine com o que o editor viu na tela. No Estúdio,
   o preview de VÍDEO usa filtro CSS (contrast/saturate/sepia+hue-rotate) por
   performance (ver js/app.js), e o preview de FOTO usa canvas pixel a pixel —
   a LUT abaixo é a versão "matemática exata" dessas mesmas três operações,
   para abrir no CapCut Desktop, Premiere ou DaVinci Resolve. */

const BaseFLLut = (() => {
  const TAMANHO = 33;

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function aplicarTemperatura(r, g, b, temperatura) {
    // temperatura -100..100. Positivo = mais quente (soma vermelho/amarelo, reduz azul).
    const t = (temperatura || 0) / 100;
    return {
      r: clamp01(r + t * 0.16),
      g: clamp01(g + t * 0.05),
      b: clamp01(b - t * 0.16),
    };
  }

  function aplicarSaturacao(r, g, b, saturacao) {
    // satura em torno da luminância perceptual (0..1), fator = 1 + saturacao/100
    const fator = 1 + (saturacao || 0) / 100;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return {
      r: clamp01(luma + (r - luma) * fator),
      g: clamp01(luma + (g - luma) * fator),
      b: clamp01(luma + (b - luma) * fator),
    };
  }

  function aplicarContraste(r, g, b, contrasteVal) {
    // contraste em torno do cinza médio (0.5), fator = 1 + contraste/100
    const fator = 1 + (contrasteVal || 0) / 100;
    return {
      r: clamp01((r - 0.5) * fator + 0.5),
      g: clamp01((g - 0.5) * fator + 0.5),
      b: clamp01((b - 0.5) * fator + 0.5),
    };
  }

  /** Aplica o "look" completo do estilo a um pixel RGB (0..1) e mistura pela intensidade (0..100). */
  function aplicarLookNoPixel(r, g, b, look, intensidade) {
    let cor = { r, g, b };
    cor = aplicarTemperatura(cor.r, cor.g, cor.b, look.temperatura);
    cor = aplicarSaturacao(cor.r, cor.g, cor.b, look.saturacao);
    cor = aplicarContraste(cor.r, cor.g, cor.b, look.contraste);
    const mix = Math.max(0, Math.min(100, intensidade == null ? 100 : intensidade)) / 100;
    return {
      r: r + (cor.r - r) * mix,
      g: g + (cor.g - g) * mix,
      b: b + (cor.b - b) * mix,
    };
  }

  /**
   * Gera o texto completo de uma LUT .cube 33x33x33 válida (padrão Resolve/Adobe):
   * cabeçalho LUT_3D_SIZE 33, depois 33^3 linhas "R G B" (0.0 a 1.0, 6 casas decimais).
   * look = { temperatura, contraste, saturacao } (mesmos campos de corDoVideo do estilo).
   * intensidade = 0-100 (slider do Estúdio).
   */
  function gerarCubeLUT(look, intensidade, nomeEstilo) {
    const linhas = [];
    linhas.push("# Gerado pelo Estúdio de Estilo da Base FL");
    linhas.push("# Estilo: " + (nomeEstilo || "personalizado"));
    linhas.push("TITLE \"" + (nomeEstilo || "BaseFL Look") + "\"");
    linhas.push("LUT_3D_SIZE " + TAMANHO);
    linhas.push("DOMAIN_MIN 0.0 0.0 0.0");
    linhas.push("DOMAIN_MAX 1.0 1.0 1.0");

    const N = TAMANHO - 1;
    // ordem padrão .cube: R varia mais rápido, depois G, depois B (B no laço externo)
    for (let bi = 0; bi < TAMANHO; bi++) {
      const b0 = bi / N;
      for (let gi = 0; gi < TAMANHO; gi++) {
        const g0 = gi / N;
        for (let ri = 0; ri < TAMANHO; ri++) {
          const r0 = ri / N;
          const cor = aplicarLookNoPixel(r0, g0, b0, look, intensidade);
          linhas.push(
            cor.r.toFixed(6) + " " + cor.g.toFixed(6) + " " + cor.b.toFixed(6)
          );
        }
      }
    }
    return linhas.join("\n") + "\n";
  }

  return {
    TAMANHO,
    aplicarLookNoPixel,
    gerarCubeLUT,
  };
})();
