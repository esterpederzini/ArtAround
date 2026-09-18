/* ═══════════════════════════════════════════════════
   editor-item.js – Logica Editor Item ArtAround
   ═══════════════════════════════════════════════════ */

let museoConfigurato = "";
let mappaOpereLocali = {}; // Mappa per l'autocompilazione immediata client-side

// ─── INIT ────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  aggiornaUtenteUI();

  if (!richiedeAutore()) {
    document.body.style.backgroundColor = "#1e2640";
    const navbar = document.querySelector(".aa-navbar");
    if (navbar) navbar.classList.add("d-none");

    const container = document.getElementById("mainContent");
    if (container) {
      container.classList.remove("d-none");
      container.style.maxWidth = "100%";
      container.style.width = "100%";
      container.innerHTML = `
        <div class="row justify-content-center align-items-center flex-grow-1" style="min-height: 85vh;">
          <div class="col-md-8 col-lg-6 text-center">
            <div style="font-size: 5rem; margin-bottom: 1rem;">🎨</div>
            <h2 style="color: var(--aa-gold); font-family: var(--aa-font-serif); font-size: 2.5rem; font-weight: 600;">
              L'ispirazione ha bussato, ma serve il pass!
            </h2>
            <p class="lead mt-3" style="color: #ffffff; font-weight: 400;">
              Attualmente stai esplorando ArtAround come <strong>Visitatore</strong>.
            </p>
            <p class="mb-4" style="color: #cbd5e1; font-size: 0.95rem;">
              Solo gli utenti con il ruolo di <strong>Autore</strong> possono creare o modificare i singoli Contenuti (Item) del catalogo. 
              Effettua l'accesso con un account abilitato per sbloccare l'area di creazione.
            </p>
            <div class="d-flex justify-content-center gap-3 mt-2">
              <a href="/dashboard" class="btn-aa-outline" style="color: #f2ede7; border-color: rgba(242, 237, 231, 0.4); background: rgba(255,255,255,0.05);">
                <i class="bi bi-arrow-left"></i> Torna alla Dashboard
              </a>
              <button class="btn-aa-primary" onclick="apriLogin()" style="background-color: var(--aa-gold); border-color: var(--aa-gold); color: var(--aa-ink); font-weight: 600;">
                <i class="bi bi-person"></i> Accedi ora
              </button>
            </div>
          </div>
        </div>
      `;
    }
    return;
  }

  document.body.style.backgroundColor = "var(--aa-cream)";
  const containerNormale = document.getElementById("mainContent");
  if (containerNormale) {
    containerNormale.classList.remove("d-none");
  }

  await inizializzaMuseoDaConfig();

  const utente = getUtenteCorrente();
  const inputAutore = document.getElementById("autoreId");
  if (inputAutore && utente) {
    inputAutore.value = utente._id;
  }

  await popolaSelectOpere();

  [
    "titolo",
    "descrizione",
    "lunghezza",
    "linguaggio",
    "licenzaTipo",
    "prezzo",
    "immagineUrl",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", aggiornaPreview);
      if (el.tagName === "SELECT") {
        el.addEventListener("change", aggiornaPreview);
      }
    }
  });

  // Listener per controllare i duplicati in tempo reale al cambio di linguaggio o lunghezza
  ["linguaggio", "lunghezza"].forEach((id) => {
    document
      .getElementById(id)
      ?.addEventListener("change", controllaIncrocioDuplicati);
  });

  document.getElementById("descrizione")?.addEventListener("input", (e) => {
    const len = e.target.value.length;
    document.getElementById("charCount").textContent = len;

    const prof = stimaProfondita(len);
    document.getElementById("profonditaPreview").textContent = prof;
    document.getElementById("profonditaContenuto").value = prof;
  });

  document.getElementById("operaSelect")?.addEventListener("change", (e) => {
    gestisciCambioSelezioneOpera(e.target.value);
  });

  document.getElementById("immagineUrl")?.addEventListener(
    "input",
    debounce(() => {
      aggiornaPreview();
    }, 400),
  );

  const params = new URLSearchParams(window.location.search);
  if (params.get("id")) caricaItemPerModifica(params.get("id"));
});

// ─── CARICA CONFIGURAZIONE MUSEO DAL SERVER ──────────
async function inizializzaMuseoDaConfig() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) return;
    const config = await response.json();
    if (config && config.museo) {
      museoConfigurato = config.museo;
      const inputMuseo = document.getElementById("museo");
      if (inputMuseo) inputMuseo.value = museoConfigurato;
    }
  } catch (error) {
    console.error("Errore nel caricamento del modulo config:", error);
  }
}

