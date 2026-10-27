-- 64 · (a) Regra de 7 dias entre ofertas para TODOS os disparos de oferta · (b) lista do Mood para quem quer "vídeos mais bonitos"
-- Tudo nasce DESLIGADO. Nada aqui manda mensagem.
--   Liga a regra de 7 dias:   update public.central_config set valor = 1 where chave = 'regra_7dias';
--   Liga a lista do Mood:     update public.central_config set valor = 1 where chave = 'mood_bonito';
-- Oferta = disparos do camp (Mood, Reels Academy → Títulos, Kit Freelancer). Primeiro acesso e recuperações NÃO contam.
-- Prioridade quando duas ofertas caem juntas para o mesmo número: Títulos (1) > Mood (2) > Kit Freelancer (3).
-- A lista do Mood "vídeos mais bonitos" respeita a regra de 7 dias sempre, mesmo com a regra geral desligada.

insert into public.central_config (chave, valor, nota) values
  ('regra_7dias', 0, '1 = só uma oferta nova a cada 7 dias por número (Títulos > Mood > Kit); 0 = desligada'),
  ('mood_bonito', 0, '1 = envia o Mood (mood_pos_compra_v2) para a lista "vídeos mais bonitos", até 20/dia, 8h às 22h59; 0 = desligada')
on conflict (chave) do nothing;

create or replace function public._oferta_prio(p_campanha text) returns int language sql immutable as $$
  select case p_campanha when 'titulos_ra' then 1 when 'mood_alunos_2026' then 2 when 'kit_freelancer' then 3 else 9 end $$;

-- a oferta pendente dessa campanha está ligada agora?
create or replace function public._oferta_ativa(p_campanha text, p_onda int) returns boolean
language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select case
    when p_campanha = 'mood_alunos_2026' and p_onda = 50 then coalesce((select valor from central_config where chave = 'mood_bonito'), 0) = 1
    when p_campanha = 'mood_alunos_2026' and p_onda = 99 then exists (select 1 from camp_config c where c.id = p_campanha and not coalesce(c.pausado, false) and coalesce(c.wpp_pos_compra, false))
    when p_campanha in ('titulos_ra', 'kit_freelancer') then exists (select 1 from camp_config c where c.id = p_campanha and not coalesce(c.pausado, false) and coalesce(c.wpp_pos_compra, false))
    else false end $$;

-- true = esse número NÃO pode receber esta oferta agora
create or replace function public._oferta_bloqueada(p_tel text, p_campanha text, p_forcar boolean default false) returns boolean
language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select (p_forcar or coalesce((select valor from central_config where chave = 'regra_7dias'), 0) = 1) and (
    -- recebeu qualquer oferta nos últimos 7 dias
    exists (select 1 from camp_envios e join camp_contatos k2 on k2.id = e.contato_id
            where e.canal = 'whatsapp' and e.etapa = 1 and e.status <> 'falhou'
              and e.campanha in ('mood_alunos_2026', 'titulos_ra', 'kit_freelancer')
              and e.criado_em > now() - interval '7 days'
              and coalesce(k2.segmento, '') <> 'T'
              and tel8(k2.telefone) = tel8(p_tel))
    -- ou tem uma oferta de prioridade maior pronta para sair na próxima hora
    or exists (select 1 from camp_contatos k3
               where tel8(k3.telefone) = tel8(p_tel) and coalesce(k3.segmento, '') <> 'T'
                 and _oferta_prio(k3.campanha) < _oferta_prio(p_campanha)
                 and k3.excluido is null and not k3.optout and not k3.comprou
                 and k3.wpp_liberar_em <= now() + interval '1 hour'
                 and _oferta_ativa(k3.campanha, k3.wpp_onda)
                 and not exists (select 1 from camp_envios e3 where e3.contato_id = k3.id and e3.canal = 'whatsapp' and e3.etapa = 1))
  ) $$;
revoke all on function public._oferta_bloqueada(text, text, boolean) from public, anon, authenticated;

