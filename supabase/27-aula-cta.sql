-- ============================================================
-- 27 · Botão de oferta dentro de uma aula (aparece só no fim do vídeo)
-- ------------------------------------------------------------
-- Qualquer aula pode ter um botão: basta preencher, na tabela "aulas",
--   cta_texto     o que está escrito no botão
--   cta_url       para onde ele leva  (VAZIO = o botão não aparece)
--   cta_segundos  quantos segundos antes do fim ele aparece (60 = último minuto)
--   cta_inicio    OU o segundo exato do vídeo em que ele aparece (760 = 12:40). Preenchido, vale este.
--   cta_pack      se a pessoa já tem este produto, o botão não aparece para ela
-- Aqui ele entra na ÚLTIMA aula prática dos Títulos (parte-05), para o Pack de Efeitos Sonoros.
-- Pode rodar mais de uma vez.
-- ============================================================
alter table public.aulas add column if not exists cta_texto    text;
alter table public.aulas add column if not exists cta_url      text;
alter table public.aulas add column if not exists cta_segundos int not null default 60;
alter table public.aulas add column if not exists cta_pack     text;
alter table public.aulas add column if not exists cta_inicio   int;

-- Última aula prática dos Títulos (parte-05): o botão aparece aos 12:40, quando o Fernando fala do pack, e leva ao checkout dos Efeitos Sonoros (R$ 17).
update public.aulas set cta_texto = 'Quero o Pack de Efeitos Sonoros', cta_pack = 'fl-sons', cta_inicio = 760, cta_segundos = 60,
       cta_url = 'https://payfast.greenn.com.br/195814/offer/ZxTsRT?utm_source=basefl&utm_medium=aula&utm_campaign=titulos-aula-06'
 where pack_id = 'fl-legendas' and url = 'https://aulas.basefl.com/parte-05.mp4';

-- PARA TROCAR O DESTINO OU O MOMENTO (ex.: mandar para a página de vendas em vez do checkout):
-- update public.aulas set cta_url = 'https://basefl.com/conheca/efeitos-sonoros/?de=aula', cta_inicio = 760 where url = 'https://aulas.basefl.com/parte-05.mp4';

select titulo, cta_texto, cta_url, cta_inicio, cta_segundos, cta_pack from public.aulas where cta_texto is not null;
