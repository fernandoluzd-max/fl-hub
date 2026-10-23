-- 60 · Central: respostas do perfil ao vivo + acompanhamento do disparo do Kit Freelancer (perfil quente)
-- Só leitura. Mesma porta da Central (central_acesso).

create or replace function public._perfil_nome(p_email text) returns text
language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select coalesce(
    (select a.nome from public.acesso_wpp a where lower(a.email) = p_email and a.nome is not null order by a.id desc limit 1),
    (select public._primeiro_nome(k.nome, p_email) from public.camp_contatos k where lower(k.email) = p_email and k.nome is not null order by k.id desc limit 1),
    public._primeiro_nome(null, p_email)) $$;
revoke all on function public._perfil_nome(text) from public, anon, authenticated;

create or replace function public.central_perfis() returns jsonb
language plpgsql stable security definer set search_path to 'public', 'pg_temp' as $$
declare v jsonb;
begin
  if not exists (select 1 from public.central_acesso a where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))) then
    raise exception 'sem_acesso' using errcode = '42501';
  end if;
  with kit as (
    select k.id, k.email, k.nome, k.wpp_liberar_em, k.criado_em,
           e.status as envio, e.criado_em as enviado_em,
           exists (select 1 from public.camp_cliques c where c.contato_id = k.id and c.origem = 'whatsapp-audio') as tocou,
           exists (select 1 from public.camp_cliques c where c.contato_id = k.id and c.origem = 'whatsapp-abriu') as abriu,
           exists (select 1 from public.webhook_events w where lower(w.email) = lower(k.email) and w.product_id = '195949'
                     and w.status = 'paid' and w.received_at >= coalesce(e.criado_em, k.criado_em)) as comprou,
           exists (select 1 from public.wpp_optout o where public.tel8(o.telefone) = public.tel8(k.telefone)
                     and o.criado_em >= coalesce(e.criado_em, k.criado_em)) as saiu
    from public.camp_contatos k
    left join lateral (select e.status, e.criado_em from public.camp_envios e
                       where e.contato_id = k.id and e.canal = 'whatsapp' and e.etapa = 1 order by e.id desc limit 1) e on true
    where k.campanha = 'kit_freelancer' and coalesce(k.segmento, '') <> 'T' and k.excluido is null
  )
  select jsonb_build_object(
    'resumo', jsonb_build_object(
      'responderam', (select count(*) from public.perfil_aluno where respondido_em is not null),
      'pularam', (select count(*) from public.perfil_aluno where respondido_em is null and pulos > 0),
      'quente', (select count(*) from public.perfil_aluno where segmento = 'quente'),
      'morno', (select count(*) from public.perfil_aluno where segmento = 'morno'),
      'frio', (select count(*) from public.perfil_aluno where segmento = 'frio')),
    'quem', coalesce((select jsonb_object_agg(quem, n) from (select quem, count(*) n from public.perfil_aluno where respondido_em is not null group by 1) s), '{}'),
    'editor', coalesce((select jsonb_object_agg(editor, n) from (select editor, count(*) n from public.perfil_aluno where respondido_em is not null group by 1) s), '{}'),
    'ajuda', coalesce((select jsonb_object_agg(a, n) from (select a, count(*) n from public.perfil_aluno, unnest(ajuda) a where respondido_em is not null group by 1) s), '{}'),
    'lista', coalesce((select jsonb_agg(to_jsonb(l) order by l.respondido_em desc) from public.perfil_listas l), '[]'),
    -- últimas 40 respostas e "responder depois", mais recentes primeiro
    'feed', coalesce((select jsonb_agg(f order by f.em desc) from (
        select coalesce(p.respondido_em, p.ultimo_pulo) as em, case when p.respondido_em is not null then 'respondeu' else 'pulou' end as t,
               public._perfil_nome(p.email) as nome, p.email, p.segmento, p.quem, p.editor, array_to_string(p.ajuda, ', ') as ajuda, p.app
        from public.perfil_aluno p where coalesce(p.respondido_em, p.ultimo_pulo) is not null
        order by coalesce(p.respondido_em, p.ultimo_pulo) desc limit 40) f), '[]'),
    -- disparo do Kit Freelancer
    'kit', jsonb_build_object(
      'ligado', (select coalesce(c.wpp_pos_compra, false) and not coalesce(c.pausado, false) from public.camp_config c where c.id = 'kit_freelancer'),
      'pausa_motivo', (select c.pausa_motivo from public.camp_config c where c.id = 'kit_freelancer' and c.pausado),
      'na_fila', (select count(*) from kit where envio is null),
      'enviados', (select count(*) from kit where envio is not null and envio not in ('reservado', 'falhou')),
      'entregues', (select count(*) from kit where envio in ('entregue', 'lido')),
      'lidos', (select count(*) from kit where envio = 'lido'),
      'tocaram', (select count(*) from kit where tocou),
      'abriram', (select count(*) from kit where abriu),
      'compraram', (select count(*) from kit where comprou),
      'sairam', (select count(*) from kit where saiu),
      'falharam', (select count(*) from kit where envio = 'falhou'),
      'lista', coalesce((select jsonb_agg(jsonb_build_object('nome', coalesce(kit.nome, public._perfil_nome(lower(kit.email))), 'email', kit.email,
                 'envia_em', kit.wpp_liberar_em, 'envio', kit.envio, 'enviado_em', kit.enviado_em,
                 'tocou', kit.tocou, 'abriu', kit.abriu, 'comprou', kit.comprou, 'saiu', kit.saiu)
                 order by coalesce(kit.enviado_em, kit.wpp_liberar_em) desc) from kit), '[]'))
  ) into v;
  return v;
end $$;
revoke all on function public.central_perfis() from public, anon;
grant execute on function public.central_perfis() to authenticated;

select 'ok' as central_perfis;
