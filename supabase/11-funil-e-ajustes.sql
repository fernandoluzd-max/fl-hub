-- Base FL — tudo que foi rodado no SQL Editor depois do arquivo 10, reunido num lugar só.
-- Serve como registro. Pode rodar de novo sem problema.

-- Mood (ferramenta de cor): pacote e página de vendas
-- (só cria se ainda não existir; não mexe no que já está cadastrado)
insert into public.packs (id, name, version, file_path, active) values
  ('fl-sons', 'Efeitos Sonoros', '1.0.0', 'fl-sons/efeitos-sonoros.flpack', true),
  ('fl-luts', 'LUTs',            '1.0.0', 'fl-luts/luts.flpack',            true),
  ('fl-lut',  'Mood',            '1.0.0', 'web/lut',                        true)
on conflict (id) do nothing;
update public.packs set name = 'Mood' where id = 'fl-lut';
update public.packs set buy_url = 'https://basefl.com/conheca/mood/?de=app' where id = 'fl-lut';

-- Nomes atuais dos produtos
update public.packs set name = 'Títulos Dinâmicos' where id = 'fl-legendas';
update public.packs set name = 'Base Demandas'     where id = 'fl-painel';
update public.packs set buy_url = 'https://basefl.com/conheca/legendas/?de=app' where id = 'fl-legendas';

-- O que cada produto da Greenn libera
insert into public.products (greenn_product_id, name, pack_ids) values
  ('195639', 'Títulos Dinâmicos (com Efeitos Sonoros e LUTs de bônus)', '{fl-legendas,fl-sons,fl-luts}'),
  ('195947', 'Mood',           '{fl-lut}'),
  ('195949', 'Kit Freelancer', '{fl-preco,fl-contrato,fl-briefing,fl-painel}')
on conflict (greenn_product_id) do update set name = excluded.name, pack_ids = excluded.pack_ids;

-- Bônus para quem já tinha comprado os títulos antes de eles virarem kit
insert into public.licenses (email, pack_id, status, source, expires_at)
select l.email, b.pack_id, 'active', 'bonus', l.expires_at
from public.licenses l cross join (values ('fl-sons'), ('fl-luts')) as b(pack_id)
where l.pack_id = 'fl-legendas' and l.status = 'active'
on conflict (email, pack_id) do nothing;

-- Modelo para cadastrar uma aula (troque os textos e o nome do arquivo)
-- insert into public.aulas (pack_id, titulo, descricao, url, duracao, ordem)
-- values ('fl-legendas', 'Instalando os Títulos Dinâmicos', 'Do download ao primeiro título no CapCut.', 'https://aulas.basefl.com/titulos-01-instalando.mp4', '4 min', 1);
