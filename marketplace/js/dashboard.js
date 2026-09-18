const state = {
  currentTab: "items",
  filters: {
    museum: "",
    language: "",
    category: "",
    price: "",
    search: "",
  },
  itemsPage: 1,
  visitsPage: 1,
  limit: 12,
};

document.addEventListener("DOMContentLoaded", async () => {
  const config = await loadMuseumConfig();
  if (!config) {
    showToast("Configurazione museo non trovata", "error");
    return;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("museo")) state.filters.museum = params.get("museo");
  if (params.get("museum")) state.filters.museum = params.get("museum");

  await loadMuseumFilters();
  await loadItems();
  loadVisitsTab();

  if (typeof aggiornaUtenteUI === "function") aggiornaUtenteUI();
  const currentUser =
    typeof getUtenteCorrente === "function" ? getUtenteCorrente() : null;

  if (currentUser) {
    document.getElementById("tabMieiBtn")?.classList.remove("d-none");
    const role = currentUser.role || currentUser.ruolo;

    if (["author", "autore", "admin", "visitor", "visitatore"].includes(role)) {
      document.getElementById("authorActions")?.classList.remove("d-none");

      if (["author", "autore", "admin"].includes(role)) {
        document.getElementById("sidebarLog")?.classList.remove("d-none");
        document.getElementById("btnLogVendite")?.classList.remove("d-none");
        document.getElementById("btnNuovoItem")?.classList.remove("d-none");
      } else {
        document.getElementById("btnLogVendite")?.classList.add("d-none");
        document.getElementById("btnNuovoItem")?.classList.add("d-none");
      }

      document.getElementById("btnNuovaVisita")?.classList.add("d-none");
      document.getElementById("navEditorVisita")?.classList.remove("d-none");
    }
  }

  configureFilterButtons("[data-museo]", (val) => {
    state.filters.museum = val;
    state.itemsPage = 1;
    loadItems();
  });
  configureFilterButtons("[data-lang]", (val) => {
    state.filters.language = val;
    state.itemsPage = 1;
    loadItems();
  });
  configureFilterButtons("[data-cat]", (val) => {
    state.filters.category = val;
    state.itemsPage = 1;
    loadItems();
  });
  configureFilterButtons("[data-prezzo]", (val) => {
    state.filters.price = val;
    state.itemsPage = 1;
    loadItems();
  });

  const searchInput = document.getElementById("campoCerca");
  if (searchInput) {
    const debouncedSearch =
      typeof debounce === "function"
        ? debounce((e) => {
            state.filters.search = e.target.value.trim();
            state.itemsPage = 1;
            loadItems();
          }, 350)
        : (e) => {
            state.filters.search = e.target.value.trim();
            state.itemsPage = 1;
            loadItems();
          };
    searchInput.addEventListener("input", debouncedSearch);
  }

  document.getElementById("selectLimit")?.addEventListener("change", (e) => {
    state.limit = Number(e.target.value);
    state.itemsPage = 1;
    loadItems();
  });

  if (state.filters.museum) {
    setTimeout(() => {
      const btn = document.querySelector(
        `[data-museo="${state.filters.museum}"]`,
      );
      if (btn) {
        document
          .querySelectorAll("[data-museo]")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      }
    }, 500);
  }

  const tabParam = params.get("tab");
  if (tabParam === "visite" || tabParam === "visits") {
    const btnVisiteTab = document.querySelector('.aa-tab[onclick*="visite"]');
    if (btnVisiteTab) {
      switchTab("visite", btnVisiteTab);
    } else {
      loadVisitsTab();
    }

    const visitIdToOpen = sessionStorage.getItem("apriVisitaId");
    if (visitIdToOpen) {
      sessionStorage.removeItem("apriVisitaId");
      setTimeout(() => {
        openVisitModal(visitIdToOpen);
      }, 300);
    }
  }
});

function configureFilterButtons(selector, callback) {
  document.querySelectorAll(selector).forEach((btn) => {
    btn.addEventListener("click", () => {
      btn
        .closest("div")
        .querySelectorAll(".aa-filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      callback(
        btn.dataset.museo ??
          btn.dataset.lang ??
          btn.dataset.cat ??
          btn.dataset.prezzo ??
          "",
      );
    });
  });
}

function switchTab(tab, btnEl) {
  state.currentTab = tab;
  document
    .querySelectorAll(".aa-tab")
    .forEach((b) => b.classList.remove("active"));
  btnEl.classList.add("active");

  document
    .getElementById("tabItems")
    .classList.toggle("d-none", tab !== "items");
  document
    .getElementById("tabVisite")
    .classList.toggle("d-none", tab !== "visite");
  document.getElementById("tabMiei").classList.toggle("d-none", tab !== "miei");

  const btnNuovoItem = document.getElementById("btnNuovoItem");
  const btnNuovaVisita = document.getElementById("btnNuovaVisita");
  const currentUser =
    typeof getUtenteCorrente === "function" ? getUtenteCorrente() : null;
  const role = currentUser?.role || currentUser?.ruolo;

  if (btnNuovoItem && btnNuovaVisita) {
    if (
      currentUser &&
      ["author", "autore", "admin", "visitor", "visitatore"].includes(role)
    ) {
      if (tab === "items") {
        if (["author", "autore", "admin"].includes(role)) {
          btnNuovoItem.classList.remove("d-none");
        } else {
          btnNuovoItem.classList.add("d-none");
        }
        btnNuovaVisita.classList.add("d-none");
      } else if (tab === "visite") {
        btnNuovoItem.classList.add("d-none");
        btnNuovaVisita.classList.remove("d-none");
      } else {
        btnNuovoItem.classList.add("d-none");
        btnNuovaVisita.classList.add("d-none");
      }
    } else {
      btnNuovoItem.classList.add("d-none");
      btnNuovaVisita.classList.add("d-none");
    }
  }

  if (tab === "visite") loadVisitsTab();
  if (tab === "miei") loadMyContent();
}

