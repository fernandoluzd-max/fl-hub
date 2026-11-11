-- ============================================================
-- 70 · LISTAS PARA O GERENCIADOR DE ANÚNCIOS (público personalizado de clientes)
-- Separa a sua base em listas prontas para subir na Meta como "Lista de clientes".
-- Só LÊ o banco. Não envia nada. A função fica fechada: só roda pelo SQL Editor
-- (ninguém consegue chamar pelo site ou pela API).
--
-- Como usar (SQL Editor → Run → botão Export → Download CSV):
--   select * from public.lista_anuncios('quente');
--   select * from public.lista_anuncios('morna');
--   select * from public.lista_anuncios('fria');
--   select * from public.lista_anuncios('clientes');            -- todos os clientes ativos (bom para excluir nos anúncios)
--   select * from public.lista_anuncios('sem', 'fl-assets');    -- recompra: clientes que AINDA NÃO têm esse pack
--   select * from public.lista_anuncios('com', 'fl-legendas');  -- quem tem esse pack
--   select * from public.lista_anuncios_resumo();               -- quantas pessoas tem em cada lista
--
-- O que é cada lista:
--   quente   = clientes que compraram nos últimos 90 dias
--   morna    = clientes que compraram há mais de 90 dias
--              + quem gerou Pix/boleto ou abandonou o checkout nos últimos 60 dias e não comprou
--   fria     = quem chegou perto e nunca comprou: abandonou o checkout há mais de 60 dias,
--              deixou o contato num formulário (leads) ou criou conta no app sem comprar
--   Ninguém que pediu reembolso ou chargeback entra nas listas.
--
-- Colunas no formato que a Meta reconhece sozinha: email, phone, fn, country.
-- ============================================================

create or replace function public.lista_anuncios(p_lista text, p_pack text default null)
returns table (email text, phone text, fn text, country text)
language sql stable security definer set search_path = public, auth as $$
with
-- quem pediu reembolso / chargeback em algum momento: fica fora de tudo
reembolso as (
  select distinct lower(w.email) as email from public.webhook_events w
  where w.status in ('refunded', 'chargedback') and coalesce(w.email, '') <> ''
),
-- clientes com acesso ativo
ativos as (
  select distinct lower(l.email) as email from public.licenses l
  where l.status = 'active' and (l.expires_at is null or l.expires_at > now())
),
-- data da última compra de cada cliente (Greenn pelo webhook + todas as vendas registradas no aviso de acesso)
ultima as (
  select email, max(em) as em from (
    select lower(w.email) as email, w.received_at as em from public.webhook_events w
      where w.status = 'paid' and coalesce(w.email, '') <> ''
    union all
    select lower(a.email), a.criado_em from public.acesso_wpp a
      where a.status <> 'cancelado' and coalesce(a.email, '') <> ''
  ) x group by email
),
-- quase compraram: Pix/boleto gerado ou checkout abandonado
quase as (
  select lower(w.email) as email, max(w.received_at) as em from public.webhook_events w
  where coalesce(w.email, '') <> ''
    and (w.status = 'waiting_payment' or w.event ilike '%abandon%')
  group by 1
),
-- telefone e nome que já temos de cada e-mail
contato as (
  select distinct on (email) email, tel, nome from (
    select lower(a.email) as email, public._tel_br(a.telefone) as tel, a.nome, a.criado_em as em, 1 as pri
      from public.acesso_wpp a where coalesce(a.email, '') <> ''
    union all
    select lower(u.email), public._tel_br(p.whatsapp), nullif(p.nome, ''), p.atualizado_em, 2
      from public.perfis p join auth.users u on u.id = p.user_id where coalesce(u.email, '') <> ''
    union all
    select lower(l.email), public._tel_br(l.celular), l.nome, l.atualizado_em, 3
      from public.leads l
  ) c
  order by email, (tel is null), pri, em desc
),
-- quem tem / não tem um pack específico (para recompra)
com_pack as (
  select distinct lower(l.email) as email from public.licenses l
  where l.pack_id = p_pack and l.status = 'active' and (l.expires_at is null or l.expires_at > now())
),
alvo as (
  select a.email from ativos a join ultima u using (email)
    where lower(p_lista) = 'quente' and u.em >= now() - interval '90 days'
  union
  select a.email from ativos a left join ultima u using (email)
    where lower(p_lista) = 'morna' and (u.em is null or u.em < now() - interval '90 days')
  union
  select q.email from quase q
    where lower(p_lista) = 'morna' and q.em >= now() - interval '60 days' and q.email not in (select email from ativos)
  union
  select q.email from quase q
    where lower(p_lista) = 'fria' and q.em < now() - interval '60 days' and q.email not in (select email from ativos)
  union
  select lower(l.email) from public.leads l
    where lower(p_lista) = 'fria' and lower(l.email) not in (select email from ativos)
  union
  select lower(u.email) from public.perfis p join auth.users u on u.id = p.user_id
    where lower(p_lista) = 'fria' and coalesce(u.email, '') <> '' and lower(u.email) not in (select email from ativos)
  union
  select a.email from ativos a where lower(p_lista) = 'clientes'
  union
  select c.email from com_pack c where lower(p_lista) = 'com'
  union
  select a.email from ativos a where lower(p_lista) = 'sem' and p_pack is not null and a.email not in (select email from com_pack)
)
select t.email,
       c.tel as phone,
       nullif(lower(split_part(btrim(coalesce(c.nome, '')), ' ', 1)), '') as fn,
       'br' as country
from alvo t
left join contato c using (email)
where t.email ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'
  and t.email not in (select email from reembolso)
order by t.email;
$$;

revoke all on function public.lista_anuncios(text, text) from public, anon, authenticated;

create or replace function public.lista_anuncios_resumo()
returns table (lista text, pessoas bigint, com_telefone bigint)
language sql stable security definer set search_path = public as $$
  select l, count(*), count(phone)
  from unnest(array['quente', 'morna', 'fria', 'clientes']) as l
  cross join lateral public.lista_anuncios(l) x
  group by l
  order by array_position(array['quente', 'morna', 'fria', 'clientes'], l);
$$;

revoke all on function public.lista_anuncios_resumo() from public, anon, authenticated;
