# Estilo do Cliente — protótipo

App estático (HTML + CSS + JS puro, sem build e sem backend) para montar a
identidade visual de vídeo de um cliente: escolher um dos 6 estilos prontos,
ajustar cores/fontes/legenda/logo/cor-do-vídeo no Estúdio, ver o motion e
baixar um pacote pronto para o editor usar no CapCut.

## Como abrir

Precisa de um servidor local — **não funciona com duplo clique no `index.html`**
(o navegador bloqueia a leitura de `estilos.json` por CORS quando a página é
aberta como arquivo direto).

1. Abra um terminal dentro da pasta `estilo/`.
2. Rode:
   ```
   python3 -m http.server 8787
   ```
   (qualquer servidor estático serve — `npx serve`, extensão "Live Server" etc.)
3. Abra `http://localhost:8787` no navegador.
4. Comece em **Biblioteca → + Novo cliente**.

## Fluxo

Biblioteca → Cliente novo → Referências (logo + fotos, extrai cores) →
Direções (3 estilos sugeridos) → Estúdio (ajusta tudo) → Motion (vê a
animação) → Aprovação (manual pro cliente aprovar) → Pacote (baixa o `.zip`).

Tudo é salvo automaticamente neste navegador (IndexedDB, com fallback para
localStorage). Não há conta, login nem servidor — cada navegador tem sua
própria biblioteca de clientes.

## Arquivos

- `estilos.json` — a biblioteca com os 6 estilos (edite aqui para ajustar
  textos, paletas, fontes, motion e regras de edição).
- `js/db.js`, `js/color.js`, `js/lut.js`, `js/zip.js`, `js/motion.js`,
  `js/app.js` — ver comentários no topo de cada arquivo.
