import React, { useState } from "react";
import "../CSS/NavigatorLogin.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faEyeSlash,
  faUniversity,
} from "@fortawesome/free-solid-svg-icons";

const NavigatorLogin = ({ isOpen, onClose }) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: identifier, password }),
      });

      const json = await response.json();

      if (json.successo) {
        const userData = json?.data?.user || json?.data;
        const token = json?.data?.token || null;
        const sessionData = {
          user: userData,
          token,
          loginTimestamp: new Date().getTime(),
        };

        localStorage.setItem("user_session", JSON.stringify(sessionData));
        localStorage.setItem("aa_token", token);
        localStorage.setItem("aa_utente", JSON.stringify(userData));

        onClose();
        window.location.reload();
      } else {
        setError(json.messaggio || "Credenziali non valide");
      }
    } catch (err) {
      setError("Errore di connessione al server");
    }
  };

  return (
    <div className="navigator-modal-overlay" onClick={onClose}>
      <div
        className="navigator-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="navigator-modal-header d-flex justify-content-between align-items-center">
          <h4 className="m-0 d-flex align-items-center">
            <FontAwesomeIcon
              icon={faUniversity}
              className="me-2 text-gold-accent"
            />
            Accedi
          </h4>
          <button
            className="navigator-modal-close-btn"
            type="button"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleLogin}>
          <div className="navigator-modal-body">
            <div className="login-modal-field">
              <label htmlFor="modal-identifier">Username</label>
              <input
                id="modal-identifier"
                type="text"
                placeholder="Inserisci il tuo username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="login-modal-field">
              <label htmlFor="modal-password">Password</label>
              <div className="password-input-wrapper">
                <input
                  id="modal-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Inserisci la password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <span
                  className="password-toggle-inside"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </span>
              </div>
            </div>

            {error && <p className="modal-error-msg">⚠️ {error}</p>}
          </div>
          <div className="navigator-modal-footer d-flex justify-content-end gap-2">
            <button
              type="button"
              className="modal-btn-cancel"
              onClick={onClose}
            >
              Annulla
            </button>
            <button type="submit" className="modal-btn-submit">
              Entra
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NavigatorLogin;
