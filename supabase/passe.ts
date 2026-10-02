// Base FL — "passe": o app pede um bilhete de uso único para abrir a ferramenta no navegador já logada,
// sem pedir outro código por e-mail.
// Endereço: https://<PROJETO>.supabase.co/functions/v1/passe   (Verify JWT desligado: a conferência é feita aqui dentro)
//
// Segurança:
//  • só responde a quem já está logado (confere o acesso enviado pelo app);
//  • o bilhete é da MESMA conta que pediu, vale uma vez só e vence sozinho;
//  • o navegador ganha uma sessão própria (não divide a chave do app).
import { createClient } from "jsr:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, apikey, content-type", "access-control-allow-methods": "POST, OPTIONS" };
const resp = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return resp(405, { erro: "use POST" });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return resp(401, { erro: "sem login" });
  const { data, error } = await admin.auth.getUser(token);
  const email = data?.user?.email;
  if (error || !email) return resp(401, { erro: "sessão inválida" });
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const hash = link.data?.properties?.hashed_token;
  if (link.error || !hash) return resp(500, { erro: "não foi possível gerar o passe" });
  return resp(200, { token_hash: hash });
});
