# Viabilidade: Títulos Dinâmicos com cores/fontes do cliente

Investigação de viabilidade apenas — nenhum código de produto foi alterado. Não foi encontrado,
em todo o repositório (fora de `node_modules` e fora desta pasta `estilo/`), nenhum arquivo real
de predefinição/projeto do CapCut (nenhum `draft_content.json`, nenhum `.flpack`, nenhuma pasta
`preset_draft`). Por isso este documento substitui a POC pedida — ver seção "Por que não fiz a
POC" no final.

## 1. Como o pipeline de pacotes funciona hoje

### Formato do pacote (`core/src/pack.rs:1-65`)
Um "Título Dinâmico" é distribuído como `.flpack`: um zip com um `manifest.json` na raiz
(`core/src/pack.rs:1-65`, comentário de topo descreve o schema) apontando para:
- `presets_dir` (padrão `"presets"`): uma pasta por título, cada uma contendo uma subpasta
  `preset_draft/` com `draft_content.json` dentro (confirmado em `core/src/install.rs:497` e no
  teste `core/tests/assets_presets.rs:32`, que lê
  `presets.join(nome).join("preset_draft/draft_content.json")`).
- `resources_dir` (opcional): arquivos de mídia (vídeos/sons) que o título referencia.
- `fonts_dir` / `fonts_windows_dir`: fontes (`.ttf`/`.otf`/`.ttc`) embutidas no pacote.
- `index`: um `index.json` opcional usado para organizar os títulos em pastas dentro do CapCut
  (`CombinationPresetVirtualStore.json`, ver `core/src/index.rs`, não lido em detalhe mas referenciado
  em `core/src/install.rs:467-478` e `core/src/install.rs:519-537`).
- `required_fonts`, `aliases`, `substitutes_windows`: mapeamento de fontes.

`Pack::open` (`core/src/pack.rs:77-99`) extrai o zip para uma pasta temporária e `Pack::from_dir`
(`core/src/pack.rs:102-106`) lê o `manifest.json` com `serde_json`.

### Instalação (`core/src/install.rs`)
`install()` (`core/src/install.rs:369-591`) é o fluxo principal para pacotes do tipo "preset"
(títulos/legendas; há ramos separados para `kind == "media"` em `install_media`,
`core/src/install.rs:163-231`, e `kind == "lut"` em `install_luts`, `core/src/install.rs:259-343`):
1. Detecta a(s) pasta(s) `User Data` do CapCut no computador do aluno (`env.capcut_user_data()`).
2. Instala fontes físicas do pacote (`install_fonts`, `core/src/fonts.rs`) e monta um mapa
   "nome do arquivo de fonte em minúsculas → caminho final no disco do aluno"
   (`fr.map`, usado em `core/src/install.rs:407-414` e passado ao `Patcher`).
3. Para cada pasta de predefinições do CapCut (`raiz.join("Combination").join("Presets")`,
   `core/src/install.rs:428`): copia cada pasta de título do pacote (`copy_dir`,
   `core/src/install.rs:437`) e qualquer recurso de mídia (`core/src/install.rs:440-464`).
4. Mescla o `index.json` do pacote no índice existente do CapCut (`index::merge`,
   `core/src/install.rs:473`) para o título aparecer na pasta certa da aba de predefinições.
5. **Aplica o `Patcher` em cada título recém-copiado** (`core/src/install.rs:479-481`):
   `patcher.patch_dir(&presets.join(n))`. Isto é a parte mais relevante para a tarefa.
6. Verifica que o `draft_content.json` de cada título continua sendo JSON válido depois do patch
   (`core/src/install.rs:496-501`) — se não for, a instalação inteira é desfeita
   (`desfazer(acoes)`, `core/src/install.rs:507-511`, usando o backup/registro de ações
   `Acao::Criou` / `Acao::Moveu` / `Acao::Indice`, `core/src/install.rs:125-155`).
7. Registra o que foi instalado em `Installed`/`state_path` para permitir desinstalação e
   atualização sem duplicar nem apagar mídia de projetos antigos do aluno.

### `patch.rs` já existe — e é a pista mais importante
`core/src/patch.rs` define `Patcher`, cuja única responsabilidade hoje é **reescrever caminhos de
arquivo** dentro dos `.json`/`.bak`/`.tmp` de um título, para que o pacote funcione no computador
de quem comprou (que não é o computador de quem criou o título):
- `re_font` (`core/src/patch.rs:25`): regex que casa `"<pasta>/<nome>.ttf|otf|ttc"` dentro do JSON
  e substitui pelo caminho da fonte **já instalada neste computador** (via o mapa `map` vindo de
  `fonts.rs`), ignorando caminhos em `/Cache/effect/` (efeitos que o CapCut baixa de novo pelo id).
