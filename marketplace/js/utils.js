/* ═══════════════════════════════════════════════════
   utils.js – Funzioni condivise ArtAround
   ═══════════════════════════════════════════════════ */

// ─── API FETCH ──────────────────────────────────────
async function apiFetch(url, opzioni = {}) {
  try {
    const token = getAuthToken();
    const headers = { ...(opzioni.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;

    const risposta = await fetch(url, { ...opzioni, headers });

    if (risposta.status === 401) {
      showToast("Sessione scaduta. Verrai reindirizzato al login...", "error");
      localStorage.removeItem("aa_token");
      localStorage.removeItem("aa_utente");
      localStorage.removeItem("user_session");

      if (typeof aggiornaUiNavbar === "function") {
        aggiornaUiNavbar();
      }

      setTimeout(() => {
        window.location.href = "/";
      }, 1500);

      return null;
    }

    const json = await risposta.json();
    if (!risposta.ok || !json.successo) {
      showToast(json.messaggio || "Errore API", "error");
      return null;
    }
    return json.data;
  } catch (err) {
    console.error("Errore fetch:", err);
    showToast("Errore di connessione al server", "error");
    return null;
  }
}

// LOGIN
function apriLogin() {
  const modal = document.getElementById("loginModal");
  if (!modal) return;

  modal.classList.remove("d-none");

  const loginSec = modal.querySelector("#authLoginSection");
  const registerSec = modal.querySelector("#authRegisterSection");

  if (loginSec && registerSec) {
    loginSec.classList.remove("d-none");
    registerSec.classList.add("d-none");
  }
}

function chiudiLogin() {
  document.getElementById("loginModal")?.classList.add("d-none");
}

async function eseguiLogin() {
  const usernameInput = document.getElementById("loginUsername");
  const passwordInput = document.getElementById("loginPassword");
  if (!usernameInput || !passwordInput) return;

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  const data = await apiFetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (data) {
    localStorage.setItem("aa_utente", JSON.stringify(data.user || data));
    localStorage.setItem("aa_token", data.token);
    chiudiLogin();
    aggiornaUtenteUI();
    showToast(`Benvenuto, ${username}!`, "success");

    setTimeout(() => {
      window.location.reload();
    }, 500);
  }
}

function toggleAuthModal(modalita) {
  const loginSec = document.getElementById("authLoginSection");
  const registerSec = document.getElementById("authRegisterSection");

  if (modalita === "register") {
    loginSec?.classList.add("d-none");
    registerSec?.classList.remove("d-none");
  } else {
    registerSec?.classList.add("d-none");
    loginSec?.classList.remove("d-none");
  }
}

window.toggleAuthModal = toggleAuthModal;
async function eseguiRegistrazione() {
  const username = document.getElementById("regUsername")?.value.trim();
  const email = document.getElementById("regEmail")?.value.trim();
  const password = document.getElementById("regPassword")?.value;

  const elementoRuoloSelezionato = document.querySelector(
    'input[name="regRuolo"]:checked',
  );
  const ruolo = elementoRuoloSelezionato
    ? elementoRuoloSelezionato.value
    : "visitatore";

  if (!username || !email || !password) {
    showToast(
      "Tutti i campi contrassegnati da asterisco sono obbligatori",
      "error",
    );
    return;
  }
  if (username.length < 3) {
    showToast("L'username deve contenere almeno 3 caratteri", "error");
    return;
  }
  if (password.length < 8) {
    showToast("La password deve contenere almeno 8 caratteri", "error");
    return;
  }

  const data = await apiFetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password, ruolo }),
  });

  if (data) {
    showToast(
      "Registrazione avvenuta con successo! Inizializzazione profilo...",
      "success",
    );

    localStorage.setItem("aa_utente", JSON.stringify(data.user || data));
    localStorage.setItem("aa_token", data.token);

    chiudiLogin();
    aggiornaUtenteUI();

    window.location.reload();
  }
}

function logout() {
  localStorage.removeItem("aa_utente");
  localStorage.removeItem("aa_token");
  showToast("Logout effettuato", "info");
  setTimeout(() => {
    window.location.reload();
  }, 500);
}

function aggiornaUtenteUI() {
  const u = getUtenteCorrente();
  const info = document.getElementById("utenteInfo");
  const btnLogin = document.getElementById("btnLogin");
  const btnLogout = document.getElementById("btnLogout");

  document.getElementById("navLinkNavigator")?.classList.remove("d-none");

  if (u) {
    if (info) info.textContent = `${u.username}`;
    btnLogin?.classList.add("d-none");
    btnLogout?.classList.remove("d-none");

    if (["autore", "admin"].includes(u.ruolo)) {
      document
        .querySelectorAll(".id-autore-nav")
        .forEach((el) => el.classList.remove("d-none"));
    } else {
      document
        .querySelectorAll(".id-autore-nav")
        .forEach((el) => el.classList.add("d-none"));
    }
  } else {
    if (info) info.textContent = "";
    btnLogin?.classList.remove("d-none");
    btnLogout?.classList.add("d-none");

    document
      .querySelectorAll(".id-autore-nav")
      .forEach((el) => el.classList.add("d-none"));
  }
}

