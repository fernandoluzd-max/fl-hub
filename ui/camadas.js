// 4 CAMADAS: instala Títulos, Efeitos Sonoros, LUTs e Base FL Assets com um botão só.
// Só a lógica (sem tela), para poder ser testada fora do app: node --test tests-ui/*.test.js
// Nada aqui instala nada sozinho: quem chama é o index.html, usando a mesma instalação dos cards individuais.
(function (raiz) {
  // ordem do acabamento de um vídeo; os Assets ficam por último porque o download é o maior (vários GB)
  const ORDEM = ['legendas', 'sons', 'luts', 'assets'];
  const NOMES_CAMADA = { legendas: 'Títulos', sons: 'Som', luts: 'Cor', assets: 'Movimento' };

  // o card só existe para quem tem os 4 liberados (e os 4 existem no servidor)
  function elegivel(produtos, owned, packsServidor) {
    return ORDEM.every(k => {
      const p = produtos.find(x => x.key === k);
      return !!p && owned.has(p.packId) && packsServidor.some(s => s.id === p.packId);
    });
  }

  // situação de cada camada: o que está instalado, o que falta e o que tem versão nova
  function partes(produtos, packsServidor, instalados) {
    return ORDEM.map((k, i) => {
      const p = produtos.find(x => x.key === k);
      const srv = packsServidor.find(s => s.id === p.packId);
      const inst = instalados.find(s => s.id === p.packId);
      const estado = !inst ? 'falta' : (srv && inst.version !== srv.version) ? 'nova' : 'ok';
      return { n: i + 1, key: k, camada: NOMES_CAMADA[k], p, srv, inst, estado };
    });
  }

  // o que o botão vai instalar agora: só o que falta ou tem versão nova, sempre na ordem (Assets por último)
  function plano(lista) {
    return lista.filter(x => x.estado !== 'ok');
  }

  function rotuloBotao(lista) {
    const pl = plano(lista), faltam = lista.filter(x => x.estado === 'falta').length;
    if (!pl.length) return null;                                        // tudo instalado e atualizado
    if (faltam === lista.length) return 'Instalar as 4 camadas';
    if (faltam > 0) return 'Instalar o que falta (' + pl.length + ')';
    return 'Atualizar (' + pl.length + ')';
  }

  // "Camada 2 de 4 · Som (Efeitos Sonoros)" — a posição é a da camada no kit, não a do plano
  function rotuloEtapa(parte, total) {
    return 'Camada ' + parte.n + ' de ' + (total || ORDEM.length) + ' · ' + parte.camada + ' (' + parte.p.name + ')';
  }

  // erro técnico → frase simples e o que fazer. 'para' = parar a fila (todos os casos param: o resto fica para o próximo clique)
  function explicaErro(msg) {
    const m = String(msg || '');
    if (/capcut est[aá] aberto/i.test(m)) return { tipo: 'capcut', texto: 'O CapCut foi aberto durante a instalação. Feche o CapCut (no Mac: ⌘Q) e clique de novo: o app continua de onde parou.' };
    if (/espa[cç]o no disco|no space|disk full|os error 28|os error 112/i.test(m)) return { tipo: 'espaco', texto: 'Falta espaço no computador. Libere espaço (os Assets precisam de alguns GB) e clique de novo: o app continua de onde parou.' };
    if (/sem conex|failed to fetch|network|load failed|download interrompido|timed? ?out|dns|connection/i.test(m)) return { tipo: 'internet', texto: 'A internet caiu durante a instalação. Confira a conexão e clique de novo: o app continua de onde parou.' };
    if (/not found|object not found|\b40[03]\b|n[aã]o est[aá] liberado|download negado/i.test(m)) return { tipo: 'acesso', texto: 'Esta camada não está liberada para este e-mail. Fale com o suporte.' };
    if (/sess[aã]o expirou/i.test(m)) return { tipo: 'sessao', texto: 'Sua sessão expirou. Entre de novo e clique em instalar: o app continua de onde parou.' };
    return { tipo: 'outro', texto: m };
  }

  const api = { ORDEM, NOMES_CAMADA, elegivel, partes, plano, rotuloBotao, rotuloEtapa, explicaErro };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.Camadas = api;
})(typeof window !== 'undefined' ? window : globalThis);
