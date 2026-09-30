// Pluga & Edita — recebe os avisos da Greenn (venda paga, reembolso, chargeback, assinatura)
// e libera ou bloqueia os packs do comprador.
//
// Endereço para cadastrar na Greenn:
//   https://<PROJETO>.supabase.co/functions/v1/greenn-webhook?token=<GREENN_TOKEN>
// O GREENN_TOKEN é uma senha que você inventa e guarda em Edge Functions > Secrets.
// (A Greenn não assina os avisos; sem o token certo, o aviso é ignorado.)

import { createClient } from "jsr:@supabase/supabase-js@2";

const LIBERA = new Set(["paid", "trialing"]);
const BLOQUEIA = new Set(["refunded", "chargedback", "canceled", "unpaid"]);

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

function iguais(a: string, b: string) {
  // comparação em tempo constante
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function lerCorpo(req: Request): Promise<any> {
  const tipo = req.headers.get("content-type") ?? "";
  const texto = await req.text();
  if (tipo.includes("application/x-www-form-urlencoded")) {
    const f = new URLSearchParams(texto);
    const d = f.get("data") ?? f.get("payload");
    if (d) return JSON.parse(d);
    return Object.fromEntries(f);
  }
  return JSON.parse(texto);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");

  const esperado = Deno.env.get("GREENN_TOKEN") ?? "";
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!esperado || !iguais(token, esperado)) {
    return new Response("token inválido", { status: 401 });
  }

  let p: any;
  try {
    p = await lerCorpo(req);
  } catch {
    return new Response("corpo inválido", { status: 400 });
  }

  const type = String(p?.type ?? "");
  const event = String(p?.event ?? "");
  const status = String(p?.currentStatus ?? p?.sale?.status ?? p?.contract?.status ?? "");
  const productId = String(p?.product?.id ?? p?.sale?.product_id ?? p?.contract?.product_id ?? "");
  const productName = String(p?.product?.name ?? "");
  const email = String(p?.client?.email ?? p?.sale?.client?.email ?? "").trim().toLowerCase();
  const saleId = String(p?.sale?.id ?? p?.contract?.id ?? "");

  let result = "ignorado";
  try {
    if (type === "lead" || !email || !productId) {
      result = "ignorado (sem e-mail/produto ou lead)";
    } else {
      const { data: prod } = await db
        .from("products").select("pack_ids").eq("greenn_product_id", productId).maybeSingle();
      const packs: string[] = prod?.pack_ids ?? [];
      if (!packs.length) {
        result = "produto não cadastrado na tabela products";
      } else if (LIBERA.has(status)) {
        const { error } = await db.from("licenses").upsert(
          packs.map((pack_id) => ({ email, pack_id, status: "active", source: "greenn", sale_id: saleId })),
        );
        result = error ? "erro: " + error.message : "liberado: " + packs.join(", ");
      } else if (BLOQUEIA.has(status)) {
        const { error } = await db.from("licenses")
          .update({ status: "revoked", sale_id: saleId })
          .eq("email", email).in("pack_id", packs);
        result = error ? "erro: " + error.message : "bloqueado: " + packs.join(", ");
      } else {
        result = "status sem ação: " + status;
      }
    }
  } catch (e) {
    result = "erro: " + (e as Error).message;
  }

  await db.from("webhook_events").insert({
    type, event, status, product_id: productId, product_name: productName, email, sale_id: saleId, result,
  });

  // Sempre 200 para a Greenn não ficar reenviando; o resultado fica em webhook_events.
  return new Response(JSON.stringify({ ok: true, result }), {
    headers: { "content-type": "application/json" },
  });
});
