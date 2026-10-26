-- 62 · Central: balanço do WhatsApp (custo x vendas): conversão, custo por venda e retorno, por disparo e total
-- Venda atribuída = compra paga na Greenn, com o mesmo e-mail, em até 7 dias depois da mensagem,
-- do produto que aquele disparo oferece (Mood, Títulos, Kit) ou de qualquer produto nas recuperações.
-- Faturamento = preço de tabela do produto (sem taxa da Greenn e sem imposto). Mensagens de teste não contam venda.

create or replace function public._preco_tabela(p_produto text) returns numeric language sql immutable as $$
  select case p_produto
    when '195947' then 79 when '195639' then 47 when '195949' then 97
    when '195814' then 17 when '195812' then 17 when '198176' then 17
    when '195820' then 47 when '195819' then 47 when '195822' then 67
    else 0 end::numeric $$;

drop function if exists public._wpp_balanco(timestamptz, timestamptz);
create or replace function public._wpp_balanco(p_de timestamptz, p_ate timestamptz)
returns table(disparo text, mensagens bigint, custo numeric, vendas bigint, faturamento numeric, compradores bigint)
language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  with cfg as (select (select valor from central_config where chave = 'dolar') dol,
                      (select valor from central_config where chave = 'usd_marketing') mk,
                      (select valor from central_config where chave = 'usd_utilidade') ut),
  m as (select w.*, case when w.categoria = 'marketing' then cfg.mk else cfg.ut end * cfg.dol as brl,
               case when w.disparo like 'Mood%' then '195947'
                    when w.disparo = 'Reels Academy → Títulos' then '195639'
                    when w.disparo = 'Kit Freelancer (perfil)' then '195949'
                    when w.disparo like 'Recuperação%' then '*'
                    else null end as alvo
        from wpp_cobradas w, cfg where w.em >= p_de and w.em < p_ate),
  v as (select distinct m.disparo, e.id as venda, _preco_tabela(e.product_id) as preco, lower(e.email) as comprador
        from m join webhook_events e on lower(e.email) = lower(m.email) and e.status = 'paid'
             and e.received_at >= m.em and e.received_at < m.em + interval '7 days'
             and (m.alvo = '*' or e.product_id = m.alvo)
        where not m.teste and m.alvo is not null and m.email is not null)
  select m.disparo, count(*), round(sum(m.brl), 2),
         coalesce((select count(*) from v where v.disparo = m.disparo), 0),
         coalesce((select sum(preco) from v where v.disparo = m.disparo), 0),
         coalesce((select count(distinct comprador) from v where v.disparo = m.disparo), 0)
  from m group by m.disparo
  union all
  -- linha de total: cada venda conta uma vez só, mesmo que mais de um disparo tenha falado com a pessoa
  select '__total__', count(*), round(sum(m.brl), 2),
         (select count(distinct venda) from v), coalesce((select sum(preco) from (select distinct venda, preco from v) x), 0),
         (select count(distinct comprador) from v)
  from m $$;
revoke all on function public._wpp_balanco(timestamptz, timestamptz) from public, anon, authenticated;

create or replace function public.central_balanco(p_de timestamptz, p_ate timestamptz) returns jsonb
language plpgsql stable security definer set search_path to 'public', 'pg_temp' as $$
begin
  if not exists (select 1 from public.central_acesso a where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))) then
    raise exception 'sem_acesso' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'periodo', coalesce((select jsonb_agg(to_jsonb(b) order by b.custo desc) from public._wpp_balanco(p_de, p_ate) b), '[]'),
    'total', coalesce((select jsonb_agg(to_jsonb(b) order by b.custo desc) from public._wpp_balanco('2000-01-01', now() + interval '1 day') b), '[]'));
end $$;
revoke all on function public.central_balanco(timestamptz, timestamptz) from public, anon;
grant execute on function public.central_balanco(timestamptz, timestamptz) to authenticated;

select 'ok' as central_balanco;
