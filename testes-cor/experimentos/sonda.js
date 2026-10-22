// Experimento descartável — NÃO faz parte do motor de produção.
// Objetivo: instrumentar o motor real (extraído de lut/index.html, igual ao rodar.js faz)
// para enxergar o que ele decidiu internamente em cada par, e não só a nota final:
//  - M.s (mesma cena ou não), PROT depois do ajuste automático, forca final e quantos
//    passos a checagem automática cortou
//  - para pares "cena diferente": o pedido de cor por zona (zonasLook) ANTES do teto
//    LOOK.capCor, comparado com o que sobra DEPOIS do teto e depois do protege() —
//    isso separa "o motor pediu pouca cor" de "o motor pediu bastante cor mas um teto cortou"
//  - para o vídeo "lavado": a faixa dinâmica de entrada (quantis de L) e quanto a curva de
//    luz (TL) e a transferência por zona de fato esticam, para checar a hipótese de
//    "quantis colapsados"/faixa dinâmica estreita
//  - uma rodada "sem rede de segurança" (sem confere(), sem protege(), sem pele()) para
//    isolar se o teto está na matemática da transferência ou nas camadas de proteção
//
// Uso: node testes-cor/experimentos/sonda.js [--pares id1,id2,...]
'use strict';
const path = require('path');
const fs = require('fs');
const { extrairMotor } = require('../extrair-motor');
const { iniciar } = require('../servidor');

const REPO = path.join(__dirname, '..', '..');
const PORTA = 8974;
const PW_CANDIDATOS = [
  'playwright',
  '/Users/fernandoluz/.npm/_npx/9833c18b2d85bc59/node_modules/playwright',
  '/Users/fernandoluz/.npm/_npx/e41f203b7505f1fb/node_modules/playwright',
];
function carregarPlaywright() {
  let ultimoErro;
  for (const c of PW_CANDIDATOS) { try { return require(c); } catch (e) { ultimoErro = e; } }
  throw ultimoErro;
}
const { chromium } = carregarPlaywright();
const METRICAS_JS = fs.readFileSync(path.join(__dirname, '..', 'metricas.js'), 'utf8');
const MOTOR_JS = extrairMotor(REPO);

