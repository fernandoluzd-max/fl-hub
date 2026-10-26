-- 61 · Central: custo das mensagens de WhatsApp em reais (por mensagem, por disparo e total)
-- Preço oficial da Meta para o Brasil (em vigor desde 01/10/2026): Marketing US$ 0,0625 · Utilidade US$ 0,0068.
-- A Meta cobra por mensagem ENTREGUE. Respostas livres dentro da janela de 24 h (o "Aqui está a página...") não entram aqui.
-- Para mudar o dólar ou os preços: update public.central_config set valor = ... where chave = '...';

create table if not exists public.central_config (chave text primary key, valor numeric not null, nota text, atualizado_em timestamptz not null default now());
alter table public.central_config enable row level security;
insert into public.central_config (chave, valor, nota) values
  ('dolar', 5.04, 'R$ por US$ (comercial de 22/10/2026)'),
  ('usd_marketing', 0.0625, 'Meta, Brasil, mensagem de marketing entregue'),
  ('usd_utilidade', 0.0068, 'Meta, Brasil, mensagem de utilidade entregue')
on conflict (chave) do nothing;

-- todas as mensagens cobradas, uma linha por mensagem
create or replace view public.wpp_cobradas with (security_invoker = true) as
  -- disparos de oferta (camp): Mood, Reels Academy -> Títulos, Kit Freelancer
  select 'camp-' || e.id as id, coalesce(e.entregue_em, e.atualizado_em, e.criado_em) as em,
         case when e.campanha = 'kit_freelancer' then 'Kit Freelancer (perfil)'
              when e.campanha = 'titulos_ra' then 'Reels Academy → Títulos'
              when e.campanha = 'mood_alunos_2026' and k.wpp_onda = 99 then 'Mood · pós-compra'
              when e.campanha = 'mood_alunos_2026' then 'Mood · base de alunos'
              else e.campanha end as disparo,
         'marketing' as categoria, k.nome, k.email, coalesce(k.segmento = 'T', false) as teste
  from public.camp_envios e left join public.camp_contatos k on k.id = e.contato_id
  where e.canal = 'whatsapp' and e.status in ('entregue', 'lido')
  union all
  -- primeiro acesso (modelos de utilidade), desde 22/10
  select 'acesso-' || a.id, coalesce(a.entregue_em, a.enviado_em, a.criado_em), 'Primeiro acesso', 'utilidade', a.nome, a.email, false
  from public.acesso_wpp a where a.status in ('entregue', 'lido')
  union all
  -- fluxos antigos (n8n) registrados em wpp_enviados; "acesso_util" é o mesmo envio de acesso_wpp e não conta de novo
  select 'antigo-' || w.id, w.enviado_em,
         case when w.tipo = 'acesso' then 'Primeiro acesso (modelo antigo)'
              when w.tipo like 'mood_rec%' then 'Mood · recuperação'
              when w.tipo = 'mood_boasvindas' then 'Mood · boas-vindas'
              when w.tipo like 'recup_pix%' then 'Recuperação de Pix'
              when w.tipo like 'recup_lead%' then 'Recuperação de checkout'
              when w.tipo like 'teste%' then 'Testes'
              else w.tipo end,
         'marketing', null, w.email, w.tipo like 'teste%'
  from public.wpp_enviados w where w.status = 'enviado' and w.tipo <> 'acesso_util';
revoke all on public.wpp_cobradas from public, anon, authenticated;

create or replace function public.central_custos(p_de timestamptz, p_ate timestamptz) returns jsonb
language plpgsql stable security definer set search_path to 'public', 'pg_temp' as $$
declare dol numeric; mk numeric; ut numeric;
begin
  if not exists (select 1 from public.central_acesso a where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))) then
    raise exception 'sem_acesso' using errcode = '42501';
  end if;
  select valor into dol from public.central_config where chave = 'dolar';
  select valor into mk from public.central_config where chave = 'usd_marketing';
  select valor into ut from public.central_config where chave = 'usd_utilidade';
  return (
    with c as (
      select m.*, round(case when m.categoria = 'marketing' then mk else ut end * dol, 4) as brl
      from public.wpp_cobradas m),
    p as (select * from c where c.em >= p_de and c.em < p_ate)
    select jsonb_build_object(
      'config', jsonb_build_object('dolar', dol, 'marketing_brl', round(mk * dol, 4), 'utilidade_brl', round(ut * dol, 4)),
      'periodo', jsonb_build_object('total', coalesce((select sum(brl) from p), 0), 'mensagens', (select count(*) from p),
                   'marketing', (select count(*) from p where categoria = 'marketing'), 'utilidade', (select count(*) from p where categoria = 'utilidade')),
      'total', jsonb_build_object('total', coalesce((select sum(brl) from c), 0), 'mensagens', (select count(*) from c),
                   'desde', (select min(em) from c)),
      'por_disparo', coalesce((select jsonb_agg(x order by x.total_brl desc) from (
          select disparo, min(categoria) as categoria,
                 count(*) filter (where em >= p_de and em < p_ate) as qtd_periodo,
                 coalesce(sum(brl) filter (where em >= p_de and em < p_ate), 0) as brl_periodo,
                 count(*) as qtd_total, sum(brl) as total_brl
          from c group by disparo) x), '[]'),
      'por_dia', coalesce((select jsonb_agg(d order by d.dia) from (
          select (em at time zone 'America/Sao_Paulo')::date as dia, sum(brl) as brl, count(*) as qtd
          from c where em >= now() - interval '30 days' group by 1) d), '[]'),
      'ultimas', coalesce((select jsonb_agg(u order by u.em desc) from (
          select em, disparo, categoria, brl, teste,
                 coalesce(nullif(public._primeiro_nome(nome, lower(coalesce(email, ''))), ''), 'Contato') as nome
          from p order by em desc limit 60) u), '[]'))
  );
end $$;
revoke all on function public.central_custos(timestamptz, timestamptz) from public, anon;
grant execute on function public.central_custos(timestamptz, timestamptz) to authenticated;

select 'ok' as central_custos;
