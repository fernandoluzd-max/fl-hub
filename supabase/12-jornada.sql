-- ============================================================
-- Base FL — A JORNADA: Briefing → Preço → Proposta → Contrato → Organizador
-- Cole tudo no SQL Editor e clique em Run. Pode rodar de novo sem problema.
-- NÃO apaga nada: só cria tabelas e funções novas e acrescenta 2 colunas em "demandas".
--
-- Regra de segurança deste arquivo:
--   • O que é do editor só o próprio editor lê (login + dono do registro).
--   • O cliente do editor NÃO tem conta. Ele só fala com as funções "pub_…",
--     que devolvem apenas o que foi preparado para ele (briefing, proposta, contrato).
--   • Nenhuma tabela nova pode ser lida por visitante sem login.
-- ============================================================

-- ------------------------------------------------------------
-- 0) Funções de apoio (internas: ninguém de fora consegue chamar)
-- ------------------------------------------------------------
create or replace function public._codigo() returns text language sql volatile as $$
  select substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
$$;

-- "o usuário X tem o produto Y válido?" (serve para o dono de um link, que não é quem está chamando)
create or replace function public._tem(p_user uuid, p_pack text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.licenses l join auth.users u on lower(u.email) = lower(l.email)
    where u.id = p_user and l.pack_id = p_pack and l.status = 'active'
      and (l.expires_at is null or l.expires_at > now())
  );
$$;
create or replace function public._tem_algum(p_user uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.licenses l join auth.users u on lower(u.email) = lower(l.email)
    where u.id = p_user and l.pack_id in ('fl-briefing','fl-preco','fl-contrato','fl-painel') and l.status = 'active'
      and (l.expires_at is null or l.expires_at > now())
  );
$$;
-- texto limpo e com tamanho máximo
create or replace function public._txt(j jsonb, k text, n int) returns text language sql immutable as $$
  select nullif(left(btrim(j ->> k), n), '');
$$;
-- WhatsApp sempre no formato 55 + DDD + número (só dígitos)
create or replace function public._zap(t text) returns text language sql immutable as $$
  select case
    when d ~ '^55\d{10,11}$' then d
    when d ~ '^\d{10,11}$' then '55' || d
    else null end
  from (select regexp_replace(coalesce(t, ''), '\D', '', 'g') as d) x;
$$;
create or replace function public._num(t text) returns numeric language plpgsql immutable as $$
begin return round(t::numeric, 2); exception when others then return null; end $$;
create or replace function public._data(t text) returns date language plpgsql immutable as $$
begin return t::date; exception when others then return null; end $$;
create or replace function public._uuid(t text) returns uuid language plpgsql immutable as $$
begin return t::uuid; exception when others then return null; end $$;

-- ------------------------------------------------------------
-- 1) Tabelas
-- ------------------------------------------------------------
-- Perfil do editor: nome, WhatsApp e o código do link de briefing dele
create table if not exists public.perfis (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  nome          text not null default '',
  whatsapp      text,
  codigo        text not null unique default public._codigo(),
  doc           text,
  cidade        text,
  pag           text,
  dia           text,
  nivel         text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists perfis_whatsapp on public.perfis(whatsapp);

-- Clientes do editor (um cliente pode ter vários trabalhos)
create table if not exists public.clientes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  nome          text not null,
  empresa       text,
  email         text,
  whatsapp      text,
  doc           text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists clientes_user on public.clientes(user_id);

-- Trabalhos: cada um carrega o briefing, o preço interno, a proposta e o contrato
create table if not exists public.trabalhos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  cliente_id      uuid references public.clientes(id) on delete set null,
  titulo          text,
  origem          text not null default 'manual',
  origem_ip       text,                        -- só um resumo (hash), para frear abuso no link de briefing
  etapa           text not null default 'briefing' check (etapa in ('briefing','preco','proposta','aprovado','contrato','fechado')),
  briefing        jsonb,                       -- respostas do cliente
  briefing_em     timestamptz,
  preco           jsonb,                       -- INTERNO: horas, valor/hora, faixa. Nunca sai daqui para o cliente.
  proposta        jsonb,                       -- só o que o cliente pode ver
  proposta_token  uuid unique,
  proposta_status text check (proposta_status in ('enviada','aprovada','ajuste')),
  proposta_em     timestamptz,
  proposta_resp   jsonb,
  contrato        jsonb,
  contrato_token  uuid unique,
  contrato_status text check (contrato_status in ('enviado','aceito')),
  contrato_em     timestamptz,
  contrato_aceite jsonb,
  demanda_id      uuid,
  demanda_feita   boolean not null default false,
  arquivado       boolean not null default false,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);
alter table public.trabalhos add column if not exists origem_ip text;
create index if not exists trabalhos_user on public.trabalhos(user_id, atualizado_em desc);

-- O organizador passa a saber de qual trabalho e de qual cliente veio cada cartão
alter table public.demandas add column if not exists trabalho_id uuid references public.trabalhos(id) on delete set null;
alter table public.demandas add column if not exists cliente_id  uuid references public.clientes(id)  on delete set null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'trabalhos_demanda_fk') then
    alter table public.trabalhos add constraint trabalhos_demanda_fk foreign key (demanda_id) references public.demandas(id) on delete set null;
  end if;
end $$;

-- Teste grátis: quantas vezes cada conta já usou cada ferramenta sem ter comprado
create table if not exists public.testes (
  user_id     uuid not null references auth.users(id) on delete cascade,
  pack_id     text not null,
  usos        int  not null default 0,
  primeiro_em timestamptz not null default now(),
  ultimo_em   timestamptz not null default now(),
  primary key (user_id, pack_id)
);

