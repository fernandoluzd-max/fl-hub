-- 57 · Primeiro acesso pelo WhatsApp (modelos de UTILIDADE), para todos os produtos (Greenn e Kiwify)
-- Fluxo: venda paga -> acesso_wpp (fila) -> função acesso-wpp manda o modelo certo -> status volta pelo wa-inbound.
-- Desligado até acesso_config.ativo = true (só o número de teste recebe antes disso).

-- 1) produtos -> modelo e caminho do botão
create table if not exists public.acesso_produtos (
  plataforma text not null, produto_id text not null, nome text not null,
  modelo text not null, caminho text, ativo boolean not null default true,
  primary key (plataforma, produto_id));
alter table public.acesso_produtos enable row level security;
insert into public.acesso_produtos (plataforma, produto_id, nome, modelo, caminho) values
  ('greenn', '195639', 'Títulos Dinâmicos', 'acesso_capcut_v1', null),
  ('greenn', '195812', 'LUTs',              'acesso_capcut_v1', null),
  ('greenn', '195814', 'Efeitos Sonoros',   'acesso_capcut_v1', null),
  ('greenn', '198176', 'Base FL Assets',    'acesso_capcut_v1', null),
  ('greenn', '195947', 'Mood',              'acesso_link_v1',   'mood/login/?de=whatsapp'),
  ('greenn', '195949', 'Kit Freelancer',    'acesso_link_v1',   'app/?de=whatsapp'),
  ('greenn', '196127', 'CaseUp',            'acesso_link_v1',   'case/?de=whatsapp'),
  ('greenn', '195820', 'Gerador de Briefing', 'acesso_link_v1', 'briefing/?de=whatsapp'),
  ('greenn', '195818', 'Quanto Cobrar?',    'acesso_link_v1',   'preco/?de=whatsapp'),
  ('greenn', '195819', 'Gerador de Contrato', 'acesso_link_v1', 'contrato/?de=whatsapp'),
  ('greenn', '195822', 'Base Demandas',     'acesso_link_v1',   'painel/?de=whatsapp'),
  ('greenn', '*',      'seu produto',       'acesso_link_v1',   'app/?de=whatsapp'),     -- produto novo da Greenn ainda sem linha aqui
  ('kiwify', '*',      'seu curso',         'acesso_kiwify_v1', null)                    -- qualquer produto da Kiwify (Reels Academy etc.)
on conflict (plataforma, produto_id) do nothing;

-- 2) liga/desliga + número de teste
create table if not exists public.acesso_config (id int primary key default 1 check (id = 1), ativo boolean not null default false, tel_teste text);
alter table public.acesso_config enable row level security;
insert into public.acesso_config (id, ativo, tel_teste) values (1, false, '99725166') on conflict (id) do nothing;

-- 3) fila
create table if not exists public.acesso_wpp (
  id bigint generated always as identity primary key,
  plataforma text not null, venda_id text not null, produto_id text not null, produto_nome text,
  email text, telefone text, nome text, modelo text, caminho text,
  status text not null default 'pendente',          -- pendente, enviando, enviado, entregue, lido, falhou, sem_telefone, cancelado
  tentativas int not null default 0, proxima_em timestamptz not null default now() + interval '2 minutes',
  erro text, wamid text, criado_em timestamptz not null default now(), enviado_em timestamptz, entregue_em timestamptz, lido_em timestamptz,
  unique (plataforma, venda_id, produto_id));
alter table public.acesso_wpp enable row level security;
create index if not exists acesso_wpp_fila on public.acesso_wpp (status, proxima_em);
create index if not exists acesso_wpp_wamid on public.acesso_wpp (wamid);

create or replace function public._tel_br(p text) returns text language sql immutable as $$
  select case when t ~ '^55\d{10,11}$' then t when t ~ '^\d{10,11}$' then '55' || t else null end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as t) s $$;
create or replace function public._primeiro_nome(p_nome text, p_email text) returns text language sql immutable as $$
  select coalesce(
    nullif(initcap(substring(split_part(trim(coalesce(p_nome, '')), ' ', 1) from '^[[:alpha:]]{2,20}')), ''),
    nullif(initcap(substring(split_part(coalesce(p_email, ''), '@', 1) from '^[[:alpha:]]{3,12}')), ''),
    'tudo bem') $$;

-- 4) entrada: qualquer venda paga
create or replace function public.acesso_enfileira(p_plataforma text, p_venda text, p_produto_id text, p_produto_nome text,
                                                   p_email text, p_telefone text, p_nome text)