async function loadMuseumFilters() {
  const config = await loadMuseumConfig();
  if (!config) return;

  const container = document.getElementById("filtroMusei");
  if (!container) return;

  container.innerHTML = "";

  const museumName = config.museumName || config.museo || "Museo";
  const btn = document.createElement("button");
  btn.className = "aa-filter-btn active";
  btn.dataset.museo = museumName;
  btn.textContent =
    museumName.length > 22 ? museumName.substring(0, 20) + "…" : museumName;
  btn.title = museumName;
  btn.addEventListener("click", () => {
    container
      .querySelectorAll(".aa-filter-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.filters.museum = museumName;
    state.itemsPage = 1;
    loadItems();
  });
  container.appendChild(btn);
}

async function loadMuseumConfig() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) throw new Error("Museum config not found");
    return await response.json();
  } catch (error) {
    console.error("Error loading config:", error);
    return null;
  }
}

async function loadItems(page = state.itemsPage) {
  state.itemsPage = page;
  const grid = document.getElementById("itemsGrid");
  grid.innerHTML =
    '<div class="col-12 text-center py-5"><div class="aa-spinner"></div> Caricamento...</div>';

  const queryParams = new URLSearchParams({
    page,
    limit: state.limit,
    ...(state.filters.museum && { museum: state.filters.museum }),
    ...(state.filters.language && { language: state.filters.language }),
    ...(state.filters.category && { category: state.filters.category }),
    ...(state.filters.search && { search: state.filters.search }),
    ...(state.filters.price === "free" && { maxPrice: 0 }),
    ...(state.filters.price === "paid" && { minPrice: 0.01 }),
  });

  const response = await apiFetch(`/api/items?${queryParams}`);
  if (!response) {
    grid.innerHTML =
      '<div class="col-12"><div class="aa-empty"><div class="aa-empty-icon">❌</div><p>Errore nel caricamento.</p></div></div>';
    return;
  }

  const itemsList = response.items || response.data?.items || [];
  const totalPages = response.pages ?? response.pagine ?? 0;

  if (!itemsList.length) {
    grid.innerHTML =
      '<div class="col-12"><div class="aa-empty"><div class="aa-empty-icon">🔍</div><h5>Nessun risultato</h5><p>Prova a modificare i filtri di ricerca.</p></div></div>';
    renderPagination("paginazioneItems", page, 0, "loadItems");
    return;
  }

  grid.innerHTML = itemsList.map((item) => renderItemCard(item)).join("");
  renderPagination("paginazioneItems", page, totalPages, "loadItems");
}

function renderItemCard(item) {
  const title = item.title || item.titolo || "Item";
  const desc = item.description || item.descrizione || "";
  const category = item.category || item.categoria || "altro";
  const language = item.language || item.linguaggio || "medium";
  const length = item.length || item.lunghezza || "15s";
  const price = Number(item.price ?? item.prezzo ?? 0);
  const license =
    item.license?.type ||
    item.licenza?.tipo ||
    item.license ||
    item.licenza ||
    "–";

  const img = item.url
    ? `<img src="${item.url}" class="card-img-top" alt="${title}" onerror="this.style.display='none'">`
    : `<div class="aa-item-placeholder">${getCategoryIcon(category)}</div>`;

  return `
    <div class="col-sm-6 col-md-4 col-xl-3">
      <div class="aa-item-card" style="cursor:pointer" onclick="openItemModal('${item._id}')">
        ${img}
        <div class="card-body">
          <div class="card-title">${title}</div>
          <div class="d-flex gap-1 flex-wrap mb-2">
            ${badgeLinguaggio(language)}${badgeLunghezza(length)}
          </div>
          <p class="card-text">${desc}</p>
        </div>
        <div class="card-footer">
          ${badgePrezzo(price)}
          <span class="text-slate" style="font-size:0.72rem">${license}</span>
        </div>
      </div>
    </div>
  `;
}

function getCategoryIcon(category) {
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
  return iconMap[category] || "🔍";
}

