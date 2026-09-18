import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

export default function FloorMap({ config, currentItem }) {
  const navigate = useNavigate();
  const handleMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
  };

  const currentFloor =
    currentItem?.piano !== undefined ? String(currentItem.piano) : "0";
  const urlMappa = config?.mappe?.[currentFloor];

  const mapX = currentItem?.mappa_x;
  const mapY = currentItem?.mappa_y;

  return (
    <div
      className="floor-map-component text-white p-3"
      style={{ backgroundColor: "#1a1a1a", borderRadius: "8px" }}
    >
      <div className="d-flex align-items-center justify-content-between mb-3">
        <Button variant="outline-light" onClick={() => navigate(-1)}>
          Indietro
        </Button>
        <h5 className="mt-3">
          Posizione: {currentItem?.titoloOpera || currentItem?.titolo} (Piano{" "}
          {currentFloor})
        </h5>
      </div>

      <div
        className="position-relative d-inline-block w-100"
        onClick={handleMapClick}
      >
        {urlMappa ? (
          <img
            src={urlMappa}
            alt="Mappa Piano"
            className="img-fluid w-100"
            style={{ cursor: "crosshair", border: "1px solid #b38b4d" }}
          />
        ) : (
          <p className="p-5 text-center">
            Mappa non disponibile per questo piano.
          </p>
        )}

        {mapX !== undefined && mapY !== undefined && (
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
            }}
          />
        )}
      </div>
    </div>
  );
}
