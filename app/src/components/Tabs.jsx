import { useImperativeHandle, forwardRef, useState } from "react";

import { Capaci } from "./Applications/Capaci/Capaci";
import { Alexandria } from "./Applications/Alexandria/Alexandria";
import { Bespin } from "./Applications/Bespin/Bespin";
import { Home } from "./Home";

export const Tabs = forwardRef((_, ref) => {
    const [tabs, setTabs] = useState([{ id: 1, name: "Home", content: <Home />, isOpen: true }]);
    const [activeTab, setActiveTab] = useState(1);

    const getContentForTab = (name) => {
        switch (name) {
            case "Capaci Finance":
                return <Capaci />;
            case "Alexandria Inventory":
                return <Alexandria />;
            case "Bespin Cloud":
                return <Bespin />;
            default:
                return <div>{name} Content</div>;
        }
    };

    // Garde les onglets ouverts et ne les démonte pas
    useImperativeHandle(ref, () => ({
        openTab(name) {
            const existingTab = tabs.find((tab) => tab.name === name);
            if (existingTab) {
                setActiveTab(existingTab.id);
            } else {
                const newTab = {
                    id: Date.now(),
                    name,
                    content: getContentForTab(name),
                    isOpen: true,
                };
                setTabs([...tabs, newTab]);
                setActiveTab(newTab.id);
            }
        },
    }));

    const closeTab = (id) => {
        const updatedTabs = tabs.map((tab) =>
            tab.id === id ? { ...tab, isOpen: false } : tab
        );
        setTabs(updatedTabs);

        if (activeTab === id) {
            const openTabs = updatedTabs.filter((tab) => tab.isOpen);
            setActiveTab(openTabs.length > 0 ? openTabs[0].id : null);
        }
    };

    return (
        <>
            {/* Tab Bar */}
            <div className="flex bg-gray-200 px-2 pt-1 space-x-2 border-b border-gray-300 text-sm">
                {tabs.map(
                    (tab) =>
                        tab.isOpen && (
                            <div
                                key={tab.id}
                                className={`flex items-center px-4 py-1 rounded-t cursor-pointer ${
                                    activeTab === tab.id
                                        ? "bg-white border border-b-0 border-gray-300"
                                        : "bg-gray-300"
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
                        )
                )}
            </div>

            {/* Tab Content */}
            <>
                {tabs.map(
                    (tab) =>
                        tab.isOpen && (
                            <div
                                className="flex flex-col h-full"
                                key={tab.id}
                                style={{ display: activeTab === tab.id ? "block" : "none" }}
                            >
                                {tab.content}
                            </div>
                        )
                )}
            </>
        </>
    );
});
