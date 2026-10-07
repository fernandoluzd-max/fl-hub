# Lê avisos.json (fonte única dos recados em vídeo) e gera a cópia que vai DENTRO do app:
#   ui/avisos-dados.js -> o que o app mostra antes de conseguir falar com o site (primeira abertura sem internet)
#   ui/avisos.js       -> cópia de avisos.js (a tela dos recados é a mesma no app e no site)
# O app sempre busca a lista atual em https://basefl.com/avisos.json; recado novo NÃO exige versão nova do app.
import json, os, shutil
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def main():
    with open(os.path.join(RAIZ, 'avisos.json'), encoding='utf-8') as f:
        j = json.load(f)
    j.pop('_leia', None)
    ids = [a['id'] for a in j['avisos']]
    assert len(ids) == len(set(ids)), 'id repetido em avisos.json'
    for a in j['avisos']:
        assert a['video'].startswith('https://') and 'basefl.com/' in a['video'], 'video fora do Base FL: ' + a['id']
    js = '// GERADO por tools/gera_avisos.py a partir de avisos.json. Não edite aqui.\nwindow.AVISOS_BASE = ' + json.dumps(j, ensure_ascii=False, separators=(',', ':')) + ';\n'
    with open(os.path.join(RAIZ, 'ui', 'avisos-dados.js'), 'w', encoding='utf-8') as f:
        f.write(js)
    shutil.copyfile(os.path.join(RAIZ, 'avisos.js'), os.path.join(RAIZ, 'ui', 'avisos.js'))
    print('ok:', len(ids), 'recados ->', ', '.join(ids))

if __name__ == '__main__':
    main()
