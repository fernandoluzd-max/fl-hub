-- 65 · Recuperações novas, enviadas pela função recup-wpp (sem n8n). Tudo nasce DESLIGADO.
--   2ª mensagem do Pix (modelo recup_pix_util, utilidade), 20 a 48 h depois da 1ª, só para quem não pagou:
--       update public.central_config set valor = 1 where chave = 'recup_pix_2';
--   Checkout abandonado de madrugada (23h às 8h), enviado das 8h às 11h59 do dia seguinte (modelo recup_abandono_link):
--       update public.central_config set valor = 1 where chave = 'recup_madrugada';
--   Textos novos no wa-inbound (Manda o áudio sem "teste grátis" e Pix vencido com link), quando a função nova for publicada:
--       update public.central_config set valor = 1 where chave = 'wa_textos_novos';
-- Regra geral: nunca mais de 2 mensagens de recuperação por pessoa em 30 dias; quem pediu para sair ou pagou qualquer coisa não recebe.

insert into public.central_config (chave, valor, nota) values
  ('recup_pix_2', 0, '1 = 2ª mensagem do Pix (recup_pix_util) 20 a 48 h depois da 1ª; 0 = desligada'),
  ('recup_madrugada', 0, '1 = checkout abandonado entre 23h e 8h recebe mensagem às 8h (recup_abandono_link); 0 = desligada'),
  ('wa_textos_novos', 0, '1 = textos novos do wa-inbound para todos (o número do Fernando sempre vê os novos); 0 = textos atuais')
on conflict (chave) do nothing;

create or replace function public._recup_qtd(p_tel text) returns int language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select count(*)::int from wpp_enviados e where tel8(e.telefone) = tel8(p_tel) and e.tipo like 'recup%' and e.enviado_em > now() - interval '30 days' $$;

-- fila da 2ª mensagem do Pix
create or replace function public.recup_pix_2_fila(p_forcar boolean default false)
returns table(sale_id text, email text, telefone text, nome text)
language sql stable security definer set search_path to 'public', 'pg_temp' as $function$
  select distinct on (tel8(e1.telefone))
    e1.sale_id, lower(e1.email), e1.telefone,
    coalesce((select split_part(nullif(trim(r.nome), ''), ' ', 1) from rec_eventos r where r.sale_id = e1.sale_id and nullif(trim(r.nome), '') is not null limit 1),
             initcap(split_part(coalesce(e1.email, ''), '@', 1)))
  from wpp_enviados e1
  where (p_forcar or coalesce((select valor from central_config where chave = 'recup_pix_2'), 0) = 1)
    and extract(hour from now() at time zone 'America/Sao_Paulo') between 8 and 21
    and e1.tipo = 'recup_pix_1'
    and e1.enviado_em between now() - interval '48 hours' and now() - interval '20 hours'
    and not exists (select 1 from rec_eventos r where r.sale_id = e1.sale_id and r.product_id = '195947')
    and not exists (select 1 from wpp_optout o where tel8(o.telefone) = tel8(e1.telefone))
    and not exists (select 1 from webhook_events w where w.status = 'paid'
                    and (lower(w.email) = lower(e1.email) or tel8(w.telefone) = tel8(e1.telefone))
                    and w.received_at > e1.enviado_em - interval '1 day')
    and not exists (select 1 from wpp_enviados e2 where tel8(e2.telefone) = tel8(e1.telefone) and e2.tipo = 'recup_pix_2')
    and _recup_qtd(e1.telefone) < 2
  order by tel8(e1.telefone), e1.enviado_em desc
  limit 30 $function$;

-- fila do checkout abandonado de madrugada (Títulos)
create or replace function public.recup_madrugada_fila(p_forcar boolean default false)
returns table(sale_id text, email text, telefone text, nome text)
language sql stable security definer set search_path to 'public', 'pg_temp' as $function$
  with base as (
    select distinct on (tel8(r.telefone))
      r.sale_id, lower(r.email) as email, r.telefone,
      split_part(coalesce(nullif(trim(r.nome), ''), initcap(split_part(r.email, '@', 1))), ' ', 1) as nome, r.received_at
    from rec_eventos r
    where r.event = 'checkoutAbandoned' and r.telefone is not null and r.product_id = '195639'
      and r.received_at > now() - interval '12 hours'
      and r.received_at < now() - interval '3 hours'                                    -- a janela do fluxo normal (até 3 h) já passou
      and (extract(hour from r.received_at at time zone 'America/Sao_Paulo') >= 23
           or extract(hour from r.received_at at time zone 'America/Sao_Paulo') < 8)
    order by tel8(r.telefone), r.received_at desc)
  select b.sale_id, b.email, b.telefone, b.nome from base b
  where (p_forcar or coalesce((select valor from central_config where chave = 'recup_madrugada'), 0) = 1)
    and extract(hour from now() at time zone 'America/Sao_Paulo') between 8 and 11
    and not exists (select 1 from wpp_optout o where tel8(o.telefone) = tel8(b.telefone))
    and not exists (select 1 from webhook_events w where w.status = 'paid'
                    and (lower(w.email) = b.email or tel8(w.telefone) = tel8(b.telefone)) and w.received_at > b.received_at - interval '1 day')
    and not exists (select 1 from rec_eventos p where p.status = 'waiting_payment'
                    and (lower(p.email) = b.email or tel8(p.telefone) = tel8(b.telefone)) and p.received_at > b.received_at - interval '1 hour')
    and not exists (select 1 from wpp_enviados e where tel8(e.telefone) = tel8(b.telefone) and e.tipo in ('recup_lead_1', 'recup_lead_madrugada'))
    and _recup_qtd(b.telefone) < 2
  limit 30 $function$;