returns text language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare m record; tel text := public._tel_br(p_telefone);
begin
  if p_venda is null or p_produto_id is null then return 'sem_venda'; end if;
  select * into m from public.acesso_produtos where plataforma = p_plataforma and produto_id = p_produto_id and ativo;
  if not found then select * into m from public.acesso_produtos where plataforma = p_plataforma and produto_id = '*' and ativo; end if;
  if not found then return 'sem_modelo'; end if;
  insert into public.acesso_wpp (plataforma, venda_id, produto_id, produto_nome, email, telefone, nome, modelo, caminho, status)
  values (p_plataforma, p_venda, p_produto_id,
          case when m.produto_id = '*' then coalesce(nullif(trim(p_produto_nome), ''), m.nome) else m.nome end,
          lower(p_email), tel, public._primeiro_nome(p_nome, p_email), m.modelo, m.caminho,
          case when tel is null then 'sem_telefone' else 'pendente' end)
  on conflict (plataforma, venda_id, produto_id) do nothing;
  return case when tel is null then 'sem_telefone' else 'na_fila' end;
end $$;
revoke all on function public.acesso_enfileira(text, text, text, text, text, text, text) from public, anon, authenticated;

-- Greenn: todo evento pago gravado em webhook_events entra na fila; reembolso cancela o que ainda não saiu
create or replace function public.acesso_greenn_trg() returns trigger
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
begin
  begin
    if new.status = 'paid' then
      perform public.acesso_enfileira('greenn', new.sale_id, new.product_id, new.product_name, new.email, new.telefone, null);
    elsif new.status in ('refunded', 'chargedback') then
      update public.acesso_wpp set status = 'cancelado' where plataforma = 'greenn' and venda_id = new.sale_id and status in ('pendente', 'sem_telefone');
    end if;
  exception when others then raise warning 'acesso_greenn_trg: %', sqlerrm;   -- nunca atrapalha o registro da venda
  end;
  return new;
end $$;
drop trigger if exists acesso_greenn on public.webhook_events;
create trigger acesso_greenn after insert on public.webhook_events for each row execute function public.acesso_greenn_trg();

