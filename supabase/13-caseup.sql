-- ============================================================
-- Base FL — 13) CaseUp: o portfólio do editor
--   O editor monta uma página pública com os vídeos dele e manda o link para o cliente.
--   "Pedir orçamento" abre o briefing do editor (se ele tiver o Gerador de Briefing) ou o WhatsApp.
--
-- Pode rodar mais de uma vez. Não apaga nada.
-- Rode DEPOIS do 12-jornada.sql.
-- ============================================================

-- 1) O produto novo (ferramenta de navegador, igual às outras)
insert into public.packs (id, name, version, file_path, active) values
  ('fl-case', 'CaseUp', '1.0.0', 'web/case', true)
on conflict (id) do update set name = excluded.name, active = true;
update public.packs set buy_url = 'https://basefl.com/conheca/caseup/?de=app' where id = 'fl-case';

-- 2) Tabela: um portfólio por editor
create table if not exists public.portfolios (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  slug          text not null unique,                 -- o final do link: basefl.com/e/?joao
  nome          text not null default '',
  frase         text,
  whatsapp      text,
  cor           text not null default 'lima',
  selos         jsonb not null default '[]'::jsonb,   -- até 3 frases curtas ("Entrega em 3 dias")
  videos        jsonb not null default '[]'::jsonb,   -- [{u: link, t: tipo, n: título, c: capa}]
  briefing      boolean not null default true,        -- "Pedir orçamento" abre o briefing (quando o editor tem)
  publicado     boolean not null default true,
  visitas       integer not null default 0,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint portfolios_slug_ok check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$')
);

alter table public.portfolios enable row level security;
drop policy if exists "meu portfolio" on public.portfolios;
create policy "meu portfolio" on public.portfolios for select to authenticated using (user_id = auth.uid());
-- ninguém escreve direto na tabela: só pelas funções abaixo
grant select on public.portfolios to authenticated;
grant all on public.portfolios to service_role;

-- 3) Apoio: limpa a lista de vídeos (só links https de sites de vídeo conhecidos, tamanho limitado)
create or replace function public._videos_ok(j jsonb) returns jsonb
language plpgsql immutable as $$
declare v jsonb := '[]'::jsonb; x jsonb; u text; c text; n int := 0;
begin
  if j is null or jsonb_typeof(j) <> 'array' then return v; end if;
  for x in select * from jsonb_array_elements(j) loop
    exit when n >= 24;
    u := left(btrim(x ->> 'u'), 300);
    continue when u is null or u !~* '^https://([a-z0-9-]+\.)*(instagram\.com|tiktok\.com|youtube\.com|youtu\.be|vimeo\.com|drive\.google\.com)/[^\s<>"'']+$';
    c := left(btrim(x ->> 'c'), 400);
    if c is not null and c !~* '^https://[^\s<>"'']+$' then c := null; end if;
    v := v || jsonb_build_object(
      'u', u,
      't', case when (x ->> 't') in ('reels','anuncio','youtube','institucional','evento','outro') then x ->> 't' else 'outro' end,
      'n', nullif(left(btrim(coalesce(x ->> 'n', '')), 60), ''),
      'c', c);
    n := n + 1;
  end loop;
  return v;
end $$;

-- 4) O editor lê e salva o próprio portfólio
create or replace function public.portfolio() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); r public.portfolios; pf public.perfis;
begin
  if v_uid is null then return jsonb_build_object('ok', false); end if;
  select * into r from public.portfolios where user_id = v_uid;
  select * into pf from public.perfis where user_id = v_uid;
  return jsonb_build_object(
    'ok', true,
    'portfolio', case when r.user_id is null then null else to_jsonb(r) - 'user_id' end,
    'perfil_nome', pf.nome, 'perfil_whatsapp', pf.whatsapp,
    'tem_briefing', public._tem(v_uid, 'fl-briefing') and pf.codigo is not null);
end $$;

