
let configuredMuseum = "";
let localArtworksMap = {};

const LANG_UI_MAP = {
  child: "infantile",
  medium: "medio",
  advanced: "avanzato",
  infantile: "infantile",
  medio: "medio",
  avanzato: "avanzato",
};

document.addEventListener("DOMContentLoaded", async () => {
  if (typeof aggiornaUtenteUI === "function") aggiornaUtenteUI();

  const isAuthor = typeof richiedeAutore === "function" ? richiedeAutore() : true;
  if (!isAuthor) {
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
  const normalContainer = document.getElementById("mainContent");
  if (normalContainer) normalContainer.classList.remove("d-none");

  await initializeMuseumConfig();

  const currentUser = typeof getUtenteCorrente === "function" ? getUtenteCorrente() : null;
  const authorInput = document.getElementById("autoreId");
  if (authorInput && currentUser) {
    authorInput.value = currentUser._id;
  }

  await populateArtworkSelect();

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
      el.addEventListener("input", updatePreview);
      if (el.tagName === "SELECT") {
        el.addEventListener("change", updatePreview);
      }
    }
  });

  ["linguaggio", "lunghezza"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", checkDuplicateVariant);
  });

  document.getElementById("descrizione")?.addEventListener("input", (e) => {
    const len = e.target.value.length;
    document.getElementById("charCount").textContent = len;
    const depth = estimateContentDepth(len);
    document.getElementById("profonditaPreview").textContent = depth;
    document.getElementById("profonditaContenuto").value = depth;
  });

  document.getElementById("operaSelect")?.addEventListener("change", (e) => {
    handleArtworkSelectionChange(e.target.value);
  });

  const debouncedPreview = typeof debounce === "function"
    ? debounce(() => updatePreview(), 400)
    : () => updatePreview();

  document.getElementById("immagineUrl")?.addEventListener("input", debouncedPreview);

  const params = new URLSearchParams(window.location.search);
  if (params.get("id")) loadItemForEdit(params.get("id"));
});

async function initializeMuseumConfig() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) return;
    const config = await response.json();
    const museum = config?.museumName || config?.museo;
    if (museum) {
      configuredMuseum = museum;
      const inputMuseum = document.getElementById("museo");
      if (inputMuseum) inputMuseum.value = configuredMuseum;
    }
  } catch (error) {
    console.error("Error loading museum configuration:", error);
  }
}

async function populateArtworkSelect() {
  const select = document.getElementById("operaSelect");
  if (!select) return;

  const data = await apiFetch(
    `/api/items?museum=${encodeURIComponent(configuredMuseum)}&limit=300&published=all`,
  );
  select.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "-- Scegli un'opera presente nel database --";
  select.appendChild(defaultOption);

  const itemsList = data?.items || data?.data?.items || [];
  if (!itemsList.length) {
    localArtworksMap = {};
    return;
  }

  localArtworksMap = {};
  itemsList.forEach((item) => {
    const key = item.artworkId || item.operaId;
    if (key && !localArtworksMap[key]) {
      localArtworksMap[key] = item;
    }
  });

  Object.keys(localArtworksMap).forEach((artworkKey) => {
    const item = localArtworksMap[artworkKey];
    const opt = document.createElement("option");
    opt.value = artworkKey;
    opt.textContent = `${item.title || item.titoloOpera || item.titolo || "Opera senza titolo"}`;
    select.appendChild(opt);
  });
}

