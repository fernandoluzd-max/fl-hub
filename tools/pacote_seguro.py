"""Deixa as predefinições de um pacote autossuficientes antes de empacotar.

Problema que resolve: quando uma predefinição cita um arquivo que só existe no computador de quem criou
(música do cache do CapCut, arquivo de um projeto, capa de subprojeto, recurso de outro pacote), o aluno
vê "mídia perdida" na predefinição e, pior, nos projetos em que usou o título.

O que faz, numa CÓPIA das predefinições (a pasta original nunca é alterada):
  1. acha todo caminho absoluto de arquivo de mídia citado nos .json/.tmp/.bak;
  2. ignora o que o CapCut resolve sozinho (cache de efeitos, baixado de novo pelo id), fontes
     (tratadas pelo instalador) e o marcador __PLUGA_UD__;
  3. copia cada arquivo citado para resources/ com nome pelo conteúdo (basefl-<sha1>.<ext>) e troca a
     referência por __PLUGA_UD__/Presets/Combination/Resources/basefl-<sha1>.<ext>, que o app Base FL
     converte para a pasta do aluno na instalação;
  4. capa de subprojeto (draft_cover.jpg) que não existe mais: a referência fica vazia (o CapCut gera
     outra capa; não é mídia do vídeo);
  5. se outra mídia citada não existir neste computador, para e lista (a não ser com permitir_faltando).

Nome pelo conteúdo = o mesmo arquivo tem sempre o mesmo nome em todas as versões do pacote, e o app
nunca apaga recurso numa atualização: projetos feitos com versões antigas continuam achando a mídia.
"""
import hashlib, json, os, re, shutil

MARCADOR = "__PLUGA_UD__/Presets/Combination/Resources/"
EXT_MIDIA = {"mp3", "wav", "m4a", "aac", "ogg", "flac", "mp4", "mov", "m4v", "webm", "png", "jpg", "jpeg", "gif", "webp", "heic"}
RE_CAMINHO = re.compile(r'"((?:/|[A-Za-z]:/)[^"\\]+\.([A-Za-z0-9]{2,5}))"')


def classificar(caminho):
    if "/Cache/effect/" in caminho:
        return "cache_efeito"  # o CapCut baixa de novo pelo id do efeito
    if "/Cache/music/" in caminho:
        return "musica_cache"
    if caminho.endswith("draft_cover.jpg"):
        return "capa_subprojeto"
    if "/Projects/" in caminho:
        return "projeto_criador"
    if "CapCut.app" in caminho or "/CapCut/Apps/" in caminho:
        return "aplicativo_capcut"
    if "/Presets/" in caminho:
        return "outro_pacote"
    return "outro"


def sha1(p):
    h = hashlib.sha1()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def localizar(caminho, raizes_extra):
    """O arquivo citado, neste computador. raizes_extra: pares (prefixo_original, prefixo_local)."""
    if os.path.isfile(caminho):
        return caminho
    for de, para in raizes_extra:
        if caminho.startswith(de):
            alt = para + caminho[len(de):]
            if os.path.isfile(alt):
                return alt
    return None


def preparar(presets_src, destino, permitir_faltando=False, raizes_extra=()):
    """Copia presets_src para destino/presets e embute os arquivos em destino/resources.
    Devolve o relatório (dict). Lança SystemExit se faltar arquivo e permitir_faltando=False."""
    presets = os.path.join(destino, "presets")
    recursos = os.path.join(destino, "resources")
    if os.path.exists(destino):
        shutil.rmtree(destino)
    shutil.copytree(presets_src, presets, ignore=shutil.ignore_patterns(".DS_Store", "._*"))
    os.makedirs(recursos, exist_ok=True)
    rel = {"por_tipo": {}, "embutidos": {}, "faltando": [], "capas_zeradas": [], "arquivos_alterados": 0}
    trocas = {}  # caminho original -> marcador novo
    for raiz, _, arqs in os.walk(presets):
        for a in arqs:
            if not a.endswith((".json", ".tmp", ".bak")):
                continue
            p = os.path.join(raiz, a)
            txt = open(p, encoding="utf-8", errors="surrogateescape").read()
            novo = txt
            for m in RE_CAMINHO.finditer(txt):
                caminho, ext = m.group(1), m.group(2).lower()
                if ext not in EXT_MIDIA or "__PLUGA_UD__" in caminho:
                    continue
                tipo = classificar(caminho)
                rel["por_tipo"][tipo] = rel["por_tipo"].get(tipo, 0) + 1
                if tipo == "cache_efeito":
                    continue
                if caminho not in trocas:
                    local = localizar(caminho, raizes_extra)
                    if not local and tipo == "capa_subprojeto":
                        trocas[caminho] = ""
                        rel["capas_zeradas"].append(caminho)
                    elif not local:
                        if caminho not in rel["faltando"]:
                            rel["faltando"].append(caminho)
                        continue
                    if local:
                        nome = f"basefl-{sha1(local)[:20]}.{ext}"
                        alvo = os.path.join(recursos, nome)
                        if not os.path.exists(alvo):
                            shutil.copy2(local, alvo)
                        trocas[caminho] = MARCADOR + nome
                        rel["embutidos"][nome] = caminho
                novo = novo.replace(f'"{caminho}"', f'"{trocas[caminho]}"')
            if novo != txt:
                open(p, "w", encoding="utf-8", errors="surrogateescape").write(novo)
                rel["arquivos_alterados"] += 1
    if not os.listdir(recursos):
        os.rmdir(recursos)
    if rel["faltando"] and not permitir_faltando:
        lista = "\n  ".join(rel["faltando"][:30])
        raise SystemExit(
            f"PACOTE NÃO GERADO: {len(rel['faltando'])} arquivo(s) citados pelas predefinições não existem neste computador.\n"
            f"Sem eles o aluno veria 'mídia perdida'. Abra a predefinição no CapCut, troque ou remova a mídia e salve de novo.\n  {lista}\n"
            f"(para gerar mesmo assim, use --permitir-faltando)"
        )
    return rel


def auditar(presets_src):
    """Só leitura: conta as referências por tipo e diz quais arquivos existem neste computador."""
    tipos, faltam, existem = {}, set(), set()
    for raiz, _, arqs in os.walk(presets_src):
        for a in arqs:
            if not a.endswith((".json", ".tmp", ".bak")):
                continue
            txt = open(os.path.join(raiz, a), encoding="utf-8", errors="ignore").read()
            for m in RE_CAMINHO.finditer(txt):
                caminho, ext = m.group(1), m.group(2).lower()
                if ext not in EXT_MIDIA or "__PLUGA_UD__" in caminho:
                    continue
                t = classificar(caminho)
                tipos[t] = tipos.get(t, 0) + 1
                if t != "cache_efeito":
                    (existem if os.path.isfile(caminho) else faltam).add(caminho)
    return {"por_tipo": tipos, "arquivos_externos": len(existem) + len(faltam), "existem_aqui": len(existem), "faltando_aqui": sorted(faltam)}


if __name__ == "__main__":
    import sys
    print(json.dumps(auditar(sys.argv[1]), ensure_ascii=False, indent=1))
