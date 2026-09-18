
async function apiFetch(url, options = {}) {
  try {
    const token = getAuthToken();
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      showToast("Sessione scaduta. Verrai reindirizzato al login...", "error");
      localStorage.removeItem("aa_token");
      localStorage.removeItem("aa_user");
      localStorage.removeItem("aa_utente");
      localStorage.removeItem("user_session");

      if (typeof updateNavbarUI === "function") {
        updateNavbarUI();
      }

      setTimeout(() => {
        window.location.href = "/";
      }, 1500);

      return null;
    }

    const json = await response.json();
    const isSuccessful = json.success ?? json.successo;

    if (!response.ok || !isSuccessful) {
      showToast(json.message || json.messaggio || "Errore API", "error");
      return null;
    }
    return json.data ?? json;
  } catch (err) {
    console.error("Fetch error:", err);
    showToast("Errore di connessione al server", "error");
    return null;
  }
}

function openLogin() {
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

function closeLogin() {
  document.getElementById("loginModal")?.classList.add("d-none");
}

async function performLogin() {
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
    const user = data.user || data;
    const token = data.token;
    localStorage.setItem("aa_user", JSON.stringify(user));
    localStorage.setItem("aa_utente", JSON.stringify(user));
    localStorage.setItem("aa_token", token);
    localStorage.setItem(
      "user_session",
      JSON.stringify({ user, token, loginTimestamp: Date.now() }),
    );

    closeLogin();
    updateUserUI();
    showToast(`Benvenuto, ${username}!`, "success");

    setTimeout(() => {
      window.location.reload();
    }, 500);
  }
}

function toggleAuthModal(mode) {
  const loginSec = document.getElementById("authLoginSection");
  const registerSec = document.getElementById("authRegisterSection");

  if (mode === "register") {
    loginSec?.classList.add("d-none");
    registerSec?.classList.remove("d-none");
  } else {
    registerSec?.classList.add("d-none");
    loginSec?.classList.remove("d-none");
  }
}

window.toggleAuthModal = toggleAuthModal;

async function performRegistration() {
  const username = document.getElementById("regUsername")?.value.trim();
  const email = document.getElementById("regEmail")?.value.trim();
  const password = document.getElementById("regPassword")?.value;

  const selectedRoleEl = document.querySelector('input[name="regRuolo"]:checked');
  const role = selectedRoleEl ? selectedRoleEl.value : "visitor";

  if (!username || !email || !password) {
    showToast("Tutti i campi contrassegnati da asterisco sono obbligatori", "error");
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
    body: JSON.stringify({ username, email, password, role }),
  });

  if (data) {
    showToast("Registrazione avvenuta con successo! Accesso in corso...", "success");

    const user = data.user || data;
    const token = data.token;
    localStorage.setItem("aa_user", JSON.stringify(user));
    localStorage.setItem("aa_utente", JSON.stringify(user));
    localStorage.setItem("aa_token", token);
    localStorage.setItem(
      "user_session",
      JSON.stringify({ user, token, loginTimestamp: Date.now() }),
    );

    closeLogin();
    updateUserUI();
    window.location.reload();
  }
}

function logout() {
  localStorage.removeItem("aa_user");
  localStorage.removeItem("aa_utente");
  localStorage.removeItem("aa_token");
  localStorage.removeItem("user_session");
  showToast("Logout effettuato", "info");
  setTimeout(() => {
    window.location.reload();
  }, 500);
}

function updateUserUI() {
  const currentUser = getCurrentUser();
  const infoEl = document.getElementById("utenteInfo");
  const btnLogin = document.getElementById("btnLogin");
  const btnLogout = document.getElementById("btnLogout");

  document.getElementById("navLinkNavigator")?.classList.remove("d-none");

  if (currentUser) {
    if (infoEl) infoEl.textContent = `${currentUser.username}`;
    btnLogin?.classList.add("d-none");
    btnLogout?.classList.remove("d-none");

    const role = currentUser.role || currentUser.ruolo;
    if (["author", "autore", "admin"].includes(role)) {
      document.querySelectorAll(".id-autore-nav").forEach((el) => el.classList.remove("d-none"));
    } else {
      document.querySelectorAll(".id-autore-nav").forEach((el) => el.classList.add("d-none"));
    }
  } else {
    if (infoEl) infoEl.textContent = "";
    btnLogin?.classList.remove("d-none");
    btnLogout?.classList.add("d-none");
    document.querySelectorAll(".id-autore-nav").forEach((el) => el.classList.add("d-none"));
  }
}

