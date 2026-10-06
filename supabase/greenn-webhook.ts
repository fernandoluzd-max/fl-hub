// Base FL — recebe os avisos da Greenn e libera/bloqueia os packs.
// Endereço: https://<PROJETO>.supabase.co/functions/v1/greenn-webhook?token=<GREENN_TOKEN>  (Verify JWT desligado)
import { createClient } from "jsr:@supabase/supabase-js@2";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const LIBERA = ["paid", "trialing"];
const BLOQUEIA = ["refunded", "chargedback", "canceled", "unpaid"];
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const certo = Deno.env.get("GREENN_TOKEN") ?? "";
  if (!certo || token !== certo) return new Response("token inválido", { status: 401 });
  let p: any;
  try {
    const t = await req.text();
    const f = new URLSearchParams(t);
    p = (req.headers.get("content-type") ?? "").includes("form") ? JSON.parse(f.get("data") ?? f.get("payload") ?? "{}") : JSON.parse(t);
  } catch { return new Response("corpo inválido", { status: 400 }); }
  const type = String(p?.type ?? ""), event = String(p?.event ?? "");
  const status = String(p?.currentStatus ?? p?.sale?.status ?? p?.contract?.status ?? "");
  const product_id = String(p?.product?.id ?? p?.sale?.product_id ?? p?.contract?.product_id ?? "");
  const product_name = String(p?.product?.name ?? "");
  const email = String(p?.client?.email ?? p?.sale?.client?.email ?? "").trim().toLowerCase();
  const sale_id = String(p?.sale?.id ?? p?.contract?.id ?? "");
  let result = "ignorado";
  try {
    const { data: prod } = await db.from("products").select("pack_ids").eq("greenn_product_id", product_id).maybeSingle();
    const packs: string[] = prod?.pack_ids ?? [];
    if (type === "lead" || !email || !product_id) result = "ignorado (sem e-mail/produto)";
    else if (!packs.length) result = "produto não cadastrado";
    else if (LIBERA.includes(status)) {
      // packs vitalícios (packs.vitalicio = true) não vencem; os demais valem 1 ano.
      // Renovação antes do vencimento soma a partir da data atual de vencimento.
      const { data: vit } = await db.from("packs").select("id").in("id", packs).eq("vitalicio", true);
      const VIT = new Set((vit ?? []).map((x: any) => x.id));
      const { data: atuais } = await db.from("licenses").select("pack_id,status,expires_at,sale_id").eq("email", email).in("pack_id", packs);
      const ANO = 365 * 864e5, agora = Date.now();
      const linhas = packs.map((pack_id) => {
        const a = (atuais ?? []).find((x: any) => x.pack_id === pack_id);
        if (a && a.sale_id === sale_id && a.status === "active") return null;              // aviso repetido da mesma venda
        if (a && a.sale_id === sale_id && a.status === "revoked") return null;             // aviso de "pago" que chega atrasado, depois do reembolso da mesma venda: não reabre o acesso
        if (a && a.status === "active" && !a.expires_at) return null;                       // liberado na mão, sem vencimento
        const base = a?.status === "active" && a.expires_at && new Date(a.expires_at).getTime() > agora ? new Date(a.expires_at).getTime() : agora;
        return { email, pack_id, status: "active", source: "greenn", sale_id, expires_at: VIT.has(pack_id) ? null : new Date(base + ANO).toISOString() };
      }).filter(Boolean);
      const { error } = linhas.length ? await db.from("licenses").upsert(linhas) : { error: null };
      result = error ? "erro: " + error.message : "liberado: " + packs.map((x) => x + (VIT.has(x) ? " (vitalício)" : " (1 ano)")).join(", ");
    } else if (BLOQUEIA.includes(status)) {
      const { error } = await db.from("licenses").update({ status: "revoked", sale_id }).eq("email", email).in("pack_id", packs);
      result = error ? "erro: " + error.message : "bloqueado: " + packs.join(", ");
    } else result = "status sem ação: " + status;
  } catch (e) { result = "erro: " + (e as Error).message; }
  await db.from("webhook_events").insert({ type, event, status, product_id, product_name, email, sale_id, result });
  return new Response(JSON.stringify({ ok: true, result }), { headers: { "content-type": "application/json" } });
});
