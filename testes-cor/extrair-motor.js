// Extrai, do próprio lut/index.html, o bloco de JS que é o motor de cor do Mood —
// da seção "CONFIG" até o fim de arquivoCube(), logo antes da seção "condição de aluno".
// Isso garante que o banco de teste roda SEMPRE o código real do site (o mesmo
// <script> que o navegador do usuário executa), nunca uma cópia ou reimplementação.
'use strict';
const fs = require('fs');
const path = require('path');

const INICIO = '// ===================== CONFIG =====================';
const FIM = '// ===================== condição de aluno (campanha) =====================';
// mede()/confere()/limites()/qaHtml() (a checagem automática) ficam mais adiante no arquivo,
// depois da tela do passo 1 (upload) — não dá para pegar tudo num pedaço só sem trazer também
// UI e a campanha de preço/aluno, então extraímos os dois trechos separados e juntamos.
const INICIO_QA = '// ===================== CHECAGEM AUTOMÁTICA =====================';
const FIM_QA = '// ===================== SCOPES (medidos dos pixels) =====================';

function extrairTrecho(html, inicio, fim, nomeParaErro) {
  const i0 = html.indexOf(inicio);
  const i1 = html.indexOf(fim);
  if (i0 === -1 || i1 === -1 || i1 <= i0) {
    throw new Error(
      'Não achei os marcadores de ' + nomeParaErro + ' em lut/index.html (procurei "' + inicio + '" até "' + fim + '"). ' +
      'Se o arquivo foi reorganizado (ex.: separado em lut/app.js, ou os comentários dos marcadores mudaram), ' +
      'ajuste as constantes em testes-cor/extrair-motor.js.'
    );
  }
  return html.slice(i0, i1);
}

function extrairMotor(repoRoot) {
  const p = path.join(repoRoot, 'lut', 'index.html');
  const html = fs.readFileSync(p, 'utf8');
  const nucleo = extrairTrecho(html, INICIO, FIM, 'o núcleo do motor (CONFIG…arquivoCube)');
  const qa = extrairTrecho(html, INICIO_QA, FIM_QA, 'a checagem automática (mede…qaHtml)');
  return nucleo + '\n' + qa;
}

module.exports = { extrairMotor, INICIO, FIM, INICIO_QA, FIM_QA };

if (require.main === module) {
  const code = extrairMotor(path.join(__dirname, '..'));
  process.stdout.write(code);
}