async function handleArtworkSelectionChange(selectedValue) {
  const badge = document.getElementById("operaStatoBadge");
  const hiddenArtworkId = document.getElementById("operaId");
  const technicalFields = ["artista", "stile", "periodo", "categoria"];

  if (selectedValue) {
    if (hiddenArtworkId) hiddenArtworkId.value = selectedValue;
    badge.textContent = "Opera Catalogata";
    badge.className = "badge ms-2 bg-success text-white";
    badge.classList.remove("d-none");

    const selectedArtwork = localArtworksMap[selectedValue] || {};

    document.getElementById("operaTitoloUfficiale").value =
      selectedArtwork.title || selectedArtwork.titoloOpera || selectedArtwork.titolo || "";
    document.getElementById("artista").value =
      selectedArtwork.artist || selectedArtwork.artista || "";
    document.getElementById("stile").value =
      selectedArtwork.style || selectedArtwork.stile || "";
    document.getElementById("periodo").value =
      selectedArtwork.period || selectedArtwork.periodo || "";
    document.getElementById("categoria").value =
      selectedArtwork.category || selectedArtwork.categoria || "pittura";

    const imageLink = selectedArtwork.url || selectedArtwork.immagine || selectedArtwork.image;
    if (imageLink) {
      document.getElementById("immagineUrl").value = imageLink;
    }

    window.selectedArtworkMap = {
      floor: selectedArtwork.floor ?? selectedArtwork.piano ?? "0",
      mapX: Number(selectedArtwork.mapX ?? selectedArtwork.mappa_x ?? 0),
      mapY: Number(selectedArtwork.mapY ?? selectedArtwork.mappa_y ?? 0),
    };

    setFieldsDisabled([...technicalFields, "operaTitoloUfficiale"], true);
    document.getElementById("titolo").value = "";

    const variantsData = await apiFetch(
      `/api/items?artworkId=${encodeURIComponent(selectedValue)}&limit=100`,
    );
    const variants = variantsData?.items || variantsData?.data?.items || [];
    renderVariantsList(variants);
  } else {
    if (hiddenArtworkId) hiddenArtworkId.value = "";
    document.getElementById("operaTitoloUfficiale").value = "";
    badge.classList.add("d-none");
    window.selectedArtworkMap = null;
    setFieldsDisabled([...technicalFields, "operaTitoloUfficiale"], false);
    document.getElementById("variantiList").innerHTML =
      '<em class="text-slate small">Seleziona un\'opera per esaminare le varianti...</em>';
  }

  updatePreview();
}

async function checkDuplicateVariant() {
  const artworkId = document.getElementById("operaId").value;
  const language = document.getElementById("linguaggio").value;
  const length = document.getElementById("lunghezza").value;
  const currentItemId = document.getElementById("itemId").value;

  if (!artworkId) return;

  const data = await apiFetch(
    `/api/items?artworkId=${encodeURIComponent(artworkId)}&language=${language}&length=${length}`,
  );
  const matched = data?.items || data?.data?.items || [];
  const realDuplicate = matched.find((i) => i._id !== currentItemId);
  const badge = document.getElementById("operaStatoBadge");

  if (realDuplicate) {
    badge.textContent = "Attenzione: Variante Duplicata";
    badge.className = "badge ms-2 bg-warning text-dark";
    showToast(
      "Esiste già una spiegazione con questo livello e durata. Salvando, aggiungerai un'alternativa.",
      "info",
    );
  } else {
    badge.textContent = currentItemId ? "Modalità Modifica" : "Opera Catalogata";
    badge.className = "badge ms-2 bg-success text-white";
  }
}

function setFieldsDisabled(fieldsList, disabled) {
  fieldsList.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.readOnly = disabled;
      if (el.tagName === "SELECT") el.disabled = disabled;
      el.style.backgroundColor = disabled ? "var(--aa-cream)" : "";
      el.style.cursor = disabled ? "not-allowed" : "";
    }
  });
}

function renderVariantsList(items) {
  const container = document.getElementById("variantiList");
  if (!container) return;

  const currentItemId = document.getElementById("itemId").value;
  const filtered = items.filter((i) => i._id !== currentItemId);

  if (!filtered.length) {
    container.innerHTML =
      '<em class="text-slate small">Nessuna spiegazione alternativa registrata oltre a questa.</em>';
    return;
  }

  container.innerHTML = filtered
    .map((v) => {
      const lang = LANG_UI_MAP[v.language || v.linguaggio] || v.language || v.linguaggio;
      const len = v.length || v.lunghezza || "15s";
      const title = v.title || v.titolo || "Item";
      const price = Number(v.price ?? v.prezzo ?? 0);

      return `
        <div class="d-flex align-items-center gap-2 mb-1 p-1 rounded" style="background:var(--aa-cream); font-size: 0.8rem">
          <div class="flex-grow-1 min-w-0">
            <div class="text-truncate"><strong>Target:</strong> ${lang} (${len})</div>
            <div class="text-slate" style="font-size:0.7rem">Titolo: ${title} · Prezzo: €${price}</div>
          </div>
          <a href="/editor-item?id=${v._id}" class="btn-aa-outline" style="font-size:0.68rem;padding:2px 6px">✎ Modifica</a>
        </div>
      `;
    })
    .join("");
}
function updatePreview() {
  const title = document.getElementById("titolo").value || "Titolo item";
  const desc =
    document.getElementById("descrizione").value ||
    "La descrizione apparirà qui...";
  const language = document.getElementById("linguaggio").value;
  const length = document.getElementById("lunghezza").value;
  const price = Number(document.getElementById("prezzo").value) || 0;
  const license = document.getElementById("licenzaTipo").value;
  const imageUrl = document.getElementById("immagineUrl").value.trim();

  document.getElementById("prevTitolo").textContent = title;
  document.getElementById("prevDesc").textContent =
    desc.substring(0, 100) + (desc.length > 100 ? "…" : "");
  document.getElementById("prevLen").textContent = length;
  document.getElementById("prevLicenza").textContent = license;

  const prevLangContainer = document.getElementById("prevLang")?.parentElement;
  if (prevLangContainer) {
    const oldBadge = document.getElementById("prevLang");
    if (oldBadge) oldBadge.remove();

    if (typeof badgeLinguaggio === "function") {
      const newBadgeHtml = badgeLinguaggio(language);
      prevLangContainer.insertAdjacentHTML("afterbegin", newBadgeHtml);
      const inserted = prevLangContainer.querySelector(".aa-badge");
      if (inserted) inserted.id = "prevLang";
    }
  }

  const prevPrice = document.getElementById("prevPrice");
  if (prevPrice) {
    if (price === 0) {
      prevPrice.className = "aa-badge aa-badge-free";
      prevPrice.textContent = "Gratuito";
    } else {
      prevPrice.className = "aa-price";
      prevPrice.textContent = `€ ${price.toFixed(2)}`;
    }
  }

  const prevImg = document.getElementById("prevImg");
  if (prevImg) {
    if (imageUrl) {
      prevImg.innerHTML = `<img src="${imageUrl}" style="width:100%;height:120px;object-fit:cover;border-radius:6px 6px 0 0">`;
    } else {
      prevImg.innerHTML = "🖼️";
    }
  }
}

