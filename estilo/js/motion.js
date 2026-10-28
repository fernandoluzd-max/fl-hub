/* motion.js — sequência de motion de um estilo, usando SÓ a Web Animations API
   nativa (sem GSAP, sem CDN extra). Anima só transform/opacity (nunca
   top/left/width) para rodar liso a 60fps. Os tempos e curvas vêm sempre do
   estilo escolhido (duracaoEntradaMs/duracaoSaidaMs/atrasoEntreElementosMs/
   easingEntrada/easingSaida) — nunca hardcoded. Respeita prefers-reduced-motion. */

const BaseFLMotion = (() => {
  function prefereMenosMovimento() {
    try {
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  }

  /** Toca uma entrada padrão (fade + leve translação/escala) num elemento, usando os tempos do estilo. */
  function animarEntrada(el, estilo, atraso, opcoes) {
    if (!el) return null;
    opcoes = opcoes || {};
    const reduzido = prefereMenosMovimento();
    if (reduzido) {
      el.style.opacity = "1";
      el.style.transform = "none";
      return null;
    }
    const de = opcoes.transformDe || "translateY(18px) scale(0.97)";
    const para = opcoes.transformPara || "translateY(0) scale(1)";
    try {
      return el.animate(
        [
          { opacity: 0, transform: de },
          { opacity: 1, transform: para },
        ],
        {
          duration: estilo.motion.duracaoEntradaMs,
          delay: atraso || 0,
          easing: estilo.motion.easingEntrada,
          fill: "both",
        }
      );
    } catch (e) {
      el.style.opacity = "1";
      return null;
    }
  }

  function animarSaida(el, estilo, atraso, opcoes) {
    if (!el) return null;
    opcoes = opcoes || {};
    const reduzido = prefereMenosMovimento();
    if (reduzido) {
      el.style.opacity = "0";
      return null;
    }
    const para = opcoes.transformPara || "translateY(-12px) scale(0.98)";
    try {
      return el.animate(
        [
          { opacity: 1, transform: "none" },
          { opacity: 0, transform: para },
        ],
        {
          duration: estilo.motion.duracaoSaidaMs,
          delay: atraso || 0,
          easing: estilo.motion.easingSaida,
          fill: "both",
        }
      );
    } catch (e) {
      el.style.opacity = "0";
      return null;
    }
  }

  /** Destaque de palavra na legenda: escala/sublinhado/fade conforme o estilo. */
  function animarDestaquePalavra(el, estilo, atraso) {
    if (!el) return null;
    if (prefereMenosMovimento()) return null;
    const tipo = estilo.legenda.animacaoDestaque;
    try {
      if (tipo === "escala") {
        return el.animate(
          [{ transform: "scale(1)" }, { transform: "scale(1.16)" }, { transform: "scale(1)" }],
          { duration: estilo.motion.duracaoEntradaMs * 0.9, delay: atraso || 0, easing: estilo.motion.easingEntrada, fill: "both" }
        );
      }
      if (tipo === "sublinhado") {
        const linha = el.querySelector(".bfl-sublinhado");
        if (linha) {
          return linha.animate(
            [{ transform: "scaleX(0)", opacity: 0.6 }, { transform: "scaleX(1)", opacity: 1 }],
            { duration: estilo.motion.duracaoEntradaMs, delay: atraso || 0, easing: estilo.motion.easingEntrada, fill: "both" }
          );
        }
      }
      // "fade" e padrão
      return el.animate(
        [{ opacity: 0.55 }, { opacity: 1 }],
        { duration: estilo.motion.duracaoEntradaMs, delay: atraso || 0, easing: estilo.motion.easingEntrada, fill: "both" }
      );
    } catch (e) {
      return null;
    }
  }

  /** Revelação do logo: fade + leve escala, no mesmo ritmo do resto. */
  function animarLogo(el, estilo, atraso) {
    return animarEntrada(el, estilo, atraso, { transformDe: "scale(0.85)", transformPara: "scale(1)" });
  }

  /** Transição simples entre dois "estados" (ex: troca de plano) — um fade cruzado. */
  function animarTransicaoSimples(elSai, elEntra, estilo) {
    if (prefereMenosMovimento()) {
      if (elSai) elSai.style.opacity = "0";
      if (elEntra) elEntra.style.opacity = "1";
      return;
    }
    animarSaida(elSai, estilo, 0, { transformPara: "scale(1.04)" });
    animarEntrada(elEntra, estilo, estilo.motion.duracaoSaidaMs * 0.5, { transformDe: "scale(0.96)", transformPara: "scale(1)" });
  }

  /**
   * Toca a sequência completa do estilo sobre um conjunto de elementos do DOM.
   * elementos = { titulo, linhaTitulo, lowerThird, logo, legenda, palavraDestaque, cta }
   * Qualquer elemento ausente é simplesmente ignorado.
   * Retorna uma função cancelar() para parar/limpar animações em andamento.
   */
  function tocarSequencia(elementos, estilo) {
    const animacoesAtivas = [];
    const atraso = estilo.motion.atrasoEntreElementosMs;

    function reg(a) { if (a) animacoesAtivas.push(a); }

    // 1) título entra
    reg(animarEntrada(elementos.titulo, estilo, 0));
    // linha/elemento gráfico do título entra junto, levemente depois
    if (elementos.linhaTitulo) {
      reg(
        (() => {
          if (prefereMenosMovimento()) { elementos.linhaTitulo.style.opacity = "1"; return null; }
          try {
            return elementos.linhaTitulo.animate(
              [{ opacity: 0, transform: "scaleX(0)" }, { opacity: 1, transform: "scaleX(1)" }],
              { duration: estilo.motion.duracaoEntradaMs, delay: atraso * 0.6, easing: estilo.motion.easingEntrada, fill: "both" }
            );
          } catch (e) { return null; }
        })()
      );
    }

    // 2) lower third (nome + cargo) entra
    reg(animarEntrada(elementos.lowerThird, estilo, atraso * 1));

    // 3) revelação do logo
    reg(animarLogo(elementos.logo, estilo, atraso * 2));

    // 4) legenda aparece
    reg(animarEntrada(elementos.legenda, estilo, atraso * 2.6, { transformDe: "translateY(10px)", transformPara: "translateY(0)" }));

    // 5) destaque animado da palavra na legenda
    if (elementos.palavraDestaque) {
      reg(animarDestaquePalavra(elementos.palavraDestaque, estilo, atraso * 3.4));
    }

    // 6) chamada para ação final
    reg(animarEntrada(elementos.cta, estilo, atraso * 4.4, { transformDe: "translateY(14px) scale(0.94)", transformPara: "translateY(0) scale(1)" }));

    const duracaoTotalMs =
      atraso * 4.4 + estilo.motion.duracaoEntradaMs + 400;

    function cancelar() {
      animacoesAtivas.forEach((a) => {
        try { a.cancel(); } catch (e) {}
      });
    }

    return { cancelar, duracaoTotalMs };
  }

  return {
    prefereMenosMovimento,
    animarEntrada,
    animarSaida,
    animarDestaquePalavra,
    animarLogo,
    animarTransicaoSimples,
    tocarSequencia,
  };
})();
