import React, { createContext, useState, useContext } from "react";

// Création du contexte
const TabsContext = createContext();

// Fournisseur du contexte
export const TabsProvider = ({ children }) => {
    const [tabsState, setTabsState] = useState({
        Capaci: [],
        Alexandria: [],
        Bespin: [],
        Home: [{ id: 1, name: "Home", content: <div>Home Content</div> }],
    });

    const openTab = (appName, name, content) => {
        setTabsState((prevState) => {
            const appTabs = prevState[appName] || [];
            const existingTab = appTabs.find((tab) => tab.name === name);
            if (existingTab) {
                return prevState; // Onglet déjà ouvert
            }

            return {
                ...prevState,
                [appName]: [...appTabs, { id: Date.now(), name, content }],
            };
        });
    };

    const closeTab = (appName, id) => {
        setTabsState((prevState) => ({
            ...prevState,
            [appName]: prevState[appName].filter((tab) => tab.id !== id),
        }));
    };

    return (
        <TabsContext.Provider value={{ tabsState, openTab, closeTab }}>
            {children}
        </TabsContext.Provider>
    );
};

// Hook pour accéder au contexte
export const useTabs = () => {
    const context = useContext(TabsContext);
    if (!context) {
        throw new Error("useTabs must be used within a TabsProvider");
    }
    return context;
};
