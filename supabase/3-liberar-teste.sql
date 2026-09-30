-- Libera o pack Legendas para o SEU e-mail (teste). Troque o e-mail se quiser liberar outra pessoa na mão.
insert into public.licenses (email, pack_id, source)
values ('fernandoluzd@gmail.com', 'fl-legendas', 'manual')
on conflict (email, pack_id) do update set status = 'active';
