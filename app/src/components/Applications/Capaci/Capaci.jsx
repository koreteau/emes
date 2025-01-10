import { useState } from "react";
import { ProcessControl } from "./ProcessControl";
import { CurrencyRates } from "./CurrencyRates";
import { DataLoad } from "./LoadData";

export function Capaci() {
    const [openDropdowns, setOpenDropdowns] = useState(new Set()); // Dropdowns ouverts
    const [tabs, setTabs] = useState([{ id: 1, name: "Process Control", content: <ProcessControl /> }]);
    const [activeTab, setActiveTab] = useState(1);

    const toggleDropdown = (dropdown) => {
        setOpenDropdowns((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(dropdown)) {
                newSet.delete(dropdown); // Fermer le dropdown s'il est déjà ouvert
            } else {
                newSet.add(dropdown); // Ouvrir le dropdown
            }
            return newSet;
        });
    };

    const openTab = (name, content) => {
        const existingTab = tabs.find((tab) => tab.name === name);
        if (existingTab) {
            setActiveTab(existingTab.id);
        } else {
            const newTab = { id: Date.now(), name, content };
            setTabs([...tabs, newTab]);
            setActiveTab(newTab.id);
        }
    };

    const closeTab = (id) => {
        const filteredTabs = tabs.filter((tab) => tab.id !== id);
        setTabs(filteredTabs);

        if (activeTab === id && filteredTabs.length > 0) {
            setActiveTab(filteredTabs[filteredTabs.length - 1].id);
        } else if (filteredTabs.length === 0) {
            setActiveTab(null);
        }
    };

    const renderContentForTab = (name) => {
        switch (name) {
            case "Process Control":
                return <ProcessControl />;
            case "Currency Rates":
                return <CurrencyRates />;
            case "Ownership":
                return <div>Ownership</div>;
            case "Load Data":
                return <DataLoad />;
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
                    <div className="p-1 text-sm py-2">
                        <ul className="space-y-2">
                            {/* Dropdown: Data */}
                            <li>
                                <p
                                    className="font-semibold cursor-pointer hover:underline flex items-center"
                                    onClick={() => toggleDropdown("Data")}
                                >
                                    <i className="fas fa-database mr-2"></i> Data
                                </p>
                                {openDropdowns.has("Data") && (
                                    <ul className="pl-4 space-y-1">
                                        <li
                                            className="cursor-pointer hover:underline flex items-center"
                                            onClick={() => openTab("Manage", renderContentForTab("Manage"))}
                                        >
                                            <i className="fas fa-cog mr-2"></i> Manage
                                        </li>
                                        <li
                                            className="cursor-pointer hover:underline flex items-center"
                                            onClick={() => openTab("Process Control", renderContentForTab("Process Control"))}
                                        >
                                            <i className="fas fa-sliders-h mr-2"></i> Process Control
                                        </li>
                                        <li
                                            className="cursor-pointer hover:underline flex items-center"
                                            onClick={() => openTab("Currency Rates", renderContentForTab("Currency Rates"))}
                                        >
                                            <i className="fas fa-dollar-sign mr-2"></i> Currency Rates
                                        </li>
                                        <li
                                            className="cursor-pointer hover:underline flex items-center"
                                            onClick={() => openTab("Ownership", renderContentForTab("Ownership"))}
                                        >
                                            <i className="fas fa-users mr-2"></i> Ownership
                                        </li>
                                    </ul>
                                )}
                            </li>

                            {/* Dropdown: Load */}
                            <li>
                                <p
                                    className="font-semibold cursor-pointer hover:underline flex items-center"
                                    onClick={() => toggleDropdown("Load")}
                                >
                                    <i className="fas fa-upload mr-2"></i> Load
                                </p>
                                {openDropdowns.has("Load") && (
                                    <ul className="pl-4 space-y-1">
                                        <li
                                            className="cursor-pointer hover:underline flex items-center"
                                            onClick={() => openTab("Load Data", renderContentForTab("Load Data"))}
                                        >
                                            <i className="fas fa-file-upload mr-2"></i> Data
                                        </li>
                                        <li
                                            className="cursor-pointer hover:underline flex items-center"
                                            onClick={() => openTab("Load Journals", renderContentForTab("Load Journals"))}
                                        >
                                            <i className="fas fa-book mr-2"></i> Journals
                                        </li>
                                    </ul>
                                )}
                            </li>

                            {/* Dropdown: Extract */}
                            <li>
                                <p
                                    className="font-semibold cursor-pointer hover:underline flex items-center"
                                    onClick={() => toggleDropdown("Extract")}
                                >
                                    <i className="fas fa-download mr-2"></i> Extract
                                </p>
                                {openDropdowns.has("Extract") && (
                                    <ul className="pl-4 space-y-1">
                                        <li
                                            className="cursor-pointer hover:underline flex items-center"
                                            onClick={() => openTab("Extract Data", renderContentForTab("Extract Data"))}
                                        >
                                            <i className="fas fa-file-download mr-2"></i> Data
                                        </li>
                                        <li
                                            className="cursor-pointer hover:underline flex items-center"
                                            onClick={() => openTab("Extract Journals", renderContentForTab("Extract Journals"))}
                                        >
                                            <i className="fas fa-journal-whills mr-2"></i> Journals
                                        </li>
                                    </ul>
                                )}
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Contenu principal avec onglets */}
                <div className="flex flex-col w-full h-full border border-primary rounded-r-lg">
                    <div className="flex bg-gray-200 px-2 pt-1 space-x-2 border-b border-primary rounded-tr-lg">
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
                                        e.stopPropagation();
                                        closeTab(tab.id);
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>

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
