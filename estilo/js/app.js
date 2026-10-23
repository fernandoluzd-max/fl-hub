/* app.js — estado, roteamento por hash (#/tela/:id) e todas as telas do
   Estúdio de Estilo da Base FL. Lê estilos.json, guarda cada cliente no
   BaseFLDB (IndexedDB/localStorage) e orquestra color.js / lut.js / motion.js
   / zip.js nas telas abaixo.

   Decisões de simplificação do protótipo (documentadas aqui para não se
   perderem no meio do código):
   1) O histórico de desfazer/refazer do Estúdio vive só na memória da aba —
      ele não sobrevive a um F5. "Salvar versão" é o jeito de guardar algo
      de forma permanente.
   2) Toda mudança nos controles do Estúdio reconstrói o palco e o painel
      (full re-render da tela). É mais simples de manter correto do que
      sincronizar manualmente cada input, ao custo de o vídeo de referência
      reiniciar a cada ajuste confirmado. O slider de intensidade do look é
      a única exceção: ele atualiza o filtro em tempo real sem reconstruir
      nada, e só reconstrói quando o usuário solta o controle.
   3) As áreas "cobertas pelo app" (Instagram/TikTok) só são desenhadas no
      formato 9:16, que é o caso real onde a interface do app cobre o vídeo.
      Os valores são aproximados — ver AREAS_APP_APROXIMADAS abaixo. */

