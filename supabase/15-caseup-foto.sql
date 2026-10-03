-- ============================================================
-- Base FL — 15) CaseUp: foto, capa dos vídeos, formato (em pé / deitado) e link curto
--   - o editor coloca a foto dele e uma capa em cada vídeo (as imagens ficam no Storage, pasta "caseup")
--   - cada vídeo guarda o formato: 'v' (9:16) ou 'h' (16:9)
--   - "Pedir orçamento" só existe para quem tem o Gerador de Briefing
--   - o link passa a ser basefl.com/nome: alguns nomes ficam reservados
--
-- Pode rodar mais de uma vez. Não apaga nada.
-- Rode DEPOIS do 14-caseup-links.sql.
-- ============================================================

alter table public.portfolios add column if not exists foto text;

-- 1) Onde as imagens ficam (só existe no Supabase de verdade; no teste local este bloco é pulado)
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'storage' and table_name = 'buckets' and column_name = 'file_size_limit') then
    execute $q$
      insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('caseup', 'caseup', true, 400000, array['image/jpeg'])
      on conflict (id) do update set public = true, file_size_limit = 400000, allowed_mime_types = array['image/jpeg']
    $q$;
    execute 'drop policy if exists "caseup envia" on storage.objects';
    execute 'drop policy if exists "caseup troca" on storage.objects';
    execute 'drop policy if exists "caseup apaga" on storage.objects';
    -- cada editor só mexe na própria pasta (o nome da pasta é um código derivado da conta, não o id dela)
    execute $q$ create policy "caseup envia" on storage.objects for insert to authenticated
      with check (bucket_id = 'caseup' and (storage.foldername(name))[1] = md5(auth.uid()::text)) $q$;
    execute $q$ create policy "caseup troca" on storage.objects for update to authenticated
      using (bucket_id = 'caseup' and (storage.foldername(name))[1] = md5(auth.uid()::text)) $q$;
    execute $q$ create policy "caseup apaga" on storage.objects for delete to authenticated
      using (bucket_id = 'caseup' and (storage.foldername(name))[1] = md5(auth.uid()::text)) $q$;
  end if;
end $$;

-- 2) Nome de arquivo aceito (só o nome, sem caminho): foto-abc123.jpg
create or replace function public._img_ok(t text) returns text
language sql immutable as $$ select case when t ~ '^[a-z0-9-]{1,40}\.jpg$' then t else null end $$;

-- 3) Finais de link que não podem ser usados (são pastas do site)
create or replace function public._slug_reservado(s text) returns boolean
language sql immutable as $$
  select s in ('demo','exemplo','previa','admin','basefl','base-fl','caseup','suporte','ajuda','teste',
               'app','b','c','e','p','case','instalar','capas','conheca','contrato','briefing','core','docs','icones','kit','lut','luts','mood',
               'oferta','packs','painel','preco','supabase','tools','ui','index','404','home','login','entrar','conta',
               'termos','privacidade','politica','blog','api','assets','static','www','loja','comprar','checkout')
$$;

-- 4) Vídeos: agora guardam também o formato (f) e a capa enviada pelo editor (k)
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
      'c', c,
      'k', public._img_ok(x ->> 'k'),
      'f', case when (x ->> 'f') in ('v','h') then x ->> 'f' else null end);
    n := n + 1;
  end loop;
  return v;
end $$;

-- 5) O editor lê o próprio portfólio (agora com o nome da pasta de imagens dele)
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
    'pasta', md5(v_uid::text),
    'tem_briefing', public._tem(v_uid, 'fl-briefing') and pf.codigo is not null);
end $$;

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
  -- quem já tinha um final de link antes desta regra continua com ele
  if public._slug_reservado(v_slug) and not exists (select 1 from public.portfolios where user_id = v_uid and slug = v_slug) then
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

  insert into public.portfolios (user_id, slug, nome, frase, whatsapp, cor, estilo, foto, selos, links, videos, briefing, publicado)
  values (v_uid, v_slug, public._txt(p, 'nome', 60), public._txt(p, 'frase', 120), public._zap(p ->> 'whatsapp'), v_cor, v_estilo, public._img_ok(p ->> 'foto'), v_selos,
          public._links_ok(p -> 'links'), public._videos_ok(p -> 'videos'), coalesce((p ->> 'briefing')::boolean, true), coalesce((p ->> 'publicado')::boolean, true))
  on conflict (user_id) do update set
    slug = excluded.slug, nome = excluded.nome, frase = excluded.frase, whatsapp = excluded.whatsapp, cor = excluded.cor, estilo = excluded.estilo, foto = excluded.foto,
    selos = excluded.selos, links = excluded.links, videos = excluded.videos, briefing = excluded.briefing, publicado = excluded.publicado, atualizado_em = now()
  returning * into r;
  return to_jsonb(r) - 'user_id';
end $$;

-- 6) PÚBLICA: o que o cliente vê. O WhatsApp solto não sai mais daqui: o contato agora são os botões do editor.
create or replace function public.pub_portfolio(p_slug text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.portfolios; v_cod text;
begin
  if p_slug is null or p_slug !~ '^[a-z0-9-]{3,30}$' then return jsonb_build_object('ok', false); end if;
  select * into r from public.portfolios where slug = p_slug;
  if r.user_id is null or not r.publicado or not public._tem(r.user_id, 'fl-case') then return jsonb_build_object('ok', false); end if;
  -- "Pedir orçamento": só se o editor quer E tem o Gerador de Briefing em dia
  if r.briefing and public._tem(r.user_id, 'fl-briefing') then select codigo into v_cod from public.perfis where user_id = r.user_id; end if;
  update public.portfolios set visitas = visitas + 1 where user_id = r.user_id;
  return jsonb_build_object('ok', true, 'nome', r.nome, 'frase', r.frase, 'cor', r.cor, 'estilo', r.estilo, 'selos', r.selos, 'links', r.links, 'videos', r.videos,
                            'foto', r.foto, 'pasta', md5(r.user_id::text), 'briefing', v_cod);
end $$;

create or replace function public.portfolio_livre(p_slug text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select auth.uid() is not null and p_slug ~ '^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$'
     and (not public._slug_reservado(p_slug) or exists (select 1 from public.portfolios where user_id = auth.uid() and slug = p_slug))
     and not exists (select 1 from public.portfolios where slug = p_slug and user_id <> auth.uid());
$$;

revoke all on function public._img_ok(text), public._slug_reservado(text), public._videos_ok(jsonb), public.portfolio(), public.portfolio_salvar(jsonb), public.pub_portfolio(text), public.portfolio_livre(text) from public, anon;
grant execute on function public.portfolio(), public.portfolio_salvar(jsonb), public.portfolio_livre(text) to authenticated;
grant execute on function public.pub_portfolio(text) to anon, authenticated;

select 'caseup com foto e capas pronto' as resultado;
