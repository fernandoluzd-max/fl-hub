# Fidelidade de cor do Mood — relatório

Trabalho feito sozinho, do início ao fim, na branch `cor-mood` (a partir da `main` atual).
Só mexi dentro de `lut/` e `testes-cor/`; o relatório fica aqui, em `relatorio-cor/`.

## Resumo em uma frase

Nota média do banco de teste: **66,9 → 67,6** (0 a 100), sem piorar nenhum dos 8 pares em
nenhuma métrica, e sem mudar o tempo de gerar a LUT no celular simulado (ficou até 1,4% mais
rápido, na média — bem dentro do limite de +20% combinado).

## Tabela por par

| Par | Categoria | Nota antes | Nota depois | O que melhorou |
|---|---|---|---|---|
| `interior-pele` | Pessoa falando, ambiente interno (pele é o foco) | 80 | 80 | — (já estava bom; testei mudanças aqui mas descartei por regredir outro par) |
| `exterior-dia-ceu` | Externo de dia, com céu | 71 | 71 | — |
| `noite-baixa-luz` | Noite / pouca luz | 57 | 58 | Checagem automática mais fina (menos intensidade perdida à toa) |
| `log-lavado` | Vídeo bem lavado (baixo contraste/saturação) | 42 | **45** | Teto de saturação da checagem acompanha mais a referência |
| `ref-saturada` | Referência muito saturada (laranja/azul) | 60 | 60 | — |
| `ref-pastel` | Referência dessaturada / pastel | 65 | 65 | — |
| `cenas-diferentes` | Vídeo e referência sem nenhuma relação de conteúdo | 66 | 66 | — |
| `mesma-cena` | Mesma cena (caso fácil) | 94 | **96** | Checagem mais fina + teto de saturação |
| **Média** | | **66,9** | **67,6** | |

As imagens antes×depois (original \| resultado antes \| resultado depois \| referência) estão
em `relatorio-cor/comparacoes/<id>.png`, uma por par.

## A nota (0–100): como foi calculada

Cada par recebe uma nota só, combinando (pesos somam 100%):

- **30% — semelhança geral de cor**: a métrica `semelhanca()` que já existe no motor (mede a
  distância entre a distribuição de cor do resultado e da referência em 13 direções do espaço
  Lab, já é o que aparece na tela como "parecido com a referência").
- **25% — fidelidade por zona de luz**: ΔE2000 (a fórmula oficial CIEDE2000, a mais usada pra
  dizer se duas cores "parecem iguais" pro olho humano) entre a cor média do resultado e da
  referência em sombra, meio-tom e alta luz (três faixas por percentil de luminância).
- **10% — contraste**: diferença entre os percentis 5/50/95 de luminância do resultado e da
  referência.
- **10% — saturação**: o quanto o croma médio do resultado se afasta do croma médio da
  referência.
- **15% — pele** (só quando as duas imagens têm pele de verdade — usando a mesma `peleW()` do
  motor para achar os pixels de pele): diferença de tom (ângulo h) e de croma entre a pele do
  resultado e a pele da referência. Quando não há pele detectável nos dois lados, esse peso é
  redistribuído pelos outros.
- **10% — ausência de defeitos**: cada defeito encontrado (estouro acima do limite, saturação
  acima do limite, neutros tingidos, pele girando demais, degrau no cubo 33³, inversão de cor,
  ruído de cor em sombra/neutro) tira 25 pontos desse bloco.

Cada componente vira uma nota de 0 a 100 (zona: `100 − ΔE×4`; contraste: `100 − diff×3`;
saturação: `100 − |razão−1|×150`; pele: `100 − (Δh×2 + Δcroma×6)`), tudo limitado entre 0 e 100,
e a nota final é a média ponderada. A fórmula inteira está em `testes-cor/rodar.js`
(`calcularNota`), pra conferir ou ajustar o peso de cada coisa.

## O que mudou no motor (em termos simples)

