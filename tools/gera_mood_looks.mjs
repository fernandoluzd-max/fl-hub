// Cria os looks da demonstração da página do Mood (conheca/mood/assets/looks.png).
// Usa o MESMO motor da ferramenta (lut/index.html): cada look é a LUT que o Mood monta
// a partir da foto de referência e de quadros do vídeo de natureza.
// Rodar: node tools/gera_mood_looks.mjs   (precisa do playwright)
import { createRequire } from 'node:module';
let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire('/home/claude/.npm-global/lib/node_modules/')('playwright')); }
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const RAIZ = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const AS = path.join(RAIZ, 'conheca/mood/assets');
const fer = fs.readFileSync(path.join(RAIZ, 'lut/index.html'), 'utf8');
const motor = fer.slice(fer.indexOf('// ===================== cor: sRGB <-> Lab'), fer.indexOf('// ===================== estado'));
const d64 = f => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(AS, f)).toString('base64');
// força (0–100) de cada look já no ponto "colorista": a referência influencia, não domina
export const LOOKS = JSON.parse(fs.readFileSync(path.join(RAIZ, 'tools/mood_looks.json'), 'utf8'));
const prev = process.argv[2];   // pasta opcional para salvar prévias
const b = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath:'/opt/pw-browsers/chromium' } : {}); const p = await b.newPage();
await p.setContent('<canvas id="c"></canvas>');
await p.addScriptTag({ content: 'const N = 33;\n' + motor + '\nwindow.__m = { amostra, prepara, montaLUT, aplica, PADRAO, setA: v => { A = v; LUT = null; }, lut: () => LUT }; window.__pal = paleta;' });
const MIX = .65;   // intensidade padrão da página (o controle começa aqui)
const r = await p.evaluate(async ({ looks, am, refs, cena, MIX }) => {
  const img = u => new Promise(ok => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; c.getContext('2d', { willReadFrequently:true }).drawImage(i, 0, 0); ok(c); }; i.src = u; });
  const m = window.__m, S = m.amostra([await img(am)], 480), cn = await img(cena), N = 33, NA = 17;
  const at = document.createElement('canvas'); at.width = NA * NA; at.height = NA * looks.length; const x = at.getContext('2d'), out = [];
  const pal = window.__pal(await img(refs[looks.findIndex(l => l.id === 'golden')]), 5);
  for (let k = 0; k < looks.length; k++){
    const L = looks[k]; m.prepara(S, m.amostra([await img(refs[k])], 220)); m.setA({ ...m.PADRAO, pele:false, ...L.a }); m.montaLUT();
    const t = m.lut(), id = x.createImageData(NA * NA, NA), d = id.data;   // grade 33 -> 17 (um ponto sim, um não)
    for (let bz = 0; bz < NA; bz++) for (let g = 0; g < NA; g++) for (let rr = 0; rr < NA; rr++){ const s = (bz*2*N*N + g*2*N + rr*2) * 3, o = (g * NA * NA + bz * NA + rr) * 4; d[o] = Math.round(t[s] * 255); d[o+1] = Math.round(t[s+1] * 255); d[o+2] = Math.round(t[s+2] * 255); d[o+3] = 255; }
    x.putImageData(id, 0, k * NA);
    const c = document.createElement('canvas'); m.aplica(cn, c);   // imagem parada, na intensidade padrão
    const cx = c.getContext('2d'); cx.globalAlpha = 1 - MIX; cx.drawImage(cn, 0, 0); cx.globalAlpha = 1;
    const p = document.createElement('canvas'); p.width = 480; p.height = 270; p.getContext('2d').drawImage(c, 0, 0, 480, 270);
    out.push({ g: c.toDataURL('image/jpeg', .8), p: p.toDataURL('image/jpeg', .78) });
  }
  return { atlas: at.toDataURL('image/png'), out, pal };
}, { looks: LOOKS, am: 'data:image/jpeg;base64,' + fs.readFileSync(path.join(RAIZ, 'tools/mood_amostra.jpg')).toString('base64'), refs: LOOKS.map(l => d64('ref-' + l.id + '.jpg')), cena: d64('cena.jpg'), MIX });
const grava = (f, u) => fs.writeFileSync(path.join(AS, f), Buffer.from(u.split(',')[1], 'base64'));
grava('looks.png', r.atlas);
r.out.forEach((o, i) => { grava('g-' + LOOKS[i].id + '.jpg', o.p); if (LOOKS[i].id === 'golden') grava('cena-golden.jpg', o.g); if (prev) fs.writeFileSync(path.join(prev, 'look-' + LOOKS[i].id + '.jpg'), Buffer.from(o.g.split(',')[1], 'base64')); });
fs.writeFileSync(path.join(RAIZ, 'tools/mood_paleta.json'), JSON.stringify(r.pal));
await b.close(); console.log('looks ok', LOOKS.length);
