-- Pluga & Edita — cadastra o "Gerador de Contrato" (cole no SQL Editor e clique em Run)
insert into public.packs (id, name, version, file_path, active)
values ('fl-contrato', 'Gerador de Contrato', '1.0.0', 'web/contrato', true)
on conflict (id) do update set name = excluded.name, active = true;

-- Libera para o seu e-mail testar:
insert into public.licenses (email, pack_id, status, source)
values ('fernandoluzd@gmail.com', 'fl-contrato', 'active', 'manual')
on conflict (email, pack_id) do update set status = 'active';

-- Remove o "Kit Freelancer" antigo, caso tenha sido cadastrado:
delete from public.licenses where pack_id = 'fl-kit';
delete from public.packs where id = 'fl-kit';
