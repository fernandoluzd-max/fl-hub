-- 59 · Kit Freelancer automático: quem responde no app que atende clientes (lista quente) recebe a oferta no WhatsApp 24 h depois.
-- Liga/desliga: camp_config 'kit_freelancer' (wpp_pos_compra = ligado; pausado = parado). Desligado, só sai para contatos de teste (segmento 'T').
-- Nunca manda para: quem já tem o Kit (e-mail ou telefone), quem pediu para sair, quem já recebeu,
-- quem recebeu outra oferta de WhatsApp nos últimos 7 dias (espera e manda depois). Só das 8h às 22h59, no máximo 30 por dia.
-- Freio: se 5 envios seguidos falharem, ou se 25% ou mais dos últimos 20 pedirem para sair, a campanha pausa sozinha (pausa_motivo diz por quê).

insert into public.camp_config (id, produto_greenn, pausado, wpp_pos_compra, pagina)
values ('kit_freelancer', '195949', false, false, 'https://basefl.com/conheca/kit-freelancer/')
on conflict (id) do nothing;

-- 1) resposta quente -> entra na fila do Kit (24 h depois)
create or replace function public.kit_perfil_enfileira() returns trigger
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare v_tel text; v_nome text;
begin
  if new.segmento is distinct from 'quente' or new.respondido_em is null then return new; end if;
  if exists (select 1 from public.webhook_events w where lower(w.email) = new.email and w.product_id = '195949' and w.status = 'paid') then return new; end if;
  -- telefone e primeiro nome: mensagem de acesso (Greenn e Kiwify), depois vendas da Greenn, depois outras campanhas
  select a.telefone, a.nome into v_tel, v_nome from public.acesso_wpp a
   where lower(a.email) = new.email and a.telefone ~ '^55\d{10,11}$' order by a.id desc limit 1;
  if v_tel is null then
    select public._tel_br(w.telefone) into v_tel from public.webhook_events w
     where lower(w.email) = new.email and w.telefone is not null order by w.received_at desc limit 1;
  end if;
  if v_tel is null or v_nome is null then
    select coalesce(v_tel, k.telefone), coalesce(v_nome, k.nome) into v_tel, v_nome from public.camp_contatos k
     where lower(k.email) = new.email and k.telefone ~ '^55\d{10,11}$' order by k.id desc limit 1;
  end if;
  if v_tel is null or v_tel !~ '^55\d{10,11}$' then return new; end if;
  insert into public.camp_contatos (campanha, email, telefone, nome, segmento, lote, wpp_onda, wpp_liberar_em, optin_origem)
  values ('kit_freelancer', new.email, v_tel, public._primeiro_nome(v_nome, new.email), 'Q', -4, 99, now() + interval '24 hours', 'perfil-app')
  on conflict (campanha, email) do nothing;
  return new;
end $$;
drop trigger if exists kit_perfil on public.perfil_aluno;
create trigger kit_perfil after insert or update of segmento, respondido_em on public.perfil_aluno
  for each row execute function public.kit_perfil_enfileira();

