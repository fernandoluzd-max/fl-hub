/* ==========================================================================
   BLACK FRIDAY BASE FL 2026 · EDIÇÃO EXCLUSIVA PARA ALUNOS
   CONFIGURAÇÃO DA CAMPANHA. Tudo que é data, link, preço, catálogo e estilo fica aqui.
   Mude aqui e a página inteira se ajusta. Não precisa mexer no resto do código.
   ========================================================================== */
window.BF = {

  // ---------------------------------------------------------------- CALENDÁRIO
  // Horário de Brasília (-03:00). O Brasil não tem horário de verão desde 2019.
  // A página usa a hora do servidor (cabeçalho "Date" da própria página) e só cai no relógio do aparelho se não conseguir.
  ABERTURA:     "2026-11-19T20:00:00-03:00",   // revelação da oferta e abertura das vendas (quinta, 20h)
  ENCERRAMENTO: "2026-11-30T23:59:59-03:00",   // encerramento definitivo (segunda, Cyber Monday, 23h59)

  // ---------------------------------------------------------------- GRUPO DO WHATSAPP
  // A entrada no grupo continua liberada depois da revelação. Fechar a entrada é uma decisão separada:
  // só mude para false se a entrada no grupo for realmente fechada.
  GRUPO_ABERTO: true,

  // ---------------------------------------------------------------- OFERTA
  // Preço, checkout e produtos NÃO ficam aqui (este arquivo é o mesmo nas duas páginas e já está no ar antes do dia 19).
  // Eles ficam em assets/oferta/: produtos.js (os dois públicos), alunos.js (alunos) e geral.js (público geral).
  // Essa pasta só sobe no dia 19/11 às 20h. A página de alunos nunca carrega o geral.js, e a pública nunca carrega o alunos.js.
  PRECO: "",
  PRECO_AUTORIZADO: false,

  // ---------------------------------------------------------------- PRODUTO
  NOME_APP: "Base Captions",
  VIDEO_COM_PACK: "/completa/bf-alunos/assets/video/com-pack.mp4",   // vídeo gerado pelo app, estilo Contraponto (usado na demonstração)
  FOTO_HERO: "",                // foto real do Fernando para o topo (PNG sem fundo). Vazia = composição só com o Base Captions.

  // ---------------------------------------------------------------- OS 8 ESTILOS (reais, da tela "Legenda" do app)
  // img: amostra real da legenda (o trecho "como você desejar." recortado do vídeo do estilo, fundo transparente). video: o mesmo trecho legendado pelo Base Captions em cada estilo (9:16, mudo, ~3,6 MB).
  // Os vídeos só carregam quando a pessoa toca num estilo. Hospedados em aulas.basefl.com.
  ESTILOS: [
    { nome: "Contraponto",  img: "/completa/bf-alunos/assets/img/estilos/amostra-1.webp", video: "https://aulas.basefl.com/1.mp4" },
    { nome: "Dynamic Bold", img: "/completa/bf-alunos/assets/img/estilos/amostra-2.webp", video: "https://aulas.basefl.com/2.mp4" },
    { nome: "Minimal Bold", img: "/completa/bf-alunos/assets/img/estilos/amostra-3.webp", video: "https://aulas.basefl.com/3.mp4" },
    { nome: "Serif Bold",   img: "/completa/bf-alunos/assets/img/estilos/amostra-4.webp", video: "https://aulas.basefl.com/4.mp4" },
    { nome: "Estilo 5",     img: "/completa/bf-alunos/assets/img/estilos/amostra-5.webp", video: "https://aulas.basefl.com/5.mp4" },
    { nome: "Estilo 6",     img: "/completa/bf-alunos/assets/img/estilos/amostra-6.webp", video: "https://aulas.basefl.com/6.mp4" },
    { nome: "Estilo 7",     img: "/completa/bf-alunos/assets/img/estilos/amostra-7.webp", video: "https://aulas.basefl.com/7.mp4" },
    { nome: "Estilo 8",     img: "/completa/bf-alunos/assets/img/estilos/amostra-8.webp", video: "https://aulas.basefl.com/8.mp4" }
  ],

  // ---------------------------------------------------------------- O RESTO DA OFERTA
  // Fica em segredo até a revelação no grupo, dia 19. Nenhum nome, quantidade, imagem ou preço dos outros itens
  // está nesta página nem nos arquivos dela: as peças "censuradas" são mosaicos sem nome (/completa/bf-alunos/assets/img/oculto/).

  // ---------------------------------------------------------------- RODAPÉ
  LINK_SUPORTE: "https://wa.me/5547996974735?text=Oi!%20Tenho%20uma%20d%C3%BAvida%20sobre%20a%20Black%20Friday%20Base%20FL.",

  // ---------------------------------------------------------------- CONDIÇÃO DO ALUNO (28/11)
  // Mesma API das páginas "Complete sua Base FL": a conta vem do link pessoal (?t=) e o preço/checkout do servidor.
  API: {
    ELEGIBILIDADE: "https://otlaexuqyavpzxwzcsfo.supabase.co/functions/v1/completa-api/elegibilidade",
    CHECKOUT:      "https://otlaexuqyavpzxwzcsfo.supabase.co/functions/v1/completa-api/checkout",
    EVENTO:        "https://otlaexuqyavpzxwzcsfo.supabase.co/functions/v1/completa-api/evento"
  },

  // ---------------------------------------------------------------- PRÉVIA
  // true só para aprovação: aceita ?estado=pre|aberta|encerrada e ?agora=2026-11-19T19:59:50-03:00 na URL
  // e mostra as anotações internas "A confirmar". Na versão publicada: false.
  PREVIA: false
};
