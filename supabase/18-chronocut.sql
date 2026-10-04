-- ============================================================
-- Base FL — 18) ChronoCut: o timer do editor
--   Projetos, registros de tempo (com pausas), espera/processamento em paralelo e ajustes do usuário.
--   Cada pessoa só enxerga e mexe no que é dela. Para registrar tempo, precisa do ChronoCut liberado.
--
-- Pode rodar mais de uma vez. Não apaga nada.
-- ============================================================

-- 1) A permissão própria da ferramenta
insert into public.packs (id, name, version, file_path, active) values
  ('fl-timer', 'ChronoCut', '1.0.0', 'web/timer', true)
on conflict (id) do update set name = excluded.name, active = true;

-- 2) Projetos
create table if not exists public.timer_projetos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome          text not null check (char_length(nome) between 1 and 80),
  cliente       text check (char_length(cliente) <= 80),
  tipo          text check (tipo in ('reels','anuncio','youtube','institucional','evento','outro')),
  prazo         date,
  valor         numeric(12,2) check (valor is null or valor >= 0),
  horas_est     numeric(7,2)  check (horas_est is null or horas_est >= 0),
  rev_incl      int           check (rev_incl is null or rev_incl between 0 and 99),
  demanda_id    uuid,                                   -- quando veio do Base Demandas
  concluido_em  timestamptz,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists timer_projetos_user on public.timer_projetos(user_id);

-- 3) Registros de tempo. O tempo é sempre calculado pelos horários (início, fim e pausas), nunca por um contador.
create table if not exists public.timer_registros (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  projeto_id uuid not null references public.timer_projetos(id) on delete cascade,
  etapa      text not null check (char_length(etapa) between 1 and 60),
  categoria  text not null default 'trabalho' check (categoria in ('trabalho','revisao','espera','outro')),
  rev_n      int  check (rev_n is null or rev_n between 1 and 99),
  rev_tipo   text check (rev_tipo in ('interna','cliente')),
  objetivo   text check (char_length(objetivo) <= 140),
  inicio     timestamptz not null,
  fim        timestamptz,
  pausas     jsonb not null default '[]'::jsonb,        -- [[início, fim], ...]; pausa aberta tem fim nulo
  manual     boolean not null default false,
  criado_em  timestamptz not null default now(),
  constraint timer_fim_depois check (fim is null or fim >= inicio)
);
create index if not exists timer_registros_user on public.timer_registros(user_id, inicio desc);
create index if not exists timer_registros_proj on public.timer_registros(projeto_id);
-- só UM cronômetro de trabalho ligado por pessoa (vale para todas as abas e aparelhos)
create unique index if not exists timer_um_ativo on public.timer_registros(user_id) where fim is null and categoria <> 'espera';
-- a espera (exportação, upload) pode correr em paralelo, uma por projeto
create unique index if not exists timer_uma_espera on public.timer_registros(user_id, projeto_id) where fim is null and categoria = 'espera';

-- 4) Ajustes de cada pessoa (etapas personalizadas, foco, atalhos)
create table if not exists public.timer_config (
  user_id       uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  dados         jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

-- 5) Segurança: cada um só vê o que é seu. Para criar, editar ou apagar precisa do ChronoCut em dia.
alter table public.timer_projetos  enable row level security;
alter table public.timer_registros enable row level security;
alter table public.timer_config    enable row level security;

do $$
declare t text;
begin
  foreach t in array array['timer_projetos','timer_registros','timer_config'] loop
    execute format('drop policy if exists "ver meus" on public.%I', t);
    execute format('drop policy if exists "criar meus" on public.%I', t);
    execute format('drop policy if exists "editar meus" on public.%I', t);
    execute format('drop policy if exists "apagar meus" on public.%I', t);
    execute format('create policy "ver meus" on public.%I for select to authenticated using (user_id = auth.uid())', t);
    execute format('create policy "criar meus" on public.%I for insert to authenticated with check (user_id = auth.uid() and public.tem_licenca(''fl-timer''))', t);
    execute format('create policy "editar meus" on public.%I for update to authenticated using (user_id = auth.uid() and public.tem_licenca(''fl-timer'')) with check (user_id = auth.uid())', t);
    execute format('create policy "apagar meus" on public.%I for delete to authenticated using (user_id = auth.uid() and public.tem_licenca(''fl-timer''))', t);
  end loop;
end $$;

-- um registro só pode apontar para um projeto da mesma pessoa
create or replace function public._timer_dono() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.timer_projetos p where p.id = new.projeto_id and p.user_id = new.user_id) then
    raise exception 'Projeto não encontrado.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists timer_dono on public.timer_registros;
create trigger timer_dono before insert or update of projeto_id, user_id on public.timer_registros
  for each row execute function public._timer_dono();

grant select, insert, update, delete on public.timer_projetos, public.timer_registros, public.timer_config to authenticated;

-- 6) QUEM GANHA O BÔNUS: ainda não está definido. Quando você decidir, rode UMA linha como a de baixo
--    para cada produto da Greenn que dá direito ao ChronoCut (troque NUMERO pelo número do produto).
--    Quem comprar DEPOIS disso recebe o ChronoCut junto, sozinho.
-- update public.products set pack_ids = array(select distinct unnest(pack_ids || '{fl-timer}')) where greenn_product_id = 'NUMERO';
--    E para liberar a quem JÁ comprou esse produto antes:
-- insert into public.licenses (email, pack_id, status, source, expires_at)
-- select l.email, 'fl-timer', 'active', 'bonus', l.expires_at from public.licenses l where l.pack_id = 'PACK_DO_PRODUTO' and l.status = 'active'
-- on conflict (email, pack_id) do nothing;

-- 7) Para VOCÊ testar agora:
insert into public.licenses (email, pack_id, status, source, expires_at)
values ('fernandoluzd@gmail.com', 'fl-timer', 'active', 'manual', null)
on conflict (email, pack_id) do update set status = 'active';

select 'chronocut pronto' as resultado;
