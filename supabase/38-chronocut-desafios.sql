-- =====================================================================================
-- Base FL — 38) ChronoCut · Desafios (modo foco com prazo)
-- O desafio é um PRAZO que a pessoa se dá. O tempo de TRABALHO continua só em timer_registros:
-- desafio ligado a projeto usa o mesmo registro do cronômetro (timer_registros.desafio_id).
-- Pode rodar mais de uma vez (if not exists / drop policy if exists).
-- =====================================================================================

create table if not exists public.timer_desafios (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo      text not null check (char_length(titulo) between 1 and 60),
  plano_s     int  not null check (plano_s between 60 and 28800),          -- 1 min a 8 h
  extra_s     int  not null default 0 check (extra_s between 0 and 28800),
  origem      text not null default 'livre' check (origem in ('etapa','livre')),
  prazo_modo  text not null default 'duracao' check (prazo_modo in ('duracao','horario')),
  meta_qtd    int  check (meta_qtd between 2 and 20),                       -- "Criar 5 animações" → 5
  meta_nome   text check (char_length(meta_nome) <= 30),
  entregas    jsonb not null default '[]'::jsonb,                           -- horário de cada "+1 pronta"
  inicio      timestamptz not null,
  fim         timestamptz,
  pausas      jsonb not null default '[]'::jsonb,                           -- [[início, fim], ...]; pausa aberta tem fim nulo
  resultado   text check (resultado in ('terminou','parou','desistiu')),
  classe      text check (classe in ('voou','antes','prazo','depois')),     -- gravada ao concluir
  projeto_id  uuid references public.timer_projetos(id) on delete set null,
  etapa       text check (char_length(etapa) <= 60),
  criado_em   timestamptz not null default now(),
  constraint desafio_fim_depois check (fim is null or fim >= inicio),
  constraint desafio_fim_resultado check ((fim is null) = (resultado is null)),
  constraint desafio_classe check ((coalesce(resultado, '') = 'terminou') = (classe is not null))
);
create index if not exists timer_desafios_user on public.timer_desafios(user_id, inicio desc);
-- só UM desafio aberto por pessoa (vale para todas as abas e aparelhos)
create unique index if not exists timer_um_desafio on public.timer_desafios(user_id) where fim is null;

-- o registro de trabalho sabe a qual desafio pertence (para não contar duas vezes)
alter table public.timer_registros add column if not exists desafio_id uuid references public.timer_desafios(id) on delete set null;

-- segurança: cada pessoa só vê e mexe nos próprios desafios, e só com o ChronoCut liberado
alter table public.timer_desafios enable row level security;
drop policy if exists "ver meus" on public.timer_desafios;
drop policy if exists "criar meus" on public.timer_desafios;
drop policy if exists "editar meus" on public.timer_desafios;
drop policy if exists "apagar meus" on public.timer_desafios;
create policy "ver meus" on public.timer_desafios for select to authenticated using (user_id = auth.uid());
create policy "criar meus" on public.timer_desafios for insert to authenticated with check (user_id = auth.uid() and public.tem_licenca('fl-timer'));
create policy "editar meus" on public.timer_desafios for update to authenticated using (user_id = auth.uid() and public.tem_licenca('fl-timer')) with check (user_id = auth.uid());
create policy "apagar meus" on public.timer_desafios for delete to authenticated using (user_id = auth.uid() and public.tem_licenca('fl-timer'));

-- o projeto ligado precisa ser da mesma pessoa
create or replace function public._timer_desafio_dono() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.projeto_id is not null and not exists (select 1 from public.timer_projetos p where p.id = new.projeto_id and p.user_id = new.user_id) then
    raise exception 'projeto inválido';
  end if;
  return new;
end $$;
drop trigger if exists timer_desafio_dono on public.timer_desafios;
create trigger timer_desafio_dono before insert or update of projeto_id, user_id on public.timer_desafios
  for each row execute function public._timer_desafio_dono();

grant select, insert, update, delete on public.timer_desafios to authenticated;
notify pgrst, 'reload schema';
