-- ============================================================
-- Base FL — 16) Número real de usuários (para mostrar no app)
--   Conta quantas pessoas diferentes têm pelo menos um produto ativo e em dia.
--   Devolve só o número: nenhum e-mail, nenhum nome.
--
-- Pode rodar mais de uma vez. Não apaga nada.
-- ============================================================
create or replace function public.pub_numeros() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('usuarios',
    (select count(distinct lower(email)) from public.licenses
      where status = 'active' and (expires_at is null or expires_at > now())));
$$;
revoke all on function public.pub_numeros() from public;
grant execute on function public.pub_numeros() to anon, authenticated;

select public.pub_numeros() as numero_de_hoje;