// ─── POPOLA IL MENU A TENDINA DELLE OPERE ────────────
async function popolaSelectOpere() {
  const select = document.getElementById("operaSelect");
  if (!select) return;

  // Interroga l'API del backend filtrando per il museo configurato (carica anche i non pubblicati per sicurezza)
  const data = await apiFetch(
    `/api/items?museo=${encodeURIComponent(museoConfigurato)}&limite=300&pubblicato=tutti`,
  );
  select.innerHTML = "";

  const optDefault = document.createElement("option");
  optDefault.value = "";
  optDefault.textContent = "-- Scegli un'opera presente nel database --";
  select.appendChild(optDefault);

  if (!data || !data.items || data.items.length === 0) {
    mappaOpereLocali = {};
    return;
  }

  mappaOpereLocali = {};
  data.items.forEach((item) => {
    if (item.operaId && !mappaOpereLocali[item.operaId]) {
      mappaOpereLocali[item.operaId] = item;
    }
  });

  Object.keys(mappaOpereLocali).forEach((operaId) => {
    const opera = mappaOpereLocali[operaId];
    const opt = document.createElement("option");
    opt.value = operaId;
    opt.textContent = `${opera.titoloOpera || opera.titolo || "Opera senza titolo"}`;
    select.appendChild(opt);
  });
}

// ─── GESTISCE IL CAMBIO DI SELEZIONE NEL MENU ────────
async function gestisciCambioSelezioneOpera(valoreScelto) {
  const badge = document.getElementById("operaStatoBadge");
  const inputOperaIdNascosto = document.getElementById("operaId");
  const campiSchedaTecnica = ["artista", "stile", "periodo", "categoria"];

  if (valoreScelto) {
    if (inputOperaIdNascosto) inputOperaIdNascosto.value = valoreScelto;
    badge.textContent = "Opera Catalogata";
    badge.className = "badge ms-2 bg-success text-white";
    badge.classList.remove("d-none");

    // Questo è l'item principale recuperato da MongoDB
    const operaSelezionata = mappaOpereLocali[valoreScelto];

    // Compila i campi di testo storici
    document.getElementById("operaTitoloUfficiale").value =
      operaSelezionata.titoloOpera || operaSelezionata.titolo || "";
    document.getElementById("artista").value =
      operaSelezionata.artista || operaSelezionata.artist || "";
    document.getElementById("stile").value =
      operaSelezionata.stile || operaSelezionata.style || "";
    document.getElementById("periodo").value =
      operaSelezionata.periodo || operaSelezionata.period || "";
    document.getElementById("categoria").value =
      operaSelezionata.categoria || "pittura";

    if (operaSelezionata.immagine) {
      document.getElementById("immagineUrl").value = operaSelezionata.immagine;
    }

    // 🛠️ CRITICO: Memorizza i dati fisici della mappa ereditati dal seed dell'item principale
    // In questo modo, quando salverai l'item secondario, manterrà le stesse esatte coordinate!
    window.operaSelezionataMappa = {
      piano: operaSelezionata.piano || "0",
      mappa_x: Number(operaSelezionata.mappa_x) || 0,
      mappa_y: Number(operaSelezionata.mappa_y) || 0,
    };

    disabilitaCampiOpere([...campiSchedaTecnica, "operaTitoloUfficiale"], true);
    document.getElementById("titolo").value = "";

    // Richiedi tutte le varianti registrate per questa opera per popolare la cronologia laterale
    const dataVarianti = await apiFetch(
      `/api/items?operaId=${encodeURIComponent(valoreScelto)}&limite=100`,
    );
    if (dataVarianti && dataVarianti.items) {
      renderElencoVarianti(dataVarianti.items);
    }
  } else {
    if (inputOperaIdNascosto) inputOperaIdNascosto.value = "";
    document.getElementById("operaTitoloUfficiale").value = "";
    badge.classList.add("d-none");
    window.operaSelezionataMappa = null; // Resetta la mappa volatile
    disabilitaCampiOpere(
      [...campiSchedaTecnica, "operaTitoloUfficiale"],
      false,
    );
    document.getElementById("variantiList").innerHTML =
      '<em class="text-slate small">Seleziona un\'opera per esaminare le varianti...</em>';
  }

  aggiornaPreview();
}