const DRIVER_JS = `
window.__sonda = async function(){
  const fV = document.querySelector('#fV').files[0];
  const fR = document.querySelector('#fR').files[0];
  const lado = n => n > 3 ? 150 : n > 1 ? 190 : 260;
  let VIDS = ehVideo(fV) ? await quadros(fV, 5) : [paraCanvas(await carrega(fV), 900)];
  VIDS = VIDS.slice(0, 6).map(c => semBarras(c).cv);
  let REFS = ehVideo(fR) ? await quadros(fR, 5) : [paraCanvas(await carrega(fR), 900)];
  REFS = REFS.slice(0, 6).map(c => semBarras(c).cv);
  const RX = filtraQuadros(REFS);
  const R = amostra(RX, lado(RX.length));
  const S = amostra(VIDS, lado(VIDS.length), true);

  prepara(S, R);
  A = Object.assign({}, PADRAO); LUT = null; montaLUT();
  confere();
  const semBase = semelhanca();
  const notaBase = Math.round(100 * Math.exp(-distancia(M.amL ? (()=>{ // distancia do ORIGINAL (sem LUT) pra referência, pra comparar
    return M.amL; })() : M.amC) / 16));

  // ---- diagnóstico de faixa dinâmica (hipótese "quantis colapsados") ----
  const Lsrc = Float32Array.from(canal(S.P, 0)).sort();
  const Lref = Float32Array.from(canal(R.P, 0)).sort();
  const pctArr = (arr, p) => { const x = p/100*(arr.length-1), j = Math.floor(x), f = x-j; return arr[j] + ((j+1<arr.length?arr[j+1]:arr[j])-arr[j])*f; };
  const faixaSrc = { p2: pctArr(Lsrc,2), p50: pctArr(Lsrc,50), p98: pctArr(Lsrc,98) };
  const faixaRef = { p2: pctArr(Lref,2), p50: pctArr(Lref,50), p98: pctArr(Lref,98) };
  // amplitude de cor (croma) do vídeo e da referência
  const cromaMed = P => { let t=0; for (let i=0;i<P.length;i+=3) t+=Math.hypot(P[i+1],P[i+2]); return t/(P.length/3); };
  const cromaSrc = cromaMed(S.P), cromaRef = cromaMed(R.P);

  // ---- diagnóstico do LOOK (cena diferente): pedido de cor ANTES do teto capCor, DEPOIS do teto, e DEPOIS do protege() ----
  let lookDiag = null;
  if (M.look) {
    const xS = quantis(canal(S.P, 0), 64);
    const Zs = zonasLook(S.P, xS), Zr = zonasLook(R.P, quantis(canal(R.P, 0), 64));
    const bruto = Zs.map((s, k) => { const r = Zr[k]; if (!s || !r) return null;
      return { da: r.a - s.a, db: r.b - s.b, pedido: Math.hypot(r.a - s.a, r.b - s.b) }; });
    const depoisCap = M.look.d.map(([da,db]) => ({ da, db, feito: Math.hypot(da,db) }));
    // simula o protege() num ponto de croma médio da zona, pra cada zona, pra ver quanto sobra depois da proteção por pixel
    const protSim = ZC.map((Lc, k) => {
      const z = Zs[k]; if (!z) return null;
      const Ca = Math.hypot(z.a, z.b) || 15; // croma típico da zona
      const v0 = [Lc*100, Ca*.7, 0]; const o = [v0[0], v0[1]+depoisCap[k].da, depoisCap[k].db];
      // chama look() de verdade no ponto médio da zona pra ver o resultado completo (curva+cor+giro)
      const out=[0,0,0]; look(v0[0], v0[1], v0[2], out);
      const outP=[0,0,0]; protege(v0, out); // out já é o resultado de look(); aplica a proteção por cima igual ao pipeline real
      return { da: out[1]-v0[1], db: out[2]-v0[2], antesProt: Math.hypot(out[1]-v0[1], out[2]-v0[2]) };
    });
    lookDiag = { capCor: LOOK.capCor, giro: LOOK.giro, bruto, depoisCap, protSim, satLog: M.look.sat };
  }

  // ---- diagnóstico "mesma cena" (zonas/T) ----
  let zonaDiag = null;
  if (M.s > 0.001) {
    zonaDiag = M.T.map((t, k) => ({ zona: ZC[k], stretchEigenAprox: [t[0], t[2]], s_caa: M.zs[k].caa, s_cbb: M.zs[k].cbb, r_caa: M.zr[k].caa, r_cbb: M.zr[k].cbb }));
  }

  const base = {
    s: M.s, cenaBruto: M.cena.bruto,
    forcaFinal: A.forca, reduziu: M.reduziu, qa0: M.qa0, qa: M.qa, lim: M.lim,
    refClip: M.refClip, refSat: M.refSat, protFinal: { ...PROT },
    faixaSrc, faixaRef, cromaSrc, cromaRef,
    semelhancaFinal: semBase,
    TL_amostra: [M.TL[0], M.TL[10], M.TL[25], M.TL[50], M.TL[75], M.TL[90], M.TL[100]],
    temPele: !!M.pele,
    lookDiag, zonaDiag,
  };

  // ---- rodada "sem rede de segurança" ----
  // guarda os originais para restaurar depois
  const protegeOrig = protege, confereOrig = confere, peleOrig = pele;
  let semSeguranca = null, outSemSegPNG = null;
  try {
    window.protege = (v, o) => {};   // no-op: não limita giro/saturação/luz por pixel
    window.pele = (v, o) => {};      // no-op: não força a pele pra pele da referência
    // refaz prepara() com as funções substituídas (prepara() já roda protege()/pele() dentro do laço da grade)
    prepara(S, R);
    A = Object.assign({}, PADRAO); LUT = null; montaLUT();
    // NÃO chama confere() — fica sempre em 100% de força, sem corte automático
    const sem2 = semelhanca();
    const n = S.n, outLab = new Float32Array(n*3), o=[0,0,0];
    for (let i=0;i<n;i++){ pelaLUT(S.C[i*3],S.C[i*3+1],S.C[i*3+2],o); const v=lab(o[0],o[1],o[2]); outLab[i*3]=v[0]; outLab[i*3+1]=v[1]; outLab[i*3+2]=v[2]; }
    function statsZona(Lab, nSamp, lo, hi){ let sL=0,sa=0,sb=0,k=0; for(let i=0;i<nSamp;i++){const L=Lab[i*3]; if(L>=lo&&L<hi){sL+=L;sa+=Lab[i*3+1];sb+=Lab[i*3+2];k++;}} return k?{L:sL/k,a:sa/k,b:sb/k,n:k}:null; }
    const zonasDef = [[0,33,'sombra'],[33,66,'meio'],[66,101,'alta']];
    const zonasSemSeg = zonasDef.map(([lo,hi,nome]) => { const zOut=statsZona(outLab,n,lo,hi), zRef=statsZona(R.P,R.n,lo,hi); if(!zOut||!zRef) return {nome,de:null}; return {nome, de: Metricas.de2000(zOut.L,zOut.a,zOut.b,zRef.L,zRef.a,zRef.b)}; });
    const q2 = mede();
    const midV = VIDS[VIDS.length >> 1];
    const outC = document.createElement('canvas'); aplica(midV, outC);
    outSemSegPNG = outC.toDataURL('image/png');
    semSeguranca = { sem: sem2, zonas: zonasSemSeg, estouro: q2.estouro, sat: q2.sat, brancos: q2.brancos, pele: q2.pele };
  } finally {
    window.protege = protegeOrig; window.pele = peleOrig; window.confere = confereOrig;
  }

  return { base, semSeguranca, outSemSegPNG };
};
`;

