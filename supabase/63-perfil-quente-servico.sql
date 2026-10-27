-- 63 · Lista quente = quem pediu ajuda com qualquer parte da prestação de serviço
-- (cobrar e orçar, organizar clientes, conseguir clientes), não importa para quem edita hoje.
-- É exatamente o que o Kit Freelancer resolve: briefing, preço, proposta, contrato e organização das demandas.
-- Quem muda para quente entra sozinho na fila do Kit (gatilho kit_perfil), com as mesmas regras de 24 h e 7 dias.

create or replace function public._perfil_segmento(p_quem text, p_ajuda text[]) returns text
language sql immutable as $$
  select case
    when p_ajuda && array['cobrar', 'organizar', 'clientes'] then 'quente'
    when p_quem in ('clientes', 'agencia', 'aprendendo') then 'morno'
    else 'frio' end $$;

-- reclassifica quem já respondeu
update public.perfil_aluno
   set segmento = public._perfil_segmento(quem, ajuda), atualizado_em = now()
 where respondido_em is not null and segmento is distinct from public._perfil_segmento(quem, ajuda);

select segmento, count(*) from public.perfil_aluno where respondido_em is not null group by 1 order by 1;
