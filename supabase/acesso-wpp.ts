// acesso-wpp · manda a mensagem de PRIMEIRO ACESSO (modelos de Utilidade) para quem comprou.
// Quem chama: o relógio do banco (pg_cron + pg_net) a cada minuto, com ?k=CHAVE (integracao_chaves 'acesso_cron').
// O banco decide quem recebe (acesso_fila): junta os produtos da mesma compra, respeita o liga/desliga e o número de teste.
// Erro temporário volta para a fila (5 min, 15 min, 1 h, 3 h, 6 h); erro definitivo fica registrado em acesso_wpp.erro.
import { createClient } from "jsr:@supabase/supabase-js@2";
const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const WA_TOKEN = (Deno.env.get("WA_TOKEN") ?? "").replace(/^Bearer\s+/i, "").trim();
const WA_PHONE_ID = Deno.env.get("WA_PHONE_ID") || "764823320049169";
const GRAPH = "https://graph.facebook.com/v21.0/" + WA_PHONE_ID + "/messages";
// erros da Meta que valem tentar de novo depois (limite, instabilidade, modelo ainda em análise)
const TEMPORARIOS = new Set([1, 2, 4, 80007, 130429, 131000, 131016, 131056, 132001, 132015, 133004]);
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });

type Job = { ids: number[]; telefone: string; nome: string; produtos: string; email: string; modelo: string; caminho: string | null };

function corpo(j: Job) {
  const txt = (t: string) => ({ type: "text", text: String(t || "").slice(0, 120) || "-" });
  const components: unknown[] = [{ type: "body", parameters: [txt(j.nome), txt(j.produtos), txt(j.email)] }];
  if (j.modelo === "acesso_link_v1") components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: j.caminho || "app/" }] });
  return { messaging_product: "whatsapp", to: j.telefone, type: "template", template: { name: j.modelo, language: { code: "pt_BR" }, components } };
}

Deno.serve(async (req) => {
  const k = new URL(req.url).searchParams.get("k") ?? "";
  const { data: ch } = await db.from("integracao_chaves").select("chave").eq("nome", "acesso_cron").maybeSingle();
  if (!k || !ch || k !== ch.chave) return json({ erro: "nao autorizado" }, 401);
  if (!WA_TOKEN) return json({ erro: "WA_TOKEN ausente" }, 500);

  const { data: fila, error } = await db.rpc("acesso_fila", { p_qtd: 20 });
  if (error) { console.error("ACESSO_FILA", error.message); return json({ erro: error.message }, 500); }
  let ok = 0, temp = 0, falhou = 0;
  for (const j of (fila ?? []) as Job[]) {
    let res: { ok: boolean; wamid?: string; erro?: string; temporario?: boolean };
    try {
      const r = await fetch(GRAPH, { method: "POST", headers: { Authorization: "Bearer " + WA_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(corpo(j)) });
      const b = await r.json().catch(() => ({}));
      const wamid = b?.messages?.[0]?.id;
      if (r.ok && wamid) res = { ok: true, wamid };
      else {
        const code = Number(b?.error?.code ?? 0);
        res = { ok: false, erro: (code ? code + " " : "") + String(b?.error?.message ?? ("HTTP " + r.status)).slice(0, 250), temporario: r.status >= 500 || r.status === 429 || TEMPORARIOS.has(code) };
      }
    } catch (e) {
      res = { ok: false, erro: "rede: " + String((e as Error).message).slice(0, 200), temporario: true };
    }
    const { error: e2 } = await db.rpc("acesso_resultado", { p_ids: j.ids, p_ok: res.ok, p_wamid: res.wamid ?? null, p_erro: res.erro ?? null, p_temporario: !!res.temporario });
    if (e2) console.error("ACESSO_RESULTADO", e2.message);
    if (res.ok) ok++; else if (res.temporario) temp++; else falhou++;
    await new Promise((r) => setTimeout(r, 250));
  }
  if (ok || temp || falhou) console.log("ACESSO_WPP", JSON.stringify({ ok, temp, falhou }));
  return json({ ok, temp, falhou });
});
