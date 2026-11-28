/* db.js — guarda os clientes do editor no próprio navegador.
   Estratégia: tenta IndexedDB primeiro (suporta Blob de imagem/logo direto).
   Se qualquer coisa falhar (navegador antigo, modo privado bloqueando, etc.),
   cai para localStorage, convertendo Blobs em base64 (data URL) porque
   localStorage só guarda texto. Todo acesso está em try/catch: uma falha de
   armazenamento nunca deve derrubar a tela do editor. */

const BaseFLDB = (() => {
  const NOME_BANCO = "basefl_estilo";
  const VERSAO_BANCO = 1;
  const LOJA = "clientes";
  const CHAVE_LOCALSTORAGE = "basefl_estilo_clientes_v1";

  let modo = null; // "indexeddb" | "localstorage"
  let dbPromise = null;

  function suportaIndexedDB() {
    try {
      return typeof indexedDB !== "undefined" && indexedDB !== null;
    } catch (e) {
      return false;
    }
  }

  function abrirIndexedDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(NOME_BANCO, VERSAO_BANCO);
        req.onupgradeneeded = (ev) => {
          try {
            const db = ev.target.result;
            if (!db.objectStoreNames.contains(LOJA)) {
              db.createObjectStore(LOJA, { keyPath: "id" });
            }
          } catch (e) {
            reject(e);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error("Falha ao abrir IndexedDB"));
        req.onblocked = () => reject(new Error("Abertura do IndexedDB bloqueada"));
      } catch (e) {
        reject(e);
      }
    });
    return dbPromise;
  }

  async function garantirModo() {
    if (modo) return modo;
    if (suportaIndexedDB()) {
      try {
        await abrirIndexedDB();
        modo = "indexeddb";
        return modo;
      } catch (e) {
        console.warn("[BaseFLDB] IndexedDB indisponível, usando localStorage.", e);
      }
    }
    modo = "localstorage";
    return modo;
  }

  // ---------- helpers de serialização (blob <-> base64) para o fallback ----------

  function blobParaDataURL(blob) {
    return new Promise((resolve, reject) => {
      try {
        const leitor = new FileReader();
        leitor.onload = () => resolve(leitor.result);
        leitor.onerror = () => reject(leitor.error);
        leitor.readAsDataURL(blob);
      } catch (e) {
        reject(e);
      }
    });
  }

  async function dataURLParaBlob(dataUrl) {
    try {
      const resp = await fetch(dataUrl);
      return await resp.blob();
    } catch (e) {
      return null;
    }
  }

  function marcarBlobs(obj) {
    return obj instanceof Blob || (typeof obj === "object" && obj !== null && obj.__tipo === "blob-base64");
  }

  async function serializarParaLocalStorage(valor) {
    if (valor instanceof Blob) {
      try {
        const dataUrl = await blobParaDataURL(valor);
        return { __tipo: "blob-base64", dataUrl, mime: valor.type || "" };
      } catch (e) {
        return null;
      }
    }
    if (Array.isArray(valor)) {
      const out = [];
      for (const item of valor) out.push(await serializarParaLocalStorage(item));
      return out;
    }
    if (valor && typeof valor === "object") {
      const out = {};
      for (const k of Object.keys(valor)) out[k] = await serializarParaLocalStorage(valor[k]);
      return out;
    }
    return valor;
  }

  async function desserializarDeLocalStorage(valor) {
    if (valor && typeof valor === "object" && valor.__tipo === "blob-base64") {
      const blob = await dataURLParaBlob(valor.dataUrl);
      return blob;
    }
    if (Array.isArray(valor)) {
      const out = [];
      for (const item of valor) out.push(await desserializarDeLocalStorage(item));
      return out;
    }
    if (valor && typeof valor === "object") {
      const out = {};
      for (const k of Object.keys(valor)) out[k] = await desserializarDeLocalStorage(valor[k]);
      return out;
    }
    return valor;
  }

  function lerTudoLocalStorage() {
    try {
      const txt = localStorage.getItem(CHAVE_LOCALSTORAGE);
      if (!txt) return {};
      return JSON.parse(txt);
    } catch (e) {
      console.warn("[BaseFLDB] falha lendo localStorage", e);
      return {};
    }
  }

  function gravarTudoLocalStorage(mapa) {
    try {
      localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(mapa));
      return true;
    } catch (e) {
      console.warn("[BaseFLDB] falha gravando localStorage (talvez cota excedida)", e);
      return false;
    }
  }

  // ---------- API pública ----------

  async function clientesListar() {
    const m = await garantirModo();
    try {
      if (m === "indexeddb") {
        const db = await abrirIndexedDB();
        return await new Promise((resolve, reject) => {
          try {
            const tx = db.transaction(LOJA, "readonly");
            const loja = tx.objectStore(LOJA);
            const req = loja.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          } catch (e) {
            reject(e);
          }
        });
      } else {
        const mapa = lerTudoLocalStorage();
        const lista = [];
        for (const id of Object.keys(mapa)) {
          try {
            lista.push(await desserializarDeLocalStorage(mapa[id]));
          } catch (e) {
            console.warn("[BaseFLDB] cliente corrompido ignorado:", id, e);
          }
        }
        return lista;
      }
    } catch (e) {
      console.warn("[BaseFLDB] clientesListar falhou", e);
      return [];
    }
  }

  async function clienteObter(id) {
    const m = await garantirModo();
    try {
      if (m === "indexeddb") {
        const db = await abrirIndexedDB();
        return await new Promise((resolve, reject) => {
          try {
            const tx = db.transaction(LOJA, "readonly");
            const req = tx.objectStore(LOJA).get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
          } catch (e) {
            reject(e);
          }
        });
      } else {
        const mapa = lerTudoLocalStorage();
        if (!mapa[id]) return null;
        return await desserializarDeLocalStorage(mapa[id]);
      }
    } catch (e) {
      console.warn("[BaseFLDB] clienteObter falhou", e);
      return null;
    }
  }

  async function clienteSalvar(cliente) {
    if (!cliente || !cliente.id) throw new Error("cliente precisa de id");
    cliente.atualizadoEm = Date.now();
    const m = await garantirModo();
    try {
      if (m === "indexeddb") {
        const db = await abrirIndexedDB();
        return await new Promise((resolve, reject) => {
          try {
            const tx = db.transaction(LOJA, "readwrite");
            tx.objectStore(LOJA).put(cliente);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
          } catch (e) {
            reject(e);
          }
        });
      } else {
        const mapa = lerTudoLocalStorage();
        mapa[cliente.id] = await serializarParaLocalStorage(cliente);
        return gravarTudoLocalStorage(mapa);
      }
    } catch (e) {
      console.warn("[BaseFLDB] clienteSalvar falhou", e);
      return false;
    }
  }

  async function clienteExcluir(id) {
    const m = await garantirModo();
    try {
      if (m === "indexeddb") {
        const db = await abrirIndexedDB();
        return await new Promise((resolve, reject) => {
          try {
            const tx = db.transaction(LOJA, "readwrite");
            tx.objectStore(LOJA).delete(id);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
          } catch (e) {
            reject(e);
          }
        });
      } else {
        const mapa = lerTudoLocalStorage();
        delete mapa[id];
        return gravarTudoLocalStorage(mapa);
      }
    } catch (e) {
      console.warn("[BaseFLDB] clienteExcluir falhou", e);
      return false;
    }
  }

  async function clienteDuplicar(id, novoNome) {
    try {
      const original = await clienteObter(id);
      if (!original) return null;
      const copia = JSON.parse(JSON.stringify(original, (k, v) => (v instanceof Blob ? undefined : v)));
      // blobs precisam ser copiados manualmente pois JSON.stringify não preserva Blob
      if (original.referencias) {
        copia.referencias = copia.referencias || {};
        copia.referencias.logoBlob = original.referencias.logoBlob || null;
        copia.referencias.imagensBlobs = original.referencias.imagensBlobs ? original.referencias.imagensBlobs.slice() : [];
        copia.referencias.materialBlob = original.referencias.materialBlob || null;
        copia.referencias.materialTipo = original.referencias.materialTipo || null;
      }
      copia.id = "cli_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
      copia.nome = novoNome || (original.nome + " (cópia)");
      copia.criadoEm = Date.now();
      copia.atualizadoEm = Date.now();
      await clienteSalvar(copia);
      return copia;
    } catch (e) {
      console.warn("[BaseFLDB] clienteDuplicar falhou", e);
      return null;
    }
  }

  async function modoAtual() {
    return await garantirModo();
  }

  return {
    clientesListar,
    clienteObter,
    clienteSalvar,
    clienteExcluir,
    clienteDuplicar,
    modoAtual,
  };
})();
