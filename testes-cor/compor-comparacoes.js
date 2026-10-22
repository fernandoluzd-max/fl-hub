// Gera, para cada par do banco de teste, uma imagem lado a lado:
// original | resultado antigo (antes das mudanças) | resultado novo | referência.
// Usado só para montar o relatório final (relatorio-cor/comparacoes/) — não roda no site.
'use strict';
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const REPO = path.join(__dirname, '..');
const OUT_NOVO = path.join(REPO, 'testes-cor', 'out');
const OUT_VELHO = '/tmp/out-velho';
const DEST = path.join(REPO, 'relatorio-cor', 'comparacoes');
fs.mkdirSync(DEST, { recursive: true });

const pares = JSON.parse(fs.readFileSync(path.join(REPO, 'testes-cor', 'pares.json'), 'utf8'));
const caixa = n => `[${n}:v]scale=280:350:force_original_aspect_ratio=decrease,pad=280:350:(ow-iw)/2:(oh-ih)/2:color=0x2a2a2a[${['a','b','c','d'][n]}]`;

for (const par of pares) {
  const origem = path.join(OUT_NOVO, par.id + '-origem.png');
  const velho = path.join(OUT_VELHO, par.id + '-resultado.png');
  const novo = path.join(OUT_NOVO, par.id + '-resultado.png');
  const ref = path.join(OUT_NOVO, par.id + '-referencia.png');
  const dest = path.join(DEST, par.id + '.png');
  const filtro = [0, 1, 2, 3].map(caixa).join(';') + ';[a][b][c][d]hstack=inputs=4';
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', origem, '-i', velho, '-i', novo, '-i', ref, '-filter_complex', filtro, dest]);
  console.log('ok', par.id);
}