async function openItemModal(id) {
  const modal = document.getElementById("itemModal");
  modal.classList.remove("d-none");
  document.getElementById("modalItemTitolo").textContent = "Caricamento…";
  document.getElementById("modalItemBody").innerHTML =
    '<div class="text-center py-4"><div class="aa-spinner"></div></div>';

  const footerElement = document.getElementById("modalItemFooter");
  footerElement.innerHTML = "";
  footerElement.classList.remove("d-none");

  const response = await apiFetch(`/api/items/${id}`);
  const item = response?.data || response;
  if (!item) {
    modal.classList.add("d-none");
    return;
  }

  const title = item.title || item.titolo || "Item";
  const desc =
    item.description || item.descrizione || "Nessuna descrizione inserita.";
  const museum = item.museum || item.museo || "–";
  const artworkId = item.artworkId || item.operaId || "–";
  const language = item.language || item.linguaggio || "medium";
  const length = item.length || item.lunghezza || "15s";
  const category = item.category || item.categoria || "altro";
  const contentDepth = item.contentDepth || item.profonditaContenuto || "–";
  const price = Number(item.price ?? item.prezzo ?? 0);
  const authorName =
    item.creatorId?.username || item.tourAuthor || item.autore_visita || "–";
  const licenseType =
    item.license?.type ||
    item.licenza?.tipo ||
    item.license ||
    item.licenza ||
    "–";
  const sales = item.salesLogs || item.logVendite || [];

  document.getElementById("modalItemTitolo").textContent = title;

  const mediaHTML = item.url
    ? `<img src="${item.url}" class="img-fluid rounded border border-soft w-100" style="max-height: 250px; object-fit: cover;" alt="">`
    : `<div class="aa-item-placeholder rounded border border-soft d-flex align-items-center justify-content-center" style="height: 180px;">
         <i class="bi bi-image" style="font-size: 2.5rem; color: var(--aa-tortora);"></i>
       </div>`;

  document.getElementById("modalItemBody").innerHTML = `
    <div class="row g-3">
      <div class="col-md-5">
        ${mediaHTML}
      </div>

      <div class="col-md-7 d-flex flex-column justify-content-between">
        <div>
          <div class="text-uppercase text-slate small fw-bold tracking-wider mb-2" style="letter-spacing: 0.05em;">
            Classificazione Item
          </div>
          <div class="d-flex flex-wrap gap-1 mb-3">
            ${badgeLinguaggio(language)}${badgeLunghezza(length)}
            <span class="badge aa-badge aa-badge-len">${category}</span>
            <span class="badge aa-badge aa-badge-len">Prof.: ${contentDepth}</span>
          </div>
        </div>

        <div class="p-2 rounded bg-cream border border-soft shadow-sm" style="font-size: 0.85rem;">
          <div class="row g-2">
            <div class="col-6"><span class="aa-label m-0" style="font-size:0.7rem;">Opera ID</span><div class="fw-semibold text-charcoal">${artworkId}</div></div>
            <div class="col-6"><span class="aa-label m-0" style="font-size:0.7rem;">Museo</span><div class="fw-semibold text-charcoal">${museum}</div></div>
            <div class="col-6"><span class="aa-label">Autore</span><div>${authorName}</div></div>
            <div class="col-6"><span class="aa-label m-0" style="font-size:0.7rem;">Licenza</span><div class="text-slate fw-semibold">${licenseType}</div></div>
          </div>
        </div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="mb-2">
      <div class="aa-sidebar-title" style="font-size: 0.75rem; border-bottom: none; margin-bottom: 0.5rem; padding-bottom: 0;">
        Contenuto Testuale (Sintesi Vocale)
      </div>
      <p class="text-charcoal px-3 py-3 rounded bg-cream border-soft" style="font-size: 0.95rem; line-height: 1.6; border-left: 3px solid var(--aa-taupe); margin: 0;">
        ${desc}
      </p>
    </div>

    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3 pt-2 border-top border-soft">
      <div>
        ${item.tags?.length ? item.tags.map((t) => `<span class="badge aa-badge aa-badge-len me-1">${t}</span>`).join("") : "–"}
      </div>
      <div>
        ${sales.length > 0 ? `<span class="text-slate small"><i class="bi bi-graph-up"></i> ${sales.length} vendite</span>` : ""}
      </div>
    </div>
  `;

  let footerHtml = ``;
  const currentUser =
    typeof getUtenteCorrente === "function" ? getUtenteCorrente() : null;

  if (!currentUser) {
    footerElement.innerHTML = "";
    footerElement.classList.add("d-none");
    return;
  }

  const itemCreatorId = item.creatorId?._id || item.creatorId;
  const isOwner =
    (itemCreatorId && String(itemCreatorId) === String(currentUser._id)) ||
    (item.tourAuthor &&
      String(item.tourAuthor) === String(currentUser.username)) ||
    (item.autore_visita &&
      String(item.autore_visita) === String(currentUser.username));

  const alreadyPurchased =
    Array.isArray(sales) &&
    sales.some((log) => {
      const buyerId =
        log.buyerId?._id ||
        log.buyerId ||
        log.acquirenteId?._id ||
        log.acquirenteId;
      return String(buyerId) === String(currentUser._id);
    });

  if (isOwner) {
    footerHtml = `
      <span class="text-taupe small me-auto align-self-center fw-semibold">
        <i class="bi bi-person-check-fill"></i> Questo contenuto è stato creato da te
      </span>
    `;
  } else if (alreadyPurchased) {
    footerHtml = `
      <span class="text-success small me-auto align-self-center fw-semibold">
        <i class="bi bi-check-circle-fill"></i> Acquistato
      </span>
    `;
  } else {
    const escapedTitle = title.replace(/'/g, "\\'").replace(/"/g, "&quot;");
    if (price > 0) {
      footerHtml += `
        <button class="btn-aa-gold" id="btnAcquistaItem" onclick="handleItemPurchaseOrAdopt('${item._id}', '${escapedTitle}',${price})">
          <i class="bi bi-bag-check"></i> Acquista €${price.toFixed(2)}
        </button>
      `;
    } else {
      footerHtml += `
        <button class="btn-aa-primary" id="btnAdottaItem" onclick="handleItemPurchaseOrAdopt('${item._id}', '${escapedTitle}', 0)">
          Acquista Gratis
        </button>
      `;
    }
  }

  footerElement.innerHTML = footerHtml;
  footerElement.classList.remove("d-none");
}

function closeItemModal() {
  document.getElementById("itemModal").classList.add("d-none");
}

