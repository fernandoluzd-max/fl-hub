// Servidor estático bem simples (sem dependências) para servir a raiz do repo
// durante os testes: o harness.html e os arquivos de vídeo/imagem dos pares
// precisam de uma origem http:// (vídeo via file:// é bloqueado no Chromium headless).
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
};

function iniciar(root, porta) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      try {
        const url = decodeURIComponent(req.url.split('?')[0]);
        let p = path.normalize(path.join(root, url));
        if (!p.startsWith(root)) { res.writeHead(403); return res.end('fora da raiz'); }
        if (fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
        const ext = path.extname(p).toLowerCase();
        const stat = fs.statSync(p);
        res.writeHead(200, { 'Content-Type': TIPOS[ext] || 'application/octet-stream', 'Content-Length': stat.size, 'Accept-Ranges': 'bytes' });
        fs.createReadStream(p).pipe(res);
      } catch (e) {
        res.writeHead(404); res.end('não achei: ' + req.url);
      }
    });
    srv.on('error', reject);
    srv.listen(porta, '127.0.0.1', () => resolve(srv));
  });
}

module.exports = { iniciar };
