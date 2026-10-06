-- ============================================================
-- 24 · Aula do Kit Freelancer (as quatro ferramentas, do início ao fim)
-- ------------------------------------------------------------
-- O mesmo vídeo aparece no botão "Ver aula" das quatro ferramentas do Kit:
-- Gerador de Briefing, Quanto Cobrar?, Gerador de Contrato e Base Demandas,
-- no site e no app. Só quem tem a ferramenta assiste.
-- Pode rodar mais de uma vez: não duplica.
-- ============================================================
insert into public.aulas (pack_id, titulo, descricao, url, ordem, so_cliente)
select p.pack_id, 'Kit Freelancer do início ao fim',
       'Um trabalho inteiro passando pelas quatro ferramentas: briefing, preço, contrato e organização.',
       'https://aulas.basefl.com/kit-freelancer.mp4', 1, true
from (values ('fl-briefing'), ('fl-preco'), ('fl-contrato'), ('fl-painel')) as p(pack_id)
where not exists (select 1 from public.aulas a where a.pack_id = p.pack_id and a.url = 'https://aulas.basefl.com/kit-freelancer.mp4');

select pack_id, titulo, ativo from public.aulas where url = 'https://aulas.basefl.com/kit-freelancer.mp4' order by pack_id;
