import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Modal } from "react-bootstrap";
import "../CSS/NavigatorItemViewer.css";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
  recognition.lang = "it-IT";
  recognition.continuous = false;
  recognition.interimResults = false;
}

export default function NavigatorItemViewer() {
  const { id, operaIndex } = useParams();
  const navigate = useNavigate();
  const safeIndex = parseInt(operaIndex) || 0;

  const [visit, setVisit] = useState(null);
  const [currentItem, setCurrentItem] = useState(null);
  const [museumConfig, setMuseumConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const [languageLevel, setLanguageLevel] = useState("medio");
  const [selectedDuration, setSelectedDuration] = useState("15s");
  const [isListening, setIsListening] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAccessMenu, setShowAccessMenu] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const recognitionRef = useRef(null);
  const [logisticsMsg, setLogisticsMsg] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showLogisticsModal, setShowLogisticsModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);

  const [uiLabels] = useState({
    "3s": "3s",
    "15s": "15s",
    "40s": "40s",
  });
  const artworkTitle =
    currentItem?.titoloOpera || currentItem?.titolo || "Untitled Artwork";

  const artworkArtist =
    currentItem?.artista ||
    currentItem?.autore_visita ||
    currentItem?.autore ||
    "Unknown Artist";

  const displayedDescription =
    currentItem?.descrizione || "No description available.";

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(new Audio());
  const ttsIntervalRef = useRef(null);
  const logisticsAudioRef = useRef(null);

  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedMapFloor, setSelectedMapFloor] = useState("0");

  useEffect(() => {
    if (!id) return;
    const key = `artaround_furthest_${id}`;
    const stored = parseInt(localStorage.getItem(key)) || 0;
    if (safeIndex > stored) {
      localStorage.setItem(key, String(safeIndex));
    }
  }, [safeIndex, id]);

  const handleLogistics = (msg) => {
    if (!msg) return;

    if (logisticsAudioRef.current) {
      logisticsAudioRef.current.pause();
      logisticsAudioRef.current = null;
    }
    window.speechSynthesis.cancel();

    setLogisticsMsg(msg);

    const utterance = new SpeechSynthesisUtterance(msg);
    utterance.lang = "it-IT";
    window.speechSynthesis.speak(utterance);

    setTimeout(() => setLogisticsMsg(""), 5000);
  };

  const languageLevelRef = useRef(languageLevel);
  const selectedDurationRef = useRef(selectedDuration);
  const currentItemRef = useRef(currentItem);
  const museumConfigRef = useRef(museumConfig);
  const safeIndexRef = useRef(safeIndex);
  const visitRef = useRef(visit);

  useEffect(() => {
    languageLevelRef.current = languageLevel;
  }, [languageLevel]);
  useEffect(() => {
    selectedDurationRef.current = selectedDuration;
  }, [selectedDuration]);
  useEffect(() => {
    currentItemRef.current = currentItem;
  }, [currentItem]);
  useEffect(() => {
    museumConfigRef.current = museumConfig;
  }, [museumConfig]);
  useEffect(() => {
    safeIndexRef.current = safeIndex;
  }, [safeIndex]);
  useEffect(() => {
    visitRef.current = visit;
  }, [visit]);

  const updateContentRef = useRef(null);
  const changeItemRef = useRef(null);
  const handleLogisticsRef = useRef(null);

  const handleSimplify = () => {
    const levels = ["infantile", "medio", "avanzato"];
    const idx = levels.indexOf(languageLevelRef.current);
    if (idx > 0)
      updateContentRef.current(levels[idx - 1], selectedDurationRef.current);
  };

  const handleAdvance = () => {
    const levels = ["infantile", "medio", "avanzato"];
    const idx = levels.indexOf(languageLevelRef.current);
    if (idx < levels.length - 1)
      updateContentRef.current(levels[idx + 1], selectedDurationRef.current);
  };

  const handleMoreContent = () => {
    const durations = ["3s", "15s", "40s"];
    const idx = durations.indexOf(selectedDurationRef.current);
    if (idx < durations.length - 1)
      updateContentRef.current(languageLevelRef.current, durations[idx + 1]);
  };

  const handleLessContent = () => {
    const durations = ["3s", "15s", "40s"];
    const idx = durations.indexOf(selectedDurationRef.current);
    if (idx > 0)
      updateContentRef.current(languageLevelRef.current, durations[idx - 1]);
  };

  useEffect(() => {
    if (currentItem?.piano)
      setSelectedMapFloor(
        currentItem.piano !== undefined ? String(currentItem.piano) : "0",
      );
  }, [currentItem]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setIsPlaying(false);

    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) setMuseumConfig(data);
      })
      .catch(() => {});

    fetch(`/api/visite/${id}`)
      .then((res) => res.json())
      .then(async (json) => {
        if (!isMounted) return;

        const dataVisita = json.data || json;

        if (dataVisita && dataVisita.tappe) {
          setVisit(dataVisita);
          const tappaCorrente = dataVisita.tappe[safeIndex];

          if (tappaCorrente) {
            const defaultLang = tappaCorrente.linguaggio_default || "medio";
            const defaultDur = tappaCorrente.lunghezza_default || "15s";

            if (
              tappaCorrente.item_default &&
              typeof tappaCorrente.item_default === "object"
            ) {
              setCurrentItem(tappaCorrente.item_default);
              setLanguageLevel(
                tappaCorrente.item_default.linguaggio || defaultLang,
              );
              setSelectedDuration(
                tappaCorrente.item_default.lunghezza || defaultDur,
              );
              setLoading(false);
              return;
            }
            if (
              tappaCorrente.item_default &&
              typeof tappaCorrente.item_default === "string"
            ) {
              try {
                const resItem = await fetch(
                  `/api/items/${tappaCorrente.item_default}`,
                );
                const itemEstratto = await resItem.json();
                if (itemEstratto && isMounted) {
                  setCurrentItem(itemEstratto);
                  setLanguageLevel(itemEstratto.linguaggio || defaultLang);
                  setSelectedDuration(itemEstratto.lunghezza || defaultDur);
                  setLoading(false);
                  return;
                }
              } catch (e) {
                console.warn(
                  "Errore fetch diretta item_default, tento fallback via operaId:",
                  e,
                );
              }
            }
            const targetOperaId =
              tappaCorrente.operaId?.operaId ||
              tappaCorrente.operaId ||
              tappaCorrente.item_default?.operaId;

            if (targetOperaId) {
              try {
                const resItem = await fetch(
                  `/api/items?operaId=${targetOperaId}&linguaggio=${defaultLang}&lunghezza=${defaultDur}`,
                );
                const jsonItem = await resItem.json();
                const arrayItems = jsonItem.data?.items || jsonItem.items || [];

                if (arrayItems.length > 0 && isMounted) {
                  const itemEstratto = arrayItems[0];
                  setCurrentItem(itemEstratto);
                  setLanguageLevel(itemEstratto.linguaggio || defaultLang);
                  setSelectedDuration(itemEstratto.lunghezza || defaultDur);
                }
              } catch (err) {
                console.error(
                  "Errore nel recupero dei dettagli dell'item via query:",
                  err,
                );
              }
            }
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Errore nel recupero della visita:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, safeIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    audio.pause();
    audio.src = "";
    setCurrentTime(0);
    setDuration(0);
    window.speechSynthesis.cancel();
    clearInterval(ttsIntervalRef.current);

    const item_audio = currentItem?.audio || currentItem?.audioUrl;
    if (item_audio) {
      console.log("[AUDIO LOG] Carico nuova sorgente statica:", item_audio);
      audio.src = item_audio;
      audio.load();
    }

    const upMeta = () => setDuration(audio.duration);
    const upTime = () => setCurrentTime(audio.currentTime);
    const onEnd = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", upMeta);
    audio.addEventListener("timeupdate", upTime);
    audio.addEventListener("ended", onEnd);

    return () => {
      audio.removeEventListener("loadedmetadata", upMeta);
      audio.removeEventListener("timeupdate", upTime);
      audio.removeEventListener("ended", onEnd);
    };
  }, [currentItem]);

  useEffect(() => {
    const audio = audioRef.current;
    const item_audio = currentItem?.audio || currentItem?.audioUrl;

    if (item_audio) {
      if (isPlaying) {
        audio.play().catch((e) => {
          console.warn(
            "[AUDIO WARNING] File statico fallito, avvio fallback TTS nativo:",
            e,
          );
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(
            currentItem.descrizione,
          );
          utterance.lang = "it-IT";

          const parole = currentItem.descrizione.split(/\s+/).length;
          const durataStimata = (parole / 130) * 60;
          setDuration(durataStimata);

          window.speechSynthesis.speak(utterance);
        });
      } else {
        audio.pause();
      }
    } else if (currentItem?.descrizione) {
      if (isPlaying) {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.resume();
        } else {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(
            currentItem.descrizione,
          );
          utterance.lang = "it-IT";

          const parole = currentItem.descrizione.split(/\s+/).length;
          const durataStimata = (parole / 130) * 60;
          setDuration(durataStimata);

          utterance.onend = () => {
            setIsPlaying(false);
            setCurrentTime(0);
            clearInterval(ttsIntervalRef.current);
          };

          window.speechSynthesis.speak(utterance);
        }

        clearInterval(ttsIntervalRef.current);
        ttsIntervalRef.current = setInterval(() => {
          if (window.speechSynthesis.speaking) {
            setCurrentTime((prevTime) => {
              const parole = currentItem.descrizione.split(/\s+/).length;
              const durataStimata = (parole / 130) * 60;
              return Math.min(prevTime + 0.2, durataStimata);
            });
          }
        }, 200);
      } else {
        clearInterval(ttsIntervalRef.current);
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
        }
      }
    }

    return () => {
      clearInterval(ttsIntervalRef.current);
    };
  }, [isPlaying]);

  // ---------- NAVIGAZIONE ----------
  const changeItem = (newIndex) => {
    const v = visitRef.current;
    if (v && newIndex >= 0 && newIndex < v.tappe.length) {
      setIsPlaying(false);
      navigate(`/visit/${id}/${newIndex}`);
    }
  };

  const updateContent = async (newLevel, newDuration) => {
    const operaId = currentItem?.operaId;

    console.log("[DEBUG NAVIGATOR] Richiesta cambio variante in corso:", {
      operaId_rilevato: operaId,
      nuovo_livello_richiesto: newLevel,
      nuova_durata_richiesta: newDuration,
    });

    if (!operaId) {
      console.error("[DEBUG NAVIGATOR] Errore: operaId è undefined o nullo.");
      setLogisticsMsg(
        "Errore: impossibile recuperare l'identificativo dell'opera.",
      );
      setTimeout(() => setLogisticsMsg(""), 4000);
      return;
    }

    setIsPlaying(false);
    window.speechSynthesis.cancel();

    try {
      const res = await fetch(
        `/api/items?operaId=${operaId}&linguaggio=${newLevel}&lunghezza=${newDuration}`,
      );
      const json = await res.json();
      const arrayItems = json.data?.items || json.items || [];

      if (arrayItems.length > 0) {
        const nuovoItemTrovato = arrayItems[0];
        setCurrentItem(nuovoItemTrovato);
        setLanguageLevel(newLevel);
        setSelectedDuration(newDuration);
      } else {
        console.warn("[DEBUG NAVIGATOR] Nessuna variante trovata.");
        setLogisticsMsg(
          "Variante audio non trovata per questo livello/lunghezza.",
        );
        setTimeout(() => setLogisticsMsg(""), 4000);
      }
    } catch (err) {
      console.error("[DEBUG NAVIGATOR] Errore di rete nella fetch:", err);
    }
  };

  useEffect(() => {
    updateContentRef.current = updateContent;
  });
  useEffect(() => {
    changeItemRef.current = changeItem;
  });
  useEffect(() => {
    handleLogisticsRef.current = handleLogistics;
  });

  // ---------- COMANDI VOCALI ----------
  useEffect(() => {
    if (!recognition) return;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const raw = event.results[0][0].transcript.toLowerCase();
      const cmd = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      console.log("Comando vocale:", cmd);

      const cfg = museumConfigRef.current;
      const item = currentItemRef.current;
      const idx = safeIndexRef.current;

      if (cmd.includes("prossimo") || cmd.includes("avanti")) {
        changeItemRef.current(idx + 1);
      }
      if (cmd.includes("precedente") || cmd.includes("indietro")) {
        changeItemRef.current(idx - 1);
      }
      if (
        cmd.includes("mappa") ||
        cmd.includes("dove mi trovo") ||
        cmd.includes("posizione")
      ) {
        setShowMapModal(true);
        if (item?.piano) setSelectedMapFloor(item.piano);
      }
      if (cmd.includes("piu semplice") || cmd.includes("non capisco")) {
        handleSimplify();
      }
      if (cmd.includes("piu difficile")) {
        handleAdvance();
      }
      if (
        cmd.includes("dimmi di piu") ||
        cmd.includes("approfondisci") ||
        cmd.includes("piu lungo")
      ) {
        handleMoreContent();
      }
      if (
        cmd.includes("dimmi di meno") ||
        cmd.includes("piu corto") ||
        cmd.includes("riduci")
      ) {
        handleLessContent();
      }
      if (cmd.includes("ferma") || cmd.includes("pausa")) {
        setIsPlaying(false);
      }
      if (
        cmd.includes("riprendi") ||
        cmd.includes("play") ||
        cmd.includes("continua")
      ) {
        setIsPlaying(true);
      }
      if (cmd.includes("bagno") || cmd.includes("toilette")) {
        handleLogisticsRef.current(
          cfg?.logistica_globale?.toilette || "Informazione non disponibile",
        );
      }
      if (cmd.includes("uscita")) {
        handleLogisticsRef.current(
          cfg?.logistica_globale?.uscita ||
            "Segui le indicazioni per l'uscita principale",
        );
      }
      if (cmd.includes("bar")) {
        handleLogisticsRef.current(
          cfg?.logistica_globale?.bar || "Il bar si trova al piano terra",
        );
      }
      if (cmd.includes("shop") || cmd.includes("negozio")) {
        handleLogisticsRef.current(
          cfg?.logistica_globale?.shop || "Lo shop si trova al piano terra",
        );
      }
      if (cmd.includes("ostacoli") || cmd.includes("accessibilita")) {
        handleLogisticsRef.current(
          cfg?.logistica_globale?.ostacoli ||
            "Nessun ostacolo segnalato sul percorso",
        );
      }
      if (
        cmd.includes("chi e l'autore") ||
        cmd.includes("chi e lautore") ||
        cmd.includes("chi e l'artista") ||
        cmd.includes("chi e lartista")
      ) {
        handleLogisticsRef.current(
          `L'autore è ${item?.artista || item?.autore_visita || "sconosciuto"}`,
        );
      }
      if (cmd.includes("qual e lo stile")) {
        handleLogisticsRef.current(
          `Lo stile è: ${item?.stile || "non specificato"}`,
        );
      }
      if (cmd.includes("cosa sto guardando")) {
        handleLogisticsRef.current(
          `${item?.titolo || "Opera"} — ${item?.categoria || ""}. ${item?.artista ? "Autore: " + item.artista : ""}`,
        );
      }
      if (cmd.includes("periodo") || cmd.includes("quando e stato fatto")) {
        handleLogisticsRef.current(
          `L'opera risale al periodo: ${item?.periodo || "non specificato"}`,
        );
      }
      if (
        cmd.includes("aiuto") ||
        cmd.includes("comandi") ||
        cmd.includes("cosa posso say")
      ) {
        setShowHelpModal(true);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  }, []);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setIsPlaying(false);
      if (logisticsAudioRef.current) {
        logisticsAudioRef.current.pause();
        logisticsAudioRef.current = null;
      }
      window.speechSynthesis.cancel();
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error("Errore attivazione riconoscimento vocale:", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="navigator-viewer-layout d-flex align-items-center justify-content-center">
        <div className="text-white text-center">
          <div className="spinner-border mb-3" role="status" />
          <p>Caricamento visita...</p>
        </div>
      </div>
    );
  }

  const getLogisticsDirections = () => {
    if (!visit || !visit.tappe) return "Nessuna indicazione disponibile.";

    if (safeIndex >= visit.tappe.length - 1) {
      return (
        visit.tappe[safeIndex]?.logistica || "Sei arrivato a destinazione."
      );
    }

    return (
      visit.tappe[safeIndex + 1]?.logistica ||
      "Procedi verso la prossima tappa."
    );
  };

  return (
    <div className="navigator-viewer-layout">
      <div className="top-nav-viewer">
        <button className="top-nav-btn" onClick={() => setShowExitModal(true)}>
          <i className="bi bi-chevron-left"></i>
        </button>
        <div className="top-nav-center">
          <span className="top-nav-title">
            {visit?.titolo || visit?.title || "Visita"}
          </span>
        </div>
      </div>

      <div className="scrollable-viewer-content">
        <section className="hero-image-container">
          <img
            src={
              currentItem?.immagine ||
              currentItem?.url ||
              "/img/default_item_image.jpg"
            }
            className="hero-image"
            alt=""
          />
          <div className="hero-overlay-gradient"></div>
          <div className="hero-caption">
            <p className="category-label">
              {currentItem?.categoria || "Opera"}
            </p>
            <h1 className="hero-title">{artworkTitle}</h1>
            <div className="d-flex flex-wrap gap-2 mt-2">
              <button
                className="btn-hero-minimal"
                onClick={() => setShowDetailsModal(true)}
              >
                <i
                  className="bi bi-info-circle me-2"
                  style={{ color: "#e18f37" }}
                ></i>
                Dettagli
              </button>

              <button
                className="btn-hero-minimal"
                onClick={() => setShowLogisticsModal(true)}
              >
                <i
                  className="bi bi-compass me-2"
                  style={{ color: "#e18f37" }}
                ></i>
                Indicazioni prossima tappa
              </button>
            </div>
          </div>
        </section>

        <Container fluid className="p-0">
          <Row className="justify-content-center g-0">
            <Col xs={12} md={8} lg={6} className="p-0">
              <Card className="card-viewer shadow-none">
                <div className="d-none d-md-block mb-4">
                  <h1
                    style={{
                      color: "white",
                      fontSize: "2rem",
                      fontWeight: "800",
                      margin: 0,
                    }}
                  >
                    {artworkTitle}
                  </h1>
                  <hr
                    style={{
                      borderColor: "rgba(255,255,255,0.1)",
                      marginTop: "1rem",
                    }}
                  />
                </div>
                <Card.Body className="pt-0">
                  <div className="config-box mx-3 mb-3">
                    <div
                      className="d-flex align-items-center justify-content-between"
                      onClick={() => setIsConfigOpen(!isConfigOpen)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="d-flex align-items-center gap-2 opacity-75">
                        <i className="bi bi-sliders text-white"></i>
                        <span className="text-uppercase small fw-bold ls-1 text-white">
                          Configurazione Guida
                        </span>
                      </div>
                      <i
                        className={`bi bi-chevron-${isConfigOpen ? "up" : "down"} transition-icon`}
                      ></i>
                    </div>
                    <div
                      className={`config-content ${isConfigOpen ? "is-open" : ""}`}
                    >
                      <div className="pt-4">
                        <p className="small mb-3 text-uppercase ls-1 text-white">
                          Livello di analisi
                        </p>

                        <Row className="g-2 mb-4 text-nowrap">
                          {["infantile", "medio", "avanzato"].map((l) => (
                            <Col xs={4} key={l}>
                              <button
                                className={`btn-difficolta-custom w-100 ${languageLevel === l ? "active" : ""}`}
                                style={{
                                  fontSize: "0.78rem",
                                  padding: "8px 2px",
                                  textTransform: "capitalize",
                                }}
                                onClick={() =>
                                  updateContent(l, selectedDuration)
                                }
                              >
                                {l}
                              </button>
                            </Col>
                          ))}
                        </Row>

                        <p className="small mb-3 text-uppercase ls-1 text-white">
                          Durata Audio
                        </p>
                        <div className="d-flex gap-2">
                          {["3s", "15s", "40s"].map((d) => (
                            <button
                              key={d}
                              className={`btn-duration-pill ${selectedDuration === d ? "active" : ""}`}
                              onClick={() => updateContent(languageLevel, d)}
                            >
                              {uiLabels[d]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="description-quote mx-3 mt-4">
                    <p className="m-0">"{displayedDescription}"</p>
                  </div>
                </Card.Body>
              </Card>

              {/* PLAYER */}
              <div className="integrated-player-static mx-3">
                <div className="progress-section">
                  <div className="progress-bar-container">
                    <input
                      type="range"
                      className="progress-range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      step="0.1"
                      onChange={(e) => {
                        audioRef.current.currentTime = parseFloat(
                          e.target.value,
                        );
                      }}
                    />
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                  <div className="timer-row">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
                <div className="player-controls-row">
                  <button
                    className="btn-item-skip"
                    onClick={() => changeItem(safeIndex - 1)}
                    disabled={safeIndex === 0}
                  >
                    <i className="bi bi-skip-start"></i>
                  </button>
                  <div
                    className="play-sphere-main"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    <i
                      className={`bi ${isPlaying ? "bi-pause-fill" : "bi-play-fill"}`}
                    ></i>
                  </div>
                  <button
                    className="btn-item-skip"
                    onClick={() => {
                      if (safeIndex === (visit?.tappe?.length ?? 0) - 1) {
                        setShowEndModal(true);
                      } else {
                        changeItem(safeIndex + 1);
                      }
                    }}
                  >
                    <i className="bi bi-skip-end"></i>
                  </button>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/*LOGISTICA */}
      {logisticsMsg && (
        <div className="logistics-toast">
          <i className="bi bi-info-circle-fill me-2"></i>
          {logisticsMsg}
        </div>
      )}

      {/* BOTTOM NAV */}
      <div className="bottom-nav-viewer">
        <button
          className="nav-item"
          onClick={() => {
            const configArtwork =
              museumConfig?.posizione_opere?.find(
                (o) => String(o.operaId) === String(currentItem?.operaId),
              ) || {};
            const realFloor =
              currentItem?.piano !== undefined
                ? String(currentItem.piano)
                : configArtwork.piano || "0";

            setSelectedMapFloor(realFloor);
            setShowMapModal(true);
          }}
        >
          <i className="bi bi-map"></i>
        </button>
        <div className="nav-item central">
          <button
            className={`btn-mic-nav ${isListening ? "is-listening" : ""}`}
            onClick={toggleListening}
          >
            <i className={`bi ${isListening ? "bi-mic-fill" : "bi-mic"}`}></i>
          </button>
        </div>
        <button className="nav-item" onClick={() => setShowAccessMenu(true)}>
          <i className="bi bi-plus-circle"></i>
        </button>
      </div>

      {/* SCHEDA TECNICA */}
      <Modal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        centered
        dialogClassName="museum-modal"
      >
        <Modal.Header closeButton className="bg-transparent">
          <Modal.Title className="text-uppercase d-flex align-items-center">
            <i className="bi bi-info-circle-fill me-2"></i> Scheda Tecnica
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-transparent">
          <div className="details-text-container">
            <p>
              <strong>Titolo:</strong> {currentItem?.titolo || "N/A"}
            </p>
            <p>
              <strong>Artista:</strong>{" "}
              {currentItem?.artista ||
                currentItem?.autore_visita ||
                currentItem?.autore ||
                "Ignoto"}
            </p>
            {currentItem?.stile && (
              <p>
                <strong>Stile / Periodo:</strong> {currentItem.stile}
              </p>
            )}
            <p>
              <strong>Posizione:</strong> Piano {currentItem?.piano || "0"}
            </p>
            <p>
              <strong>Licenza:</strong>{" "}
              {currentItem?.licenza?.tipo || currentItem?.licenza || "–"}
            </p>
            {currentItem?.categoria && (
              <p>
                <strong>Categoria:</strong>{" "}
                <span className="text-capitalize">{currentItem.categoria}</span>
              </p>
            )}
          </div>
        </Modal.Body>
      </Modal>

      {/* ASSISTENTE */}
      <Modal
        show={showAccessMenu}
        onHide={() => setShowAccessMenu(false)}
        centered
        dialogClassName="museum-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Assistente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-grid gap-2">
            <p
              className="text-muted small text-uppercase mb-1"
              style={{ letterSpacing: "0.1em" }}
            >
              Navigazione
            </p>
            <div className="d-flex gap-2">
              <button
                className="btn-museum-outline flex-fill"
                disabled={safeIndex === 0}
                onClick={() => {
                  changeItem(safeIndex - 1);
                  setShowAccessMenu(false);
                }}
              >
                <i className="bi bi-skip-start me-1"></i>Precedente
              </button>
              <button
                className="btn-museum-outline flex-fill"
                disabled={safeIndex === (visit?.tappe?.length ?? 0) - 1}
                onClick={() => {
                  changeItem(safeIndex + 1);
                  setShowAccessMenu(false);
                }}
              >
                Prossimo<i className="bi bi-skip-end ms-1"></i>
              </button>
            </div>

            <p
              className="text-muted small text-uppercase mt-3 mb-1"
              style={{ letterSpacing: "0.1em" }}
            >
              Livello
            </p>
            <div className="d-flex gap-2">
              <button
                className="btn-museum-outline flex-fill"
                onClick={() => {
                  handleSimplify();
                  setShowAccessMenu(false);
                }}
              >
                <i className="bi bi-arrow-down-circle me-1"></i>Più semplice
              </button>
              <button
                className="btn-museum-outline flex-fill"
                onClick={() => {
                  handleAdvance();
                  setShowAccessMenu(false);
                }}
              >
                <i className="bi bi-arrow-up-circle me-1"></i>Più avanzato
              </button>
            </div>

            <p
              className="text-muted small text-uppercase mt-3 mb-1"
              style={{ letterSpacing: "0.1em" }}
            >
              Durata
            </p>
            <div className="d-flex gap-2">
              <button
                className="btn-museum-outline flex-fill"
                onClick={() => {
                  handleLessContent();
                  setShowAccessMenu(false);
                }}
              >
                <i className="bi bi-dash-circle me-1"></i>Più corto
              </button>
              <button
                className="btn-museum-outline flex-fill"
                onClick={() => {
                  handleMoreContent();
                  setShowAccessMenu(false);
                }}
              >
                <i className="bi bi-plus-circle me-1"></i>Più lungo
              </button>
            </div>

            <p
              className="text-muted small text-uppercase mt-3 mb-1"
              style={{ letterSpacing: "0.1em" }}
            >
              Info Opera
            </p>
            <div className="d-flex gap-2">
              <button
                className="btn-museum-outline flex-fill"
                onClick={() => {
                  handleLogistics(
                    `L'autore è ${currentItem?.artista || currentItem?.autore_visita || "sconosciuto"}`,
                  );
                  setShowAccessMenu(false);
                }}
              >
                <i className="bi bi-person me-1"></i>Autore
              </button>
              <button
                className="btn-museum-outline flex-fill"
                onClick={() => {
                  handleLogistics(
                    `Lo stile è: ${currentItem?.stile || "non specificato"}`,
                  );
                  setShowAccessMenu(false);
                }}
              >
                <i className="bi bi-brush me-1"></i>Stile
              </button>
            </div>
            <button
              className="btn-museum-outline"
              onClick={() => {
                handleLogistics(
                  `${currentItem?.titolo || "Opera"} — ${currentItem?.categoria || ""}. ${currentItem?.artista ? "Autore: " + currentItem.artista : ""}`,
                );
                setShowAccessMenu(false);
              }}
            >
              <i className="bi bi-eye me-2"></i>Cos'è questo
            </button>

            <p
              className="text-muted small text-uppercase mt-3 mb-1"
              style={{ letterSpacing: "0.1em" }}
            >
              Logistica
            </p>
            <div className="d-flex gap-2 flex-wrap">
              <button
                className="btn-museum-outline flex-fill"
                onClick={() => {
                  handleLogistics(
                    museumConfig?.logistica_globale?.toilette ||
                      "Informazione non disponibile",
                  );
                  setShowAccessMenu(false);
                }}
              >
                <i className="bi bi-water me-1"></i>Bagno
              </button>
              <button
                className="btn-museum-outline flex-fill"
                onClick={() => {
                  handleLogistics(
                    museumConfig?.logistica_globale?.bar ||
                      "Il bar si trova al piano terra",
                  );
                  setShowAccessMenu(false);
                }}
              >
                <i className="bi bi-cup-hot me-1"></i>Bar
              </button>
              <button
                className="btn-museum-outline flex-fill"
                onClick={() => {
                  handleLogistics(
                    museumConfig?.logistica_globale?.uscita ||
                      "Segui le indicazioni per l'uscita principale",
                  );
                  setShowAccessMenu(false);
                }}
              >
                <i className="bi bi-door-open me-1"></i>Uscita
              </button>
              <button
                className="btn-museum-outline flex-fill"
                onClick={() => {
                  handleLogistics(
                    museumConfig?.logistica_globale?.shop ||
                      "Lo shop si trova al piano terra",
                  );
                  setShowAccessMenu(false);
                }}
              >
                <i className="bi bi-bag me-1"></i>Shop
              </button>
              <button
                className="btn-museum-outline flex-fill"
                onClick={() => {
                  handleLogistics(
                    museumConfig?.logistica_globale?.ostacoli ||
                      "Nessun ostacolo segnalato sul percorso",
                  );
                  setShowAccessMenu(false);
                }}
              >
                <i className="bi bi-exclamation-triangle me-1"></i>Ostacoli
              </button>
            </div>

            <button
              className="btn-museum-primary mt-3"
              onClick={() => setShowAccessMenu(false)}
            >
              Chiudi
            </button>
          </div>
        </Modal.Body>
      </Modal>

      {/* CONFIRMA USCITA */}
      <Modal
        show={showExitModal}
        onHide={() => setShowExitModal(false)}
        centered
        className="museum-modal-overview"
        dialogClassName="museum-modal-overview"
      >
        <Modal.Body className="museum-modal-content-overview">
          <div className="museum-modal-icon-overview">
            <i className="bi bi-exclamation-circle"></i>
          </div>
          <h5 className="museum-modal-title-overview">Conferma uscita</h5>
          <p className="museum-modal-text-overview">
            Vuoi tornare alla preview?
          </p>
          <div className="museum-modal-actions-overview">
            <button
              className="btn-overview-confirm"
              onClick={() => navigate(`/visit/${id}`)}
            >
              Esci dalla guida
            </button>
            <button
              className="btn-overview-cancel"
              onClick={() => setShowExitModal(false)}
            >
              Annulla
            </button>
          </div>
        </Modal.Body>
      </Modal>

      {/* MAPPA */}
      <Modal
        show={showMapModal}
        onHide={() => setShowMapModal(false)}
        centered
        className="museum-map-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">
            Mappa - Piano {selectedMapFloor}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <div className="map-floor-selector d-flex justify-content-center">
            {["-1", "0", "1", "2"].map((f) => (
              <button
                key={f}
                className={`btn btn-sm ${selectedMapFloor === f ? "active" : ""}`}
                onClick={() => setSelectedMapFloor(f)}
              >
                P{f}
              </button>
            ))}
          </div>

          <div className="map-container" style={{ position: "relative" }}>
            <img
              src={`/navigator/maps/mappa-museo-piano_${selectedMapFloor}.png`}
              alt={`Piano ${selectedMapFloor}`}
              style={{ width: "100%", display: "block" }}
            />
            {currentItem &&
              (() => {
            
                const currentFloor =
                  currentItem?.piano !== undefined
                    ? String(currentItem.piano)
                    : "0";
                const mapX = currentItem?.mappa_x;
                const mapY = currentItem?.mappa_y;

                if (
                  mapX === undefined ||
                  mapY === undefined ||
                  String(currentFloor) !== String(selectedMapFloor)
                )
                  return null;

                return (
                  <div
                    style={{
                      position: "absolute",
                      left: `${mapX}%`,
                      top: `${mapY}%`,
                      width: "18px",
                      height: "18px",
                      backgroundColor: "red",
                      borderRadius: "50%",
                      border: "2px solid white",
                      transform: "translate(-50%, -50%)",
                      boxShadow: "0 0 8px #e18f37",
                      zIndex: 10,
                    }}
                  />
                );
              })()}
          </div>

          <div className="px-3 py-2" style={{ background: "#1a1a1a" }}>
            {visit?.tappe?.map((tappa, idx) => {
              const dbItem = tappa.item_default;
              const rowOperaId =
                tappa.operaId?.operaId || tappa.operaId || dbItem?.operaId;

              const configArtwork =
                museumConfig?.posizione_opere?.find(
                  (o) => String(o.operaId) === String(rowOperaId),
                ) || {};
              const rowFloor =
                dbItem?.piano !== undefined
                  ? String(dbItem.piano)
                  : configArtwork.piano || "0";
              const rowTitle =
                dbItem?.titoloOpera ||
                dbItem?.titolo ||
                configArtwork.titoloOpera ||
                `Tappa ${idx + 1}`;

              if (String(rowFloor) !== String(selectedMapFloor)) return null;
              const isCurrent =
                currentItem &&
                rowOperaId &&
                String(rowOperaId) === String(currentItem.operaId);

              return (
                <div
                  key={idx}
                  className="d-flex align-items-center gap-2 py-1"
                  style={{ cursor: "pointer", opacity: isCurrent ? 1 : 0.6 }}
                  onClick={() => {
                    setShowMapModal(false);
                    changeItem(idx);
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: isCurrent ? "#e18f37" : "#555",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      color: "white",
                      fontWeight: "bold",
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: isCurrent ? "#e18f37" : "white",
                    }}
                  >
                    {rowTitle}
                  </span>
                  {isCurrent && (
                    <i
                      className="bi bi-geo-alt-fill ms-auto"
                      style={{ color: "#e18f37", fontSize: "0.75rem" }}
                    ></i>
                  )}
                </div>
              );
            })}
          </div>
        </Modal.Body>
      </Modal>

      {/* AIUTO */}
      <Modal
        show={showHelpModal}
        onHide={() => setShowHelpModal(false)}
        centered
        className="museum-modal"
      >
        <Modal.Header closeButton className="bg-museum text-white">
          <Modal.Title>Cosa puoi chiedermi?</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white p-4">
          <ul className="list-unstyled">
            <li className="mb-3">
              <i className="bi bi-arrow-left-right me-2 text-warning"></i>
              <strong>Navigazione:</strong> "Prossimo", "Precedente", "Avanti",
              "Indietro"
            </li>
            <li className="mb-3">
              <i className="bi bi-info-square me-2 text-warning"></i>
              <strong>Info opera:</strong> "Chi è l'autore", "Chi è l'artista",
              "Qual è lo stile", "Cosa sto guardando"
            </li>
            <li className="mb-3">
              <i className="bi bi-map me-2 text-warning"></i>
              <strong>Mappa:</strong> "Mappa", "Dove mi trovo", "Posizione"
            </li>
            <li className="mb-3">
              <i className="bi bi-gear me-2 text-warning"></i>
              <strong>Livello:</strong> "Più semplice", "Non capisco", "Più
              difficile"
            </li>
            <li className="mb-3">
              <i className="bi bi-clock me-2 text-warning"></i>
              <strong>Durata:</strong> "Dimmi di più", "Approfondisci", "Più
              lungo", "Dimmi di meno", "Più corto", "Riduci"
            </li>
            <li className="mb-3">
              <i className="bi bi-play-circle me-2 text-warning"></i>
              <strong>Player:</strong> "Ferma", "Pausa", "Riprendi", "Play",
              "Continua"
            </li>
            <li className="mb-3">
              <i className="bi bi-geo-alt me-2 text-warning"></i>
              <strong>Logistica:</strong> "Bagno", "Toilette", "Uscita", "Bar",
              "Shop", "Ostacoli", "Accessibilità"
            </li>
          </ul>
          <button
            className="btn btn-museum-primary w-100 mt-3"
            onClick={() => setShowHelpModal(false)}
          >
            Ho capito
          </button>
        </Modal.Body>
      </Modal>

      <Modal
        show={showEndModal}
        onHide={() => setShowEndModal(false)}
        centered
        className="museum-modal-overview"
        dialogClassName="museum-modal-overview"
      >
        <Modal.Body className="museum-modal-content-overview">
          <div className="museum-modal-icon-overview">
            <i className="bi bi-stars"></i>
          </div>
          <h5 className="museum-modal-title-overview">Visita completata</h5>
          <p className="museum-modal-content-overview">
            Hai concluso{" "}
            <strong style={{ color: "#e18f37" }}>
              {visit?.titolo || visit?.title || "questa visita"}
            </strong>
            . Grazie per aver esplorato con noi.
          </p>
          <div className="museum-modal-actions-overview">
            <button
              className="btn-overview-confirm"
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current.currentTime = 0;
                }
                if (window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                }
                setIsPlaying(false);
                navigate(`/visit/${id}`);
              }}
            >
              <i className="bi bi-house me-2"></i>Torna alla home
            </button>
            <button
              className="btn-overview-cancel"
              onClick={() => setShowEndModal(false)}
            >
              Rimani sull'ultima opera
            </button>
          </div>
        </Modal.Body>
      </Modal>

      {/* MODAL INDICAZIONI LOGISTICHE */}
      <Modal
        show={showLogisticsModal}
        onHide={() => setShowLogisticsModal(false)}
        centered
        dialogClassName="custom-viewer-modal modal-logistic"
      >
        <Modal.Header
          closeButton
          className="border-0 bg-transparent text-white"
        >
          <Modal.Title
            className="fs-6 d-flex align-items-center"
            style={{
              color: "#e18f37",
              fontWeight: "700",
              letterSpacing: "0.05em",
            }}
          >
            <i className="bi bi-compass-fill me-2"></i> INDICAZIONI PERCORSO
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-0">
          <div className="logistics-text-container">
            <p>{getLogisticsDirections()}</p>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}
