// Testes da lógica das 4 Camadas (sem app, sem internet): node --test tests-ui/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../ui/camadas.js');

const PRODUTOS = [
  { key: 'legendas', packId: 'fl-legendas', name: 'Títulos Dinâmicos' },
  { key: 'sons', packId: 'fl-sons', name: 'Efeitos Sonoros' },
  { key: 'luts', packId: 'fl-luts', name: 'LUTs' },
  { key: 'assets', packId: 'fl-assets', name: 'Base FL Assets' },
  { key: 'mood', packId: 'fl-lut', name: 'Mood' },
];
const SRV = [
  { id: 'fl-legendas', version: '2.0.0' }, { id: 'fl-sons', version: '1.2.0' },
  { id: 'fl-luts', version: '1.0.0' }, { id: 'fl-assets', version: '1.0.0' }, { id: 'fl-lut', version: '1.0.0' },
];
const TODOS = new Set(['fl-legendas', 'fl-sons', 'fl-luts', 'fl-assets']);

test('ordem fixa: Títulos, Som, Cor e Assets por último', () => {
  assert.deepEqual(C.ORDEM, ['legendas', 'sons', 'luts', 'assets']);
  const pl = C.plano(C.partes(PRODUTOS, SRV, []));
  assert.deepEqual(pl.map(x => x.key), ['legendas', 'sons', 'luts', 'assets']);
  assert.equal(pl.at(-1).key, 'assets');
});

test('card só para quem tem os 4 liberados', () => {
  assert.equal(C.elegivel(PRODUTOS, TODOS, SRV), true);
  for (const tira of TODOS) {
    const tres = new Set([...TODOS].filter(x => x !== tira));
    assert.equal(C.elegivel(PRODUTOS, tres, SRV), false, 'sem ' + tira);
  }
  assert.equal(C.elegivel(PRODUTOS, new Set(), SRV), false);
});

test('card some se algum pack não existir no servidor (sem quebrar)', () => {
  assert.equal(C.elegivel(PRODUTOS, TODOS, SRV.filter(s => s.id !== 'fl-assets')), false);
  assert.equal(C.elegivel(PRODUTOS, TODOS, []), false);
});

test('parte já instalada é pulada; Assets continua por último', () => {
  const inst = [{ id: 'fl-legendas', version: '2.0.0' }, { id: 'fl-luts', version: '1.0.0' }];
  const lista = C.partes(PRODUTOS, SRV, inst);
  assert.deepEqual(C.plano(lista).map(x => x.key), ['sons', 'assets']);
  assert.equal(C.rotuloBotao(lista), 'Instalar o que falta (2)');
});

test('versão nova entra no plano como atualização', () => {
  const inst = SRV.filter(s => TODOS.has(s.id)).map(s => ({ ...s }));
  inst[1].version = '1.0.0';   // sons desatualizado
  const lista = C.partes(PRODUTOS, SRV, inst);
  assert.deepEqual(C.plano(lista).map(x => x.key), ['sons']);
  assert.equal(C.rotuloBotao(lista), 'Atualizar (1)');
});

test('tudo instalado: sem botão', () => {
  const inst = SRV.filter(s => TODOS.has(s.id));
  assert.equal(C.rotuloBotao(C.partes(PRODUTOS, SRV, inst)), null);
});

test('nada instalado: texto do botão', () => {
  assert.equal(C.rotuloBotao(C.partes(PRODUTOS, SRV, [])), 'Instalar as 4 camadas');
});

test('rótulo da etapa mostra a posição da camada no kit', () => {
  const lista = C.partes(PRODUTOS, SRV, []);
  assert.equal(C.rotuloEtapa(lista[3], 4), 'Camada 4 de 4 · Movimento (Base FL Assets)');
});

test('erros viram orientação clara', () => {
  assert.equal(C.explicaErro('O CapCut está aberto. Feche o CapCut e tente de novo.').tipo, 'capcut');
  assert.equal(C.explicaErro('A instalação falhou e foi desfeita: copiar o arquivo x: No space left on device (os error 28) (falta espaço no disco?)').tipo, 'espaco');
  assert.equal(C.explicaErro('Download interrompido: connection reset').tipo, 'internet');
  assert.equal(C.explicaErro('Sem conexão com o servidor: dns error').tipo, 'internet');
  assert.equal(C.explicaErro('Download negado pelo servidor (403 Forbidden). Confira se a compra está ativa.').tipo, 'acesso');
  assert.equal(C.explicaErro('Sua sessão expirou. Entre de novo.').tipo, 'sessao');
  assert.equal(C.explicaErro('algo inesperado').tipo, 'outro');
  for (const t of ['capcut', 'espaco', 'internet', 'sessao'])
    assert.match(C.explicaErro({ capcut: 'O CapCut está aberto.', espaco: 'falta espaço no disco', internet: 'Download interrompido', sessao: 'Sua sessão expirou' }[t]).texto, /continua de onde parou/);
});
