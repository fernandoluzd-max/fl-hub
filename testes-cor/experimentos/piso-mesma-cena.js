// Experimento descartável — NÃO faz parte do motor de produção.
// Ideia a testar: hoje, a transferência "completa" (zonas por covariância + refino por quantis,
// a mesma matemática que dá 96-97 de nota em mesma-cena) só entra em jogo proporcional a M.s²,
// e M.s é 0 pra praticamente todo par realista (vídeo da pessoa x referência de OUTRO conteúdo).
// Pra esses casos o motor usa só o "look" (muito mais conservador, pensado pra não copiar o
// CONTEÚDO de uma cena diferente). Isso faz sentido quando as cenas realmente têm conteúdo visual
// parecido mas cores diferentes (arriscado copiar "o que é" da referência). Mas quando o vídeo de
// entrada está muito perto do cinza (quase sem cor — caso log-lavado/val-log-frio/val-externo-nublado),
// não tem muito "conteúdo de cor" pra copiar por engano: a transferência por zona (que é mais
// expressiva que o look) deveria ser mais segura ali mesmo com cenas diferentes.
// Este experimento força um PISO artificial em M.s (ex. 0.3) só pra ver o que aconteceria se a
// transferência completa entrasse parcialmente em jogo mesmo em "cena diferente", e mede o
// resultado nos casos "lavados" (onde a hipótese prevê melhora seguro) E nos casos de conteúdo
// bem diferente (cenas-diferentes, onde a hipótese prevê risco de copiar conteúdo indevido —
// serve de contraprova).
'use strict';
const path = require('path');
const fs = require('fs');
const { extrairMotor } = require('../extrair-motor');
const { iniciar } = require('../servidor');

const REPO = path.join(__dirname, '..', '..');
const PORTA = 8976;
const PW_CANDIDATOS = ['playwright', '/Users/fernandoluz/.npm/_npx/9833c18b2d85bc59/node_modules/playwright', '/Users/fernandoluz/.npm/_npx/e41f203b7505f1fb/node_modules/playwright'];
function carregarPlaywright(){ let e; for (const c of PW_CANDIDATOS){ try { return require(c); } catch(err){ e=err; } } throw e; }
const { chromium } = carregarPlaywright();
const METRICAS_JS = fs.readFileSync(path.join(__dirname, '..', 'metricas.js'), 'utf8');
const MOTOR_JS = extrairMotor(REPO);

const PISOS = [0, 0.15, 0.3, 0.5];

const DRIVER_JS = `
window.__piso = async function(pisos){
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

  function statsZona(Lab, nSamp, lo, hi) { let sL=0,sa=0,sb=0,k=0; for(let i=0;i<nSamp;i++){const L=Lab[i*3]; if(L>=lo&&L<hi){sL+=L;sa+=Lab[i*3+1];sb+=Lab[i*3+2];k++;}} return k?{L:sL/k,a:sa/k,b:sb/k,n:k}:null; }
  const zonasDef = [[0,33,'sombra'],[33,66,'meio'],[66,101,'alta']];
  function zonaDE(outLab, n) { return zonasDef.map(([lo,hi]) => { const zOut=statsZona(outLab,n,lo,hi), zRef=statsZona(R.P,R.n,lo,hi); if(!zOut||!zRef) return null; return Metricas.de2000(zOut.L,zOut.a,zOut.b,zRef.L,zRef.a,zRef.b); }).filter(x=>x!=null); }

  const porPiso = [];
  for (const piso of pisos) {
    prepara(S, R);
    const sOriginal = M.s;
    // PATCH descartável: só pra este experimento, levanta o piso de M.s ANTES de montar a LUT
    // (a grade já foi construída dentro de prepara() usando M.s original — refazemos a mistura
    // "na mão" aqui, recalculando o blend og/o com o M.s novo, igual ao laço de prepara() faz)
    if (piso > sOriginal) {
      const T3 = N*N*N, L0 = M.L0, D = M.D, og=[0,0,0], o=[0,0,0];
      const s2 = piso;
      for (let b=0;b<N;b++) for (let g=0;g<N;g++) for (let r=0;r<N;r++){
        const i = b*N*N+g*N+r;
        const v = PERFIL ? lab(...entrada(r/(N-1), g/(N-1), b/(N-1), [0,0,0])) : lab(r/(N-1), g/(N-1), b/(N-1));
        look(v[0], v[1], v[2], og); completo(v[0], v[1], v[2], o);
        const oNovo = [0,0,0]; for (let k=0;k<3;k++) oNovo[k] = og[k] + s2*(o[k]-og[k]);
        const livre = [oNovo[0], oNovo[1], oNovo[2]]; protege(v, oNovo); pele(v, oNovo);
        const ks = s2*s2; for (let k=0;k<3;k++) oNovo[k] += ks*(livre[k]-oNovo[k]);
        D[i*3] = oNovo[0]-v[0]; D[i*3+1] = oNovo[1]-v[1]; D[i*3+2] = oNovo[2]-v[2];
      }
      M.W.fill(0);   // com piso, trata como se tivesse pele protegida igual ao caminho M.s>0 (mesma regra do prepara)
    }
    A = Object.assign({}, PADRAO); LUT = null; montaLUT();
    confere();
    const sem = semelhanca();
    const n = S.n, outLab = new Float32Array(n*3), o=[0,0,0];
    for (let i=0;i<n;i++){ pelaLUT(S.C[i*3],S.C[i*3+1],S.C[i*3+2],o); const v=lab(o[0],o[1],o[2]); outLab[i*3]=v[0]; outLab[i*3+1]=v[1]; outLab[i*3+2]=v[2]; }
    const de = zonaDE(outLab, n);
    const deMedio = de.length ? de.reduce((a,b)=>a+b,0)/de.length : null;
    const midV = VIDS[VIDS.length >> 1];
    const outC = document.createElement('canvas'); aplica(midV, outC);
    porPiso.push({ piso, sOriginal, sem, deMedio, forcaFinal: A.forca, reduziu: M.reduziu, qa: M.qa, lim: M.lim, png: outC.toDataURL('image/png') });
  }
  return porPiso;
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
  const soIds = (() => { const i = args.indexOf('--pares'); return i >= 0 ? args[i+1].split(',') : ['log-lavado', 'val-log-frio', 'val-externo-nublado', 'cenas-diferentes']; })();
  const pares = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'pares.json'), 'utf8')).filter(p => soIds.includes(p.id));
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
      const r = await page.evaluate((pisos) => window.__piso(pisos), PISOS);
      tudo[par.id] = r.map(x => ({ piso: x.piso, sOriginal: x.sOriginal, sem: x.sem, deMedio: x.deMedio, forcaFinal: x.forcaFinal, reduziu: x.reduziu, qa: x.qa, lim: x.lim }));
      for (const x of r) {
        const b64 = x.png.replace(/^data:image\/png;base64,/, '');
        fs.writeFileSync(path.join(outDir, par.id + '-piso-' + x.piso + '.png'), Buffer.from(b64, 'base64'));
        process.stderr.write('   piso=' + x.piso + ' sem=' + x.sem + ' deMedio=' + (x.deMedio?x.deMedio.toFixed(2):'-') + ' forca=' + x.forcaFinal + '\n');
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    srv.close();
  }
  fs.writeFileSync(path.join(outDir, 'piso-mesma-cena-resumo.json'), JSON.stringify(tudo, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
