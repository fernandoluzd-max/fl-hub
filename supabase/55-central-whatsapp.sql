-- 55 · Central de cliques do WhatsApp (basefl.com/central/)
-- Lê só o que já é gravado de verdade: camp_envios (mensagens), camp_cliques (abriu / testar / comprar / pediu áudio)
-- e webhook_events (compras do Mood). Não envia nada. Só quem está em central_acesso consegue ler.

-- 1) quem pode ver a central
create table if not exists public.central_acesso (email text primary key, criado_em timestamptz not null default now());
alter table public.central_acesso enable row level security;   -- sem políticas: ninguém lê pela API
insert into public.central_acesso (email) values ('fernandoluzd@gmail.com') on conflict do nothing;

-- 2) índices para a central abrir rápido
create index if not exists camp_cliques_criado on public.camp_cliques (criado_em);
create index if not exists camp_cliques_contato on public.camp_cliques (contato_id);
create index if not exists camp_envios_criado on public.camp_envios (criado_em);

-- 3) "Manda o áudio": o wa-inbound já chama esta função a cada toque (antes ela não existia e o toque se perdia)
create or replace function public.camp_resposta_wpp(p_telefone text, p_resposta text)
returns void language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare v_id bigint; v_camp text;
begin
  if p_resposta is distinct from 'quero_testar' or p_telefone is null then return; end if;
  select k.id, k.campanha into v_id, v_camp
  from public.camp_contatos k
  join public.camp_envios e on e.contato_id = k.id and e.canal = 'whatsapp' and e.etapa = 1
  where public.tel8(k.telefone) = public.tel8(p_telefone)
  order by e.criado_em desc limit 1;
  if v_id is null then return; end if;
  if exists (select 1 from public.camp_cliques c where c.contato_id = v_id and c.origem = 'whatsapp-audio'
             and c.criado_em > now() - interval '2 minutes') then return; end if;   -- a Meta às vezes repete o aviso
  insert into public.camp_cliques (campanha, contato_id, origem) values (v_camp, v_id, 'whatsapp-audio');
end $$;
revoke all on function public.camp_resposta_wpp(text, text) from public, anon, authenticated;
grant execute on function public.camp_resposta_wpp(text, text) to service_role;

