-- ============================================================
-- 68 · LEADS (lista de interessados das páginas de venda)
-- Guarda nome, celular e e-mail de quem deixa o contato numa página,
-- por exemplo quem clica em "Só edito no celular" no Base Captions.
--
-- Segurança:
--   • a tabela fica trancada: o site NÃO lê nem escreve nela direto;
--   • o site só chama a função salvar_lead, que valida e grava;
--   • só você (painel do Supabase / service role) vê a lista.
--
-- Rodar uma vez no SQL Editor. Pode rodar de novo sem estragar nada.
-- ============================================================

create table if not exists public.leads (
  id            bigserial primary key,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  nome          text,
  email         text not null,
  celular       text,
  origem        text not null,           -- de qual página veio (ex.: base-captions)
  motivo        text,                    -- por que deixou o contato (ex.: so-celular)
  vezes         int  not null default 1, -- quantas vezes mandou o formulário
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  unique (email, origem)
);

alter table public.leads enable row level security;
-- Sem nenhuma policy: visitante e aluno logado não leem nem gravam direto.

create or replace function public.salvar_lead(
  p_nome    text,
  p_email   text,
  p_celular text,
  p_origem  text,
  p_motivo  text  default null,
  p_utm     jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email   text := lower(btrim(coalesce(p_email, '')));
  v_nome    text := nullif(left(btrim(coalesce(p_nome, '')), 120), '');
  v_celular text := nullif(regexp_replace(coalesce(p_celular, ''), '\D', '', 'g'), '');
  v_origem  text := left(lower(btrim(coalesce(p_origem, ''))), 60);
begin
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or length(v_email) > 200 then
    raise exception 'email_invalido';
  end if;
  if v_origem !~ '^[a-z0-9-]{2,60}$' then
    raise exception 'origem_invalida';
  end if;
  if v_celular is not null and (length(v_celular) < 10 or length(v_celular) > 13) then
    raise exception 'celular_invalido';
  end if;

  insert into public.leads (nome, email, celular, origem, motivo,
                            utm_source, utm_medium, utm_campaign, utm_content, utm_term)
  values (v_nome, v_email, v_celular, v_origem, left(p_motivo, 60),
          left(p_utm->>'utm_source', 120), left(p_utm->>'utm_medium', 120),
          left(p_utm->>'utm_campaign', 120), left(p_utm->>'utm_content', 120),
          left(p_utm->>'utm_term', 120))
  on conflict (email, origem) do update
    set nome          = coalesce(excluded.nome, leads.nome),
        celular       = coalesce(excluded.celular, leads.celular),
        motivo        = coalesce(excluded.motivo, leads.motivo),
        vezes         = leads.vezes + 1,
        atualizado_em = now();
end;
$$;

revoke all on function public.salvar_lead(text, text, text, text, text, jsonb) from public;
grant execute on function public.salvar_lead(text, text, text, text, text, jsonb) to anon, authenticated;

-- ------------------------------------------------------------
-- Para ver a lista (cole no SQL Editor quando quiser):
--
--   select criado_em, nome, celular, email, origem, motivo, utm_campaign
--   from public.leads
--   order by criado_em desc;
--
-- Ou abra a tabela "leads" no Table Editor do Supabase
-- (dá para exportar em CSV pelo botão Export).
-- ------------------------------------------------------------
