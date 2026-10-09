# Gera suporte/kb.json: a base de conhecimento que o atendimento do WhatsApp (n8n) lê.
#   catalogo.json      -> nome, preço, parcelas, acesso, página de venda (com ?de=whatsapp)
#   suporte/kb-base.json -> explicações, compatibilidade, onde fica no CapCut, problemas e soluções
# Uso: python3 tools/gera_kb.py   (rode de novo sempre que mudar o catálogo ou a kb-base)
import datetime, hashlib, json, os, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, 'tools'))
from gera_catalogo import carrega, parcela, brl  # noqa: E402

DE = 'whatsapp'   # vira utm_medium=whatsapp e src=basefl-whatsapp no checkout (ver conheca/*)


def reais(v):
    return brl(v, 2).replace(',00', '') if float(v).is_integer() else brl(v, 2)


def pagina(slug):
    return f'https://basefl.com/conheca/{slug}/?de={DE}' if slug else ''


def gera(hoje=None):
    c = carrega()
    base = json.load(open(os.path.join(RAIZ, 'suporte', 'kb-base.json'), encoding='utf-8'))
    base.pop('_leia', None)
    hoje = hoje or datetime.date.today()
    por = {p['key']: p for p in c['produtos']}
    kit = c['kit']
    produtos = {}
    vendidos = list(c['produtos']) + [dict(kit, tipo='pacote')]
    for p in vendidos:
        k = p['key']
        extra = base['produtos'].get(k, {})
        preco = p.get('preco') or 0
        item = {
            'nome': p['nome'],
            'tipo': p.get('tipo', ''),
            'acesso': p.get('acesso', ''),
            'gancho': p.get('gancho', ''),
            'resumo': p.get('desc', ''),
        }
        if p.get('bonus'):
            dono = por[p['bonus_de']]['nome'] if p.get('bonus_de') else 'Títulos Dinâmicos'
            item['venda'] = f'Não é vendido separado: vem de bônus com {dono}.'
            item['pagina'] = pagina(por[p['bonus_de']]['slug']) if p.get('bonus_de') else pagina('legendas')
        elif p.get('so_no_kit'):
            item['venda'] = f'Vendido só no {kit["nome"]}, junto com as outras ferramentas: {reais(kit["preco"])} à vista ou 12x de {reais(round(parcela(kit["preco"], c), 2))}, {kit["acesso"]} de acesso.'
            item['pagina'] = pagina(p['slug'])
            item['pagina_compra'] = pagina(kit['slug'])
        else:
            item['preco'] = preco
            item['venda'] = f'{reais(preco)} à vista ou 12x de {reais(round(parcela(preco, c), 2))} no cartão. Acesso {p.get("acesso", "")}. Garantia de {c["garantia_dias"]} dias.'
            item['pagina'] = pagina(p['slug'])
            item['pagina_compra'] = item['pagina']
        if k == 'kit':
            item['inclui_ferramentas'] = [por[x]['nome'] for x in kit['inclui']]
        if p.get('bonus_inclusos'):
            item['bonus'] = [por[x]['nome'] for x in p['bonus_inclusos']]
        item.update(extra)
        produtos[k] = item
    produtos['app'] = dict(nome='App Base FL', **base['produtos'].get('app', {}))

    links = sorted({v for p in produtos.values() for kk, v in p.items() if isinstance(v, str) and v.startswith('https://basefl.com/')}
                   | {v for v in base['empresa']['links'].values()})
    corpo = dict(empresa=base['empresa'], produtos=produtos, problemas=base['problemas'], politicas=base['politicas_do_atendimento'], links_oficiais=links)
    h = hashlib.sha256(json.dumps(corpo, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:8]
    return dict(
        versao=f'{hoje.isoformat()}.{h}',
        gerado_em=hoje.isoformat(),
        revisar_ate=(hoje + datetime.timedelta(days=base.get('revisar_a_cada_dias', 45))).isoformat(),
        **corpo,
    )


if __name__ == '__main__':
    kb = gera()
    destino = os.path.join(RAIZ, 'suporte', 'kb.json')
    with open(destino, 'w', encoding='utf-8') as f:
        json.dump(kb, f, ensure_ascii=False, indent=1)
    print('ok', destino, kb['versao'], f"{len(kb['produtos'])} produtos, {len(kb['problemas'])} problemas, {os.path.getsize(destino)} bytes")
