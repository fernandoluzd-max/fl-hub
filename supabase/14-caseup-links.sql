-- ============================================================
-- Base FL — 14) CaseUp: botões de link (a "árvore de links" dentro do portfólio)
--   O editor passa a ter, na mesma página: os botões (WhatsApp, Instagram, site…) e os vídeos.
--   Pode usar só os botões, só os vídeos, ou os dois.
--
-- Pode rodar mais de uma vez. Não apaga nada. Rode DEPOIS do 13-caseup.sql.
-- ============================================================

alter table public.portfolios add column if not exists links  jsonb not null default '[]'::jsonb;   -- [{k: tipo, r: rótulo, v: endereço}]
alter table public.portfolios add column if not exists estilo text  not null default 'cheio';        -- visual dos botões

-- limpa a lista de botões: só tipos conhecidos, endereço seguro, tamanho limitado
create or replace function public._links_ok(j jsonb) returns jsonb
language plpgsql immutable as $$
declare o jsonb := '[]'::jsonb; x jsonb; k text; v text; r text; n int := 0;
begin
  if j is null or jsonb_typeof(j) <> 'array' then return o; end if;
  for x in select * from jsonb_array_elements(j) loop
    exit when n >= 12;
    k := x ->> 'k'; v := left(btrim(coalesce(x ->> 'v', '')), 300); r := nullif(left(btrim(coalesce(x ->> 'r', '')), 40), '');
    continue when k is null or k not in ('whatsapp','instagram','tiktok','youtube','email','site');
    if k = 'whatsapp' then
      v := public._zap(v); continue when v is null;
    elsif k = 'email' then
      continue when v !~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$';
    else
      continue when v !~* '^https://[a-z0-9.-]+\.[a-z]{2,}(/[^\s<>"'']*)?$';
      -- botão de rede social só aponta para a própria rede
      continue when k = 'instagram' and v !~* '^https://(www\.)?instagram\.com/';
      continue when k = 'tiktok'    and v !~* '^https://(www\.|vm\.)?tiktok\.com/';
      continue when k = 'youtube'   and v !~* '^https://((www\.|m\.)?youtube\.com|youtu\.be)/';
    end if;
    o := o || jsonb_build_object('k', k, 'v', v, 'r', r);
    n := n + 1;
  end loop;
  return o;
end $$;

-- salvar: agora aceita botões e estilo; vídeo deixou de ser obrigatório
create or replace function public.portfolio_salvar(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); r public.portfolios; v_slug text; v_selos jsonb := '[]'::jsonb; s text; v_cor text; v_estilo text;
begin
  if v_uid is null then raise exception 'Entre na sua conta para continuar.' using errcode = '28000'; end if;
  if not public._tem(v_uid, 'fl-case') then raise exception 'Seu acesso ao CaseUp não está ativo.' using errcode = '42501'; end if;

  v_slug := lower(btrim(coalesce(p ->> 'slug', '')));
  if v_slug !~ '^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$' then
    raise exception 'O final do link precisa ter de 3 a 30 letras ou números, sem espaço e sem acento.' using errcode = '22023';
  end if;
  if v_slug in ('demo','exemplo','previa','admin','basefl','base-fl','caseup','suporte','ajuda','teste') then
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
  v_cor    := case when (p ->> 'cor') in ('lima','agua','ambar','roxo','rosa','azul') then p ->> 'cor' else 'lima' end;
  v_estilo := case when (p ->> 'estilo') in ('cheio','contorno','vidro') then p ->> 'estilo' else 'cheio' end;

  insert into public.portfolios (user_id, slug, nome, frase, whatsapp, cor, estilo, selos, links, videos, briefing, publicado)
  values (v_uid, v_slug, public._txt(p, 'nome', 60), public._txt(p, 'frase', 120), public._zap(p ->> 'whatsapp'), v_cor, v_estilo, v_selos,
          public._links_ok(p -> 'links'), public._videos_ok(p -> 'videos'), coalesce((p ->> 'briefing')::boolean, true), coalesce((p ->> 'publicado')::boolean, true))
  on conflict (user_id) do update set
    slug = excluded.slug, nome = excluded.nome, frase = excluded.frase, whatsapp = excluded.whatsapp, cor = excluded.cor, estilo = excluded.estilo,
    selos = excluded.selos, links = excluded.links, videos = excluded.videos, briefing = excluded.briefing, publicado = excluded.publicado, atualizado_em = now()
  returning * into r;
  return to_jsonb(r) - 'user_id';
end $$;

-- página pública: devolve também os botões e o estilo
create or replace function public.pub_portfolio(p_slug text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.portfolios; v_cod text;
begin
  if p_slug is null or p_slug !~ '^[a-z0-9-]{3,30}$' then return jsonb_build_object('ok', false); end if;
  select * into r from public.portfolios where slug = p_slug;
  if r.user_id is null or not r.publicado or not public._tem(r.user_id, 'fl-case') then return jsonb_build_object('ok', false); end if;
  if r.briefing and public._tem(r.user_id, 'fl-briefing') then select codigo into v_cod from public.perfis where user_id = r.user_id; end if;
  update public.portfolios set visitas = visitas + 1 where user_id = r.user_id;
  return jsonb_build_object('ok', true, 'nome', r.nome, 'frase', r.frase, 'cor', r.cor, 'estilo', r.estilo, 'selos', r.selos, 'links', r.links, 'videos', r.videos,
                            'whatsapp', r.whatsapp, 'briefing', v_cod);
end $$;

create or replace function public.portfolio_livre(p_slug text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select auth.uid() is not null and p_slug ~ '^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$'
     and p_slug not in ('demo','exemplo','previa','admin','basefl','base-fl','caseup','suporte','ajuda','teste')
     and not exists (select 1 from public.portfolios where slug = p_slug and user_id <> auth.uid());
$$;

revoke all on function public._links_ok(jsonb), public.portfolio_salvar(jsonb), public.pub_portfolio(text), public.portfolio_livre(text) from public, anon;
grant execute on function public.portfolio_salvar(jsonb), public.portfolio_livre(text) to authenticated;
grant execute on function public.pub_portfolio(text) to anon, authenticated;

-- Produto do CaseUp na Greenn (#196127): quem compra recebe o acesso sozinho
insert into public.products (greenn_product_id, name, pack_ids) values ('196127', 'CaseUp', '{fl-case}')
on conflict (greenn_product_id) do update set name = excluded.name, pack_ids = excluded.pack_ids;

select 'caseup com botões pronto' as resultado;
