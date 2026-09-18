import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/NavigatorHome.css";
import NavigatorLogin from "./NavigatorLogin";
import NavigatorSideBar from "./NavigatorSideBar";

const NavigatorHome = () => {
  const [visits, setVisits] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [config, setConfig] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [heroImageReady, setHeroImageReady] = useState(false);

  const navigate = useNavigate();

  const token =
    localStorage.getItem("aa_token") ||
    JSON.parse(localStorage.getItem("user_session") || "{}")?.token;
  const utenteRaw = localStorage.getItem("aa_utente");
  const utenteObj = utenteRaw
    ? JSON.parse(utenteRaw)
    : JSON.parse(localStorage.getItem("user_session") || "{}")?.user;

  const isLoggato = !!token;
  const userName = isLoggato ? utenteObj?.username || "Utente" : null;

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => {
        console.warn("Config non trovato, uso default:", err);
        setConfig({ museumName: "ArtAround", appName: "Discover the Art" });
      });

    fetch("/api/visits")
      .then((res) => res.json())
      .then((json) => {
        const isSuccessful = json.success ?? json.successo;
        if (isSuccessful && json.data) {
          const list = json.data.visits || json.data.visite || json.data;
          setVisits(Array.isArray(list) ? list : []);
        }
      })
      .catch((err) => console.error("Errore fetch visite:", err));
  }, []);

  const filteredVisits = visits.filter((visita) => {
    // Esclude le visite private
    const isPublic = visita.isPublic ?? visita.pubblica ?? true;
    if (!isPublic) return false;

    // Esclude le visite a pagamento
    const price = Number(visita.price ?? visita.prezzo ?? 0);
    if (price > 0) return false;

    const search = searchTerm.toLowerCase();
    const idVisita = String(visita._id || "").toLowerCase();
    const titoloVisita = String(
      visita.title || visita.titolo || "",
    ).toLowerCase();
    return idVisita.includes(search) || titoloVisita.includes(search);
  });

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  const handleNav = (path) => {
    closeSidebar();
    if (path === "/marketplace") {
      window.location.replace(window.location.origin + "/");
    } else {
      navigate(path);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user_session");
    localStorage.removeItem("aa_token");
    localStorage.removeItem("aa_utente");
    window.location.reload();
  };

  const stringUrlImmagine =
    config?.heroImage ||
    config?.defaultCardImage ||
    "/img/default_item_image.jpg";

  useEffect(() => {
    if (!config) return;
    const url = config.heroImage || config.defaultCardImage;
    if (!url) {
      setHeroImageReady(true);
      return;
    }
    const img = new Image();
    img.onload = () => setHeroImageReady(true);
    img.onerror = () => setHeroImageReady(true);
    img.src = url;
  }, [config]);

  const getGuideBadge = (visita) => {
    if (visita.type) return visita.type;
    const level = visita.baseLevel || visita.linguaggio;
    if (level === "child" || level === "infantile") return "KIDS GUIDE";
    if (level === "advanced" || level === "avanzato") return "EXPERT GUIDE";
    return "CLASSIC GUIDE";
  };

  return (
    <div
      className="home-dark-container"
      style={{ "--hero-bg-image": `url(${stringUrlImmagine})` }}
    >
      <NavigatorSideBar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <header
        className="home-header d-flex align-items-center px-3"
        style={{ position: "relative" }}
      >
        <div style={{ width: "80px" }} className="d-flex align-items-center">
          <i
            className="bi bi-list menu-icon-fixed"
            onClick={toggleSidebar}
            style={{ fontSize: "1.5rem", cursor: "pointer" }}
          ></i>
        </div>

        <div className="flex-grow-1 text-center">
          <span className="brand-name">{"ArtAround"}</span>
        </div>

        <div
          style={{ width: "80px" }}
          className="d-flex align-items-center justify-content-end"
        >
          {!isLoggato && (
            <button
              className="btn btn-sm"
              style={{
                borderRadius: "20px",
                fontSize: "0.82rem",
                backgroundColor: "transparent",
                border: "1px solid var(--aa-gold-light, #d4af5a)",
                color: "var(--aa-gold-light, #d4af5a)",
                fontWeight: "700",
                padding: "4px 12px",
                whiteSpace: "nowrap",
              }}
              onClick={() => setIsLoginOpen(true)}
            >
              Accedi
            </button>
          )}
        </div>
      </header>

      <section
        className="hero-modern"
        style={{
          backgroundImage: heroImageReady
            ? `linear-gradient(to top, var(--bg-dark) 5%, transparent 60%), url(${stringUrlImmagine})`
            : "none",
        }}
      >
        <div className="hero-content">
          <h1 className="hero-title">
            {config?.museumName || config?.museo || "ArtAround"}
          </h1>
          <p className="hero-subtitle">
            {config?.motto ||
              "Curated journeys through the finest collections."}
          </p>
          <div className="search-bar">
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder="Inserisci ID o titolo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="visits-section">
        <div className="section-header">
          <h2>{searchTerm ? "Risultati" : "Esplora visite"}</h2>
        </div>
        <div className="horizontal-scroll">
          {filteredVisits.length > 0 ? (
            filteredVisits.map((visita) => {
              const visitId = visita._id;
              const stopsCount =
                visita.stopsCount ??
                (Array.isArray(visita.stops) ? visita.stops.length : null) ??
                (Array.isArray(visita.tappe) ? visita.tappe.length : 0);

              return (
                <div
                  key={visitId}
                  className="visit-card"
                  onClick={() => navigate(`/visit/${visitId}`)}
                >
                  <div className="card-img-wrapper">
                    <img
                      src={
                        visita.image ||
                        visita.immagine ||
                        config?.defaultCardImage ||
                        "/img/default_item_image.jpg"
                      }
                      alt={visita.title}
                    />
                    <span className="card-badge">{getGuideBadge(visita)}</span>
                  </div>
                  <h3>{visita.title || visita.titolo}</h3>
                  <p>
                    {visita.duration} • {stopsCount} stops
                  </p>
                </div>
              );
            })
          ) : (
            <p className="empty-msg">Nessuna visita trovata.</p>
          )}
        </div>
      </section>
      <NavigatorLogin
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />
    </div>
  );
};

export default NavigatorHome;