**1) A checagem automática reduz a intensidade com passo mais fino** (`lut/index.html`,
`confere()`). Antes, quando a checagem reprovava a LUT em 100% de intensidade, o motor baixava
de 10 em 10 até no máximo 40%. Com passo de 10, muitas vezes a intensidade caía mais do que o
necessário — e em casos extremos (vídeo bem lavado recebendo uma referência bem colorida) nem
o piso de 40% resolvia, e a LUT ficava com um defeito real (saturação acima do limite) mesmo
assim. Agora o passo é de 5 em 5 e o piso desce até 20%: acha um ponto mais perto do ideal (menos
intensidade perdida à toa) e ainda resolve os casos extremos que antes ficavam travados
reprovados.

**2) O teto de saturação da checagem acompanha um pouco mais a referência** (`limites()`). Esse
teto travava a saturação média do resultado em no máximo ×2,0 em relação ao vídeo original, não
importa o quanto a referência pedisse. Isso penaliza mais o caso "vídeo bem lavado/Log recebendo
uma referência bem colorida" — no nosso banco de teste, a referência tinha quase ×7,7 mais cor
que o vídeo, a checagem reprovava e a intensidade caía demais, mesmo a proteção por pixel (que já
existia, `PROT.satMax`) já permitindo até ×3,2 nesses casos. As duas coisas não estavam
conversando. Subi o teto de ×2,0 para ×2,35 — ainda bem abaixo do ×3,2 da proteção por pixel, e só
entra em jogo quando a referência realmente pede mais que isso (nos outros pares nada mudou,
porque o teto já não era o fator que limitava o resultado).

Nenhuma das duas mudanças mexe no formato do `.cube`, no tamanho da grade (33×33×33), nos limites
de segurança por pixel (`PROT`), ou em qualquer coisa fora de `lut/index.html`.

## O que testei e descartei, e por quê

- **Mais "voltas" e mais quantis no refino de distribuição** (`REFINO.voltas` 6→8, `KQ` 40→48):
  essa etapa só entra em jogo quando o motor decide que vídeo e referência são "a mesma cena"
  (`M.s` alto) — e em 7 dos 8 pares do banco de teste (todos, menos `mesma-cena`), `M.s` é zero,
  então o refino simplesmente não influencia o resultado final nesses casos (o peso dele na
  mistura final é `M.s²`). Rodei o banco inteiro mesmo assim: nota idêntica, byte a byte, em
  todos os 8 pares. Descartei — não mudava nada e só deixaria a LUT mais lenta de gerar à toa.

- **Alcance maior na transferência de cor por zona do "look"** (`LOOK.capCor` 16→22, depois
  16→18 e 16→17): essa é a transferência usada quando vídeo e referência são cenas diferentes
  (os 7 pares citados acima). Com `capCor` maior, `exterior-dia-ceu` melhorava (+1), mas
  `noite-baixa-luz` piorava (−1 a −2) em todas as variações testadas — o vídeo escuro tem muito
  pixel perto do preto, e um alcance maior de cor empurra mais desses pixels pra fora do limite
  de estouro, o que a checagem automática corretamente pega e reage reduzindo a intensidade (o
  resultado final piora, não melhora). Como a regra é não piorar nenhum par, descartei mesmo nas
  variações mais conservadoras.

- **Zonas de luz mais largas** (`ZS` 0,15→0,19, suaviza mais a transição entre sombra/meio/alta
  luz): piorou `interior-pele` em 1 ponto (79 em vez de 80) sem melhorar o suficiente em troca.
  Descartei.

- **Mexer no tom de pele (giro, limites de `PROT`) ou nos neutros (`LOOK.capNeutro`,
  `neuBranco`)**: não mexi. No banco de teste, a diferença de pele já ficava pequena (entre 0,17°
  e 8,75° de diferença de tom nos pares com pele de verdade nas duas imagens) e os neutros já
  ficavam bem dentro do limite da checagem (ex.: `brancos` 1,66 contra um limite de 6 no pior
  caso) — sem um problema real medido, mexer seria "achismo" e um risco sem necessidade.

## Tempo para gerar a LUT (média dos 8 pares)

| | Antes | Depois | Variação |
|---|---|---|---|
| Normal | 284 ms | 284 ms | ~0% |
| CPU 4× mais lenta (celular simulado) | 1.116 ms | 1.100 ms | **−1,4%** |

Bem dentro do limite de +20% combinado — na prática, não mudou.

## Prévia × `.cube` (confirmação técnica)

