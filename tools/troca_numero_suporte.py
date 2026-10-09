# Troca do número de suporte do Base FL: 5548999642195 -> 5547996974735 (+55 47 99697-4735)
# NÃO RODAR com --aplicar antes da autorização do Fernando.
#   python3 tools/troca_numero_suporte.py            -> só lista onde o número aparece (não muda nada)
#   python3 tools/troca_numero_suporte.py --aplicar  -> troca nos arquivos do Base FL listados abaixo
# Depois de aplicar: subir o site, publicar nova versão do app (ui/index.html) e o greenn-webhook.ts no Supabase.
import os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANTIGO, NOVO = '5548999642195', '5547996974735'
# Somente arquivos do Base FL (nada do Reels Academy nem de outros negócios)
ARQUIVOS = [
    'index.html', 'docs/index.html', 'instalar/index.html', 'termos/index.html', 'privacidade/index.html',
    'app/index.html', 'ui/index.html', 'conheca/legendas/index.html', 'conheca/legendas/assets/js/config.js',
    'supabase/greenn-webhook.ts',
]


def ocorrencias():
    achados = []
    for dirpath, dirs, files in os.walk(RAIZ):
        dirs[:] = [d for d in dirs if d not in ('node_modules', 'target', '.git', 'atendimento')]
        for f in files:
            if not f.endswith(('.html', '.js', '.ts', '.json', '.py', '.rs', '.sql', '.md')) or f == os.path.basename(__file__):
                continue
            p = os.path.join(dirpath, f)
            try:
                for i, linha in enumerate(open(p, encoding='utf-8'), 1):
                    if ANTIGO in linha:
                        achados.append((os.path.relpath(p, RAIZ), i))
            except UnicodeDecodeError:
                pass
    return achados


if __name__ == '__main__':
    lista = ocorrencias()
    for p, i in lista:
        print(f'{p}:{i}' + ('' if p in ARQUIVOS else '   <- FORA da lista (conferir antes)'))
    print(f'{len(lista)} ocorrência(s) do número antigo')
    if '--aplicar' in sys.argv:
        for p in ARQUIVOS:
            caminho = os.path.join(RAIZ, p)
            s = open(caminho, encoding='utf-8').read()
            if ANTIGO in s:
                open(caminho, 'w', encoding='utf-8').write(s.replace(ANTIGO, NOVO))
                print('trocado:', p)
