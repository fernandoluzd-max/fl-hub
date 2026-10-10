-- ============================================================
-- 36 — MOSTRAR A SATISFAÇÃO NO APP (nota real + comentários que você escolher)
-- A nota é a MÉDIA REAL (não é forçada). Só aparecem os comentários que você marcar como destaque.
-- Rode este arquivo uma vez.
-- ============================================================

-- marca quais comentários podem aparecer no app, e um nome curto opcional pra exibir
alter table public.avaliacoes add column if not exists destaque boolean not null default false;
alter table public.avaliacoes add column if not exists nome_publico text;

-- o app lê isto (média real + total + os comentários em destaque). Não expõe e-mail.
create or replace function public.aval_publico(p_limite int default 6) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'media', (select round(avg(nota)::numeric, 1) from public.avaliacoes),
    'total', (select count(*) from public.avaliacoes),
    'comentarios', coalesce((
      select jsonb_agg(jsonb_build_object('nota', q.nota, 'texto', left(q.comentario, 240), 'nome', q.nome_publico))
      from (
        select nota, comentario, nome_publico, criado_em
        from public.avaliacoes
        where destaque = true and comentario is not null and btrim(comentario) <> ''
        order by criado_em desc
        limit greatest(1, least(p_limite, 20))
      ) q
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.aval_publico(int) from public;
grant execute on function public.aval_publico(int) to anon, authenticated;

-- ============================================================
-- COMO ESCOLHER OS COMENTÁRIOS QUE APARECEM
-- 1) Veja as avaliações: Table Editor -> avaliacoes  (ou no SQL Editor:)
--    select id, nota, comentario, criado_em from public.avaliacoes where comentario is not null order by criado_em desc;
-- 2) Marque os que você quer mostrar (troque os id):
--    update public.avaliacoes set destaque = true, nome_publico = 'Ana' where id = 3;
-- 3) Pra tirar um do app:
--    update public.avaliacoes set destaque = false where id = 3;
-- (a nota/estrelas que aparece no app é sempre a média real de todas as avaliações.)
-- ============================================================
