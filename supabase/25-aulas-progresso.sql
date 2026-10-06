-- ============================================================
-- 25 · Aulas com módulos, progresso salvo e XP (padrão de todo o Base FL)
-- ------------------------------------------------------------
-- 1) A tabela "aulas" ganha: módulo (nome, texto e ordem) e XP por aula.
-- 2) Tabela nova "aulas_progresso": quais aulas cada pessoa concluiu.
--    Fica salvo na conta: vale no computador, no celular e no site.
-- 3) As 5 aulas dos Títulos Dinâmicos, em 2 módulos.
-- Pode rodar mais de uma vez: não duplica nem apaga nada.
--
-- PARA TROCAR NOME OU TEXTO DE UMA AULA: Supabase › Table Editor › aulas.
-- ============================================================

alter table public.aulas add column if not exists modulo        text;                     -- nome do módulo (vazio = aula solta)
alter table public.aulas add column if not exists modulo_desc   text;                     -- uma frase sobre o módulo (basta estar na 1ª aula dele)
alter table public.aulas add column if not exists modulo_ordem  int  not null default 1;  -- ordem do módulo dentro do produto
alter table public.aulas add column if not exists xp            int  not null default 10; -- pontos ao concluir a aula

create table if not exists public.aulas_progresso (
  user_id      uuid   not null references auth.users(id) on delete cascade,
  aula_id      bigint not null references public.aulas(id) on delete cascade,
  concluida_em timestamptz not null default now(),
  primary key (user_id, aula_id)
);
alter table public.aulas_progresso enable row level security;
revoke all on public.aulas_progresso from anon, authenticated;
grant select on public.aulas_progresso to authenticated;
grant all on public.aulas_progresso to service_role;
drop policy if exists "meu progresso" on public.aulas_progresso;
create policy "meu progresso" on public.aulas_progresso for select to authenticated using (user_id = auth.uid());

-- marca (ou desmarca) uma aula como concluída. Só vale para aula que a pessoa pode assistir.
create or replace function public.aula_concluir(p_aula bigint, p_feita boolean default true) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); a public.aulas;
begin
  if v_uid is null then raise exception 'Entre na sua conta para continuar.' using errcode = '28000'; end if;
  select * into a from public.aulas where id = p_aula and ativo;
  if not found or (a.so_cliente and not public.tem_licenca(a.pack_id)) then
    raise exception 'Esta aula não está liberada para a sua conta.' using errcode = '42501';
  end if;
  if coalesce(p_feita, true) then
    insert into public.aulas_progresso (user_id, aula_id) values (v_uid, p_aula) on conflict do nothing;
  else
    delete from public.aulas_progresso where user_id = v_uid and aula_id = p_aula;
  end if;
  return public.aulas_meu_progresso();
end $$;

-- o que a pessoa já concluiu + o XP somado (só conta aula que ainda existe e está ativa)
create or replace function public.aulas_meu_progresso() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'feitas', coalesce(jsonb_agg(p.aula_id order by p.concluida_em), '[]'::jsonb),
    'xp', coalesce(sum(a.xp), 0))
  from public.aulas_progresso p join public.aulas a on a.id = p.aula_id and a.ativo
  where p.user_id = auth.uid();
$$;
revoke all on function public.aula_concluir(bigint, boolean), public.aulas_meu_progresso() from public, anon;
grant execute on function public.aula_concluir(bigint, boolean), public.aulas_meu_progresso() to authenticated;

-- ------------------------------------------------------------
-- As 5 aulas dos Títulos Dinâmicos
-- ------------------------------------------------------------
insert into public.aulas (pack_id, titulo, descricao, url, ordem, so_cliente, modulo, modulo_desc, modulo_ordem, xp)
select 'fl-legendas', n.titulo, n.descricao, n.url, n.ordem, true, n.modulo, n.modulo_desc, n.modulo_ordem, 10
from (values
  ('Instalação e primeiros passos',
   'Por onde começar: os títulos instalados e prontos dentro do seu CapCut.',
   'https://aulas.basefl.com/parte-01.mp4', 1, 'Instalando os Títulos',
   'Comece por aqui. Deixe tudo pronto no seu CapCut antes das aulas práticas.', 1),
  ('Na prática · parte 1',
   'Começo um vídeo do zero com os títulos do pack: os primeiros textos, o estilo script e a palavra em destaque.',
   'https://aulas.basefl.com/parte-02.mp4', 2, 'Destrinchando os Títulos',
   'Aqui eu não só mostro os modelos: uso um por um num vídeo de verdade, pra você ver como escolher, adaptar e encaixar cada título na sua edição. Com dicas e truques pelo caminho.', 2),
  ('Na prática · parte 2',
   'Continuo o mesmo vídeo: destaques de fala em duas linhas e a palavra que muda de cor.',
   'https://aulas.basefl.com/parte-03.mp4', 3, 'Destrinchando os Títulos', null, 2),
  ('Na prática · parte 3',
   'A parte dos números: a contagem animada e o título do “+70 modelos”.',
   'https://aulas.basefl.com/parte-04.mp4', 4, 'Destrinchando os Títulos', null, 2),
  ('Na prática · parte 4',
   'Fecho o vídeo: os últimos títulos, a tela clara e a chamada final.',
   'https://aulas.basefl.com/parte-05.mp4', 5, 'Destrinchando os Títulos', null, 2)
) as n(titulo, descricao, url, ordem, modulo, modulo_desc, modulo_ordem)
where not exists (select 1 from public.aulas a where a.pack_id = 'fl-legendas' and a.url = n.url);

select pack_id, modulo, ordem, titulo, url from public.aulas where ativo order by pack_id, modulo_ordem, ordem;
