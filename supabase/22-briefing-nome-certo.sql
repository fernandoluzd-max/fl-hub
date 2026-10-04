-- ============================================================
-- 22 · Briefing: cada pessoa chega com o nome que ela escreveu
-- ------------------------------------------------------------
-- O que acontecia: o briefing que chega pelo link procurava um cliente seu
-- com o MESMO WhatsApp. Se achava, usava o cadastro antigo, com o nome antigo.
-- Então "Fernando Luz", com o telefone que já tinha sido usado por "Carol",
-- aparecia na lista como "Carol".
--
-- Agora: pelo link, só reaproveita um cliente se o WhatsApp E o nome baterem.
-- Mesmo telefone com outro nome vira um cadastro novo, com o nome digitado.
-- Pode rodar mais de uma vez. Não apaga nada.
-- ============================================================

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
    if p_publico then
      -- veio pelo link: o telefone sozinho não basta, o nome tem que ser o mesmo
      select id into v_id from public.clientes
       where user_id = p_user and whatsapp = v_zap and v_nome is not null and lower(btrim(nome)) = lower(btrim(v_nome))
       order by criado_em limit 1;
    else
      select id into v_id from public.clientes where user_id = p_user and whatsapp = v_zap order by criado_em limit 1;
    end if;
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
revoke all on function public._cliente(uuid, jsonb, boolean) from public, anon, authenticated;

-- Conserta os briefings que já chegaram com o nome trocado:
-- o cliente já existia ANTES do briefing e o nome escrito no briefing é outro.
do $$
declare x record; v_cli uuid;
begin
  for x in
    select t.id, t.user_id, t.briefing
      from public.trabalhos t join public.clientes c on c.id = t.cliente_id
     where t.origem = 'briefing' and nullif(btrim(t.briefing ->> 'nome'), '') is not null
       and c.criado_em < t.criado_em
       and lower(btrim(c.nome)) <> lower(btrim(t.briefing ->> 'nome'))
  loop
    v_cli := public._cliente(x.user_id, jsonb_build_object('nome', x.briefing ->> 'nome', 'empresa', x.briefing ->> 'empresa',
               'whatsapp', x.briefing ->> 'whatsapp', 'email', x.briefing ->> 'email'), true);
    if v_cli is not null then
      update public.trabalhos set cliente_id = v_cli where id = x.id;
      perform public._sincroniza(x.id);
    end if;
  end loop;
end $$;