-- Eventos simples (para saber o que está sendo usado e o que está vendendo)
create table if not exists public.eventos (
  id        bigserial primary key,
  em        timestamptz not null default now(),
  nome      text not null,
  pack_id   text,
  user_id   uuid,
  visitante text,
  dados     jsonb
);
create index if not exists eventos_em on public.eventos(em desc);
create index if not exists eventos_visitante on public.eventos(visitante, em desc);

-- Compras: uma linha por venda. Serve para o reembolso tirar só o que aquela venda liberou.
create table if not exists public.compras (
  id        bigserial primary key,
  email     text not null,
  pack_id   text not null,
  sale_id   text not null,
  status    text not null default 'paga' check (status in ('paga','estornada')),
  validade  timestamptz,
  criado_em timestamptz not null default now(),
  unique (email, pack_id, sale_id)
);

-- ------------------------------------------------------------
-- 2) Trancas: cada um só enxerga o que é seu; visitante não enxerga nada
-- ------------------------------------------------------------
alter table public.perfis    enable row level security;
alter table public.clientes  enable row level security;
alter table public.trabalhos enable row level security;
alter table public.testes    enable row level security;
alter table public.eventos   enable row level security;
alter table public.compras   enable row level security;

revoke all on public.perfis, public.clientes, public.trabalhos, public.testes, public.eventos, public.compras from anon, authenticated;
revoke all on sequence public.eventos_id_seq, public.compras_id_seq from anon, authenticated;

drop policy if exists "meu perfil" on public.perfis;
create policy "meu perfil" on public.perfis for select to authenticated using (user_id = auth.uid());
drop policy if exists "meus clientes" on public.clientes;
create policy "meus clientes" on public.clientes for select to authenticated using (user_id = auth.uid());
drop policy if exists "meus trabalhos" on public.trabalhos;
create policy "meus trabalhos" on public.trabalhos for select to authenticated using (user_id = auth.uid());

-- só leitura direta (e só do que é seu). Toda gravação passa pelas funções abaixo, que conferem dono e produto.
grant select on public.perfis, public.clientes, public.trabalhos to authenticated;
grant all on public.perfis, public.clientes, public.trabalhos, public.testes, public.eventos, public.compras to service_role;
grant usage, select on sequence public.eventos_id_seq, public.compras_id_seq to service_role;

-- Aulas: o link do vídeo de aula exclusiva só vai para quem tem o produto
drop policy if exists "aulas visiveis" on public.aulas;
create policy "aulas visiveis" on public.aulas for select to anon, authenticated
  using (ativo and (not so_cliente or public.tem_licenca(pack_id)));
grant execute on function public.tem_licenca(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 3) Funções internas da jornada
-- ------------------------------------------------------------
-- acha o cliente (pelo WhatsApp ou pelo nome) ou cria um novo; nunca duplica.
-- p_publico = veio de um link aberto (briefing): pode ligar o trabalho a um cliente que já existe,
-- mas NUNCA altera os dados dele (senão um estranho trocaria o WhatsApp de um cliente seu).
drop function if exists public._cliente(uuid, jsonb);
create or replace function public._cliente(p_user uuid, j jsonb, p_publico boolean default false) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid; v_nome text := public._txt(j, 'nome', 80); v_zap text := public._zap(j ->> 'whatsapp');
begin
  if j is null or jsonb_typeof(j) <> 'object' then return null; end if;
  if not p_publico then
    v_id := public._uuid(j ->> 'id');
    if v_id is not null then select id into v_id from public.clientes where id = v_id and user_id = p_user; end if;
  end if;
  if v_id is null and v_zap is not null then
    select id into v_id from public.clientes where user_id = p_user and whatsapp = v_zap order by criado_em limit 1;
  end if;
  if v_id is null and v_nome is not null and (not p_publico or v_zap is null) then
    select id into v_id from public.clientes where user_id = p_user and lower(nome) = lower(v_nome) order by criado_em limit 1;
  end if;
  if v_id is null then
    if v_nome is null then return null; end if;
    insert into public.clientes (user_id, nome, empresa, email, whatsapp, doc)
    values (p_user, v_nome, public._txt(j, 'empresa', 80), lower(public._txt(j, 'email', 120)), v_zap, case when p_publico then null else public._txt(j, 'doc', 24) end)
    returning id into v_id;
  elsif not p_publico then
    update public.clientes set
      nome     = coalesce(v_nome, nome),
      empresa  = coalesce(public._txt(j, 'empresa', 80), empresa),
      email    = coalesce(lower(public._txt(j, 'email', 120)), email),
      whatsapp = coalesce(v_zap, whatsapp),
      doc      = coalesce(public._txt(j, 'doc', 24), doc),
      atualizado_em = now()
    where id = v_id;
  end if;
  return v_id;
end $$;

-- resumo de um trabalho para as listas do editor
create or replace function public._resumo(t public.trabalhos) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'id', t.id, 'titulo', t.titulo, 'etapa', t.etapa, 'origem', t.origem,
    'cliente', (select jsonb_build_object('id', c.id, 'nome', c.nome, 'whatsapp', c.whatsapp) from public.clientes c where c.id = t.cliente_id),
    'tem_briefing', t.briefing is not null, 'briefing_em', t.briefing_em,
    'tem_preco', t.preco is not null,
    'valor', coalesce(t.proposta ->> 'valor', t.contrato -> 'resumo' ->> 'valor'),
    'proposta_status', t.proposta_status, 'proposta_token', t.proposta_token, 'proposta_em', t.proposta_em,
    'contrato_status', t.contrato_status, 'contrato_token', t.contrato_token, 'contrato_em', t.contrato_em,
    'demanda_id', t.demanda_id, 'organizado', t.demanda_feita,
    'criado_em', t.criado_em, 'atualizado_em', t.atualizado_em);
