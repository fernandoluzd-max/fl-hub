// Banco de teste do motor de cor do Mood.
// Roda, para cada par (vídeo da pessoa + referência) listado em pares.json,
// o MESMO caminho de código do site (lut/index.html): lê os quadros com
// quadros()/carrega(), monta a LUT com prepara()/montaLUT() e aplica com
// aplica()/pelaLUT(), tudo dentro de um Chromium real via Playwright.
//
// Para cada par, mede:
//  - fidelidade por zona (ΔE2000 sombra/meio/alta luz) contra a referência
//  - distância de distribuição de cor (semelhanca(), já oficial do motor)
//  - contraste (percentis 5/50/95 de L) e saturação (croma médio)
//  - pele (ângulo de tom e croma), quando há pele de verdade nas duas imagens
//  - defeitos: estouro extra, saturação fora do limite, brancos tingidos,
//    pele girando demais, degrau no cubo (M.g1 > GANHO_MAX), inversão de cor,
//    ruído de cor em neutros escuros
//  - suavidade do cubo 33³ (M.g1, M.passes)
//  - tempo para gerar a LUT, normal e com CPU 4x mais lenta (celular)
// e confere que a prévia (aplica) bate com o .cube exportado passado no ffmpeg (lut3d).
'use strict';
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { extrairMotor } = require('./extrair-motor');
const { iniciar } = require('./servidor');

const REPO = path.join(__dirname, '..');
const PORTA = 8973;
const PW_CANDIDATOS = [
  'playwright',
  '/Users/fernandoluz/.npm/_npx/9833c18b2d85bc59/node_modules/playwright',
  '/Users/fernandoluz/.npm/_npx/e41f203b7505f1fb/node_modules/playwright',
];
function carregarPlaywright() {
  let ultimoErro;
  for (const c of PW_CANDIDATOS) {
    try { return require(c); } catch (e) { ultimoErro = e; }
  }
  throw ultimoErro;
}
const { chromium } = carregarPlaywright();

const METRICAS_JS = fs.readFileSync(path.join(__dirname, 'metricas.js'), 'utf8');
const MOTOR_JS = extrairMotor(REPO);

