/* ==========================================================================
   COMPLETE SUA BASE FL · configuração das 8 páginas
   Um arquivo só para as 8. Preço e checkout NÃO ficam aqui: vêm do servidor.
   ========================================================================== */
window.COMPLETA_CONFIG = {
  // "previa": aluno simulado, checkout simulado, painel de revisão e pendências visíveis.
  // "producao": dados reais do servidor. Quem troca é o montar.py --producao (não edite à mão).
  MODO: "producao",

  // Servidor da Base FL: Edge Function completa-api (docs/campanhas/completa/completa-api.ts), que usa a MESMA regra do app. Não publicada.
  ELEGIBILIDADE_URL: "https://otlaexuqyavpzxwzcsfo.supabase.co/functions/v1/completa-api/elegibilidade",   // POST {token, pagina} -> condição desta conta
  CHECKOUT_URL: "https://otlaexuqyavpzxwzcsfo.supabase.co/functions/v1/completa-api/checkout",             // POST {token, pagina, oferta_id, origem} -> {checkout_url}
  EVENTO_URL: "https://otlaexuqyavpzxwzcsfo.supabase.co/functions/v1/completa-api/evento",                 // POST (sendBeacon) dos eventos. Vazio: não envia.

  // Só aceita levar o aluno para estes endereços de checkout (proteção contra redirecionamento indevido).
  CHECKOUT_HOSTS: ["payfast.greenn.com.br", "greenn.com.br"],

  // Repassa utm_* e src/sck da URL da página para o checkout (Utmify / relatórios da Greenn).
  REPASSAR_PARAMETROS: true,

  // Tempo máximo esperando o servidor antes de mostrar a mensagem de erro, em milissegundos.
  TEMPO_LIMITE_MS: 8000
};
