-- ============================================================
-- 35 — AVALIAÇÕES DO APP (carinhas)
-- A pessoa dá uma nota (1 a 5) e um comentário opcional. Fica guardado para você ver.
-- Ninguém lê as avaliações pela API (nem a própria pessoa): só você, aqui no SQL Editor / Table Editor.
-- Rode este arquivo inteiro uma vez.
-- ============================================================

create table if not exists public.avaliacoes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  email      text not null,
  nota       smallint not null check (nota between 1 and 5),
  comentario text,
  app        text,
  criado_em  timestamptz not null default now()
);
create index if not exists avaliacoes_criado on public.avaliacoes (criado_em desc);
create index if not exists avaliacoes_nota on public.avaliacoes (nota);

alter table public.avaliacoes enable row level security;
revoke all on public.avaliacoes from anon, authenticated;   -- fechado: só o dono (service role) lê

-- a pessoa grava a avaliação por esta função (não escreve direto na tabela)
create or replace function public.aval_registrar(p_nota int, p_comentario text default null, p_app text default null) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_email text;
begin
  if v_uid is null then raise exception 'Entre na sua conta.' using errcode = '28000'; end if;
  if p_nota is null or p_nota < 1 or p_nota > 5 then raise exception 'Nota inválida.' using errcode = '22023'; end if;
  select lower(email) into v_email from auth.users where id = v_uid;
  insert into public.avaliacoes (user_id, email, nota, comentario, app)
    values (v_uid, v_email, p_nota, nullif(btrim(left(coalesce(p_comentario, ''), 1000)), ''), left(p_app, 20));
  return true;
end $$;
revoke execute on function public.aval_registrar(int, text, text) from public, anon;
grant execute on function public.aval_registrar(int, text, text) to authenticated;

-- ============================================================
-- PAINEL — rode qualquer uma destas consultas quando quiser ver as notas:
-- ============================================================

-- 1) Resumo: média geral e total
--    select round(avg(nota), 2) as media, count(*) as total from public.avaliacoes;

-- 2) Quantas de cada nota (5 = Excelente ... 1 = Péssimo)
--    select nota, count(*) as qtd from public.avaliacoes group by nota order by nota desc;

-- 3) Últimas 50 avaliações com comentário
--    select criado_em, nota, email, comentario, app
--    from public.avaliacoes order by criado_em desc limit 50;

-- 4) Só as notas baixas (1 e 2) com comentário — as que pedem atenção
--    select criado_em, nota, email, comentario from public.avaliacoes
--    where nota <= 2 order by criado_em desc;