// mesma lógica de amostragem que analisa() usa em lut/index.html (não é parte do motor isolável,
// é um fiozinho de UI — reproduzido aqui ao pé da letra para não mudar o comportamento real)
const DRIVER_JS = `
window.__rodarPar = async function(perfil){
  if (perfil) { try { PERFIL = perfil; } catch(e){} }
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

  const t0 = performance.now();
  prepara(S, R);
  A = Object.assign({}, PADRAO); LUT = null; montaLUT();
  const tGerar = performance.now() - t0;

  confere();
  const sem = semelhanca();

  // ---- amostras em Lab do resultado (aplica a LUT final em TODO pixel amostrado do vídeo) ----
  const n = S.n, outLab = new Float32Array(n * 3), o = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    pelaLUT(S.C[i*3], S.C[i*3+1], S.C[i*3+2], o);
    const v = lab(o[0], o[1], o[2]);
    outLab[i*3] = v[0]; outLab[i*3+1] = v[1]; outLab[i*3+2] = v[2];
  }

  // ---- zonas de luz (sombra/meio/alta) por L fixo, ΔE2000 entre a média do resultado e da referência ----
  function statsZona(Lab, nSamp, lo, hi) {
    let sL=0, sa=0, sb=0, k=0;
    for (let i=0;i<nSamp;i++){ const L=Lab[i*3]; if (L>=lo && L<hi){ sL+=L; sa+=Lab[i*3+1]; sb+=Lab[i*3+2]; k++; } }
    return k ? { L:sL/k, a:sa/k, b:sb/k, n:k } : null;
  }
  const zonasDef = [[0,33,'sombra'],[33,66,'meio'],[66,101,'alta']];
  const zonas = zonasDef.map(([lo,hi,nome]) => {
    const zOut = statsZona(outLab, n, lo, hi), zRef = statsZona(R.P, R.n, lo, hi);
    if (!zOut || !zRef) return { nome, de: null };
    return { nome, de: Metricas.de2000(zOut.L, zOut.a, zOut.b, zRef.L, zRef.a, zRef.b) };
  });

  // ---- contraste: percentis 5/50/95 de L ----
  const Lout = Array.from({length:n}, (_,i)=>outLab[i*3]).sort((x,y)=>x-y);
  const Lref = Array.from({length:R.n}, (_,i)=>R.P[i*3]).sort((x,y)=>x-y);
  const pOut = [5,50,95].map(p=>Metricas.percentil(Lout,p));
  const pRef = [5,50,95].map(p=>Metricas.percentil(Lref,p));
  const contraste = Metricas.media(pOut.map((v,i)=>Math.abs(v-pRef[i])));

  // ---- saturação: croma médio ----
  let cOut=0; for (let i=0;i<n;i++) cOut += Math.hypot(outLab[i*3+1], outLab[i*3+2]); cOut/=n;
  let cRef=0; for (let i=0;i<R.n;i++) cRef += Math.hypot(R.P[i*3+1], R.P[i*3+2]); cRef/=R.n;
  const satRazao = cOut / Math.max(cRef, 1e-6);

  // ---- pele: ângulo de tom (h) e croma, resultado x referência, só nos pixels de pele de cada lado ----
  let pele = null;
  { let hoS=0,coS=0,koS=0; for (let i=0;i<n;i++){ const L=S.P[i*3],a=S.P[i*3+1],b=S.P[i*3+2]; if (peleW(L,a,b)>.5){ const Lo=outLab[i*3],ao=outLab[i*3+1],bo=outLab[i*3+2]; hoS+=Math.atan2(bo,ao); coS+=Math.hypot(ao,bo); koS++; } }
    let hoR=0,coR=0,koR=0; for (let i=0;i<R.n;i++){ const L=R.P[i*3],a=R.P[i*3+1],b=R.P[i*3+2]; if (peleW(L,a,b)>.5){ hoR+=Math.atan2(b,a); coR+=Math.hypot(a,b); koR++; } }
    if (koS > 0.01*n && koR > 0.01*R.n) {
      const hS=hoS/koS, hR=hoR/koR; let dh=(hS-hR)*180/Math.PI; dh=((dh+540)%360)-180;
      pele = { dhGraus: Math.abs(dh), dCroma: Math.abs(coS/koS - coR/koR), fracaoS: koS/n, fracaoR: koR/R.n };
    }
  }

  // ---- defeitos ----
  const defeitos = [];
  const q = M.qa, lim = M.lim;
  if (q.estouro > lim.estouro) defeitos.push('estouro de brancos/pretos acima do limite (' + q.estouro.toFixed(1) + '% > ' + lim.estouro.toFixed(1) + '%)');
  if (q.sat > lim.sat) defeitos.push('saturação acima do limite (x' + q.sat.toFixed(2) + ' > x' + lim.sat.toFixed(2) + ')');
  if (q.brancos != null && q.brancos > lim.brancos) defeitos.push('brancos/neutros tingidos (' + q.brancos.toFixed(1) + ' > ' + lim.brancos.toFixed(1) + ')');
  if (q.pele != null && q.pele > lim.pele) defeitos.push('pele girou demais (' + q.pele.toFixed(0) + '° > ' + lim.pele.toFixed(0) + '°)');
  if (M.g1 > GANHO_MAX + 1e-6) defeitos.push('degrau no cubo acima do limite (ganho ' + M.g1.toFixed(2) + ' > ' + GANHO_MAX + ')');
  { let semLut=0; for (let i=0;i<LUT.length;i++) if (!isFinite(LUT[i])) semLut++; if (semLut) defeitos.push('LUT com ' + semLut + ' valor(es) não finito(s)'); }
  { // inversão de cor: sinal do produto escalar (a,b) antes x depois, só em pixels com croma de verdade
    let neg=0, tot=0;
    for (let i=0;i<n;i++){ const a0=S.P[i*3+1],b0=S.P[i*3+2]; if (Math.hypot(a0,b0) < 8) continue; const a1=outLab[i*3+1],b1=outLab[i*3+2]; tot++; if (a0*a1+b0*b1 < 0) neg++; }
    if (tot > 50 && neg/tot > .15) defeitos.push('possível inversão de cor (' + (100*neg/tot).toFixed(0) + '% dos tons de croma viraram o lado oposto)');
  }
  { // ruído em sombras/neutros: desvio padrão do croma do resultado nos pixels que eram quase pretos e neutros
    const cs = []; for (let i=0;i<n;i++){ const L=S.P[i*3],a=S.P[i*3+1],b=S.P[i*3+2]; if (L<20 && Math.hypot(a,b)<6) cs.push(Math.hypot(outLab[i*3+1],outLab[i*3+2])); }
    if (cs.length > 30) { const m=Metricas.media(cs); const sd=Math.sqrt(Metricas.media(cs.map(x=>(x-m)*(x-m)))); if (sd > 8) defeitos.push('ruído de cor em sombras/neutros (desvio padrão do croma ' + sd.toFixed(1) + ')'); }
  }

  // ---- imagens para conferência visual e para o teste prévia×cube ----
  const midV = VIDS[VIDS.length >> 1];
  const outC = document.createElement('canvas'); aplica(midV, outC);
  const midR = REFS[REFS.length >> 1];
  const cubeTxt = arquivoCube('teste');

  return {
    sem, tGerar,
    forcaFinal: A.forca, reduziu: M.reduziu,
    s: M.s,
    zonas, contraste, satRazao, pele, defeitos,
    g0: M.g0, g1: M.g1, passes: M.passes,
    qa: q, qa0: M.qa0, lim, refClip: M.refClip, refSat: M.refSat,
    cubeTxt,
    srcPNG: midV.toDataURL('image/png'),
    outPNG: outC.toDataURL('image/png'),
    refPNG: midR.toDataURL('image/png'),
    larguraOut: outC.width, alturaOut: outC.height,
  };
};

window.__compararImagens = async function(urlA, urlB) {
  // ΔE2000 médio/máximo entre duas imagens do mesmo tamanho (usa o lab() do próprio motor)
  const carregaImg = u => new Promise((ok, err) => { const im = new Image(); im.onload = () => ok(im); im.onerror = err; im.src = u; });
  const [imA, imB] = await Promise.all([carregaImg(urlA), carregaImg(urlB)]);
  const cA = document.createElement('canvas'); cA.width = imA.width; cA.height = imA.height; cA.getContext('2d').drawImage(imA, 0, 0);
  const cB = document.createElement('canvas'); cB.width = imA.width; cB.height = imA.height; cB.getContext('2d').drawImage(imB, 0, 0, imA.width, imA.height);
  const dA = cA.getContext('2d').getImageData(0, 0, cA.width, cA.height).data;
  const dB = cB.getContext('2d').getImageData(0, 0, cB.width, cB.height).data;
  let soma = 0, mx = 0, n = 0;
  for (let i = 0; i < dA.length; i += 4) {
    const a = lab(dA[i]/255, dA[i+1]/255, dA[i+2]/255), b = lab(dB[i]/255, dB[i+1]/255, dB[i+2]/255);
    const de = Metricas.de2000(a[0],a[1],a[2], b[0],b[1],b[2]);
    soma += de; if (de > mx) mx = de; n++;
  }
  return { media: soma / n, max: mx, n };
};
`;