async function novaPagina(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${PORTA}/testes-cor/harness.html`);
  await page.addScriptTag({ content: MOTOR_JS });
  await page.addScriptTag({ content: METRICAS_JS });
  await page.addScriptTag({ content: DRIVER_JS });
  return { ctx, page };
}

async function main() {
  const args = process.argv.slice(2);
  const soIds = (() => { const i = args.indexOf('--pares'); return i >= 0 ? args[i+1].split(',') : null; })();
  const pares = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'pares.json'), 'utf8'))
    .filter(p => !soIds || soIds.includes(p.id));

  const outDir = path.join(__dirname, 'saida');
  fs.mkdirSync(outDir, { recursive: true });
  const srv = await iniciar(REPO, PORTA);
  const browser = await chromium.launch({ channel: 'chrome' });
  const tudo = {};
  try {
    for (const par of pares) {
      process.stderr.write('→ ' + par.id + '\n');
      const { ctx, page } = await novaPagina(browser);
      await page.setInputFiles('#fV', path.join(REPO, par.video));
      await page.setInputFiles('#fR', path.join(REPO, par.referencia));
      const r = await page.evaluate(() => window.__sonda());
      tudo[par.id] = r.base;
      tudo[par.id].semSeguranca = r.semSeguranca;
      if (r.outSemSegPNG) {
        const b64 = r.outSemSegPNG.replace(/^data:image\/png;base64,/, '');
        fs.writeFileSync(path.join(outDir, par.id + '-sem-seguranca.png'), Buffer.from(b64, 'base64'));
      }
      await ctx.close();
      process.stderr.write('   s=' + r.base.s.toFixed(3) + ' forca=' + r.base.forcaFinal + ' reduziu=' + r.base.reduziu
        + ' refSat=' + (r.base.refSat||0).toFixed(2) + ' satFinal(comSeg)=' + r.base.qa.sat.toFixed(2)
        + (r.semSeguranca ? ' satFinal(semSeg)=' + r.semSeguranca.sat.toFixed(2) + ' semSemSeg=' + r.semSeguranca.sem : '') + '\n');
    }
  } finally {
    await browser.close();
    srv.close();
  }
  fs.writeFileSync(path.join(outDir, 'sonda.json'), JSON.stringify(tudo, null, 2));
  process.stderr.write('\nGravado em testes-cor/experimentos/saida/sonda.json\n');
}
main().catch(e => { console.error(e); process.exit(1); });