$$;

-- leva o trabalho para o organizador (só para quem tem o Base Demandas)
create or replace function public._sincroniza(p_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  t public.trabalhos; c public.clientes; v_tit text; v_valor numeric; v_prazo date; v_rev int; v_fechou boolean; v_dem uuid;
begin
  select * into t from public.trabalhos where id = p_id;
  if not found or t.arquivado or not public._tem(t.user_id, 'fl-painel') then return; end if;
  select * into c from public.clientes where id = t.cliente_id;
  v_tit    := coalesce(t.titulo, public._txt(t.proposta, 'entrega', 120), public._txt(t.proposta, 'servico', 120), public._txt(t.contrato -> 'resumo', 'entrega', 120), 'Briefing recebido');
  v_valor  := coalesce(public._num(t.proposta ->> 'valor'), public._num(t.contrato -> 'resumo' ->> 'valor'), 0);
  v_prazo  := public._data(t.proposta ->> 'prazo_data');
  v_rev    := least(9, greatest(0, coalesce(public._num(t.proposta ->> 'revisoes'), public._num(t.contrato -> 'resumo' ->> 'revisoes'), 2)::int));
  v_fechou := t.etapa in ('aprovado','contrato','fechado');
  if t.demanda_id is not null and exists (select 1 from public.demandas where id = t.demanda_id) then
    -- só atualiza enquanto o cartão ainda está em "Orçamento": depois disso quem manda é o editor
    update public.demandas set
      cliente = coalesce(c.nome, cliente), titulo = left(v_tit, 200), valor = v_valor,
      prazo = coalesce(v_prazo, prazo), rev_total = v_rev, whatsapp = coalesce(c.whatsapp, whatsapp),
      cliente_id = t.cliente_id, coluna = case when v_fechou then 'fechado' else coluna end, atualizado_em = now()
    where id = t.demanda_id and coluna = 'orcamento';
  elsif not t.demanda_feita then
    insert into public.demandas (user_id, cliente, titulo, valor, prazo, coluna, rev_total, whatsapp, trabalho_id, cliente_id)
    values (t.user_id, coalesce(c.nome, 'Cliente'), left(v_tit, 200), v_valor, v_prazo, case when v_fechou then 'fechado' else 'orcamento' end, v_rev, c.whatsapp, t.id, t.cliente_id)
    returning id into v_dem;
    update public.trabalhos set demanda_id = v_dem, demanda_feita = true where id = t.id;
    insert into public.eventos (nome, pack_id, user_id) values ('project_created', 'fl-painel', t.user_id);
  end if;
end $$;

-- ------------------------------------------------------------
-- 4) Funções do EDITOR (precisam de login; conferem dono e produto)
-- ------------------------------------------------------------
-- tudo que as ferramentas precisam saber de uma vez: produtos liberados, perfil e trabalhos
create or replace function public.eu() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_email text := lower(auth.jwt() ->> 'email');
begin
  if v_uid is null then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object(
    'ok', true, 'email', v_email, 'agora', now(),
    'licencas', coalesce((select jsonb_agg(jsonb_build_object('pack', l.pack_id, 'ate', l.expires_at, 'valida', (l.expires_at is null or l.expires_at > now())))
                          from public.licenses l where lower(l.email) = v_email and l.status = 'active'), '[]'::jsonb),
    'perfil', (select to_jsonb(p) - 'user_id' from public.perfis p where p.user_id = v_uid),
    'custo_mes', (select coalesce(round(sum(case when f.ciclo = 'anual' then f.valor / 12 else f.valor end), 2), 0) from public.ferramentas f where f.user_id = v_uid),
    'testes', coalesce((select jsonb_object_agg(x.pack_id, x.usos) from public.testes x where x.user_id = v_uid), '{}'::jsonb),
    'trabalhos', coalesce((select jsonb_agg(public._resumo(x.tt) order by (x.tt).atualizado_em desc)
                           from (select tt from public.trabalhos tt where tt.user_id = v_uid and not tt.arquivado order by tt.atualizado_em desc limit 80) x), '[]'::jsonb)
  );
end $$;

create or replace function public.perfil_salvar(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); r public.perfis;
begin
  if v_uid is null then raise exception 'Entre na sua conta para continuar.' using errcode = '28000'; end if;
  insert into public.perfis (user_id, nome, whatsapp, doc, cidade, pag, dia, nivel)
  values (v_uid, coalesce(public._txt(p, 'nome', 60), ''), public._zap(p ->> 'whatsapp'), public._txt(p, 'doc', 24), public._txt(p, 'cidade', 60),
          public._txt(p, 'pag', 12), public._txt(p, 'dia', 2), public._txt(p, 'nivel', 12))
  on conflict (user_id) do update set
    nome     = coalesce(public._txt(p, 'nome', 60), perfis.nome),
    whatsapp = case when p ? 'whatsapp' then coalesce(public._zap(p ->> 'whatsapp'), perfis.whatsapp) else perfis.whatsapp end,
    doc      = case when p ? 'doc'    then public._txt(p, 'doc', 24)    else perfis.doc end,
    cidade   = case when p ? 'cidade' then public._txt(p, 'cidade', 60) else perfis.cidade end,
    pag      = coalesce(public._txt(p, 'pag', 12), perfis.pag),
    dia      = coalesce(public._txt(p, 'dia', 2), perfis.dia),
    nivel    = coalesce(public._txt(p, 'nivel', 12), perfis.nivel),
    atualizado_em = now()
  returning * into r;
  return to_jsonb(r) - 'user_id';
end $$;