function salvarDataURL(dataURL, destino) {
  const b64 = dataURL.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(destino, Buffer.from(b64, 'base64'));
}

async function novaPagina(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${PORTA}/testes-cor/harness.html`);
  await page.addScriptTag({ content: MOTOR_JS });
  await page.addScriptTag({ content: METRICAS_JS });
  await page.addScriptTag({ content: DRIVER_JS });
  return { ctx, page };
}

async function rodarUmPar(browser, par, outDir, throttle) {
  const { ctx, page } = await novaPagina(browser);
  let cdp = null;
  if (throttle) {
    cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  const urlV = `http://127.0.0.1:${PORTA}/${par.video}`;
  const urlR = `http://127.0.0.1:${PORTA}/${par.referencia}`;
  await page.setInputFiles('#fV', path.join(REPO, par.video));
  await page.setInputFiles('#fR', path.join(REPO, par.referencia));
  const r = await page.evaluate((perfil) => window.__rodarPar(perfil), par.perfil || null);

  // salva .cube, imagens lado a lado e confere prévia × ffmpeg lut3d (só na passada sem throttle)
  let cubeCompat = null, ffmpegDE = null;
  if (!throttle) {
    const cubePath = path.join(outDir, par.id + '.cube');
    fs.writeFileSync(cubePath, r.cubeTxt);
    cubeCompat = validarCube(cubePath);

    const srcPath = path.join(outDir, par.id + '-origem.png');
    const outPath = path.join(outDir, par.id + '-resultado.png');
    const refPath = path.join(outDir, par.id + '-referencia.png');
    salvarDataURL(r.srcPNG, srcPath);
    salvarDataURL(r.outPNG, outPath);
    salvarDataURL(r.refPNG, refPath);

    const ffmpegOutPath = path.join(outDir, par.id + '-ffmpeg-lut3d.png');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', srcPath, '-vf', `lut3d=file='${cubePath.replace(/'/g, "\\'")}'`, ffmpegOutPath]);
    const urlOut = `http://127.0.0.1:${PORTA}/testes-cor/out/${par.id}-resultado.png`;
    const urlFF = `http://127.0.0.1:${PORTA}/testes-cor/out/${par.id}-ffmpeg-lut3d.png`;
    ffmpegDE = await page.evaluate(([a, b]) => window.__compararImagens(a, b), [urlOut, urlFF]);

    // imagem lado a lado: original | resultado | referência
    // cada imagem pode ter proporção diferente (referência quase nunca tem a mesma proporção do vídeo);
    // encaixa as três numa caixa 320x400 (letterbox cinza) antes de colar lado a lado, senão o hstack falha
    const caixa = '[IN]scale=320:400:force_original_aspect_ratio=decrease,pad=320:400:(ow-iw)/2:(oh-ih)/2:color=0x2a2a2a[OUT]';
    try { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', srcPath, '-i', outPath, '-i', refPath,
      '-filter_complex', caixa.replace('IN', '0:v').replace('OUT', 'a') + ';' + caixa.replace('IN', '1:v').replace('OUT', 'b') + ';' + caixa.replace('IN', '2:v').replace('OUT', 'c') + ';[a][b][c]hstack=inputs=3',
      path.join(REPO, 'testes-cor', 'comparacoes', par.id + '.png')]); } catch (e) { console.error('hstack falhou para', par.id, e.message); }
  }

  await ctx.close();
  return { r, cubeCompat, ffmpegDE };
}

