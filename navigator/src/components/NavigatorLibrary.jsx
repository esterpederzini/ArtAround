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

  const rawUser =
    localStorage.getItem("aa_user") || localStorage.getItem("aa_utente");
  const currentUser = rawUser
    ? JSON.parse(rawUser)
    : JSON.parse(localStorage.getItem("user_session") || "{}")?.user;

  const isLoggedIn = !!token;
  const stableUserId =
    currentUser?.username || currentUser?._id || currentUser?.id || "";

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => console.warn("Config non trovato:", err));

    if (isLoggedIn && stableUserId) {
      fetch("/api/visits?myVisits=true&limit=100")
        .then((res) => res.json())
        .then((json) => {
          const isSuccessful = json.success ?? json.successo;
          const visitsList =
            json.visits ||
            (isSuccessful && json.data?.visits) ||
            (isSuccessful && json.data?.visite) ||
            (isSuccessful && json.data) ||
            [];

          if (Array.isArray(visitsList)) {
            const filteredVisits = visitsList.filter((visit) => {
              const authorId =
                visit.creatorId?._id ||
                visit.creatorId ||
                visit.author ||
                visit.autore ||
                visit.userId;

              const isCreator =
                currentUser &&
                (authorId === currentUser.username ||
                  authorId === currentUser._id ||
                  authorId === currentUser.id);

              const adoptionList = visit.adoptionLogs || visit.logAdozioni;
              const isAdoptedOrPurchased =
                Array.isArray(adoptionList) &&
                adoptionList.some((log) => {
                  const adopterId =
                    log.adopterId?._id ||
                    log.adopterId ||
                    log.adottanteId?._id ||
                    log.adottanteId ||
                    log.userId ||
                    log.utenteId;
                  return currentUser && adopterId === currentUser._id;
                });

              const isPublic = visit.isPublic ?? visit.pubblica ?? true;

              if (!isPublic && !isCreator && !isAdoptedOrPurchased) {
                return false;
              }

              return isAdoptedOrPurchased || isCreator;
            });

            setMyVisits(filteredVisits);
          }
        })
        .catch((err) => {
          console.error("Error fetching library visits:", err);
        });
    }
  }, [isLoggedIn, stableUserId]);

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
        {isLoggedIn ? (
          <>
            <div className="section-header mb-4">
              <p className="text-white text-start px-1">
                Qui trovi tutte le guide e i percorsi che hai acquistato o
                adottato sul Marketplace per questo museo.
              </p>
            </div>

            <div className="horizontal-scroll">
              {myVisits.length > 0 ? (
                myVisits.map((visit) => {
                  const visitId = visit._id;
                  const stopsCount = Number(
                    visit.stopsCount ||
                      visit.stops?.length ||
                      visit.tappe?.length ||
                      0,
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
                            visit.image ||
                            visit.immagine ||
                            config?.defaultCardImage ||
                            "/img/default_item_image.jpg"
                          }
                          alt={visit.title}
                        />
                        <span className="card-badge">PROPRIETÀ</span>
                      </div>
                      <h3>{visit.title || visit.titolo}</h3>
                      <p>
                        {visit.duration} • {stopsCount}{" "}
                        {stopsCount === 1 ? "stop" : "stops"}
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
