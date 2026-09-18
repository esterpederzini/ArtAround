import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import { NavigatorProvider } from "./context/NavigatorContext";
import NavigatorLayout from "./components/NavigatorLayout";
import NavigatorItemViewer from "./components/NavigatorItemViewer";
import NavigatorHome from "./components/NavigatorHome";
import NavigatorVisitOverview from "./components/NavigatorVisitOverview";
import NavigatorLibrary from "./components/NavigatorLibrary";

function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showIntro, setShowIntro] = useState(() => {
    const hasSeenIntro = sessionStorage.getItem("artaround_intro_seen");
    return !hasSeenIntro; 
  });

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (showIntro) {
      const timer = setTimeout(() => {
        sessionStorage.setItem("artaround_intro_seen", "true");
        setShowIntro(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showIntro]);

  const text = ["A", "r", "t", "A", "r", "o", "u", "n", "d"];

  return (
    <NavigatorProvider>
      <BrowserRouter basename="/navigator">
        {showIntro ? (
          <div className="intro-wrapper">
            <h1 className="bounce-text">
              {text.map((letter, index) => (
                <span
                  key={index}
                  style={{
                    animationDelay: `${index * 0.1}s`,
                    display: "inline-block",
                  }}
                >
                  {letter}
                </span>
              ))}
            </h1>
          </div>
        ) : (
          <Routes>
            <Route element={<NavigatorLayout isMobile={isMobile} />}>
              <Route path="/" element={<NavigatorHome />} />
              <Route path="/home" element={<NavigatorHome />} />
              <Route path="/library" element={<NavigatorLibrary />} />
              <Route path="/visit/:id" element={<NavigatorVisitOverview />} />
              <Route
                path="/visit/:id/:operaIndex"
                element={<NavigatorItemViewer />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        )}
      </BrowserRouter>
    </NavigatorProvider>
  );
}

export default App;