function validarCube(cubePath) {
  const txt = fs.readFileSync(cubePath, 'utf8');
  const linhas = txt.split('\n');
  const tamOk = /LUT_3D_SIZE 33\b/.test(txt);
  const domMinOk = /DOMAIN_MIN 0(\.0)? 0(\.0)? 0(\.0)?/.test(txt);
  const domMaxOk = /DOMAIN_MAX 1(\.0)? 1(\.0)? 1(\.0)?/.test(txt);
  const numeros = linhas.filter(l => /^-?\d/.test(l.trim()));
  const linhasOk = numeros.length === 33 * 33 * 33;
  const valoresOk = numeros.every(l => l.trim().split(/\s+/).length === 3);
  return { tamOk, domMinOk, domMaxOk, linhasOk, valoresOk, total: numeros.length,
    ok: tamOk && domMinOk && domMaxOk && linhasOk && valoresOk };
}

function calcularNota(m) {
  // Fórmula da nota (documentada em relatorio-cor/RELATORIO.md):
  //  30% semelhança geral de distribuição (semelhanca(), já oficial do motor)
  //  25% fidelidade por zona (ΔE2000 médio sombra/meio/alta luz)
  //  10% contraste (percentis 5/50/95 de L)
  //  10% saturação (razão de croma médio)
  //  15% pele (quando há pele nas duas imagens; senão redistribuída)
  //  10% ausência de defeitos (25 pontos por defeito encontrado)
  const pesos = { sem: 30, zona: 25, contr: 10, sat: 10, pele: 15, def: 10 };
  const zonasValidas = m.zonas.filter(z => z.de != null);
  const deZonaMedio = zonasValidas.length ? Metricas_media(zonasValidas.map(z => z.de)) : 0;
  const notaZona = clamp100(100 - deZonaMedio * 4);
  const notaContr = clamp100(100 - m.contraste * 3);
  const notaSat = clamp100(100 - Math.abs(m.satRazao - 1) * 150);
  const notaDef = clamp100(100 - 25 * m.defeitos.length);
  let notaPele = null;
  if (m.pele) notaPele = clamp100(100 - (m.pele.dhGraus * 2 + m.pele.dCroma * 6));

  let pesoTotal = pesos.sem + pesos.zona + pesos.contr + pesos.sat + pesos.def;
  let soma = m.sem * pesos.sem + notaZona * pesos.zona + notaContr * pesos.contr + notaSat * pesos.sat + notaDef * pesos.def;
  if (notaPele != null) { soma += notaPele * pesos.pele; pesoTotal += pesos.pele; }
  return { nota: Math.round(soma / pesoTotal), notaZona, notaContr, notaSat, notaDef, notaPele, deZonaMedio };
}
function clamp100(x) { return Math.max(0, Math.min(100, x)); }
function Metricas_media(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

async function main() {
  const args = process.argv.slice(2);
  const soIds = (() => { const i = args.indexOf('--pares'); return i >= 0 ? args[i + 1].split(',') : null; })();
  const saidaCsv = (() => { const i = args.indexOf('--out'); return i >= 0 ? args[i + 1] : path.join(__dirname, 'resultados.csv'); })();
  const rotulo = (() => { const i = args.indexOf('--rotulo'); return i >= 0 ? args[i + 1] : 'rodada'; })();

  const pares = JSON.parse(fs.readFileSync(path.join(__dirname, 'pares.json'), 'utf8'))
    .filter(p => !soIds || soIds.includes(p.id));

  const outDir = path.join(__dirname, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.join(REPO, 'testes-cor', 'comparacoes'), { recursive: true });

  const srv = await iniciar(REPO, PORTA);
  // usa o Google Chrome instalado no sistema (channel 'chrome'): evita depender da revisão exata
  // do chromium_headless_shell que o cache local do npx tem (podem estar desalinhadas).
  const browser = await chromium.launch({ channel: 'chrome' });
  const linhas = [];
  const resumo = [];
  try {
    for (const par of pares) {
      process.stderr.write('→ ' + par.id + ' (normal)\n');
      const { r, cubeCompat, ffmpegDE } = await rodarUmPar(browser, par, outDir, false);
      process.stderr.write('→ ' + par.id + ' (cpu 4x)\n');
      const { r: rT } = await rodarUmPar(browser, par, outDir, true);

      const notaCalc = calcularNota(r);
      resumo.push({ par, r, rT, cubeCompat, ffmpegDE, notaCalc });

      linhas.push({
        rotulo, id: par.id, categoria: par.categoria,
        nota: notaCalc.nota,
        semelhanca: r.sem,
        de_sombra: fmt(r.zonas[0].de), de_meio: fmt(r.zonas[1].de), de_alta: fmt(r.zonas[2].de),
        contraste: fmt(r.contraste), sat_razao: fmt(r.satRazao),
        pele_dh_graus: r.pele ? fmt(r.pele.dhGraus) : '', pele_dcroma: r.pele ? fmt(r.pele.dCroma) : '',
        defeitos: r.defeitos.length, defeitos_desc: r.defeitos.join(' | '),
        suavidade_g1: fmt(r.g1), suavidade_passes: r.passes,
        forca_final: r.forcaFinal, reduziu_qa: r.reduziu,
        tempo_ms_normal: fmt(r.tGerar), tempo_ms_cpu4x: fmt(rT.tGerar),
        cube_valido: cubeCompat.ok, cube_linhas: cubeCompat.total,
        previa_igual_cube_deMedio: fmt(ffmpegDE.media), previa_igual_cube_deMax: fmt(ffmpegDE.max),
      });
      process.stderr.write(`   nota=${notaCalc.nota} sem=${r.sem} defeitos=${r.defeitos.length} prévia×cube ΔE médio=${fmt(ffmpegDE.media)}\n`);
    }
  } finally {
    await browser.close();
    srv.close();
  }

  const header = Object.keys(linhas[0]);
  const csv = [header.join(',')].concat(linhas.map(l => header.map(h => csvEsc(l[h])).join(','))).join('\n') + '\n';
  const existia = fs.existsSync(saidaCsv);
  fs.appendFileSync(saidaCsv, (existia ? '' : header.join(',') + '\n') + linhas.map(l => header.map(h => csvEsc(l[h])).join(',')).join('\n') + '\n');

  const mediaNota = Metricas_media(resumo.map(x => x.notaCalc.nota));
  process.stderr.write(`\nNota média (${rotulo}): ${mediaNota.toFixed(1)}\n`);
  fs.writeFileSync(path.join(outDir, rotulo + '-resumo.json'), JSON.stringify(resumo.map(x => ({
    id: x.par.id, nota: x.notaCalc.nota, sem: x.r.sem, defeitos: x.r.defeitos,
    tempo_ms_normal: x.r.tGerar, tempo_ms_cpu4x: x.rT.tGerar,
    cube_valido: x.cubeCompat.ok, previa_cube_deMedio: x.ffmpegDE.media,
    forcaFinal: x.r.forcaFinal, reduziu: x.r.reduziu, qa0: x.r.qa0, qa: x.r.qa, lim: x.r.lim,
    refClip: x.r.refClip, refSat: x.r.refSat, s: x.r.s,
  })), null, 2));
}
function fmt(x) { return x == null ? '' : (Math.round(x * 100) / 100); }
function csvEsc(v) { v = String(v); return /[,"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

main().catch(e => { console.error(e); process.exit(1); });
