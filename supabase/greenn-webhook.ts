// Base FL — recebe os avisos da Greenn e libera/bloqueia os packs.
// Endereço: https://<PROJETO>.supabase.co/functions/v1/greenn-webhook?token=<GREENN_TOKEN>  (Verify JWT desligado)
import { createClient } from "jsr:@supabase/supabase-js@2";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const LIBERA = ["paid", "trialing"];
const BLOQUEIA = ["refunded", "chargedback", "canceled", "unpaid"];

// ===================== E-MAIL "SEU ACESSO CHEGOU" =====================
// Sai quando a Greenn confirma o pagamento, para quem fecha a página antes de ver a tela de obrigado.
// Precisa de um segredo na função (Edge Functions › Secrets): RESEND_API_KEY. O remetente é o mesmo do e-mail de código;
// para trocar, crie o segredo EMAIL_REMETENTE (ex.: Base FL <acesso@seudominio.com>).
// Sem a chave, ou sem o arquivo 31 do banco, o acesso é liberado do mesmo jeito; só o e-mail não sai.
// REENVIAR para um comprador (ex.: aluno que diz que não recebeu): endereço da função (com o token) + &reenviar=email@doaluno.com
// TESTE: abra no navegador o endereço desta função (com o token) acrescentando &teste=seuemail@exemplo.com  -> chega um e-mail de exemplo.
const RESEND = Deno.env.get("RESEND_API_KEY") ?? "", REMETENTE = Deno.env.get("EMAIL_REMETENTE") || "Base FL <acesso@ofernandoluz.com>", RESPOSTA = Deno.env.get("EMAIL_RESPOSTA") ?? "";
const ESPERA = Number(Deno.env.get("EMAIL_ESPERA_MS") ?? 20000);      // espera os outros produtos do mesmo checkout chegarem
const NO_COMPUTADOR = ["fl-legendas", "fl-sons", "fl-luts"];          // instalam no CapCut do computador, pelo app Base FL
const NOMES: Record<string, string> = { "fl-legendas": "Títulos Dinâmicos", "fl-sons": "Efeitos Sonoros", "fl-luts": "LUTs", "fl-lut": "Mood", "fl-case": "CaseUp", "fl-timer": "ChronoCut",
  "fl-briefing": "Gerador de Briefing", "fl-preco": "Quanto Cobrar?", "fl-contrato": "Gerador de Contrato", "fl-painel": "Base Demandas" };
// Nome que o comprador vê (assunto e texto). O nome guardado no banco é interno (ex.: "Títulos P (Greenn)") e não serve para o cliente.
const PRODUTOS: Record<string, string> = { "195639": "Títulos Dinâmicos", "195812": "LUTs", "195814": "Efeitos Sonoros", "195947": "Mood", "195949": "Kit Freelancer", "196127": "CaseUp",
  "195820": "Gerador de Briefing", "195818": "Quanto Cobrar?", "195819": "Gerador de Contrato", "195822": "Base Demandas" };
const nomeProduto = (id: string, p: any) => PRODUTOS[id] || ((p?.pack_ids ?? []).length === 1 && NOMES[p.pack_ids[0]]) || String(p?.name ?? "").replace(/\s*\(greenn\)\s*/gi, " ").trim();
const esc = (t: string) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c]);
const lista = (l: string[]) => l.length <= 1 ? (l[0] ?? "") : l.slice(0, -1).join(", ") + " e " + l[l.length - 1];
const tamanho = (prods: any[], id: string) => (prods.find((p) => p.greenn_product_id === id)?.pack_ids ?? []).length;
const dorme = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Procura no aviso da Greenn os parâmetros de origem (utm_*, src, sck), onde quer que venham. Só texto curto.
export function origemDe(p: any): Record<string, string> | null {
  const achados: Record<string, string> = {};
  const anda = (o: any, nivel: number) => {
    if (!o || typeof o !== "object" || nivel > 5) return;
    for (const [k, v] of Object.entries(o)) {
      const kk = k.toLowerCase();
      if (/^(utm_(source|medium|campaign|content|term)|src|sck)$/.test(kk) && (typeof v === "string" || typeof v === "number") && String(v).trim()) {
        if (!achados[kk]) achados[kk] = String(v).trim().slice(0, 120);
      } else if (typeof v === "object") anda(v, nivel + 1);
    }
  };
  anda(p, 0);
  return Object.keys(achados).length ? achados : null;
}