function showToast(message, type = "info", duration = 3500) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const icons = { success: "✓", error: "✕", info: "ℹ" };
  const toast = document.createElement("div");
  toast.className = `aa-toast ${type}`;
  toast.innerHTML = `<span style="font-size:1.1rem;font-weight:700">${icons[type] || "ℹ"}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "none";
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

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

function isTokenExpired(token) {
  if (!token || token === "undefined" || token === "null") return false;

  try {
    const parts = token.split(".");
    if (parts.length < 3) return true;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(base64));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch (e) {
    return true;
  }
}

function getCurrentUser() {
  try {
    const token = getAuthToken();
    if (token && isTokenExpired(token)) {
      console.warn("Expired token detected. Clearing session.");
      localStorage.removeItem("aa_token");
      localStorage.removeItem("aa_user");
      localStorage.removeItem("aa_utente");
      localStorage.removeItem("user_session");
      return null;
    }
    const raw = localStorage.getItem("aa_user") || localStorage.getItem("aa_utente");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function requireAuthorRole() {
  const user = getCurrentUser();
  const role = user?.role || user?.ruolo;
  if (!user || !["author", "autore", "admin"].includes(role)) {
    showToast("Accesso riservato agli autori", "error");
    return false;
  }
  return true;
}

function badgeLinguaggio(language) {
  if (!language) return "";

  const langMap = {
    child: { label: "Infantile", cls: "aa-badge-lang-elementare" },
    infantile: { label: "Infantile", cls: "aa-badge-lang-elementare" },
    elementare: { label: "Infantile", cls: "aa-badge-lang-elementare" },
    medium: { label: "Medio", cls: "aa-badge-lang-intermedio" },
    medio: { label: "Medio", cls: "aa-badge-lang-intermedio" },
    intermedio: { label: "Medio", cls: "aa-badge-lang-intermedio" },
    advanced: { label: "Avanzato", cls: "aa-badge-lang-avanzato" },
    avanzato: { label: "Avanzato", cls: "aa-badge-lang-avanzato" },
    specialistico: { label: "Avanzato", cls: "aa-badge-lang-avanzato" },
  };

  const entry = langMap[language.toLowerCase()] || {
    label: language.charAt(0).toUpperCase() + language.slice(1),
    cls: "bg-secondary text-white",
  };

  return `<span class="aa-badge ${entry.cls}">${entry.label}</span>`;
}

function badgeLunghezza(length) {
  return `<span class="aa-badge aa-badge-len"><i class="bi bi-clock"></i> ${length}</span>`;
}

function badgePrezzo(price) {
  const numericPrice = Number(price ?? 0);
  if (numericPrice === 0) {
    return `<span class="aa-badge aa-badge-free">Gratuito</span>`;
  }
  return `<span class="aa-price">€ ${numericPrice.toFixed(2)}</span>`;
}

function renderPaginazione(containerId, currentPage, totalPages, changeCallback) {
  const container = document.getElementById(containerId);
  if (!container || totalPages <= 1) {
    if (container) container.innerHTML = "";
    return;
  }

  let html = "";
  html += `<button class="aa-page-btn" ${currentPage <= 1 ? "disabled" : ""} onclick="${changeCallback}(${currentPage - 1})">‹</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += `<button class="aa-page-btn ${i === currentPage ? "active" : ""}" onclick="${changeCallback}(${i})">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<span style="padding:0 4px;color:var(--aa-taupe)">…</span>`;
    }
  }

  html += `<button class="aa-page-btn" ${currentPage >= totalPages ? "disabled" : ""} onclick="${changeCallback}(${currentPage + 1})">›</button>`;
  container.innerHTML = html;
}

function lengthInMinutes(lengthStr = "15s") {
  const durationMap = {
    "3s": 0.05,
    "15s": 0.25,
    "40s": 0.66,
    "1m": 1,
  };
  return durationMap[lengthStr] || 1;
}

function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

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
      } catch {
        continue;
      }
    }

    if (!response || !response.ok) throw new Error("Config not found");

    configMuseo = await response.json();
    applyMuseumTheme();
    return configMuseo;
  } catch (err) {
    console.error("Config load error:", err);
    showToast("Errore nel caricamento della configurazione del museo", "error");
    return null;
  }
}

function getConfigMuseo() {
  return configMuseo;
}

function applyMuseumTheme() {
  if (!configMuseo) return;

  const colors = configMuseo.themeColors || configMuseo.colori;
  if (colors) {
    document.documentElement.style.setProperty(
      "--aa-museum-primary",
      colors.primary || colors.primario || "#b8962e",
    );
    document.documentElement.style.setProperty(
      "--aa-museum-secondary",
      colors.secondary || colors.secondario || "#2c2c2c",
    );
  }

  const museumName = configMuseo.museumName || configMuseo.museo || "Museo";
  document.title = `ArtAround – ${museumName}`;
}

function updateNavbarUI() {
  const infoEl = document.getElementById("utenteInfo");
  if (infoEl) {
    const u = getCurrentUser();
    infoEl.textContent = u ? `${u.username} (${u.role || u.ruolo})` : "";
  }
}

const apriLogin = openLogin;
const chiudiLogin = closeLogin;
const eseguiLogin = performLogin;
const eseguiRegistrazione = performRegistration;
const getUtenteCorrente = getCurrentUser;
const richiedeAutore = requireAuthorRole;
const aggiornaUtenteUI = updateUserUI;
const aggiornaUiNavbar = updateNavbarUI;
const lunghezzaInMinuti = lengthInMinutes;
const applicaTemaMuseo = applyMuseumTheme;

updateUserUI();
updateNavbarUI();