import { useState } from "react";
import { ProcessControl } from "./ProcessControl";
import { CurrencyRates } from "./CurrencyRates"

export function Capaci() {
    const [openDropdown, setOpenDropdown] = useState(null); // Dropdown ouvert
    const [tabs, setTabs] = useState([{ id: 1, name: "Process Control", content: <ProcessControl /> }]);
    const [activeTab, setActiveTab] = useState(1);

    // Gérer les onglets
    const openTab = (name, content) => {
        const existingTab = tabs.find((tab) => tab.name === name);
        if (existingTab) {
            setActiveTab(existingTab.id); // Activer l'onglet existant
        } else {
            const newTab = { id: Date.now(), name, content };
            setTabs([...tabs, newTab]); // Ajouter un nouvel onglet
            setActiveTab(newTab.id);
        }
    };

    const closeTab = (id) => {
        const filteredTabs = tabs.filter((tab) => tab.id !== id);
        setTabs(filteredTabs);

        if (activeTab === id && filteredTabs.length > 0) {
            setActiveTab(filteredTabs[filteredTabs.length - 1].id); // Activer le dernier onglet ouvert
        } else if (filteredTabs.length === 0) {
            setActiveTab(null); // Aucun onglet actif si tout est fermé
        }
    };

    const toggleDropdown = (dropdown) => {
        setOpenDropdown(openDropdown === dropdown ? null : dropdown);
    };

    const renderContentForTab = (name) => {
        switch (name) {
            case "Process Control":
                return <ProcessControl />;
            case "Currency Rates":
                return <CurrencyRates />;
            case "Ownership":
                return <div>Ownership</div>;
            case "Data - Load Data":
                return <div>Data - Load Data Content</div>;
            case "Data - Extract Data":
                return <div>Data - Extract Data Content</div>;
            default:
                return <div>{name} Content</div>;
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-1 h-full w-full flex flex-row gap-1">
                {/* Menu vertical */}
                <div className="flex flex-col h-10 min-w-48 h-full border border-primary rounded-l-lg">
                    <p className="border-b border-primary p-1 text-center font-bold text-sm h-8">Menu</p>
                    <div className="p-1 text-sm">
                        <ul className="space-y-2">
                            {/* Process Control */}
                            <li
                                className="cursor-pointer hover:underline"
                                onClick={() => openTab("Process Control", renderContentForTab("Process Control"))}
                            >
                                Process Control
                            </li>

                            {/* Dropdown: Tables */}
                            <li>
                                <p
                                    className="font-semibold cursor-pointer hover:underline"
                                    onClick={() => toggleDropdown("Tables")}
                                >
                                    Tables
                                </p>
                                {openDropdown === "Tables" && (
                                    <ul className="pl-4 space-y-1">
                                        <li
                                            className="cursor-pointer hover:underline"
                                            onClick={() =>
                                                openTab("Currency Rates", renderContentForTab("Currency Rates"))
                                            }
                                        >
                                            Currency Rates
                                        </li>
                                        <li
                                            className="cursor-pointer hover:underline"
                                            onClick={() =>
                                                openTab("Ownership", renderContentForTab("Ownership"))
                                            }
                                        >
                                            Ownership
                                        </li>
                                    </ul>
                                )}
                            </li>

                            {/* Dropdown: Data */}
                            <li>
                                <p
                                    className="font-semibold cursor-pointer hover:underline"
                                    onClick={() => toggleDropdown("Data")}
                                >
                                    Data
                                </p>
                                {openDropdown === "Data" && (
                                    <ul className="pl-4 space-y-1">
                                        <li
                                            className="cursor-pointer hover:underline"
                                            onClick={() =>
                                                openTab("Data - Load Data", renderContentForTab("Data - Load Data"))
                                            }
                                        >
                                            Load Data
                                        </li>
                                        <li
                                            className="cursor-pointer hover:underline"
                                            onClick={() =>
                                                openTab("Data - Extract Data", renderContentForTab("Data - Extract Data"))
                                            }
                                        >
                                            Extract Data
                                        </li>
                                    </ul>
                                )}
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Contenu principal avec onglets */}
                <div className="flex flex-col w-full h-full border border-primary rounded-r-lg">
                    {/* Barre des onglets */}
                    <div className="flex bg-gray-200 px-2 pt-1 space-x-2 border-b border-primary">
                        {tabs.map((tab) => (
                            <div
                                key={tab.id}
                                className={`flex items-center text-sm h-7 px-4 py-1 rounded-t cursor-pointer ${activeTab === tab.id ? "bg-white border border-b-0 border-primary" : "bg-gray-300"
                                    }`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <span>{tab.name}</span>
                                <button
                                    className="ml-2 text-red-500 hover:text-red-700"
                                    onClick={(e) => {
                                        e.stopPropagation(); // Empêche l'activation de l'onglet lors de la fermeture
                                        closeTab(tab.id);
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Contenu de l'onglet actif */}
                    <div className="flex-grow overflow-hidden">
                        <div className="h-full w-full overflow-x-auto">
                            {tabs.find((tab) => tab.id === activeTab)?.content || "No Content"}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