-- 2) fila de envio (chamada pelo camp a cada 5 min)
create or replace function public.camp_fila_kit(p_qtd int)
returns table(envio_id bigint, telefone text, nome text)
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
#variable_conflict use_column
declare hora int; hoje int; ligado boolean; seguidas int; saiu numeric;
begin
  select not coalesce(c.pausado, false) and coalesce(c.wpp_pos_compra, false) into ligado from public.camp_config c where c.id = 'kit_freelancer';
  ligado := coalesce(ligado, false);
  hora := extract(hour from now() at time zone 'America/Sao_Paulo');
  if hora not between 8 and 22 then return; end if;

  -- freio automático (só olha envios reais, não os de teste)
  if ligado then
    select count(*) into seguidas from (
      select e.status from public.camp_envios e join public.camp_contatos k on k.id = e.contato_id
      where e.campanha = 'kit_freelancer' and e.canal = 'whatsapp' and e.etapa = 1 and k.segmento <> 'T' and e.status <> 'reservado'
      order by e.id desc limit 5) u where u.status = 'falhou';
    if seguidas >= 5 then
      update public.camp_config set pausado = true, pausa_motivo = 'freio: 5 envios seguidos falharam' where id = 'kit_freelancer';
      return;
    end if;
    select avg(case when exists (select 1 from public.wpp_optout o where public.tel8(o.telefone) = public.tel8(u.telefone) and o.criado_em >= u.criado_em) then 1 else 0 end)
      into saiu from (
      select k.telefone, e.criado_em from public.camp_envios e join public.camp_contatos k on k.id = e.contato_id
      where e.campanha = 'kit_freelancer' and e.canal = 'whatsapp' and e.etapa = 1 and k.segmento <> 'T' and e.status <> 'falhou'
      order by e.id desc limit 20) u having count(*) >= 20;
    if coalesce(saiu, 0) >= 0.25 then
      update public.camp_config set pausado = true, pausa_motivo = 'freio: 25% ou mais dos últimos 20 pediram para sair' where id = 'kit_freelancer';
      return;
    end if;
  end if;

  select count(*) into hoje from public.camp_envios e
  where e.campanha = 'kit_freelancer' and e.canal = 'whatsapp' and e.etapa = 1
    and (e.criado_em at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date;
  if hoje >= 30 then return; end if;

  return query
  with alvo as (
    select k.id, k.telefone, k.nome from public.camp_contatos k
    where k.campanha = 'kit_freelancer' and k.wpp_liberar_em <= now()
      and (ligado or k.segmento = 'T')
      and k.excluido is null and not k.optout and not k.comprou
      and k.telefone ~ '^55\d{10,11}$'
      and not exists (select 1 from public.wpp_optout o where public.tel8(o.telefone) = public.tel8(k.telefone))
      and (k.segmento = 'T' or not exists (select 1 from public.webhook_events w where w.product_id = '195949' and w.status = 'paid'
                      and (lower(w.email) = lower(k.email) or public.tel8(w.telefone) = public.tel8(k.telefone))))
      and not exists (select 1 from public.camp_envios e where e.contato_id = k.id and e.canal = 'whatsapp' and e.etapa = 1)
      and (k.segmento = 'T' or not exists (select 1 from public.camp_envios e join public.camp_contatos k2 on k2.id = e.contato_id
                      where e.campanha = 'kit_freelancer' and e.canal = 'whatsapp' and e.etapa = 1 and public.tel8(k2.telefone) = public.tel8(k.telefone)))
      -- intervalo entre ofertas: nenhuma outra mensagem de oferta nos últimos 7 dias
      and (k.segmento = 'T' or not exists (select 1 from public.camp_envios e join public.camp_contatos k2 on k2.id = e.contato_id
                      where e.canal = 'whatsapp' and e.status <> 'falhou' and e.criado_em > now() - interval '7 days'
                        and public.tel8(k2.telefone) = public.tel8(k.telefone)))
    order by k.wpp_liberar_em, k.id
    limit least(p_qtd, 30 - hoje)
    for update of k skip locked
  ), ins as (
    insert into public.camp_envios (campanha, contato_id, canal, etapa, variante, status)
    select 'kit_freelancer', a.id, 'whatsapp', 1, 'texto', 'reservado' from alvo a
    on conflict do nothing
    returning id, contato_id
  )
  select ins.id, a.telefone, a.nome from ins join alvo a on a.id = ins.contato_id;
end $$;
revoke all on function public.camp_fila_kit(int) from public, anon, authenticated;
grant execute on function public.camp_fila_kit(int) to service_role;

-- 3) central: nome do disparo e compra certa (Kit = 195949)
do $x$
declare d text;
begin
  select pg_get_functiondef('public.central_wpp(timestamptz,timestamptz,boolean)'::regprocedure) into d;
  if position('Kit Freelancer (perfil)' in d) = 0 then
    d := replace(d, 'case when k.campanha = ''titulos_ra'' then', 'case when k.campanha = ''kit_freelancer'' then ''Kit Freelancer (perfil)'' when k.campanha = ''titulos_ra'' then');
    d := replace(d, '(case when p.camp = ''Reels Academy → Títulos'' then ''195639'' else ''195947'' end)',
                    '(case when p.camp = ''Reels Academy → Títulos'' then ''195639'' when p.camp = ''Kit Freelancer (perfil)'' then ''195949'' else ''195947'' end)');
    execute d;
  end if;
end $x$;

select (select count(*) from camp_config where id = 'kit_freelancer') as campanha,
       pg_get_functiondef('public.central_wpp(timestamptz,timestamptz,boolean)'::regprocedure) like '%Kit Freelancer (perfil)%' as central_ok;
