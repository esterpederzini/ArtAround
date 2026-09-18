
let stopsInTour = [];
let allCatalogItems = [];
let dragSource = null;
let museumConfig = null;

document.addEventListener("DOMContentLoaded", async () => {
  if (typeof aggiornaUtenteUI === "function") aggiornaUtenteUI();

  museumConfig =
    typeof caricaConfigMuseo === "function" ? await caricaConfigMuseo() : null;
  const currentUser =
    typeof getUtenteCorrente === "function" ? getUtenteCorrente() : null;

  if (!currentUser) {
    document.body.style.backgroundColor = "#1e2640";

    const navbar = document.querySelector(".aa-navbar");
    if (navbar) navbar.classList.add("d-none");

    const mainContainer = document.getElementById("editorMainContainer");
    if (mainContainer) {
      mainContainer.classList.remove("d-none");
      const museumName =
        museumConfig?.museumName || museumConfig?.museo || "il museo";
      mainContainer.innerHTML = `
        <div class="row justify-content-center align-items-center flex-grow-1" style="min-height: 85vh;">
          <div class="col-md-8 col-lg-6 text-center">
            <div style="font-size: 5rem; margin-bottom: 1rem;">🗺️</div>
            <h2 style="color: var(--aa-gold); font-family: var(--aa-font-serif); font-size: 2.5rem; font-weight: 600;">
              Crea il tuo percorso su misura!
            </h2>
            <p class="lead mt-3" style="color: #ffffff; font-weight: 400;">
              Vuoi diventare un curatore virtuale e progettare la tua visita museale perfetta per ${museumName}?
            </p>
            <p class="mb-4" style="color: #cbd5e1; font-size: 0.95rem;">
              Devi effettuare l'accesso per poter mescolare i contenuti del catalogo, creare il tuo itinerario e modificarlo quando vuoi.
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

  const museumName = museumConfig?.museumName || museumConfig?.museo;
  if (museumName) {
    const inputMuseum = document.getElementById("visitaMuseo");
    if (inputMuseum) inputMuseum.value = museumName;
  }

  await populateMuseums();
  await loadAuthors();
  await loadAllCatalogItems();

  applyVisitorRestrictions();

  const params = new URLSearchParams(window.location.search);
  if (params.get("id")) loadTourForEdit(params.get("id"));

  const searchInput = document.getElementById("cercaCatalogo");
  if (searchInput) {
    const debouncedFilter =
      typeof debounce === "function"
        ? debounce(
            (e) => renderCatalog(e.target.value.trim().toLowerCase()),
            250,
          )
        : (e) => renderCatalog(e.target.value.trim().toLowerCase());
    searchInput.addEventListener("input", debouncedFilter);
  }

  document.getElementById("editorMainContainer")?.classList.remove("d-none");
});

async function populateMuseums() {
  if (!museumConfig) return;
  const sel = document.getElementById("visitaMuseo");
  if (!sel) return;

  const museumName = museumConfig.museumName || museumConfig.museo || "";
  sel.innerHTML = '<option value="">Seleziona museo...</option>';
  const opt = document.createElement("option");
  opt.value = museumName;
  opt.textContent = museumName;
  sel.appendChild(opt);
  sel.value = museumName;
}

async function loadAuthors() {
  const usersRes = await apiFetch("/api/users");
  const usersList =
    usersRes?.users || (Array.isArray(usersRes) ? usersRes : []);
  const sel = document.getElementById("visitaAutore");
  if (!usersList.length || !sel) return;

  usersList
    .filter((u) => ["author", "autore", "admin"].includes(u.role || u.ruolo))
    .forEach((u) => {
      const opt = document.createElement("option");
      opt.value = u._id;
      opt.textContent = `${u.username} (${u.role || u.ruolo})`;
      sel.appendChild(opt);
    });

  const currentUser =
    typeof getUtenteCorrente === "function" ? getUtenteCorrente() : null;
  if (currentUser) sel.value = currentUser._id;
}

async function loadAllCatalogItems() {
  const museumName = museumConfig?.museumName || museumConfig?.museo;
  if (!museumName) return;

  const data = await apiFetch(
    `/api/items?museum=${encodeURIComponent(museumName)}&limit=200&published=true`,
  );
  allCatalogItems = data?.items || data?.data?.items || [];
  renderCatalog("");
}

function renderCatalog(filterText = "") {
  const container = document.getElementById("catalogoItems");
  if (!container) return;

  let items = allCatalogItems.filter(
    (item) => !stopsInTour.some((stop) => stop.itemId === item._id),
  );

  const currentUser =
    typeof getUtenteCorrente === "function" ? getUtenteCorrente() : null;
  const role = currentUser?.role || currentUser?.ruolo;

  if (currentUser && !["author", "autore", "admin"].includes(role)) {
    const purchased =
      currentUser.purchasedItems ||
      currentUser.itemsAcquistati ||
      currentUser.acquistati ||
      [];

    items = items.filter((item) => {
      const price = Number(item.price ?? item.prezzo ?? 0);
      const isFree = price === 0;
      const isPurchased = purchased.includes(item._id);
      return isFree || isPurchased;
    });
  }

  if (filterText) {
    const query = filterText.toLowerCase().trim();
    items = items.filter((i) => {
      const title = (i.title || i.titolo || "").toLowerCase();
      const artworkTitle = (i.titoloOpera || "").toLowerCase();
      const artworkId = (i.artworkId || i.operaId || "").toLowerCase();
      const tags = (i.tags || []).map((t) => t.toLowerCase());
      return (
        title.includes(query) ||
        artworkTitle.includes(query) ||
        artworkId.includes(query) ||
        tags.some((t) => t.includes(query))
      );
    });
  }

  if (!items.length) {
    container.innerHTML =
      '<div class="aa-empty" style="padding:1rem"><p style="font-size:0.8rem">Nessun item disponibile.</p></div>';
    return;
  }

  container.innerHTML = items
    .map((item) => {
      const isAlreadyAdded = stopsInTour.some((s) => s.itemId === item._id);
      const title = item.title || item.titolo || "Item";
      const subLabel = item.title || item.titoloOpera || "Opera";
      const category = item.category || item.categoria || "altro";
      const language = item.language || item.linguaggio || "medium";
      const length = item.length || item.lunghezza || "15s";

      return `
      <div class="d-flex align-items-center gap-2 p-2 mb-1 rounded"
           style="border:1px solid var(--aa-stone);background:#fff;transition:background 0.15s"
           onmouseover="this.style.background='var(--aa-cream)'" onmouseout="this.style.background='#fff'">
        <div style="width:36px;height:36px;background:var(--aa-cream-dark);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">
          ${getSmallCategoryIcon(category)}
        </div>
        <div class="flex-grow-1 min-w-0">
          <div style="font-size:0.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--aa-ink);">${title}</div>
          <div style="font-size:0.75rem; color:var(--aa-slate); display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:2px;">
            <span style="font-weight:600; color:var(--aa-charcoal); font-size:0.78rem;">${subLabel}</span>
            <span style="opacity:0.5;">·</span>
            ${badgeLinguaggio(language)}
            <span style="opacity:0.5;">·</span>
            <span class="badge bg-dark-subtle text-dark-emphasis" style="font-size:0.68rem; font-weight:600; padding:2px 6px; border-radius:4px;">
              <i class="bi bi-clock me-1"></i>${length}
            </span>
          </div>
        </div>
        <button class="btn-aa-outline" 
          style="font-size:0.75rem;padding:3px 10px;flex-shrink:0;${isAlreadyAdded ? "opacity:0.4;cursor:default" : ""}"
          ${isAlreadyAdded ? 'disabled title="Già aggiunto"' : `onclick="addStopToTour('${item._id}')"`}>
          ${isAlreadyAdded ? "✓" : "+ Aggiungi"}
        </button>
      </div>
    `;
    })
    .join("");
}

function getSmallCategoryIcon(cat) {
  const iconMap = {
    pittura: "🖼️",
    scultura: "🗿",
    architettura: "🏛️",
    fotografia: "📷",
    arte_moderna: "🎨",
    arte_antica: "🏺",
    decorativa: "🪆",
    altro: "🔍",
  };
  return iconMap[cat] || "🔍";
}

function addStopToTour(itemId) {
  saveCurrentLogisticsText();

  if (stopsInTour.some((s) => s.itemId === itemId)) {
    showToast("Item già presente nel percorso", "info");
    return;
  }
  const item = allCatalogItems.find((i) => i._id === itemId);
  if (!item) return;

  stopsInTour.push({
    itemId: item._id,
    order: stopsInTour.length + 1,
    isOptional: false,
    title: item.title || item.titolo,
    artworkTitle: item.title || item.titoloOpera || item.titolo,
    length: item.length || item.lunghezza || "15s",
    language: item.language || item.linguaggio || "medium",
    category: item.category || item.categoria || "altro",
    image: item.url || item.image || item.immagine || null,
    logistics: "",
  });

  renderTour();
  renderCatalog(
    document.getElementById("cercaCatalogo")?.value.toLowerCase() || "",
  );
}

function removeStopFromTour(itemId) {
  saveCurrentLogisticsText();
  stopsInTour = stopsInTour.filter((s) => s.itemId !== itemId);
  recalculateOrders();
  renderTour();
  renderCatalog(
    document.getElementById("cercaCatalogo")?.value.toLowerCase() || "",
  );
}

function toggleStopOptional(itemId) {
  saveCurrentLogisticsText();
  const stop = stopsInTour.find((s) => s.itemId === itemId);
  if (stop) {
    stop.isOptional = !stop.isOptional;
    renderTour();
  }
}

function recalculateOrders() {
  stopsInTour.forEach((stop, i) => (stop.order = i + 1));
}

function saveCurrentLogisticsText() {
  document.querySelectorAll(".input-logistica-tappa").forEach((el) => {
    const index = parseInt(el.getAttribute("data-index"), 10);
    if (stopsInTour[index]) {
      stopsInTour[index].logistics = el.value;
    }
  });
}

function lengthInMinutes(lengthStr = "15s") {
  if (lengthStr.includes("m")) return parseFloat(lengthStr) || 1;
  if (lengthStr.includes("s")) return (parseFloat(lengthStr) || 15) / 60;
  return 1;
}

function renderTour() {
  const list = document.getElementById("dndList");
  if (!list) return;

  document.getElementById("countItems").textContent =
    `${stopsInTour.length} item selezionati`;

  const totalMin = stopsInTour.reduce(
    (acc, s) => acc + lengthInMinutes(s.length),
    0,
  );
  const durationEl = document.getElementById("durataCalcolata");
  if (durationEl) {
    durationEl.textContent = `Durata: ~${Math.round(totalMin)} min`;
  }

  if (!stopsInTour.length) {
    list.innerHTML = `<div class="aa-empty" style="padding:1.5rem"><div class="aa-empty-icon" style="font-size:2rem">📭</div><p class="mb-0" style="font-size:0.85rem">Aggiungi item dal catalogo sottostante per creare il percorso.</p></div>`;
    return;
  }

  list.innerHTML = stopsInTour
    .map((stop, index) => {
      const logisticsValue = stop.logistics || "";

      return `
        <div class="aa-dnd-item ${stop.isOptional ? "optional-item" : ""}"
             draggable="true"
             data-id="${stop.itemId}"
             ondragstart="onDragStart(event)"
             ondragover="onDragOver(event)"
             ondrop="onDrop(event)"
             ondragend="onDragEnd(event)">
          <span class="drag-handle">⠿</span>
          <span class="item-num">${stop.order}</span>
          <div class="item-info w-100">
            <div class="item-title" style="font-weight:600; color:var(--aa-ink);">${stop.title}</div>
            <div class="item-meta mt-1 d-flex align-items-center gap-2 flex-wrap">
              ${badgeLinguaggio(stop.language)}
              <span class="badge bg-dark-subtle text-dark-emphasis" style="font-size:0.68rem; font-weight: 600; padding:2px 6px; border-radius:4px;">
                <i class="bi bi-clock me-1"></i>${stop.length}
              </span>
              ${stop.isOptional ? '<span class="aa-badge aa-badge-len" style="border-style:dashed">opzionale</span>' : ""}
            </div>
            
            <div class="mt-2 text-start pr-2" style="width: 95%;">
              <label class="text-slate d-block mb-1" style="font-size:0.68rem; font-weight:700; letter-spacing:0.5px;">
                <i class="bi bi-geo-alt-fill text-warning me-1"></i> INDICAZIONI VERSO LA PROSSIMA OPERA
              </label>
              <textarea 
                class="aa-input input-logistica-tappa w-100 p-1" 
                rows="1" 
                placeholder="Es: Svolta a sinistra ed entra nella sala successiva..."
                data-index="${index}"
                style="font-size:0.75rem; border-radius:4px; line-height:1.3; resize:vertical; background:var(--aa-cream); border: 1px solid var(--aa-stone);"
              >${logisticsValue}</textarea>
            </div>
          </div>
          <div class="d-flex gap-1 ms-auto align-self-start mt-1">
            <button class="btn-aa-outline" style="font-size:0.72rem;padding:2px 8px" 
                    onclick="toggleStopOptional('${stop.itemId}')"
                    title="${stop.isOptional ? "Rendi obbligatorio" : "Rendi opzionale"}">
              ${stop.isOptional ? "⟳" : "○"}
            </button>
            <button class="btn-aa-danger" onclick="removeStopFromTour('${stop.itemId}')">✕</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function onDragStart(e) {
  saveCurrentLogisticsText();
  dragSource = e.currentTarget;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", dragSource.dataset.id);
  setTimeout(() => dragSource.classList.add("dragging"), 0);
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  const target = e.currentTarget;
  if (target !== dragSource)
    target.style.borderTop = "2px solid var(--aa-gold)";
}

function onDrop(e) {
  e.preventDefault();
  const target = e.currentTarget;
  target.style.borderTop = "";
  if (target === dragSource) return;

  const srcId = dragSource.dataset.id;
  const tgtId = target.dataset.id;
  const srcIdx = stopsInTour.findIndex((s) => s.itemId === srcId);
  const tgtIdx = stopsInTour.findIndex((s) => s.itemId === tgtId);

  if (srcIdx === -1 || tgtIdx === -1) return;

  const [removed] = stopsInTour.splice(srcIdx, 1);
  stopsInTour.splice(tgtIdx, 0, removed);
  recalculateOrders();
  renderTour();
}

function onDragEnd(e) {
  e.currentTarget.classList.remove("dragging");
  document
    .querySelectorAll(".aa-dnd-item")
    .forEach((el) => (el.style.borderTop = ""));
}

function buildStopsFromPath(pathItems) {
  saveCurrentLogisticsText();
  return pathItems.map((s) => {
    const meta =
      allCatalogItems.find((x) => String(x._id) === String(s.itemId)) || {};
    const artworkId = meta.artworkId || meta.operaId || "";

    return {
      order: s.order,
      ordine: s.order,
      logistics: s.logistics || "",
      logistica: s.logistics || "",
      defaultItem: String(s.itemId),
      item_default: String(s.itemId),
      artworkId: artworkId,
      operaId: artworkId,
      isOptional: !!s.isOptional,
      opzionale: !!s.isOptional,
    };
  });
}

async function saveTour() {
  const title = document.getElementById("visitaTitolo").value.trim();
  const museum = document.getElementById("visitaMuseo").value;

  const currentUser =
    typeof getUtenteCorrente === "function" ? getUtenteCorrente() : null;
  const authorId = currentUser
    ? currentUser._id
    : document.getElementById("visitaAutore").value;

  const description = document.getElementById("visitaDescrizione").value.trim();
  const defaultImage = "/img/default_item_image.jpg";

  const tagEl = document.getElementById("visitaTag");
  const tags =
    tagEl && tagEl.value
      ? tagEl.value
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

  const durationMinutes =
    Number(document.getElementById("visitaDurata").value) || 60;
  const licenseType = document.getElementById("visitaLicenza").value;
  const price = Number(document.getElementById("visitaPrezzo").value) || 0;
  const isPublic = document.getElementById("visitaPubblica").checked;
  const id = document.getElementById("visitaId").value;
  const baseLevel =
    document.getElementById("visitaLivelloBase")?.value || "medium";

  if (!title || !museum || !authorId) {
    return showToast("Compila i campi obbligatori (Titolo, Museo)", "error");
  }
  if (!stopsInTour.length) {
    return showToast("Aggiungi almeno un item al percorso", "error");
  }

  let thumbnail = document.getElementById("visitaImmagine").value.trim();

  if (!thumbnail && stopsInTour.length > 0) {
    const firstItem = allCatalogItems.find(
      (i) => i._id === stopsInTour[0].itemId,
    );
    if (firstItem && (firstItem.url || firstItem.image || firstItem.immagine)) {
      thumbnail = firstItem.url || firstItem.image || firstItem.immagine;
    }
  }

  if (!thumbnail) thumbnail = defaultImage;

  const stops = buildStopsFromPath(stopsInTour);

  const payload = {
    title,
    titolo: title,
    museum,
    museo: museum,
    description,
    descrizione: description,
    image: thumbnail,
    immagine: thumbnail,
    tags,
    totalEstimatedDuration: durationMinutes,
    durataTotaleStimata: durationMinutes,
    baseLevel,
    livello_base: baseLevel,
    license: { type: licenseType },
    licenza: { tipo: licenseType },
    price,
    prezzo: price,
    isPublic,
    pubblica: isPublic,
    creatorId: authorId,
    stopsCount: stopsInTour.length,
    stops: stops,
    tappe: stops,
    duration: `${durationMinutes} min`,
  };

  const method = id ? "PUT" : "POST";
  const url = id ? `/api/visits/${id}` : "/api/visits";
  if (id) payload._id = id;

  const ok = await apiFetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (ok) {
    showToast(
      id ? "Visita aggiornata!" : "Visita creata con successo!",
      "success",
    );
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 500);
  }
}

async function loadTourForEdit(id) {
  const response = await apiFetch(`/api/visits/${id}`);
  const visit = response?.data || response;
  if (!visit) return;

  const currentUser =
    typeof getUtenteCorrente === "function" ? getUtenteCorrente() : null;
  const originalCreatorId = visit.creatorId?._id || visit.creatorId || "";
  const isOriginalOwner =
    currentUser && String(originalCreatorId) === String(currentUser._id);

  if (isOriginalOwner) {
    document.getElementById("visitaId").value = visit._id;
    const authorField = document.getElementById("visitaAutore");
    if (authorField) authorField.value = originalCreatorId;

    const currentTitle = visit.title || visit.titolo || "";
    document.getElementById("visitaTitolo").value = currentTitle;
    document.getElementById("editorTitolo").textContent =
      `Modifica: ${currentTitle || "Visita"}`;
    showToast(`La tua visita è stata caricata per la modifica`, "info");
  } else {
    document.getElementById("visitaId").value = "";
    const authorField = document.getElementById("visitaAutore");
    if (authorField && currentUser) authorField.value = currentUser._id;

    const clonedTitle = `Copia di ${visit.title || visit.titolo || "Visita"}`;
    document.getElementById("visitaTitolo").value = clonedTitle;
    document.getElementById("editorTitolo").textContent =
      `Personalizza: ${clonedTitle}`;
    showToast(
      `Guida acquistata: generata una copia autonoma da personalizzare`,
      "success",
    );
  }

  document.getElementById("visitaDescrizione").value =
    visit.description || visit.descrizione || "";

  const inputTag = document.getElementById("visitaTag");
  if (inputTag) inputTag.value = (visit.tags || []).join(", ");

  document.getElementById("visitaDurata").value =
    visit.totalEstimatedDuration || visit.durataTotaleStimata || 60;
  document.getElementById("visitaImmagine").value =
    visit.image || visit.immagine || "";

  if (document.getElementById("visitaLivelloBase")) {
    document.getElementById("visitaLivelloBase").value =
      visit.baseLevel || visit.livello_base || "medium";
  }

  document.getElementById("visitaLicenza").value =
    visit.license?.type || visit.licenza?.tipo || "gratuito";
  document.getElementById("visitaPrezzo").value = Number(
    visit.price ?? visit.prezzo ?? 0,
  );
  document.getElementById("visitaPubblica").checked =
    (visit.isPublic ?? visit.pubblica) || false;

  let rawStops = Array.isArray(visit.stops)
    ? visit.stops
    : Array.isArray(visit.tappe)
      ? visit.tappe
      : [];
  if (
    rawStops.length === 0 &&
    Array.isArray(visit.items) &&
    visit.items.length > 0
  ) {
    rawStops = visit.items.map((row) => ({
      order: row.order ?? row.ordine,
      isOptional: row.isOptional ?? row.opzionale,
      defaultItem: row.itemId?._id || row.itemId,
      logistics: row.logistics || row.logistica || "",
    }));
  }

  stopsInTour = rawStops.map((stop) => {
    const def = stop.defaultItem || stop.item_default;
    const itemId =
      def && typeof def === "object" && def._id != null ? def._id : def;
    const pop =
      def && typeof def === "object" && (def.title || def.titolo) ? def : null;
    const meta =
      pop ||
      allCatalogItems.find((x) => String(x._id) === String(itemId)) ||
      {};

    return {
      itemId: String(itemId),
      order: stop.order ?? stop.ordine ?? 1,
      isOptional: !!(stop.isOptional ?? stop.opzionale),
      title: meta.title || meta.titolo || stop.title || "–",
      artworkTitle: meta.title || meta.titoloOpera || meta.titolo || "–",
      length: meta.length || meta.lunghezza || "15s",
      language: meta.language || meta.linguaggio || "medium",
      category: meta.category || meta.categoria || "altro",
      image: meta.url || meta.image || meta.immagine || null,
      logistics: stop.logistics || stop.logistica || "",
    };
  });

  stopsInTour.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  stopsInTour.forEach((row, idx) => {
    row.order = idx + 1;
  });

  renderTour();
  renderCatalog(
    document.getElementById("cercaCatalogo")?.value.toLowerCase() || "",
  );
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetEditor() {
  document.getElementById("visitaId").value = "";
  document.getElementById("visitaTitolo").value = "";
  document.getElementById("visitaDescrizione").value = "";

  const inputTag = document.getElementById("visitaTag");
  if (inputTag) inputTag.value = "";

  document.getElementById("visitaDurata").value = 60;
  document.getElementById("visitaLicenza").value = "gratuito";
  document.getElementById("visitaPrezzo").value = 0;
  document.getElementById("visitaPubblica").checked = false;
  document.getElementById("editorTitolo").textContent = "Nuova Visita";
  document.getElementById("visitaImmagine").value = "";

  const inputMuseum = document.getElementById("visitaMuseo");
  const museumName = museumConfig?.museumName || museumConfig?.museo;
  if (inputMuseum && museumName) {
    inputMuseum.value = museumName;
  }

  const currentUser =
    typeof getUtenteCorrente === "function" ? getUtenteCorrente() : null;
  if (currentUser) {
    const authorField = document.getElementById("visitaAutore");
    if (authorField) authorField.value = currentUser._id;
  }

  stopsInTour = [];
  renderTour();
  renderCatalog("");
}

function applyVisitorRestrictions() {
  const currentUser =
    typeof getUtenteCorrente === "function" ? getUtenteCorrente() : null;
  if (!currentUser) return;
  const role = currentUser.role || currentUser.ruolo;
  if (["author", "autore", "admin"].includes(role)) return;

  document
    .querySelectorAll(".solo-autore")
    .forEach((el) => el.classList.add("d-none"));

  const priceInput = document.getElementById("visitaPrezzo");
  if (priceInput) priceInput.value = 0;

  const publicCheckbox = document.getElementById("visitaPubblica");
  if (publicCheckbox) publicCheckbox.checked = false;

  const header = document.querySelector(".aa-card-header");
  if (header && !document.getElementById("badgeVisitatore")) {
    const badge = document.createElement("span");
    badge.id = "badgeVisitatore";
    badge.className = "aa-badge aa-badge-lang-infantile ms-2";
    badge.style.fontSize = "0.7rem";
    badge.innerHTML =
      '<i class="bi bi-info-circle"></i> Modalità Personalizzazione (Uso Personale)';
    header.appendChild(badge);
  }
}

document.addEventListener("input", (e) => {
  if (e.target.classList.contains("input-logistica-tappa")) {
    const index = parseInt(e.target.getAttribute("data-index"), 10);
    if (stopsInTour[index]) {
      stopsInTour[index].logistics = e.target.value;
    }
  }
});

const salvaVisita = saveTour;
const caricaVisitaPerModifica = loadTourForEdit;
const aggiungiItemAlPercorso = addStopToTour;
const rimuoviItemDalPercorso = removeStopFromTour;
const toggleOpzionale = toggleStopOptional;
