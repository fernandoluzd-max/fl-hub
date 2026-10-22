// Métricas de fidelidade de cor usadas no banco de teste do Mood.
// Funciona tanto no Node quanto injetado numa página (browser) via <script>,
// por isso não usa require/module fora do bloco de export no fim.
// Depende de lab(r,g,b) e quantis(v,K), que já existem no motor extraído de lut/index.html —
// aqui só a parte que NÃO está no motor (CIEDE2000, percentis, estatística de zonas/pele) é escrita do zero.

(function (global) {
  'use strict';

  // ---- CIEDE2000 (fórmula padrão, com Lab de entrada) ----
  function de2000(L1, a1, b1, L2, a2, b2) {
    const toDeg = r => r * 180 / Math.PI, toRad = d => d * Math.PI / 180;
    const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
    const Cb = (C1 + C2) / 2;
    const Cb7 = Math.pow(Cb, 7), G = 0.5 * (1 - Math.sqrt(Cb7 / (Cb7 + Math.pow(25, 7))));
    const a1p = a1 * (1 + G), a2p = a2 * (1 + G);
    const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
    const h1p = (Math.atan2(b1, a1p) < 0 ? toDeg(Math.atan2(b1, a1p)) + 360 : toDeg(Math.atan2(b1, a1p)));
    const h2p = (Math.atan2(b2, a2p) < 0 ? toDeg(Math.atan2(b2, a2p)) + 360 : toDeg(Math.atan2(b2, a2p)));
    const dLp = L2 - L1, dCp = C2p - C1p;
    let dhp;
    if (C1p * C2p === 0) dhp = 0;
    else { dhp = h2p - h1p; if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360; }
    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(toRad(dhp) / 2);
    const Lbp = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
    let hbp;
    if (C1p * C2p === 0) hbp = h1p + h2p;
    else { hbp = Math.abs(h1p - h2p) > 180 ? (h1p + h2p + 360) / 2 : (h1p + h2p) / 2; if (hbp >= 360) hbp -= 360; }
    const T = 1 - 0.17 * Math.cos(toRad(hbp - 30)) + 0.24 * Math.cos(toRad(2 * hbp)) + 0.32 * Math.cos(toRad(3 * hbp + 6)) - 0.2 * Math.cos(toRad(4 * hbp - 63));
    const dTheta = 30 * Math.exp(-Math.pow((hbp - 275) / 25, 2));
    const Cbp7 = Math.pow(Cbp, 7), RC = 2 * Math.sqrt(Cbp7 / (Cbp7 + Math.pow(25, 7)));
    const SL = 1 + (0.015 * Math.pow(Lbp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbp - 50, 2));
    const SC = 1 + 0.045 * Cbp, SH = 1 + 0.015 * Cbp * T;
    const RT = -Math.sin(toRad(2 * dTheta)) * RC;
    const kL = 1, kC = 1, kH = 1;
    const t1 = dLp / (kL * SL), t2 = dCp / (kC * SC), t3 = dHp / (kH * SH);
    return Math.sqrt(t1 * t1 + t2 * t2 + t3 * t3 + RT * t2 * t3);
  }

  function percentil(sortedArr, p) {
    const n = sortedArr.length;
    if (!n) return 0;
    const x = (p / 100) * (n - 1), j = Math.floor(x), f = x - j;
    return sortedArr[j] + ((j + 1 < n ? sortedArr[j + 1] : sortedArr[j]) - sortedArr[j]) * f;
  }

  function media(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

  global.Metricas = { de2000, percentil, media };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) module.exports = globalThis.Metricas;
