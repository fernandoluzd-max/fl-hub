-- ============================================================
-- 33 · Atendimento Base FL no WhatsApp: registro, consulta de compra e números do painel
-- ------------------------------------------------------------
-- Cole no SQL Editor do Supabase e clique em Run. Pode rodar mais de uma vez.
-- NÃO muda nada do que já funciona: só cria tabelas, funções e consultas novas
-- e acrescenta 2 colunas (vazias) no registro da Greenn.
--
-- O robô (n8n) fala com o banco só por 2 funções, protegidas por uma chave própria:
--   atd_registrar(chave, eventos)  -> guarda o que aconteceu (link enviado, encaminhado para a equipe…)
--   atd_compras(chave, email)      -> diz se aquele e-mail tem compra e de quais produtos
-- A chave fica na tabela atd_config (ninguém de fora lê). No fim deste arquivo ela aparece
-- UMA vez: copie e cole no nó "Configuração" do fluxo no n8n. Não mande essa chave para ninguém.
--
-- Privacidade (LGPD): o banco NÃO guarda o texto das conversas. Guarda o tipo do evento,
-- o produto, o link enviado e o telefone (para saber se quem recebeu o link comprou).
-- Tudo some sozinho depois de 180 dias (função atd_limpar, abaixo).
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Chave do robô (só o banco lê)
create table if not exists public.atd_config (
  chave text primary key,
  valor text not null,
  criado_em timestamptz not null default now()
);
alter table public.atd_config enable row level security;   -- sem nenhuma regra: ninguém de fora lê nem grava
insert into public.atd_config (chave, valor)
  values ('robo_chave', encode(gen_random_bytes(24), 'hex'))
  on conflict (chave) do nothing;

-- 2) Eventos do atendimento
create table if not exists public.atd_eventos (
  id         bigserial primary key,
  em         timestamptz not null default now(),
  conversa   text not null,                 -- id da conversa no WhatsApp (número@s.whatsapp.net)
  telefone   text,                          -- só dígitos, para cruzar com a compra
  tipo       text not null check (tipo in (
               'mensagem','resposta','link_enviado','handoff','pausa_humana','retomada',
               'compra_consultada','erro')),
  publico    text check (publico in ('interessado','cliente','desconhecido')),
  intencao   text,
  produto    text,
  link       text,
  dados      jsonb
);
create index if not exists atd_eventos_em on public.atd_eventos (em desc);
create index if not exists atd_eventos_tel on public.atd_eventos (telefone, em desc);
alter table public.atd_eventos enable row level security;   -- trancada: só as funções abaixo gravam

-- 3) Registro da Greenn: de onde veio a venda e o telefone do comprador (preenchidos pelo webhook novo)
alter table public.webhook_events add column if not exists origem jsonb;
alter table public.webhook_events add column if not exists telefone text;
create index if not exists webhook_events_tel on public.webhook_events (telefone);

-- 4) Funções do robô
create or replace function public._atd_ok(p_chave text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.atd_config c where c.chave = 'robo_chave' and c.valor = coalesce(p_chave, '') and length(coalesce(p_chave, '')) >= 32);
$$;
revoke execute on function public._atd_ok(text) from public, anon, authenticated;

create or replace function public.atd_registrar(p_chave text, p_eventos jsonb) returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare e jsonb; n integer := 0;
begin
  if not public._atd_ok(p_chave) then raise exception 'chave inválida'; end if;
  if jsonb_typeof(p_eventos) <> 'array' then return 0; end if;
  -- freio contra abuso: no máximo 3000 eventos por hora
  if (select count(*) from public.atd_eventos where em > now() - interval '1 hour') > 3000 then return 0; end if;
  for e in select * from jsonb_array_elements(p_eventos) limit 20 loop
    begin
      insert into public.atd_eventos (conversa, telefone, tipo, publico, intencao, produto, link, dados)
      values (
        left(coalesce(e->>'conversa', '?'), 80),
        nullif(regexp_replace(coalesce(e->>'telefone', ''), '\D', '', 'g'), ''),
        e->>'tipo',
        case when e->>'publico' in ('interessado','cliente','desconhecido') then e->>'publico' end,
        left(e->>'intencao', 40),
        left(e->>'produto', 30),
        left(e->>'link', 300),
        case when pg_column_size(e->'dados') <= 2000 then e->'dados' end
      );
      n := n + 1;
    exception when check_violation then null;    -- tipo desconhecido: ignora só esse
    end;
  end loop;
  return n;
end $$;
revoke execute on function public.atd_registrar(text, jsonb) from public;
grant execute on function public.atd_registrar(text, jsonb) to anon, authenticated;

