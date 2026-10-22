// Experimento descartável — NÃO faz parte do motor de produção. Não depende de navegador.
// Pergunta: o motor de hoje limita o "giro" de tom (hue) em graus FIXOS dentro do espaço CIE Lab
// (ex.: PROT.giro=32°, LOOK.giro=25°), o mesmo número de graus pra QUALQUER cor de entrada.
// Mas o Lab (de 1976) é conhecido por não ser perceptualmente uniforme — sobretudo na região do
// azul/roxo, uma rotação de X graus "parece" uma mudança de cor bem maior ou bem menor do que a
// mesma rotação em outra região do círculo de tons. O Oklab (2020) foi desenhado justamente pra
// corrigir isso.
// Este script pega um conjunto de cores de teste espalhadas pelo círculo de tons (mesma luminância
// e croma em Lab, só variando o ângulo h), aplica a MESMA rotação de X graus em Lab (como o motor
// faz) e mede quanto isso "pesou" de verdade, em ΔE2000 (a métrica perceptual oficial que o próprio
// banco de teste usa). Se o ΔE2000 variar muito entre as cores pra uma rotação igual em graus, isso
// comprova que o limite de giro em graus-Lab não dá a mesma margem de segurança (nem a mesma
// intensidade de efeito) em todo tom — é uma limitação real do espaço de cor usado, não do ajuste
// dos parâmetros.
'use strict';
const path = require('path');
const Metricas = require(path.join(__dirname, '..', 'metricas.js'));

// ---- Lab <-> sRGB (mesmas fórmulas do motor, lut/index.html) ----
const lin = c => c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);
const gam = c => c <= .0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - .055;
const fL = t => t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
const fI = t => t > .206893 ? t * t * t : (t - 16 / 116) / 7.787;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function lab(r, g, b) {
  r = lin(r); g = lin(g); b = lin(b);
  const x = (.4124564*r + .3575761*g + .1804375*b) / .95047, y = .2126729*r + .7151522*g + .072175*b, z = (.0193339*r + .119192*g + .9503041*b) / 1.08883;
  const fx = fL(x), fy = fL(y), fz = fL(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function linear(L, a, b) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const x = fI(fx) * .95047, y = fI(fy), z = fI(fz) * 1.08883;
  return [3.2404542*x - 1.5371385*y - .4985314*z, -.969266*x + 1.8760108*y + .041556*z, .0556434*x - .2040259*y + 1.0572252*z];
}
function rgbFromLab(L, a, b) {
  let v = linear(L, a, b);
  const fora = v => v[0] < -.0005 || v[1] < -.0005 || v[2] < -.0005 || v[0] > 1.0005 || v[1] > 1.0005 || v[2] > 1.0005;
  if (fora(v)) { let lo = 0, hi = 1; for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (fora(linear(L, a * m, b * m))) hi = m; else lo = m; } v = linear(L, a * lo, b * lo); }
  return [gam(clamp(v[0], 0, 1)), gam(clamp(v[1], 0, 1)), gam(clamp(v[2], 0, 1))];
}
// ---- Oklab (fórmulas públicas de Björn Ottosson, 2020) ----
function rgbToOklab(r, g, b) {
  r = lin(r); g = lin(g); b = lin(b);
  const l = .4122214708*r + .5363325363*g + .0514459929*b;
  const m = .2119034982*r + .6806995451*g + .1073969566*b;
  const s = .0883024619*r + .2817188376*g + .6299787005*b;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return [.2104542553*l_ + .7936177850*m_ - .0040720468*s_, 1.9779984951*l_ - 2.4285922050*m_ + .4505937099*s_, .0259040371*l_ + .7827717662*m_ - .8086757660*s_];
}

// ---- rotação de tom em Lab: gira (a,b) em torno da origem por "graus" (é o que protege()/look() fazem) ----
function giraLab(L, a, b, graus) {
  const h = Math.atan2(b, a) + graus * Math.PI / 180, C = Math.hypot(a, b);
  return [L, C * Math.cos(h), C * Math.sin(h)];
}