// Telefone do comprador, só dígitos com DDI 55 (para cruzar com quem recebeu link no WhatsApp).
export function telefoneDe(p: any): string | null {
  const c = p?.client ?? p?.sale?.client ?? p?.customer ?? {};
  const bruto = String(c?.cellphone ?? c?.phone ?? c?.telefone ?? "").replace(/\D/g, "");
  if (bruto.length < 10) return null;
  return bruto.length <= 11 ? "55" + bruto : bruto.slice(0, 15);
}

// Monta o e-mail. produtos = o que a pessoa comprou (nomes); packs = tudo o que essa compra liberou.
export function montaEmail(email: string, produtos: string[], packs: string[]) {
  const F = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;";
  const LINK = "https://basefl.com/instalar/?de=email", ZAP = "https://wa.me/5547996974735?text=" + encodeURIComponent("Oi! Comprei no Base FL e preciso de ajuda para acessar.");
  const pc = packs.filter((x) => NO_COMPUTADOR.includes(x)), web = packs.filter((x) => !NO_COMPUTADOR.includes(x));
  const nomes = produtos.length ? produtos : packs.map((x) => NOMES[x] ?? x);
  const nomesWeb = web.map((x) => NOMES[x]).filter(Boolean);
  const comprou = lista(nomes.map((n) => `<strong style="color:#F4F0E4;">${esc(n)}</strong>`));
  const passo = (n: number, titulo: string, texto: string) => `<tr><td valign="top" width="34" style="padding:0 12px 18px 0;"><div style="width:30px;height:30px;line-height:30px;border-radius:15px;background:#F2A541;color:#141615;${F}font-size:15px;font-weight:800;text-align:center;">${n}</div></td>
      <td valign="top" style="padding:3px 0 18px 0;${F}"><div style="font-size:16px;line-height:1.35;font-weight:700;color:#F4F0E4;">${titulo}</div><div style="font-size:14.5px;line-height:1.55;color:#B3B4A2;padding-top:3px;">${texto}</div></td></tr>`;
  const seuEmail = `<span style="display:inline-block;margin-top:6px;padding:7px 11px;border-radius:9px;background:#0D0F0E;border:1px solid #2b302e;font-family:'SF Mono',Menlo,Consolas,'Courier New',monospace;font-size:14px;color:#F4F0E4;">${esc(email)}</span>`;
  const passos = pc.length
    ? passo(1, "Abra a página de instalação no computador", "Mac ou Windows. Tem um vídeo curto mostrando tudo, passo a passo. O botão está logo abaixo.") +
      passo(2, "Baixe e abra o app Base FL", "É o app que coloca o material dentro do seu CapCut.") +
      passo(3, "Entre com este e-mail", "O mesmo da compra. Não tem senha: chega um código neste e-mail, é só digitar." + "<br>" + seuEmail) +
      passo(4, "Clique em Instalar e abra o CapCut", "Pronto. O que você comprou já aparece dentro do CapCut.")
    : passo(1, "Abra o Base FL", "No celular ou no computador. O botão está logo abaixo.") +
      passo(2, "Entre com este e-mail", "O mesmo da compra. Não tem senha: chega um código neste e-mail, é só digitar." + "<br>" + seuEmail) +
      passo(3, "Toque na ferramenta e comece a usar", "Tudo o que você comprou já aparece liberado.");
  const botao = pc.length ? "Ver o vídeo e baixar o app" : "Abrir o Base FL";
  const obs = pc.length
    ? `<strong style="color:#F4F0E4;">Está no celular agora?</strong> ${esc(lista(pc.map((x) => NOMES[x])))} ${pc.length > 1 ? "funcionam" : "funciona"} no CapCut do computador. Abra este e-mail no computador, ou digite lá: <strong style="color:#F4F0E4;">basefl.com/instalar</strong>` +
      (nomesWeb.length ? `<br><br><strong style="color:#F4F0E4;">Também liberado:</strong> ${esc(lista(nomesWeb))}. ${nomesWeb.length > 1 ? "Abrem" : "Abre"} no navegador, no celular ou no computador, pelo mesmo botão.` : "")
    : `<strong style="color:#F4F0E4;">Dica:</strong> no celular, o Base FL oferece colocar um ícone na tela inicial. Fica igual a um app.`;
  // assunto começa pelo nome do que a pessoa comprou (é o que ela reconhece na caixa de entrada); mais de 3 produtos: resume
  const assunto = (nomes.length > 3 ? nomes[0] + " e mais " + (nomes.length - 1) : lista(nomes)) + ": seu acesso chegou";
  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>${esc(assunto)}</title></head>
<body style="margin:0;padding:0;background:#0D0F0E;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#0D0F0E;">Pagamento confirmado. Veja o passo a passo para acessar agora.${"&nbsp;&zwnj;".repeat(90)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0D0F0E;"><tr><td align="center" style="padding:28px 14px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#171A18;border:1px solid #262D28;border-radius:20px;">
    <tr><td style="padding:26px 26px 0 26px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="40" height="40" style="width:40px;height:40px;"><img src="https://basefl.com/apple-touch-icon.png" width="40" height="40" alt="FL" style="display:block;width:40px;height:40px;border-radius:11px;border:0;"></td>
        <td style="padding-left:12px;${F}font-size:17px;font-weight:700;color:#F4F0E4;">Base FL</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:22px 26px 0 26px;${F}">
      <div style="display:inline-block;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#7fce8f;border:1px solid #2f5a3a;background:#14251a;border-radius:99px;padding:5px 11px;">&#10003;&nbsp; Pagamento confirmado</div>
      <h1 style="margin:14px 0 10px 0;font-size:27px;line-height:1.15;color:#F4F0E4;font-weight:800;letter-spacing:-.4px;">Seu acesso chegou.</h1>
      <p style="margin:0;font-size:15.5px;line-height:1.55;color:#B3B4A2;">Você comprou ${comprou}. Já está tudo liberado. Falta só entrar, e é rápido:</p>
    </td></tr>
    <tr><td style="padding:22px 26px 0 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${passos}</table></td></tr>
    <tr><td align="center" style="padding:4px 26px 0 26px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#F2A541" style="background:#F2A541;border-radius:14px;">
        <a href="${LINK}" target="_blank" style="display:block;padding:17px 18px;${F}font-size:17px;font-weight:800;color:#141615;text-decoration:none;">${botao} &rarr;</a>
      </td></tr></table>
      <p style="margin:10px 0 0 0;${F}font-size:12.5px;line-height:1.5;color:#8d8e80;">Se o botão não abrir, copie e cole no navegador: basefl.com/instalar</p>
    </td></tr>
    <tr><td style="padding:20px 26px 0 26px;"><div style="border:1px solid #2b302e;background:#131615;border-radius:14px;padding:14px 15px;${F}font-size:14px;line-height:1.55;color:#B3B4A2;">${obs}</div></td></tr>
    <tr><td style="padding:20px 26px 26px 26px;${F}font-size:14px;line-height:1.55;color:#B3B4A2;">Travou em algum passo? <a href="${ZAP}" target="_blank" style="color:#F2A541;font-weight:700;text-decoration:underline;">Fale com o suporte no WhatsApp</a>.</td></tr>
  </table>
  <p style="margin:18px 0 0 0;${F}font-size:12px;line-height:1.6;color:#5E5B53;">Você recebeu este e-mail porque fez uma compra no Base FL.<br>FL Treinamentos Online Ltda &middot; CNPJ 53.803.974/0001-70 &middot; <a href="https://basefl.com/termos/" style="color:#5E5B53;">Termos</a> &middot; <a href="https://basefl.com/privacidade/" style="color:#5E5B53;">Privacidade</a></p>
</td></tr></table>
</body></html>`;
  const texto = `Seu acesso chegou.\n\nVocê comprou ${lista(nomes)}. Já está tudo liberado.\n\n` +
    (pc.length ? `1. No computador (Mac ou Windows), abra: https://basefl.com/instalar/ (tem um vídeo mostrando tudo)\n2. Baixe e abra o app Base FL\n3. Entre com este e-mail: ${email} (chega um código, não tem senha)\n4. Clique em Instalar e abra o CapCut\n`
               : `1. Abra: https://basefl.com/instalar/ (celular ou computador)\n2. Entre com este e-mail: ${email} (chega um código, não tem senha)\n3. Toque na ferramenta e comece a usar\n`) +
    `\nPrecisa de ajuda? WhatsApp do suporte: ${ZAP}\n`;
  return { assunto, html, texto };
}