-- Consulta de compra pelo e-mail que a pessoa informou na conversa.
-- Devolve só: se achou, os NOMES dos produtos ativos e se existe pagamento esperando aprovação.
create or replace function public.atd_compras(p_chave text, p_email text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_email text := lower(btrim(coalesce(p_email, ''))); v_prod jsonb; v_pend boolean; v_reemb boolean;
begin
  if not public._atd_ok(p_chave) then raise exception 'chave inválida'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('valido', false); end if;
  select coalesce(jsonb_agg(distinct coalesce(p.name, l.pack_id)), '[]'::jsonb) into v_prod
    from public.licenses l left join public.packs p on p.id = l.pack_id
   where l.email = v_email and l.status = 'active';
  select exists (select 1 from public.webhook_events w where w.email = v_email and w.received_at > now() - interval '10 days'
                  and lower(coalesce(w.status, '')) in ('waiting_payment','pending','aguardando_pagamento','processing')) into v_pend;
  select exists (select 1 from public.licenses l where l.email = v_email and l.status = 'revoked') into v_reemb;
  return jsonb_build_object('valido', true, 'encontrada', jsonb_array_length(v_prod) > 0, 'produtos', v_prod,
                            'pagamento_pendente', v_pend, 'teve_reembolso', v_reemb);
end $$;
revoke execute on function public.atd_compras(text, text) from public;
grant execute on function public.atd_compras(text, text) to anon, authenticated;

-- 5) Limpeza (LGPD): apaga eventos com mais de 180 dias. Rode quando quiser (ou agende no Supabase › Cron).
create or replace function public.atd_limpar() returns integer
language sql security definer set search_path = public, pg_temp as $$
  with x as (delete from public.atd_eventos where em < now() - interval '180 days' returning 1) select count(*)::int from x;
$$;
revoke execute on function public.atd_limpar() from public, anon, authenticated;

-- 6) Painel (consultas prontas: Supabase › Table Editor › Views, ou SQL "select * from atd_painel_dia")
create or replace view public.atd_painel_dia with (security_invoker = on) as
select date_trunc('day', em at time zone 'America/Sao_Paulo')::date as dia,
       count(distinct conversa) filter (where tipo = 'mensagem')                          as conversas,
       count(distinct conversa) filter (where tipo = 'mensagem' and publico = 'interessado') as interessados,
       count(distinct conversa) filter (where tipo = 'mensagem' and publico = 'cliente')     as clientes,
       count(*) filter (where tipo = 'link_enviado')                                       as links_enviados,
       count(distinct conversa) filter (where tipo = 'handoff')                            as passadas_para_equipe,
       count(*) filter (where tipo = 'erro')                                               as erros
  from public.atd_eventos group by 1 order by 1 desc;

create or replace view public.atd_produtos_procurados with (security_invoker = on) as
select produto, count(distinct conversa) as conversas, count(*) filter (where tipo = 'link_enviado') as links
  from public.atd_eventos where produto is not null and em > now() - interval '30 days'
 group by produto order by conversas desc;

create or replace view public.atd_intencoes with (security_invoker = on) as
select intencao, count(*) as vezes from public.atd_eventos
 where tipo = 'mensagem' and em > now() - interval '30 days' group by intencao order by vezes desc;

-- Vendas atribuídas: compra aprovada até 7 dias depois de um link enviado pelo WhatsApp
-- para o MESMO telefone, ou compra que chegou com utm_medium=whatsapp (vindo da página com ?de=whatsapp).
create or replace view public.atd_vendas_atribuidas with (security_invoker = on) as
select distinct on (w.sale_id, w.product_id)
       w.received_at as comprou_em, w.product_name as produto_comprado, w.sale_id,
       case when l.id is not null then 'mesmo telefone' else 'utm whatsapp' end as como_atribuiu,
       l.em as link_em, l.produto as produto_do_link
  from public.webhook_events w
  left join public.atd_eventos l on l.tipo = 'link_enviado' and w.telefone is not null and l.telefone = w.telefone
       and l.em <= w.received_at and l.em > w.received_at - interval '7 days'
 where lower(coalesce(w.status, '')) in ('paid','approved','aprovado','pago','completed')
   and (l.id is not null or w.origem->>'utm_medium' = 'whatsapp' or w.origem->>'src' = 'basefl-whatsapp')
 order by w.sale_id, w.product_id, l.em desc;

-- As views só aparecem para quem entra no painel do Supabase (dono do projeto); o site não tem acesso.
revoke all on public.atd_painel_dia, public.atd_produtos_procurados, public.atd_intencoes, public.atd_vendas_atribuidas from anon, authenticated;

-- 7) Copie a chave abaixo e cole no nó "Configuração" do fluxo Base FL no n8n (campo ATD_CHAVE).
select valor as copie_esta_chave_para_o_n8n from public.atd_config where chave = 'robo_chave';
