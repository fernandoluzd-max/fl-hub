-- ============================================================
-- 69 · BLACK FRIDAY DOS ALUNOS 2026 · rastreio da página e painel
-- Grava visitas e cliques da página basefl.com/black/ com a origem (utm_source/utm_medium)
-- e o número do grupo contado à mão 1 vez por dia. NÃO envia mensagem nenhuma.
--
--   • black_eventos .. cada visita/clique (a página só consegue gravar, nunca ler)
--   • black_grupo .... contagem manual de participantes do grupo (1 por dia)
--   • black_painel() . os números do painel basefl.com/central/black/ (só quem está em central_acesso)
--
-- Rodar uma vez no SQL Editor. Pode rodar de novo sem estragar nada.
-- ============================================================

create table if not exists public.black_eventos (
  id         bigserial primary key,
  criado_em  timestamptz not null default now(),
  visitante  text not null,          -- id aleatório do navegador (não identifica a pessoa)
  contato    text,                   -- ?c= do convite individual (para saber quem clicou e quem não)
  evento     text not null,          -- visita · grupo · checkout · estilo · produto
  cta        text,                   -- qual botão (hero, contador, oferta...)
  origem     text not null default 'direto',   -- utm_source
  meio       text,                   -- utm_medium
  campanha   text,                   -- utm_campaign
  conteudo   text                    -- utm_content
);
create index if not exists black_eventos_criado on public.black_eventos (criado_em);
create index if not exists black_eventos_evento on public.black_eventos (evento, origem);
alter table public.black_eventos enable row level security;   -- sem políticas: ninguém lê nem grava direto

create table if not exists public.black_grupo (
  dia           date primary key,
  participantes int  not null check (participantes >= 0),
  anotado_em    timestamptz not null default now()
);
alter table public.black_grupo enable row level security;

-- a página chama esta função (visitante anônimo)
create or replace function public.black_evento(
  p_visitante text, p_evento text, p_cta text default null,
  p_origem text default null, p_meio text default null, p_campanha text default null,
  p_conteudo text default null, p_contato text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_ev text := lower(btrim(coalesce(p_evento, '')));
        v_vis text := left(btrim(coalesce(p_visitante, '')), 40);
begin
  if v_ev not in ('visita', 'grupo', 'checkout', 'estilo', 'produto') then return; end if;
  if v_vis !~ '^[A-Za-z0-9_-]{8,40}$' then return; end if;
  -- ignora repetição do mesmo clique em 10 s e visitas repetidas em 30 min
  if exists (select 1 from public.black_eventos e
             where e.visitante = v_vis and e.evento = v_ev and coalesce(e.cta, '') = coalesce(left(p_cta, 40), '')
               and e.criado_em > now() - case when v_ev = 'visita' then interval '30 minutes' else interval '10 seconds' end) then
    return;
  end if;
  insert into public.black_eventos (visitante, contato, evento, cta, origem, meio, campanha, conteudo)
  values (v_vis, nullif(left(btrim(coalesce(p_contato, '')), 40), ''), v_ev, nullif(left(p_cta, 40), ''),
          coalesce(nullif(lower(left(btrim(coalesce(p_origem, '')), 40)), ''), 'direto'),
          nullif(lower(left(btrim(coalesce(p_meio, '')), 40)), ''),
          nullif(lower(left(btrim(coalesce(p_campanha, '')), 60)), ''),
          nullif(lower(left(btrim(coalesce(p_conteudo, '')), 60)), ''));
end $$;
revoke all on function public.black_evento(text, text, text, text, text, text, text, text) from public;
grant execute on function public.black_evento(text, text, text, text, text, text, text, text) to anon, authenticated;

-- contagem manual do grupo (só quem está em central_acesso)
create or replace function public.black_grupo_salvar(p_dia date, p_participantes int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.central_acesso a where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))) then
    raise exception 'sem_acesso' using errcode = '42501';
  end if;
  if p_participantes is null or p_participantes < 0 or p_participantes > 100000 then raise exception 'numero_invalido'; end if;
  insert into public.black_grupo (dia, participantes) values (coalesce(p_dia, (now() at time zone 'America/Sao_Paulo')::date), p_participantes)
  on conflict (dia) do update set participantes = excluded.participantes, anotado_em = now();
end $$;
revoke all on function public.black_grupo_salvar(date, int) from public, anon;
grant execute on function public.black_grupo_salvar(date, int) to authenticated;

-- os números do painel (só quem está em central_acesso). Só totais: nenhum nome, telefone ou e-mail.
create or replace function public.black_painel()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not exists (select 1 from public.central_acesso a where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))) then
    raise exception 'sem_acesso' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'agora', now(),
    'totais', (select jsonb_build_object(
        'visitantes', count(distinct visitante) filter (where evento = 'visita'),
        'visitas',    count(*) filter (where evento = 'visita'),
        'grupo',      count(distinct visitante) filter (where evento = 'grupo'),
        'checkout',   count(distinct visitante) filter (where evento = 'checkout'),
        'convidados_que_abriram', count(distinct contato) filter (where contato is not null))
      from public.black_eventos),
    'origens', coalesce((select jsonb_agg(o order by o->>'visitantes' desc) from (
        select jsonb_build_object(
          'origem', origem, 'meio', coalesce(meio, ''),
          'visitantes', count(distinct visitante) filter (where evento = 'visita'),
          'grupo', count(distinct visitante) filter (where evento = 'grupo'),
          'checkout', count(distinct visitante) filter (where evento = 'checkout')) as o
        from public.black_eventos group by origem, coalesce(meio, '')) x), '[]'::jsonb),
    'dias', coalesce((select jsonb_agg(d order by d->>'dia') from (
        select jsonb_build_object(
          'dia', (criado_em at time zone 'America/Sao_Paulo')::date,
          'visitantes', count(distinct visitante) filter (where evento = 'visita'),
          'grupo', count(distinct visitante) filter (where evento = 'grupo'),
          'checkout', count(distinct visitante) filter (where evento = 'checkout')) as d
        from public.black_eventos group by 1) y), '[]'::jsonb),
    'botoes', coalesce((select jsonb_agg(b order by b->>'cliques' desc) from (
        select jsonb_build_object('evento', evento, 'cta', coalesce(cta, '—'), 'cliques', count(distinct visitante)) as b
        from public.black_eventos where evento in ('grupo', 'checkout') group by evento, coalesce(cta, '—')) z), '[]'::jsonb),
    'grupo', coalesce((select jsonb_agg(jsonb_build_object('dia', dia, 'participantes', participantes) order by dia) from public.black_grupo), '[]'::jsonb)
  ) into v;
  return v;
end $$;
revoke all on function public.black_painel() from public, anon;
grant execute on function public.black_painel() to authenticated;

-- Quem recebeu o convite individual e NÃO abriu a página (para o lembrete de 19/11).
-- O convite leva ?c=<id do contato>. Rode quando for montar o lembrete:
--   select distinct contato from public.black_eventos where contato is not null;
-- e envie o lembrete só para os contatos da lista que NÃO aparecem aqui.
