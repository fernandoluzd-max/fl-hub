/* ==========================================================================
   CONFIGURAÇÃO DA PÁGINA
   Mude aqui e a página inteira atualiza sozinha (todos os botões,
   preços e links). Não precisa procurar nada no resto do código.
   ========================================================================== */
window.PACK_CONFIG = {
  // Link do checkout. Enquanto for "#", os botões levam até a oferta na própria página.
  CHECKOUT_URL: "https://payfast.greenn.com.br/195639/offer/hb5yXQ?b_id_1=38puzs5&b_offer_1=ZxTsRT&b_id_2=qujz4kq&b_offer_2=4mBBtQ",

  // Preço (só o número, sem "R$")
  PRECO: "47",

  // Quantidade de estilos do pack.
  // Enquanto QUANTIDADE_EXATA for false, a página escreve "+70".
  // Quando você confirmar o número exato, troque o número e mude para true: a página passa a escrever só o número.
  QUANTIDADE_DE_PRESETS: "70",
  QUANTIDADE_EXATA: false,

  // Links do rodapé
  LINK_SUPORTE: "https://wa.me/5548999642195?text=Oi!%20Preciso%20de%20ajuda%20com%20o%20Base%20FL.",
  LINK_INSTAGRAM: "https://www.instagram.com/fernandoluz.d/",

  // Garantia, em dias. Deixe "" para não mostrar o bloco de garantia na oferta.
  // Só preencha com o prazo que está configurado no produto, na Greenn.
  GARANTIA_DIAS: "7",

  // SEM x COM OS TÍTULOS (o comparador de arrastar, no topo da página).
  // Os dois arquivos ficam em assets/videos/ com estes nomes. Para trocar, substitua os arquivos (mesma duração nos dois).
  VIDEO_SEM_PACK: "assets/videos/sem-pack.mp4",
  VIDEO_COM_PACK: "assets/videos/com-pack.mp4",
  // Capas (a imagem parada que aparece antes do vídeo carregar). Opcional: sem o arquivo, fica um fundo escuro.
  CAPA_SEM_PACK: "assets/images/posters/sem-pack.jpg",
  CAPA_COM_PACK: "assets/images/posters/com-pack.jpg",
  LEGENDA_COMPARADOR: "",   // opcional: uma linha embaixo do comparador

  // TRECHO DA AULA (bloco "Vem com aula", logo abaixo do topo).
  // É um trecho real de uma das aulas. Para trocar, mude o endereço. Vazio, a página mostra o quadro "em breve".
  // Ex.: "https://aulas.basefl.com/trecho-aula.mp4"
  VIDEO_TRECHO_AULA: "https://aulas.basefl.com/trecho%20da%20aula.mp4",
  CAPA_TRECHO_AULA: "assets/images/posters/trecho-aula.jpg",     // opcional: imagem parada que aparece antes do play

  // QUEM FEZ: uma linha a mais sobre o Fernando (só fatos). Vazia, não aparece.
  // Ex.: "Mais de X alunos no curso." ou "Edita para clientes desde 20XX."
  CREDENCIAL_FERNANDO: "",

  // PERGUNTAS EXTRAS DO FAQ: escreva a resposta entre as aspas de "r". Pergunta com resposta vazia não aparece.
  FAQ_EXTRA: [
    { p: "Funciona no CapCut gratuito?", r: "", segunda: true },     // esta entra como 2ª pergunta do FAQ
    { p: "As fontes têm acento?", r: "" },
    { p: "Funciona em vídeo horizontal?", r: "" },
    { p: "O app Base FL é seguro?", r: "" },
    { p: "E se o CapCut atualizar?", r: "" }
  ],
  // Repassar UTMs/parâmetros da URL para o checkout (útil para Utmify / rastreio)
  REPASSAR_PARAMETROS: true
};
