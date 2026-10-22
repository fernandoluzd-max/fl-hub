// Teste de interface do Mood (lut/index.html) em 1280px e 390px: confere que o fluxo
// inteiro continua funcionando depois das mudanças no motor de cor — upload (via "usar um
// exemplo", que já existe na página) → ajuste → resultado → baixar o .cube — e que os
// invariantes do site (link ?direto=1, eventos de analytics, checkout da Greenn) continuam
// no HTML like antes.
'use strict';
const path = require('path');
const fs = require('fs');
const { iniciar } = require('./servidor');

const REPO = path.join(__dirname, '..');
const PORTA = 8974;
const PW_CANDIDATOS = [
  'playwright',
  '/Users/fernandoluz/.npm/_npx/9833c18b2d85bc59/node_modules/playwright',
  '/Users/fernandoluz/.npm/_npx/e41f203b7505f1fb/node_modules/playwright',
];
function carregarPlaywright() { let e; for (const c of PW_CANDIDATOS) { try { return require(c); } catch (x) { e = x; } } throw e; }
const { chromium } = carregarPlaywright();

const falhas = [];
function checa(cond, msg) { if (!cond) falhas.push(msg); console.log((cond ? 'OK   ' : 'FALHA') + ' — ' + msg); }

async function testarViewport(browser, width, height, rotulo) {
  console.log(`\n=== ${rotulo} (${width}x${height}) ===`);
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });

  await page.goto(`http://127.0.0.1:${PORTA}/lut/index.html`);
  await page.waitForTimeout(400);

  // pula a aula (link ?direto=1 do WhatsApp pós-compra) — confere que o passo 1 abre direto
  await ctx.close();
  const ctx2 = await browser.newContext({ viewport: { width, height } });
  const page2 = await ctx2.newPage();
  const erros2 = [];
  page2.on('pageerror', e => erros2.push(String(e)));
  await page2.goto(`http://127.0.0.1:${PORTA}/lut/index.html?direto=1`);
  await page2.waitForTimeout(400);
  const temUpload = await page2.evaluate(() => !!document.querySelector('#dR') && !!document.querySelector('#dV'));
  checa(temUpload, rotulo + ': ?direto=1 abre direto no passo 1 (upload), sem a aula');

  // usa o exemplo embutido da própria página (gera as imagens na hora, sem precisar de arquivo)
  const temBotaoExemplo = await page2.evaluate(() => !!document.querySelector('#ex'));
  checa(temBotaoExemplo, rotulo + ': botão "usar um exemplo" existe no passo 1');
  await page2.click('#ex');
  await page2.waitForTimeout(300);
  const habilitou = await page2.evaluate(() => !document.querySelector('#ir').disabled);
  checa(habilitou, rotulo + ': depois do exemplo, o botão "Copiar o mood" fica habilitado');

  await page2.click('#ir');
  await page2.waitForFunction(() => document.querySelector('#pct') != null, { timeout: 20000 }).catch(() => {});
  await page2.waitForTimeout(300);
  const chegouAjuste = await page2.evaluate(() => !!document.querySelector('#pct') && !!document.querySelector('#i-forca'));
  checa(chegouAjuste, rotulo + ': chegou no passo 2 (ajuste) com o anel de % e o controle de intensidade');
  const semPct = await page2.evaluate(() => document.querySelector('#pct')?.textContent);
  checa(!!semPct && semPct !== '–', rotulo + ': a nota de semelhança apareceu (' + semPct + ')');
  const qaTemConteudo = await page2.evaluate(() => (document.querySelector('#qa')?.innerHTML || '').length > 20);
  checa(qaTemConteudo, rotulo + ': a checagem automática (qaHtml) renderizou algo');

  await page2.click('#pronto');
  await page2.waitForTimeout(300);
  const chegouFim = await page2.evaluate(() => !!document.querySelector('.fim') && !!document.querySelector('.arq'));
  checa(chegouFim, rotulo + ': chegou no passo 3 (pronto) com o cartão do arquivo .cube');

  // força "acesso" (sem mexer em Base/Supabase) só pra testar o botão Baixar / arquivoCube()
  // de verdade, do jeito que a pessoa que já comprou usaria
  const baixou = await page2.evaluate(async () => {
    acesso = true; passo3();
    await new Promise(r => setTimeout(r, 50));
    const btn = document.querySelector('#baixar');
    if (!btn) return { ok: false, motivo: 'botão #baixar não apareceu com acesso=true' };
    let capturado = null;
    const origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { capturado = this.href; };
    btn.click();
    HTMLAnchorElement.prototype.click = origClick;
    if (!capturado) return { ok: false, motivo: 'clique no botão não criou link de download' };
    const txt = await fetch(capturado).then(r => r.text());
    return { ok: true, tamanho: txt.length, cabecalho: txt.split('\n').slice(0, 5).join(' | ') };
  });
  checa(baixou.ok, rotulo + ': clicar em "Baixar" gera o blob do .cube (' + (baixou.motivo || baixou.cabecalho) + ')');
  if (baixou.ok) checa(/LUT_3D_SIZE 33/.test(baixou.cabecalho) && /DOMAIN_MIN 0\.0 0\.0 0\.0/.test(baixou.cabecalho) && /DOMAIN_MAX 1\.0 1\.0 1\.0/.test(baixou.cabecalho),
    rotulo + ': o .cube baixado pela UI tem o cabeçalho certo (LUT_3D_SIZE 33, DOMAIN 0..1)');

  checa(erros2.length === 0, rotulo + ': sem erros no console durante o fluxo (' + erros2.join(' / ') + ')');

  await ctx2.close();
}

async function testarInvariantes() {
  console.log('\n=== invariantes do código-fonte (não mudaram) ===');
  const html = fs.readFileSync(path.join(REPO, 'lut', 'index.html'), 'utf8');
  checa(html.includes("get('direto') === '1'"), 'código de ?direto=1 continua em lut/index.html');
  checa(html.includes("Base.evento('teste_comecou', PACK, { direto:"), 'evento teste_comecou (com campo direto) continua');
  checa(html.includes("Base.evento('teste_resultado', PACK, { direto:"), 'evento teste_resultado (com campo direto) continua');
  checa(html.includes('payfast.greenn.com.br/2y52kh4/offer/HKpnsu'), 'link de checkout da Greenn continua igual');
  checa(html.includes('LUT_3D_SIZE ${N}'), 'cabeçalho do .cube (LUT_3D_SIZE) continua no arquivoCube()');
  checa(html.includes("DOMAIN_MIN 0.0 0.0 0.0', 'DOMAIN_MAX 1.0 1.0 1.0"), 'DOMAIN_MIN/DOMAIN_MAX do .cube continuam 0..1');
}

async function main() {
  const srv = await iniciar(REPO, PORTA);
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    await testarInvariantes();
    await testarViewport(browser, 1280, 800, 'desktop');
    await testarViewport(browser, 390, 844, 'celular');
  } finally {
    await browser.close();
    srv.close();
  }
  console.log('\n' + (falhas.length ? falhas.length + ' FALHA(S):\n - ' + falhas.join('\n - ') : 'Tudo passou.'));
  process.exit(falhas.length ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
