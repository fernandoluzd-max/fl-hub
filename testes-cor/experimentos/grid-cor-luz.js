// Experimento descartável — NÃO faz parte do motor de produção.
// Hipótese a testar: confere() hoje só tem UM botão (A.forca) pra reagir a QUALQUER defeito,
// e esse botão reduz cor E luz juntos (montaLUT: cor = f*A.cor/100, luz = f*A.luz/100, os dois
// multiplicados pelo mesmo f = A.forca/100). Para log-lavado e noite-baixa-luz, os dados da sonda.js
// mostram que o defeito que dispara a redução é só UM (saturação em log-lavado, estouro em
// noite-baixa-luz) — então cortar luz junto pode ser desperdício (perde contraste à toa).
// Este experimento faz uma busca em grade (A.cor x A.luz, independentes) pra cada par que hoje
// é cortado pela checagem automática, e acha a MELHOR combinação que ainda passa em todos os
// limites de qa — pra ver se dá pra manter mais contraste (ou mais cor) sem violar a checagem.
'use strict';
const path = require('path');
const fs = require('fs');
const { extrairMotor } = require('../extrair-motor');
const { iniciar } = require('../servidor');

const REPO = path.join(__dirname, '..', '..');
const PORTA = 8975;
const PW_CANDIDATOS = ['playwright', '/Users/fernandoluz/.npm/_npx/9833c18b2d85bc59/node_modules/playwright', '/Users/fernandoluz/.npm/_npx/e41f203b7505f1fb/node_modules/playwright'];
function carregarPlaywright(){ let e; for (const c of PW_CANDIDATOS){ try { return require(c); } catch(err){ e=err; } } throw e; }
const { chromium } = carregarPlaywright();
const METRICAS_JS = fs.readFileSync(path.join(__dirname, '..', 'metricas.js'), 'utf8');
const MOTOR_JS = extrairMotor(REPO);

const DRIVER_JS = `
window.__grid = async function(){
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
  const lim = limites();

  function statsZona(Lab, nSamp, lo, hi) { let sL=0,sa=0,sb=0,k=0; for(let i=0;i<nSamp;i++){const L=Lab[i*3]; if(L>=lo&&L<hi){sL+=L;sa+=Lab[i*3+1];sb+=Lab[i*3+2];k++;}} return k?{L:sL/k,a:sa/k,b:sb/k,n:k}:null; }
  const zonasDef = [[0,33,'sombra'],[33,66,'meio'],[66,101,'alta']];
  function zonaDE(outLab, n) {
    return zonasDef.map(([lo,hi]) => { const zOut=statsZona(outLab,n,lo,hi), zRef=statsZona(R.P,R.n,lo,hi); if(!zOut||!zRef) return null; return Metricas.de2000(zOut.L,zOut.a,zOut.b,zRef.L,zRef.a,zRef.b); }).filter(x=>x!=null);
  }

  const resultados = [];
  const passos = [100,90,80,70,60,50,40,30,20];
  for (const cor of passos) {
    for (const luz of passos) {
      A = Object.assign({}, PADRAO, { forca: 100, cor, luz }); LUT = null; montaLUT();
      const q = mede();
      const passa = q.estouro <= lim.estouro && q.sat <= lim.sat && (q.brancos == null || q.brancos <= lim.brancos) && (q.pele == null || q.pele <= lim.pele);
      const sem = semelhanca();
      const n = S.n, outLab = new Float32Array(n*3), o=[0,0,0];
      for (let i=0;i<n;i++){ pelaLUT(S.C[i*3],S.C[i*3+1],S.C[i*3+2],o); const v=lab(o[0],o[1],o[2]); outLab[i*3]=v[0]; outLab[i*3+1]=v[1]; outLab[i*3+2]=v[2]; }
      const de = zonaDE(outLab, n);
      const deMedio = de.length ? de.reduce((a,b)=>a+b,0)/de.length : null;
      resultados.push({ cor, luz, passa, sem, deMedio, estouro:q.estouro, sat:q.sat, brancos:q.brancos, pele:q.pele });
    }
  }
  // melhor combinação que passa (maior "sem"); e, à parte, o melhor que passa com luz=100 fixo (só cor reduzido)
  const passam = resultados.filter(r => r.passa);
  const melhor = passam.sort((a,b) => b.sem - a.sem)[0] || null;
  const melhorLuzFixa = passam.filter(r => r.luz === 100).sort((a,b) => b.sem - a.sem)[0] || null;
  // também a combinação atual do motor real (A.forca reduzido igual, cor=luz=forca) pra comparar
  const atual = resultados.find(r => r.cor === r.luz) || null;

  // gera a imagem da "melhor combinação que passa" pra conferência visual
  let melhorPNG = null;
  if (melhor) {
    A = Object.assign({}, PADRAO, { forca: 100, cor: melhor.cor, luz: melhor.luz }); LUT = null; montaLUT();
    const midV = VIDS[VIDS.length >> 1];
    const outC = document.createElement('canvas'); aplica(midV, outC);
    melhorPNG = outC.toDataURL('image/png');
  }

  return { lim, resultados, melhor, melhorLuzFixa, atual, melhorPNG };
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
  const soIds = (() => { const i = args.indexOf('--pares'); return i >= 0 ? args[i+1].split(',') : ['log-lavado', 'noite-baixa-luz']; })();
  const pares = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'pares.json'), 'utf8')).filter(p => soIds.includes(p.id));
  const outDir = path.join(__dirname, 'saida');
  fs.mkdirSync(outDir, { recursive: true });
  const srv = await iniciar(REPO, PORTA);
  const browser = await chromium.launch({ channel: 'chrome' });
  const tudo = {};
  try {
    for (const par of pares) {
      process.stderr.write('→ ' + par.id + ' (grade cor x luz, ' + 9*9 + ' combinações)\n');
      const { ctx, page } = await novaPagina(browser);
      await page.setInputFiles('#fV', path.join(REPO, par.video));
      await page.setInputFiles('#fR', path.join(REPO, par.referencia));
      const r = await page.evaluate(() => window.__grid());
      tudo[par.id] = { lim: r.lim, melhor: r.melhor, melhorLuzFixa: r.melhorLuzFixa, atual: r.atual };
      if (r.melhorPNG) { const b64 = r.melhorPNG.replace(/^data:image\/png;base64,/, ''); fs.writeFileSync(path.join(outDir, par.id + '-melhor-combo.png'), Buffer.from(b64, 'base64')); }
      fs.writeFileSync(path.join(outDir, par.id + '-grade-completa.json'), JSON.stringify(r.resultados, null, 2));
      process.stderr.write('   atual(cor=luz=' + (r.atual?r.atual.cor:'?') + '): sem=' + (r.atual?r.atual.sem:'?') + '\n');
      process.stderr.write('   melhor (passa, qualquer cor/luz): cor=' + r.melhor.cor + ' luz=' + r.melhor.luz + ' sem=' + r.melhor.sem + '\n');
      if (r.melhorLuzFixa) process.stderr.write('   melhor com luz=100 fixo: cor=' + r.melhorLuzFixa.cor + ' sem=' + r.melhorLuzFixa.sem + '\n');
      await ctx.close();
    }
  } finally {
    await browser.close();
    srv.close();
  }
  fs.writeFileSync(path.join(outDir, 'grid-cor-luz-resumo.json'), JSON.stringify(tudo, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
