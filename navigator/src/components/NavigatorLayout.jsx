import React from "react";
import { useLocation, Outlet } from "react-router-dom";
import "../CSS/NavigatorLayout.css";

const NavigatorLayout = ({ isMobile }) => {
  const location = useLocation();
  const showSideBar = !isMobile || ["/", "/home", "/login"].includes(location.pathname);

  return (
    <div className={`navigator-wrapper ${showSideBar ? "with-sidebar" : ""}`}>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default NavigatorLayout;
