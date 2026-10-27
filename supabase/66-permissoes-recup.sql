-- 66 · Permissões para as funções novas (recup-wpp e wa-inbound) lerem as chaves e registrarem os envios
grant select on public.central_config to service_role;
grant select, insert on public.wpp_enviados to service_role;
grant usage, select on sequence public.wpp_enviados_id_seq to service_role;
grant select on public.acesso_config to service_role;
select 'ok' as permissoes;
