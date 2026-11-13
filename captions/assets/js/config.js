/* ==========================================================================
   CONFIGURAÇÃO DA PÁGINA DO BASE CAPTIONS
   Mude aqui e a página inteira atualiza sozinha (botões, preço, links, vídeos).
   ========================================================================== */
window.PACK_CONFIG = {
  // Link do checkout (Greenn). Os botões de compra passam antes pelo aviso "só computador".
  CHECKOUT_URL: "https://payfast.greenn.com.br/203539?ch_id=145200&b_id_1=195814&b_offer_1=ZxTsRT&b_id_2=195812&b_offer_2=4mBBtQ&b_id_3=198176&b_offer_3=LSLxch",

  // Preço (só o número, sem "R$")
  PRECO: "67",

  // FAIXA DE LANÇAMENTO, fixa no topo (passa devagar, sem parar). Deixe FAIXA_ATIVA: false para tirar.
  // FAIXA_PARCELAS: condição real do checkout da Greenn (conferida em 13/11: 12x de R$ 6,89, com tarifa da Greenn).
  //   Se a Greenn mudar a tarifa, atualize aqui. Vazio, a parcela não aparece.
  // FAIXA_TEMPO_LIMITADO: deixe true só enquanto a condição de lançamento estiver valendo.
  FAIXA_ATIVA: true,
  FAIXA_PARCELAS: "ou 12x de R$ 6,89 no cartão",
  FAIXA_TEMPO_LIMITADO: true,

  // Quantidade de títulos do pack. Enquanto QUANTIDADE_EXATA for false, a página escreve "+70".
  QUANTIDADE_DE_PRESETS: "70",
  QUANTIDADE_EXATA: false,

  // Links do rodapé
  LINK_SUPORTE: "https://wa.me/5547996974735?text=Oi!%20Preciso%20de%20ajuda%20com%20o%20Base%20FL.",
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

  // OS 8 ESTILOS. img: um pedaço real da legenda ("como você desejar."), recortado do vídeo do estilo.
  // video: o mesmo trecho legendado pelo Base Captions em cada estilo. Só carrega quando a pessoa toca no estilo.
  ESTILOS: [
    { nome: "Contraponto",  img: "assets/img/estilos/amostra-1.webp", video: "https://aulas.basefl.com/1.mp4", previa: "assets/img/previas/estilo-1.webp" },
    { nome: "Dynamic Bold", img: "assets/img/estilos/amostra-2.webp", video: "https://aulas.basefl.com/2.mp4", previa: "assets/img/previas/estilo-2.webp" },
    { nome: "Minimal Bold", img: "assets/img/estilos/amostra-3.webp", video: "https://aulas.basefl.com/3.mp4", previa: "assets/img/previas/estilo-3.webp" },
    { nome: "Serif Bold",   img: "assets/img/estilos/amostra-4.webp", video: "https://aulas.basefl.com/4.mp4", previa: "assets/img/previas/estilo-4.webp" },
    { nome: "Estilo 5",     img: "assets/img/estilos/amostra-5.webp", video: "https://aulas.basefl.com/5.mp4", previa: "assets/img/previas/estilo-5.webp" },
    { nome: "Estilo 6",     img: "assets/img/estilos/amostra-6.webp", video: "https://aulas.basefl.com/6.mp4", previa: "assets/img/previas/estilo-6.webp" },
    { nome: "Estilo 7",     img: "assets/img/estilos/amostra-7.webp", video: "https://aulas.basefl.com/7.mp4", previa: "assets/img/previas/estilo-7.webp" },
    { nome: "Estilo 8",     img: "assets/img/estilos/amostra-8.webp", video: "https://aulas.basefl.com/8.mp4", previa: "assets/img/previas/estilo-8.webp" }
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
    { p: "Funciona no CapCut gratuito?", r: "Funciona. O Base Captions e os Títulos Dinâmicos funcionam no CapCut gratuito do computador. Você não precisa assinar o CapCut Pro.", segunda: true, gratuito: true },
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
