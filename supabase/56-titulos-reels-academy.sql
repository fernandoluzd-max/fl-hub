-- 56 · Reels Academy (Kiwify) -> 30 min depois, WhatsApp oferecendo os Títulos Dinâmicos
-- Não envia nada sozinho: só enfileira. O envio sai pelo mesmo relógio do camp (a cada 5 min),
-- das 8h às 22h59, no máximo 40 por dia, 1 vez por pessoa, nunca para quem já tem os Títulos ou pediu para sair.

-- 1) campanha
insert into public.camp_config (id, pausado, wpp_pos_compra)
values ('titulos_ra', false, true)
on conflict (id) do nothing;

-- 2) chave secreta do webhook da Kiwify (fica só no banco; ninguém lê pela API)
create table if not exists public.integracao_chaves (nome text primary key, chave text not null, criado_em timestamptz not null default now());
alter table public.integracao_chaves enable row level security;
insert into public.integracao_chaves (nome, chave)
values ('kiwify', encode(gen_random_bytes(18), 'hex'))
on conflict (nome) do nothing;

-- 3) registro mínimo do que a Kiwify mandou (sem dado pessoal), para não processar a mesma venda duas vezes
create table if not exists public.kiwify_eventos (
  id bigint generated always as identity primary key,
  recebido_em timestamptz not null default now(),
  pedido text not null, status text, produto text, resultado text,
  unique (pedido, status));
alter table public.kiwify_eventos enable row level security;

-- 4) a função que o webhook chama
create or replace function public.kiwify_venda(p_chave text, p_pedido text, p_status text, p_produto text,
                                               p_email text, p_telefone text, p_nome text)
returns text language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare tel text; v_res text;
begin
  if p_chave is null or not exists (select 1 from public.integracao_chaves where nome = 'kiwify' and chave = p_chave) then
    return 'chave_invalida';
  end if;
  if p_pedido is null then return 'sem_pedido'; end if;
  begin
    insert into public.kiwify_eventos (pedido, status, produto) values (p_pedido, p_status, left(p_produto, 120));
  exception when unique_violation then return 'repetido'; end;

  if coalesce(p_produto, '') !~* 'reels\s*academy' then v_res := 'outro_produto';
  elsif p_status in ('refunded', 'chargedback') then
    update public.camp_contatos set excluido = now()
    where campanha = 'titulos_ra' and lower(email) = lower(p_email) and excluido is null;
    v_res := 'reembolso';
  elsif p_status = 'paid' then
    tel := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
    if tel ~ '^\d{10,11}$' then tel := '55' || tel; end if;
    if tel !~ '^55\d{10,11}$' or p_email is null then v_res := 'sem_telefone_br';
    else
      insert into public.camp_contatos (campanha, email, telefone, nome, segmento, lote, token, wpp_onda, wpp_liberar_em, optin_origem)
      values ('titulos_ra', lower(p_email), tel, left(p_nome, 80), 'RA', -3, substr(md5(random()::text || clock_timestamp()::text), 1, 18),
              99, now() + interval '30 minutes', 'kiwify-reels-academy')
      on conflict (campanha, email) do nothing;
      v_res := 'na_fila';
    end if;
  else v_res := 'ignorado';
  end if;
  update public.kiwify_eventos set resultado = v_res where pedido = p_pedido and status is not distinct from p_status;
  return v_res;
end $$;
revoke all on function public.kiwify_venda(text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.kiwify_venda(text, text, text, text, text, text, text) to service_role;

-- 5) fila própria (não mexe na fila do Mood)
create or replace function public.camp_fila_titulos(p_qtd int)
returns table(envio_id bigint, telefone text, nome text)
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
#variable_conflict use_column
declare hora int; hoje int;
begin
  if not exists (select 1 from public.camp_config c where c.id = 'titulos_ra' and not coalesce(c.pausado, false) and coalesce(c.wpp_pos_compra, false)) then return; end if;
  hora := extract(hour from now() at time zone 'America/Sao_Paulo');
  if hora not between 8 and 22 then return; end if;                                   -- 08h00 até 22h59
  select count(*) into hoje from public.camp_envios e
  where e.campanha = 'titulos_ra' and e.canal = 'whatsapp' and e.etapa = 1
    and (e.criado_em at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date;
  if hoje >= 40 then return; end if;                                                  -- teto de 40 por dia
  return query
  with alvo as (
    select k.id, k.telefone, k.nome from public.camp_contatos k
    where k.campanha = 'titulos_ra' and k.wpp_onda = 99 and k.wpp_liberar_em <= now()
      and (not k.teste or k.segmento = 'T')
      and k.excluido is null and not k.optout and not k.comprou
      and k.telefone ~ '^55\d{10,11}$'
      and not exists (select 1 from public.wpp_optout o where public.tel8(o.telefone) = public.tel8(k.telefone))
      and not exists (select 1 from public.webhook_events w where w.product_id = '195639' and w.status = 'paid'
                      and (lower(w.email) = lower(k.email) or public.tel8(w.telefone) = public.tel8(k.telefone)))
      and not exists (select 1 from public.camp_envios e where e.contato_id = k.id and e.canal = 'whatsapp' and e.etapa = 1)
      and (k.segmento = 'T' or not exists (select 1 from public.camp_envios e join public.camp_contatos k2 on k2.id = e.contato_id
                      where e.campanha = 'titulos_ra' and e.canal = 'whatsapp' and e.etapa = 1 and public.tel8(k2.telefone) = public.tel8(k.telefone)))
    order by k.wpp_liberar_em, k.id
    limit least(p_qtd, 40 - hoje)
    for update of k skip locked
  ), ins as (
    insert into public.camp_envios (campanha, contato_id, canal, etapa, variante, status)
    select 'titulos_ra', a.id, 'whatsapp', 1, 'texto', 'reservado' from alvo a
    on conflict do nothing
    returning id, contato_id
  )
  select ins.id, a.telefone, a.nome from ins join alvo a on a.id = ins.contato_id;
end $$;
revoke all on function public.camp_fila_titulos(int) from public, anon, authenticated;
grant execute on function public.camp_fila_titulos(int) to service_role;

-- 6) central: nome do disparo e compra certa (Títulos = 195639)
do $x$
declare d text;
begin
  select pg_get_functiondef('public.central_wpp(timestamptz,timestamptz,boolean)'::regprocedure) into d;
  if position('Reels Academy' in d) = 0 then
    d := replace(d, 'case when k.wpp_onda = 99 then', 'case when k.campanha = ''titulos_ra'' then ''Reels Academy → Títulos'' when k.wpp_onda = 99 then');
    d := replace(d, 'w.product_id = ''195947''', 'w.product_id = (case when p.camp = ''Reels Academy → Títulos'' then ''195639'' else ''195947'' end)');
    execute d;
  end if;
end $x$;

select (select count(*) from camp_config where id = 'titulos_ra') as campanha,
       (select count(*) from integracao_chaves where nome = 'kiwify') as chave,
       pg_get_functiondef('public.central_wpp(timestamptz,timestamptz,boolean)'::regprocedure) like '%Reels Academy%' as central_ok;