Em todos os 8 pares, em cada rodada, o resultado que aparece na tela (`aplica()`) e o `.cube`
exportado aplicado via `ffmpeg -vf lut3d=...` batem: ΔE2000 médio entre os dois ficou entre 0,35
e 0,42 pixel a pixel (bem abaixo do limite de 1 usado como critério de "é a mesma coisa"). O
`.cube` de cada par passa na checagem de formato (`LUT_3D_SIZE 33`, `DOMAIN_MIN/MAX 0..1`, 35.937
linhas de 3 números) — a mesma estrutura que CapCut, Premiere, DaVinci e Final Cut esperam.

## Casos que ainda ficam ruins, e por quê

- **`log-lavado` (45) continua o pior par.** É o cenário mais difícil: vídeo quase sem contraste
  e sem cor nenhuma, pedindo pra chegar numa referência bem saturada e com sol forte. A checagem
  de segurança (saturação, estouro) segura bastante aqui de propósito — é o preço de não deixar a
  imagem "estourar" ou ficar artificial quando o pedido é grande demais pro material de entrada.
  Dá pra melhorar mais, mas exigiria mexer em como a proteção e a checagem decidem o limite pra
  esse tipo de caso extremo (não só o teto que já ajustei), e eu preferi não arriscar sem mais
  tempo de teste — decisão conservadora.
- **`noite-baixa-luz` (58) e `ref-saturada` (60)**: o vídeo e a referência são cenas diferentes
  (`M.s` = 0 nos dois), então o motor usa a transferência "look" mais conservadora em vez da
  transferência completa de distribuição — isso é intencional (evita copiar o conteúdo da
  referência, só o tratamento de cor), mas deixa menos preciso nas zonas de meio-tom/alta luz
  quando o clima pedido é bem diferente do vídeo original. Tentei abrir mais o alcance dessa
  transferência (ver "o que descartei") e piorou outro caso, então mantive como estava.
- Nenhum dos 8 pares tem defeito marcado (estouro, inversão de cor, ruído, degrau no cubo) — os
  números baixos nesses casos são de fidelidade "o quanto chegou perto", não de imagem
  estragada.

## Como testar em 2 minutos no site

1. Abra `/lut/` (ou `/lut/?direto=1`, do jeito que vem do WhatsApp pós-compra).
2. No passo 1, clique em **"Não tenho nada agora · usar um exemplo"** (não precisa de arquivo).
3. Clique em **"Copiar o mood"** — a animação roda e cai no passo 2 (ajuste), com a nota de
   semelhança e a checagem automática.
4. Clique em **"Ficou bom, quero a LUT"** — chega no passo 3, com o cartão do arquivo `.cube`.
5. Pra conferir o download de verdade (sem precisar comprar), rode no console do navegador, na
   tela do passo 3:
   ```js
   acesso = true; passo3();
   ```
   e clique em "Baixar" — baixa o `.cube` de verdade, gerado pelo motor atual.

Ou, automatizado, rode `node testes-cor/rodar.js` (gera a nota, o `.cube` e as imagens lado a
lado dos 8 pares) e `node testes-cor/teste-ui.js` (testa o fluxo da interface em 1280px e 390px).

## Banco de teste (`testes-cor/`)

- `testes-cor/pares.json` — os 8 pares e de onde vem cada vídeo/referência.
- `testes-cor/rodar.js` — roda o banco inteiro usando o código real do site (extraído de
  `lut/index.html` por marcadores, nunca copiado à mão), mede tudo e grava
  `testes-cor/resultados.csv` (histórico de todas as rodadas) e `testes-cor/comparacoes/*.png`.
- `testes-cor/teste-ui.js` — testa o fluxo da interface (upload → ajuste → resultado → baixar) em
  1280px e 390px, e confere que `?direto=1`, os eventos de analytics e o link de checkout da
  Greenn continuam intactos.
- `testes-cor/extrair-motor.js` — extrai o motor de cor direto de `lut/index.html` (por
  marcadores de comentário); se o arquivo for reorganizado (por exemplo, separado em
  `lut/app.js`), os marcadores em cima desse arquivo precisam ser revistos.

## Pull request

https://github.com/fernandoluzd-max/fl-hub/pull/2