// Controllo preventivo: se l'autore sta configurando una variante con livello e durata identici a una già esistente
async function controllaIncrocioDuplicati() {
  const operaId = document.getElementById("operaId").value;
  const linguaggio = document.getElementById("linguaggio").value;
  const lunghezza = document.getElementById("lunghezza").value;
  const currentItemId = document.getElementById("itemId").value;

  if (!operaId) return;

  const data = await apiFetch(
    `/api/items?operaId=${encodeURIComponent(operaId)}&linguaggio=${linguaggio}&lunghezza=${lunghezza}`,
  );
  const incontri = data?.items || [];

  // Se esiste un record con gli stessi metadati ed ha un ID diverso da quello che stiamo modificando
  const duplicatoReale = incontri.find((i) => i._id !== currentItemId);
  const badge = document.getElementById("operaStatoBadge");

  if (duplicatoReale) {
    badge.textContent = "Attenzione: Variante Duplicata";
    badge.className = "badge ms-2 bg-warning text-dark";
    showToast(
      "Esiste già una spiegazione con questo livello e durata. Salvando, aggiungerai un'alternativa.",
      "info",
    );
  } else {
    badge.textContent = currentItemId
      ? "Modalità Modifica"
      : "Opera Catalogata";
    badge.className = "badge ms-2 bg-success text-white";
  }
}

function disabilitaCampiOpere(listaCampi, bloccati) {
  listaCampi.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.readOnly = bloccati;
      if (el.tagName === "SELECT") el.disabled = bloccati;
      el.style.backgroundColor = bloccati ? "var(--aa-cream)" : "";
      el.style.cursor = bloccati ? "not-allowed" : "";
    }
  });
}

function renderElencoVarianti(items) {
  const container = document.getElementById("variantiList");
  if (!container) return;

  const currentItemId = document.getElementById("itemId").value;
  const filtrate = items.filter((i) => i._id !== currentItemId);

  if (!filtrate.length) {
    container.innerHTML =
      '<em class="text-slate small">Nessuna spiegazione alternativa registrata oltre a questa.</em>';
    return;
  }

  container.innerHTML = filtrate
    .map(
      (v) => `
    <div class="d-flex align-items-center gap-2 mb-1 p-1 rounded" style="background:var(--aa-cream); font-size: 0.8rem">
      <div class="flex-grow-1 min-w-0">
        <div class="text-truncate"><strong>Target:</strong> ${v.linguaggio} (${v.lunghezza})</div>
        <div class="text-slate" style="font-size:0.7rem">Titolo: ${v.titolo} · Prezzo: €${v.prezzo || 0}</div>
      </div>
      <a href="/editor-item?id=${v._id}" class="btn-aa-outline" style="font-size:0.68rem;padding:2px 6px">✎ Modifica</a>
    </div>
  `,
    )
    .join("");
}

// ─── LIVE PREVIEW DELLE CARD ─────────────────────────
function aggiornaPreview() {
  const titolo = document.getElementById("titolo").value || "Titolo item";
  const desc =
    document.getElementById("descrizione").value ||
    "La descrizione apparirà qui...";
  const linguaggio = document.getElementById("linguaggio").value;
  const lunghezza = document.getElementById("lunghezza").value;
  const prezzo = Number(document.getElementById("prezzo").value) || 0;
  const licenza = document.getElementById("licenzaTipo").value;
  const imgUrl = document.getElementById("immagineUrl").value.trim();

  document.getElementById("prevTitolo").textContent = titolo;
  document.getElementById("prevDesc").textContent =
    desc.substring(0, 100) + (desc.length > 100 ? "…" : "");
  document.getElementById("prevLen").textContent = lunghezza;
  document.getElementById("prevLicenza").textContent = licenza;

  const prevLangContainer = document.getElementById("prevLang")?.parentElement;
  if (prevLangContainer) {
    const vecchioBadge = document.getElementById("prevLang");
    if (vecchioBadge) vecchioBadge.remove();

    const htmlNuovoBadge = badgeLinguaggio(linguaggio);
    prevLangContainer.insertAdjacentHTML("afterbegin", htmlNuovoBadge);

    const badgeAppenaInserito = prevLangContainer.querySelector(".aa-badge");
    if (badgeAppenaInserito) badgeAppenaInserito.id = "prevLang";
  }

  const prevPrice = document.getElementById("prevPrice");
  if (prevPrice) {
    if (prezzo === 0) {
      prevPrice.className = "aa-badge aa-badge-free";
      prevPrice.textContent = "Gratuito";
    } else {
      prevPrice.className = "aa-price";
      prevPrice.textContent = `€ ${prezzo.toFixed(2)}`;
    }
  }

  const prevImg = document.getElementById("prevImg");
  if (prevImg) {
    if (imgUrl) {
      prevImg.innerHTML = `<img src="${imgUrl}" style="width:100%;height:120px;object-fit:cover;border-radius:6px 6px 0 0">`;
    } else {
      prevImg.innerHTML = "🖼️";
    }
  }
}

