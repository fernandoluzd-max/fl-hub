/* ==========================================================================
   CONFIGURAÇÃO DA PÁGINA
   Mude aqui e a página inteira atualiza sozinha (todos os botões,
   preços e links). Não precisa procurar nada no resto do código.
   ========================================================================== */
window.PACK_CONFIG = {
  // Link do checkout. Enquanto for "#", os botões levam até a oferta na própria página.
  CHECKOUT_URL: "https://payfast.greenn.com.br/kpw6g37?b_id_1=38puzs5&b_offer_1=ZxTsRT&b_id_2=qujz4kq&b_offer_2=DsUFBA",

  // Preço (só o número, sem "R$")
  PRECO: "47",

  // Quantidade de estilos do pack.
  // Enquanto QUANTIDADE_EXATA for false, a página escreve "Mais de 70" / "+70".
  // Quando você confirmar o número exato, troque o número e mude para true: a página passa a escrever só o número.
  QUANTIDADE_DE_PRESETS: "70",
  QUANTIDADE_EXATA: false,

  // Links do rodapé
  LINK_SUPORTE: "https://wa.me/5548999642195?text=Oi!%20Preciso%20de%20ajuda%20com%20o%20Base%20FL.",
  LINK_INSTAGRAM: "https://www.instagram.com/fernandoluz.d/",

  // Garantia, em dias. Deixe "" para não mostrar o bloco de garantia na oferta.
  // Só preencha com o prazo que está configurado no produto, na Greenn.
  GARANTIA_DIAS: "7",

  // SEM O PACK x COM O PACK (o comparador de arrastar, logo abaixo do topo).
  // Coloque os dois arquivos em assets/videos/ com estes nomes. A página confere se eles existem:
  // enquanto faltar algum, a seção não aparece. Para ver o espaço marcado antes disso: ?previa=1
  VIDEO_SEM_PACK: "assets/videos/sem-pack.mp4",
  VIDEO_COM_PACK: "assets/videos/com-pack.mp4",
  // Capas (a imagem parada que aparece antes do vídeo carregar). Opcional: sem o arquivo, fica um fundo escuro.
  CAPA_SEM_PACK: "assets/images/posters/sem-pack.jpg",
  CAPA_COM_PACK: "assets/images/posters/com-pack.jpg",
  LEGENDA_COMPARADOR: "",   // opcional: uma linha embaixo do comparador

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
