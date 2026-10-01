-- Pluga & Edita — cadastra a calculadora "Quanto Cobrar?" (cole no SQL Editor e clique em Run)
insert into public.packs (id, name, version, file_path, active)
values ('fl-preco', 'Quanto Cobrar?', '1.0.0', 'web/preco', true)
on conflict (id) do update set name = excluded.name, active = true;

-- Para testar você mesmo, libere para o seu e-mail (troque o e-mail se precisar):
insert into public.licenses (email, pack_id, status, source)
values ('fernandoluzd@gmail.com', 'fl-preco', 'active', 'manual')
on conflict (email, pack_id) do update set status = 'active';
