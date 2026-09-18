import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Navbar,
  Button,
  Modal,
  Spinner,
} from "react-bootstrap";
import "../CSS/NavigatorVisitOverview.css";

function NavigatorVisitOverview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [visit, setVisit] = useState(null);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);

  const [furthestIndex, setFurthestIndex] = useState(-1);

  useEffect(() => {
    if (!id) return;
    const storageKey = `artaround_furthest_${id}`;
    const storedIndex = localStorage.getItem(storageKey);
    if (storedIndex !== null) {
      setFurthestIndex(parseInt(storedIndex, 10));
    }
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch("/api/items?limit=200")
      .then((res) => res.json())
      .then((itemsJson) => {
        const isSuccessful = itemsJson.success ?? itemsJson.successo;
        if (isMounted && isSuccessful && itemsJson.data?.items) {
          setAllItems(itemsJson.data.items);
        }
      })
      .catch((err) =>
        console.error("Error fetching fallback catalog items:", err),
      );

    fetch(`/api/visits/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        const isSuccessful = json.success ?? json.successo;
        if (isSuccessful && json.data) {
          setVisit(json.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching visit details:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleShowExitModal = () => setShowExitModal(true);
  const handleCloseExitModal = () => setShowExitModal(false);
  const handleConfirmExit = () => {
    if (id) {
      const storageKey = `artaround_furthest_${id}`;
      localStorage.removeItem(storageKey);
    }
    setFurthestIndex(-1);
    setTimeout(() => {
      navigate("/");
    }, 50);
  };

  const handleStartOrResume = () => {
    const resumeIndex = furthestIndex >= 0 ? furthestIndex : 0;
    navigate(`/visit/${id}/${resumeIndex}`);
  };

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh", backgroundColor: "#242326" }}
      >
        <Spinner animation="border" variant="light" />
      </div>
    );
  }

  if (!visit) {
    return <div className="text-white p-5">Visita non trovata.</div>;
  }

  const stopsList = visit.stops || visit.tappe || [];

  return (
    <>
      <Navbar
        className="align-items-center justify-content-center border-0 shadow-none"
        style={{ height: "6vh", backgroundColor: "#242326" }}
      >
        <div className="ms-3 position-absolute start-0">
          <Button
            variant="link"
            className="p-0 shadow-none"
            onClick={handleShowExitModal}
          >
            <i
              className="bi bi-arrow-left"
              style={{ fontSize: "1.6rem", color: "#FAF7F1" }}
            ></i>
          </Button>
        </div>
        <div className="w-100 d-flex justify-content-center">
          <span
            className="fw-bold"
            style={{ fontSize: "1.2rem", color: "#FAF7F1" }}
          >
            Anteprima Tour
          </span>
        </div>
      </Navbar>

      <Container fluid className="full-container px-4">
        <div className="content-wrapper">
          <div className="itinerary-header mt-4 mb-3">
            <h3 className="text-white fw-bold">
              {visit.title || visit.titolo}
            </h3>
            <p className="text-secondary small">
              {visit.museum || visit.museo}
            </p>
          </div>

          <div className="mb-4 btn-container-desktop">
            <Button
              className="start-visit-btn d-flex align-items-center justify-content-center gap-3 w-100"
              onClick={handleStartOrResume}
              disabled={stopsList.length === 0}
            >
              <div className="play-icon-circle">
                <i className="bi bi-play-fill"></i>
              </div>
              <span className="fw-bold">
                {furthestIndex >= 0 ? "Riprendi la visita" : "Inizia la visita"}
              </span>
            </Button>
          </div>

          {stopsList.length === 0 ? (
            <p className="text-secondary small px-1">
              Nessuna tappa configurata per questo percorso.
            </p>
          ) : null}

          {stopsList.map((stop, index) => {
            let item = {};
            const defaultItem = stop.defaultItem || stop.item_default;
            const currentArtworkId =
              stop.artworkId ||
              stop.operaId ||
              defaultItem?.artworkId ||
              defaultItem?.operaId;

            if (defaultItem && typeof defaultItem === "object") {
              item = defaultItem;
            } else {
              const targetLang =
                stop.language || stop.linguaggio_default || "medium";
              const catalogMatch = allItems.find(
                (entry) =>
                  (entry.artworkId === currentArtworkId ||
                    entry.operaId === currentArtworkId) &&
                  (entry.language === targetLang ||
                    entry.linguaggio === targetLang),
              );
              item =
                catalogMatch ||
                allItems.find(
                  (entry) =>
                    entry.artworkId === currentArtworkId ||
                    entry.operaId === currentArtworkId,
                ) ||
                {};
            }

            const isReached = index <= furthestIndex;
            const isFurthest = index === furthestIndex;

            const artworkTitle =
              defaultItem?.title ||
              defaultItem?.titoloOpera ||
              defaultItem?.titolo ||
              item.title ||
              item.titoloOpera ||
              item.titolo ||
              `Tappa dell'opera ${currentArtworkId || index + 1}`;

            const imageUrl =
              defaultItem?.url ||
              defaultItem?.immagine ||
              item.url ||
              item.immagine ||
              "/img/default_item_image.jpg";

            const durationLabel =
              item.realDuration || item.durata_reale
                ? `${item.realDuration || item.durata_reale}s`
                : item.length || item.lunghezza || "15s";

            return (
              <Row
                key={index}
                className="g-0 mb-0 itinerary-row"
                onClick={() => navigate(`/visit/${id}/${index}`)}
                style={{ cursor: "pointer" }}
              >
                <Col
                  xs={2}
                  sm={1}
                  className="d-flex flex-column align-items-center position-relative"
                >
                  <div
                    className={`list-num-circle ${isReached ? "active" : ""} ${isFurthest ? "furthest" : ""}`}
                  >
                    {index < furthestIndex ? (
                      <i
                        className="bi bi-check-lg"
                        style={{ fontSize: "0.9rem" }}
                      ></i>
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < stopsList.length - 1 && (
                    <div
                      className={`timeline-line ${isReached ? "reached" : ""}`}
                    ></div>
                  )}
                </Col>

                <Col xs={10} sm={11} className="pb-4">
                  <Card className="itinerary-card shadow-none">
                    <Row className="g-0 align-items-center">
                      <Col xs={4} sm={3} md={2} className="p-2">
                        <Card.Img src={imageUrl} className="img-list-new" />
                      </Col>
                      <Col xs={8} sm={9} md={10}>
                        <Card.Body className="py-2 px-3">
                          <Card.Title className="opera-title">
                            {artworkTitle}
                          </Card.Title>
                          <div className="audio-info mt-2">
                            <i className="bi bi-headphones me-2"></i>
                            <span>{durationLabel}</span>
                          </div>
                        </Card.Body>
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>
            );
          })}
        </div>
      </Container>

      <Modal
        show={showExitModal}
        onHide={handleCloseExitModal}
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
            Sei sicuro di voler interrompere la visita e tornare alla Home?
          </p>
          <div className="museum-modal-actions-overview">
            <button
              className="btn-overview-confirm"
              onClick={handleConfirmExit}
            >
              Esci dalla visita
            </button>
            <button
              className="btn-overview-cancel"
              onClick={handleCloseExitModal}
            >
              Annulla
            </button>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default NavigatorVisitOverview;
