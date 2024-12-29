import { useImperativeHandle, forwardRef, useState, useEffect } from "react";

import { Capaci } from "./Applications/Capaci/Capaci";
import { Alexandria } from "./Applications/Alexandria/Alexandria";
import { Bespin } from "./Applications/Bespin/Bespin";
import { Home } from "./Home";

export const Tabs = forwardRef((_, ref) => {
    const [tabs, setTabs] = useState([{ id: 1, name: "Home", content: <Home /> }]);
    const [activeTab, setActiveTab] = useState(1);

    // Met à jour le titre de la page selon l'onglet actif
    useEffect(() => {
        const activeTabName = tabs.find((tab) => tab.id === activeTab)?.name || "No Tab";
        document.title = `SYNAPS. - ${activeTabName}`; // Modifie "My App" pour le nom de ton application
    }, [activeTab, tabs]);

    const getContentForTab = (name) => {
        switch (name) {
            case "Capaci Finance":
                return <Capaci />;
            case "Alexandria Inventory":
                return <Alexandria />;
            case "Bespin Cloud":
                return <Bespin />
            default:
                return <div>{name} Content</div>; // Contenu par défaut
        }
    };

    // Lors de l'ouverture d'un onglet
    useImperativeHandle(ref, () => ({
        openTab(name) {
            const existingTab = tabs.find((tab) => tab.name === name);
            if (existingTab) {
                setActiveTab(existingTab.id);
            } else {
                const newTab = { id: Date.now(), name, content: getContentForTab(name) };
                setTabs([...tabs, newTab]);
                setActiveTab(newTab.id);
            }
        },
    }));

    const closeTab = (id) => {
        const filteredTabs = tabs.filter((tab) => tab.id !== id);
        setTabs(filteredTabs);

        if (activeTab === id && filteredTabs.length > 0) {
            setActiveTab(filteredTabs[filteredTabs.length - 1].id); // Active le dernier onglet
        } else if (filteredTabs.length === 0) {
            setActiveTab(null); // Si plus d'onglets, aucun actif
        }
    };

    return (
        <>
            {/* Tab Bar */}
            <div className="flex bg-gray-200 px-2 pt-1 space-x-2 border-b border-gray-300">
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={`flex items-center px-4 py-1 rounded-t cursor-pointer ${activeTab === tab.id ? "bg-white border border-b-0 border-gray-300" : "bg-gray-300"
                            }`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span>{tab.name}</span>
                        {tab.name !== "Home" && (
                            <button
                                className="ml-2 text-red-500 hover:text-red-700"
                                onClick={(e) => {
                                    e.stopPropagation(); // Empêche l'activation de l'onglet lors de la fermeture
                                    closeTab(tab.id);
                                }}
                            >
                                ×
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Tab Content */}
            <>
                {tabs.find((tab) => tab.id === activeTab)?.content || "No Content"}
            </>
        </>
    );
});