create or replace function public.portfolio_salvar(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); r public.portfolios; v_slug text; v_selos jsonb := '[]'::jsonb; s text; v_cor text;
begin
  if v_uid is null then raise exception 'Entre na sua conta para continuar.' using errcode = '28000'; end if;
  if not public._tem(v_uid, 'fl-case') then raise exception 'Seu acesso ao CaseUp não está ativo.' using errcode = '42501'; end if;

  v_slug := lower(btrim(coalesce(p ->> 'slug', '')));
  if v_slug !~ '^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$' then
    raise exception 'O final do link precisa ter de 3 a 30 letras ou números, sem espaço e sem acento.' using errcode = '22023';
  end if;
  if v_slug in ('demo','exemplo','admin','basefl','base-fl','caseup','suporte','ajuda','teste') then
    raise exception 'Esse final de link é reservado. Escolha outro.' using errcode = '22023';
  end if;
  if exists (select 1 from public.portfolios where slug = v_slug and user_id <> v_uid) then
    raise exception 'Esse final de link já está em uso. Escolha outro.' using errcode = '23505';
  end if;
  if coalesce(public._txt(p, 'nome', 60), '') = '' then raise exception 'Escreva o seu nome.' using errcode = '22023'; end if;

  if jsonb_typeof(p -> 'selos') = 'array' then
    for s in select left(btrim(x), 28) from jsonb_array_elements_text(p -> 'selos') x limit 3 loop
      if s <> '' then v_selos := v_selos || to_jsonb(s); end if;
    end loop;
  end if;
  v_cor := case when (p ->> 'cor') in ('lima','agua','ambar','roxo','rosa','azul') then p ->> 'cor' else 'lima' end;

  insert into public.portfolios (user_id, slug, nome, frase, whatsapp, cor, selos, videos, briefing, publicado)
  values (v_uid, v_slug, public._txt(p, 'nome', 60), public._txt(p, 'frase', 120), public._zap(p ->> 'whatsapp'), v_cor, v_selos,
          public._videos_ok(p -> 'videos'), coalesce((p ->> 'briefing')::boolean, true), coalesce((p ->> 'publicado')::boolean, true))
  on conflict (user_id) do update set
    slug = excluded.slug, nome = excluded.nome, frase = excluded.frase, whatsapp = excluded.whatsapp, cor = excluded.cor,
    selos = excluded.selos, videos = excluded.videos, briefing = excluded.briefing, publicado = excluded.publicado, atualizado_em = now()
  returning * into r;
  return to_jsonb(r) - 'user_id';
end $$;

-- 5) PÚBLICA: o que o cliente vê. Devolve o mínimo, e só se o editor estiver com o acesso em dia.
create or replace function public.pub_portfolio(p_slug text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.portfolios; v_cod text;
begin
  if p_slug is null or p_slug !~ '^[a-z0-9-]{3,30}$' then return jsonb_build_object('ok', false); end if;
  select * into r from public.portfolios where slug = p_slug;
  if r.user_id is null or not r.publicado or not public._tem(r.user_id, 'fl-case') then return jsonb_build_object('ok', false); end if;
  -- briefing: só se o editor quer E tem o Gerador de Briefing em dia
  if r.briefing and public._tem(r.user_id, 'fl-briefing') then select codigo into v_cod from public.perfis where user_id = r.user_id; end if;
  update public.portfolios set visitas = visitas + 1 where user_id = r.user_id;
  return jsonb_build_object('ok', true, 'nome', r.nome, 'frase', r.frase, 'cor', r.cor, 'selos', r.selos, 'videos', r.videos,
                            'whatsapp', r.whatsapp, 'briefing', v_cod);
end $$;

-- o final de link está livre? (para avisar o editor antes de salvar)
create or replace function public.portfolio_livre(p_slug text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select auth.uid() is not null and p_slug ~ '^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$'
     and p_slug not in ('demo','exemplo','admin','basefl','base-fl','caseup','suporte','ajuda','teste')
     and not exists (select 1 from public.portfolios where slug = p_slug and user_id <> auth.uid());
$$;

-- 6) Quem pode chamar o quê
revoke all on function public._videos_ok(jsonb), public.portfolio(), public.portfolio_salvar(jsonb), public.pub_portfolio(text), public.portfolio_livre(text) from public, anon;
grant execute on function public.portfolio(), public.portfolio_salvar(jsonb), public.portfolio_livre(text) to authenticated;
grant execute on function public.pub_portfolio(text) to anon, authenticated;

-- 7) O Kit Freelancer NÃO muda: o CaseUp é vendido à parte até você decidir o contrário.
--    Quando criar o produto na Greenn, rode a linha abaixo trocando NUMERO pelo número do produto:
-- insert into public.products (greenn_product_id, name, pack_ids) values ('NUMERO', 'CaseUp', '{fl-case}')
-- on conflict (greenn_product_id) do update set name = excluded.name, pack_ids = excluded.pack_ids;

-- 8) Para VOCÊ testar agora, antes de existir o produto na Greenn (troque pelo seu e-mail se for outro):
insert into public.licenses (email, pack_id, status, source, expires_at)
values ('fernandoluzd@gmail.com', 'fl-case', 'active', 'manual', null)
on conflict (email, pack_id) do update set status = 'active';

select 'caseup pronto' as resultado, (select count(*) from public.portfolios) as portfolios;
