-- ============================================================
-- Pluga & Edita — banco de dados (cole tudo no SQL Editor e clique em Run)
-- Pode rodar de novo sem problema: não apaga nada que já exista.
-- ============================================================

-- 1) Packs disponíveis (o que aparece no app)
create table if not exists public.packs (
  id         text primary key,                 -- mesmo id do manifest do .flpack (ex.: fl-legendas)
  name       text not null,
  version    text not null default '1.0.0',
  file_path  text not null,                    -- caminho do arquivo dentro do armazenamento "packs"
  buy_url    text,                             -- link de compra (Greenn) para quem ainda não tem
  active     boolean not null default true
);

-- 2) Produtos da Greenn -> quais packs cada produto libera
create table if not exists public.products (
  greenn_product_id text primary key,          -- id do produto na Greenn (número)
  name              text,
  pack_ids          text[] not null default '{}'
);

-- 3) Licenças: quem pode instalar o quê
create table if not exists public.licenses (
  email      text not null,
  pack_id    text not null references public.packs(id) on update cascade,
  status     text not null default 'active' check (status in ('active','revoked')),
  source     text,                             -- greenn / manual
  sale_id    text,
  updated_at timestamptz not null default now(),
  primary key (email, pack_id)
);

-- 4) Registro de tudo que a Greenn mandou (para conferir e dar suporte)
create table if not exists public.webhook_events (
  id           bigserial primary key,
  received_at  timestamptz not null default now(),
  type         text,
  event        text,
  status       text,
  product_id   text,
  product_name text,
  email        text,
  sale_id      text,
  result       text
);

-- Segurança: tudo trancado por padrão
alter table public.packs          enable row level security;
alter table public.products       enable row level security;
alter table public.licenses       enable row level security;
alter table public.webhook_events enable row level security;

-- Aluno logado vê a lista de packs ativos...
drop policy if exists "packs visiveis" on public.packs;
create policy "packs visiveis" on public.packs
  for select to authenticated using (active);

-- ...e só as PRÓPRIAS licenças (pelo e-mail do login)
drop policy if exists "minhas licencas" on public.licenses;
create policy "minhas licencas" on public.licenses
  for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

grant select on public.packs, public.licenses to authenticated;
revoke all on public.products, public.webhook_events from anon, authenticated;

-- E-mails sempre em minúsculas
create or replace function public.lower_email() returns trigger language plpgsql as $$
begin new.email := lower(trim(new.email)); new.updated_at := now(); return new; end $$;
drop trigger if exists licenses_lower on public.licenses;
create trigger licenses_lower before insert or update on public.licenses
  for each row execute function public.lower_email();

-- 5) Armazenamento PRIVADO dos arquivos .flpack
insert into storage.buckets (id, name, public)
values ('packs', 'packs', false)
on conflict (id) do update set public = false;

-- Só baixa quem tem licença ativa daquele pack (o link gerado vale 2 minutos)
drop policy if exists "baixar pack licenciado" on storage.objects;
create policy "baixar pack licenciado" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'packs'
    and exists (
      select 1 from public.licenses l
      join public.packs p on p.id = l.pack_id
      where p.file_path = storage.objects.name
        and l.status = 'active'
        and lower(l.email) = lower(auth.jwt() ->> 'email')
    )
  );

-- 6) Primeiro pack cadastrado
insert into public.packs (id, name, version, file_path)
values ('fl-legendas', 'Legendas', '1.0.0', 'fl-legendas/legendas.flpack')
on conflict (id) do nothing;