// Entrega o e-mail ao Resend. Se o Resend estiver instável, tenta mais uma vez (com a mesma chave, para nunca duplicar).
async function mandaResend(email: string, m: { assunto: string; html: string; texto: string }, chave: string) {
  const corpo: Record<string, unknown> = { from: REMETENTE, to: [email], subject: m.assunto, html: m.html, text: m.texto };
  if (RESPOSTA) corpo.reply_to = RESPOSTA;
  let detalhe = "", ok = false;
  for (let t = 0; t < 2 && !ok; t++) {
    if (t) await dorme(3000);
    try {
      const x = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + RESEND, "Content-Type": "application/json", "Idempotency-Key": chave }, body: JSON.stringify(corpo) });
      const j = await x.json().catch(() => ({}));
      ok = x.ok; detalhe = x.ok ? String(j?.id ?? "") : x.status + " " + String(j?.message ?? j?.name ?? "");
      if (!x.ok && x.status < 500 && x.status !== 429) break;                   // erro de configuração: tentar de novo não resolve
    } catch (e) { detalhe = (e as Error).message; }
  }
  return { ok, detalhe };
}

// Um e-mail por compra: reserva o envio, espera os outros produtos do mesmo checkout e manda tudo junto.
async function avisaAcesso(email: string) {
  let id = 0;
  try {
    const r = await db.rpc("acesso_email_reserva", { p_email: email });
    id = Number(r.data ?? 0); if (r.error || !id) return;                       // sem o arquivo 31, ou já tem um envio a caminho
    const fim = (campos: Record<string, unknown>) => db.from("acesso_emails").update(campos).eq("id", id);
    if (!RESEND) { await fim({ status: "erro: falta configurar o segredo RESEND_API_KEY na função" }); return; }
    if (ESPERA > 0) await dorme(ESPERA);
    await fim({ status: "enviando" });                                         // daqui em diante, aviso novo ganha e-mail próprio
    const ant = await db.from("acesso_emails").select("ate_evento").eq("email", email).not("ate_evento", "is", null).order("ate_evento", { ascending: false }).limit(1);
    const desde = Number(ant.data?.[0]?.ate_evento ?? 0);
    const ev = await db.from("webhook_events").select("id,product_id,product_name").eq("email", email).like("result", "liberado%").gt("id", desde)
      .gte("received_at", new Date(Date.now() - 30 * 60000).toISOString()).order("id", { ascending: true });
    const eventos = ev.data ?? [];
    if (!eventos.length) { await fim({ status: "nada a avisar" }); return; }
    const ids = [...new Set(eventos.map((e: any) => String(e.product_id)))];
    const pr = await db.from("products").select("greenn_product_id,name,pack_ids").in("greenn_product_id", ids);
    const prods = pr.data ?? [];
    ids.sort((a, b) => tamanho(prods, b) - tamanho(prods, a));                 // produto principal primeiro (o que libera mais coisa); os adicionais do checkout depois
    const nomes = ids.map((i) => nomeProduto(i, prods.find((p: any) => p.greenn_product_id === i)) || eventos.find((e: any) => String(e.product_id) === i)?.product_name || "").filter(Boolean);
    const packs = [...new Set(prods.flatMap((p: any) => p.pack_ids ?? []))] as string[];
    const m = montaEmail(email, nomes, packs), ate = Math.max(...eventos.map((e: any) => Number(e.id)));
    const { ok: okEnvio, detalhe } = await mandaResend(email, m, "basefl-acesso-" + id);
    await fim({ status: okEnvio ? "enviado" : "erro: " + detalhe.slice(0, 300), produtos: nomes.join(", "), detalhe: okEnvio ? detalhe : null, ate_evento: okEnvio ? ate : null });
  } catch (e) {
    try { if (id) await db.from("acesso_emails").update({ status: "erro: " + (e as Error).message.slice(0, 300) }).eq("id", id); } catch { /* o e-mail nunca derruba a liberação */ }
  }
}
Deno.serve(async (req) => {
  const end = new URL(req.url), token = end.searchParams.get("token") ?? "", certo = Deno.env.get("GREENN_TOKEN") ?? "";
  const teste = (end.searchParams.get("teste") ?? "").trim().toLowerCase();
  if (req.method === "GET" && teste) {                                                  // e-mail de exemplo, só com o token certo; não mexe em acesso nenhum
    const txt = (t: string, status = 200) => new Response(t, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
    if (!certo || token !== certo) return txt("token inválido", 401);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(teste)) return txt("Escreva um e-mail válido depois de teste=", 400);
    if (!RESEND) return txt("Falta o segredo RESEND_API_KEY na função. O e-mail não foi enviado.", 500);
    const web = end.searchParams.get("tipo") === "web";
    const m = web ? montaEmail(teste, ["Kit Freelancer"], ["fl-briefing", "fl-preco", "fl-contrato", "fl-painel"]) : montaEmail(teste, ["Títulos Dinâmicos"], ["fl-legendas", "fl-case", "fl-timer"]);
    const r = await mandaResend(teste, { ...m, assunto: "[TESTE] " + m.assunto }, "basefl-teste-" + Date.now());
    return r.ok ? txt("E-mail de teste enviado para " + teste + ". Confira a caixa de entrada e o spam.") : txt("O Resend recusou o envio: " + r.detalhe + "\nRemetente usado: " + REMETENTE, 502);
  }
  const reenviar = (end.searchParams.get("reenviar") ?? "").trim().toLowerCase();
  if (req.method === "GET" && reenviar) {                                               // manda de novo o e-mail de acesso de UM comprador, com o que ele comprou e continua liberado
    const txt = (t: string, status = 200) => new Response(t, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
    if (!certo || token !== certo) return txt("token inválido", 401);
    if (!RESEND) return txt("Falta o segredo RESEND_API_KEY na função. O e-mail não foi enviado.", 500);
    const ev = await db.from("webhook_events").select("id,product_id").eq("email", reenviar).like("result", "%liberado%").order("id", { ascending: true });
    const ids = [...new Set((ev.data ?? []).map((e: any) => String(e.product_id)))];
    const pr = ids.length ? await db.from("products").select("greenn_product_id,name,pack_ids").in("greenn_product_id", ids) : { data: [] };
    const lic = await db.from("licenses").select("pack_id").eq("email", reenviar).eq("status", "active");
    const ativos = new Set((lic.data ?? []).map((l: any) => l.pack_id));
    const prods = (pr.data ?? []).filter((p: any) => (p.pack_ids ?? []).some((k: string) => ativos.has(k)));       // produto reembolsado fica de fora
    if (!prods.length) return txt("Não achei compra liberada para " + reenviar + ". Confira se o e-mail está igual ao da compra. Nada foi enviado.", 404);
    ids.sort((a, b) => tamanho(prods, b) - tamanho(prods, a));
    const nomes = ids.filter((i) => prods.some((p: any) => p.greenn_product_id === i)).map((i) => nomeProduto(i, prods.find((p: any) => p.greenn_product_id === i))).filter(Boolean) as string[];
    const packs = [...new Set(prods.flatMap((p: any) => p.pack_ids ?? []))].filter((k) => ativos.has(k as string)) as string[];
    const r = await mandaResend(reenviar, montaEmail(reenviar, nomes, packs), "basefl-reenvio-" + reenviar + "-" + Math.floor(Date.now() / 60000));
    await db.from("acesso_emails").insert({ email: reenviar, status: r.ok ? "enviado" : "erro: " + r.detalhe.slice(0, 300), produtos: nomes.join(", "), detalhe: r.ok ? "reenvio " + r.detalhe : null, ate_evento: r.ok ? Math.max(...(ev.data ?? []).map((e: any) => Number(e.id))) : null });
    return r.ok ? txt("E-mail de acesso enviado para " + reenviar + " (" + nomes.join(", ") + ").") : txt("O Resend recusou o envio: " + r.detalhe, 502);
  }
  if (req.method !== "POST") return new Response("ok");
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
  let result = "ignorado", avisar = false;
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
      // aviso repetido da mesma venda (nada mudou) fica anotado como "já liberado", para não entrar de novo em e-mail nenhum
      result = error ? "erro: " + error.message : (linhas.length ? "liberado: " : "já liberado: ") + packs.map((x) => x + (VIT.has(x) ? " (vitalício)" : " (1 ano)")).join(", ");
      avisar = !error && linhas.length > 0;                                             // liberou algo novo: avisa por e-mail
    } else if (BLOQUEIA.includes(status)) {
      const { error } = await db.from("licenses").update({ status: "revoked", sale_id }).eq("email", email).in("pack_id", packs);
      result = error ? "erro: " + error.message : "bloqueado: " + packs.join(", ");
    } else result = "status sem ação: " + status;
  } catch (e) { result = "erro: " + (e as Error).message; }
  // origem da venda (utm/src que a Greenn repassa) e telefone do comprador: para saber quais vendas vieram do WhatsApp.
  // Se as colunas ainda não existirem no banco (SQL 33 não rodado), grava do jeito antigo.
  const extra = { origem: origemDe(p), telefone: telefoneDe(p) };
  const { error: e1 } = await db.from("webhook_events").insert({ type, event, status, product_id, product_name, email, sale_id, result, ...extra });
  if (e1) await db.from("webhook_events").insert({ type, event, status, product_id, product_name, email, sale_id, result });
  if (avisar) {                                                                         // depois de responder à Greenn; qualquer falha aqui não muda o acesso
    const tarefa = avisaAcesso(email);
    try { (globalThis as any).EdgeRuntime.waitUntil(tarefa); } catch { await tarefa; }
  }
  return new Response(JSON.stringify({ ok: true, result }), { headers: { "content-type": "application/json" } });
});
