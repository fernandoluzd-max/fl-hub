-- ============================================================
-- 26 · Títulos Dinâmicos: nomes e módulos das aulas no lugar certo
-- ------------------------------------------------------------
-- NÃO mexe em vídeo nem na ordem dos arquivos: só nos títulos e nos módulos.
--   Módulo 01 · Como instalar os presets     → Aula 01 (a aula de instalação que já existia)
--   Módulo 02 · Destrinchando as Legendas    → Aulas 02 a 06 (parte-01 a parte-05 = Na Prática • Parte 1 a 5)
--   Módulo 03 · Criando Legendas do Zero     → reservado, aparece como "Em breve"
-- Também cria a tabela "aulas_modulos": é nela que um módulo existe mesmo sem aula (para o "Em breve").
-- Pode rodar mais de uma vez.
--
-- AMANHÃ, PARA PÔR AS AULAS DO MÓDULO 03: cadastre cada aula na tabela "aulas" com
--   pack_id = fl-legendas · modulo = Criando Legendas do Zero · modulo_ordem = 3 · ordem = 7, 8, 9...
-- O "Em breve" some sozinho quando a primeira aula entrar.
-- ============================================================

create table if not exists public.aulas_modulos (
  pack_id    text not null references public.packs(id),
  ordem      int  not null,                 -- 1, 2, 3... (o mesmo número do modulo_ordem das aulas)
  nome       text not null,
  descricao  text,
  ativo      boolean not null default true,
  primary key (pack_id, ordem)
);
alter table public.aulas_modulos enable row level security;
drop policy if exists "modulos visiveis" on public.aulas_modulos;
create policy "modulos visiveis" on public.aulas_modulos for select to anon, authenticated using (ativo);
grant select on public.aulas_modulos to anon, authenticated;
grant all on public.aulas_modulos to service_role;

insert into public.aulas_modulos (pack_id, ordem, nome, descricao) values
  ('fl-legendas', 1, 'Como instalar os presets', 'Comece por aqui. Deixe tudo pronto no seu CapCut antes das aulas práticas.'),
  ('fl-legendas', 2, 'Destrinchando as Legendas', 'Aqui eu não só mostro os modelos: uso um por um num vídeo de verdade, pra você ver como escolher, adaptar e encaixar cada um na sua edição. Com dicas e truques pelo caminho.'),
  ('fl-legendas', 3, 'Criando Legendas do Zero', null)
on conflict (pack_id, ordem) do update set nome = excluded.nome, descricao = excluded.descricao, ativo = true;

-- Aula 01: a aula de instalação (o vídeo continua o mesmo)
update public.aulas set titulo = 'Como instalar os presets', modulo = 'Como instalar os presets', modulo_desc = null, modulo_ordem = 1, ordem = 1
 where pack_id = 'fl-legendas' and url = 'https://aulas.basefl.com/titulos-aula-01.mp4';

-- Aulas 02 a 06: as cinco práticas (cada vídeo continua onde estava; muda só o nome)
update public.aulas a set titulo = n.titulo, descricao = n.descricao, modulo = 'Destrinchando as Legendas', modulo_desc = null, modulo_ordem = 2, ordem = n.ordem
from (values
  ('https://aulas.basefl.com/parte-01.mp4', 2, 'Na Prática • Parte 1', null),
  ('https://aulas.basefl.com/parte-02.mp4', 3, 'Na Prática • Parte 2', 'Os primeiros textos, o estilo script e a palavra em destaque.'),
  ('https://aulas.basefl.com/parte-03.mp4', 4, 'Na Prática • Parte 3', 'Destaques de fala em duas linhas e a palavra que muda de cor.'),
  ('https://aulas.basefl.com/parte-04.mp4', 5, 'Na Prática • Parte 4', 'A parte dos números: a contagem animada e o título do “+70 modelos”.'),
  ('https://aulas.basefl.com/parte-05.mp4', 6, 'Na Prática • Parte 5', 'Os últimos títulos, a tela clara e a chamada final.')
) as n(url, ordem, titulo, descricao)
where a.pack_id = 'fl-legendas' and a.url = n.url;

select a.ordem as aula, a.modulo_ordem as modulo, a.modulo, a.titulo, split_part(a.url, '/', 4) as arquivo
from public.aulas a where a.pack_id = 'fl-legendas' and a.ativo order by a.modulo_ordem, a.ordem;