- `rules` (`core/src/patch.rs:26-47`): troca o prefixo da pasta `User Data` do CapCut de quem criou
  o pacote (Mac: `/Users/.../Movies/CapCut/User Data` ou o caminho de dentro do sandbox do app
  `com.lemon.lvoverseas`; Windows: `C:/Users/.../AppData/Local/CapCut/User Data`) pela pasta
  equivalente no computador do aluno, e resolve o marcador `__PLUGA_UD__` usado pelos pacotes
  gerados internamente.
- `patch_text()` (`core/src/patch.rs:50-75`) aplica essas substituições com `Regex::replace_all`
  sobre o texto bruto do arquivo (não desserializa para uma struct Rust tipada — trabalha direto
  em cima do texto/JSON genérico via `serde_json::Value` só em outros pontos do código, aqui é
  regex em string).
- `patch_dir()` (`core/src/patch.rs:78-100`) percorre recursivamente a pasta do título
  (`WalkDir`) e aplica `patch_text` em todo `.json`/`.bak`/`.tmp`, pulando `crypto_key_store*`
  (chave binária do CapCut, nunca tocada).

**Conclusão chave**: o mecanismo de "abrir o JSON do título, reescrever um valor dentro dele e
regravar, com verificação de JSON válido e desfazer automático em caso de erro" **já existe e já
roda em produção** para cada título instalado, hoje reescrevendo caminhos. Um "recolorir" seria,
arquiteturalmente, mais uma regra de substituição no mesmo `Patcher` (ou um módulo irmão chamado
na mesma etapa de `install()`, `core/src/install.rs:479-481`) — não é preciso inventar o
mecanismo de patch, pipeline de verificação, nem o desfazer: isso já está resolvido.

### `projetos.rs` — mecanismo relacionado, mas para outro problema
`core/src/projetos.rs` não participa da instalação de pacotes. Ele cuida de **projetos do
aluno** (pastas em `User Data/Projects/com.lveditor.draft/<nome>`, arquivos `draft_content.json`
e `draft_info.json`, constante `ARQUIVOS_PROJETO` em `core/src/projetos.rs:15`): detecta mídia que
o CapCut não acha mais e a relink com backup (`reparar()`, `core/src/projetos.rs:201-262`), usando
o mesmo padrão de "ler JSON como texto, trocar substring entre aspas, confirmar que ainda é JSON
válido, só então regravar com backup" (`core/src/projetos.rs:229-243`). Isso reforça que o padrão
de edição textual-mas-verificada de JSON do CapCut é uma técnica já validada em produção em dois
lugares independentes do código (`patch.rs` para pacotes, `projetos.rs` para projetos do aluno).

Também relevante: `referencias_externas()` (`core/src/projetos.rs:286-308`) já faz parsing via
regex de caminhos de arquivo citados dentro do JSON de um título, usado hoje em
`core/src/install.rs:486-494` só para avisar sobre mídia ausente — mostra que a equipe já audita o
conteúdo interno de `draft_content.json` de títulos reais sem precisar de um parser tipado
completo do formato do CapCut.

## 2. Onde cor e fonte provavelmente ficam guardadas (inferência, sem arquivo real)

Nenhum `draft_content.json` real foi encontrado no repositório (ver seção 4), então o que segue é
inferência a partir do que o código lê/escreve e do que é conhecimento público sobre o formato de
rascunho do CapCut (JSON com uma árvore `materials.texts[]`, onde cada texto tem um `content` que é
ele mesmo uma string JSON serializada, com `styles`/`text_params` carregando fonte, tamanho, cor
RGBA normalizada 0–1 por "run" de texto, mais `materials.texts[].font_path` ou referência de fonte
por nome de arquivo — é esse `font_path`/nome de arquivo de fonte que o `re_font` de
`core/src/patch.rs:25` já localiza e reescreve hoje). Evidências internas que sustentam isso:
- `core/src/install.rs:497`: o próprio código já sabe que `draft_content.json` fica em
  `<título>/preset_draft/draft_content.json` e que é esse arquivo que precisa continuar sendo JSON
  válido.
- `core/src/projetos.rs:106-126` (`caminhos_de_midia`): mostra que, na prática, o JSON do CapCut
  tem valores de caminho em chaves como `"path"`, `"file_Path"`, `"media_path"` em qualquer nível
  de aninhamento — ou seja, a árvore é irregular/aninhada, não um schema plano. Cor/fonte
  provavelmente seguem o mesmo padrão: chaves específicas (`"color"`, `"font_path"`, `"family"` ou
  similares) espalhadas dentro de objetos de texto, possivelmente aninhadas dentro de uma string
  JSON-dentro-de-JSON (`content`), o que é uma particularidade conhecida do formato do CapCut e que
  o código atual **não trata** — `patch.rs` e `projetos.rs` operam com regex sobre o texto bruto do
  arquivo exatamente porque o conteúdo útil nem sempre está em um nível de JSON navegável com
  `serde_json::Value` simples.
