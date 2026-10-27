// recup-wpp · recuperações novas pelo WhatsApp, sem n8n. Chamada pelo relógio do banco (pg_cron) a cada 10 min, com ?k=CHAVE.
//   1) 2ª mensagem do Pix (modelo recup_pix_util, utilidade): 20 a 48 h depois da 1ª, só para quem não pagou (fila recup_pix_2_fila)
//   2) checkout abandonado de madrugada (modelo recup_abandono_link, com botão "Retomar pedido"): sai das 8h às 11h59 (fila recup_madrugada_fila)
// Cada fluxo só envia quando a chave dele em central_config vale 1. Com tudo desligado, não manda nada.
// Testes no número do Fernando: ?k=CHAVE&teste=pix | madrugada | audio  (não depende das chaves; fica registrado como teste)
import { createClient } from "jsr:@supabase/supabase-js@2";
const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const WA_TOKEN = (Deno.env.get("WA_TOKEN") ?? "").replace(/^Bearer\s+/i, "").trim();
const WA_PHONE_ID = Deno.env.get("WA_PHONE_ID") || "764823320049169";
const GRAPH = "https://graph.facebook.com/v21.0/" + WA_PHONE_ID + "/messages";
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
const nome1 = (n: string | null) => (String(n ?? "").trim().split(/\s+/)[0] || "").replace(/[^\p{L}'-]/gu, "").slice(0, 20);

const tel8 = (t: string) => String(t ?? "").replace(/\D/g, "").slice(-8);
type Res = { ok: boolean; wamid: string | null; erro: string | null; duplicado?: boolean };

// TRAVA_DUPLICADO: reserva a chave ANTES de enviar. Já reservada = não envia de novo.
// A reserva só é desfeita quando a Meta responde com erro claro (a mensagem não saiu).
// Se a conexão cair (resposta incerta), a reserva fica: melhor não reenviar do que mandar 2 vezes.
async function manda(chave: string, to: string, modelo: string, nome: string, extra: unknown[] = []): Promise<Res> {
  const { data: livre, error } = await db.rpc("wpp_reservar", { p_chave: chave });
  if (error) return { ok: false, wamid: null, erro: "trava: " + error.message, duplicado: true };
  if (livre !== true) return { ok: false, wamid: null, erro: "ja enviado (trava)", duplicado: true };
  const components: unknown[] = [...extra, { type: "body", parameters: [{ type: "text", text: nome || "tudo bem" }] }];
  try {
    const r = await fetch(GRAPH, { method: "POST", headers: { Authorization: "Bearer " + WA_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "template", template: { name: modelo, language: { code: "pt_BR" }, components } }),
      signal: AbortSignal.timeout(20000) });
    const j = await r.json().catch(() => ({}));
    const wamid = j?.messages?.[0]?.id ?? null;
    if (!r.ok && !wamid) await db.rpc("wpp_liberar", { p_chave: chave });
    return { ok: r.ok && !!wamid, wamid, erro: r.ok ? null : JSON.stringify(j?.error ?? j).slice(0, 300) };
  } catch (e) {
    return { ok: false, wamid: null, erro: "incerto (conexao): " + String(e).slice(0, 120) };
  }
}
async function registra(tipo: string, l: { sale_id?: string | null; email?: string | null; telefone: string }, r: Res) {
  if (r.duplicado) { console.log("WPP_DUPLICADO_BLOQUEADO", tipo); return; }
  await db.from("wpp_enviados").insert({ tipo, sale_id: l.sale_id ?? null, email: l.email ?? null, telefone: l.telefone, status: r.ok ? "enviado" : "erro: " + (r.erro ?? ""), meta_msg_id: r.wamid });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const k = url.searchParams.get("k") ?? "";
  const { data: ch } = await db.from("integracao_chaves").select("chave").eq("nome", "acesso_cron").maybeSingle();
  if (!k || !ch || k !== ch.chave) return json({ erro: "nao autorizado" }, 401);
  if (!WA_TOKEN) return json({ erro: "WA_TOKEN ausente" }, 500);

  const teste = url.searchParams.get("teste");
  if (teste) {
    const { data: cfg } = await db.from("acesso_config").select("tel_teste").eq("id", 1).maybeSingle();
    const fim = String(cfg?.tel_teste ?? "99725166");
    const { data: t } = await db.from("camp_contatos").select("telefone").like("telefone", "%" + fim).order("id", { ascending: false }).limit(1);
    const tel = t?.[0]?.telefone;
    if (!tel) return json({ erro: "numero de teste nao encontrado" }, 404);
    const linha = { telefone: tel, email: null, sale_id: null };
    // testes: a mesma chamada repetida em até 10 min (ex.: conexão caiu e tentou de novo) não envia outra vez
    const ct = "teste_" + teste + ":" + tel8(tel) + ":" + Math.floor(Date.now() / 600000);
    let r;
    if (teste === "pix") r = await manda(ct, tel, "recup_pix_util", "Fernando");
    else if (teste === "madrugada") r = await manda(ct, tel, "recup_abandono_link", "Fernando");
    else if (teste === "audio") r = await manda(ct, tel, "mood_alunos_audio", "Fernando", [{ type: "header", parameters: [{ type: "video", video: { link: "https://basefl.com/alunos/mood/assets/wa/disparo.mp4" } }] }]);
    else return json({ erro: "teste desconhecido (use pix, madrugada ou audio)" }, 400);
    await registra("teste_" + teste, linha, r);
    return json({ teste, ...r });
  }

  const out: Record<string, number> = { pix2: 0, madrugada: 0, falhou: 0, bloqueado: 0 };
  const { data: p2, error: e1 } = await db.rpc("recup_pix_2_fila", { p_forcar: false });
  if (e1) console.error("PIX2_FILA", e1.message);
  for (const l of (p2 ?? []) as Array<{ sale_id: string; email: string; telefone: string; nome: string }>) {
    const r = await manda("recup_pix_2:" + tel8(l.telefone), l.telefone, "recup_pix_util", nome1(l.nome));
    await registra("recup_pix_2", l, r); r.ok ? out.pix2++ : r.duplicado ? out.bloqueado++ : out.falhou++;
    await new Promise((x) => setTimeout(x, 300));
  }
  const { data: md, error: e2 } = await db.rpc("recup_madrugada_fila", { p_forcar: false });
  if (e2) console.error("MADRUGADA_FILA", e2.message);
  for (const l of (md ?? []) as Array<{ sale_id: string; email: string; telefone: string; nome: string }>) {
    const r = await manda("recup_lead_madrugada:" + tel8(l.telefone), l.telefone, "recup_abandono_link", nome1(l.nome));
    await registra("recup_lead_madrugada", l, r); r.ok ? out.madrugada++ : r.duplicado ? out.bloqueado++ : out.falhou++;
    await new Promise((x) => setTimeout(x, 300));
  }
  if (out.pix2 || out.madrugada || out.falhou || out.bloqueado) console.log("RECUP_WPP", JSON.stringify(out));
  return json(out);
});
