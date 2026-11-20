/* zip.js — monta o pacote final do cliente: placeholders de logo e de fundo
   gerados em canvas (nunca logos/marcas reais), o manual HTML autônomo (usado
   também na tela de Aprovação) e o .zip final via JSZip (carregado por CDN
   fixo no index.html). Nenhuma chamada de rede aqui além do que o JSZip já
   precisa para existir (ele já está carregado antes deste script rodar). */

const BaseFLZip = (() => {
  function sanitizarNomeArquivo(nome) {
    return String(nome || "cliente")
      .normalize("NFD").replace(/[̀-ͯ]/g, "") // remove acentos
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "cliente";
  }

  function iniciaisDoNome(nome) {
    const partes = String(nome || "C").trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return "C";
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  function canvasParaBlobPng(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  /** Gera um placeholder de logo (iniciais num emblema) quando o cliente não subiu logo próprio.
   *  claro=true -> iniciais e emblema claros (pra usar sobre fundo escuro/vídeo escuro).
   *  claro=false -> iniciais e emblema escuros (pra usar sobre fundo claro). */
  async function gerarLogoPlaceholder(nomeCliente, paleta, claro) {
    const tam = 512;
    const canvas = document.createElement("canvas");
    canvas.width = tam;
    canvas.height = tam;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, tam, tam);

    const corEmblema = paleta.destaque || "#F2A541";
    const corTexto = claro ? (paleta.texto || "#F4F0E4") : (paleta.fundo || "#0D0F0E");
    const corAnel = claro ? "rgba(244,240,228,.35)" : "rgba(13,15,14,.35)";

    // anel externo fino
    ctx.lineWidth = 10;
    ctx.strokeStyle = corAnel;
    ctx.beginPath();
    ctx.arc(tam / 2, tam / 2, tam / 2 - 18, 0, Math.PI * 2);
    ctx.stroke();

    // emblema central (círculo com a cor de destaque do estilo)
    ctx.beginPath();
    ctx.arc(tam / 2, tam / 2, tam / 2 - 60, 0, Math.PI * 2);
    ctx.fillStyle = corEmblema;
    ctx.fill();

    // iniciais
    ctx.fillStyle = corTexto;
    ctx.font = "800 " + Math.round(tam * 0.34) + "px Archivo, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(iniciaisDoNome(nomeCliente), tam / 2, tam / 2 + tam * 0.02);

    return await canvasParaBlobPng(canvas);
  }

  /** A partir do logo real enviado pelo editor, gera uma versão monocromática (silhueta a
   *  partir do canal alfa) numa cor sólida — usada para preencher a versão clara OU escura
   *  que o editor não escolheu no Estúdio, já que não há como inferir com segurança as cores
   *  originais do logo. Documentado também no LEIA-ME da pasta Logos. */
  async function gerarVersaoMonocromatica(logoBlob, corHex) {
    const bitmap = await createImageBitmap(logoBlob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const r = parseInt(corHex.slice(1, 3), 16);
    const g = parseInt(corHex.slice(3, 5), 16);
    const b = parseInt(corHex.slice(5, 7), 16);
    for (let i = 0; i < img.data.length; i += 4) {
      if (img.data[i + 3] > 0) {
        img.data[i] = r;
        img.data[i + 1] = g;
        img.data[i + 2] = b;
      }
    }
    ctx.putImageData(img, 0, 0);
    return await canvasParaBlobPng(canvas);
  }

  /** Gera 1 de 3 variações de background abstrato, nas cores da paleta encaixada do cliente. */
  async function gerarBackgroundPng(paleta, variante, largura, altura) {
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = paleta.fundo || "#0D0F0E";
    ctx.fillRect(0, 0, largura, altura);

    const cx = largura / 2, cy = altura / 2;
    const r = Math.max(largura, altura);

    if (variante === 1) {
      // gradiente radial sutil + um círculo grande de apoio no canto
      const grad = ctx.createRadialGradient(cx, cy * 0.6, 0, cx, cy * 0.6, r * 0.8);
      grad.addColorStop(0, paleta.apoio || "#333");
      grad.addColorStop(1, paleta.fundo || "#0D0F0E");
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(0, 0, largura, altura);
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.fillStyle = paleta.destaque || "#F2A541";
      ctx.globalAlpha = 0.18;
      ctx.arc(largura * 0.86, altura * 0.12, Math.min(largura, altura) * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (variante === 2) {
      // listras diagonais finas, alternando apoio/fundo
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-Math.PI / 10);
      ctx.translate(-cx, -cy);
      const passo = Math.max(largura, altura) / 14;
      ctx.globalAlpha = 0.12;
      for (let x = -r; x < r * 2; x += passo * 2) {
        ctx.fillStyle = paleta.apoio || "#333";
        ctx.fillRect(x, -r, passo, r * 4);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.fillStyle = paleta.destaque || "#F2A541";
      ctx.globalAlpha = 0.14;
      ctx.arc(largura * 0.16, altura * 0.86, Math.min(largura, altura) * 0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      // blocos geométricos simples (sem logos/marcas), composição assimétrica
      ctx.fillStyle = paleta.apoio || "#333";
      ctx.globalAlpha = 0.5;
      ctx.fillRect(0, altura * 0.72, largura, altura * 0.28);
      ctx.globalAlpha = 1;
      ctx.fillStyle = paleta.destaque || "#F2A541";
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(largura * 0.62, 0);
      ctx.lineTo(largura, 0);
      ctx.lineTo(largura, altura * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    return await canvasParaBlobPng(canvas);
  }

  // ---------- manual do cliente (HTML autônomo, usado também na tela de Aprovação) ----------

  function escaparHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  /** Gera o HTML completo (autônomo) do manual de marca/estilo para aprovação do cliente.
   *  Tudo inline (CSS + JS), só depende do link do Google Fonts — sem backend. */
  function gerarManualHtml(cliente, estilo, paleta, fontePar) {
    const idAprovacao = "manual_" + cliente.id;
    const nome = escaparHtml(cliente.nome);
    const nicho = escaparHtml(cliente.nicho || "");
    const fontes = fontePar || estilo.fontes.find((f) => f.recomendado) || estilo.fontes[0];
    const googleFontsHref =
      "https://fonts.googleapis.com/css2?family=" +
      encodeURIComponent(fontes.titulo).replace(/%20/g, "+") + ":wght@400;600;800&family=" +
      encodeURIComponent(fontes.texto).replace(/%20/g, "+") + ":wght@400;500;600&display=swap";

    const regras = (estilo.regrasEdicao || []).map((r) => "<li>" + escaparHtml(r) + "</li>").join("");

    return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Manual de estilo — ${nome}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${googleFontsHref}" rel="stylesheet">
<style>
:root{
  --fundo:${paleta.fundo}; --texto:${paleta.texto}; --destaque:${paleta.destaque}; --apoio:${paleta.apoio};
  --d:"${fontes.titulo}",Arial,sans-serif; --f:"${fontes.texto}",Arial,sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--fundo);color:var(--texto);font-family:var(--f);line-height:1.6;padding:0 0 60px}
.larg{max-width:860px;margin:0 auto;padding:0 24px}
header{padding:56px 0 32px;text-align:center;border-bottom:1px solid rgba(255,255,255,.08)}
header h1{font-family:var(--d);font-weight:800;font-size:clamp(28px,5vw,46px);letter-spacing:-.02em;margin-bottom:6px}
header p{opacity:.72;font-size:15px}
section{padding:40px 0;border-bottom:1px solid rgba(255,255,255,.08)}
section h2{font-family:var(--d);font-weight:700;font-size:20px;margin-bottom:16px;letter-spacing:-.01em}
.paleta{display:flex;gap:12px;flex-wrap:wrap}
.cor{width:96px}
.cor .amostra{height:72px;border-radius:12px;border:1px solid rgba(255,255,255,.12)}
.cor small{display:block;margin-top:6px;font-size:11.5px;opacity:.7;text-transform:uppercase;letter-spacing:.04em}
.cor b{display:block;font-size:12.5px;font-family:monospace}
.fontes p{font-size:14px;opacity:.75;margin-bottom:4px}
.exemplo-titulo{font-family:var(--d);font-weight:800;font-size:clamp(26px,4vw,38px);margin:10px 0}
.exemplo-legenda{display:inline-block;margin-top:10px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px 16px;font-size:15px}
.exemplo-legenda b{color:var(--destaque)}
.motion-area{position:relative;height:160px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);overflow:hidden;display:flex;align-items:center;justify-content:center}
.motion-area .mt{font-family:var(--d);font-weight:800;font-size:28px;opacity:0}
.regras{padding-left:20px;font-size:14.5px;opacity:.9}
.regras li{margin-bottom:8px}
.aprovar-area{text-align:center;padding:40px 0}
.bt-aprovar{background:var(--destaque);color:var(--fundo);font-weight:800;font-family:var(--d);border:0;border-radius:99px;padding:16px 34px;font-size:16px;cursor:pointer}
.bt-aprovar:disabled{opacity:.7;cursor:default}
.status{margin-top:14px;font-size:14px;opacity:.8}
footer{text-align:center;padding:30px 24px 0;font-size:12px;opacity:.5}
:focus-visible{outline:2px solid var(--destaque);outline-offset:3px}
@media (prefers-reduced-motion: reduce){.motion-area .mt{opacity:1!important;transform:none!important}}
</style>
</head>
<body>
<header class="larg">
  <h1>${nome}</h1>
  <p>Manual de estilo — direção "${escaparHtml(estilo.nome)}" ${nicho ? "· " + nicho : ""}</p>
</header>

<section class="larg">
  <h2>Paleta de cores</h2>
  <div class="paleta">
    <div class="cor"><div class="amostra" style="background:${paleta.fundo}"></div><small>Fundo</small><b>${paleta.fundo}</b></div>
    <div class="cor"><div class="amostra" style="background:${paleta.texto}"></div><small>Texto</small><b>${paleta.texto}</b></div>
    <div class="cor"><div class="amostra" style="background:${paleta.destaque}"></div><small>Destaque</small><b>${paleta.destaque}</b></div>
    <div class="cor"><div class="amostra" style="background:${paleta.apoio}"></div><small>Apoio</small><b>${paleta.apoio}</b></div>
  </div>
</section>

<section class="larg fontes">
  <h2>Tipografia</h2>
  <p>Título: <b style="font-family:var(--d)">${escaparHtml(fontes.titulo)}</b></p>
  <p>Texto: <b style="font-family:var(--f)">${escaparHtml(fontes.texto)}</b></p>
  <div class="exemplo-titulo">Um título de exemplo assim</div>
  <div class="exemplo-legenda">Essa é uma legenda de <b>exemplo</b> no estilo escolhido.</div>
</section>

<section class="larg">
  <h2>Motion (prévia de ritmo)</h2>
  <div class="motion-area"><div class="mt" id="motionTexto">${nome}</div></div>
  <p style="font-size:12.5px;opacity:.6;margin-top:10px">Isto é uma prévia de ritmo e curvas. O pacote final para o CapCut é montado à mão a partir destes parâmetros.</p>
</section>

<section class="larg">
  <h2>Regras de edição</h2>
  <ul class="regras">${regras}</ul>
</section>

<section class="larg aprovar-area" style="border-bottom:0">
  <button class="bt-aprovar" id="btAprovar">Aprovar</button>
  <div class="status" id="statusAprovacao"></div>
</section>

<footer>Aprovação registrada neste navegador (protótipo sem backend — não é enviada a ninguém).</footer>

<script>
(function(){
  "use strict";
  var ID = ${JSON.stringify(idAprovacao)};
  var reduzido = false;
  try { reduzido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch(e){}

  function tocarMotion(){
    var el = document.getElementById("motionTexto");
    if (!el) return;
    if (reduzido) { el.style.opacity = "1"; return; }
    try {
      el.animate(
        [{opacity:0,transform:"translateY(14px) scale(.96)"},{opacity:1,transform:"translateY(0) scale(1)"}],
        {duration: ${estilo.motion.duracaoEntradaMs}, easing: ${JSON.stringify(estilo.motion.easingEntrada)}, fill:"both"}
      );
    } catch(e) { el.style.opacity = "1"; }
  }
  tocarMotion();
  setInterval(function(){
    var el = document.getElementById("motionTexto");
    if (!el || reduzido) return;
    try { el.animate([{opacity:1,transform:"none"},{opacity:0,transform:"translateY(-8px)"},{opacity:0,transform:"translateY(14px) scale(.96)"},{opacity:1,transform:"translateY(0) scale(1)"}],{duration: ${estilo.motion.duracaoEntradaMs} + ${estilo.motion.duracaoSaidaMs}, easing: ${JSON.stringify(estilo.motion.easingEntrada)}}); } catch(e){}
  }, 4200);

  // aprovação: tenta IndexedDB simples deste próprio documento; se falhar, usa localStorage. Tudo em try/catch.
  function salvarAprovacao(cb){
    var feito = false;
    function ok(){ if(!feito){ feito = true; cb(true); } }
    function falhou(){ if(!feito){ feito = true; cb(false); } }
    try {
      var req = indexedDB.open("basefl_manual_aprovacoes", 1);
      req.onupgradeneeded = function(ev){
        var db = ev.target.result;
        if (!db.objectStoreNames.contains("aprovacoes")) db.createObjectStore("aprovacoes", {keyPath:"id"});
      };
      req.onsuccess = function(){
        try {
          var db = req.result;
          var tx = db.transaction("aprovacoes","readwrite");
          tx.objectStore("aprovacoes").put({id: ID, aprovado:true, quando: Date.now()});
          tx.oncomplete = ok; tx.onerror = falhou;
        } catch(e){ falhou(); }
      };
      req.onerror = falhou;
      setTimeout(falhou, 1500);
    } catch(e){ falhou(); }
  }

  var bt = document.getElementById("btAprovar");
  var status = document.getElementById("statusAprovacao");
  bt.addEventListener("click", function(){
    bt.disabled = true;
    salvarAprovacao(function(sucessoIndexed){
      if (!sucessoIndexed) {
        try { localStorage.setItem("basefl_manual_aprovacao_" + ID, JSON.stringify({aprovado:true, quando: Date.now()})); } catch(e){}
      }
      bt.textContent = "Aprovado ✓";
      status.textContent = "Aprovação registrada neste navegador em " + new Date().toLocaleString("pt-BR") + ".";
    });
  });

  // se já tinha aprovado antes neste navegador, mostra o estado
  try {
    var salvo = localStorage.getItem("basefl_manual_aprovacao_" + ID);
    if (salvo) {
      bt.textContent = "Aprovado ✓";
      bt.disabled = true;
      status.textContent = "Já aprovado neste navegador.";
    }
  } catch(e){}
})();
</script>
</body>
</html>`;
  }

  // ---------- montagem do pacote .zip ----------

  async function gerarPacote(ctx) {
    // ctx = { cliente, estilo, paleta, fontePar, ajustes, intensidadeLook, logoBlob }
    const { cliente, estilo, paleta, fontePar, ajustes, intensidadeLook, logoBlob } = ctx;
    if (typeof JSZip === "undefined") {
      throw new Error("JSZip não carregou (sem internet para o CDN?). O pacote não pode ser gerado agora.");
    }
    const zip = new JSZip();
    const raiz = sanitizarNomeArquivo(cliente.nome);
    const pasta = zip.folder(raiz);

    // Títulos e legendas
    const pastaTitulos = pasta.folder("Titulos e legendas");
    const especificacoes = {
      cliente: cliente.nome,
      nicho: cliente.nicho,
      estilo: estilo.nome,
      paleta,
      fontes: fontePar,
      titulo: estilo.titulo,
      legenda: estilo.legenda,
      ajustesDoEditor: ajustes || {},
    };
    pastaTitulos.file("especificacoes.json", JSON.stringify(especificacoes, null, 2));
    pastaTitulos.file(
      "LEIA-ME.txt",
      "Essas são as especificações de título e legenda escolhidas no Estúdio de Estilo.\n" +
      "Use o arquivo especificacoes.json como referência para montar os títulos e legendas no CapCut:\n" +
      "cores (em HEX), fontes, tamanho relativo, posição e formato da legenda.\n"
    );

    // Logos
    const pastaLogos = pasta.folder("Logos");
    if (logoBlob) {
      const versaoEditor = (ajustes && ajustes.logo && ajustes.logo.versao) || "clara";
      const logoOriginalNome = versaoEditor === "escura" ? "logo-escuro.png" : "logo-claro.png";
      const corVersaoFaltante = versaoEditor === "escura" ? (paleta.texto || "#F4F0E4") : (paleta.fundo || "#0D0F0E");
      const logoGerado = await gerarVersaoMonocromatica(logoBlob, corVersaoFaltante);
      pastaLogos.file(logoOriginalNome, logoBlob);
      pastaLogos.file(versaoEditor === "escura" ? "logo-claro.png" : "logo-escuro.png", logoGerado);
      pastaLogos.file(
        "LEIA-ME.txt",
        "logo-" + (versaoEditor === "escura" ? "escuro" : "claro") + ".png é o logo original que o editor enviou no Estúdio.\n" +
        "A outra versão (" + (versaoEditor === "escura" ? "logo-claro.png" : "logo-escuro.png") + ") foi gerada automaticamente\n" +
        "como uma silhueta sólida a partir do canal alfa do logo original — não dá pra saber com\n" +
        "segurança as cores internas certas pra inverter sozinho. Se o logo tiver detalhes internos\n" +
        "(não só um contorno simples), vale revisar essa versão gerada ou pedir a versão oficial\n" +
        "clara/escura direto pro cliente.\n"
      );
    } else {
      const logoClaro = await gerarLogoPlaceholder(cliente.nome, paleta, true);
      const logoEscuro = await gerarLogoPlaceholder(cliente.nome, paleta, false);
      pastaLogos.file("logo-claro.png", logoClaro);
      pastaLogos.file("logo-escuro.png", logoEscuro);
      pastaLogos.file(
        "LEIA-ME.txt",
        "Nenhum logo foi enviado no Estúdio, então geramos um emblema simples com as iniciais do\n" +
        "cliente, nas cores do estilo escolhido — é só um placeholder. Troque por logo-claro.png\n" +
        "(para usar sobre fundos escuros) e logo-escuro.png (para usar sobre fundos claros) com o\n" +
        "logo real do cliente assim que ele enviar.\n"
      );
    }

    // Backgrounds: 3 variações x 2 proporções
    const pastaBg = pasta.folder("Backgrounds");
    for (let v = 1; v <= 3; v++) {
      const vertical = await gerarBackgroundPng(paleta, v, 1080, 1920);
      const horizontal = await gerarBackgroundPng(paleta, v, 1920, 1080);
      pastaBg.file(`fundo-variacao-${v}-1080x1920.png`, vertical);
      pastaBg.file(`fundo-variacao-${v}-1920x1080.png`, horizontal);
    }

    // Animações
    const pastaAnim = pasta.folder("Animacoes");
    pastaAnim.file("parametros-motion.json", JSON.stringify(estilo.motion, null, 2));
    pastaAnim.file(
      "LEIA-ME.txt",
      "Estes são os parâmetros de referência do motion do estilo (duração de entrada/saída,\n" +
      "atraso entre elementos e curvas de easing). NÃO é um arquivo de motion pronto para\n" +
      "importar — é a receita que o editor usa para montar a animação à mão no CapCut,\n" +
      "reproduzindo o mesmo ritmo visto na prévia do Estúdio.\n"
    );

    // Cor
    const pastaCor = pasta.folder("Cor");
    const cubeTexto = BaseFLLut.gerarCubeLUT(estilo.corDoVideo, intensidadeLook == null ? 100 : intensidadeLook, estilo.nome);
    pastaCor.file("look.cube", cubeTexto);

    // Fontes
    const pastaFontes = pasta.folder("Fontes");
    const fp = fontePar || estilo.fontes.find((f) => f.recomendado) || estilo.fontes[0];
    const linhaFonte = (nomeFonte) =>
      nomeFonte + "\nLink: https://fonts.google.com/specimen/" + encodeURIComponent(nomeFonte.replace(/\s+/g, "+")) +
      "\nLicença: OFL — uso comercial livre\n\n";
    pastaFontes.file("fontes.txt", linhaFonte(fp.titulo) + linhaFonte(fp.texto));

    // Manual do cliente
    const manualHtml = gerarManualHtml(cliente, estilo, paleta, fp);
    pasta.file("Manual do cliente.html", manualHtml);

    const blob = await zip.generateAsync({ type: "blob" });
    return { blob, nomeArquivo: raiz + ".zip" };
  }

  function baixarBlob(blob, nomeArquivo) {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nomeArquivo;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
      return true;
    } catch (e) {
      console.warn("[BaseFLZip] falha ao baixar", e);
      return false;
    }
  }

  return {
    sanitizarNomeArquivo,
    iniciaisDoNome,
    gerarLogoPlaceholder,
    gerarBackgroundPng,
    gerarManualHtml,
    gerarPacote,
    baixarBlob,
  };
})();
