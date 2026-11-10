/* ==========================================================================
   CONFIGURAÇÃO DA PÁGINA
   Mude aqui e a página inteira atualiza sozinha (todos os botões,
   preços e links). Não precisa procurar nada no resto do código.
   ========================================================================== */
window.PACK_CONFIG = {
  // Link do checkout. Enquanto for "#", os botões levam até a oferta na própria página.
  CHECKOUT_URL: "https://payfast.greenn.com.br/203539?ch_id=145200",

  // Preço (só o número, sem "R$")
  PRECO: "67",

  // Quantidade de estilos do pack.
  // Enquanto QUANTIDADE_EXATA for false, a página escreve "+70".
  // Quando você confirmar o número exato, troque o número e mude para true: a página passa a escrever só o número.
  QUANTIDADE_DE_PRESETS: "70",
  QUANTIDADE_EXATA: false,

  // Links do rodapé
  LINK_SUPORTE: "https://wa.me/5547996974735?text=Oi!%20Preciso%20de%20ajuda%20com%20o%20Base%20FL.",
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

  // Rótulos do comparador do topo. Os vídeos (VIDEO_SEM_PACK e VIDEO_COM_PACK) são os mesmos do antes/depois do Base Captions,
  // em 720p (2 MB). Os arquivos lp-*.mp4 do aulas.basefl.com são os mesmos vídeos em 1080p (30 MB cada): pesados demais para a página.
  ROTULO_ANTES: "Antes",
  ROTULO_DEPOIS: "Depois de 1 clique",

  // COMPARATIVO DE TEMPO (seção "Você sabe fazer legendas..."): estimativas para um vídeo de ~1 minuto, em minutos.
  MINUTOS_MANUAL: 90,            // legendas e títulos feitos à mão
  MINUTOS_BASE_CAPTIONS: 2,      // só a geração das legendas no Base Captions

  // TRECHO DA AULA (bloco "Vem com aula", logo abaixo do topo).
  // É um trecho real de uma das aulas. Para trocar, mude o endereço. Vazio, a página mostra o quadro "em breve".
  // Ex.: "https://aulas.basefl.com/trecho-aula.mp4"
  VIDEO_TRECHO_AULA: "https://aulas.basefl.com/parte-05.mp4",      // trecho da aula enviado em 09/11 (toca sem som)
  CAPA_TRECHO_AULA: "assets/images/posters/aula-parte-05.jpg",     // opcional: imagem parada que aparece antes do play

  // QUEM FEZ: uma linha a mais sobre o Fernando (só fatos). Vazia, não aparece.
  // Ex.: "Mais de X alunos no curso." ou "Edita para clientes desde 20XX."
  CREDENCIAL_FERNANDO: "",

  // PERGUNTAS EXTRAS DO FAQ: escreva a resposta entre as aspas de "r". Pergunta com resposta vazia não aparece.
  FAQ_EXTRA: [
    { p: "Funciona no CapCut gratuito?", r: "Funciona. As legendas entram como texto normal do CapCut e os títulos não usam recurso pago. Não precisa do CapCut Pro.", segunda: true },     // esta entra como 2ª pergunta do FAQ
    { p: "As fontes têm acento?", r: "Têm. As legendas são geradas em português, com acentos e ç, e as fontes dos estilos mostram tudo certinho." },
    { p: "Funciona em vídeo horizontal?", r: "Funciona. O Base Captions foi testado em vídeos verticais (9:16), horizontais (16:9) e 3:4, e posiciona a legenda conforme o formato." },
    { p: "O app Base FL é seguro?", r: "É. Você entra com o e-mail da compra e um código, sem senha. O app só mexe nas pastas do CapCut para instalar, e a transcrição é feita no seu próprio computador: o seu vídeo não é enviado para lugar nenhum." },
    { p: "E se o CapCut atualizar?", r: "O app confere a versão do seu CapCut antes de gerar as legendas. Quando o CapCut muda alguma coisa, a correção chega como atualização pelo app Base FL, sem custo." }
  ],
  // Repassar UTMs/parâmetros da URL para o checkout (útil para Utmify / rastreio)
  REPASSAR_PARAMETROS: true
};
