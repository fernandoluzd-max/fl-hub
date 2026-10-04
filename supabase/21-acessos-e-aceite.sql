-- Base FL — acessos, reembolso do pacote antigo e aceite das condições de uso
-- Cole no SQL Editor do Supabase e clique em Run. Pode rodar de novo sem problema.
-- Não apaga nada e não tira o acesso de ninguém que esteja em dia.

-- ------------------------------------------------------------
-- 1) Reembolso do pacote antigo dos Títulos
--    Antes da nova estratégia, quem comprava os Títulos recebia junto os Efeitos Sonoros e os LUTs.
--    Essas licenças ficam marcadas como "pacote-titulos": se a compra dos Títulos for devolvida, elas caem junto.
--    (Efeitos e LUTs comprados à parte, pelo order bump, NÃO entram nisso: cada um é uma compra própria.)
-- ------------------------------------------------------------
update public.licenses l set source = 'pacote-titulos'
 where l.pack_id in ('fl-sons', 'fl-luts') and l.source in ('greenn', 'bonus')
   and exists (select 1 from public.licenses t where t.email = l.email and t.pack_id = 'fl-legendas'
               and coalesce(t.sale_id, '') <> '' and t.sale_id = l.sale_id);

create or replace function public.licenca_pacote_antigo() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- os Títulos foram bloqueados (reembolso, chargeback, cancelamento ou bloqueio manual): o que veio junto no pacote antigo cai também
  update public.licenses set status = 'revoked'
   where email = new.email and status = 'active' and source = 'pacote-titulos';
  return null;
end $$;
revoke execute on function public.licenca_pacote_antigo() from public, anon, authenticated;
drop trigger if exists licenses_zz_pacote_antigo on public.licenses;
create trigger licenses_zz_pacote_antigo after update on public.licenses
  for each row when (new.pack_id = 'fl-legendas' and old.status = 'active' and new.status = 'revoked')
  execute function public.licenca_pacote_antigo();

-- ------------------------------------------------------------
-- 2) Aceite das condições de uso, antes de instalar
--    Guarda quem aceitou, o quê, quando e qual versão do texto. Só registra para quem tem a licença do produto.
-- ------------------------------------------------------------
create table if not exists public.aceites (
  user_id   uuid        not null,
  email     text        not null,
  pack_id   text        not null,
  versao    text        not null,            -- versão do texto das condições (muda quando o texto mudar de verdade)
  app       text,                            -- versão do app em que o aceite foi dado
  aceito_em timestamptz not null default now(),
  primary key (user_id, pack_id, versao)
);
alter table public.aceites enable row level security;
revoke all on public.aceites from anon, authenticated;
grant select on public.aceites to authenticated;
drop policy if exists "meus aceites" on public.aceites;
create policy "meus aceites" on public.aceites for select to authenticated using (user_id = auth.uid());

create or replace function public.aceite_registrar(p_pack text, p_versao text, p_app text default null) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_email text;
begin
  if v_uid is null then raise exception 'Entre na sua conta.' using errcode = '28000'; end if;
  if coalesce(btrim(p_versao), '') = '' or length(p_versao) > 20 then raise exception 'Versão inválida.' using errcode = '22023'; end if;
  if not public._tem(v_uid, p_pack) then raise exception 'Este produto não está liberado nesta conta.' using errcode = '42501'; end if;
  select lower(email) into v_email from auth.users where id = v_uid;
  insert into public.aceites (user_id, email, pack_id, versao, app) values (v_uid, v_email, p_pack, p_versao, left(p_app, 20))
  on conflict (user_id, pack_id, versao) do nothing;
  return true;
end $$;
-- quais produtos esta conta já aceitou, nesta versão do texto
create or replace function public.aceites_meus(p_versao text) returns text[]
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(array_agg(pack_id), '{}') from public.aceites where user_id = auth.uid() and versao = p_versao;
$$;
revoke execute on function public.aceite_registrar(text, text, text), public.aceites_meus(text) from public, anon;
grant execute on function public.aceite_registrar(text, text, text), public.aceites_meus(text) to authenticated;

-- conferência: quantas licenças vieram do pacote antigo dos Títulos
select count(*) as licencas_do_pacote_antigo from public.licenses where source = 'pacote-titulos';