async function openVisitModal(id) {
  const modal = document.getElementById("visitaModal");
  modal.classList.remove("d-none");
  document.getElementById("modalVisitaTitolo").textContent = "Caricamento…";
  document.getElementById("modalVisitaBody").innerHTML =
    '<div class="text-center py-4"><div class="aa-spinner"></div></div>';

  const footerElement = document.getElementById("modalVisitaFooter");
  footerElement.innerHTML = "";

  const response = await apiFetch(`/api/visits/${id}`);
  const visit = response?.data || response;
  if (!visit) {
    modal.classList.add("d-none");
    return;
  }

  const title = visit.title || visit.titolo || "Visita";
  const museum = visit.museum || visit.museo || "Nessun museo";
  const desc =
    visit.description ||
    visit.descrizione ||
    "Nessuna descrizione disponibile.";
  const price = Number(visit.price ?? visit.prezzo ?? 0);
  const duration =
    visit.totalEstimatedDuration || visit.durataTotaleStimata || 60;
  const baseLevel = visit.baseLevel || visit.livello_base || "medium";
  const authorName =
    visit.creatorId?.username || visit.author || visit.autore || "–";
  const licenseType = visit.license?.type || visit.licenza?.tipo || "–";
  const stops = visit.stops || visit.tappe || [];

  document.getElementById("modalVisitaTitolo").textContent = title;

  let stopsHtml =
    '<em class="text-slate small">Nessuna tappa inserita nel percorso.</em>';
  if (stops.length > 0) {
    stopsHtml = stops
      .map((stop) => {
        const itemInfo = stop.defaultItem || stop.item_default || {};
        const stopName = itemInfo.title || itemInfo.titolo || "Tappa";
        const stopArtworkId = itemInfo.artworkId || itemInfo.operaId || "";
        const orderNum = stop.order ?? stop.ordine ?? 1;
        const isOptional = stop.isOptional ?? stop.opzionale ?? false;

        return `
          <div class="d-flex align-items-center gap-2 mb-2 p-2 rounded" style="background:var(--aa-cream)">
            <span class="aa-badge aa-badge-len" style="background:white">${orderNum}</span>
            <div class="flex-grow-1" style="font-size:0.85rem">
              <strong>${stopName}</strong> <span class="text-slate mx-1">·</span> <small>${stopArtworkId}</small>
            </div>
            ${isOptional ? '<span style="font-size:0.7rem; color:var(--aa-slate)">Opzionale</span>' : ""}
          </div>`;
      })
      .join("");
  }

  document.getElementById("modalVisitaBody").innerHTML = `
    <div class="d-flex flex-wrap gap-2 mb-3 align-items-center">
      <span class="aa-badge aa-badge-len">🏛️ ${museum}</span>
      <span class="aa-badge aa-badge-len"><i class="bi bi-clock"></i> ~${duration} min</span>
      ${badgeLinguaggio(baseLevel)}${badgePrezzo(price)}
    </div>
    <p style="line-height:1.7">${desc}</p>
    <div class="divider"></div>
    <div class="row g-2 text-sm mb-3">
      <div class="col-6"><span class="aa-label">Autore</span><div>${authorName}</div></div>
      <div class="col-6"><span class="aa-label">Licenza</span><div>${licenseType}</div></div>
    </div>
    ${visit.tags?.length ? `<div class="mb-3">${visit.tags.map((t) => `<span class="aa-badge aa-badge-len me-1">${t}</span>`).join("")}</div>` : ""}
    
    <div class="aa-sidebar-title mt-4" style="font-size: 0.72rem"><i class="bi bi-geo-alt"></i> Percorso della visita</div>
    <div class="pe-2">
        ${stopsHtml}
    </div>
  `;

  let footerHtml = ``;
  const currentUser =
    typeof getUtenteCorrente === "function" ? getUtenteCorrente() : null;

  if (!currentUser) {
    footerElement.innerHTML = "";
    footerElement.classList.add("d-none");
    return;
  }

  const visitCreatorId = visit.creatorId?._id || visit.creatorId;
  const isOwner =
    (visitCreatorId && String(visitCreatorId) === String(currentUser._id)) ||
    (visit.author && String(visit.author) === String(currentUser.username)) ||
    (visit.autore && String(visit.autore) === String(currentUser.username));

  const adoptions = visit.adoptionLogs || visit.logAdozioni || [];
  const alreadyAdopted =
    Array.isArray(adoptions) &&
    adoptions.some((log) => {
      const adopterId =
        log.adopterId?._id ||
        log.adopterId ||
        log.adottanteId?._id ||
        log.adottanteId;
      return String(adopterId) === String(currentUser._id);
    });

  if (isOwner) {
    footerHtml = `
      <span class="text-taupe small me-auto align-self-center fw-semibold">
        <i class="bi bi-person-check-fill"></i> Questo percorso è stato creato da te
      </span>
    `;
  } else if (alreadyAdopted) {
    footerHtml = `
      <span class="text-success small me-auto align-self-center fw-semibold">
        <i class="bi bi-check-circle-fill"></i> Visita acquistata
      </span>
    `;
  } else {
    const escapedTitle = title.replace(/'/g, "\\'").replace(/"/g, "&quot;");
    if (price > 0) {
      footerHtml += `
        <button class="btn-aa-gold" id="btnAcquistaVisita" onclick="handleVisitPurchaseOrAdopt('${visit._id}', '${escapedTitle}', ${price})">
          <i class="bi bi-bag-check"></i> Acquista €${price.toFixed(2)}
        </button>
      `;
    } else {
      footerHtml += `
        <button class="btn-aa-primary" id="btnAdottaVisita" onclick="handleVisitPurchaseOrAdopt('${visit._id}', '${escapedTitle}', 0)">
          Acquista Gratis
        </button>
      `;
    }
  }

  footerElement.innerHTML = footerHtml;
  footerElement.classList.remove("d-none");
}

function closeVisitModal() {
  document.getElementById("visitaModal").classList.add("d-none");
}

async function loadVisitsTab(page = state.visitsPage) {
  state.visitsPage = page;
  const grid = document.getElementById("visiteGrid");
  grid.innerHTML =
    '<div class="col-12 text-center py-5"><div class="aa-spinner"></div></div>';

  const currentUser =
    typeof getUtenteCorrente === "function" ? getUtenteCorrente() : null;

  const queryParams = new URLSearchParams({
    page,
    limit: state.limit,
    ...(state.filters.museum && { museum: state.filters.museum }),
    ...(currentUser && { includePrivateCreatorId: currentUser._id }),
  });

  const response = await apiFetch(`/api/visits?${queryParams}`);
  const visitsList =
    response?.visits || response?.data?.visits || response?.data || [];
  const totalPages = response?.pages ?? response?.pagine ?? 0;

  if (!visitsList.length) {
    grid.innerHTML =
      '<div class="col-12"><div class="aa-empty"><div class="aa-empty-icon">🗺️</div><h5>Nessuna visita disponibile</h5><p>Crea la prima visita dall\'Editor.</p><a href="/editor-visita" class="btn-aa-primary mt-2">Crea Visita</a></div></div>';
    return;
  }

  const filteredVisits = visitsList.filter((v) => {
    const isPublic = v.isPublic ?? v.pubblica ?? true;
    if (isPublic) return true;
    if (!currentUser) return false;

    const creatorId = v.creatorId?._id || v.creatorId;
    const isOwnerById =
      creatorId && String(creatorId) === String(currentUser._id);
    const isOwnerByUsername =
      (v.author && String(v.author) === String(currentUser.username)) ||
      (v.autore && String(v.autore) === String(currentUser.username));
    return isOwnerById || isOwnerByUsername;
  });

  if (!filteredVisits.length) {
    grid.innerHTML =
      '<div class="col-12"><div class="aa-empty"><div class="aa-empty-icon">🗺️</div><h5>Nessuna visita disponibile</h5><p>Nessuna visita corrispondente ai criteri.</p></div></div>';
    return;
  }

  grid.innerHTML = filteredVisits.map((v) => renderVisitaCard(v)).join("");
  renderPagination("paginazioneVisite", page, totalPages, "loadVisitsTab");
}