const GRAUS_TESTE = 25;   // mesma ordem de grandeza do LOOK.giro (25°) e PROT.giro (32°)
const L_TESTE = 55, C_TESTE = 32;   // luminância e croma médios, só o ângulo de tom varia
const HUES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const NOMES = { 0:'vermelho', 30:'laranja', 60:'amarelo', 90:'verde-amarelado', 120:'verde', 150:'verde-azulado', 180:'ciano', 210:'azul-claro', 240:'azul', 270:'roxo', 300:'magenta', 330:'rosa' };

console.log(`Rotação de ${GRAUS_TESTE}° em Lab, aplicada em cores de mesma luminância (${L_TESTE}) e croma (${C_TESTE}) Lab, variando só o ângulo de tom — e o quanto isso resultou em ΔE2000 de verdade:\n`);
console.log('hue(Lab)'.padEnd(18), 'ΔE2000'.padEnd(10), 'razão vs. média');
const linhas = [];
for (const h of HUES) {
  const a0 = C_TESTE * Math.cos(h * Math.PI / 180), b0 = C_TESTE * Math.sin(h * Math.PI / 180);
  const [L2, a2, b2] = giraLab(L_TESTE, a0, b0, GRAUS_TESTE);
  const de = Metricas.de2000(L_TESTE, a0, b0, L2, a2, b2);
  linhas.push({ h, de });
}
const media = linhas.reduce((s, x) => s + x.de, 0) / linhas.length;
for (const { h, de } of linhas) {
  console.log((h + '° ' + (NOMES[h]||'')).padEnd(18), de.toFixed(2).padEnd(10), (de / media).toFixed(2) + 'x');
}
const min = Math.min(...linhas.map(x => x.de)), max = Math.max(...linhas.map(x => x.de));
console.log(`\nΔE2000 mínimo: ${min.toFixed(2)}  máximo: ${max.toFixed(2)}  razão máx/mín: ${(max/min).toFixed(2)}x`);
console.log('(se o Lab fosse perceptualmente uniforme pra rotação de tom, essa razão seria ~1,0x —');
console.log(' o mesmo número de graus sempre representaria a mesma mudança percebida de cor)\n');

// ---- teste de verdade: em vez de girar em Lab, gira a MESMA cor dentro do plano a,b do OKLAB
// (mesmos graus nominais) e mede o ΔE2000 resultante — pra comparar a uniformidade das DUAS
// formas de girar tom, não só olhar o Lab de um ângulo diferente.
console.log('Girando a MESMA quantidade de graus, mas dentro do plano a,b do OKLAB (não do Lab), e medindo o ΔE2000 resultante:\n');
console.log('hue(Lab)'.padEnd(18), 'ΔE2000(giro em Oklab)'.padEnd(24), 'razão vs. média');
const linhas2 = [];
for (const h of HUES) {
  const a0 = C_TESTE * Math.cos(h * Math.PI / 180), b0 = C_TESTE * Math.sin(h * Math.PI / 180);
  const rgb0 = rgbFromLab(L_TESTE, a0, b0);
  const ok0 = rgbToOklab(...rgb0);
  const hOk = Math.atan2(ok0[2], ok0[1]) + GRAUS_TESTE * Math.PI / 180, cOk = Math.hypot(ok0[1], ok0[2]);
  // converte de volta: Oklab -> RGB linear (inversa das fórmulas de Ottosson) -> sRGB -> Lab, pra medir ΔE2000 de verdade
  const ok1 = [ok0[0], cOk * Math.cos(hOk), cOk * Math.sin(hOk)];
  const l_ = ok1[0] + .3963377774*ok1[1] + .2158037573*ok1[2];
  const m_ = ok1[0] - .1055613458*ok1[1] - .0638541728*ok1[2];
  const s_ = ok1[0] - .0894841775*ok1[1] - 1.2914855480*ok1[2];
  const l = l_*l_*l_, m = m_*m_*m_, s = s_*s_*s_;
  const rl = +4.0767416621*l - 3.3077115913*m + .2309699292*s;
  const gl = -1.2684380046*l + 2.6097574011*m - .3413193965*s;
  const bl = -.0041960863*l - .7034186147*m + 1.7076147010*s;
  const rgb1 = [gam(clamp(rl,0,1)), gam(clamp(gl,0,1)), gam(clamp(bl,0,1))];
  const labOut = lab(...rgb1);
  const de = Metricas.de2000(L_TESTE, a0, b0, labOut[0], labOut[1], labOut[2]);
  linhas2.push({ h, de });
}
const media2 = linhas2.reduce((s, x) => s + x.de, 0) / linhas2.length;
for (const { h, de } of linhas2) console.log((h + '° ' + (NOMES[h]||'')).padEnd(18), de.toFixed(2).padEnd(24), (de / media2).toFixed(2) + 'x');
const min2 = Math.min(...linhas2.map(x => x.de)), max2 = Math.max(...linhas2.map(x => x.de));
console.log(`\nΔE2000 mínimo: ${min2.toFixed(2)}  máximo: ${max2.toFixed(2)}  razão máx/mín (giro em OKLAB): ${(max2/min2).toFixed(2)}x`);
console.log(`(comparar com a razão máx/mín do giro em LAB, acima: ${(max/min).toFixed(2)}x — quanto MENOR essa razão,`);
console.log(' mais uniforme/previsível é girar tom naquele espaço de cor, pro mesmo número de graus)');

