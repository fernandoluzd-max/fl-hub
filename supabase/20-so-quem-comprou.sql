-- Base FL — o código de acesso só é enviado para e-mail que tem compra
-- Cole no SQL Editor do Supabase e clique em Run. Pode rodar de novo sem problema.
--
-- Por quê: qualquer visitante podia digitar um e-mail em "Entrar" e gastar um envio de e-mail.
-- Agora o site e o app perguntam primeiro "esse e-mail tem alguma compra?". Se não tem, nada é enviado.
-- A resposta é só sim ou não: não mostra o que foi comprado, nem quando.

create or replace function public.pub_tem_compra(p_email text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.licenses l where l.email = lower(btrim(coalesce(p_email, ''))));
$$;
revoke execute on function public.pub_tem_compra(text) from public;
grant execute on function public.pub_tem_compra(text) to anon, authenticated;

-- conferência: deve responder "true" para o seu e-mail
select public.pub_tem_compra('fernandoluzd@gmail.com') as meu_email_tem_compra;