-- fila do Mood: ondas liberadas + pós-compra (onda 99) + lista "vídeos mais bonitos" (onda 50)
create or replace function public.camp_fila_wpp(p_campanha text, p_qtd integer)
returns table(envio_id bigint, telefone text, nome text)
language plpgsql security definer set search_path to 'public', 'pg_temp' as $function$
#variable_conflict use_column
declare lib int; pos boolean; bon boolean; hora int; hoje int; hoje50 int := 0;
begin
  select c.wpp_onda_liberada, c.wpp_pos_compra into lib, pos from public.camp_config c where c.id = p_campanha and not coalesce(c.pausado, false);
  if not found then return; end if;
  lib := coalesce(lib, 0);
  hora := extract(hour from now() at time zone 'America/Sao_Paulo');
  pos := coalesce(pos, false) and hora between 8 and 22;                                -- 08h00 até 22h59
  if pos then
    select count(*) into hoje from public.camp_envios e join public.camp_contatos k2 on k2.id = e.contato_id
    where e.campanha = p_campanha and e.canal = 'whatsapp' and e.etapa = 1 and k2.wpp_onda = 99
      and (e.criado_em at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date;
    if hoje >= 40 then pos := false; end if;                                            -- teto de 40 por dia
  end if;
  bon := p_campanha = 'mood_alunos_2026' and coalesce((select valor from public.central_config where chave = 'mood_bonito'), 0) = 1 and hora between 8 and 22;
  if bon then
    select count(*) into hoje50 from public.camp_envios e join public.camp_contatos k2 on k2.id = e.contato_id
    where e.campanha = p_campanha and e.canal = 'whatsapp' and e.etapa = 1 and k2.wpp_onda = 50
      and (e.criado_em at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date;
    if hoje50 >= 20 then bon := false; end if;                                          -- teto de 20 por dia
  end if;
  if lib <= 0 and not pos and not bon then return; end if;
  return query
  with cand as (
    select k.id, k.wpp_onda,
           row_number() over (partition by (k.wpp_onda = 50) order by k.wpp_liberar_em nulls last, k.id) as rn
    from public.camp_contatos k
    where k.campanha = p_campanha
      and ( (k.wpp_onda between 1 and lib and not k.teste)
         or (pos and k.wpp_onda = 99 and k.wpp_liberar_em <= now() and (not k.teste or k.segmento = 'T'))
         or (bon and k.wpp_onda = 50 and (not k.teste or k.segmento = 'T')) )
      and k.excluido is null and not k.optout and not k.comprou
      and k.telefone ~ '^55\d{10,11}$'
      and not exists (select 1 from public.wpp_optout o where public.tel8(o.telefone) = public.tel8(k.telefone))
      and not exists (select 1 from public.licenses l where lower(l.email) = lower(k.email) and l.pack_id = 'fl-lut' and l.status = 'active')
      and not exists (select 1 from public.webhook_events w where lower(w.email) = lower(k.email) and w.status in ('refunded', 'chargedback'))
      and not exists (select 1 from public.camp_envios e where e.contato_id = k.id and e.canal = 'whatsapp' and e.etapa = 1)
      and (k.segmento = 'T' or not exists (select 1 from public.camp_envios e join public.camp_contatos k2 on k2.id = e.contato_id
                      where e.campanha = p_campanha and e.canal = 'whatsapp' and e.etapa = 1 and public.tel8(k2.telefone) = public.tel8(k.telefone)))
      and (k.segmento = 'T' or not public._oferta_bloqueada(k.telefone, p_campanha, k.wpp_onda = 50))
  ), alvo as (
    select k.id, k.telefone, k.nome from public.camp_contatos k
    where k.id in (select c.id from cand c where c.wpp_onda is distinct from 50 or c.rn <= 20 - hoje50)
    order by k.wpp_onda, k.wpp_liberar_em nulls last, k.id
    limit p_qtd
    for update of k skip locked
  ), ins as (
    insert into public.camp_envios (campanha, contato_id, canal, etapa, variante, status)
    select p_campanha, a.id, 'whatsapp', 1, 'audio', 'reservado' from alvo a
    on conflict do nothing
    returning id, contato_id
  )
  select ins.id, a.telefone, a.nome from ins join alvo a on a.id = ins.contato_id;
end $function$;
revoke all on function public.camp_fila_wpp(text, integer) from public, anon, authenticated;
grant execute on function public.camp_fila_wpp(text, integer) to service_role;

-- Títulos e Kit passam a respeitar a regra (quando ligada) e a prioridade
do $x$
declare d text; alvo text := 'and not exists (select 1 from public.wpp_optout o where public.tel8(o.telefone) = public.tel8(k.telefone))';
begin
  select pg_get_functiondef('public.camp_fila_titulos(integer)'::regprocedure) into d;
  if position('_oferta_bloqueada' in d) = 0 then
    if position(alvo in d) = 0 then raise exception 'trecho não encontrado em camp_fila_titulos'; end if;
    d := replace(d, alvo, alvo || E'\n      and (k.segmento = ''T'' or not public._oferta_bloqueada(k.telefone, ''titulos_ra'', false))');
    execute d;
  end if;
  select pg_get_functiondef('public.camp_fila_kit(integer)'::regprocedure) into d;
  if position('_oferta_bloqueada' in d) = 0 then
    if position(alvo in d) = 0 then raise exception 'trecho não encontrado em camp_fila_kit'; end if;
    d := replace(d, alvo, alvo || E'\n      and (k.segmento = ''T'' or not public._oferta_bloqueada(k.telefone, ''kit_freelancer'', false))');
    execute d;
  end if;
end $x$;

-- (b) lista "vídeos mais bonitos": onda 50 da campanha do Mood
create or replace function public.mood_bonito_entra(p_email text) returns void
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare v_tel text; v_nome text; v_id bigint; v_onda int;
begin
  -- já recebeu oferta do Mood (por e-mail ou telefone)? não entra
  if exists (select 1 from camp_envios e join camp_contatos k on k.id = e.contato_id
             where e.campanha = 'mood_alunos_2026' and e.canal = 'whatsapp' and e.etapa = 1 and lower(k.email) = p_email) then return; end if;
  select a.telefone, a.nome into v_tel, v_nome from acesso_wpp a where lower(a.email) = p_email and a.telefone ~ '^55\d{10,11}$' order by a.id desc limit 1;
  if v_tel is null then
    select public._tel_br(w.telefone) into v_tel from webhook_events w where lower(w.email) = p_email and w.telefone is not null order by w.received_at desc limit 1;
  end if;
  if v_tel is null or v_nome is null then
    select coalesce(v_tel, k.telefone), coalesce(v_nome, k.nome) into v_tel, v_nome from camp_contatos k
     where lower(k.email) = p_email and k.telefone ~ '^55\d{10,11}$' order by k.id desc limit 1;
  end if;
  if v_tel is null or v_tel !~ '^55\d{10,11}$' then return; end if;
  if exists (select 1 from camp_envios e join camp_contatos k on k.id = e.contato_id
             where e.campanha = 'mood_alunos_2026' and e.canal = 'whatsapp' and e.etapa = 1 and tel8(k.telefone) = tel8(v_tel)) then return; end if;
  select k.id, k.wpp_onda into v_id, v_onda from camp_contatos k where k.campanha = 'mood_alunos_2026' and lower(k.email) = p_email;
  if v_id is null then
    insert into camp_contatos (campanha, email, telefone, nome, segmento, lote, wpp_onda, wpp_liberar_em, optin_origem)
    values ('mood_alunos_2026', p_email, v_tel, public._primeiro_nome(v_nome, p_email), 'B', -5, 50, now(), 'perfil-bonito')
    on conflict (campanha, email) do nothing;
  elsif v_onda is null or v_onda in (99) or v_onda > 2 then
    update camp_contatos set wpp_onda = 50, wpp_liberar_em = now(), telefone = coalesce(telefone, v_tel) where id = v_id and wpp_onda is distinct from 50;
  end if;
end $$;
revoke all on function public.mood_bonito_entra(text) from public, anon, authenticated;

create or replace function public.mood_bonito_gatilho() returns trigger
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
begin
  if new.respondido_em is not null and 'bonito' = any(new.ajuda) then perform public.mood_bonito_entra(new.email); end if;
  return new;
exception when others then return new;   -- nunca atrapalha a resposta do aluno
end $$;
drop trigger if exists mood_bonito on public.perfil_aluno;
create trigger mood_bonito after insert or update of ajuda, respondido_em on public.perfil_aluno
  for each row execute function public.mood_bonito_gatilho();

-- quem já respondeu
select public.mood_bonito_entra(p.email) from public.perfil_aluno p where p.respondido_em is not null and 'bonito' = any(p.ajuda);

-- conferência: quantos estão na lista e quantos estariam aptos hoje
select
  (select count(*) from perfil_aluno where respondido_em is not null and 'bonito' = any(ajuda)) as marcaram_bonito,
  (select count(*) from camp_contatos where campanha = 'mood_alunos_2026' and wpp_onda = 50) as na_lista,
  (select count(*) from camp_contatos k where k.campanha = 'mood_alunos_2026' and k.wpp_onda = 50 and not k.teste
     and k.excluido is null and not k.optout and not k.comprou and k.telefone ~ '^55\d{10,11}$'
     and not exists (select 1 from wpp_optout o where tel8(o.telefone) = tel8(k.telefone))
     and not exists (select 1 from licenses l where lower(l.email) = lower(k.email) and l.pack_id = 'fl-lut' and l.status = 'active')
     and not exists (select 1 from webhook_events w where lower(w.email) = lower(k.email) and w.status in ('refunded', 'chargedback'))
     and not public._oferta_bloqueada(k.telefone, 'mood_alunos_2026', true)) as aptos_hoje;
