/* ==========================================================================
   CONFIGURAÇÃO DA PÁGINA DO BASE CAPTIONS
   Mude aqui e a página inteira atualiza sozinha (botões, preço, links, vídeos).
   ========================================================================== */
window.PACK_CONFIG = {
  // Link do checkout (Greenn). Os botões de compra passam antes pelo aviso "só computador".
  CHECKOUT_URL: "https://payfast.greenn.com.br/203539/offer/2Ibej2?ch_id=145200&b_id_1=195639&b_offer_1=NZxF1I&b_id_2=198176&b_offer_2=LSLxch&b_id_3=195814&b_offer_3=ZxTsRT&b_id_4=195812&b_offer_4=4mBBtQ",

  // Preço (só o número, sem "R$")
  PRECO: "47",

  // FAIXA DE LANÇAMENTO, fixa no topo (passa devagar, sem parar). Deixe FAIXA_ATIVA: false para tirar.
  // FAIXA_PARCELAS: condição real do checkout da Greenn (conferida em 15/11: 12x de R$ 4,83, com tarifa da Greenn).
  //   Se a Greenn mudar a tarifa, atualize aqui. Vazio, a parcela não aparece.
  // FAIXA_TEMPO_LIMITADO: deixe true só enquanto a condição de lançamento estiver valendo.
  FAIXA_ATIVA: true,
  FAIXA_PARCELAS: "ou 12x de R$ 4,83 no cartão",
  FAIXA_TEMPO_LIMITADO: true,

  // Quantidade de títulos do pack. Enquanto QUANTIDADE_EXATA for false, a página escreve "+70".
  QUANTIDADE_DE_PRESETS: "70",
  QUANTIDADE_EXATA: false,

  // Links do rodapé
  LINK_SUPORTE: "https://wa.me/5547996974735?text=Oi!%20Preciso%20de%20ajuda%20com%20o%20Base%20Captions.",
  LINK_INSTAGRAM: "https://www.instagram.com/fernandoluz.d/",

  // Garantia, em dias. Deixe "" para não mostrar o bloco de garantia na oferta.
  GARANTIA_DIAS: "7",

  // Selo "Funciona no CapCut gratuito. Não precisa assinar o CapCut Pro." (topo, onde funciona e oferta).
  // Coloque false para tirar o selo da página inteira (a pergunta do FAQ sai junto).
  CAPCUT_GRATUITO: true,

  // VÍDEO PRINCIPAL (player de VSL logo abaixo do título)
  // Prévia: alguns segundos da versão leve, sem som, em loop (PREVIA_INICIO a PREVIA_FIM, em segundos).
  // Começa sozinha assim que o player aparece (celular e computador). Se o navegador bloquear
  // (iPhone em modo de economia de energia, por exemplo), a capa fica em movimento lento e a prévia começa no primeiro toque.
  // No clique: o vídeo do início, com som. 4K no computador; no celular ou em rede lenta, a versão leve (1080p),
  // que é o mesmo arquivo da prévia: no celular o som entra sem recarregar o vídeo.
  VIDEO_PRINCIPAL: "https://aulas.basefl.com/4k.mp4",
  VIDEO_PRINCIPAL_LEVE: "https://aulas.basefl.com/pagina%20de%20venda.mp4",
  PREVIA_INICIO: 0,
  PREVIA_FIM: 6,
  // O arquivo 4K tem uma borda preta fina (cerca de 0,7%) nos primeiros 6 segundos. Até esse ponto, o player amplia
  // o vídeo 2,2% para escondê-la, sem cortar rosto nem legenda. Se subir um 4K sem a borda, coloque 0.
  VIDEO_PRINCIPAL_BORDA_ATE: 6.17,
  CAPA_VIDEO_PRINCIPAL: "assets/img/posters/video-principal.jpg",

  // PRÉVIAS ANIMADAS: imagens leves que se mexem sozinhas. Só carregam quando o celular bloqueia vídeo automático
  // (iPhone em modo de economia de energia). Assim nunca fica uma capa parada: a pessoa vê o vídeo "rodando" até tocar.
  PREVIA_ANIMADA: "assets/img/previas/vsl.webp",        // vídeo principal
  PREVIA_CORTES: "assets/img/previas/cortes.webp",      // legendas, cortes e zoom
  PREVIA_APP: "assets/img/previas/app.webp",            // o app no bloco das aulas

  // Vídeo gerado pelo Base Captions (estilo Contraponto): usado na demonstração e nas três funções.
  VIDEO_COM_PACK: "assets/video/com-pack.mp4",

  // OS 8 ESTILOS ATUAIS do app (21/11/2026). img/video = amostra em português; imgEn/videoEn = a mesma amostra em inglês (o app troca ao clicar em EN).
  // As amostras são geradas pelo próprio motor do Base Captions sobre um fundo neutro (sem pessoa). Só carrega o vídeo quando a pessoa toca no estilo.
  ESTILOS: [
    { nome: "Fernando Luz Style", img: "assets/img/estilos-novos/fernando-luz-style.jpg", imgEn: "assets/img/estilos-novos/fernando-luz-style-en.jpg", video: "assets/video/estilos/fernando-luz-style.mp4", videoEn: "assets/video/estilos/fernando-luz-style-en.mp4" },
    { nome: "Dynamic Bold",       img: "assets/img/estilos-novos/dynamic-bold.jpg",       imgEn: "assets/img/estilos-novos/dynamic-bold-en.jpg",       video: "assets/video/estilos/dynamic-bold.mp4",       videoEn: "assets/video/estilos/dynamic-bold-en.mp4" },
    { nome: "Minimal Bold",       img: "assets/img/estilos-novos/minimal-bold.jpg",       imgEn: "assets/img/estilos-novos/minimal-bold-en.jpg",       video: "assets/video/estilos/minimal-bold.mp4",       videoEn: "assets/video/estilos/minimal-bold-en.mp4" },
    { nome: "Serif Bold",         img: "assets/img/estilos-novos/serif-bold.jpg",         imgEn: "assets/img/estilos-novos/serif-bold-en.jpg",         video: "assets/video/estilos/serif-bold.mp4",         videoEn: "assets/video/estilos/serif-bold-en.mp4" },
    { nome: "Smart Type",         img: "assets/img/estilos-novos/smart-type.jpg",         imgEn: "assets/img/estilos-novos/smart-type-en.jpg",         video: "assets/video/estilos/smart-type.mp4",         videoEn: "assets/video/estilos/smart-type-en.mp4" },
    { nome: "Editorial Amarelo",  img: "assets/img/estilos-novos/editorial-amarelo.jpg",  imgEn: "assets/img/estilos-novos/editorial-amarelo-en.jpg",  video: "assets/video/estilos/editorial-amarelo.mp4",  videoEn: "assets/video/estilos/editorial-amarelo-en.mp4" },
    { nome: "Mint Pop",           img: "assets/img/estilos-novos/mint-pop.jpg",           imgEn: "assets/img/estilos-novos/mint-pop-en.jpg",           video: "assets/video/estilos/mint-pop.mp4",           videoEn: "assets/video/estilos/mint-pop-en.mp4" },
    { nome: "Coolvetica Yellow Glow", img: "assets/img/estilos-novos/coolvetica.jpg",     imgEn: "assets/img/estilos-novos/coolvetica-en.jpg",         video: "assets/video/estilos/coolvetica.mp4",         videoEn: "assets/video/estilos/coolvetica-en.mp4" }
  ],


  // TÍTULOS DINÂMICOS em movimento (gravados direto do CapCut). Arquivos pequenos: tocam sozinhos.
  TITULOS: [
    { nome: "Bold Template",     tipo: "Bold Template",         video: "assets/video/titulo-bold-template.mp4", capa: "assets/img/posters/titulo-bold-template.jpg", previa: "assets/img/previas/titulo-bold-template.webp" },
    { nome: "Clássico Fernando", tipo: "Clássicos do Fernando", video: "assets/video/titulo-classico.mp4",      capa: "assets/img/posters/titulo-classico.jpg", previa: "assets/img/previas/titulo-classico.webp" },
    { nome: "Duas Linhas",       tipo: "Divertidos",            video: "assets/video/legenda-duas-linhas.mp4",  capa: "assets/img/posters/legenda-duas-linhas.jpg", previa: "assets/img/previas/legenda-duas-linhas.webp" },
    { nome: "Nome em Destaque",  tipo: "Bold Template",         video: "assets/video/titulo-nome-vermelho.mp4", capa: "assets/img/posters/titulo-nome-vermelho.jpg", previa: "assets/img/previas/titulo-nome-vermelho.webp" }
  ],

  // COMPARATIVO DE TEMPO: estimativas para um vídeo de ~1 minuto, em minutos.
  MINUTOS_MANUAL: 90,            // legendas e títulos feitos à mão
  MINUTOS_BASE_CAPTIONS: 2,      // só a geração das legendas no Base Captions

  // VÍDEO DO APP no bloco "Eu te mostro como instalar e como usar": ilustração, sempre sem som, em loop,
  // sem controles. Toca só enquanto está na tela. Vazio, o quadro some.
  VIDEO_TRECHO_AULA: "https://aulas.basefl.com/trecho%20base%20cap.mp4",
  CAPA_TRECHO_AULA: "assets/img/posters/trecho-app.webp",

  // QUEM FEZ: uma linha a mais sobre o Fernando (só fatos). Vazia, não aparece.
  CREDENCIAL_FERNANDO: "",

  // PERGUNTAS EXTRAS DO FAQ: escreva a resposta entre as aspas de "r". Pergunta com resposta vazia não aparece.
  FAQ_EXTRA: [
    { p: "Funciona no CapCut gratuito?", r: "Funciona. O Base Captions funciona no CapCut gratuito do computador. Você não precisa assinar o CapCut Pro.", segunda: true, gratuito: true },
    { p: "As fontes têm acento?", r: "" },
    { p: "Funciona em vídeo horizontal?", r: "" },
    { p: "O app Base FL é seguro?", r: "" },
    { p: "E se o CapCut atualizar?", r: "" }
  ],

  // VÍDEOS OTIMIZADOS: depois de rodar o otimizar-videos.sh e subir a pasta "web" para aulas.basefl.com/web/,
  // troque para true. A página passa a usar as versões leves (8 estilos, vídeo do app) e as que abrem mais rápido.
  // Os arquivos originais continuam onde estão.
  VIDEOS_OTIMIZADOS: false,

  // Repassar UTMs/parâmetros da URL para o checkout (Utmify / rastreio)
  REPASSAR_PARAMETROS: true
};
