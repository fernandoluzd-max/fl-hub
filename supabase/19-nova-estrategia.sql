-- Base FL — NOVA ESTRATÉGIA COMERCIAL
-- Cole no SQL Editor do Supabase e clique em Run. Pode rodar de novo sem problema.
-- Não apaga nada e não tira o acesso de ninguém.
--
-- O que muda:
--   1) Títulos Dinâmicos, Efeitos Sonoros e LUTs passam a ser VITALÍCIOS (não vencem).
--   2) A compra dos Títulos passa a liberar: Títulos + CaseUp + ChronoCut (bônus, 1 ano).
--      Efeitos Sonoros e LUTs deixam de vir junto: viram ofertas do checkout (cada uma libera só o seu).
--   3) Quem já comprou os Títulos ganha CaseUp e ChronoCut e continua com os Efeitos e os LUTs.

-- ---------- 1) vitalício por produto ----------
alter table public.packs add column if not exists vitalicio boolean not null default false;
update public.packs set vitalicio = true  where id in ('fl-legendas', 'fl-sons', 'fl-luts');
update public.packs set vitalicio = false where id not in ('fl-legendas', 'fl-sons', 'fl-luts');

-- toda licença de pack vitalício fica sem data de vencimento, venha de onde vier (Greenn ou liberação manual)
create or replace function public.licenca_vitalicia() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'active' and new.expires_at is not null
     and exists (select 1 from public.packs k where k.id = new.pack_id and k.vitalicio) then
    new.expires_at := null;
  end if;
  return new;
end $$;
revoke execute on function public.licenca_vitalicia() from public, anon, authenticated;
drop trigger if exists licenses_a_vitalicio on public.licenses;
create trigger licenses_a_vitalicio before insert or update on public.licenses
  for each row execute function public.licenca_vitalicia();

-- quem já tem: tira a data de vencimento (inclusive de quem já tinha vencido: a promessa era vitalício)
update public.compras  set validade = null
 where validade is not null and pack_id in (select id from public.packs where vitalicio);
update public.licenses set expires_at = null
 where expires_at is not null and status = 'active' and pack_id in (select id from public.packs where vitalicio);

-- ---------- 2) o que a compra dos Títulos libera ----------
update public.products set pack_ids = '{fl-legendas,fl-case,fl-timer}' where greenn_product_id = '195639';

-- ---------- 3) quem já comprou os Títulos: ganha os dois bônus (1 ano a partir de hoje) ----------
insert into public.licenses (email, pack_id, status, source, expires_at)
select l.email, b.pack_id, 'active', 'bonus', now() + interval '1 year'
  from public.licenses l cross join (values ('fl-case'), ('fl-timer')) as b(pack_id)
 where l.pack_id = 'fl-legendas' and l.status = 'active'
on conflict (email, pack_id) do nothing;      -- quem já tinha (comprado ou liberado na mão) fica como está

-- ---------- conferência: deve mostrar os produtos e o que cada um libera ----------
select p.greenn_product_id as produto_greenn, p.name as nome, p.pack_ids as libera,
       (select string_agg(k.id, ', ') from public.packs k where k.id = any(p.pack_ids) and k.vitalicio) as vitalicios
  from public.products p order by p.name;

-- ============================================================
-- PARA DESFAZER (só se precisar voltar atrás). Tire os dois traços do começo e rode:
-- update public.products set pack_ids = '{fl-legendas,fl-sons,fl-luts}' where greenn_product_id = '195639';
-- update public.packs set vitalicio = false;
-- (os bônus já dados e as licenças sem vencimento ficam como estão: ninguém perde acesso)
-- ============================================================