- `grep` em `core/src/` por `color|colour|font_path|text_color|rgb` não retornou nenhuma ocorrência:
  o código de produção hoje **nunca** olha para cor, e toca fonte apenas pelo nome do arquivo
  (ttf/otf/ttc), nunca pelo nome de família tipográfica dentro do JSON. Ou seja, "cor" é território
  totalmente não mapeado pelo código existente, e "fonte" só é mapeado no nível de arquivo físico,
  não no nível da struct de estilo de texto dentro do `draft_content.json`.

## 3. O que seria preciso construir

1. **Um arquivo real de título do CapCut para servir de referência** — hoje a equipe só tem os
   `.flpack` reais fora do git (`.gitignore` bloqueia `/packs` e `*.flpack`; não existem no
   checkout local). Sem abrir um `draft_content.json` real de um Título Dinâmico, não dá para saber
   com certeza o caminho exato das chaves de cor/fonte, só inferir.
2. **Um parser (ou conjunto de regras regex, no estilo do `Patcher` atual) que**:
   - localize cada "texto" dentro de `materials.texts[]`;
   - dentro do `content` de cada texto (provavelmente uma string JSON encapsulada, não um objeto
     direto — padrão conhecido do CapCut), decodifique o JSON interno, localize `styles`/`runs` com
     cor (RGBA) e `font_path`/família;
   - escreva de volta tanto a string JSON interna quanto o JSON externo, preservando tudo que não
     for cor/fonte;
   - trate também `materials.text_templates` / "combinações" (o formato "Combination" citado nos
     comentários de `core/src/pack.rs:7` e nos caminhos `Combination/Presets`), que pode ter uma
     estrutura de estilo diferente de um texto solto.
3. **Extensão do schema do `manifest.json`** (`core/src/pack.rs:29-65`) para o cliente poder
   declarar a paleta/fonte desejada (ex.: `client_theme: { colors: [...], font: "..." }`), e uma
   nova etapa de patch chamada a partir de `install()` (`core/src/install.rs:479-481`, mesmo ponto
   onde `patcher.patch_dir()` já roda hoje).
4. **Reaproveitar o pipeline de segurança já existente**: verificação de JSON válido por título
   (`core/src/install.rs:496-501`) e desfazer automático (`desfazer()`,
   `core/src/install.rs:131-155`) já cobrem o caso de o novo patch de cor corromper o arquivo — não
   é preciso recriar essa rede de segurança, só garantir que a nova etapa de recolorir rode
   **antes** dessa verificação, no mesmo bloco.
5. **Testes de regressão visual**: abrir o título recolorido no CapCut real (Windows e Mac, e
   idealmente em mais de uma versão do CapCut) para confirmar que o resultado visual é o esperado —
   isso não dá para automatizar só lendo o JSON, precisa de verificação manual/visual pelo menos na
   primeira versão.

## 4. Por que não fiz a POC pedida no passo 3

O passo 3 da tarefa pedia uma POC em `estilo/poc/` **condicionada a achar um exemplo real de
título do CapCut no repositório**. Busquei (fora de `node_modules` e `estilo/`):
- `find . -iname "draft_content.json"` → nenhum resultado.
- `find . -iname "draft_info.json"` → nenhum resultado.
- `find . -type d -iname "preset_draft"` → nenhum resultado.
- `find . -iname "manifest.json"` → nenhum resultado (os manifests reais só existem dentro de
  `.flpack`s, que são gerados/baixados, nunca commitados).
- `find . -iname "*.flpack"` → nenhum resultado (`.gitignore` tem `/packs` e `*.flpack`
  explicitamente).
- `titulos/index.html` (28 linhas) é confirmado como **apenas um link curto de redirecionamento**
  para `/conheca/legendas/?de=...` (rastreio de origem de venda), não contém nenhum dado de
  título/preset. Não existe `titulos.js` na raiz do repositório.
- `core/tests/assets_presets.rs:9` e `core/tests/projetos.rs:120` referenciam pacotes reais
  (`../mini.flpack`, `../packs/legendas.flpack`) só por caminho relativo fora do repositório — os
  testes que dependem deles são `#[ignore]`-like via `if !Path::new(pk).exists() { return; }` (no
  caso de `legendas.flpack`) ou dão panic se faltar (`mini.flpack`); nenhum dos dois arquivo existe
  neste checkout.

