-- 29 · Efeitos Sonoros 1.3.0: 261 efeitos em 14 pastas, nomes "Base FL - ..."
-- Rode DEPOIS de trocar o arquivo no Storage (packs › fl-sons › efeitos-sonoros.flpack).
-- Só avisa o app que existe versão nova: quem já instalou vê o botão "Atualizar".
update public.packs set version = '1.3.0' where id = 'fl-sons';
select id, name, version, file_path from public.packs where id = 'fl-sons';
