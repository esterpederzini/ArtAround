import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/NavigatorHome.css";
import NavigatorSideBar from "./NavigatorSideBar";

const NavigatorLibrary = () => {
  const [myVisits, setMyVisits] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [config, setConfig] = useState(null);
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
  const utenteStabileId =
    utenteObj?.username || utenteObj?._id || utenteObj?.id || "";

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => console.warn("Config non trovato:", err));
    if (isLoggato && utenteStabileId) {
      fetch("/api/visite?soloMie=true&limite=100")
        .then((res) => res.json())
        .then((json) => {
          const tutteLeVisite =
            json.visite ||
            (json.successo && json.data?.visite) ||
            (json.successo && json.data) ||
            [];

          if (Array.isArray(tutteLeVisite)) {
            const mieVisiteFiltrate = tutteLeVisite.filter((visita) => {
              const autoreId =
                visita.autore ||
                visita.userId ||
                visita.creatorId?._id ||
                visita.creatorId;
              const eCreatore =
                utenteObj &&
                (autoreId === utenteObj.username ||
                  autoreId === utenteObj._id ||
                  autoreId === utenteObj.id);
              const eAdottataOAcquistata =
                Array.isArray(visita.logAdozioni) &&
                visita.logAdozioni.some((log) => {
                  const idAdottante =
                    log.adottanteId?._id || log.adottanteId || log.utenteId;
                  return utenteObj && idAdottante === utenteObj._id;
                });

             
              if (
                visita.pubblica === false &&
                !eCreatore &&
                !eAdottataOAcquistata
              ) {
                return false;
              }

              return eAdottataOAcquistata || eCreatore;
            });

            setMyVisits(mieVisiteFiltrate);
          }
        })
        .catch((err) => {
          console.error("Errore fetch visite in libreria:", err);
        });
    }
  }, [isLoggato, utenteStabileId]);
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
    navigate("/");
  };

  return (
    <div className="home-dark-container">
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
          <span className="brand-name">Le mie Visite</span>
        </div>
        <div style={{ width: "80px" }}></div>
      </header>

      <section
        className="visits-section"
        style={{ paddingTop: "2rem", minHeight: "60vh" }}
      >
        {isLoggato ? (
          <>
            <div className="section-header mb-4">
              <p className="text-white text-start px-1">
                Qui trovi tutte le guide e i percorsi che hai acquistato o
                adottato sul Marketplace per questo museo.
              </p>
            </div>

            <div className="horizontal-scroll">
              {myVisits.length > 0 ? (
                myVisits.map((visita) => {
                  const visitId = visita._id;
                  const numStops = Number(
                    visita.stops || visita.tappe?.length || 0,
                  );

                  return (
                    <div
                      key={visitId}
                      className="visit-card"
                      onClick={() => navigate(`/visit/${visitId}`)}
                    >
                      <div className="card-img-wrapper">
                        <img
                          src={
                            visita.immagine ||
                            visita.image ||
                            config?.defaultCardImage ||
                            "/img/default_item_image.jpg"
                          }
                          alt={visita.title}
                        />
                        <span className="card-badge">PROPRIETÀ</span>
                      </div>
                      <h3>{visita.title || visita.titolo}</h3>
                      <p>
                        {visita.duration} • {numStops}{" "}
                        {numStops === 1 ? "stop" : "stops"}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="text-center w-100 py-5">
                  <i
                    className="bi bi-folder-x"
                    style={{ fontSize: "3rem", color: "var(--text-muted)" }}
                  ></i>
                  <p className="empty-msg mt-2">
                    Non hai ancora adottato nessuna visita privata.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div
            className="d-flex flex-column align-items-center justify-content-center text-center py-5 px-3"
            style={{ marginTop: "10vh" }}
          >
            <i
              className="bi bi-shield-lock"
              style={{
                fontSize: "4rem",
                color: "var(--aa-gold-light, #d4af5a)",
                marginBottom: "1rem",
              }}
            ></i>
            <h3 style={{ fontWeight: "700" }}>Area Riservata</h3>
            <p
              className="text-white mx-auto"
              style={{ maxWidth: "320px", fontSize: "0.95rem" }}
            >
              Per vedere e riprodurre i tuoi percorsi personalizzati devi prima
              effettuare l'accesso con il tuo account.
            </p>
            <button
              className="btn mt-3"
              style={{
                backgroundColor: "var(--aa-gold-light, #d4af5a)",
                color: "#0a0e14",
                fontWeight: "700",
                borderRadius: "12px",
                padding: "10px 24px",
              }}
              onClick={() => navigate("/")}
            >
              Torna in Home e Accedi
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default NavigatorLibrary;
