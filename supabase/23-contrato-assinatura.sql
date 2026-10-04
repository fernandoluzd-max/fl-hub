-- ============================================================
-- 23 · Contrato: o editor assina ANTES de enviar para o cliente
-- ------------------------------------------------------------
-- Ao gerar o link, o editor confirma o nome dele e assina.
-- A assinatura (nome, data e hora do servidor) fica guardada dentro do contrato,
-- e o cliente vê que o contratado já assinou antes de assinar a parte dele.
-- A data e a hora são sempre as do servidor: ninguém consegue inventar.
-- Pode rodar mais de uma vez. Não apaga nada.
-- ============================================================
create or replace function public.contrato_publicar(p_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid(); v_id uuid := p_id; v_cli uuid; j jsonb := p -> 'contrato'; v_limpa jsonb; v_cl jsonb; t public.trabalhos;
  v_ass text := public._txt(p -> 'assinatura', 'nome', 80);
begin
  if v_uid is null then raise exception 'Entre na sua conta para continuar.' using errcode = '28000'; end if;
  if not public._tem(v_uid, 'fl-contrato') then raise exception 'Enviar contrato faz parte do Gerador de Contrato.' using errcode = '42501'; end if;
  if p is null or j is null or jsonb_typeof(j) <> 'object' or pg_column_size(p) > 40000 then raise exception 'Dados inválidos.' using errcode = '22023'; end if;
  if v_ass is null or length(v_ass) < 5 then raise exception 'Assine o contrato com o seu nome completo antes de enviar.' using errcode = '22023'; end if;
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
    'clausulas', v_cl, 'local_data', public._txt(j, 'local_data', 120),
    'assinado', jsonb_build_object('nome', v_ass, 'em', now())));
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
    contrato = v_limpa, contrato_token = gen_random_uuid(),   -- link novo a cada envio: as assinaturas valem para o texto que foi lido
    contrato_status = 'enviado', contrato_em = now(), contrato_aceite = null,
    etapa = 'contrato', atualizado_em = now()
  where id = v_id and user_id = v_uid returning * into t;
  if not found then raise exception 'Trabalho não encontrado.' using errcode = '42501'; end if;
  perform public._sincroniza(v_id);
  insert into public.eventos (nome, pack_id, user_id) values ('contract_created', 'fl-contrato', v_uid);
  return jsonb_build_object('id', v_id, 'token', t.contrato_token);
end $$;
revoke all on function public.contrato_publicar(uuid, jsonb) from public, anon;
grant execute on function public.contrato_publicar(uuid, jsonb) to authenticated;
