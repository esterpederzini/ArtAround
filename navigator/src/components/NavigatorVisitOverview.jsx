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
    const key = `artaround_furthest_${id}`;
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      setFurthestIndex(parseInt(stored));
    }
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch("/api/items?limite=200")
      .then((res) => res.json())
      .then((itemsJson) => {
        if (isMounted && itemsJson.successo && itemsJson.data?.items) {
          setAllItems(itemsJson.data.items);
        }
      })
      .catch((err) => console.error("Errore recupero catalogo fallback:", err));

    fetch(`/api/visite/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.successo && json.data) {
          setVisit(json.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Errore fetch dal DB:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleShow = () => setShowExitModal(true);
  const handleClose = () => setShowExitModal(false);
  const handleConfirmExit = () => {
    if (id) {
      const key = `artaround_furthest_${id}`;
      localStorage.removeItem(key);
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
    return <div className="text-white p-5">Visita non trovato.</div>;
  }

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
            onClick={handleShow}
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
            Tour preview
          </span>
        </div>
      </Navbar>

      <Container fluid className="full-container px-4">
        <div className="content-wrapper">
          <div className="itinerary-header mt-4 mb-3">
            <h3 className="text-white fw-bold">
              {visit.title || visit.titolo}
            </h3>
            <p className="text-secondary small">{visit.museo}</p>
          </div>

          <div className="mb-4 btn-container-desktop">
            <Button
              className="start-visit-btn d-flex align-items-center justify-content-center gap-3 w-100"
              onClick={handleStartOrResume}
              disabled={!(visit.tappe && visit.tappe.length)}
            >
              <div className="play-icon-circle">
                <i className="bi bi-play-fill"></i>
              </div>
              <span className="fw-bold">
                {furthestIndex >= 0 ? "Riprendi la visita" : "Inizia la visita"}
              </span>
            </Button>
          </div>

          {!(visit.tappe && visit.tappe.length) ? (
            <p className="text-secondary small px-1">
              Nessuna tappa in questa visita. Controlla che sia stata salvata
              dal marketplace con il percorso (<code>tappe</code>).
            </p>
          ) : null}

          {visit.tappe &&
            visit.tappe.map((tappa, index) => {
              let opera = {};
              if (
                tappa.item_default &&
                typeof tappa.item_default === "object"
              ) {
                opera = tappa.item_default;
              } else {
                const matchCatalogo = allItems.find(
                  (item) =>
                    item.operaId === tappa.operaId &&
                    item.linguaggio === (tappa.linguaggio_default || "medio"),
                );
                opera =
                  matchCatalogo ||
                  allItems.find((item) => item.operaId === tappa.operaId) ||
                  {};
              }

              const isReached = index <= furthestIndex;
              const isFurthest = index === furthestIndex;

              const titoloOpera =
                tappa.item_default?.titolo ||
                opera.titolo ||
                `Tappa dell'opera ${tappa.operaId || index + 1}`;

              const urlImmagine =
                tappa.item_default?.immagine ||
                tappa.item_default?.url ||
                opera.immagine ||
                opera.url ||
                "/img/default_item_image.jpg"; 

              const stringaDurata = opera.durata_reale
                ? `${opera.durata_reale}s`
                : opera.lunghezza || "15s";
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
                    {index < visit.tappe.length - 1 && (
                      <div
                        className={`timeline-line ${isReached ? "reached" : ""}`}
                      ></div>
                    )}
                  </Col>

                  <Col xs={10} sm={11} className="pb-4">
                    <Card className="itinerary-card shadow-none">
                      <Row className="g-0 align-items-center">
                        <Col xs={4} sm={3} md={2} className="p-2">
                          <Card.Img
                            src={urlImmagine}
                            className="img-list-new"
                          />
                        </Col>
                        <Col xs={8} sm={9} md={10}>
                          <Card.Body className="py-2 px-3">
                            <Card.Title className="opera-title">
                              {titoloOpera}
                            </Card.Title>
                            <div className="audio-info mt-2">
                              <i className="bi bi-headphones me-2"></i>
                              <span>{stringaDurata}</span>
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
        onHide={handleClose}
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
            <button className="btn-overview-cancel" onClick={handleClose}>
              Annulla
            </button>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default NavigatorVisitOverview;