function renderVisitaCard(v) {
  const stops = v.stops || v.tappe || [];
  const mandatoryStops = stops.filter(
    (s) => !(s.isOptional ?? s.opzionale),
  ).length;
  const optionalStops = stops.filter((s) => s.isOptional ?? s.opzionale).length;
  const title = v.title || v.titolo || "Visita Senza Nome";
  const museum = v.museum || v.museo || "Nessun museo";
  const desc = v.description || v.descrizione || "Nessuna descrizione.";
  const duration = v.totalEstimatedDuration || v.durataTotaleStimata || 60;
  const price = Number(v.price ?? v.prezzo ?? 0);

  return `
    <div class="col-md-6 col-xl-4">
      <div class="aa-visita-card" style="cursor:pointer" onclick="openVisitModal('${v._id}')">
        <div class="vcard-header">
          <h5>${title}</h5>
          <small style="opacity:0.65">${museum}</small>
        </div>
        <div class="vcard-body">
          <p class="small text-slate mb-3" style="line-height:1.5">${desc.substring(0, 100)}...</p>
          <div class="d-flex gap-3 mb-3 text-slate" style="font-size:0.8rem">
            <span><i class="bi bi-list-ol"></i> ${mandatoryStops} obb.</span>
            <span><i class="bi bi-dash-circle"></i> ${optionalStops} opz.</span>
            <span><i class="bi bi-clock"></i> ~${duration} min</span>
          </div>
          ${v.tags?.length ? `<div class="mb-3">${v.tags.map((t) => `<span class="aa-badge aa-badge-len">${t}</span>`).join("")}</div>` : ""}
        </div>
        <div class="d-flex justify-content-between align-items-center mt-1 mb-2" style="padding-left: 12px;">
          ${badgePrezzo(price)}
        </div>
      </div>
    </div>
  `;
}

async function handleVisitPurchaseOrAdopt(visitId, title, price) {
  const currentUser =
    typeof getUtenteCorrente === "function" ? getUtenteCorrente() : null;
  if (!currentUser) {
    showToast(
      `Accedi per poter ${price > 0 ? "acquistare" : "adottare"} questa visita.`,
      "error",
    );
    if (typeof apriLogin === "function") apriLogin();
    return;
  }

  try {
    const res = await apiFetch(`/api/visits/${visitId}`);
    const visit = res?.data || res;
    const creatorId = visit?.creatorId?._id || visit?.creatorId;

    if (creatorId && String(creatorId) === String(currentUser._id)) {
      showToast(
        "Operazione annullata: non puoi acquistare o adottare una visita creata da te.",
        "error",
      );
      closeVisitModal();
      return;
    }

    const response = await apiFetch(`/api/visits/${visitId}/adopt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adopterId: currentUser._id }),
    });

    if (response) {
      const msg =
        price > 0
          ? `"${title}" acquistata correttamente e salvata nel tuo profilo!`
          : `"${title}" adottata correttamente e salvata nel tuo profilo!`;

      showToast(msg, "success");
      closeVisitModal();
      loadVisitsTab();
    }
  } catch (error) {
    console.error("Error adopting/purchasing visit:", error);
    showToast("Errore di rete durante il salvataggio nel database.", "error");
  }
}

async function handleItemPurchaseOrAdopt(itemId, title, price) {
  const currentUser =
    typeof getUtenteCorrente === "function" ? getUtenteCorrente() : null;
  if (!currentUser) {
    showToast(
      `Accedi per poter ${price > 0 ? "acquistare" : "adottare"} questo contenuto.`,
      "error",
    );
    if (typeof apriLogin === "function") apriLogin();
    return;
  }

  try {
    const res = await apiFetch(`/api/items/${itemId}`);
    const item = res?.data || res;
    const creatorId = item?.creatorId?._id || item?.creatorId;

    if (creatorId && String(creatorId) === String(currentUser._id)) {
      showToast(
        "Operazione annullata: non puoi acquistare o adottare un contenuto creato da te.",
        "error",
      );
      closeItemModal();
      return;
    }

    const response = await apiFetch(`/api/items/${itemId}/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyerId: currentUser._id }),
    });

    if (response) {
      const msg =
        price > 0
          ? `"${title}" acquistato correttamente e salvato nel tuo profilo!`
          : `"${title}" adottato correttamente e salvato nel tuo profilo!`;

      showToast(msg, "success");
      closeItemModal();
      loadItems();
    }
  } catch (error) {
    console.error("Error purchasing item:", error);
    showToast("Errore di rete durante il salvataggio nel database.", "error");
  }
}