// ─── TOAST ──────────────────────────────────────────
function showToast(messaggio, tipo = "info", durata = 3500) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const icone = { success: "✓", error: "✕", info: "ℹ" };
  const toast = document.createElement("div");
  toast.className = `aa-toast ${tipo}`;
  toast.innerHTML = `<span style="font-size:1.1rem;font-weight:700">${icone[tipo] || "ℹ"}</span><span>${messaggio}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "none";
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, durata);
}

// ─── AUTH ────────────────────────────────────────────
function getAuthToken() {
  try {
    const token = localStorage.getItem("aa_token");
    if (!token || token === "undefined" || token === "null") {
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

function isTokenScaduto(token) {
  if (!token || token === "undefined" || token === "null") return false;

  try {
    const parti = token.split(".");
    if (parti.length < 3) return true;

    const base64Url = parti[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(base64));

    const adesso = Math.floor(Date.now() / 1000);
    return payload.exp < adesso;
  } catch (e) {
    return true;
  }
}

function getUtenteCorrente() {
  try {
    const token = getAuthToken();
    if (token && isTokenScaduto(token)) {
      console.warn("Rilevato token scaduto all'avvio. Svuoto la sessione.");
      localStorage.removeItem("aa_token");
      localStorage.removeItem("aa_utente");
      localStorage.removeItem("user_session");
      return null;
    }
    return JSON.parse(localStorage.getItem("aa_utente"));
  } catch {
    return null;
  }
}

function richiedeAutore() {
  const u = getUtenteCorrente();
  if (!u || !["autore", "admin"].includes(u.ruolo)) {
    showToast("Accesso riservato agli autori", "error");
    return false;
  }
  return true;
}

// ─── BADGE ──────────────────────────────────────────
function badgeLinguaggio(linguaggio) {
  if (!linguaggio) return "";

  let bgClass = "";
  const tagLabel = linguaggio.charAt(0).toUpperCase() + linguaggio.slice(1);

  switch (linguaggio.toLowerCase()) {
    case "infantile":
    case "elementare":
      bgClass = "aa-badge-lang-elementare";
      break;
    case "medio":
    case "intermedio":
      bgClass = "aa-badge-lang-intermedio";
      break;
    case "avanzato":
    case "specialistico":
      bgClass = "aa-badge-lang-avanzato";
      break;
    default:
      bgClass = "bg-secondary text-white";
  }

  return `<span class="aa-badge ${bgClass}">${tagLabel}</span>`;
}

function badgeLunghezza(lunghezza) {
  return `<span class="aa-badge aa-badge-len"><i class="bi bi-clock"></i> ${lunghezza}</span>`;
}

function badgePrezzo(prezzo) {
  if (prezzo === 0 || prezzo === undefined) {
    return `<span class="aa-badge aa-badge-free">Gratuito</span>`;
  }
  return `<span class="aa-price">€ ${Number(prezzo).toFixed(2)}</span>`;
}

function renderPaginazione(
  containerId,
  paginaCorrente,
  totalePagine,
  callbackCambia,
) {
  const container = document.getElementById(containerId);
  if (!container || totalePagine <= 1) {
    if (container) container.innerHTML = "";
    return;
  }

  let html = "";
  html += `<button class="aa-page-btn" ${paginaCorrente <= 1 ? "disabled" : ""} onclick="${callbackCambia}(${paginaCorrente - 1})">‹</button>`;

  for (let i = 1; i <= totalePagine; i++) {
    if (
      i === 1 ||
      i === totalePagine ||
      (i >= paginaCorrente - 1 && i <= paginaCorrente + 1)
    ) {
      html += `<button class="aa-page-btn ${i === paginaCorrente ? "active" : ""}" onclick="${callbackCambia}(${i})">${i}</button>`;
    } else if (i === paginaCorrente - 2 || i === paginaCorrente + 2) {
      html += `<span style="padding:0 4px;color:var(--aa-taupe)">…</span>`;
    }
  }

  html += `<button class="aa-page-btn" ${paginaCorrente >= totalePagine ? "disabled" : ""} onclick="${callbackCambia}(${paginaCorrente + 1})">›</button>`;
  container.innerHTML = html;
}

// ─── DURATA STIMATA ──────────────────────────────────
function lunghezzaInMinuti(lunghezza) {
  const mappa = {
    "3s": 0.05,
    "15s": 0.25,
    "1m": 1,
  };
  return mappa[lunghezza] || 1;
}

// ─── DEBOUNCE ────────────────────────────────────────
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── CONFIGURAZIONE MUSEO ────────────────────────────
let configMuseo = null;

async function caricaConfigMuseo() {
  try {
    const configPaths = [
      "/api/config",
      "/config.json",
      "/marketplace/config.json",
      "../config.json",
    ];

    let response;
    for (const path of configPaths) {
      try {
        response = await fetch(path);
        if (response.ok) break;
      } catch (e) {
        continue;
      }
    }

    if (!response || !response.ok) throw new Error("Config non trovata");

    configMuseo = await response.json();
    applicaTemaMuseo();
    return configMuseo;
  } catch (err) {
    console.error("Errore caricamento config:", err);
    showToast("Errore nel caricamento della configurazione del museo", "error");
    return null;
  }
}

function getConfigMuseo() {
  return configMuseo;
}

function applicaTemaMuseo() {
  if (!configMuseo) return;

  if (configMuseo.colori) {
    document.documentElement.style.setProperty(
      "--aa-museum-primary",
      configMuseo.colori.primario || "#b8962e",
    );
    document.documentElement.style.setProperty(
      "--aa-museum-secondary",
      configMuseo.colori.secondario || "#2c2c2c",
    );
  }

  const museoNome = configMuseo.museo || "Museo";
  document.title = `ArtAround – ${museoNome}`;
}

function aggiornaUiNavbar() {
  const utenteInfo = document.getElementById("utenteInfo");
  if (utenteInfo) {
    const u = getUtenteCorrente();
    utenteInfo.textContent = u ? `${u.username} (${u.ruolo})` : "";
  }
}

aggiornaUtenteUI();
aggiornaUiNavbar();