(function () {
  "use strict";

  // ---------- constantes ----------

  const NICHOS = ["imobiliário", "saúde", "gastronomia", "moda", "educação", "beleza", "advocacia", "fitness"];

  const PAPEIS_PALETA = ["fundo", "texto", "destaque", "apoio"];
  const ROTULOS_PAPEL = { fundo: "Fundo", texto: "Texto", destaque: "Destaque", apoio: "Apoio" };

  const PARES_PERSONALIDADE = [
    {
      chave: "sobrioVibrante",
      titulo: "Sóbrio ou vibrante?",
      opcoes: [
        { valor: -1, rotulo: "Sóbrio", estilo: { background: "#2b2b26", color: "#cfcabb", fontFamily: "Georgia, serif" } },
        { valor: 1, rotulo: "Vibrante", estilo: { background: "#F2A541", color: "#1a1206", fontFamily: "Archivo, sans-serif", fontWeight: "800" } },
      ],
    },
    {
      chave: "classicoModerno",
      titulo: "Clássico ou moderno?",
      opcoes: [
        { valor: -1, rotulo: "Clássico", estilo: { background: "#efe9da", color: "#2b2b26", fontFamily: "Georgia, serif", fontStyle: "italic" } },
        { valor: 1, rotulo: "Moderno", estilo: { background: "#17191c", color: "#F4F0E4", fontFamily: "Archivo, sans-serif", letterSpacing: "-.03em", fontWeight: "800" } },
      ],
    },
    {
      chave: "serioLeve",
      titulo: "Sério ou leve?",
      opcoes: [
        { valor: -1, rotulo: "Sério", estilo: { background: "#15181a", color: "#B3B4A2", fontFamily: "Archivo, sans-serif", letterSpacing: ".04em" } },
        { valor: 1, rotulo: "Leve", estilo: { background: "#3FB8AF", color: "#07201e", fontFamily: "Figtree, sans-serif", fontWeight: "700", borderRadius: "99px" } },
      ],
    },
  ];

  const POSICOES_LEGENDA = ["centro-baixo", "centro", "inferior-esquerda", "inferior-direita"];
  const TAMANHOS_LEGENDA = ["pequena", "média", "grande"];
  const FORMATOS_LEGENDA = ["caixa", "contorno", "nenhum"];
  const POSICOES_LOGO = ["superior-esquerda", "superior-direita", "centro", "inferior-esquerda", "inferior-direita"];
  const TAMANHOS_LOGO = ["pequeno", "média", "grande"];
  const FORMATOS_VIDEO = ["9:16", "4:5", "16:9"];

  // Áreas aproximadas cobertas pela interface do app sobre um vídeo vertical 9:16
  // (Reels/TikTok). Valores em % do quadro, estimados a partir do layout comum
  // dos dois apps em 2025/2026 — não são números oficiais de nenhuma das duas empresas.
  const AREAS_APP_APROXIMADAS = [
    { nome: "barra superior (ícones / abas)", top: 0, left: 0, width: 100, height: 7 },
    { nome: "legenda, música e botões do app", top: 80, left: 0, width: 84, height: 20 },
    { nome: "coluna de ícones laterais", top: 10, left: 86, width: 14, height: 68 },
  ];

  // ---------- estado do módulo ----------

  let ESTILOS = null;
  let limpezasPendentes = [];
  const familiasCarregadas = new Set();

  // ---------- utilidades ----------

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function novoId(prefixo) {
    return prefixo + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function capitalizar(s) {
    return String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
  }

  function h(tag, attrs, filhos) {
    const el = document.createElement(tag);
    attrs = attrs || {};
    for (const k in attrs) {
      if (attrs[k] == null) continue;
      if (k === "class") el.className = attrs[k];
      else if (k === "html") el.innerHTML = attrs[k];
      else if (k === "style" && typeof attrs[k] === "object") Object.assign(el.style, attrs[k]);
      else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    }
    // <video>/<audio> exigem a propriedade "muted" (não só o atributo) pra autoplay sem gesto do usuário funcionar em todo navegador.
    if ((tag === "video" || tag === "audio") && attrs && attrs.muted != null) el.muted = true;
    // aceita um array de filhos, ou um filho único (string, nó, ou null) direto — várias chamadas abaixo passam um texto puro aqui.
    const listaFilhos = Array.isArray(filhos) ? filhos : filhos == null ? [] : [filhos];
    listaFilhos.forEach((f) => {
      if (f == null) return;
      el.appendChild(typeof f === "string" ? document.createTextNode(f) : f);
    });
    return el;
  }

  function registrarLimpeza(fn) {
    limpezasPendentes.push(fn);
  }

  function executarLimpezas() {
    limpezasPendentes.forEach((fn) => {
      try { fn(); } catch (e) {}
    });
    limpezasPendentes = [];
  }

  let toastTimer = null;
  function toast(msg) {
    try {
      let el = document.getElementById("bflToast");
      if (!el) {
        el = document.createElement("div");
        el.id = "bflToast";
        el.style.position = "fixed";
        el.style.bottom = "20px";
        el.style.left = "50%";
        el.style.transform = "translateX(-50%)";
        el.style.background = "#F4F0E4";
        el.style.color = "#0D0F0E";
        el.style.padding = "10px 18px";
        el.style.borderRadius = "99px";
        el.style.fontFamily = '"Figtree",sans-serif';
        el.style.fontWeight = "600";
        el.style.fontSize = "13.5px";
        el.style.zIndex = "999";
        el.style.boxShadow = "0 10px 30px rgba(0,0,0,.4)";
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.style.display = "block";
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { el.style.display = "none"; }, 2800);
    } catch (e) {}
  }

  /** Injeta (uma vez) os links do Google Fonts necessários para as famílias passadas. */
  function garantirFontesCarregadas(familias) {
    const novas = Array.from(new Set((familias || []).filter(Boolean))).filter((f) => !familiasCarregadas.has(f));
    if (!novas.length) return;
    novas.forEach((f) => familiasCarregadas.add(f));
    try {
      const partes = novas.map((f) => "family=" + encodeURIComponent(f).replace(/%20/g, "+") + ":wght@400;500;600;700;800;900");
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?" + partes.join("&") + "&display=swap";
      document.head.appendChild(link);
    } catch (e) {
      console.warn("[app] falha carregando fontes extras", e);
    }
  }

  function escolherTextoLegivel(corFundo, candidatoA, candidatoB) {
    try {
      const ca = BaseFLColor.contraste(corFundo, candidatoA);
      const cb = BaseFLColor.contraste(corFundo, candidatoB);
      return ca >= cb ? candidatoA : candidatoB;
    } catch (e) {
      return candidatoA;
    }
  }

  function decodificarImagem(blob) {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.onload = () => resolve({ img, url });
        img.onerror = (e) => reject(e);
        img.src = url;
      } catch (e) {
        reject(e);
      }
    });
  }

  // ---------- filtro CSS aproximado do "look" do estilo (para pré-visualização de vídeo) ----------
  // Decisão: no CANVAS (foto estática) aplicamos a transformação pixel a pixel (igual à LUT
  // exportada — ver lut.js), porque é um frame só e o custo é baixo. No <video>, refazer esse
  // cálculo pixel a pixel a cada frame travaria o navegador, então usamos filtro CSS nativo
  // (contrast/saturate para contraste e saturação, e sepia+hue-rotate como aproximação visual de
  // temperatura — CSS não tem uma função de "temperatura de cor" direta). O resultado no vídeo é
  // uma aproximação; o arquivo .cube exportado no pacote final é que é matematicamente exato.
  function filtroCssDoLook(look, intensidade) {
    const mix = (intensidade == null ? 100 : intensidade) / 100;
    const contrastePct = Math.max(10, 100 + (look.contraste || 0) * mix);
    const saturacaoPct = Math.max(0, 100 + (look.saturacao || 0) * mix);
    const temp = (look.temperatura || 0) * mix;
    const sepiaQtd = Math.max(0, temp) / 100 * 0.35;
    const hueDeg = temp * -0.55;
    return "contrast(" + contrastePct.toFixed(1) + "%) saturate(" + saturacaoPct.toFixed(1) + "%) sepia(" + sepiaQtd.toFixed(3) + ") hue-rotate(" + hueDeg.toFixed(1) + "deg)";
  }

  function redesenharImagemComLook(canvas, imageDataOriginal, look, intensidade) {
    const ctx = canvas.getContext("2d");
    const copia = new ImageData(new Uint8ClampedArray(imageDataOriginal.data), imageDataOriginal.width, imageDataOriginal.height);
    const d = copia.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
      const cor = BaseFLLut.aplicarLookNoPixel(r, g, b, look, intensidade);
      d[i] = cor.r * 255; d[i + 1] = cor.g * 255; d[i + 2] = cor.b * 255;
    }
    ctx.putImageData(copia, 0, 0);
  }

  // ---------- roteador ----------

  function parseRota() {
    const hash = location.hash.replace(/^#\/?/, "");
    if (!hash) return { nome: "biblioteca", id: null };
    const partes = hash.split("/");
    return { nome: partes[0] || "biblioteca", id: partes[1] ? decodeURIComponent(partes[1]) : null };
  }

  function navegar(hash) {
    location.hash = hash;
  }

  async function carregarEstilosSeNecessario() {
    if (ESTILOS) return true;
    try {
      const resp = await fetch("estilos.json");
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const dados = await resp.json();
      ESTILOS = dados.estilos;
      return true;
    } catch (e) {
      console.error("[app] falha ao carregar estilos.json", e);
      return false;
    }
  }

  function renderErroCarregamento(app) {
    app.innerHTML = "";
    const tela = h("div", { class: "tela" }, [
      h("div", { class: "erro-carregamento" }, [
        h("h2", {}, "Não consegui carregar a biblioteca de estilos"),
        h("p", {}, "O arquivo estilos.json não respondeu. Isso quase sempre acontece quando a página é aberta direto do Finder (duplo clique), em vez de por um servidor local — e navegadores bloqueiam esse tipo de leitura de arquivo por segurança."),
        h("p", { class: "espaco-topo" }, [
          "Abra um terminal na pasta ", h("b", {}, "estilo/"), " e rode:",
        ]),
        h("p", { class: "espaco-topo" }, h("code", {}, "python3 -m http.server 8787")),
        h("p", { class: "espaco-topo" }, ["Depois acesse ", h("b", {}, "http://localhost:8787"), " no navegador."]),
      ]),
    ]);
    app.appendChild(tela);
  }

  async function rotear() {
    executarLimpezas();
    const app = document.getElementById("app");
    app.innerHTML = "";
    const ok = await carregarEstilosSeNecessario();
    if (!ok) { renderErroCarregamento(app); return; }

    const { nome, id } = parseRota();
    try {
      if (nome === "novo") return await viewNovo(app);
      if (nome === "referencias") return await comCliente(app, id, viewReferencias);
      if (nome === "direcoes") return await comCliente(app, id, viewDirecoes);
      if (nome === "estudio") return await comCliente(app, id, viewEstudio);
      if (nome === "motion") return await comCliente(app, id, viewMotion);
      if (nome === "aprovacao") return await comCliente(app, id, viewAprovacao);
      if (nome === "pacote") return await comCliente(app, id, viewPacote);
      return await viewBiblioteca(app);
    } catch (e) {
      console.error("[app] erro ao renderizar tela", e);
      app.innerHTML = "";
      app.appendChild(
        h("div", { class: "tela" }, [
          h("div", { class: "erro-carregamento" }, [
            h("h2", {}, "Algo deu errado nessa tela"),
            h("p", {}, String((e && e.message) || e)),
            h("p", { class: "espaco-topo" }, h("a", { href: "#/biblioteca", class: "botao" }, "Voltar para a biblioteca")),
          ]),
        ])
      );
    }
  }

  async function comCliente(app, id, viewFn) {
    const cliente = id ? await BaseFLDB.clienteObter(id) : null;
    if (!cliente) {
      app.appendChild(
        h("div", { class: "tela" }, [
          h("div", { class: "vazio" }, [
            h("p", {}, "Não achei esse cliente — ele pode ter sido excluído."),
            h("a", { href: "#/biblioteca", class: "botao primario" }, "Voltar para a biblioteca"),
          ]),
        ])
      );
      return;
    }
    return viewFn(app, cliente);
  }

  // ---------- topo / navegação por etapas ----------

  function iniciarTela(app, cliente, passoAtual) {
    const nav = [h("a", { href: "#/biblioteca", class: passoAtual === "biblioteca" ? "ativo" : "" }, "Biblioteca")];
    if (cliente) {
      const reachEstudio = !!cliente.direcaoEscolhidaId;
      const passos = [
        ["referencias", "Referências", true],
        ["direcoes", "Direções", true],
        ["estudio", "Estúdio", reachEstudio],
        ["motion", "Motion", reachEstudio],
        ["aprovacao", "Aprovação", reachEstudio],
        ["pacote", "Pacote", reachEstudio],
      ];
      passos.forEach(([rota, rotulo, habilitado]) => {
        if (habilitado) {
          nav.push(h("a", { href: "#/" + rota + "/" + cliente.id, class: passoAtual === rota ? "ativo" : "" }, rotulo));
        } else {
          nav.push(h("span", { class: "badge", style: { opacity: ".5" } }, rotulo));
        }
      });
    }
    const topbar = h("div", { class: "topbar" }, [
      h("a", { href: "#/biblioteca", class: "marca" }, [h("span", { class: "ponto" }), document.createTextNode(" Estilo do Cliente")]),
      h("nav", {}, nav),
    ]);
    app.appendChild(topbar);
    const tela = h("div", { class: "tela" });
    app.appendChild(tela);
    return tela;
  }

  // ======================================================================
  // BIBLIOTECA
  // ======================================================================

  async function viewBiblioteca(app) {
    const tela = iniciarTela(app, null, "biblioteca");
    tela.appendChild(
      h("div", { class: "tela-cabeca" }, [
        h("div", {}, [
          h("h1", {}, "Biblioteca de clientes"),
          h("p", { class: "sub" }, "Todo cliente que você começa a estilizar fica guardado aqui, neste navegador."),
        ]),
        h("a", { href: "#/novo", class: "botao primario" }, "+ Novo cliente"),
      ])
    );

    const clientes = await BaseFLDB.clientesListar();
    clientes.sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0));

    if (!clientes.length) {
      tela.appendChild(
        h("div", { class: "vazio" }, [
          h("p", {}, "Você ainda não tem nenhum cliente aqui."),
          h("a", { href: "#/novo", class: "botao primario" }, "Criar o primeiro cliente"),
        ])
      );
      return;
    }

    const grade = h("div", { class: "grade-clientes" });
    clientes.forEach((c) => {
      const estilo = c.direcaoEscolhidaId ? ESTILOS.find((e) => e.id === c.direcaoEscolhidaId) : null;
      const paleta = c.ajustes && c.ajustes.paleta;
      const miniPaleta = h(
        "div",
        { class: "mini-paleta" },
        paleta ? PAPEIS_PALETA.map((p) => h("span", { style: { background: paleta[p] } })) : [h("span", { style: { background: "#242724" } })]
      );
      const linkAbrir = "#/" + (c.direcaoEscolhidaId ? "estudio" : "direcoes") + "/" + c.id;
      grade.appendChild(
        h("div", { class: "cliente-card" }, [
          h("div", { class: "nome" }, c.nome),
          h("div", { class: "meta" }, [
            h("span", {}, c.nicho || "sem nicho"),
            estilo ? h("span", { class: "badge" }, estilo.nome) : h("span", { class: "texto-apagado" }, "sem direção ainda"),
          ]),
          miniPaleta,
          h("div", { class: "acoes" }, [
            h("a", { href: linkAbrir, class: "botao pequeno primario" }, "Abrir"),
            h("button", {
              class: "botao pequeno",
              onclick: async () => { await BaseFLDB.clienteDuplicar(c.id); toast("Cliente duplicado."); rotear(); },
            }, "Duplicar"),
            h("button", {
              class: "botao pequeno perigo",
              onclick: async () => {
                if (confirm('Excluir "' + c.nome + '"? Essa ação não pode ser desfeita.')) {
                  await BaseFLDB.clienteExcluir(c.id);
                  toast("Cliente excluído.");
                  rotear();
                }
              },
            }, "Excluir"),
          ]),
        ])
      );
    });
    tela.appendChild(grade);
  }

  // ======================================================================
  // CLIENTE NOVO
  // ======================================================================

  async function viewNovo(app) {
    const tela = iniciarTela(app, null, "novo");
    tela.appendChild(
      h("div", { class: "tela-cabeca" }, [
        h("div", {}, [h("h1", {}, "Cliente novo"), h("p", { class: "sub" }, "Três escolhas rápidas já deixam a direção de estilo bem mais próxima do que esse cliente precisa.")]),
      ])
    );

    const cartao = h("div", { class: "cartao form-largura" });
    tela.appendChild(cartao);

    const escolhas = { sobrioVibrante: null, classicoModerno: null, serioLeve: null };

    const campoNome = h("input", { type: "text", placeholder: "Ex.: Clínica Boa Vista" });
    const campoNicho = h("select", {}, [h("option", { value: "" }, "Selecione um nicho"), ...NICHOS.map((n) => h("option", { value: n }, capitalizar(n)))]);

    cartao.appendChild(h("div", { class: "form-grupo" }, [h("label", {}, "Nome do cliente"), campoNome]));
    cartao.appendChild(h("div", { class: "form-grupo" }, [h("label", {}, "Nicho"), campoNicho]));

    const paresWrap = h("div", { class: "pares-visuais" });
    cartao.appendChild(paresWrap);

    const botaoContinuar = h("button", { class: "botao primario", disabled: "true" }, "Continuar para as referências");

    function montarPares() {
      paresWrap.innerHTML = "";
      PARES_PERSONALIDADE.forEach((par) => {
        const opcoesEl = h(
          "div",
          { class: "par-opcoes" },
          par.opcoes.map((op) =>
            h("button", {
              type: "button",
              class: "par-opcao" + (escolhas[par.chave] === op.valor ? " selecionada" : ""),
              onclick: () => { escolhas[par.chave] = op.valor; montarPares(); atualizarBotao(); },
            }, [
              h("div", { class: "amostra", style: op.estilo }, "Aa"),
              h("div", { class: "legenda" }, op.rotulo),
            ])
          )
        );
        paresWrap.appendChild(h("div", { class: "par-visual" }, [h("h3", {}, par.titulo), opcoesEl]));
      });
    }

    function atualizarBotao() {
      const tudoEscolhido = PARES_PERSONALIDADE.every((p) => escolhas[p.chave] !== null);
      botaoContinuar.disabled = !(campoNome.value.trim() && campoNicho.value && tudoEscolhido);
    }

    campoNome.addEventListener("input", atualizarBotao);
    campoNicho.addEventListener("change", atualizarBotao);
    montarPares();

    botaoContinuar.addEventListener("click", async () => {
      const cliente = {
        id: novoId("cli"),
        nome: campoNome.value.trim(),
        nicho: campoNicho.value,
        personalidade: { sobrioVibrante: escolhas.sobrioVibrante, classicoModerno: escolhas.classicoModerno, serioLeve: escolhas.serioLeve },
        referencias: { logoBlob: null, imagensBlobs: [], materialBlob: null, materialTipo: null, coresExtraidas: [], coresSelecionadas: [] },
        direcaoEscolhidaId: null,
        ajustes: null,
        versoes: [],
        aprovacao: { aprovado: false, quando: null },
        criadoEm: Date.now(),
        atualizadoEm: Date.now(),
      };
      await BaseFLDB.clienteSalvar(cliente);
      navegar("#/referencias/" + cliente.id);
    });

    cartao.appendChild(h("div", { class: "espaco-topo" }, botaoContinuar));
  }

  // ======================================================================
  // REFERÊNCIAS
  // ======================================================================

  function montarDropzone({ texto, aceite, multiplo, onArquivos }) {
    const input = h("input", { type: "file", accept: aceite, multiple: multiplo ? "true" : null });
    const zona = h("div", { class: "dropzone", tabindex: "0", role: "button" }, [h("p", {}, texto), input]);
    zona.addEventListener("click", () => input.click());
    zona.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
    input.addEventListener("change", () => { if (input.files && input.files.length) onArquivos(Array.from(input.files)); input.value = ""; });
    ["dragover", "dragenter"].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add("sobre"); }));
    ["dragleave", "drop"].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.remove("sobre"); }));
    zona.addEventListener("drop", (e) => {
      const arquivos = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
      if (arquivos.length) onArquivos(arquivos);
    });
    return zona;
  }

  async function viewReferencias(app, cliente) {
    const tela = iniciarTela(app, cliente, "referencias");
    tela.appendChild(
      h("div", { class: "tela-cabeca" }, [
        h("div", {}, [h("h1", {}, "Referências de " + cliente.nome), h("p", { class: "sub" }, "Envie o logo e algumas fotos/prints do cliente. A gente lê as cores direto dessas imagens, no seu navegador — nada sai daqui.")]),
      ])
    );

    const corpo = h("div", {});
    tela.appendChild(corpo);

    function montar() {
      corpo.innerHTML = "";

      // --- logo ---
      const blocoLogo = h("div", { class: "cartao" });
      blocoLogo.appendChild(h("h3", { style: { marginBottom: "12px" } }, "Logo"));
      if (cliente.referencias.logoBlob) {
        const url = URL.createObjectURL(cliente.referencias.logoBlob);
        registrarLimpeza(() => URL.revokeObjectURL(url));
        blocoLogo.appendChild(
          h("div", { class: "miniaturas" }, [
            h("div", { class: "miniatura" }, [
              h("img", { src: url, alt: "Logo do cliente" }),
              h("button", { class: "remover", onclick: async () => { cliente.referencias.logoBlob = null; await BaseFLDB.clienteSalvar(cliente); montar(); } }, "×"),
            ]),
          ])
        );
      } else {
        blocoLogo.appendChild(
          montarDropzone({
            texto: "Arraste o logo aqui ou clique para escolher",
            aceite: "image/*",
            multiplo: false,
            onArquivos: async (arquivos) => {
              cliente.referencias.logoBlob = arquivos[0];
              await extrairEMergirCores(arquivos[0]);
              await BaseFLDB.clienteSalvar(cliente);
              montar();
            },
          })
        );
      }
      corpo.appendChild(blocoLogo);

      // --- imagens ---
      const blocoImgs = h("div", { class: "cartao espaco-topo" });
      blocoImgs.appendChild(h("h3", { style: { marginBottom: "12px" } }, "Fotos ou prints (até 5)"));
      const miniaturasImgs = h("div", { class: "miniaturas" });
      cliente.referencias.imagensBlobs.forEach((blob, idx) => {
        const url = URL.createObjectURL(blob);
        registrarLimpeza(() => URL.revokeObjectURL(url));
        miniaturasImgs.appendChild(
          h("div", { class: "miniatura" }, [
            h("img", { src: url, alt: "Referência " + (idx + 1) }),
            h("button", {
              class: "remover",
              onclick: async () => { cliente.referencias.imagensBlobs.splice(idx, 1); await BaseFLDB.clienteSalvar(cliente); montar(); },
            }, "×"),
          ])
        );
      });
      blocoImgs.appendChild(miniaturasImgs);
      if (cliente.referencias.imagensBlobs.length < 5) {
        blocoImgs.appendChild(
          h("div", { class: "espaco-topo" }, montarDropzone({
            texto: "Arraste até " + (5 - cliente.referencias.imagensBlobs.length) + " imagem(ns) ou clique para escolher",
            aceite: "image/*",
            multiplo: true,
            onArquivos: async (arquivos) => {
              const vagas = 5 - cliente.referencias.imagensBlobs.length;
              const usar = arquivos.slice(0, vagas);
              if (arquivos.length > vagas) toast("Só dá pra usar mais " + vagas + " imagem(ns) — o resto foi ignorado.");
              for (const arq of usar) {
                cliente.referencias.imagensBlobs.push(arq);
                await extrairEMergirCores(arq);
              }
              await BaseFLDB.clienteSalvar(cliente);
              montar();
            },
          }))
        );
      }
      corpo.appendChild(blocoImgs);

      // --- cores encontradas ---
      const blocoCores = h("div", { class: "cartao espaco-topo" });
      blocoCores.appendChild(h("h3", { style: { marginBottom: "6px" } }, "Cores encontradas"));
      blocoCores.appendChild(h("p", { class: "texto-apagado" }, "Clique para escolher até 4 — a ordem define qual cor tenta ser o fundo, o texto, o destaque e o apoio na direção de estilo."));
      const coresUnicas = dedupeCores(cliente.referencias.coresExtraidas);
      if (!coresUnicas.length) {
        blocoCores.appendChild(h("p", { class: "texto-apagado espaco-topo" }, "Nenhuma cor extraída ainda — envie uma imagem acima."));
      } else {
        const chips = h("div", { class: "chips-cores" });
        coresUnicas.forEach((cor) => {
          const selecionado = cliente.referencias.coresSelecionadas.includes(cor.hex);
          chips.appendChild(
            h("button", {
              class: "chip-cor" + (selecionado ? " selecionado" : ""),
              style: { background: cor.hex },
              title: cor.hex,
              onclick: async () => {
                const idx = cliente.referencias.coresSelecionadas.indexOf(cor.hex);
                if (idx >= 0) {
                  cliente.referencias.coresSelecionadas.splice(idx, 1);
                } else {
                  if (cliente.referencias.coresSelecionadas.length >= 4) { toast("Máximo de 4 cores selecionadas."); return; }
                  cliente.referencias.coresSelecionadas.push(cor.hex);
                }
                await BaseFLDB.clienteSalvar(cliente);
                montar();
              },
            })
          );
        });
        blocoCores.appendChild(chips);
      }
      corpo.appendChild(blocoCores);

      corpo.appendChild(
        h("div", { class: "espaco-topo flex-linha" }, [
          h("a", { href: "#/direcoes/" + cliente.id, class: "botao primario" }, "Ver as 3 direções sugeridas"),
        ])
      );
    }

    async function extrairEMergirCores(blob) {
      try {
        const cores = await BaseFLColor.extrairPaletaDeImagem(blob, 6);
        cliente.referencias.coresExtraidas = (cliente.referencias.coresExtraidas || []).concat(cores);
      } catch (e) {
        console.warn("[referencias] falha extraindo cores", e);
        toast("Não consegui ler as cores dessa imagem.");
      }
    }

    function dedupeCores(lista) {
      const mapa = new Map();
      (lista || []).forEach((c) => {
        if (!mapa.has(c.hex)) mapa.set(c.hex, { hex: c.hex, count: 0 });
        mapa.get(c.hex).count += c.count || 1;
      });
      return Array.from(mapa.values()).sort((a, b) => b.count - a.count).slice(0, 10);
    }

    montar();
  }

  // ======================================================================
  // DIREÇÕES
  // ======================================================================

  function ajustesPadrao(estilo, paleta) {
    return {
      formato: "9:16",
      paleta: Object.assign({}, paleta),
      fontePar: Object.assign({}, estilo.fontes.find((f) => f.recomendado) || estilo.fontes[0]),
      legenda: Object.assign({}, estilo.legenda),
      intensidadeLook: 100,
      logo: { posicao: "inferior-direita", tamanho: "média", versao: "clara" },
    };
  }

  async function viewDirecoes(app, cliente) {
    const tela = iniciarTela(app, cliente, "direcoes");
    tela.appendChild(
      h("div", { class: "tela-cabeca" }, [
        h("div", {}, [h("h1", {}, "As 3 direções para " + cliente.nome), h("p", { class: "sub" }, "Calculadas a partir das 3 escolhas rápidas, do nicho e das cores de referência. Dá pra trocar depois.")]),
      ])
    );

    const melhores = BaseFLColor.melhoresDirecoes(cliente, ESTILOS, 3);
    const coresObjs = (cliente.referencias.coresSelecionadas || []).map((hex) => ({ hex }));

    garantirFontesCarregadas(melhores.flatMap((m) => [m.estilo.fontes.find((f) => f.recomendado).titulo, m.estilo.fontes.find((f) => f.recomendado).texto]));

    const grade = h("div", { class: "grade-direcoes" });
    tela.appendChild(grade);

    melhores.forEach(({ estilo, score }) => {
      const paleta = BaseFLColor.montarPaletaCliente(estilo, coresObjs);
      const fontePar = estilo.fontes.find((f) => f.recomendado) || estilo.fontes[0];

      const camadaTitulo = h("div", {
        class: "camada-titulo",
        style: {
          color: paleta.texto,
          fontFamily: '"' + fontePar.titulo + '", sans-serif',
          fontWeight: String(estilo.titulo.peso),
          textTransform: estilo.titulo.caixaAlta ? "uppercase" : "none",
          letterSpacing: estilo.titulo.espacamentoLetras,
          top: "14%",
          fontSize: "clamp(16px,6vw,26px)",
        },
      }, cliente.nome);

      const corDestaque = paleta[estilo.legenda.corDestaquePalavra] || paleta.destaque;
      const legendaFundo = estilo.legenda.formato === "caixa" ? "rgba(0,0,0,.55)" : "transparent";
      const legendaBorda = estilo.legenda.formato === "contorno" ? "1px solid " + corDestaque : "none";
      const camadaLegenda = h("div", {
        class: "camada-legenda",
        style: {
          background: legendaFundo, border: legendaBorda, color: paleta.texto,
          textTransform: estilo.legenda.maiusculas ? "uppercase" : "none",
          fontFamily: '"' + fontePar.texto + '", sans-serif',
        },
      }, ["Isso é um exemplo em ", h("b", { style: { color: corDestaque } }, "destaque"), "."]);

      const preview = h("div", { class: "direcao-preview", style: { background: paleta.fundo } }, [camadaTitulo, camadaLegenda]);

      let intervalo = setInterval(() => {
        try {
          BaseFLMotion.animarEntrada(camadaTitulo, estilo, 0);
          BaseFLMotion.animarDestaquePalavra(camadaLegenda.querySelector("b"), estilo, estilo.motion.atrasoEntreElementosMs);
        } catch (e) {}
      }, Math.max(1800, estilo.motion.duracaoEntradaMs + 1400));
      registrarLimpeza(() => clearInterval(intervalo));

      const direcaoPaleta = h("div", { class: "direcao-paleta" }, PAPEIS_PALETA.map((p) => h("span", { style: { background: paleta[p] } })));

      const card = h("div", { class: "direcao-card" + (cliente.direcaoEscolhidaId === estilo.id ? " selecionada" : "") }, [
        preview,
        h("div", { class: "direcao-corpo" }, [
          h("div", { class: "nome-estilo" }, estilo.nome),
          h("div", { class: "score" }, Math.round(score) + "% de encaixe com esse cliente"),
          h("p", { class: "resumo" }, estilo.resumo),
          direcaoPaleta,
          h("div", { class: "fonte-rec" }, "Fontes: " + fontePar.titulo + " + " + fontePar.texto),
          h("button", {
            class: "botao primario",
            onclick: async () => {
              cliente.direcaoEscolhidaId = estilo.id;
              cliente.ajustes = ajustesPadrao(estilo, paleta);
              await BaseFLDB.clienteSalvar(cliente);
              navegar("#/estudio/" + cliente.id);
            },
          }, cliente.direcaoEscolhidaId === estilo.id ? "Direção escolhida ✓" : "Escolher essa direção"),
        ]),
      ]);
      grade.appendChild(card);
    });
  }

  // ======================================================================
  // OVERLAYS COMPARTILHADOS (Estúdio, Motion, comparação de versões)
  // ======================================================================

  function retanguloLegenda(posicao) {
    const mapa = {
      "centro-baixo": { top: 80, left: 10, width: 80, height: 15 },
      centro: { top: 42, left: 10, width: 80, height: 16 },
      "inferior-esquerda": { top: 78, left: 4, width: 48, height: 15 },
      "inferior-direita": { top: 78, left: 48, width: 48, height: 15 },
    };
    return mapa[posicao] || mapa["centro-baixo"];
  }

  function retanguloLogo(ajustesLogo) {
    const tamMapa = { pequeno: 10, média: 14, grande: 18 };
    const w = tamMapa[ajustesLogo.tamanho] || 14;
    const margem = 4;
    const mapa = {
      "superior-esquerda": { top: margem, left: margem },
      "superior-direita": { top: margem, left: 100 - w - margem },
      centro: { top: 44, left: (100 - w) / 2 },
      "inferior-esquerda": { top: 100 - w - margem, left: margem },
      "inferior-direita": { top: 100 - w - margem, left: 100 - w - margem },
    };
    const pos = mapa[ajustesLogo.posicao] || mapa["inferior-direita"];
    return { top: pos.top, left: pos.left, width: w, height: w };
  }

  function sobrepoe(a, b) {
    return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;
  }

  function calcularAvisos(estilo, ajustes) {
    const avisos = [];
    const corPalavra = ajustes.paleta[ajustes.legenda.corDestaquePalavra] || ajustes.paleta.destaque;
    const corFundoComparar = ajustes.legenda.formato === "caixa" ? "#000000" : ajustes.paleta.fundo;
    let ratio = 21;
    try { ratio = BaseFLColor.contraste(corPalavra, corFundoComparar); } catch (e) {}
    if (ratio < 4.5) {
      avisos.push("Contraste da palavra em destaque está em " + ratio.toFixed(1) + ":1 (o ideal é 4,5:1 ou mais). Pode ficar difícil de ler.");
    }
    if (ajustes.formato === "9:16") {
      const retLegenda = retanguloLegenda(ajustes.legenda.posicao);
      const retLogo = retanguloLogo(ajustes.logo);
      AREAS_APP_APROXIMADAS.forEach((area) => {
        if (sobrepoe(area, retLegenda)) avisos.push('A legenda está numa área normalmente coberta pelo app (aproximado): "' + area.nome + '". Considere mudar a posição.');
        if (sobrepoe(area, retLogo)) avisos.push('O logo está numa área normalmente coberta pelo app (aproximado): "' + area.nome + '". Considere mudar a posição.');
      });
    }
    return avisos;
  }

  /** Monta a estrutura DOM das camadas do estilo sobre o palco. Retorna refs para sincronizar depois. */
  function montarCamadas(wrapper, opts) {
    opts = opts || {};
    const overlays = h("div", { style: { position: "absolute", inset: "0" } });
    wrapper.appendChild(overlays);

    const linhaTitulo = h("div", { style: { position: "absolute", height: "3px", background: "currentColor", opacity: "0" } });
    const titulo = h("div", { class: "camada camada-titulo-el" });
    const notaGrafica = h("div", { class: "camada texto-apagado", style: { fontSize: "9.5px", maxWidth: "70%" } });
    const lowerThird = h("div", { class: "camada camada-lower-el" });
    const logoEl = h("img", { class: "camada-logo-el", alt: "Logo do cliente" });
    const legendaCaixa = h("span", { class: "caixa" });
    const palavraDestaque = h("b", {});
    legendaCaixa.appendChild(document.createTextNode("Isso é um exemplo em "));
    legendaCaixa.appendChild(palavraDestaque);
    legendaCaixa.appendChild(document.createTextNode("."));
    palavraDestaque.textContent = "destaque";
    const legenda = h("div", { class: "camada camada-legenda-el" }, [legendaCaixa]);
    const cta = opts.comCTA ? h("div", { class: "camada" }) : null;

    [titulo, linhaTitulo, notaGrafica, lowerThird, logoEl, legenda, cta].forEach((el) => { if (el) overlays.appendChild(el); });

    const areasEl = [];
    if (opts.mostrarAreasApp) {
      AREAS_APP_APROXIMADAS.forEach((area) => {
        const el = h("div", {
          class: "area-app",
          style: { top: area.top + "%", left: area.left + "%", width: area.width + "%", height: area.height + "%" },
        }, "área coberta pelo app (aproximado) — " + area.nome);
        overlays.appendChild(el);
        areasEl.push(el);
      });
    }

    return { overlays, titulo, linhaTitulo, notaGrafica, lowerThird, logoEl, legenda, legendaCaixa, palavraDestaque, cta, areasEl };
  }

  /** Aplica cores/fontes/posições atuais às camadas (sem recriar elementos). */
  function sincronizarCamadas(refs, cliente, estilo, ajustes, opts) {
    opts = opts || {};
    const paleta = ajustes.paleta;
    const corDestaquePalavra = paleta[ajustes.legenda.corDestaquePalavra] || paleta.destaque;
    const opacidadeInicial = opts.visivelDeImediato ? "1" : "0";

    // título
    refs.titulo.textContent = cliente.nome;
    Object.assign(refs.titulo.style, {
      position: "absolute", left: "10%", right: "10%", top: "10%", textAlign: "center",
      color: paleta.texto, fontFamily: '"' + ajustes.fontePar.titulo + '", sans-serif',
      fontWeight: String(estilo.titulo.peso), letterSpacing: estilo.titulo.espacamentoLetras,
      textTransform: estilo.titulo.caixaAlta ? "uppercase" : "none",
      fontSize: "clamp(16px,5.6vw,30px)", opacity: opacidadeInicial,
    });
    Object.assign(refs.linhaTitulo.style, { left: "35%", width: "30%", top: "19%", color: paleta.destaque, opacity: opacidadeInicial });
    Object.assign(refs.notaGrafica.style, { left: "15%", top: "21%", textAlign: "center", width: "70%", opacity: opts.mostrarNotaGrafica ? "1" : "0" });
    refs.notaGrafica.textContent = estilo.titulo.elementoGrafico;

    // lower third
    refs.lowerThird.textContent = cliente.nome + (cliente.nicho ? " · " + capitalizar(cliente.nicho) : "");
    Object.assign(refs.lowerThird.style, {
      left: "6%", bottom: "30%", color: paleta.texto, fontFamily: '"' + ajustes.fontePar.texto + '", sans-serif',
      fontSize: "12.5px", fontWeight: "600", opacity: opacidadeInicial,
    });

    // logo
    const retLogo = retanguloLogo(ajustes.logo);
    Object.assign(refs.logoEl.style, {
      left: retLogo.left + "%", top: retLogo.top + "%", width: retLogo.width + "%", height: retLogo.width + "%",
      opacity: opacidadeInicial, filter: ajustes.logo.versao === "escura" && !opts.temVariantesDeLogo ? "invert(1) hue-rotate(180deg)" : "none",
      cursor: opts.contaGotasAtivo ? "crosshair" : "default",
    });

    // legenda
    const retLeg = retanguloLegenda(ajustes.legenda.posicao);
    const tamFonte = { pequena: "12px", média: "15px", grande: "19px" }[ajustes.legenda.tamanhoRelativo] || "15px";
    const legendaCentralizada = ajustes.legenda.posicao === "centro-baixo" || ajustes.legenda.posicao === "centro";
    Object.assign(refs.legenda.style, { left: retLeg.left + "%", top: retLeg.top + "%", width: retLeg.width + "%", opacity: opacidadeInicial, textAlign: legendaCentralizada ? "center" : "left" });
    Object.assign(refs.legendaCaixa.style, {
      fontSize: tamFonte, color: paleta.texto, fontFamily: '"' + ajustes.fontePar.texto + '", sans-serif',
      textTransform: ajustes.legenda.maiusculas ? "uppercase" : "none",
      background: ajustes.legenda.formato === "caixa" ? "rgba(0,0,0,.55)" : "transparent",
      border: ajustes.legenda.formato === "contorno" ? "1px solid " + corDestaquePalavra : "none",
    });
    refs.palavraDestaque.style.color = corDestaquePalavra;

    if (refs.cta) {
      refs.cta.textContent = "Fale com a gente";
      const corTexto = escolherTextoLegivel(paleta.destaque, paleta.fundo, paleta.texto);
      Object.assign(refs.cta.style, {
        left: "50%", bottom: "8%", transform: "translateX(-50%)", background: paleta.destaque, color: corTexto,
        padding: "9px 20px", borderRadius: "99px", fontWeight: "800", fontFamily: '"' + ajustes.fontePar.titulo + '", sans-serif',
        fontSize: "13px", opacity: opacidadeInicial,
      });
    }
  }

  // ======================================================================
  // ESTÚDIO
  // ======================================================================

  async function viewEstudio(app, cliente) {
    if (!cliente.direcaoEscolhidaId) { navegar("#/direcoes/" + cliente.id); return; }
    const estilo = ESTILOS.find((e) => e.id === cliente.direcaoEscolhidaId);
    if (!estilo) { navegar("#/direcoes/" + cliente.id); return; }

    let ajustes = cliente.ajustes ? clone(cliente.ajustes) : ajustesPadrao(estilo, BaseFLColor.montarPaletaCliente(estilo, (cliente.referencias.coresSelecionadas || []).map((hx) => ({ hex: hx }))));
    let historico = [clone(ajustes)];
    let ponteiro = 0;
    let modoContaGotas = null;
    let imgLogoDecodificado = null;
    let mostrarComparacao = false;
    let imageDataOriginalCache = null; // cache do frame original (para o slider de intensidade não redecodificar)

    garantirFontesCarregadas(estilo.fontes.flatMap((f) => [f.titulo, f.texto]));

    if (cliente.referencias.logoBlob) {
      try {
        const { img, url } = await decodificarImagem(cliente.referencias.logoBlob);
        imgLogoDecodificado = img;
        registrarLimpeza(() => URL.revokeObjectURL(url));
      } catch (e) {}
    }

    const tela = iniciarTela(app, cliente, "estudio");

    function persistir() { cliente.ajustes = clone(ajustes); BaseFLDB.clienteSalvar(cliente); }
    function commit() { historico = historico.slice(0, ponteiro + 1); historico.push(clone(ajustes)); ponteiro = historico.length - 1; persistir(); }
    function desfazer() { if (ponteiro > 0) { ponteiro--; ajustes = clone(historico[ponteiro]); persistir(); montar(); } }
    function refazer() { if (ponteiro < historico.length - 1) { ponteiro++; ajustes = clone(historico[ponteiro]); persistir(); montar(); } }

    let elementoMaterialAtual = null;
    let urlMaterialAtual = null;

    async function construirPalco(container) {
      if (urlMaterialAtual) { URL.revokeObjectURL(urlMaterialAtual); urlMaterialAtual = null; }
      imageDataOriginalCache = null;
      const wrap = h("div", { class: "palco-canvas-wrap", style: { aspectRatio: aspectCss(ajustes.formato) } });

      const material = cliente.referencias.materialBlob;
      const tipo = cliente.referencias.materialTipo;
      if (material && tipo === "video") {
        urlMaterialAtual = URL.createObjectURL(material);
        const video = h("video", { src: urlMaterialAtual, autoplay: "true", muted: "true", loop: "true", playsinline: "true" });
        video.style.filter = filtroCssDoLook(estilo.corDoVideo, ajustes.intensidadeLook);
        wrap.appendChild(video);
        elementoMaterialAtual = video;
      } else if (material && tipo === "imagem") {
        urlMaterialAtual = URL.createObjectURL(material);
        const canvas = h("canvas");
        wrap.appendChild(canvas);
        elementoMaterialAtual = canvas;
        try {
          const { img } = await decodificarImagem(material);
          const maxLado = 1280;
          const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight));
          canvas.width = Math.round(img.naturalWidth * escala);
          canvas.height = Math.round(img.naturalHeight * escala);
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          imageDataOriginalCache = ctx.getImageData(0, 0, canvas.width, canvas.height);
          redesenharImagemComLook(canvas, imageDataOriginalCache, estilo.corDoVideo, ajustes.intensidadeLook);
        } catch (e) { console.warn("[estudio] falha processando imagem", e); }
      } else {
        wrap.appendChild(h("div", { style: { position: "absolute", inset: "0", background: ajustes.paleta.fundo } }));
        wrap.appendChild(h("p", { class: "texto-apagado", style: { position: "absolute", left: "10%", right: "10%", top: "45%", textAlign: "center" } }, "Nenhum material enviado — mostrando só as camadas do estilo."));
        elementoMaterialAtual = null;
      }

      const refs = montarCamadas(wrap, { comCTA: false, mostrarAreasApp: ajustes.formato === "9:16" });
      sincronizarCamadas(refs, cliente, estilo, ajustes, { visivelDeImediato: true, mostrarNotaGrafica: true, contaGotasAtivo: !!modoContaGotas, temVariantesDeLogo: !cliente.referencias.logoBlob });

      if (imgLogoDecodificado) {
        refs.logoEl.src = imgLogoDecodificado.src;
      } else {
        try {
          const blobPlaceholder = await BaseFLZip.gerarLogoPlaceholder(cliente.nome, ajustes.paleta, ajustes.logo.versao === "clara");
          refs.logoEl.src = URL.createObjectURL(blobPlaceholder);
          registrarLimpeza(() => URL.revokeObjectURL(refs.logoEl.src));
        } catch (e) {}
      }
      refs.logoEl.addEventListener("click", (ev) => {
        if (!modoContaGotas) return;
        const cor = amostrarCorDoLogo(ev, refs.logoEl);
        if (cor) {
          ajustes.paleta[modoContaGotas] = BaseFLColor.encaixarCorNoPapel(cor, estilo.paleta[modoContaGotas]);
          modoContaGotas = null;
          commit();
          montar();
        } else {
          toast("Clique numa parte visível do logo.");
        }
      });

      container.appendChild(wrap);
    }

    function amostrarCorDoLogo(evento, imgEl) {
      if (!imgLogoDecodificado) return null;
      try {
        const rect = imgEl.getBoundingClientRect();
        const xRel = (evento.clientX - rect.left) / rect.width;
        const yRel = (evento.clientY - rect.top) / rect.height;
        const tmp = document.createElement("canvas");
        tmp.width = imgLogoDecodificado.naturalWidth;
        tmp.height = imgLogoDecodificado.naturalHeight;
        const ctx = tmp.getContext("2d");
        ctx.drawImage(imgLogoDecodificado, 0, 0);
        const px = Math.min(tmp.width - 1, Math.max(0, Math.round(xRel * tmp.width)));
        const py = Math.min(tmp.height - 1, Math.max(0, Math.round(yRel * tmp.height)));
        const d = ctx.getImageData(px, py, 1, 1).data;
        if (d[3] < 40) return null;
        return BaseFLColor.rgbParaHex(d[0], d[1], d[2]);
      } catch (e) { return null; }
    }

    function aspectCss(formato) {
      return { "9:16": "9/16", "4:5": "4/5", "16:9": "16/9" }[formato] || "9/16";
    }

    function segBotoes(opcoes, valorAtual, onEscolher) {
      return h("div", { class: "seg-botoes" }, opcoes.map((op) =>
        h("button", { type: "button", "aria-pressed": String(op === valorAtual), onclick: () => onEscolher(op) }, capitalizar(op))
      ));
    }

    async function montar() {
      tela.innerHTML = "";

      tela.appendChild(h("div", { class: "tela-cabeca" }, [
        h("div", {}, [h("h1", {}, "Estúdio — " + cliente.nome), h("p", { class: "sub" }, "Direção: " + estilo.nome + ". Todo ajuste de cor fica dentro dos limites do estilo escolhido.")]),
        h("a", { href: "#/direcoes/" + cliente.id, class: "botao fantasma pequeno" }, "Trocar direção"),
      ]));

      const grid = h("div", { class: "estudio-grid" });
      tela.appendChild(grid);

      const palco = h("div", { class: "palco" });
      grid.appendChild(palco);

      palco.appendChild(h("div", { class: "formatos-tabs" }, FORMATOS_VIDEO.map((f) =>
        h("button", { type: "button", "aria-selected": String(f === ajustes.formato), onclick: () => { ajustes.formato = f; commit(); montar(); } }, f)
      )));

      const inputMaterial = h("input", { type: "file", accept: "image/*,video/*", style: { display: "none" } });
      inputMaterial.addEventListener("change", async () => {
        const f = inputMaterial.files && inputMaterial.files[0];
        if (!f) return;
        cliente.referencias.materialBlob = f;
        cliente.referencias.materialTipo = f.type.indexOf("video") === 0 ? "video" : "imagem";
        await BaseFLDB.clienteSalvar(cliente);
        montar();
      });
      palco.appendChild(h("div", { class: "flex-linha" }, [
        h("button", { class: "botao pequeno", onclick: () => inputMaterial.click() }, "Enviar foto ou vídeo do cliente"),
        inputMaterial,
        cliente.referencias.materialBlob ? h("span", { class: "texto-apagado" }, "Material enviado (" + cliente.referencias.materialTipo + ")") : null,
      ]));

      const containerCanvas = h("div", {});
      palco.appendChild(containerCanvas);
      await construirPalco(containerCanvas);

      const avisos = calcularAvisos(estilo, ajustes);
      const avisosWrap = h("div", {});
      if (avisos.length) {
        avisos.forEach((a) => avisosWrap.appendChild(h("div", { class: "aviso" }, [h("b", {}, "Atenção: "), a])));
      } else {
        avisosWrap.appendChild(h("div", { class: "aviso ok" }, "Contraste da legenda e posições parecem ok."));
      }
      palco.appendChild(avisosWrap);

      palco.appendChild(h("div", { class: "historico-botoes espaco-topo" }, [
        h("button", { class: "botao pequeno", disabled: ponteiro === 0 ? "true" : null, onclick: desfazer }, "Desfazer"),
        h("button", { class: "botao pequeno", disabled: ponteiro === historico.length - 1 ? "true" : null, onclick: refazer }, "Refazer"),
        h("button", {
          class: "botao pequeno primario",
          onclick: async () => {
            const nomeVersao = prompt("Nome dessa versão:", "Versão " + (cliente.versoes.length + 1));
            if (!nomeVersao) return;
            cliente.versoes.push({ id: novoId("ver"), nome: nomeVersao, criadoEm: Date.now(), ajustes: clone(ajustes) });
            await BaseFLDB.clienteSalvar(cliente);
            toast("Versão salva.");
            montar();
          },
        }, "Salvar versão"),
        cliente.versoes.length >= 1 ? h("button", { class: "botao pequeno", onclick: () => { mostrarComparacao = !mostrarComparacao; montar(); } }, mostrarComparacao ? "Fechar comparação" : "Comparar versões") : null,
      ]));

      if (mostrarComparacao) {
        palco.appendChild(await montarComparacao());
      }

      // --- painel de ajustes ---
      const painel = h("aside", { class: "painel-ajustes cartao" });
      grid.appendChild(painel);

      // cores
      const blocoCores = h("div", { class: "ajuste-bloco" }, [h("h4", {}, "Cores")]);
      if (!cliente.referencias.logoBlob) blocoCores.appendChild(h("p", { class: "conta-gotas-dica" }, "Envie um logo nas Referências para usar o conta-gotas."));
      PAPEIS_PALETA.forEach((papel) => {
        const inputCor = h("input", { type: "color", value: ajustes.paleta[papel], style: { display: "none" } });
        inputCor.addEventListener("change", (e) => {
          ajustes.paleta[papel] = BaseFLColor.encaixarCorNoPapel(e.target.value, estilo.paleta[papel]);
          commit();
          montar();
        });
        blocoCores.appendChild(h("div", { class: "linha-cor" }, [
          h("button", { class: "amostra-cor", style: { background: ajustes.paleta[papel] }, "aria-label": "Escolher cor de " + papel, onclick: () => inputCor.click() }),
          inputCor,
          h("span", { class: "rotulo" }, ROTULOS_PAPEL[papel]),
          h("span", { class: "hex" }, ajustes.paleta[papel]),
          h("button", {
            class: "botao pequeno fantasma",
            disabled: cliente.referencias.logoBlob ? null : "true",
            onclick: () => { modoContaGotas = modoContaGotas === papel ? null : papel; montar(); },
          }, modoContaGotas === papel ? "Clique no logo…" : "Conta-gotas"),
        ]));
      });
      painel.appendChild(blocoCores);

      // fontes
      const blocoFontes = h("div", { class: "ajuste-bloco" }, [h("h4", {}, "Fontes")]);
      const listaFontes = h("div", { class: "selecao-fontes" });
      estilo.fontes.forEach((par) => {
        const selecionado = ajustes.fontePar.titulo === par.titulo && ajustes.fontePar.texto === par.texto;
        listaFontes.appendChild(h("button", {
          type: "button", class: "opcao-fonte" + (selecionado ? " selecionada" : ""),
          onclick: () => { ajustes.fontePar = { titulo: par.titulo, texto: par.texto }; commit(); montar(); },
        }, [
          h("span", { style: { fontFamily: '"' + par.titulo + '", sans-serif', fontWeight: "800" } }, par.titulo),
          h("span", { class: "texto-apagado" }, " + " + par.texto),
          par.recomendado ? h("span", { class: "badge" }, "recomendado") : null,
        ]));
      });
      blocoFontes.appendChild(listaFontes);
      painel.appendChild(blocoFontes);

      // legenda
      const blocoLegenda = h("div", { class: "ajuste-bloco" }, [h("h4", {}, "Legenda")]);
      blocoLegenda.appendChild(h("p", { class: "texto-apagado", style: { marginBottom: "6px" } }, "Posição"));
      blocoLegenda.appendChild(segBotoes(POSICOES_LEGENDA, ajustes.legenda.posicao, (op) => { ajustes.legenda.posicao = op; commit(); montar(); }));
      blocoLegenda.appendChild(h("p", { class: "texto-apagado", style: { margin: "10px 0 6px" } }, "Tamanho"));
      blocoLegenda.appendChild(segBotoes(TAMANHOS_LEGENDA, ajustes.legenda.tamanhoRelativo, (op) => { ajustes.legenda.tamanhoRelativo = op; commit(); montar(); }));
      blocoLegenda.appendChild(h("p", { class: "texto-apagado", style: { margin: "10px 0 6px" } }, "Formato"));
      blocoLegenda.appendChild(segBotoes(FORMATOS_LEGENDA, ajustes.legenda.formato, (op) => { ajustes.legenda.formato = op; commit(); montar(); }));
      blocoLegenda.appendChild(h("p", { class: "texto-apagado", style: { margin: "10px 0 6px" } }, "Cor da palavra em destaque"));
      blocoLegenda.appendChild(segBotoes(PAPEIS_PALETA, ajustes.legenda.corDestaquePalavra, (op) => { ajustes.legenda.corDestaquePalavra = op; commit(); montar(); }));
      const chkMaiusculas = h("input", { type: "checkbox" });
      chkMaiusculas.checked = !!ajustes.legenda.maiusculas;
      chkMaiusculas.addEventListener("change", () => { ajustes.legenda.maiusculas = chkMaiusculas.checked; commit(); montar(); });
      blocoLegenda.appendChild(h("label", { class: "chk-linha", style: { marginTop: "10px" } }, [chkMaiusculas, "Tudo em caixa alta"]));
      painel.appendChild(blocoLegenda);

      // intensidade do look
      const blocoLook = h("div", { class: "ajuste-bloco" }, [h("h4", {}, "Cor do vídeo")]);
      const labelIntensidade = h("span", {}, ajustes.intensidadeLook + "%");
      const sliderIntensidade = h("input", { type: "range", min: "0", max: "100", value: String(ajustes.intensidadeLook) });
      sliderIntensidade.addEventListener("input", (e) => {
        labelIntensidade.textContent = e.target.value + "%";
        ajustes.intensidadeLook = Number(e.target.value);
        if (elementoMaterialAtual && elementoMaterialAtual.tagName === "VIDEO") {
          elementoMaterialAtual.style.filter = filtroCssDoLook(estilo.corDoVideo, ajustes.intensidadeLook);
        } else if (elementoMaterialAtual && elementoMaterialAtual.tagName === "CANVAS" && imageDataOriginalCache) {
          redesenharImagemComLook(elementoMaterialAtual, imageDataOriginalCache, estilo.corDoVideo, ajustes.intensidadeLook);
        }
      });
      sliderIntensidade.addEventListener("change", () => { commit(); });
      blocoLook.appendChild(h("div", { class: "slider-row" }, [
        h("div", { class: "topo-slider" }, [h("span", {}, "Intensidade"), labelIntensidade]),
        sliderIntensidade,
        h("p", { class: "texto-apagado" }, estilo.corDoVideo.descricao),
      ]));
      painel.appendChild(blocoLook);

      // logo
      const blocoLogo = h("div", { class: "ajuste-bloco" }, [h("h4", {}, "Logo")]);
      blocoLogo.appendChild(h("p", { class: "texto-apagado", style: { marginBottom: "6px" } }, "Posição"));
      blocoLogo.appendChild(segBotoes(POSICOES_LOGO, ajustes.logo.posicao, (op) => { ajustes.logo.posicao = op; commit(); montar(); }));
      blocoLogo.appendChild(h("p", { class: "texto-apagado", style: { margin: "10px 0 6px" } }, "Tamanho"));
      blocoLogo.appendChild(segBotoes(TAMANHOS_LOGO, ajustes.logo.tamanho, (op) => { ajustes.logo.tamanho = op; commit(); montar(); }));
      blocoLogo.appendChild(h("p", { class: "texto-apagado", style: { margin: "10px 0 6px" } }, "Versão"));
      blocoLogo.appendChild(segBotoes(["clara", "escura"], ajustes.logo.versao, (op) => { ajustes.logo.versao = op; commit(); montar(); }));
      if (!cliente.referencias.logoBlob) blocoLogo.appendChild(h("p", { class: "conta-gotas-dica" }, "Sem logo enviado — o pacote final vai incluir um emblema simples com as iniciais do cliente."));
      painel.appendChild(blocoLogo);
    }

    async function montarComparacao() {
      const wrap = h("div", { class: "cartao-leve espaco-topo" });
      wrap.appendChild(h("p", { class: "texto-apagado" }, "Escolha duas versões salvas para ver lado a lado."));
      let escolhidaA = cliente.versoes[cliente.versoes.length - 1] || null;
      let escolhidaB = cliente.versoes[cliente.versoes.length - 2] || cliente.versoes[cliente.versoes.length - 1] || null;

      const selA = h("select", {}, cliente.versoes.map((v) => h("option", { value: v.id }, v.nome)));
      const selB = h("select", {}, cliente.versoes.map((v) => h("option", { value: v.id }, v.nome)));
      if (escolhidaA) selA.value = escolhidaA.id;
      if (escolhidaB) selB.value = escolhidaB.id;

      const gridComp = h("div", { class: "comparacao-grid espaco-topo" });

      async function montarLado(versao) {
        const col = h("div", {});
        if (!versao) { col.appendChild(h("p", { class: "texto-apagado" }, "Sem versão selecionada.")); return col; }
        col.appendChild(h("p", { style: { marginBottom: "8px", fontWeight: "700" } }, versao.nome + " — " + new Date(versao.criadoEm).toLocaleString("pt-BR")));
        const miniWrap = h("div", { class: "palco-canvas-wrap", style: { aspectRatio: aspectCss(versao.ajustes.formato), maxHeight: "320px" } });
        miniWrap.appendChild(h("div", { style: { position: "absolute", inset: "0", background: versao.ajustes.paleta.fundo } }));
        const refs = montarCamadas(miniWrap, { comCTA: false, mostrarAreasApp: false });
        sincronizarCamadas(refs, cliente, estilo, versao.ajustes, { visivelDeImediato: true, mostrarNotaGrafica: false, temVariantesDeLogo: !cliente.referencias.logoBlob });
        if (imgLogoDecodificado) refs.logoEl.src = imgLogoDecodificado.src;
        col.appendChild(miniWrap);
        col.appendChild(h("button", {
          class: "botao pequeno espaco-topo",
          onclick: async () => { ajustes = clone(versao.ajustes); commit(); mostrarComparacao = false; montar(); },
        }, "Restaurar essa versão"));
        return col;
      }

      async function redesenhar() {
        gridComp.innerHTML = "";
        const a = cliente.versoes.find((v) => v.id === selA.value);
        const b = cliente.versoes.find((v) => v.id === selB.value);
        gridComp.appendChild(await montarLado(a));
        gridComp.appendChild(await montarLado(b));
      }
      selA.addEventListener("change", redesenhar);
      selB.addEventListener("change", redesenhar);

      wrap.appendChild(h("div", { class: "flex-linha" }, [selA, selB]));
      wrap.appendChild(gridComp);
      await redesenhar();
      return wrap;
    }

    await montar();
  }

  // ======================================================================
  // MOTION
  // ======================================================================

  async function viewMotion(app, cliente) {
    if (!cliente.direcaoEscolhidaId || !cliente.ajustes) { navegar("#/direcoes/" + cliente.id); return; }
    const estilo = ESTILOS.find((e) => e.id === cliente.direcaoEscolhidaId);
    const ajustes = cliente.ajustes;
    garantirFontesCarregadas([ajustes.fontePar.titulo, ajustes.fontePar.texto]);

    const tela = iniciarTela(app, cliente, "motion");
    tela.appendChild(h("div", { class: "tela-cabeca" }, [
      h("div", {}, [h("h1", {}, "Motion — " + cliente.nome), h("p", { class: "sub" }, "A sequência completa do estilo \"" + estilo.nome + "\", nos tempos e curvas definidos por ele.")]),
    ]));

    let urlMaterial = null;
    const stage = h("div", { class: "motion-stage", style: { aspectRatio: { "9:16": "9/16", "4:5": "4/5", "16:9": "16/9" }[ajustes.formato] || "9/16" } });

    if (cliente.referencias.materialBlob) {
      urlMaterial = URL.createObjectURL(cliente.referencias.materialBlob);
      registrarLimpeza(() => URL.revokeObjectURL(urlMaterial));
      if (cliente.referencias.materialTipo === "video") {
        stage.appendChild(h("video", { src: urlMaterial, autoplay: "true", muted: "true", loop: "true", playsinline: "true", style: { filter: filtroCssDoLook(estilo.corDoVideo, ajustes.intensidadeLook) } }));
      } else {
        stage.appendChild(h("img", { src: urlMaterial, alt: "Frame do cliente", style: { filter: filtroCssDoLook(estilo.corDoVideo, ajustes.intensidadeLook) } }));
      }
    } else {
      stage.appendChild(h("div", { style: { position: "absolute", inset: "0", background: ajustes.paleta.fundo } }));
    }

    const refs = montarCamadas(stage, { comCTA: true, mostrarAreasApp: false });
    let imgLogo = null;
    if (cliente.referencias.logoBlob) {
      const { img, url } = await decodificarImagem(cliente.referencias.logoBlob);
      imgLogo = img;
      registrarLimpeza(() => URL.revokeObjectURL(url));
      refs.logoEl.src = img.src;
    } else {
      const blobPlaceholder = await BaseFLZip.gerarLogoPlaceholder(cliente.nome, ajustes.paleta, ajustes.logo.versao === "clara");
      const url = URL.createObjectURL(blobPlaceholder);
      registrarLimpeza(() => URL.revokeObjectURL(url));
      refs.logoEl.src = url;
    }
    sincronizarCamadas(refs, cliente, estilo, ajustes, { visivelDeImediato: false, mostrarNotaGrafica: false, temVariantesDeLogo: !cliente.referencias.logoBlob });

    tela.appendChild(stage);

    let sequenciaAtual = null;
    function tocar() {
      if (sequenciaAtual) sequenciaAtual.cancelar();
      [refs.titulo, refs.linhaTitulo, refs.lowerThird, refs.logoEl, refs.legenda].forEach((el) => { el.style.opacity = "0"; });
      sequenciaAtual = BaseFLMotion.tocarSequencia(
        { titulo: refs.titulo, linhaTitulo: refs.linhaTitulo, lowerThird: refs.lowerThird, logo: refs.logoEl, legenda: refs.legenda, palavraDestaque: refs.palavraDestaque, cta: refs.cta },
        estilo
      );
    }
    registrarLimpeza(() => { if (sequenciaAtual) sequenciaAtual.cancelar(); });

    tela.appendChild(h("div", { class: "flex-linha espaco-topo", style: { justifyContent: "center" } }, [
      h("button", { class: "botao primario", onclick: tocar }, "Ver motion"),
      h("a", { href: "#/aprovacao/" + cliente.id, class: "botao" }, "Ir para a aprovação"),
    ]));

    tela.appendChild(h("div", { class: "aviso-fixo" }, "Isto é uma prévia de ritmo e curvas. O pacote final para o CapCut é montado à mão a partir destes parâmetros."));

    tocar();
  }

  // ======================================================================
  // APROVAÇÃO
  // ======================================================================

  async function viewAprovacao(app, cliente) {
    if (!cliente.direcaoEscolhidaId || !cliente.ajustes) { navegar("#/direcoes/" + cliente.id); return; }
    const estilo = ESTILOS.find((e) => e.id === cliente.direcaoEscolhidaId);
    const manualHtml = BaseFLZip.gerarManualHtml(cliente, estilo, cliente.ajustes.paleta, cliente.ajustes.fontePar);

    const tela = iniciarTela(app, cliente, "aprovacao");
    tela.appendChild(h("div", { class: "tela-cabeca" }, [
      h("div", {}, [h("h1", {}, "Aprovação — " + cliente.nome), h("p", { class: "sub" }, "Esse é o manual de marca que você manda pro cliente. A prévia abaixo é só pra você conferir — a aprovação real acontece quando o cliente abre o arquivo baixado no navegador dele.")]),
      h("div", { class: "flex-linha" }, [
        h("button", {
          class: "botao primario",
          onclick: () => {
            const blob = new Blob([manualHtml], { type: "text/html" });
            BaseFLZip.baixarBlob(blob, BaseFLZip.sanitizarNomeArquivo(cliente.nome) + " - Manual do cliente.html");
          },
        }, "Baixar manual"),
        h("a", { href: "#/pacote/" + cliente.id, class: "botao" }, "Ir para o pacote"),
      ]),
    ]));

    const frameWrap = h("div", { class: "manual-frame-wrap" });
    const iframe = h("iframe", { title: "Manual do cliente", sandbox: "allow-scripts" });
    frameWrap.appendChild(iframe);
    tela.appendChild(frameWrap);
    iframe.srcdoc = manualHtml;
  }

  // ======================================================================
  // PACOTE
  // ======================================================================

  async function viewPacote(app, cliente) {
    if (!cliente.direcaoEscolhidaId || !cliente.ajustes) { navegar("#/direcoes/" + cliente.id); return; }
    const estilo = ESTILOS.find((e) => e.id === cliente.direcaoEscolhidaId);
    const ajustes = cliente.ajustes;

    const tela = iniciarTela(app, cliente, "pacote");
    tela.appendChild(h("div", { class: "tela-cabeca" }, [
      h("div", {}, [h("h1", {}, "Pacote — " + cliente.nome), h("p", { class: "sub" }, "Um .zip com tudo que o editor precisa: especificações, logos, backgrounds, parâmetros de motion, a LUT de cor e o manual do cliente.")]),
    ]));

    const cartao = h("div", { class: "cartao" });
    cartao.appendChild(h("p", {}, ["A pasta vai se chamar ", h("b", {}, BaseFLZip.sanitizarNomeArquivo(cliente.nome)), "."]));
    cartao.appendChild(h("div", { class: "pacote-lista" }, [
      h("div", { class: "item" }, [h("b", {}, "Titulos e legendas/"), " especificacoes.json + LEIA-ME.txt"]),
      h("div", { class: "item" }, [h("b", {}, "Logos/"), " logo-claro.png + logo-escuro.png — " + (cliente.referencias.logoBlob ? "seu logo original numa versão, silhueta gerada na outra" : "placeholder gerado (sem logo enviado)")]),
      h("div", { class: "item" }, [h("b", {}, "Backgrounds/"), " 6 PNGs (3 variações × 2 proporções)"]),
      h("div", { class: "item" }, [h("b", {}, "Animacoes/"), " parametros-motion.json + LEIA-ME.txt"]),
      h("div", { class: "item" }, [h("b", {}, "Cor/"), " look.cube (LUT 33×33×33)"]),
      h("div", { class: "item" }, [h("b", {}, "Fontes/"), " fontes.txt"]),
      h("div", { class: "item" }, [h("b", {}, "Manual do cliente.html")]),
    ]));

    const status = h("p", { class: "texto-apagado espaco-topo" });
    const botao = h("button", { class: "botao primario" }, "Baixar pacote do cliente");
    botao.addEventListener("click", async () => {
      botao.disabled = true;
      status.textContent = "Montando o pacote…";
      try {
        const { blob, nomeArquivo } = await BaseFLZip.gerarPacote({
          cliente, estilo, paleta: ajustes.paleta, fontePar: ajustes.fontePar, ajustes,
          intensidadeLook: ajustes.intensidadeLook, logoBlob: cliente.referencias.logoBlob,
        });
        BaseFLZip.baixarBlob(blob, nomeArquivo);
        status.textContent = "Pacote baixado: " + nomeArquivo;
      } catch (e) {
        console.error("[pacote] falha gerando zip", e);
        status.textContent = "Não consegui gerar o pacote: " + (e && e.message ? e.message : e);
      } finally {
        botao.disabled = false;
      }
    });

    cartao.appendChild(h("div", { class: "espaco-topo" }, botao));
    cartao.appendChild(status);
    tela.appendChild(cartao);
  }

  // ---------- partida ----------

  window.addEventListener("hashchange", rotear);
  rotear();
})();