function stimaProfondita(len) {
  if (len < 120) return "superficiale";
  if (len < 350) return "standard";
  if (len < 750) return "approfondito";
  return "accademico";
}

// ─── INVIO E SALVATAGGIO DEI DATI ─────────────────────
async function salvaItem() {
  const utenteCorrente = getUtenteCorrente();
  const operaSelectEl = document.getElementById("operaSelect");
  const operaIdScelto = operaSelectEl?.value || "";
  const operaCatalogata = mappaOpereLocali[operaIdScelto] || {};

  const operaId = document.getElementById("operaId")?.value?.trim() || "";
  const museo = document.getElementById("museo")?.value?.trim() || "";
  const titolo = document.getElementById("titolo")?.value?.trim() || "";
  const autoreId = document.getElementById("autoreId")?.value || "";
  const desc = document.getElementById("descrizione")?.value?.trim() || "";
  const lunghezza = document.getElementById("lunghezza")?.value || "3s";
  const linguaggio = document.getElementById("linguaggio")?.value || "medio";
  const categoria = document.getElementById("categoria")?.value || "pittura";
  const profondita =
    document.getElementById("profonditaContenuto")?.value || "standard";
  const tags = (document.getElementById("tags")?.value || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const immagineUrl =
    document.getElementById("immagineUrl")?.value?.trim() || "";
  const licenzaTipo =
    document.getElementById("licenzaTipo")?.value || "gratuito";
  const licenzaNote =
    document.getElementById("licenzaNote")?.value?.trim() || "";
  const prezzo = Number(document.getElementById("prezzo")?.value) || 0;
  const pubblicato = document.getElementById("pubblicato")
    ? document.getElementById("pubblicato").checked
    : true;
  const id = document.getElementById("itemId")?.value || "";

  const artista = document.getElementById("artista")?.value?.trim() || "";
  const stile = document.getElementById("stile")?.value?.trim() || "";
  const periodo = document.getElementById("periodo")?.value?.trim() || "";
  const titoloOpera =
    document.getElementById("operaTitoloUfficiale")?.value?.trim() || "";

  if (!operaId)
    return showToast(
      "Seleziona un'opera ufficiale dall'elenco per continuare.",
      "error",
    );
  if (!titolo)
    return showToast(
      "Il titolo della traccia audio (Item) è necessario.",
      "error",
    );
  if (!desc)
    return showToast(
      "Scrivi il testo della spiegazione per la guida.",
      "error",
    );
  if (!autoreId)
    return showToast("Sessione autore non valida. Riesegui il login.", "error");

  const linkImmagine = immagineUrl || "/img/default_item_image.jpg";

  const mappaEreditata = window.operaSelezionataMappa || {};

  const payload = {
    operaId,
    museo,
    titolo,
    descrizione: desc,
    lunghezza,
    linguaggio,
    categoria,
    profonditaContenuto: profondita,
    tags,
    prezzo,
    pubblicato,
    creatorId: autoreId,
    url: linkImmagine,
    immagine: linkImmagine,
    audioUrl: "",
    artista: artista || "Ignoto",
    stile: stile || "Periodo storico non specificato",
    periodo: periodo || "",
    titoloOpera: titoloOpera || titolo,
    autore_visita: utenteCorrente?.username || "Autore",
    autore: utenteCorrente?.username || "Autore",

    // 🛠️ FIX: Prende i dati fisici immutabili dall'item principale del seed!
    piano: mappaEreditata.piano || "0",
    mappa_x: mappaEreditata.mappa_x !== undefined ? mappaEreditata.mappa_x : 0,
    mappa_y: mappaEreditata.mappa_y !== undefined ? mappaEreditata.mappa_y : 0,

    licenza: { tipo: licenzaTipo, note: licenzaNote },
  };

  const metodo = id ? "PUT" : "POST";
  const url = id ? `/api/items/${id}` : "/api/items";

  if (id) payload._id = id;

  const ok = await apiFetch(url, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (ok) {
    showToast(
      id
        ? "Spiegazione aggiornata nel database!"
        : "Nuova variante traccia creata con successo!",
      "success",
    );
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 500);
  }
}

// ─── CARICA VARIANTE IN MODIFICA VIA URL QUERY
async function caricaItemPerModifica(id) {
  const item = await apiFetch(`/api/items/${id}`);
  if (!item) return;

  document.getElementById("itemId").value = item._id;
  document.getElementById("operaId").value = item.operaId;

  const operaNativa = mappaOpereLocali[item.operaId];
  document.getElementById("operaTitoloUfficiale").value =
    item.titoloOpera || (operaNativa ? operaNativa.titolo : item.titolo) || "";
  document.getElementById("titolo").value = item.titolo;
  document.getElementById("museo").value = item.museo;
  document.getElementById("autoreId").value =
    item.creatorId?._id || item.creatorId || "";
  document.getElementById("descrizione").value = item.descrizione;
  document.getElementById("lunghezza").value = item.lunghezza;
  document.getElementById("linguaggio").value = item.linguaggio;
  document.getElementById("categoria").value = item.categoria;
  document.getElementById("profonditaContenuto").value =
    item.profonditaContenuto || "standard";
  document.getElementById("tags").value = (item.tags || []).join(", ");
  document.getElementById("immagineUrl").value = item.immagine || "";
  document.getElementById("licenzaTipo").value =
    item.licenza?.tipo || "gratuito";
  document.getElementById("licenzaNote").value = item.licenza?.note || "";
  document.getElementById("prezzo").value = item.prezzo || 0;
  document.getElementById("pubblicato").checked = item.pubblicato !== false;

  document.getElementById("artista").value = item.artista || item.artist || "";
  document.getElementById("stile").value = item.stile || item.style || "";
  document.getElementById("periodo").value = item.periodo || item.period || "";

  document.getElementById("charCount").textContent = item.descrizione.length;
  document.getElementById("profonditaPreview").textContent = stimaProfondita(
    item.descrizione.length,
  );
  document.getElementById("formTitolo").textContent =
    ` Modifica: ${item.titolo}`;

  setTimeout(() => {
    const select = document.getElementById("operaSelect");
    if (select) {
      select.value = item.operaId;
      disabilitaCampiOpere(
        ["artista", "stile", "periodo", "operaTitoloUfficiale", "categoria"],
        true,
      );
    }
  }, 400);

  const badge = document.getElementById("operaStatoBadge");
  badge.textContent = "Modalità Modifica";
  badge.className = "badge ms-2 bg-success text-white";
  badge.classList.remove("d-none");

  // Richiedi le varianti alternative escludendo quella corrente
  const dataVarianti = await apiFetch(
    `/api/items?operaId=${encodeURIComponent(item.operaId)}&limite=100`,
  );
  if (dataVarianti && dataVarianti.items) {
    renderElencoVarianti(dataVarianti.items);
  }

  aggiornaPreview();
}

// ─── SVUOTA E RIPRISTINA IL MODULO ────────────────────
function resetForm() {
  const campiDaPulire = [
    "operaId",
    "operaTitoloUfficiale",
    "titolo",
    "descrizione",
    "tags",
    "immagineUrl",
    "licenzaNote",
    "artista",
    "stile",
    "periodo",
    "operaSelect",
  ];
  campiDaPulire.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  disabilitaCampiOpere(
    ["artista", "stile", "periodo", "operaTitoloUfficiale", "categoria"],
    false,
  );
  document.getElementById("operaStatoBadge").classList.add("d-none");

  inizializzaMuseoDaConfig();
  const utente = getUtenteCorrente();
  if (utente) document.getElementById("autoreId").value = utente._id;

  document.getElementById("lunghezza").value = "3s";
  document.getElementById("linguaggio").value = "medio";
  document.getElementById("categoria").value = "pittura";
  document.getElementById("profonditaContenuto").value = "standard";
  document.getElementById("licenzaTipo").value = "gratuito";
  document.getElementById("prezzo").value = 0;
  document.getElementById("pubblicato").checked = true;
  document.getElementById("itemId").value = "";
  document.getElementById("formTitolo").textContent = " Nuovo Contenuto (Item)";
  document.getElementById("charCount").textContent = "0";
  document.getElementById("profonditaPreview").textContent = "–";
  document.getElementById("variantiList").innerHTML =
    '<em class="text-slate small">Seleziona un\'opera per esaminare le varianti...</em>';

  const prevLang = document.getElementById("prevLang");
  if (prevLang) {
    prevLang.textContent = "medio";
    prevLang.className = "aa-badge";
  }

  aggiornaPreview();
}