async function loadMyContent() {
  const currentUser =
    typeof getUtenteCorrente === "function" ? getUtenteCorrente() : null;
  const container = document.getElementById("mieiContenuti");

  if (!currentUser) {
    container.innerHTML = `
      <div class="aa-empty">
        <div class="aa-empty-icon">🔐</div>
        <h5>Accesso richiesto</h5>
        <p>Effettua il login per vedere i tuoi contenuti.</p>
        <a href="/" class="btn-aa-primary">Vai al login</a>
      </div>`;
    return;
  }

  container.innerHTML =
    '<div class="text-center py-4"><div class="aa-spinner"></div></div>';

  const [dataItems, dataVisitsCreated, dataVisitsAdopted] = await Promise.all([
    apiFetch(`/api/items?published=all&limit=100`),
    apiFetch(`/api/visits?isPublic=all&creatorId=${currentUser._id}&limit=100`),
    apiFetch(`/api/visits?myVisits=true&limit=100`),
  ]);

  const itemsList = dataItems?.items || dataItems?.data?.items || [];
  const createdVisitsList =
    dataVisitsCreated?.visits || dataVisitsCreated?.data?.visits || [];
  const adoptedVisitsList =
    dataVisitsAdopted?.visits || dataVisitsAdopted?.data?.visits || [];

  const myCreatedItems = itemsList.filter(
    (i) => (i.creatorId?._id || i.creatorId) === currentUser._id,
  );

  const myPurchasedItems = itemsList.filter((i) => {
    const isNotMine = (i.creatorId?._id || i.creatorId) !== currentUser._id;
    const sales = i.salesLogs || i.logVendite || [];
    const purchased = sales.some(
      (log) =>
        (log.buyerId?._id ||
          log.buyerId ||
          log.acquirenteId?._id ||
          log.acquirenteId) === currentUser._id,
    );
    return isNotMine && purchased;
  });

  const myAdoptedVisits = adoptedVisitsList.filter((v) => {
    const isNotMine = (v.creatorId?._id || v.creatorId) !== currentUser._id;
    const adoptions = v.adoptionLogs || v.logAdozioni || [];
    const adopted = adoptions.some(
      (log) =>
        (log.adopterId?._id ||
          log.adopterId ||
          log.adottanteId?._id ||
          log.adottanteId) === currentUser._id,
    );
    return isNotMine && adopted;
  });

  const role = currentUser.role || currentUser.ruolo;

  if (["author", "autore", "admin"].includes(role)) {
    if (
      !myCreatedItems.length &&
      !myPurchasedItems.length &&
      !createdVisitsList.length &&
      !myAdoptedVisits.length
    ) {
      container.innerHTML = `
        <div class="aa-empty">
          <div class="aa-empty-icon">✏️</div>
          <h5>Nessun contenuto</h5>
          <p>Inizia a creare contenuti o adotta guide e item dal catalogo.</p>
        </div>`;
      return;
    }

    let html = "";

    if (myCreatedItems.length > 0) {
      html += `
        <div class="aa-card mb-4">
          <div class="aa-card-header"><i class="bi bi-collection"></i> I miei Item Creati (${myCreatedItems.length})</div>
          <div class="aa-card-body p-0" style="overflow-x:auto;">
            <table class="aa-table">
              <thead><tr><th>Titolo</th><th>Museo</th><th>Linguaggio</th><th>Stato</th><th>Azioni</th></tr></thead>
              <tbody>
                ${myCreatedItems
                  .map((item) => {
                    const title = item.title || item.titolo;
                    const artworkId = item.artworkId || item.operaId;
                    const museum = item.museum || item.museo;
                    const lang = item.language || item.linguaggio;
                    const isPub = item.isPublished ?? item.pubblicato;
                    return `
                      <tr>
                        <td><strong>${title}</strong><br><small class="text-slate">${artworkId}</small></td>
                        <td><small>${museum}</small></td>
                        <td>${badgeLinguaggio(lang)}</td>
                        <td><span class="aa-badge ${isPub ? "aa-badge-free" : "aa-badge-len"}">${isPub ? "Pubblicato" : "Bozza"}</span></td>
                        <td><a href="/editor-item?id=${item._id}" class="btn-aa-outline" style="font-size:0.75rem;padding:2px 8px">Modifica</a></td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    if (myPurchasedItems.length > 0) {
      html += `
        <div class="aa-card mb-4">
          <div class="aa-card-header" style="background: var(--aa-gold-pale);"><i class="bi bi-bag-check"></i> Item Adottati / Acquistati (${myPurchasedItems.length})</div>
          <div class="aa-card-body p-0" style="overflow-x:auto;">
            <table class="aa-table">
              <thead><tr><th>Titolo Item</th><th>Museo</th><th>Autore Originale</th><th>Linguaggio</th><th>Azioni</th></tr></thead>
              <tbody>
                ${myPurchasedItems
                  .map((item) => {
                    const title = item.title || item.titolo;
                    const museum = item.museum || item.museo;
                    const author =
                      item.tourAuthor || item.autore_visita || "Community";
                    const lang = item.language || item.linguaggio;
                    return `
                      <tr>
                        <td><strong>${title}</strong></td>
                        <td><small>${museum}</small></td>
                        <td><span class="text-taupe">${author}</span></td>
                        <td>${badgeLinguaggio(lang)}</td>
                        <td>
                          <button class="btn-aa-primary" style="font-size:0.75rem;padding:2px 8px" onclick="openItemModal('${item._id}')">Visualizza</button>
                        </td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    if (createdVisitsList.length > 0) {
      html += `
        <div class="aa-card mb-4">
          <div class="aa-card-header"><i class="bi bi-map"></i>Visite Create (${createdVisitsList.length})</div>
          <div class="aa-card-body p-0" style="overflow-x:auto;">
            <table class="aa-table">
              <thead><tr><th>Titolo Visita</th><th>Museo</th><th>Tappe</th><th>Azioni</th></tr></thead>
              <tbody>
                ${createdVisitsList
                  .map((v) => {
                    const stopsCount = (v.stops || v.tappe || []).length;
                    const title = v.title || v.titolo || "Senza titolo";
                    const museum = v.museum || v.museo;
                    return `
                      <tr>
                        <td><strong>${title}</strong></td>
                        <td><small>${museum}</small></td>
                        <td><span class="aa-badge aa-badge-len">${stopsCount}${stopsCount === 1 ? "tappa" : "tappe"}</span></td>
                        <td><a href="/editor-visita?id=${v._id}" class="btn-aa-outline" style="font-size:0.75rem;padding:2px 8px">Modifica</a></td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    if (myAdoptedVisits.length > 0) {
      html += `
        <div class="aa-card mb-4">
          <div class="aa-card-header"><i class="bi bi-bookmark-star"></i>Visite Acquistate (${myAdoptedVisits.length})</div>
          <div class="aa-card-body p-0" style="overflow-x:auto;">
            <table class="aa-table">
              <thead>
                <tr>
                  <th>Percorso Museale</th>
                  <th>Istituzione</th>
                  <th>Tappe</th>
                  <th class="d-none d-md-table-cell">Opzioni</th>
                </tr>
              </thead>
              <tbody>
                ${myAdoptedVisits
                  .map((v) => {
                    const stopsCount = (v.stops || v.tappe || []).length;
                    const title = v.title || v.titolo || "Senza titolo";
                    const museum = v.museum || v.museo;
                    return `
                      <tr class="aa-row-clickable-mobile" onclick="if(window.innerWidth < 768) openVisitModal('${v._id}')">
                        <td><strong>${title}</strong></td>
                        <td><small>${museum}</small></td>
                        <td>
                          <span class="aa-badge aa-badge-len d-none d-md-inline-flex">${stopsCount}${stopsCount === 1 ? "stop" : "stops"}</span>
                          <span class="aa-badge aa-badge-len d-inline-flex d-md-none fw-bold" style="padding: 2px 8px">${stopsCount}</span>
                        </td>
                        <td class="d-none d-md-table-cell">
                          <button class="btn-aa-primary" style="font-size:0.75rem; padding:3px 10px; margin-right:5px;" onclick="openVisitModal('${v._id}')">
                            Visualizza
                          </button>
                          <a href="/editor-visita?id=${v._id}" class="btn-aa-gold" style="font-size:0.75rem; padding:4px 10px; text-decoration:none;">
                            Modifica
                          </a>
                        </td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  } else {
    if (
      !myAdoptedVisits.length &&
      !myPurchasedItems.length &&
      !createdVisitsList.length
    ) {
      container.innerHTML = `
        <div class="aa-empty">
          <div class="aa-empty-icon">👤</div>
          <h5>La tua area personale è vuota</h5>
          <p>Esplora il catalogo per adottare guide o crea un tuo percorso personalizzato.</p>
        </div>`;
      return;
    }

    let html = "";

    if (createdVisitsList.length > 0) {
      html += `
        <div class="aa-card mb-4">
          <div class="aa-card-header" style="background: var(--aa-primary-pale);"><i class="bi bi-map"></i>Visite Create (${createdVisitsList.length})</div>
          <div class="aa-card-body p-0" style="overflow-x:auto;">
            <table class="aa-table">
              <thead><tr><th>Titolo Visita</th><th>Museo</th><th>Tappe</th><th>Azioni</th></tr></thead>
              <tbody>
                ${createdVisitsList
                  .map((v) => {
                    const stopsCount = (v.stops || v.tappe || []).length;
                    const title = v.title || v.titolo || "Senza titolo";
                    const museum = v.museum || v.museo;
                    return `
                      <tr>
                        <td><strong>${title}</strong></td>
                        <td><small>${museum}</small></td>
                        <td><span class="aa-badge aa-badge-len">${stopsCount}${stopsCount === 1 ? "tappa" : "tappe"}</span></td>
                        <td>
                          <a href="/editor-visita?id=${v._id}" class="btn-aa-outline" style="font-size:0.75rem;padding:2px 8px">Modifica</a>
                        </td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    if (myAdoptedVisits.length > 0) {
      html += `
        <div class="aa-card mb-4">
          <div class="aa-card-header"><i class="bi bi-bookmark-star"></i> Visite Acquistate (${myAdoptedVisits.length})</div>
          <div class="aa-card-body p-0" style="overflow-x:auto;">
            <table class="aa-table">
              <thead>
                <tr>
                  <th>Percorso Museale</th>
                  <th>Istituzione</th>
                  <th>Tappe</th>
                  <th class="d-none d-md-table-cell">Opzioni</th>
                </tr>
              </thead>
              <tbody>
                ${myAdoptedVisits
                  .map((v) => {
                    const stopsCount = (v.stops || v.tappe || []).length;
                    const title = v.title || v.titolo || "Senza titolo";
                    const museum = v.museum || v.museo;
                    return `
                      <tr class="aa-row-clickable-mobile" onclick="if(window.innerWidth < 768) openVisitModal('${v._id}')">
                        <td><strong>${title}</strong></td>
                        <td><small>${museum}</small></td>
                        <td>
                          <span class="aa-badge aa-badge-len d-none d-md-inline-flex">${stopsCount}${stopsCount === 1 ? "stop" : "stops"}</span>
                          <span class="aa-badge aa-badge-len d-inline-flex d-md-none fw-bold" style="padding: 2px 8px">${stopsCount}</span>
                        </td>
                        <td class="d-none d-md-table-cell">
                          <button class="btn-aa-primary" style="font-size:0.75rem; padding:3px 10px;" onclick="openVisitModal('${v._id}')">
                            Visualizza
                          </button>
                        </td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    if (myPurchasedItems.length > 0) {
      html += `
        <div class="aa-card">
          <div class="aa-card-header"><i class="bi bi-file-earmark-music"></i> Item Acquistati (${myPurchasedItems.length})</div>
          <div class="aa-card-body p-0" style="overflow-x:auto;">
            <table class="aa-table">
              <thead>
                <tr>
                  <th>Opera</th>
                  <th>Museo</th>
                  <th>Linguaggio</th>
                  <th class="d-none d-md-table-cell">Dettagli</th>
                </tr>
              </thead>
              <tbody>
                ${myPurchasedItems
                  .map((item) => {
                    const title = item.title || item.titolo;
                    const museum = item.museum || item.museo;
                    const lang = item.language || item.linguaggio;
                    return `
                      <tr class="aa-row-clickable-mobile" onclick="if(window.innerWidth < 768) openItemModal('${item._id}')">
                        <td><strong>${title}</strong></td>
                        <td><small>${museum}</small></td>
                        <td>${badgeLinguaggio(lang)}</td>
                        <td class="d-none d-md-table-cell">
                          <button class="btn-aa-primary" style="font-size:0.75rem; padding:3px 10px" onclick="openItemModal('${item._id}')">
                            Visualizza
                          </button>
                        </td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }
}

async function openSalesLogModal() {
  document.getElementById("logModal").classList.remove("d-none");
  const body = document.getElementById("logBody");
  body.innerHTML =
    '<div class="text-center py-4"><div class="aa-spinner"></div></div>';

  const currentUser =
    typeof getUtenteCorrente === "function" ? getUtenteCorrente() : null;
  if (!currentUser) {
    body.innerHTML =
      '<div class="aa-empty"><p>Effettua il login per consultare i log.</p></div>';
    return;
  }

  const [dataItems, dataVisits, dataUsers] = await Promise.all([
    apiFetch("/api/items?published=all&limit=500"),
    apiFetch(`/api/visits?isPublic=all&creatorId=${currentUser._id}&limit=500`),
    apiFetch("/api/users"),
  ]);

  const usersMap = {};
  const usersList =
    dataUsers?.users || (Array.isArray(dataUsers) ? dataUsers : []);
  usersList.forEach((user) => {
    if (user._id) usersMap[String(user._id)] = user.username;
  });

  let rows = "";
  let totalEarned = 0;

  const itemsList = dataItems?.items || dataItems?.data?.items || [];
  itemsList.forEach((item) => {
    const creatorId = item.creatorId?._id || item.creatorId;
    const sales = item.salesLogs || item.logVendite || [];

    if (creatorId === currentUser._id && Array.isArray(sales)) {
      sales.forEach((log) => {
        const buyerObj = log.buyerId || log.acquirenteId;
        const buyerIdStr = String(buyerObj?._id || buyerObj || "");

        if (buyerIdStr && buyerIdStr !== String(currentUser._id)) {
          const price = Number(log.price ?? log.prezzo ?? 0);
          totalEarned += price;

          const buyerName =
            buyerObj?.username || usersMap[buyerIdStr] || "Utente Anonimo";
          const title = item.title || item.titolo;
          const artworkId = item.artworkId || item.operaId || "–";
          const purchaseDate = log.purchaseDate || log.dataAcquisto;

          rows += `
            <tr>
              <td><span class="aa-badge aa-badge-len"><i class="bi bi-file-earmark-music"></i> Item</span></td>
              <td><strong>${title}</strong><br><small class="text-slate">${artworkId}</small></td>
              <td><span class="text-taupe fw-medium">${buyerName}</span></td>
              <td><span class="aa-badge ${price > 0 ? "aa-badge-paid" : "aa-badge-free"}">${price > 0 ? "Vendita" : "Adozione"}</span></td>
              <td class="fw-bold text-charcoal">${price > 0 ? "€ " + price.toFixed(2) : "Gratis"}</td>
              <td><small class="text-slate">${purchaseDate ? new Date(purchaseDate).toLocaleDateString("it-IT") : "–"}</small></td>
            </tr>
          `;
        }
      });
    }
  });

  const visitsList = dataVisits?.visits || dataVisits?.data?.visits || [];
  visitsList.forEach((visit) => {
    const adoptions = visit.adoptionLogs || visit.logAdozioni || [];
    if (Array.isArray(adoptions)) {
      adoptions.forEach((log) => {
        const adopterObj = log.adopterId || log.adottanteId;
        const adopterIdStr = String(adopterObj?._id || adopterObj || "");

        if (adopterIdStr && adopterIdStr !== String(currentUser._id)) {
          const price = Number(visit.price ?? visit.prezzo ?? 0);
          totalEarned += price;

          const buyerName =
            adopterObj?.username || usersMap[adopterIdStr] || "Utente Anonimo";
          const title = visit.title || visit.titolo || "Visita senza nome";
          const museum = visit.museum || visit.museo;
          const adoptionDate = log.adoptedAt || log.dataAdozione;

          rows += `
            <tr>
              <td><span class="aa-badge aa-badge-paid" style="background:#edf2f7; color:#2b6cb0;"><i class="bi bi-map"></i> Visita</span></td>
              <td><strong>${title}</strong><br><small class="text-slate">${museum}</small></td>
              <td><span class="text-taupe fw-medium">${buyerName}</span></td>
              <td><span class="aa-badge ${price > 0 ? "aa-badge-paid" : "aa-badge-free"}">${price > 0 ? "Vendita" : "Adozione"}</span></td>
              <td class="fw-bold text-charcoal">${price > 0 ? "€ " + price.toFixed(2) : "Gratis"}</td>
              <td><small class="text-slate">${adoptionDate ? new Date(adoptionDate).toLocaleDateString("it-IT") : "–"}</small></td>
            </tr>
          `;
        }
      });
    }
  });

  if (!rows) {
    body.innerHTML =
      '<div class="aa-empty"><div class="aa-empty-icon">📊</div><h5>Nessun movimento</h5><p>I tuoi contenuti non sono ancora stati acquistati o adottati da altri utenti.</p></div>';
    return;
  }

  body.innerHTML = `
    <div class="p-3 mb-3 rounded bg-cream border border-soft d-flex justify-content-between align-items-center">
       <div>
         <span class="aa-label m-0" style="font-size:0.65rem;">Account Monitorato</span>
         <div class="fw-bold text-charcoal" style="font-size:1.1rem;">${currentUser.username}</div>
       </div>
       <div class="text-end">
         <span class="aa-label m-0" style="font-size:0.65rem;">Totale Incassato</span>
         <div class="fw-bold text-success" style="font-size:1.25rem;">€ ${totalEarned.toFixed(2)}</div>
       </div>
    </div>

    <div style="overflow-x:auto">
      <table class="aa-table">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Contenuto Canale</th>
            <th>Acquirente</th>
            <th>Modalità</th>
            <th>Corrispettivo</th>
            <th>Data Evento</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function resetFilters() {
  state.filters = {
    museum: "",
    language: "",
    category: "",
    price: "",
    search: "",
  };
  state.itemsPage = 1;
  const searchInput = document.getElementById("campoCerca");
  if (searchInput) searchInput.value = "";

  document.querySelectorAll(".aa-filter-btn").forEach((btn) => {
    const group = btn.parentElement;
    const first = group.querySelector(".aa-filter-btn");
    btn.classList.toggle("active", btn === first);
  });
  loadItems();
}

function toggleFilterArrow() {
  const arrow = document.getElementById("frecciaFiltri");
  if (!arrow) return;

  setTimeout(() => {
    const collapseElement = document.getElementById("collapseFiltri");
    if (collapseElement && collapseElement.classList.contains("show")) {
      arrow.style.transform = "rotate(180deg)";
    } else {
      arrow.style.transform = "rotate(0deg)";
    }
  }, 150);
}

function renderPagination(containerId, currentPage, totalPages, fetchFuncName) {
  const container = document.getElementById(containerId);
  if (!container || totalPages <= 1) {
    if (container) container.innerHTML = "";
    return;
  }

  let html = "";
  if (currentPage > 1) {
    html += `<button class="aa-page-btn" onclick="${fetchFuncName}(${currentPage - 1})">‹</button>`;
  }

  for (let p = 1; p <= totalPages; p++) {
    html += `<button class="aa-page-btn ${p === currentPage ? "active" : ""}" onclick="${fetchFuncName}(${p})">${p}</button>`;
  }

  if (currentPage < totalPages) {
    html += `<button class="aa-page-btn" onclick="${fetchFuncName}(${currentPage + 1})">›</button>`;
  }

  container.innerHTML = html;
}

const resetFiltri = resetFilters;
const ruotaFrecciaFiltri = toggleFilterArrow;
const apriItemModal = openItemModal;
const chiudiItemModal = closeItemModal;
const apriVisitaModal = openVisitModal;
const chiudiVisitaModal = closeVisitModal;
const apriLogModal = openSalesLogModal;
const caricaItems = loadItems;
const caricaVisiteTab = loadVisitsTab;
const caricaMieiContenuti = loadMyContent;
const eseguiAcquistoDnAdozioneItem = handleItemPurchaseOrAdopt;
const eseguiAcquistoDnAdozioneVisita = handleVisitPurchaseOrAdopt;