-- um trabalho completo (só o dono)
create or replace function public.trabalho(p_id uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select to_jsonb(t) - 'user_id' - 'origem_ip' || jsonb_build_object('cliente', (select to_jsonb(c) - 'user_id' from public.clientes c where c.id = t.cliente_id))
  from public.trabalhos t where t.id = p_id and t.user_id = auth.uid();
$$;

-- cria ou atualiza um trabalho (cliente, briefing, preço interno)
create or replace function public.trabalho_salvar(p_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_cli uuid; v_id uuid := p_id;
begin
  if v_uid is null then raise exception 'Entre na sua conta para continuar.' using errcode = '28000'; end if;
  if not public._tem_algum(v_uid) then raise exception 'Salvar trabalhos faz parte das ferramentas do Base FL.' using errcode = '42501'; end if;
  if p is null or jsonb_typeof(p) <> 'object' or pg_column_size(p) > 24000 then raise exception 'Dados inválidos.' using errcode = '22023'; end if;
  v_cli := public._cliente(v_uid, p -> 'cliente');
  if v_id is null then
    if v_cli is null then raise exception 'Coloque o nome do cliente.' using errcode = '22023'; end if;
    insert into public.trabalhos (user_id, cliente_id, titulo, origem, etapa, briefing, briefing_em, preco)
    values (v_uid, v_cli, public._txt(p, 'titulo', 120), 'manual', case when p ? 'preco' then 'preco' else 'briefing' end,
            p -> 'briefing', case when p ? 'briefing' then now() end, p -> 'preco')
    returning id into v_id;
  else
    update public.trabalhos set
      cliente_id = coalesce(v_cli, cliente_id),
      titulo     = case when p ? 'titulo' then public._txt(p, 'titulo', 120) else titulo end,
      briefing   = case when p ? 'briefing' then p -> 'briefing' else briefing end,
      preco      = case when p ? 'preco' then p -> 'preco' else preco end,
      etapa      = case when p ? 'preco' and etapa = 'briefing' then 'preco' else etapa end,
      atualizado_em = now()
    where id = v_id and user_id = v_uid;
    if not found then raise exception 'Trabalho não encontrado.' using errcode = '42501'; end if;
  end if;
  perform public._sincroniza(v_id);
  return public.trabalho(v_id);
end $$;

-- publica a PROPOSTA: guarda só os dados comerciais e gera o link do cliente
create or replace function public.proposta_publicar(p_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid(); v_id uuid := p_id; v_cli uuid; j jsonb := p -> 'proposta'; v_valor numeric; v_limpa jsonb; t public.trabalhos;
begin
  if v_uid is null then raise exception 'Entre na sua conta para continuar.' using errcode = '28000'; end if;
  if not public._tem(v_uid, 'fl-preco') then raise exception 'Enviar proposta faz parte do Quanto Cobrar?.' using errcode = '42501'; end if;
  if p is null or j is null or jsonb_typeof(j) <> 'object' or pg_column_size(p) > 24000 then raise exception 'Dados inválidos.' using errcode = '22023'; end if;
  v_valor := public._num(j ->> 'valor');
  if v_valor is null or v_valor <= 0 or v_valor > 9999999 then raise exception 'Confira o valor da proposta.' using errcode = '22023'; end if;
  -- só entra o que o cliente pode ver. Qualquer outro campo é descartado aqui.
  v_limpa := jsonb_strip_nulls(jsonb_build_object(
    'servico', public._txt(j, 'servico', 400), 'entrega', public._txt(j, 'entrega', 400),
    'prazo', public._txt(j, 'prazo', 160), 'prazo_data', public._data(j ->> 'prazo_data'),
    'revisoes', least(9, greatest(0, coalesce(public._num(j ->> 'revisoes'), 0)::int)),
    'valor', v_valor, 'pagamento', public._txt(j, 'pagamento', 200),
    'validade', public._data(j ->> 'validade'), 'obs', public._txt(j, 'obs', 600)));
  v_cli := public._cliente(v_uid, p -> 'cliente');
  if v_id is null then
    if v_cli is null then raise exception 'Coloque o nome do cliente.' using errcode = '22023'; end if;
    insert into public.trabalhos (user_id, cliente_id, origem, etapa, preco) values (v_uid, v_cli, 'manual', 'preco', p -> 'preco') returning id into v_id;
  end if;
  update public.trabalhos set
    cliente_id = coalesce(v_cli, cliente_id),
    preco = case when p ? 'preco' then p -> 'preco' else preco end,
    proposta = v_limpa, proposta_token = gen_random_uuid(),   -- link novo a cada envio: o cliente só aprova o texto que está valendo
    proposta_status = 'enviada', proposta_em = now(), proposta_resp = null,
    etapa = case when etapa in ('contrato','fechado') then etapa else 'proposta' end,
    atualizado_em = now()
  where id = v_id and user_id = v_uid returning * into t;
  if not found then raise exception 'Trabalho não encontrado.' using errcode = '42501'; end if;
  if t.cliente_id is null then raise exception 'Coloque o nome do cliente.' using errcode = '22023'; end if;
  perform public._sincroniza(v_id);
  insert into public.eventos (nome, pack_id, user_id) values ('proposal_sent', 'fl-preco', v_uid);
  return jsonb_build_object('id', v_id, 'token', t.proposta_token);
end $$;

-- publica o CONTRATO: guarda o texto que o cliente vai ler e gera o link dele
create or replace function public.contrato_publicar(p_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid(); v_id uuid := p_id; v_cli uuid; j jsonb := p -> 'contrato'; v_limpa jsonb; v_cl jsonb; t public.trabalhos;
begin
  if v_uid is null then raise exception 'Entre na sua conta para continuar.' using errcode = '28000'; end if;
  if not public._tem(v_uid, 'fl-contrato') then raise exception 'Enviar contrato faz parte do Gerador de Contrato.' using errcode = '42501'; end if;
  if p is null or j is null or jsonb_typeof(j) <> 'object' or pg_column_size(p) > 40000 then raise exception 'Dados inválidos.' using errcode = '22023'; end if;
  select coalesce(jsonb_agg(jsonb_build_array(left(e ->> 0, 120), left(e ->> 1, 1600))), '[]'::jsonb) into v_cl
  from (select e from jsonb_array_elements(case when jsonb_typeof(j -> 'clausulas') = 'array' then j -> 'clausulas' else '[]'::jsonb end) e limit 14) x;
  v_limpa := jsonb_strip_nulls(jsonb_build_object(
    'formato', case when j ->> 'formato' = 'rapido' then 'rapido' else 'completo' end,
    'titulo', coalesce(public._txt(j, 'titulo', 160), 'Contrato de prestação de serviços'),
    'contratado', jsonb_build_object('nome', public._txt(j -> 'contratado', 'nome', 80), 'doc', public._txt(j -> 'contratado', 'doc', 24), 'cidade', public._txt(j -> 'contratado', 'cidade', 60)),
    'contratante', jsonb_build_object('nome', public._txt(j -> 'contratante', 'nome', 80), 'doc', public._txt(j -> 'contratante', 'doc', 24)),
    'resumo', jsonb_build_object('servico', public._txt(j -> 'resumo', 'servico', 400), 'entrega', public._txt(j -> 'resumo', 'entrega', 400),
                                 'prazo', public._txt(j -> 'resumo', 'prazo', 160), 'revisoes', public._num(j -> 'resumo' ->> 'revisoes'),
                                 'valor', public._num(j -> 'resumo' ->> 'valor'), 'pagamento', public._txt(j -> 'resumo', 'pagamento', 200)),
    'clausulas', v_cl, 'local_data', public._txt(j, 'local_data', 120)));
  if v_limpa -> 'contratado' ->> 'nome' is null or v_limpa -> 'contratante' ->> 'nome' is null or jsonb_array_length(v_cl) = 0 then
    raise exception 'O contrato está incompleto.' using errcode = '22023';
  end if;
  if v_id is not null and exists (select 1 from public.trabalhos where id = v_id and user_id = v_uid and contrato_status = 'aceito') then
    raise exception 'Este contrato já foi aceito pelo cliente e fica guardado como está. Para mudar algo, faça um novo contrato.' using errcode = '22023';
  end if;
  v_cli := public._cliente(v_uid, coalesce(p -> 'cliente', jsonb_build_object('nome', v_limpa -> 'contratante' ->> 'nome', 'doc', v_limpa -> 'contratante' ->> 'doc')));
  if v_id is null then
    insert into public.trabalhos (user_id, cliente_id, origem, etapa) values (v_uid, v_cli, 'manual', 'contrato') returning id into v_id;
  end if;
  update public.trabalhos set
    cliente_id = coalesce(v_cli, cliente_id),
    contrato = v_limpa, contrato_token = gen_random_uuid(),   -- link novo a cada envio: o aceite vale para o texto que o cliente leu
    contrato_status = 'enviado', contrato_em = now(), contrato_aceite = null,
    etapa = 'contrato', atualizado_em = now()
  where id = v_id and user_id = v_uid returning * into t;
  if not found then raise exception 'Trabalho não encontrado.' using errcode = '42501'; end if;
  perform public._sincroniza(v_id);
  insert into public.eventos (nome, pack_id, user_id) values ('contract_created', 'fl-contrato', v_uid);
  return jsonb_build_object('id', v_id, 'token', t.contrato_token);
end $$;

-- ações rápidas do editor num trabalho
create or replace function public.trabalho_marcar(p_id uuid, p_acao text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); t public.trabalhos;
begin
  if v_uid is null then raise exception 'Entre na sua conta para continuar.' using errcode = '28000'; end if;
  select * into t from public.trabalhos where id = p_id and user_id = v_uid;
  if not found then raise exception 'Trabalho não encontrado.' using errcode = '42501'; end if;
  if p_acao = 'aprovar' then            -- o cliente aprovou por fora (WhatsApp, ligação)
    if t.proposta is null then raise exception 'Este trabalho ainda não tem proposta.' using errcode = '22023'; end if;
    update public.trabalhos set proposta_status = 'aprovada', proposta_resp = jsonb_build_object('manual', true, 'em', now()),
      etapa = case when etapa in ('contrato','fechado') then etapa else 'aprovado' end, atualizado_em = now() where id = p_id;
    perform public._sincroniza(p_id);
  elsif p_acao = 'fechar' then          -- contrato assinado por fora (PDF, gov.br)
    update public.trabalhos set etapa = 'fechado', atualizado_em = now() where id = p_id;
    perform public._sincroniza(p_id);
  elsif p_acao = 'organizar' then       -- pôr (de novo) no organizador
    if not public._tem(v_uid, 'fl-painel') then raise exception 'Organizar trabalhos faz parte do Base Demandas.' using errcode = '42501'; end if;
    update public.trabalhos set demanda_feita = false, demanda_id = null where id = p_id and (demanda_id is null or not exists (select 1 from public.demandas d where d.id = trabalhos.demanda_id));
    perform public._sincroniza(p_id);
  elsif p_acao = 'arquivar' then
    update public.trabalhos set arquivado = true, atualizado_em = now() where id = p_id;
  elsif p_acao = 'apagar' then
    delete from public.trabalhos where id = p_id; return jsonb_build_object('ok', true);
  else raise exception 'Ação desconhecida.' using errcode = '22023';
  end if;
  return public.trabalho(p_id);
end $$;

-- quem comprou o organizador depois: puxa os trabalhos que já existiam
create or replace function public.organizar_pendentes() returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); r record; n int := 0;
begin
  if v_uid is null or not public._tem(v_uid, 'fl-painel') then return 0; end if;
  for r in select id from public.trabalhos where user_id = v_uid and not demanda_feita and not arquivado order by criado_em limit 200 loop
    perform public._sincroniza(r.id); n := n + 1;
  end loop;
  return n;
end $$;

-- teste grátis: conta por conta (quem não está logado é contado no próprio aparelho)
create or replace function public.teste(p_pack text, p_usar boolean default false) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v int := 0;
begin
  if v_uid is null or p_pack is null or p_pack !~ '^fl-[a-z]{2,12}$' then return jsonb_build_object('usos', 0); end if;
  if p_usar then
    insert into public.testes (user_id, pack_id, usos) values (v_uid, p_pack, 1)
    on conflict (user_id, pack_id) do update set usos = testes.usos + 1, ultimo_em = now() returning usos into v;
  else
    select usos into v from public.testes where user_id = v_uid and pack_id = p_pack;
  end if;
  return jsonb_build_object('usos', coalesce(v, 0));
end $$;

-- evento de uso (lista fechada de nomes, tamanho limitado, freio contra abuso).
-- Os eventos que valem como resultado (briefing respondido, proposta aprovada…) são gravados pelas próprias funções, não por aqui.
create or replace function public.evento(p_nome text, p_pack text default null, p_visitante text default null, p_dados jsonb default null) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if p_visitante is null or p_visitante !~ '^v[a-z0-9]{10,30}$' then return; end if;
  if p_nome is null or not (p_nome in ('demo_started','demo_completed','checkout_clicked','locked_feature_clicked')
       or (v_uid is not null and p_nome in ('login','brief_created','price_calculated'))) then return; end if;
  if p_dados is not null and pg_column_size(p_dados) > 600 then p_dados := null; end if;
  if (select count(*) from public.eventos e where e.visitante = p_visitante and e.em > now() - interval '1 minute') >= 30 then return; end if;
  if (select count(*) from public.eventos e where e.em > now() - interval '1 minute') >= 600 then return; end if;
  insert into public.eventos (nome, pack_id, user_id, visitante, dados) values (p_nome, left(p_pack, 20), v_uid, p_visitante, p_dados);
end $$;

-- ------------------------------------------------------------
-- 5) Funções PÚBLICAS (o cliente do editor, sem conta). Devolvem o mínimo.
-- ------------------------------------------------------------
-- dono do link de briefing: só pelo código aleatório do link (nunca pelo telefone, que qualquer um pode informar)
create or replace function public._dono_briefing(p_codigo text) returns public.perfis
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare r public.perfis;
begin
  if p_codigo is null or p_codigo !~ '^[0-9a-f]{16}$' then return null; end if;
  select * into r from public.perfis where codigo = p_codigo;
  if r.user_id is null or not public._tem(r.user_id, 'fl-briefing') then return null; end if;
  return r;
end $$;

create or replace function public.pub_briefing(p_codigo text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare r public.perfis;
begin
  r := public._dono_briefing(p_codigo);
  if r.user_id is null then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'nome', r.nome, 'whatsapp', r.whatsapp);
end $$;

create or replace function public.pub_briefing_enviar(p_codigo text, p_respostas jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r public.perfis; j jsonb := p_respostas; v_limpa jsonb; v_cli uuid; v_id uuid; v_nome text; v_ip text;
  ok_s text[] := array['editar','ambos','gravar']; ok_t text[] := array['reels','youtube','comercial','evento','outro'];
  ok_q text[] := array['1','4','8','12']; ok_d text[] := array['d1','d3','d10','d30','d60','ns'];
  ok_e text[] := array['simples','caprichada','avancada','ns']; ok_g text[] := array['g2','g4','g8','ns'];
  ok_p text[] := array['urgente','semana','normal']; ok_v text[] := array['a','b','c','d','x'];
begin
  r := public._dono_briefing(p_codigo);
  if r.user_id is null then return jsonb_build_object('ok', false, 'motivo', 'link'); end if;
  if j is null or jsonb_typeof(j) <> 'object' or pg_column_size(j) > 6000 then return jsonb_build_object('ok', false, 'motivo', 'dados'); end if;
  v_nome := public._txt(j, 'nome', 60);
  if v_nome is null or not (j ->> 's' = any(ok_s)) or not (j ->> 't' = any(ok_t)) then return jsonb_build_object('ok', false, 'motivo', 'dados'); end if;
  -- freios contra abuso: 6 por hora vindos do mesmo aparelho/rede e 40 por hora no total para o mesmo editor
  begin v_ip := md5(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)); exception when others then v_ip := null; end;
  if v_ip = md5('') then v_ip := null; end if;
  if v_ip is not null and (select count(*) from public.trabalhos where user_id = r.user_id and origem = 'briefing' and origem_ip = v_ip and criado_em > now() - interval '1 hour') >= 6 then
    return jsonb_build_object('ok', false, 'motivo', 'muitos');
  end if;
  if (select count(*) from public.trabalhos where user_id = r.user_id and origem = 'briefing' and criado_em > now() - interval '1 hour') >= 40 then
    return jsonb_build_object('ok', false, 'motivo', 'muitos');
  end if;
  -- só entram as respostas conhecidas; o resto é descartado
  v_limpa := jsonb_strip_nulls(jsonb_build_object(
    'nome', v_nome, 'empresa', public._txt(j, 'empresa', 80), 'whatsapp', public._zap(j ->> 'whatsapp'), 'email', lower(public._txt(j, 'email', 120)),
    's', j ->> 's', 't', j ->> 't',
    'q', case when j ->> 'q' = any(ok_q) then j ->> 'q' end, 'd', case when j ->> 'd' = any(ok_d) then j ->> 'd' end,
    'e', case when j ->> 'e' = any(ok_e) then j ->> 'e' end, 'g', case when j ->> 'g' = any(ok_g) then j ->> 'g' end,
    'p', case when j ->> 'p' = any(ok_p) then j ->> 'p' end, 'v', case when j ->> 'v' = any(ok_v) then j ->> 'v' end,
    'ref', public._txt(j, 'ref', 300), 'obs', public._txt(j, 'obs', 500)));
  -- toque duplo no botão: não cria dois
  select t.id into v_id from public.trabalhos t where t.user_id = r.user_id and t.origem = 'briefing' and t.briefing = v_limpa and t.criado_em > now() - interval '10 minutes' limit 1;
  if v_id is not null then return jsonb_build_object('ok', true); end if;
  v_cli := public._cliente(r.user_id, jsonb_build_object('nome', v_nome, 'empresa', v_limpa ->> 'empresa', 'whatsapp', v_limpa ->> 'whatsapp', 'email', v_limpa ->> 'email'), true);
  insert into public.trabalhos (user_id, cliente_id, origem, origem_ip, etapa, briefing, briefing_em)
  values (r.user_id, v_cli, 'briefing', v_ip, 'briefing', v_limpa, now()) returning id into v_id;
  perform public._sincroniza(v_id);
  insert into public.eventos (nome, pack_id, user_id) values ('brief_completed', 'fl-briefing', r.user_id);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.pub_proposta(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare t public.trabalhos; v_tok uuid := public._uuid(p_token);
begin
  if v_tok is null then return jsonb_build_object('ok', false); end if;
  select * into t from public.trabalhos where proposta_token = v_tok and proposta is not null;
  if not found then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true,
    'editor', (select jsonb_build_object('nome', p.nome, 'whatsapp', p.whatsapp) from public.perfis p where p.user_id = t.user_id),
    'cliente', (select c.nome from public.clientes c where c.id = t.cliente_id),
    'proposta', t.proposta, 'status', t.proposta_status, 'enviada_em', t.proposta_em,
    'resposta', case when t.proposta_status = 'aprovada' then jsonb_build_object('nome', t.proposta_resp ->> 'nome', 'em', t.proposta_resp ->> 'em') end,
    'vencida', coalesce(public._data(t.proposta ->> 'validade') < current_date, false) and t.proposta_status <> 'aprovada');
end $$;

create or replace function public.pub_proposta_responder(p_token text, p_ok boolean, p_nome text default null, p_msg text default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.trabalhos; v_tok uuid := public._uuid(p_token); v_nome text := nullif(left(btrim(coalesce(p_nome, '')), 80), '');
begin
  if v_tok is null then return jsonb_build_object('ok', false); end if;
  select * into t from public.trabalhos where proposta_token = v_tok and proposta is not null for update;
  if not found then return jsonb_build_object('ok', false); end if;
  if t.proposta_status = 'aprovada' then return jsonb_build_object('ok', true, 'status', 'aprovada'); end if;   -- já respondida: não muda
  if p_ok then
    if public._data(t.proposta ->> 'validade') < current_date then return jsonb_build_object('ok', false, 'motivo', 'vencida'); end if;
    if v_nome is null or length(v_nome) < 2 then return jsonb_build_object('ok', false, 'motivo', 'nome'); end if;
    update public.trabalhos set proposta_status = 'aprovada', proposta_resp = jsonb_build_object('nome', v_nome, 'em', now()),
      etapa = case when etapa in ('contrato','fechado') then etapa else 'aprovado' end, atualizado_em = now() where id = t.id;
    insert into public.eventos (nome, pack_id, user_id) values ('proposal_approved', 'fl-preco', t.user_id);
  else
    update public.trabalhos set proposta_status = 'ajuste', proposta_resp = jsonb_build_object('nome', v_nome, 'msg', left(btrim(coalesce(p_msg, '')), 500), 'em', now()),
      atualizado_em = now() where id = t.id;
  end if;
  perform public._sincroniza(t.id);
  return jsonb_build_object('ok', true, 'status', case when p_ok then 'aprovada' else 'ajuste' end);
end $$;

create or replace function public.pub_contrato(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare t public.trabalhos; v_tok uuid := public._uuid(p_token);
begin
  if v_tok is null then return jsonb_build_object('ok', false); end if;
  select * into t from public.trabalhos where contrato_token = v_tok and contrato is not null;
  if not found then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true,
    'editor', (select jsonb_build_object('nome', p.nome, 'whatsapp', p.whatsapp) from public.perfis p where p.user_id = t.user_id),
    'contrato', t.contrato, 'status', t.contrato_status, 'enviado_em', t.contrato_em,
    'aceite', case when t.contrato_status = 'aceito' then t.contrato_aceite end);
end $$;

create or replace function public.pub_contrato_aceitar(p_token text, p_nome text, p_doc text default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.trabalhos; v_tok uuid := public._uuid(p_token); v_nome text := nullif(left(btrim(coalesce(p_nome, '')), 80), ''); v_doc text := nullif(left(btrim(coalesce(p_doc, '')), 24), '');
begin
  if v_tok is null then return jsonb_build_object('ok', false); end if;
  select * into t from public.trabalhos where contrato_token = v_tok and contrato is not null for update;
  if not found then return jsonb_build_object('ok', false); end if;
  if t.contrato_status = 'aceito' then return jsonb_build_object('ok', true, 'status', 'aceito', 'aceite', t.contrato_aceite); end if;
  if v_nome is null or length(v_nome) < 5 then return jsonb_build_object('ok', false, 'motivo', 'nome'); end if;
  update public.trabalhos set contrato_status = 'aceito', contrato_aceite = jsonb_strip_nulls(jsonb_build_object('nome', v_nome, 'doc', v_doc, 'em', now())),
    etapa = 'fechado', atualizado_em = now() where id = t.id returning * into t;
  if v_doc is not null and t.cliente_id is not null then update public.clientes set doc = coalesce(doc, v_doc) where id = t.cliente_id; end if;
  perform public._sincroniza(t.id);
  insert into public.eventos (nome, pack_id, user_id) values ('contract_accepted', 'fl-contrato', t.user_id);
  return jsonb_build_object('ok', true, 'status', 'aceito', 'aceite', t.contrato_aceite);
end $$;

-- ------------------------------------------------------------
-- 6) Quem pode chamar o quê
-- ------------------------------------------------------------
-- internas: ninguém de fora
revoke execute on function
  public._codigo(), public._tem(uuid, text), public._tem_algum(uuid), public._txt(jsonb, text, int), public._zap(text), public._num(text), public._data(text), public._uuid(text),
  public._cliente(uuid, jsonb, boolean), public._resumo(public.trabalhos), public._sincroniza(uuid), public._dono_briefing(text)
  from public, anon, authenticated;
-- do editor: só com login
revoke execute on function
  public.eu(), public.perfil_salvar(jsonb), public.trabalho(uuid), public.trabalho_salvar(uuid, jsonb), public.proposta_publicar(uuid, jsonb),
  public.contrato_publicar(uuid, jsonb), public.trabalho_marcar(uuid, text), public.organizar_pendentes(), public.teste(text, boolean)
  from public, anon;
grant execute on function
  public.eu(), public.perfil_salvar(jsonb), public.trabalho(uuid), public.trabalho_salvar(uuid, jsonb), public.proposta_publicar(uuid, jsonb),
  public.contrato_publicar(uuid, jsonb), public.trabalho_marcar(uuid, text), public.organizar_pendentes(), public.teste(text, boolean)
  to authenticated;
-- públicas: o cliente do editor, sem conta
grant execute on function
  public.pub_briefing(text), public.pub_briefing_enviar(text, jsonb), public.pub_proposta(text), public.pub_proposta_responder(text, boolean, text, text),
  public.pub_contrato(text), public.pub_contrato_aceitar(text, text, text), public.evento(text, text, text, jsonb)
  to anon, authenticated;

-- ------------------------------------------------------------
-- 7) Reembolso certo: tira só o que aquela venda liberou
--    (quem comprou a Calculadora e depois o Kit não perde a Calculadora se devolver o Kit)
-- ------------------------------------------------------------
create or replace function public.licenca_compras() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_n int; v_ate timestamptz; v_venda text; v_sem_fim boolean; v_achou int;
  -- o aviso da Greenn chega pela função do servidor (service_role); o que você faz no SQL Editor não passa por aqui
  v_greenn boolean := coalesce(auth.jwt() ->> 'role', current_setting('role', true), '') = 'service_role';
begin
  new.email := lower(btrim(new.email));
  -- venda paga pela Greenn: anota a compra
  if new.status = 'active' and new.source = 'greenn' and coalesce(new.sale_id, '') <> '' then
    insert into public.compras (email, pack_id, sale_id, status, validade) values (new.email, new.pack_id, new.sale_id, 'paga', new.expires_at)
    on conflict (email, pack_id, sale_id) do update set status = 'paga', validade = excluded.validade;
    return new;
  end if;
  if tg_op = 'UPDATE' and new.status = 'revoked' and old.status = 'active' then
    if not v_greenn then
      -- bloqueio feito por você, na mão: vale sempre
      update public.compras set status = 'estornada' where email = new.email and pack_id = new.pack_id;
      return new;
    end if;
    -- bloqueio vindo da Greenn (reembolso, chargeback, cancelamento) de UMA venda
    update public.compras set status = 'estornada' where email = new.email and pack_id = new.pack_id and sale_id = coalesce(new.sale_id, '');
    get diagnostics v_achou = row_count;
    select count(*), max(validade), (array_agg(sale_id order by criado_em desc))[1], bool_or(validade is null) into v_n, v_ate, v_venda, v_sem_fim
      from public.compras where email = new.email and pack_id = new.pack_id and status = 'paga' and (validade is null or validade > now());
    if v_achou > 0 and v_n > 0 then       -- a venda devolvida foi achada e ainda existe outra compra paga e válida deste produto: continua liberado
      new.status := 'active'; new.sale_id := v_venda;
      new.expires_at := case when v_sem_fim then null else v_ate end;
    elsif old.source = 'manual' and old.expires_at is null then   -- liberado na mão por você: reembolso de venda não derruba
      new.status := 'active'; new.sale_id := old.sale_id;
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.licenca_compras() from public, anon, authenticated;
drop trigger if exists licenses_z_compras on public.licenses;
create trigger licenses_z_compras before insert or update on public.licenses
  for each row execute function public.licenca_compras();

-- compras que já existiam antes deste arquivo
insert into public.compras (email, pack_id, sale_id, status, validade, criado_em)
select lower(l.email), l.pack_id, l.sale_id, 'paga', l.expires_at, coalesce(l.expires_at - interval '1 year', l.updated_at)
from public.licenses l where l.source = 'greenn' and l.status = 'active' and coalesce(l.sale_id, '') <> ''
on conflict (email, pack_id, sale_id) do nothing;

-- ------------------------------------------------------------
-- 8) Conferência
-- ------------------------------------------------------------
select 'jornada pronta' as resultado,
  (select count(*) from public.perfis) as perfis, (select count(*) from public.trabalhos) as trabalhos,
  (select count(*) from public.compras) as compras_registradas;
