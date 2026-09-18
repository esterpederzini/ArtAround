import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../CSS/NavigatorHome.css"; 

const NavigatorSideBar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const token =
    localStorage.getItem("aa_token") ||
    JSON.parse(localStorage.getItem("user_session") || "{}")?.token;
  const utenteRaw = localStorage.getItem("aa_utente");
  const utenteObj = utenteRaw
    ? JSON.parse(utenteRaw)
    : JSON.parse(localStorage.getItem("user_session") || "{}")?.user;

  const isLoggato = !!token;
  const userName = isLoggato ? utenteObj?.username || "Utente" : null;

  const handleNav = (path) => {
    onClose(); 
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
    onClose();
    window.location.reload();
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? "visible" : ""}`}
        onClick={onClose}
      />
      <aside className={`side-bar ${isOpen ? "open" : ""}`}>
        <div className="side-bar-header">
          <div className="profile-thumb">
            <i className="bi bi-person-circle"></i>
          </div>
          <div className="profile-info">
            <strong>{isLoggato ? userName : "Menu"}</strong>
          </div>
          <button className="close-btn" onClick={onClose}>
            <i className="bi bi-x"></i>
          </button>
        </div>

        <nav className="side-nav">
          {isLoggato && (
            <div
              className={`side-nav-item ${location.pathname === "/" || location.pathname === "/home" ? "active" : ""}`}
              onClick={() => handleNav("/")}
            >
              <i className="bi bi-house-door"></i>
              <span>Home</span>
            </div>
          )}

          {isLoggato && (
            <div
              className={`side-nav-item ${location.pathname === "/library" ? "active" : ""}`}
              onClick={() => handleNav("/library")}
            >
              <i className="bi bi-collection-play"></i>
              <span>Le mie Visite</span>
            </div>
          )}
          <div
            className="side-nav-item"
            onClick={() => handleNav("/marketplace")}
          >
            <i className="bi bi-shop"></i>
            <span>Marketplace</span>
          </div>
        </nav>
        <div className="side-bar-footer">
          {isLoggato && (
            <button
              className="settings-btn"
              onClick={handleLogout}
              style={{ color: "#ff4444", cursor: "pointer" }}
            >
              <i className="bi bi-box-arrow-right"></i>
              <span>Logout</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default NavigatorSideBar;
