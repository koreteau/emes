import { useState, useEffect, useRef } from "react";
import { Login } from "./components/Login";
import { Navbar } from "./components/Navbar";
import { Header } from "./components/Header";
import { Tabs } from "./components/Tabs";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const tabsRef = useRef();

  useEffect(() => {
    // Vérifie si un token existe dans localStorage
    const token = localStorage.getItem("authToken");
    setIsAuthenticated(!!token);
  }, []);

  const logout = (() => {
    setIsAuthenticated(false);
    localStorage.clear();
  })

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
        </>
      ) : <Login onLogin={() => setIsAuthenticated(true)} />}
    </div>
  );
}