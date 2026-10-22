-- 58 · Perfil dos alunos: 3 perguntas no primeiro acesso ao app Base FL + listas (quente / morno / frio)
-- A resposta fica presa ao e-mail do login (já é o e-mail da compra). Telefone e produtos vêm das vendas.

create table if not exists public.perfil_aluno (
  email text primary key,
  quem text check (quem in ('clientes', 'agencia', 'redes', 'aprendendo')),
  editor text check (editor in ('capcut_pc', 'capcut_cel', 'premiere', 'davinci', 'finalcut', 'outro')),
  ajuda text[] not null default '{}',
  segmento text check (segmento in ('quente', 'morno', 'frio')),
  app text, respondido_em timestamptz, pulos int not null default 0, ultimo_pulo timestamptz,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now());
alter table public.perfil_aluno enable row level security;   -- sem políticas: só pelas funções abaixo

-- regra das listas (uma função só, para valer igual em todo lugar)
create or replace function public._perfil_segmento(p_quem text, p_ajuda text[]) returns text
language sql immutable as $$
  select case
    when p_quem in ('clientes', 'agencia') and p_ajuda && array['cobrar', 'organizar'] then 'quente'
    when p_quem in ('clientes', 'agencia', 'aprendendo') then 'morno'
    else 'frio' end $$;

-- o app pergunta: já respondeu? (só o próprio aluno, pelo login)
create or replace function public.perfil_meu() returns jsonb
language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select jsonb_build_object(
    'respondido', coalesce((select p.respondido_em is not null from public.perfil_aluno p where p.email = lower(auth.jwt() ->> 'email')), false),
    'perguntar', coalesce((select p.respondido_em is null and (p.ultimo_pulo is null or p.ultimo_pulo < now() - interval '12 hours')
                           from public.perfil_aluno p where p.email = lower(auth.jwt() ->> 'email')), true)) $$;

create or replace function public.perfil_salvar(p_quem text, p_editor text, p_ajuda text[], p_app text default null) returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare v_email text := lower(coalesce(auth.jwt() ->> 'email', '')); v_ajuda text[]; v_seg text;
begin
  if v_email = '' then raise exception 'sem_login' using errcode = '42501'; end if;
  if p_quem not in ('clientes', 'agencia', 'redes', 'aprendendo') then raise exception 'resposta_invalida'; end if;
  if p_editor not in ('capcut_pc', 'capcut_cel', 'premiere', 'davinci', 'finalcut', 'outro') then raise exception 'resposta_invalida'; end if;
  select coalesce(array_agg(distinct a), '{}') into v_ajuda from unnest(coalesce(p_ajuda, '{}')) a
  where a in ('cobrar', 'organizar', 'rapido', 'bonito', 'clientes');
  v_seg := public._perfil_segmento(p_quem, v_ajuda);
  insert into public.perfil_aluno (email, quem, editor, ajuda, segmento, app, respondido_em, atualizado_em)
  values (v_email, p_quem, p_editor, v_ajuda, v_seg, left(p_app, 20), now(), now())
  on conflict (email) do update set quem = excluded.quem, editor = excluded.editor, ajuda = excluded.ajuda,
    segmento = excluded.segmento, app = excluded.app, respondido_em = now(), atualizado_em = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.perfil_pular(p_app text default null) returns void
language sql security definer set search_path to 'public', 'pg_temp' as $$
  insert into public.perfil_aluno (email, app, pulos, ultimo_pulo)
  select lower(auth.jwt() ->> 'email'), left(p_app, 20), 1, now() where coalesce(auth.jwt() ->> 'email', '') <> ''
  on conflict (email) do update set pulos = public.perfil_aluno.pulos + 1, ultimo_pulo = now(), atualizado_em = now() $$;

revoke all on function public.perfil_meu() from public, anon;
revoke all on function public.perfil_salvar(text, text, text[], text) from public, anon;
revoke all on function public.perfil_pular(text) from public, anon;
grant execute on function public.perfil_meu() to authenticated;
grant execute on function public.perfil_salvar(text, text, text[], text) to authenticated;
grant execute on function public.perfil_pular(text) to authenticated;

-- as listas: cada resposta com telefone, nome e o que a pessoa já comprou (das vendas da Greenn)
create or replace view public.perfil_listas with (security_invoker = true) as
select p.email, p.segmento, p.quem, p.editor, array_to_string(p.ajuda, ', ') as ajuda, p.respondido_em, p.app,
  (select w.telefone from public.webhook_events w where lower(w.email) = p.email and w.telefone is not null order by w.received_at desc limit 1) as telefone,
  (select string_agg(distinct coalesce(ap.nome, w.product_name), ', ') from public.webhook_events w
     left join public.acesso_produtos ap on ap.plataforma = 'greenn' and ap.produto_id = w.product_id
     where lower(w.email) = p.email and w.status = 'paid') as produtos,
  exists (select 1 from public.webhook_events w where lower(w.email) = p.email and w.status = 'paid' and w.product_id = '195949') as tem_kit,
  exists (select 1 from public.wpp_optout o join public.webhook_events w on lower(w.email) = p.email and w.telefone is not null
          where public.tel8(o.telefone) = public.tel8(w.telefone)) as saiu_whatsapp
from public.perfil_aluno p where p.respondido_em is not null;
revoke all on public.perfil_listas from public, anon, authenticated;

-- a Central lê as listas (só quem está em central_acesso)
create or replace function public.central_perfis() returns jsonb
language plpgsql stable security definer set search_path to 'public', 'pg_temp' as $$
begin
  if not exists (select 1 from public.central_acesso a where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))) then
    raise exception 'sem_acesso' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'resumo', jsonb_build_object(
      'responderam', (select count(*) from public.perfil_aluno where respondido_em is not null),
      'pularam', (select count(*) from public.perfil_aluno where respondido_em is null and pulos > 0),
      'quente', (select count(*) from public.perfil_aluno where segmento = 'quente'),
      'morno', (select count(*) from public.perfil_aluno where segmento = 'morno'),
      'frio', (select count(*) from public.perfil_aluno where segmento = 'frio')),
    'quem', coalesce((select jsonb_object_agg(quem, n) from (select quem, count(*) n from public.perfil_aluno where respondido_em is not null group by 1) s), '{}'),
    'editor', coalesce((select jsonb_object_agg(editor, n) from (select editor, count(*) n from public.perfil_aluno where respondido_em is not null group by 1) s), '{}'),
    'ajuda', coalesce((select jsonb_object_agg(a, n) from (select a, count(*) n from public.perfil_aluno, unnest(ajuda) a where respondido_em is not null group by 1) s), '{}'),
    'lista', coalesce((select jsonb_agg(to_jsonb(l) order by l.respondido_em desc) from public.perfil_listas l), '[]'));
end $$;
revoke all on function public.central_perfis() from public, anon;
grant execute on function public.central_perfis() to authenticated;

select 'ok' as perfil;
