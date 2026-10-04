// Base FL no celular: este arquivo só existe para o navegador oferecer "Instalar".
// De propósito ele NÃO guarda nada: toda página vem sempre da internet, para ninguém ficar com versão velha.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function () {});