Ou seja, os únicos exemplos de `draft_content.json` no repositório são **sintéticos**, escritos à
mão dentro dos próprios testes Rust (`core/tests/projetos.rs:21`, `core/tests/assets_presets.rs`),
com conteúdo mínimo de exemplo (`{"materials":{"audios":[...],"texts":[{"content":"Oi"}]}}`) — sem
nenhum campo de cor ou de estilo de fonte, porque esses testes servem só para validar a lógica de
caminhos/mídia, não o conteúdo visual do título. Usar esse JSON sintético como base de uma POC de
"recolorir" inventaria uma estrutura de cor/fonte sem respaldo em um arquivo real, o que a tarefa
pediu explicitamente para não fazer. Por isso este documento de viabilidade substitui a POC.

## 5. Riscos concretos

- **Risco de quebrar o projeto do CapCut**: se o patch de cor for malformado (ex.: uma regex que
  casa no lugar errado, ou um encode incorreto da string JSON interna de `content`), o CapCut pode
  recusar o título ("predefinição inválida") ou, pior, abrir com um estado inconsistente. O
  pipeline atual já mitiga isso para patches de caminho (verificação de JSON + desfazer
  automático, `core/src/install.rs:496-511`), mas essa verificação só confirma que o JSON
  **externo** continua válido — não garante que o JSON **interno** (dentro da string `content`,
  se essa hipótese estiver certa) continue coerente, nem que o CapCut aceite os valores.
- **Risco de incompatibilidade entre versões do CapCut**: o formato de `draft_content.json` já
  mudou entre versões do CapCut no passado (é um app fechado, sem changelog de formato). Um parser
  calibrado numa versão pode silenciosamente deixar de encontrar os campos de cor numa versão mais
  nova, instalando um título com a cor errada sem erro nenhum — mais perigoso que travar, porque
  não é detectado pela verificação de "ainda é JSON válido".
- **Risco de o formato variar entre tipos de título**: o comentário de `core/src/pack.rs:7`
  distingue `Combination/Presets` de `Combination/Resources` (`.beat`), e há títulos com texto
  solto vs. "combinações" de texto+efeito+som. Cor e fonte podem estar em estruturas diferentes
  dependendo do tipo de título, exigindo mais de uma regra de patch e mais superfície de teste.
- **Risco de precisar re-testar a cada atualização do CapCut**: como a Base FL já não controla o
  formato (é engenharia reversa de um app de terceiros), qualquer atualização do CapCut que altere
  a estrutura interna de texto/estilo pode invalidar o patch de cor sem aviso — o mesmo risco que
  hoje já existe para as regras de caminho em `patch.rs`, mas um patch de conteúdo visual tem
  consequência mais visível e vergonhosa para o cliente final (cor errada em vídeo publicado) do
  que um caminho de mídia perdida.
- **Risco de licenciamento/suporte**: cada variação de "tema do cliente" multiplica a matriz de
  pacotes a gerar, testar e dar suporte (hoje é 1 pacote de título × N instalações; recolorir por
  cliente implicaria N pacotes × M clientes, ou geração sob demanda no momento da compra/instalação
  — o que é possível architecturalmente, já que `install_remote` em `app/src/main.rs:56-105` já
  baixa o pacote por link temporário por compra, mas aumenta a superfície de geração/cache/CDN).

## 6. Conclusão objetiva

**Viável com esforço médio** — não é inviável, mas também não é trivial/curto prazo.

Razão principal: o mecanismo de patch de conteúdo (ler JSON de um título, reescrever um valor,
verificar que continua válido, desfazer se não) **já existe e já roda em produção** em
`core/src/patch.rs` e tem um padrão irmão em `core/src/projetos.rs`. O que falta não é a
infraestrutura de patch — é o conhecimento do formato exato de cor/fonte dentro de um
`draft_content.json` real de um Título Dinâmico, que esta investigação não pôde obter porque
nenhum pacote real (`.flpack`) está no git (propositalmente, via `.gitignore`). O próximo passo
concreto, antes de qualquer código de recoloração, é abrir manualmente um `.flpack` real (os
`packs/*.flpack` existem fora do repositório, no computador de quem gera os pacotes) e inspecionar
um `draft_content.json` de um título real para confirmar a hipótese da seção 2 — a partir daí o
trabalho de estender `Patcher` (ou criar um módulo irmão chamado no mesmo ponto de
`core/src/install.rs:479-481`) é incremental sobre uma arquitetura que já sabe fazer exatamente
esse tipo de edição seguro.
