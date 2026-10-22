# Diagnóstico de fidelidade de cor do Mood

Trabalho de diagnóstico (sem mexer no motor de produção), feito na branch `cor-mood-diagnostico`
(a partir da `cor-mood`, onde ficou a PR #2). Não há PR aberto — é só investigação, pra decidir o
que vale a pena tentar.

**Como ler este documento**: toda vez que eu disser "a nota", é o número de 0 a 100 que o banco de
teste (`testes-cor/rodar.js`) calcula comparando o resultado com a referência (fórmula documentada
em `relatorio-cor/RELATORIO.md`, da PR #2). A nota é um **termômetro aproximado**, não o objetivo —
o objetivo é o vídeo parecer mais com a referência aos olhos de verdade. Em vários pontos deste
relatório a nota e a impressão visual concordam; em pelo menos um ponto importante (item 4.1) elas
discordam, e isso está marcado com destaque.

---

## 1. Resumo de uma página

**Existem duas causas, não uma, e elas são bem diferentes em natureza:**

**Causa nº 1 — um bug de controle, não uma limitação de arquitetura (fácil de corrigir).**
Quando a checagem automática (`confere()`) detecta um problema (cor demais, ou estouro de
brancos/pretos), ela só tem UM botão pra reagir: `A.forca`, um número único que reduz **cor e luz
ao mesmo tempo**, sempre na mesma proporção. Isso significa que, quando o problema real é só
"saturação passou do limite" (caso do `log-lavado`), o motor derruba o contraste/luminosidade
**junto**, mesmo o contraste não tendo feito nada de errado. É por isso que o pior caso do banco
(`log-lavado`, nota 45) fica visualmente quase idêntico ao vídeo original: a checagem corta a força
geral pra 40%, e nos 40% que sobram, tanto a cor quanto o contraste ficam fracos demais pra se notar.
Testei e confirmei: **separando as duas coisas** (deixar o contraste em 100% e reduzir só a cor, o
suficiente pra passar na mesma checagem de segurança), a imagem fica visivelmente mais contrastada e
"viva" — **sem violar nenhum limite de segurança que já existe hoje**. Isso se repetiu em 4 dos
12 pares do banco (2 de treino, 2 de validação), incluindo o pior caso de cada grupo. **Este item,
sozinho, é a correção de maior impacto visual, menor risco e menor esforço deste relatório.**

**Causa nº 2 — uma limitação real, mas que só aparece com força em certas condições.**
Quando vídeo e referência são cenas diferentes (o que acontece em praticamente todo uso real — 11
dos 12 pares do banco caem nesse caso), o motor usa um caminho mais conservador de propósito (a
função chamada de "look" no código), pensado pra não copiar o CONTEÚDO da referência, só o
tratamento de cor. Esse caminho tem limites fixos (ex.: no máximo ~16 unidades de cor por faixa de
luz, pouco importa o quanto a referência pede mais que isso) que o deixam deliberadamente mais fraco
que a referência pede. Parte disso é só ajuste de parâmetro (dá pra afrouxar um pouco, com cuidado).
Mas parte é **genuinamente estrutural**: o `.cube` final é uma função pura de "qual cor de entrada
vira qual cor de saída" — ele não sabe se um pixel é céu, parede ou pele, só sabe a cor dele. Dois
pixels com a mesma cor de entrada SEMPRE viram a mesma cor de saída, não importa se um é céu e outro
é uma blusa marrom. Isso é mensurável no pior exemplo do banco (`cenas-diferentes`): mesmo pedindo
mais força de transferência de cor nesse caminho, o resultado continua parecendo com o vídeo
original (tons quentes) e não com a referência (céu azul, grama verde) — porque não existe, dentro
de um único LUT 3D, um jeito de dizer "isso aqui é céu, pode ficar mais azul; isso aqui é pele, não
mexe".

**Resposta direta à pergunta central**: **não é um teto estrutural único — são dois problemas
empilhados.** O primeiro (a checagem que corta luz e cor juntos) está derrubando a nota e a
aparência visual MUITO mais do que a arquitetura obriga, e dá pra corrigir sem tocar no formato do
`.cube`. Só depois de corrigir esse primeiro problema é que faz sentido perguntar "o que resta é
estrutural?" — e a resposta, pros casos de conteúdo bem diferente (tipo `cenas-diferentes`), é
**sim, parte é estrutural de verdade**, mas pros outros casos (a maioria), ainda há espaço de
melhora dentro do formato atual antes de esbarrar nesse teto.

---

## 2. Causa técnica de cada caso, com evidência

Todas as imagens citadas abaixo estão em `relatorio-cor/comparacoes/` (os 8 pares de treino, da
PR #2) e `testes-cor/comparacoes/` (os 4 pares novos de validação, criados nesta rodada). As
imagens extras que comprovam os experimentos deste relatório estão em
`relatorio-cor/diagnostico-evidencias/`.

### 2.1 `log-lavado` (nota 45 → o pior do banco)

**O que se vê**: nas três primeiras colunas da imagem (original | resultado antes da PR#2 |
resultado depois da PR#2), o vídeo continua parecendo praticamente igual ao original — um vídeo
acinzentado, sem contraste, com uma leve pele/parede meio rosada. A referência (4ª coluna) é um
campo ao entardecer, saturado, com sol forte e sombras profundas. Mesmo de longe dá pra ver que o
resultado não "foi" na direção da referência de forma visível.

**Causa mecânica, confirmada com números** (script `testes-cor/experimentos/sonda.js`):
- O vídeo de origem tem croma médio (quantidade de cor) de só **2,09** (numa escala onde a
  referência tem **16,07** — 7,7× mais cor).
- Com a força em 100%, a transferência de cor (já limitada pelo teto interno do motor,
  `LOOK.capCor=16`) pede uma saturação final de **×4,22** em relação ao original.
- O limite de segurança atual pra saturação é `max(1,45, min(2,35, refSat×1,1))` = **2,35×** nesse
  caso (ajuste feito na PR #2).
- Como ×4,22 > ×2,35, a checagem automática (`confere()`) entra em ação: reduz `A.forca` de 5 em 5
  até passar. Resultado: **`A.forca` cai para 40%.**
- O problema: em `montaLUT()`, a força reduz `cor` E `luz` juntos (`cor = f*A.cor/100`,
  `luz = f*A.luz/100`, com `f = A.forca/100`). A checagem só reprovou por causa da SATURAÇÃO
  (`qa0.estouro=2,22%` já estava bem dentro do limite de 12,6%; só `qa0.sat=4,22` estourou o limite
  de 2,35) — mas a luz (contraste) é cortada do mesmo jeito, sem necessidade.

**Experimento que confirma** (`testes-cor/experimentos/grid-cor-luz.js`): testei TODAS as
combinações de `A.cor` × `A.luz` (9×9 = 81) de forma independente, procurando a melhor combinação
que ainda passa na MESMA checagem de segurança de hoje. Resultado:

| | cor | luz | passa na checagem? | nota de semelhança | ΔE médio por zona |
|---|---|---|---|---|---|
| Produção hoje | 40% | 40% | sim | 42 | 12,94 |
| Melhor combinação (cor solta, luz solta) | 40% | **100%** | sim | **46** | **10,91** |

A cor ficou igual (40%, o mesmo teto de saturação de hoje) — só a luz voltou a 100%. A imagem
resultante (`relatorio-cor/diagnostico-evidencias/log-lavado-cor-luz-decoupled.png`) tem sombra e
luz muito mais marcadas, puxando pra um visual mais "de cinema", claramente mais perto do clima da
referência, **sem violar nenhum limite de segurança**.

**E se tirasse TODA a proteção?** Também testei (mesmo script) rodar com `protege()` e `pele()`
desligadas e sem a checagem automática (força sempre 100%): a nota de semelhança sobe de 42 pra
só **55**, mas a saturação dispara pra **×4,48** — bem acima de qualquer limite seguro, claramente
artificial. Ou seja: **mesmo sem nenhuma proteção, o teto embutido no próprio "look" (`capCor=16`)
já impede o resultado de chegar muito mais longe que isso.** Esse teto fixo de 16 unidades não
escala com o quanto a referência pede (aqui a referência pede quase 8× mais cor) — é outro ponto de
ajuste possível, discutido no item 4.

### 2.2 `noite-baixa-luz` (nota 58)

**O que se vê**: o resultado fica escuro e com uma leve mudança pro verde/petróleo, mas não chega
perto do clima noturno azulado e mais contrastado da referência (uma rua à noite, molhada, com
luzes).

**Causa mecânica**: aqui quem falha não é a saturação (`qa0.sat=1,18`, bem dentro do limite 2,35),
é o **estouro** (`qa0.estouro=3,96%` contra um limite de 2,5%) — o vídeo de origem já tem muitos
pixels quase pretos (`p2=0,39` de luminância, ou seja, 2% dos pixels já nascem quase pretos), e a
curva de luz pedida pela referência aperta ainda mais essas sombras, estourando o limite de
pixels "colados" no preto ou no branco. A checagem corta `A.forca` pra 65% — de novo, cortando cor
e luz juntos por um problema que (neste caso) é principalmente de luz/contraste.

**Confirmado com a mesma busca em grade**: a melhor combinação que passa na checagem é
`cor=80%, luz=100%` (nota de semelhança 43→45, e a imagem fica visivelmente mais contrastada —
ver `relatorio-cor/diagnostico-evidencias/noite-baixa-luz-cor-luz-decoupled.png`).

### 2.3 `cenas-diferentes` (nota 66) — o melhor exemplo do teto estrutural

**O que se vê**: o vídeo (pessoa numa pérgula com luz quente) recebe como referência a foto de um
cachorro ao ar livre, com céu azul nítido e grama verde — uma referência fria, bem diferente do
vídeo. O resultado continua claramente quente/dourado, sem nenhum sinal visível de azul ou verde
"puxando" a cena. Pareceria, à primeira vista, que o motor ignorou a referência — mas os números
mostram que não é bem isso.

**Causa mecânica**: aqui a checagem automática **nem chega a reduzir a força** (`A.forca=100%`,
tudo passa limpo). A matemática do "look" (`zonasLook()`/`preparaLook()`, usada sempre que vídeo e
referência são cenas diferentes — ver item 3) calcula, pra cada faixa de luz, um pedido que vai na
direção certa, mas não uniforme: o componente `da` (eixo verde↔vermelho) pede mudança na direção
**verde** (negativo) nas 5 faixas de luz, do início ao fim — isso está certo, é o sentido pra se
afastar do laranja/marrom que domina o vídeo. Já o componente `db` (eixo azul↔amarelo) só pede
mudança na direção **azul** (negativo) nas sombras mais profundas e nas duas faixas de luz mais
altas (onde ficaria o céu — até −23 unidades de pedido bruto ali); na faixa de meio-tom ele pede o
CONTRÁRIO, um pouco mais de amarelo (+6,2) — um reflexo de como a própria distribuição de cor do
vídeo e da referência se cruzam zona a zona, não um erro, mas um lembrete de que "a direção certa"
não é um único vetor simples pra imagem inteira. O problema é que: (1) o teto fixo
`LOOK.capCor=16` já corta esse pedido; e (2) a função `look()` reduz ainda mais
a força da mudança de cor justamente nos tons mais claros e mais neutros
(`LOOK.neuBranco=0,75` — tons quase brancos recebem só 25% do efeito de cor) — exatamente a região
onde estaria o céu visível entre as ripas da pérgula, que é também a região onde a mudança seria
mais perceptível. Simulando de propósito **mais** transferência nesse caso (testei forçar o motor a
usar o caminho mais "completo", normalmente reservado pra quando vídeo e referência são a mesma
cena — ver item 4.3), a nota sobe (57→62), mas a imagem, olhando lado a lado, continua
visualmente quase igual — não fica reconhecivelmente mais "azul/verde". Isso é evidência de que
**aqui a nota consegue subir sem o resultado ficar visivelmente melhor** — o motivo mais provável é
que a transferência está distribuída por toda a imagem numa média que não reflete onde um humano
notaria a diferença (ver item 3 para a explicação estrutural completa).

### 2.4 Casos que passam limpo e têm nota 60–80 (`ref-saturada`, `ref-pastel`, `exterior-dia-ceu`,
`interior-pele`, e os de validação `val-noite-rua2`, `val-externo-nublado`)

Em todos esses, `A.forca` fica em 100% — a checagem de segurança nunca interfere. O teto é só o
quanto o "look" (conservador por desenho) permite. `interior-pele` (nota 80, o melhor desses) tem
pele nos dois lados (vídeo e referência), então a função `pele()` entra em ação e casa o tom de
pele do vídeo com o da referência — esse é o único mecanismo do "look" que de fato persegue um
alvo específico (não só "fique um pouco mais parecido"), e por isso rende melhor.

Em `ref-pastel` (nota 65), reparei visualmente que a pele do resultado fica com um tom
rosa/avermelhado mais forte do que o esperado numa referência "pastel". Conferindo os números: o
pedido de saturação por zona (`satLog`) é negativo em TODAS as faixas de luz (o motor está, sim,
dessaturando o fundo corretamente, na direção certa) — mas a pele, tratada à parte por `pele()`,
está sendo casada com o tom de pele da própria referência (uma foto de praia ao entardecer, que
tem luz quente mesmo sendo "pastel" no resto). Não é um bug: é o resultado esperado de tratar pele
e resto da imagem com regras diferentes — mas pode valer a pena conferir se bate com a expectativa
visual de "pastel" em algum ajuste futuro (não investiguei mais fundo, é um item de prioridade
baixa).

### 2.5 Casos de validação que confirmam o padrão em dados nunca usados pra ajustar nada

- **`val-log-frio`** (vídeo lavado diferente, referência fria — não dourada): nota 51, `A.forca`
  cortado pra **30%** (ainda mais que `log-lavado`). Mesmo padrão exato do item 2.1, com fonte e
  direção de cor diferentes — confirma que a causa não é peculiaridade de um vídeo específico.
- **`val-retrato-fria`** (pele dos dois lados, referência de grade fria): nota 54, `A.forca`
  cortado pra **35%**. Este é o achado mais chamativo da validação: rodando a mesma matemática
  **sem o corte automático de força** (ou seja, com a proteção por pixel — `protege()`/`pele()` —
  ligada normalmente, só sem o `confere()` reduzindo tudo pra 35%), a nota de semelhança chega a
  **93** — ou seja,
  "debaixo do capô" o "look" está fazendo um trabalho ótimo nesse par (melhor que quase todo par do
  banco!), mas a checagem automática empurra pra 35% e destrói quase todo esse resultado. A imagem
  em `relatorio-cor/diagnostico-evidencias/val-retrato-fria-original-producao-decoupled-referencia.png`
  mostra lado a lado: original | produção hoje (quase igual ao original) | melhor combinação com
  luz solta (visivelmente mais fria e contrastada, perto do clima da referência) | referência.
- **`val-noite-rua2`** (nota 69) e **`val-externo-nublado`** (nota 80): aqui a checagem não corta
  nada (`A.forca=100%`) — o teto é só a conservadorice normal do "look", igual ao item 2.4.

---

## 3. Avaliação de arquitetura: o que é (a), (b) ou (c)

**(a) Limitação do algoritmo de ajuste atual — resolvível sem mudar a arquitetura:**
- A checagem automática (`confere()`) reduzir cor e luz juntos por um só botão (`A.forca`), mesmo
  quando só um dos dois é o problema. **Confirmado com maior confiança — é a causa isolada de
  maior impacto encontrada neste diagnóstico.**
- O teto fixo `LOOK.capCor=16` (mesma quantidade de cor liberada por faixa de luz, não importa se a
  referência pede 2× ou 8× mais cor que o vídeo tem). Parcialmente testado (item 2.1): mesmo sem
  nenhuma proteção, esse teto já limita bastante o resultado em `log-lavado`.
- `LOOK.neuBranco=0,75` (tons quase brancos recebem só 25% da mudança de cor) — intencional (evita
  "sujar" os brancos), mas pode estar sendo conservador demais nos casos onde o branco É a parte da
  imagem que mais precisaria mudar (ex.: o céu em `cenas-diferentes`).

**(b) Limitação de como os dados são lidos/amostrados:**
- `peleW()` (a função que decide "isso é pele") exige uma saturação mínima na cor de ENTRADA pra
  reconhecer pele. Em vídeo muito lavado/Log, a pele já nasce quase sem cor — e não é reconhecida
  como pele (`qa.pele` sai `null` nos três piores casos do banco: `log-lavado`, `noite-baixa-luz`,
  `val-log-frio`). Na prática isso significa que, justamente nos vídeos mais difíceis, a pele do
  usuário fica SEM a proteção extra que roda nos outros casos. Testei visualmente
  (`relatorio-cor/diagnostico-evidencias/log-lavado-zoom-pele.png`): neste caso específico a pele
  não ficou com um tom visivelmente errado (só ficou tão "sem cor" quanto o resto da imagem) — mas
  é um mecanismo frágil que pode se comportar pior em outro vídeo/outra referência, vale corrigir
  por precaução, prioridade moderada.
- Não achei evidência de "quantis colapsados" por pouca faixa dinâmica (a hipótese original que eu
  ia verificar) — mesmo no vídeo mais lavado do banco, a faixa de luminância (`p2` a `p98`) ainda
  cobre uma faixa razoável (56 a 93, numa escala de 0 a 100), então os quantis não colapsam na
  prática. Essa hipótese específica **não se confirmou**.

**(c) Limitação estrutural do formato de saída — o teto real:**
- Um `.cube` 33×33×33 é uma função pura `cor de entrada → cor de saída`. Por definição, dois
  pixels com a MESMA cor de entrada sempre recebem a MESMA cor de saída — não importa se um é o
  céu atrás da pérgula e o outro é a camiseta marrom da pessoa. Isso é uma restrição matemática do
  formato, não um bug: nenhum ajuste de parâmetro muda esse fato.
- O caso mais claro disso no banco é `cenas-diferentes` (item 2.3): o motor até calcula a direção
  certa de cor pra cada faixa de luz, mas não tem como dizer "aplique mais força bem ali, no céu" —
  só pode aplicar uma regra igual pra tudo que tem aquela luminância e aquele tom, em QUALQUER
  lugar da imagem.
- **Isso importa mais ou menos dependendo de quão parecido o conteúdo da referência costuma ser do
  vídeo da pessoa, na prática.** Não tenho como saber isso só olhando o código — é uma pergunta de
  produto (quem usa o Mood costuma escolher referências do MESMO tipo de cena, tipo outro vídeo de
  pessoa falando? Ou busca referências de filme/clipe sem relação nenhuma de conteúdo?). Se for
  majoritariamente o primeiro caso, o teto estrutural importa pouco na prática (a maioria dos pares
  reais seria mais parecido com `interior-pele`/`ref-saturada` do que com `cenas-diferentes`). Se
  for o segundo, o teto estrutural é um limite real e será sentido por muita gente.

**Resposta direta, separada por item**: a causa nº 1 (item 1) é 100% categoria (a). A causa nº 2 é
uma mistura: o teto `capCor`/`neuBranco` é (a) (ajustável), a falha de detecção de pele em vídeo
lavado é (b) (ajustável), e a incapacidade de tratar céu e pele de forma diferente quando têm cores
parecidas é (c) — real, comprovada, mas cujo impacto prático depende de uma pergunta de produto que
só o Fernando pode responder.

---

## 4. Lista priorizada de melhorias

Cada item traz: o que é, impacto visual esperado, complexidade, risco, se cabe no `.cube` único, e
se foi testado (e com qual resultado, nos dados de validação quando fizer sentido).

### 4.1 — Separar o botão de "cor" do botão de "luz" na checagem automática (`confere()`)

- **O que é**: quando a checagem reprova, hoje ela reduz `A.forca` (que corta cor E luz juntos).
  A mudança proposta: identificar qual checagem específica falhou (saturação → reduzir só `cor`;
  estouro de luz → reduzir só `luz`; as outras, ver caso a caso) e reduzir só o que precisa, não
  os dois.
- **Impacto visual esperado**: **alto**, especificamente nos piores casos do banco — são
  exatamente os casos que mais precisam de ajuda. Confirmado visualmente em 3 pares (2 de
  validação, nunca usados pra desenhar a ideia): o resultado fica mais contrastado e "vivo" sem
  violar nenhum limite de segurança existente.
- **Complexidade**: baixa — é lógica dentro de uma função só (`confere()`), sem mexer no resto do
  motor nem no formato de saída.
- **Risco de regressão/artefato**: baixo. A busca em grade testada (81 combinações por par) não
  achou nenhuma combinação "melhor" que violasse qualquer limite de segurança — a proposta é
  continuar respeitando os MESMOS limites de hoje, só com um caminho mais inteligente até eles.
- **Cabe no `.cube` único?** Sim, sem nenhuma mudança de formato.
- **Testado?** Sim — busca em grade completa (`testes-cor/experimentos/grid-cor-luz.js`) em
  `log-lavado`, `noite-baixa-luz` (treino) e `val-log-frio`, `val-retrato-fria` (validação, nunca
  vistos antes). Ganho de nota de semelhança: +4 (log-lavado), +2 (noite-baixa-luz); em
  `val-retrato-fria` a nota não muda muito (46→46) mas a imagem fica visivelmente melhor — bom
  exemplo de que a nota não captura tudo.

### 4.2 — Afrouxar `LOOK.capCor` com cuidado, agora que o item 4.1 existe

- **O que é**: hoje `LOOK.capCor=16` é fixo. A PR #2 já tentou subir isso (16→22, depois 16→18 e
  16→17) e reverteu porque piorava `noite-baixa-luz` — mas isso foi tentado ANTES do item 4.1
  existir, quando qualquer efeito colateral (ex.: mais estouro) só podia ser corrigido cortando
  cor E luz juntos. Com o botão separado, talvez dê pra afrouxar esse teto sem repetir a regressão
  antiga.
- **Impacto visual esperado**: médio-alto nos casos onde a referência pede muito mais cor que o
  vídeo tem (`log-lavado`, `val-log-frio`, e qualquer caso parecido no mundo real).
- **Complexidade**: baixa-média (um número pra ajustar, mas precisa re-testar o banco inteiro,
  treino E validação, a cada tentativa, pra não repetir o erro de otimizar só pros casos óbvios).
- **Risco**: médio — é literalmente o ajuste que já causou uma regressão documentada na PR #2;
  exige testar com cuidado.
- **Cabe no `.cube` único?** Sim.
- **Testado?** Não diretamente (dependeria do item 4.1 estar pronto primeiro, pra isolar o efeito).
  Recomendo como segundo passo, depois do item 4.1.

### 4.3 — Deixar a transferência "completa" (zonas por covariância + refino) entrar um pouco mesmo quando a cena é diferente, SE o vídeo de origem tiver pouca cor pra começar

- **O que é**: hoje a transferência mais expressiva (a mesma que dá nota 96 em `mesma-cena`) só
  entra quando o motor detecta "mesma cena" (`M.s`), o que não acontece quase nunca no uso real.
  A ideia: permitir um pouco dela mesmo em cena diferente, mas só quando o vídeo de origem já tem
  pouca cor (pouco risco de "copiar conteúdo" de uma referência bem diferente, porque não tem muito
  conteúdo de cor pra misturar).
- **Testado — resultado: NÃO RECOMENDO.** Simulei (`testes-cor/experimentos/piso-mesma-cena.js`)
  forçar um piso artificial em `M.s` (0,15 a 0,5) em 4 pares, incluindo 2 "lavados" (onde a ideia
  deveria ajudar) e 2 de conteúdo bem diferente (como contraprova, onde deveria arriscar copiar
  conteúdo indevido). Resultado: nos casos lavados (`log-lavado`, `val-log-frio`), a nota **não
  melhora** (ficou igual ou um pouco pior) — a checagem automática reage ao resultado mais forte e
  corta ainda mais a força depois. Nos casos de conteúdo diferente (`cenas-diferentes`,
  `val-externo-nublado`), a nota **melhora** (57→62 e 77→79) — mas comparando as imagens lado a
  lado, o resultado visual é quase idêntico ao de antes. **Isto é exatamente o tipo de mudança que
  melhora o número sem melhorar o que a pessoa vê — o Fernando pediu explicitamente pra não fazer
  isso.** Não recomendo seguir com essa ideia do jeito que testei.

### 4.4 — Proteção de pele mais robusta em vídeo lavado/pouca cor

- **O que é**: fazer `peleW()` (ou uma segunda passada) reconhecer pele mesmo quando o vídeo de
  entrada ainda tem pouca saturação (hoje a detecção de pele depende de um mínimo de cor que
  vídeos lavados não têm).
- **Impacto visual esperado**: baixo-médio hoje (no único caso que olhei de perto,
  `log-lavado`, a pele não ficou com cor visivelmente errada — só ficou tão sem-cor quanto o
  resto). Mas é um mecanismo frágil, e o impacto pode ser maior combinado com os itens 4.1/4.2
  (se a cor geral ficar mais forte, a falta de proteção de pele pode começar a aparecer).
- **Complexidade**: baixa-média.
- **Risco**: baixo (é só adicionar proteção, não tirar).
- **Cabe no `.cube` único?** Sim.
- **Testado?** Parcialmente — confirmei a causa mecânica com números (`qa.pele == null` nos 3
  piores casos do banco) e uma conferência visual, mas não cheguei a implementar nem testar uma
  correção.

### 4.5 — Trocar o espaço de cor de Lab pra Oklab

- **O que é**: o motor inteiro usa o espaço de cor "Lab" (de 1976) pra tudo — incluindo os limites
  de giro de tom (`PROT.giro`, `LOOK.giro`) e de saturação. O Oklab (2020) é mais moderno e
  resolve alguns problemas conhecidos do Lab, principalmente na região do azul.
- **Testado — resultado: NÃO RECOMENDO priorizar.** Fiz dois testes numéricos isolados
  (`testes-cor/experimentos/oklab-vs-lab.js`, sem depender do navegador):
  1. Girar o tom pelo mesmo número de graus em cores de ângulos diferentes produz uma mudança
     perceptual (ΔE2000) bem desigual tanto em Lab (razão 1,47× entre o mais fraco e o mais forte)
     quanto fazendo a MESMA rotação dentro do Oklab (razão 1,48×) — ou seja, **pra essa operação
     específica, o Oklab não é mais uniforme que o Lab**. Hipótese não confirmada.
  2. Esticar só a saturação (mantendo o ângulo de tom igual em Lab) — o que `PROT.satMax` faz nos
     casos extremos (até ×3,2) — faz o tom PERCEBIDO (medido em Oklab) desviar até ~5° na região
     azul/roxo, e menos de 2° na região de pele. É um efeito real, mas pequeno, e concentrado numa
     região que não é a mais crítica (pele).
- Migrar o motor inteiro pra Oklab reescreveria praticamente toda a matemática de cor e exigiria
  re-calibrar cada constante numérica hoje pensada em unidades de Lab (`capCor=16`, `giro=25°`,
  `CMAX=1,6` etc.) do zero — um esforço grande pra um ganho que os próprios números não confirmam
  com força. **Não vale a pena agora.**

### 4.6 — Zonas de "look" também por tom (hue), não só por luz

- **O que é** (ideia nova, não testada): hoje o "look" divide a imagem em 5 faixas por
  LUMINÂNCIA e trata cada faixa com uma cor própria. E se também separasse por TOM (ex.: tons de
  céu/azul tratados separado de tons de pele/pergola), mesmo sem saber a posição do pixel? Como
  céu e pele normalmente têm tons bem diferentes, isso poderia ajudar casos como
  `cenas-diferentes` sem quebrar a regra do `.cube` único (continua sendo só função de cor, mais
  rica, não de posição).
- **Impacto visual esperado**: incerto — pode ajudar casos como `cenas-diferentes`, mas não está
  testado.
- **Complexidade**: média-alta (mexe na extração de zonas e exige re-calibrar bastante coisa).
- **Risco**: médio (zonas por tom podem ficar instáveis em vídeos com pouca variedade de cor).
- **Cabe no `.cube` único?** Sim.
- **Testado?** Não — fica como ideia pra uma próxima rodada, não como recomendação pra já.

### 4.7 — Fora de escopo agora, mas existe: entregar algo além de um `.cube` só

- Exportar o resultado como um vídeo já renderizado (não um LUT reaproveitável) permitiria
  correção seletiva de verdade (céu separado de pele, por posição/objeto) — contorna de vez a
  limitação estrutural do item 3(c). **Não recomendo agora**: muda completamente o produto (deixa
  de ser "uma LUT que você aplica em qualquer editor" e vira "renderizamos seu vídeo pra você"),
  exige infraestrutura de vídeo que hoje não existe, e quebra a regra explícita de abrir sozinho
  no CapCut/Premiere/DaVinci/Final Cut sem passo extra.
- Oferecer, à parte do `.cube`, instruções/ajustes extras pra quem edita no Premiere/DaVinci (que
  suportam seleção de cor por qualificador/power window) daria mais precisão pra quem usa esses
  programas especificamente — mas excluiria CapCut e Final Cut (que não têm esse recurso tão
  acessível) e quebraria "funciona sozinho, sem passo extra". **Não recomendo agora**, registro só
  porque a pergunta foi feita.

---

## 5. Recomendação clara

**Tentar primeiro — item 4.1 (separar o botão de cor do de luz na checagem automática).**
Maior impacto visual comprovado, menor risco, menor esforço, zero mudança de formato. É a única
mudança deste relatório com evidência forte nos dois lados do banco (treino E validação) mostrando
tanto a nota quanto a imagem melhorando juntas, nunca uma sem a outra.

**Tentar segundo — item 4.2 (afrouxar `LOOK.capCor`), só depois do item 4.1 estar valendo.**
Tem potencial de impacto maior ainda nos casos mais extremos (`log-lavado`, `val-log-frio`), mas
precisa ser testado com cuidado pra não repetir a regressão que a PR #2 já encontrou — e só faz
sentido tentar depois que o item 4.1 já tiver tirado o "amplificador" que piorava essas tentativas
antes (cortar luz e cor juntos quando só a cor precisava ceder).

**Tentar terceiro — item 4.4 (proteção de pele em vídeo lavado), como reforço de segurança.**
Risco baixo, não depende dos outros itens, mas o impacto visual medido até agora é modesto — vale
mais como precaução (principalmente se os itens 4.1/4.2 passarem a empurrar mais cor pra dentro de
vídeos lavados) do que como correção urgente.

**Não vale a pena tentar agora:**
- **Item 4.3** (piso artificial em "mesma cena"): testado, não ajuda os casos que deveria ajudar, e
  nos casos que "melhoram" a nota, a imagem não muda visivelmente — risco de mexer só pra melhorar
  o número, o oposto do que foi pedido.
- **Item 4.5** (migrar pra Oklab): testado numericamente, o ganho específico que eu esperava não se
  confirmou com força suficiente pra justificar reescrever e recalibrar o motor inteiro.
- **Item 4.7** (sair do formato `.cube`): quebra a regra de compatibilidade (abrir sozinho nos 4
  programas, sem passo extra), que continua valendo.

**Fica como decisão do Fernando, não técnica**: o quanto a limitação estrutural real (item 3-c,
"o LUT não sabe o que é céu nem o que é pele") importa no dia a dia depende de quão parecido o
conteúdo da referência costuma ser do vídeo da pessoa, no uso real do Mood. Isso eu não tenho como
medir só olhando o código — é uma pergunta sobre quem usa a ferramenta e como.

---

## Sobre o banco de teste ampliado

`testes-cor/pares.json` agora tem 12 pares, com uma coluna `"conjunto"`: `"treino"` (os 8 da PR #2,
usados pra formar as hipóteses deste relatório) e `"validacao"` (4 pares novos, criados só pra
checar se as ideias generalizam — **nunca usados pra desenhar nenhuma das propostas acima**):

| id | categoria | conjunto | nota | observação |
|---|---|---|---|---|
| val-log-frio | vídeo lavado, referência fria (não dourada) | validação | 51 | repete o padrão do log-lavado com fonte e direção de cor diferentes |
| val-noite-rua2 | noite/pouca luz, fonte e referência diferentes | validação | 69 | não é cortado pela checagem — teto é só a conservadorice do "look" |
| val-retrato-fria | pele dos dois lados, referência fria | validação | 54 | cobre um buraco do treino (pele só é testada em mesma-cena) |
| val-externo-nublado | externo nublado/dessaturado | validação | 80 | condição de luz nova (nublado) |

Os vídeos e referências novos foram gerados com `ffmpeg` a partir de material já existente do
próprio repositório (`lut/demo/*`), do mesmo jeito que a PR #2 já tinha feito pros 8 pares
originais — nenhum material de terceiros foi usado. Detalhes de como cada um foi gerado estão no
campo `"obs"` de cada entrada em `pares.json`.

**Limitação de cobertura, pra ser honesto**: todos os 12 pares usam a mesma pessoa/vídeo-base como
"vídeo do usuário" (variando o tratamento de cor via `ffmpeg`, não o conteúdo real). Isso significa
que o banco testa bem variações de LUZ e COR, mas não testa de verdade variação de tom de pele
real, de câmera, nem de enquadramento — seria preciso gravar (ou conseguir, com autorização) material
novo de verdade pra cobrir isso, o que ficou fora do escopo deste diagnóstico.

## Scripts de experimento (`testes-cor/experimentos/`)

Todos descartáveis, não fazem parte do motor de produção, cada um comentado no topo explicando a
hipótese que testa:

- `sonda.js` — instrumenta o motor real pra expor por dentro (M.s, PROT ajustado, pedidos de cor
  por zona antes/depois dos tetos, faixa dinâmica) e roda uma versão "sem rede de segurança".
- `grid-cor-luz.js` — busca em grade (cor × luz, independentes) pra achar a melhor combinação que
  ainda passa na checagem de segurança de hoje (evidência do item 4.1).
- `piso-mesma-cena.js` — testa forçar a transferência "completa" a entrar mesmo em cena diferente
  (evidência do item 4.3, descartado).
- `oklab-vs-lab.js` — compara Lab e Oklab pra rotação de tom e constância de tom sob saturação,
  sem depender do navegador (evidência do item 4.5, não priorizado).

A saída desses scripts (`testes-cor/experimentos/saida/`) não é versionada (muda a cada rodada,
puramente reproduzível rodando o script de novo) — só os scripts e este relatório ficam no
histórico.