// ---- segundo teste: constância de tom quando só a SATURAÇÃO muda (mantendo o ângulo h fixo em Lab) ----
// É exatamente o que PROT.satMax e o fator de saturação do LOOK fazem: esticam o croma (C) mantendo
// o ÂNGULO de tom (h) igual em Lab. Se o Lab não for "reto" (hue-linear) nessa região, o tom PERCEBIDO
// muda mesmo com o ângulo-Lab constante — é um problema conhecido do Lab, mais forte nos azuis/roxos.
// log-lavado empurra saturação até ×3,2 (PROT.satMax); aqui simulamos ×1 -> ×3,2 de croma, ângulo fixo.
console.log('\n\nConstância de tom ao esticar só a saturação (×1 → ×3,2, o teto que PROT.satMax permite em casos extremos),');
console.log('mantendo o ÂNGULO de tom FIXO em Lab — quanto o tom (hue) PERCEBIDO (ângulo em Oklab) deriva:\n');
console.log('hue(Lab) inicial'.padEnd(18), 'hue(Oklab) em C×1'.padEnd(20), 'hue(Oklab) em C×3,2'.padEnd(22), 'deriva');
for (const h of HUES) {
  const a0 = 8 * Math.cos(h * Math.PI / 180), b0 = 8 * Math.sin(h * Math.PI / 180);   // croma baixo (como log-lavado antes)
  const a1 = a0 * 3.2, b1 = b0 * 3.2;   // mesmo ângulo em Lab, croma ×3,2
  const rgb0 = rgbFromLab(L_TESTE, a0, b0), rgb1 = rgbFromLab(L_TESTE, a1, b1);
  const ok0 = rgbToOklab(...rgb0), ok1 = rgbToOklab(...rgb1);
  const hOk0 = Math.atan2(ok0[2], ok0[1]) * 180 / Math.PI, hOk1 = Math.atan2(ok1[2], ok1[1]) * 180 / Math.PI;
  let deriva = hOk1 - hOk0; deriva = ((deriva + 540) % 360) - 180;
  console.log((h + '°').padEnd(18), hOk0.toFixed(1).padEnd(20), hOk1.toFixed(1).padEnd(22), deriva.toFixed(1) + '°');
}
console.log('\n(deriva = quanto o ângulo de tom em OKLAB mudou, mesmo o ângulo em LAB tendo ficado EXATAMENTE igual —');
console.log(' positivo ou negativo grande = region onde "aumentar saturação sem girar o tom", do jeito que o motor faz,');
console.log(' na prática troca de tom aos olhos, mesmo sem querer)');

// ---- bônus: onde ficam as cores de pele (peleW do motor) nesse círculo? ----
// peleW() do motor considera pele entre h=14° e h=76° aprox. (zona "laranja-amarelo" do Lab) — então
// peles ficam numa região onde a razão acima importa na prática (não é só um exercício acadêmico).
console.log('\n(peleW() do motor trata como "pele" tons entre ~14° e ~76° em Lab — compare com a tabela acima\n para ver se é uma região "espremida" ou "esticada" nesse espaço.)');
