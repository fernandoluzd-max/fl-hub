-- ============================================================
-- 37 · Base FL Assets (Greenn 198176 · checkout https://payfast.greenn.com.br/kbncn9f)
-- ------------------------------------------------------------
-- Libera o Base FL Assets para quem comprar, do mesmo jeito dos outros produtos:
--   compra aprovada na Greenn -> greenn-webhook -> licença 'fl-assets' no e-mail da compra.
-- NÃO libera para ninguém agora: só cria o pacote, o vínculo com o produto da Greenn e a aula.
-- Pode rodar mais de uma vez: não duplica.
-- ============================================================

-- 1) O pacote. Fica INATIVO até o arquivo subir no Storage (packs › fl-assets › base-fl-assets.flpack).
--    Vitalício, como Efeitos Sonoros e LUTs (mesmo preço e mesmo tipo de produto).
insert into public.packs (id, name, version, file_path, active, buy_url, vitalicio)
values ('fl-assets', 'Base FL Assets', '1.0.0', 'fl-assets/base-fl-assets.flpack', false,
        'https://basefl.com/conheca/assets/?de=app', true)
on conflict (id) do nothing;

-- 2) O que o produto 198176 da Greenn libera
insert into public.products (greenn_product_id, name, pack_ids)
values ('198176', 'Base FL Assets', '{fl-assets}')
on conflict (greenn_product_id) do update set name = excluded.name, pack_ids = excluded.pack_ids;

-- 3) A aula (só quem tem o Base FL Assets assiste)
insert into public.aulas (pack_id, titulo, descricao, url, ordem, so_cliente)
select 'fl-assets', 'Como usar o Base FL Assets',
       'Do download à primeira animação por cima do seu vídeo.',
       'https://aulas.basefl.com/MOTION%20TUTORIAL.mp4', 1, true
where not exists (select 1 from public.aulas where pack_id = 'fl-assets' and url = 'https://aulas.basefl.com/MOTION%20TUTORIAL.mp4');

-- Conferência
select 'pack' as o_que, id as chave, name as nome, active::text as estado from public.packs where id = 'fl-assets'
union all select 'produto', greenn_product_id, name, array_to_string(pack_ids, ',') from public.products where greenn_product_id = '198176'
union all select 'aula', pack_id, titulo, ativo::text from public.aulas where pack_id = 'fl-assets';

-- ------------------------------------------------------------
-- DEPOIS (só quando o arquivo estiver no Storage e o app novo publicado):
-- update public.packs set active = true where id = 'fl-assets';
-- ------------------------------------------------------------