function estimateContentDepth(length) {
  if (length < 120) return "superficiale";
  if (length < 350) return "standard";
  if (length < 750) return "approfondito";
  return "accademico";
}
async function saveItem() {
  const currentUser = typeof getUtenteCorrente === "function" ? getUtenteCorrente() : null;

  const artworkId = document.getElementById("operaId")?.value?.trim() || "";
  const museum = document.getElementById("museo")?.value?.trim() || "";
  const title = document.getElementById("titolo")?.value?.trim() || "";
  const authorId = document.getElementById("autoreId")?.value || "";
  const description = document.getElementById("descrizione")?.value?.trim() || "";
  const length = document.getElementById("lunghezza")?.value || "15s";
  const language = document.getElementById("linguaggio")?.value || "medium";
  const category = document.getElementById("categoria")?.value || "pittura";
  const contentDepth = document.getElementById("profonditaContenuto")?.value || "standard";
  const tags = (document.getElementById("tags")?.value || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const imageUrl = document.getElementById("immagineUrl")?.value?.trim() || "";
  const licenseType = document.getElementById("licenzaTipo")?.value || "gratuito";
  const licenseNotes = document.getElementById("licenzaNote")?.value?.trim() || "";
  const price = Number(document.getElementById("prezzo")?.value) || 0;
  const isPublished = document.getElementById("pubblicato")
    ? document.getElementById("pubblicato").checked
    : true;
  const id = document.getElementById("itemId")?.value || "";

  const artist = document.getElementById("artista")?.value?.trim() || "";
  const style = document.getElementById("stile")?.value?.trim() || "";
  const period = document.getElementById("periodo")?.value?.trim() || "";

  if (!artworkId)
    return showToast(
      "Seleziona un'opera ufficiale dall'elenco per continuare.",
      "error",
    );
  if (!title)
    return showToast(
      "Il titolo della traccia audio (Item) è necessario.",
      "error",
    );
  if (!description)
    return showToast(
      "Scrivi il testo della spiegazione per la guida.",
      "error",
    );
  if (!authorId)
    return showToast("Sessione autore non valida. Riesegui il login.", "error");

  const imageLink = imageUrl || "/img/default_item_image.jpg";
  const inheritedMap = window.selectedArtworkMap || {};

  const payload = {
    artworkId,
    operaId: artworkId,
    museum,
    museo: museum,
    title,
    titolo: title,
    description,
    descrizione: description,
    length,
    lunghezza: length,
    language,
    linguaggio: language,
    category,
    categoria: category,
    contentDepth,
    profonditaContenuto: contentDepth,
    tags,
    price,
    prezzo: price,
    isPublished,
    pubblicato: isPublished,
    creatorId: authorId,
    url: imageLink,
    image: imageLink,
    immagine: imageLink,
    audioUrl: "",
    artist: artist || "Ignoto",
    artista: artist || "Ignoto",
    style: style || "Periodo storico non specificato",
    stile: style || "Periodo storico non specificato",
    period: period || "",
    periodo: period || "",
    tourAuthor: currentUser?.username || "Autore",
    autore_visita: currentUser?.username || "Autore",
    autore: currentUser?.username || "Autore",

    floor: inheritedMap.floor || "0",
    piano: inheritedMap.floor || "0",
    mapX: inheritedMap.mapX !== undefined ? inheritedMap.mapX : 0,
    mappa_x: inheritedMap.mapX !== undefined ? inheritedMap.mapX : 0,
    mapY: inheritedMap.mapY !== undefined ? inheritedMap.mapY : 0,
    mappa_y: inheritedMap.mapY !== undefined ? inheritedMap.mapY : 0,

    license: { type: licenseType, notes: licenseNotes },
    licenza: { tipo: licenseType, note: licenseNotes },
  };

  const method = id ? "PUT" : "POST";
  const url = id ? `/api/items/${id}` : "/api/items";
  if (id) payload._id = id;

  const result = await apiFetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (result) {
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
async function loadItemForEdit(id) {
  const response = await apiFetch(`/api/items/${id}`);
  const item = response?.data || response;
  if (!item) return;

  const artworkKey = item.artworkId || item.operaId;

  document.getElementById("itemId").value = item._id;
  document.getElementById("operaId").value = artworkKey;

  const nativeArtwork = localArtworksMap[artworkKey];
  document.getElementById("operaTitoloUfficiale").value =
    item.title || item.titoloOpera || nativeArtwork?.title || item.titolo || "";
  document.getElementById("titolo").value = item.title || item.titolo || "";
  document.getElementById("museo").value = item.museum || item.museo || "";
  document.getElementById("autoreId").value =
    item.creatorId?._id || item.creatorId || "";
  document.getElementById("descrizione").value = item.description || item.descrizione || "";
  document.getElementById("lunghezza").value = item.length || item.lunghezza || "15s";
  document.getElementById("linguaggio").value = item.language || item.linguaggio || "medium";
  document.getElementById("categoria").value = item.category || item.categoria || "pittura";
  document.getElementById("profonditaContenuto").value =
    item.contentDepth || item.profonditaContenuto || "standard";
  document.getElementById("tags").value = (item.tags || []).join(", ");
  document.getElementById("immagineUrl").value =
    item.url || item.image || item.immagine || "";
  document.getElementById("licenzaTipo").value =
    item.license?.type || item.licenza?.tipo || "gratuito";
  document.getElementById("licenzaNote").value =
    item.license?.notes || item.licenza?.note || "";
  document.getElementById("prezzo").value = Number(item.price ?? item.prezzo ?? 0);
  document.getElementById("pubblicato").checked =
    (item.isPublished ?? item.pubblicato) !== false;

  document.getElementById("artista").value = item.artist || item.artista || "";
  document.getElementById("stile").value = item.style || item.stile || "";
  document.getElementById("periodo").value = item.period || item.periodo || "";

  const descLen = (item.description || item.descrizione || "").length;
  document.getElementById("charCount").textContent = descLen;
  document.getElementById("profonditaPreview").textContent = estimateContentDepth(descLen);
  document.getElementById("formTitolo").textContent = ` Modifica: ${item.title || item.titolo}`;

  setTimeout(() => {
    const select = document.getElementById("operaSelect");
    if (select) {
      select.value = artworkKey;
      setFieldsDisabled(
        ["artista", "stile", "periodo", "operaTitoloUfficiale", "categoria"],
        true,
      );
    }
  }, 400);

  const badge = document.getElementById("operaStatoBadge");
  badge.textContent = "Modalità Modifica";
  badge.className = "badge ms-2 bg-success text-white";
  badge.classList.remove("d-none");

  const variantsData = await apiFetch(
    `/api/items?artworkId=${encodeURIComponent(artworkKey)}&limit=100`,
  );
  const variants = variantsData?.items || variantsData?.data?.items || [];
  renderVariantsList(variants);

  updatePreview();
}
function resetForm() {
  const fieldsToClear = [
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
  fieldsToClear.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  setFieldsDisabled(
    ["artista", "stile", "periodo", "operaTitoloUfficiale", "categoria"],
    false,
  );
  document.getElementById("operaStatoBadge").classList.add("d-none");

  initializeMuseumConfig();
  const currentUser = typeof getUtenteCorrente === "function" ? getUtenteCorrente() : null;
  if (currentUser) document.getElementById("autoreId").value = currentUser._id;

  document.getElementById("lunghezza").value = "15s";
  document.getElementById("linguaggio").value = "medium";
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

  updatePreview();
}

const salvaItem = saveItem;
const controllaIncrocioDuplicati = checkDuplicateVariant;
const gestisciCambioSelezioneOpera = handleArtworkSelectionChange;
const caricaItemPerModifica = loadItemForEdit;
const aggiornaPreview = updatePreview;