-- 61 · Central 2.0: série diária de vendas para sequências e recordes (gamificação)
-- PROPOSTO — NÃO APLICADO EM PRODUÇÃO. Este arquivo só foi versionado; ninguém o executou
-- contra o banco. Revise e aplique manualmente (ou não) quando fizer sentido.
--
-- Por que este arquivo existe: a Central 2.0 (branch central-v2) quer mostrar "sequência de
-- dias seguidos com vendas" e "recordes" (melhor dia/horário), mas nem central_wpp (55) nem
-- central_perfis (58/60) expõem uma série diária de COMPRAS — só de cliques/aberturas
-- (campo `serie` de central_wpp cobre os tipos abriu/teste/checkout/audio, nunca "compra").
-- Em vez de aproximar isso a partir dos cliques (o que inventaria um número que o negócio
-- não define como venda), este arquivo propõe uma função nova, só de leitura, que conta
-- compras reais (webhook_events.status = 'paid') por dia, separadas por produto.
--
-- Não modifica nenhuma função existente (55/56/57/58/59/60). Não cria tabela. Não altera
-- permissão de nada que já existe. Mesma porta de acesso que central_wpp: só quem está em
-- central_acesso (ver 55) consegue chamar.
--
-- Origem / regra / período / limitações (auditoria exigida pela missão, seção 13):
--   Origem: public.webhook_events (mesma tabela que central_wpp usa na CTE `comp`).
--   Regra: 1 compra = 1 e-mail distinto com webhook_events.status = 'paid' para o produto,
--     contado no dia (America/Sao_Paulo) de webhook_events.received_at. Mesma definição de
--     "compra" que central_wpp já usa — só adiciona o agrupamento por dia que não existia.
--   Unidade: contagem de e-mails distintos por dia.
--   Período: limitado a 400 dias por chamada, igual ao limite de central_wpp.
--   Limitações: não distingue teste de aluno real (p_testes é aceito mas hoje não há coluna
--     de teste em webhook_events — fica documentado aqui para quem for revisar aplicar o
--     filtro certo antes de usar em produção, em vez de this function silenciosamente ignorar
--     o parâmetro).

create or replace function public.central_vendas_serie(p_de timestamptz, p_ate timestamptz, p_testes boolean default false)
returns jsonb language plpgsql stable security definer set search_path to 'public', 'pg_temp' as $$
declare v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if not exists (select 1 from public.central_acesso a where a.email = v_email) then
    raise exception 'sem_acesso' using errcode = '42501';
  end if;
  if p_de is null or p_ate is null or p_ate <= p_de then raise exception 'periodo_invalido'; end if;
  if p_ate - p_de > interval '400 days' then p_de := p_ate - interval '400 days'; end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object('dia', dia, 'produto', produto, 'compras', compras) order by dia)
    from (
      select to_char(date_trunc('day', w.received_at at time zone 'America/Sao_Paulo'), 'YYYY-MM-DD') as dia,
             case w.product_id when '195947' then 'mood' when '195949' then 'kit_freelancer' else 'outro' end as produto,
             count(distinct lower(w.email)) as compras
      from public.webhook_events w
      where w.status = 'paid' and w.received_at >= p_de and w.received_at < p_ate
        and w.product_id in ('195947', '195949')
      group by 1, 2
    ) s
  ), '[]'::jsonb);
end $$;
revoke all on function public.central_vendas_serie(timestamptz, timestamptz, boolean) from public, anon;
grant execute on function public.central_vendas_serie(timestamptz, timestamptz, boolean) to authenticated;

-- conferência manual (NÃO executado por este PR) — rode só depois de revisar, simulando o
-- seu próprio login, igual ao self-check que o arquivo 55 já usa:
-- select set_config('request.jwt.claims', '{"email":"fernandoluzd@gmail.com"}', true);
-- select public.central_vendas_serie(now() - interval '30 days', now(), true);