-- Kiwify: qualquer produto pago entra na fila (além da regra do Reels Academy -> Títulos, que continua igual)
do $x$
declare d text;
begin
  select pg_get_functiondef('public.kiwify_venda(text,text,text,text,text,text,text)'::regprocedure) into d;
  if position('ACESSO_WPP' in d) = 0 then
    d := replace(d, '  if coalesce(p_produto, '''') !~* ''reels\s*academy'' then v_res := ''outro_produto'';',
      '  -- ACESSO_WPP: primeiro acesso de qualquer produto da Kiwify
  if p_status = ''paid'' then perform public.acesso_enfileira(''kiwify'', p_pedido, coalesce(nullif(p_produto, ''''), ''*''), p_produto, p_email, p_telefone, p_nome);
  elsif p_status in (''refunded'', ''chargedback'') then
    update public.acesso_wpp set status = ''cancelado'' where plataforma = ''kiwify'' and venda_id = p_pedido and status in (''pendente'', ''sem_telefone'');
  end if;
  if coalesce(p_produto, '''') !~* ''reels\s*academy'' then v_res := ''outro_produto'';');
    if position('ACESSO_WPP' in d) = 0 then raise exception 'kiwify_venda: trecho não encontrado'; end if;
    execute d;
  end if;
end $x$;

create or replace function public._lista_pt(a text[]) returns text language sql immutable as $$
  select case when count(*) = 1 then max(x) else string_agg(x, ', ' order by o) filter (where o < max_o) || ' e ' || max(x) filter (where o = max_o) end
  from (select x, o, max(o) over () as max_o from (select x, min(o) as o from unnest(a) with ordinality t(x, o) group by x) u) v $$;

-- 5) fila de envio: junta os produtos da mesma compra (ex.: Títulos + order bumps) numa mensagem só
create or replace function public.acesso_fila(p_qtd int default 20)
returns table(ids bigint[], telefone text, nome text, produtos text, email text, modelo text, caminho text)
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
#variable_conflict use_column
declare cfg record;
begin
  select * into cfg from public.acesso_config where id = 1;
  -- quem estava "enviando" há mais de 10 min (função caiu no meio): volta para a fila
  update public.acesso_wpp set status = 'pendente', proxima_em = now() where status = 'enviando' and proxima_em < now() - interval '10 minutes';
  -- reembolso que chegou antes do envio
  update public.acesso_wpp a set status = 'cancelado' where a.status = 'pendente' and a.plataforma = 'greenn'
    and exists (select 1 from public.webhook_events w where w.sale_id = a.venda_id and w.status in ('refunded', 'chargedback'));
  return query
  with alvo as (
    select a.* from public.acesso_wpp a
    where a.status = 'pendente' and a.proxima_em <= now() and a.criado_em > now() - interval '3 days'
      and (coalesce(cfg.ativo, false) or right(a.telefone, 8) = cfg.tel_teste)
      and not exists (select 1 from public.wpp_optout o where public.tel8(o.telefone) = public.tel8(a.telefone))
    order by a.id
    for update skip locked
  ), grupos as (
    select array_agg(id order by id) as ids, max(telefone) as telefone, max(nome) as nome, max(email) as email, modelo,
           min(caminho) as caminho, array_agg(produto_nome order by id) as nomes
    from alvo group by public.tel8(telefone), modelo
    order by min(id) limit p_qtd
  ), marca as (
    update public.acesso_wpp a set status = 'enviando', proxima_em = now()
    from grupos g where a.id = any(g.ids) returning a.id
  )
  select g.ids, g.telefone, g.nome,
         public._lista_pt(g.nomes),
         g.email, g.modelo, g.caminho
  from grupos g where exists (select 1 from marca);
end $$;
revoke all on function public.acesso_fila(int) from public, anon, authenticated;
grant execute on function public.acesso_fila(int) to service_role;

-- 6) resultado do envio (com nova tentativa para erro temporário)
create or replace function public.acesso_resultado(p_ids bigint[], p_ok boolean, p_wamid text, p_erro text, p_temporario boolean)
returns void language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
begin
  if p_ok then
    update public.acesso_wpp set status = 'enviado', wamid = p_wamid, enviado_em = now(), erro = null where id = any(p_ids);
    insert into public.wpp_enviados (tipo, sale_id, email, telefone, status, meta_msg_id)
    select 'acesso_util', a.venda_id, a.email, a.telefone, 'enviado', p_wamid from public.acesso_wpp a where a.id = p_ids[1];
  elsif p_temporario then
    update public.acesso_wpp set tentativas = tentativas + 1, erro = left(p_erro, 300),
           status = case when tentativas + 1 >= 5 then 'falhou' else 'pendente' end,
           proxima_em = now() + (array[interval '5 minutes', interval '15 minutes', interval '1 hour', interval '3 hours', interval '6 hours'])[least(tentativas + 1, 5)]
    where id = any(p_ids);
  else
    update public.acesso_wpp set status = 'falhou', tentativas = tentativas + 1, erro = left(p_erro, 300) where id = any(p_ids);
  end if;
end $$;
revoke all on function public.acesso_resultado(bigint[], boolean, text, text, boolean) from public, anon, authenticated;
grant execute on function public.acesso_resultado(bigint[], boolean, text, text, boolean) to service_role;

-- 7) entregue / lido / falhou: o wa-inbound já chama camp_status_meta para todo status da Meta
create or replace function public.camp_status_meta(p_wamid text, p_status text, p_erro text)
returns void language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
begin
  update public.camp_envios e set
    status = case when p_status = 'read' then 'lido' when p_status = 'delivered' and e.status <> 'lido' then 'entregue' when p_status = 'failed' then 'falhou' else e.status end,
    custo = case when p_status in ('delivered','read') and e.custo = 0 then (select custo_msg from public.camp_config where id = e.campanha) else e.custo end,
    erro = coalesce(p_erro, e.erro), atualizado_em = now()
  where e.provider_id = p_wamid and e.canal = 'whatsapp';
  -- ACESSO_WPP
  update public.acesso_wpp a set
    status = case when p_status = 'read' then 'lido' when p_status = 'delivered' and a.status <> 'lido' then 'entregue' when p_status = 'failed' then 'falhou' else a.status end,
    entregue_em = case when p_status in ('delivered', 'read') then coalesce(a.entregue_em, now()) else a.entregue_em end,
    lido_em = case when p_status = 'read' then coalesce(a.lido_em, now()) else a.lido_em end,
    erro = coalesce(p_erro, a.erro)
  where a.wamid = p_wamid;
end $$;

-- 8) o fluxo antigo (n8n + acesso_liberado, categoria Marketing) deixa de mandar quando o novo estiver ligado
create or replace function public.acesso_pendentes()
returns table(sale_id text, email text, telefone text, nome text)
language sql security definer set search_path to 'public', 'pg_temp' as $function$
  select w.sale_id, lower(w.email) as email, w.telefone, initcap(split_part(w.email,'@',1)) as nome
  from public.webhook_events w
  where w.status = 'paid' and w.product_id = '195639' and w.telefone is not null
    and w.received_at > now() - interval '2 hours'
    and not exists (select 1 from public.wpp_enviados e where e.tipo = 'acesso' and e.sale_id = w.sale_id)
    and not exists (select 1 from public.wpp_optout o where o.telefone = w.telefone)
    and not coalesce((select ativo from public.acesso_config where id = 1), false)          -- novo fluxo ligado: o antigo para
  order by w.received_at asc limit 20;
$function$;

-- 9) chave do relógio que chama a função de envio
insert into public.integracao_chaves (nome, chave) values ('acesso_cron', encode(gen_random_bytes(18), 'hex')) on conflict (nome) do nothing;

select (select count(*) from acesso_produtos) as produtos, (select ativo from acesso_config) as ativo,
       pg_get_functiondef('public.kiwify_venda(text,text,text,text,text,text,text)'::regprocedure) like '%ACESSO_WPP%' as kiwify_ok;
