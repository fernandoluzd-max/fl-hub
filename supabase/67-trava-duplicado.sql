-- 67 · Trava contra mensagem duplicada no WhatsApp.
-- Antes de enviar, a função "reserva" uma chave única (ex.: recup_pix_2:<tel8>). Se a chave já existe, não envia.
-- Se a conexão cair no meio, a reserva fica e a mensagem NÃO sai de novo. Só é liberada quando a Meta responde com erro claro (não enviou).
-- Também usada pelo wa-inbound: cada mensagem recebida (id da Meta) só é tratada uma vez, mesmo que a Meta reenvie o webhook.
create table if not exists public.wpp_trava (chave text primary key, criado_em timestamptz not null default now());
alter table public.wpp_trava enable row level security;
revoke all on public.wpp_trava from public, anon, authenticated;

create or replace function public.wpp_reservar(p_chave text) returns boolean
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
begin
  insert into wpp_trava (chave) values (p_chave) on conflict do nothing;
  return found;
end $$;

create or replace function public.wpp_liberar(p_chave text) returns void
language sql security definer set search_path to 'public', 'pg_temp' as $$ delete from wpp_trava where chave = p_chave $$;

revoke all on function public.wpp_reservar(text) from public, anon, authenticated;
revoke all on function public.wpp_liberar(text) from public, anon, authenticated;
grant execute on function public.wpp_reservar(text) to service_role;
grant execute on function public.wpp_liberar(text) to service_role;

-- quem já recebeu antes desta trava também fica reservado
insert into public.wpp_trava (chave)
  select distinct tipo || ':' || public.tel8(telefone) from public.wpp_enviados
  where tipo in ('recup_pix_2', 'recup_lead_madrugada') and status = 'enviado'
on conflict do nothing;

-- limpeza: chaves de mensagens recebidas e de testes com mais de 30 dias
do $x$
begin
  perform cron.unschedule('wpp-trava-limpa') where exists (select 1 from cron.job where jobname = 'wpp-trava-limpa');
  perform cron.schedule('wpp-trava-limpa', '17 4 * * *',
    $c$ delete from public.wpp_trava where (chave like 'in:%' or chave like 'teste_%' or chave like 'audio:%') and criado_em < now() - interval '30 days' $c$);
end $x$;

select public.wpp_reservar('teste_sql:ok') as primeira, public.wpp_reservar('teste_sql:ok') as segunda;