revoke all on function public.recup_pix_2_fila(boolean) from public, anon, authenticated;
revoke all on function public.recup_madrugada_fila(boolean) from public, anon, authenticated;
grant execute on function public.recup_pix_2_fila(boolean) to service_role;
grant execute on function public.recup_madrugada_fila(boolean) to service_role;
grant execute on function public._recup_qtd(text) to service_role;

-- o fluxo de dia (n8n) também passa a ver o envio da madrugada e não repete
do $x$
declare d text; alvo text := 'e.tipo = ''recup_lead_1''';
begin
  select pg_get_functiondef('public.recup_lead_c1()'::regprocedure) into d;
  if position('recup_lead_madrugada' in d) = 0 and position(alvo in d) > 0 then
    d := replace(d, alvo, 'e.tipo in (''recup_lead_1'', ''recup_lead_madrugada'')');
    execute d;
  end if;
end $x$;

-- Central: nomes e custo dos envios novos (2ª do Pix é utilidade) e a lista do Mood "vídeos mais bonitos"
create or replace view public.wpp_cobradas with (security_invoker = true) as
  select 'camp-' || e.id as id, coalesce(e.entregue_em, e.atualizado_em, e.criado_em) as em,
         case when e.campanha = 'kit_freelancer' then 'Kit Freelancer (perfil)'
              when e.campanha = 'titulos_ra' then 'Reels Academy → Títulos'
              when e.campanha = 'mood_alunos_2026' and k.wpp_onda = 99 then 'Mood · pós-compra'
              when e.campanha = 'mood_alunos_2026' and k.wpp_onda = 50 then 'Mood · vídeos mais bonitos'
              when e.campanha = 'mood_alunos_2026' then 'Mood · base de alunos'
              else e.campanha end as disparo,
         'marketing' as categoria, k.nome, k.email, coalesce(k.segmento = 'T', false) as teste
  from public.camp_envios e left join public.camp_contatos k on k.id = e.contato_id
  where e.canal = 'whatsapp' and e.status in ('entregue', 'lido')
  union all
  select 'acesso-' || a.id, coalesce(a.entregue_em, a.enviado_em, a.criado_em), 'Primeiro acesso', 'utilidade', a.nome, a.email, false
  from public.acesso_wpp a where a.status in ('entregue', 'lido')
  union all
  select 'antigo-' || w.id, w.enviado_em,
         case when w.tipo = 'acesso' then 'Primeiro acesso (modelo antigo)'
              when w.tipo like 'mood_rec%' then 'Mood · recuperação'
              when w.tipo = 'mood_boasvindas' then 'Mood · boas-vindas'
              when w.tipo like 'recup_pix%' then 'Recuperação de Pix'
              when w.tipo like 'recup_lead%' then 'Recuperação de checkout'
              when w.tipo like 'teste%' then 'Testes'
              else w.tipo end,
         case when w.tipo = 'recup_pix_2' then 'utilidade' else 'marketing' end, null, w.email, w.tipo like 'teste%'
  from public.wpp_enviados w where w.status = 'enviado' and w.tipo <> 'acesso_util';
revoke all on public.wpp_cobradas from public, anon, authenticated;

-- relógio: a cada 10 min chama a recup-wpp (com tudo desligado, ela não manda nada)
do $x$
begin
  perform cron.unschedule('recup-wpp') where exists (select 1 from cron.job where jobname = 'recup-wpp');
  perform cron.schedule('recup-wpp', '*/10 * * * *', $c$
    select net.http_post(
      url := 'https://otlaexuqyavpzxwzcsfo.supabase.co/functions/v1/recup-wpp?k=' || (select chave from public.integracao_chaves where nome = 'acesso_cron'),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'acesso_anon')),
      body := '{}'::jsonb)
  $c$);
end $x$;

select (select count(*) from public.recup_pix_2_fila(true)) as pix2_aptos_agora,
       (select count(*) from public.recup_madrugada_fila(true)) as madrugada_aptos_agora,
       (select string_agg(chave || '=' || valor, ', ') from public.central_config where chave in ('recup_pix_2', 'recup_madrugada', 'wa_textos_novos')) as chaves;
