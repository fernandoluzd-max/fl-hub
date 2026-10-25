-- ============================================================
-- 62 · 4 Camadas (RASCUNHO — NÃO EXECUTADO)
-- ------------------------------------------------------------
-- Uma compra na Greenn libera os 4 packs: Títulos, Efeitos Sonoros, LUTs e Base FL Assets.
-- Mesmo mecanismo do Kit Freelancer (products.pack_ids com vários packs).
--
-- ANTES DE RODAR:
--   1) criar o produto "4 Camadas" na Greenn e trocar 'ID_GREENN_4_CAMADAS' pelo número real;
--   2) conferir se os 4 packs estão marcados como vitalícios (consulta no fim);
--   3) testar com uma venda de teste num e-mail de teste.
-- Pode rodar mais de uma vez: não duplica. Não libera nada para ninguém sozinho.
-- ============================================================

insert into public.products (greenn_product_id, name, pack_ids)
values ('ID_GREENN_4_CAMADAS', '4 Camadas', '{fl-legendas,fl-sons,fl-luts,fl-assets}')
on conflict (greenn_product_id) do update set name = excluded.name, pack_ids = excluded.pack_ids;

-- Conferência: os 4 packs existem, estão ativos e são vitalícios?
select id, name, version, active, vitalicio from public.packs
where id in ('fl-legendas', 'fl-sons', 'fl-luts', 'fl-assets') order by id;
