import { useState, useEffect, useRef } from "react";
import { Login } from "./components/Login";
import { Navbar } from "./components/Navbar";
import { Header } from "./components/Header";
import { Tabs } from "./components/Tabs";
import { SessionTimeoutDialog } from "./components/SessionTimeoutDialog";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const tabsRef = useRef();
  const timeoutRef = useRef();
  const warningTimeoutRef = useRef();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      const tokenPayload = JSON.parse(atob(token.split(".")[1])); // Décodage du payload
      const expirationTime = tokenPayload.exp * 1000; // Convertir en millisecondes
      const warningTime = expirationTime - Date.now() - 60000; // 1 minute avant expiration

      if (warningTime > 0) {
        setIsAuthenticated(true);

        // Affiche le modal 1 minute avant expiration
        warningTimeoutRef.current = setTimeout(() => {
          setShowTimeoutModal(true);
        }, warningTime);

        // Déconnecte automatiquement à l'expiration
        timeoutRef.current = setTimeout(() => {
          logout();
        }, expirationTime - Date.now());
      } else {
        localStorage.clear(); // Nettoie le token expiré
      }
    }
    return () => {
      clearTimeout(timeoutRef.current);
      clearTimeout(warningTimeoutRef.current);
    };
  }, []);

  const logout = () => {
    setIsAuthenticated(false);
    setShowTimeoutModal(false);
    localStorage.clear();
    clearTimeout(timeoutRef.current);
    clearTimeout(warningTimeoutRef.current);
  };

  const openTab = (name, content) => {
    if (tabsRef.current) {
      tabsRef.current.openTab(name, content);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {isAuthenticated ? (
        <>
          <Header />
          <Navbar onLogout={() => logout()} openTab={openTab} />
          <Tabs ref={tabsRef} />
          {showTimeoutModal && (
            <SessionTimeoutDialog
              open={showTimeoutModal}
              onClose={() => {
                setShowTimeoutModal(false);
                clearTimeout(warningTimeoutRef.current);
              }}
              onLogout={logout}
            />
          )}
        </>
      ) : (
        <Login onLogin={() => setIsAuthenticated(true)} />
      )}
    </div>
  );
}