-- 4) os números da central
create or replace function public.central_wpp(p_de timestamptz, p_ate timestamptz, p_testes boolean default false)
returns jsonb language plpgsql stable security definer set search_path to 'public', 'pg_temp' as $$
declare v_email text := lower(coalesce(auth.jwt() ->> 'email', '')); v_passo text; v_out jsonb;
begin
  if not exists (select 1 from public.central_acesso a where a.email = v_email) then
    raise exception 'sem_acesso' using errcode = '42501';
  end if;
  if p_de is null or p_ate is null or p_ate <= p_de then raise exception 'periodo_invalido'; end if;
  if p_ate - p_de > interval '400 days' then p_de := p_ate - interval '400 days'; end if;
  v_passo := case when p_ate - p_de <= interval '50 hours' then 'hour' else 'day' end;

  with
  ev as (
    select c.criado_em as em, replace(c.origem, 'whatsapp-', '') as tipo, c.contato_id,
           case when k.wpp_onda = 99 then 'Pós-compra Títulos (30 min)'
                when k.wpp_onda between 1 and 98 then 'Alunos · onda ' || k.wpp_onda
                else coalesce(c.campanha, 'Sem campanha') end as camp,
           k.nome, k.telefone, k.email
    from public.camp_cliques c
    left join public.camp_contatos k on k.id = c.contato_id
    where c.origem in ('whatsapp-audio', 'whatsapp-abriu', 'whatsapp-teste', 'whatsapp-checkout')
      and c.criado_em >= p_de and c.criado_em < p_ate
      and (p_testes or k.id is null or not (coalesce(k.teste, false) or k.segmento = 'T'))
  ),
  env as (
    select case when k.wpp_onda = 99 then 'Pós-compra Títulos (30 min)'
                when k.wpp_onda between 1 and 98 then 'Alunos · onda ' || k.wpp_onda
                else e.campanha end as camp,
           e.status
    from public.camp_envios e join public.camp_contatos k on k.id = e.contato_id
    where e.canal = 'whatsapp' and e.etapa = 1 and e.criado_em >= p_de and e.criado_em < p_ate
      and e.status in ('enviado', 'entregue', 'lido')
      and (p_testes or not (coalesce(k.teste, false) or k.segmento = 'T'))
  ),
  pess as (
    select contato_id, camp, max(email) as email, min(em) as primeiro,
           bool_or(tipo = 'audio') as au, bool_or(tipo = 'abriu') as ab,
           bool_or(tipo = 'teste') as te, bool_or(tipo = 'checkout') as ck
    from ev where contato_id is not null group by contato_id, camp
  ),
  comp as (
    select p.contato_id, p.camp from pess p
    where (p.ab or p.te or p.ck) and p.email is not null and exists (
      select 1 from public.webhook_events w
      where lower(w.email) = lower(p.email) and w.product_id = '195947' and w.status = 'paid' and w.received_at >= p.primeiro)
  ),
  camps as (select camp from env union select camp from pess)
  select jsonb_build_object(
    'passo', v_passo,
    'agora', now(),
    'kpi', jsonb_build_object(
      'enviados',  (select count(*) from env),
      'lidos',     (select count(*) from env where status = 'lido'),
      'audio',     (select count(*) from pess where au),
      'aberturas', (select count(*) from ev where tipo = 'abriu'),
      'visitantes',(select count(*) from pess where ab),
      'teste',     (select count(*) from pess where te),
      'checkout',  (select count(*) from pess where ck),
      'ambos',     (select count(*) from pess where te and ck),
      'nenhum',    (select count(*) from pess where ab and not te and not ck),
      'teste_ab',    (select count(*) from pess where ab and te),
      'checkout_ab', (select count(*) from pess where ab and ck),
      'escolheram',  (select count(*) from pess where ab and (te or ck)),
      'cliques_teste',    (select count(*) from ev where tipo = 'teste'),
      'cliques_checkout', (select count(*) from ev where tipo = 'checkout'),
      'compras',   (select count(*) from comp)),
    'serie', coalesce((select jsonb_agg(jsonb_build_object('b', b, 't', tipo, 'n', n) order by b) from (
        select to_char(date_trunc(v_passo, em at time zone 'America/Sao_Paulo'), 'YYYY-MM-DD"T"HH24:00') as b, tipo, count(*) as n
        from ev group by 1, 2) s), '[]'::jsonb),
    'horas', coalesce((select jsonb_agg(jsonb_build_object('h', h, 'n', n) order by h) from (
        select extract(hour from em at time zone 'America/Sao_Paulo')::int as h, count(*) as n
        from ev where tipo in ('abriu', 'teste', 'checkout') group by 1) s), '[]'::jsonb),
    'campanhas', coalesce((select jsonb_agg(x order by (x ->> 'visitantes')::int desc, (x ->> 'enviados')::int desc) from (
        select jsonb_build_object('camp', c.camp,
          'enviados',   (select count(*) from env where env.camp = c.camp),
          'audio',      (select count(*) from pess p where p.camp = c.camp and p.au),
          'visitantes', (select count(*) from pess p where p.camp = c.camp and p.ab),
          'teste',      (select count(*) from pess p where p.camp = c.camp and p.te),
          'checkout',   (select count(*) from pess p where p.camp = c.camp and p.ck),
          'nenhum',     (select count(*) from pess p where p.camp = c.camp and p.ab and not p.te and not p.ck),
          'escolheram', (select count(*) from pess p where p.camp = c.camp and p.ab and (p.te or p.ck)),
          'compras',    (select count(*) from comp where comp.camp = c.camp)) as x
        from camps c) s), '[]'::jsonb),
    'recentes', coalesce((select jsonb_agg(jsonb_build_object('em', em, 't', tipo, 'camp', camp,
          'quem', nullif(trim(split_part(coalesce(nome, ''), ' ', 1) || ' ' || coalesce('· ' || right(telefone, 4), '')), '')) order by em desc)
        from (select * from ev order by em desc limit 60) r), '[]'::jsonb)
  ) into v_out;
  return v_out;
end $$;
revoke all on function public.central_wpp(timestamptz, timestamptz, boolean) from public, anon;
grant execute on function public.central_wpp(timestamptz, timestamptz, boolean) to authenticated;

-- 5) conferência (simula o seu login só dentro desta consulta)
select set_config('request.jwt.claims', '{"email":"fernandoluzd@gmail.com"}', true);
select public.central_wpp(now() - interval '1 day', now(), true) -> 'kpi' as kpi_com_testes;
