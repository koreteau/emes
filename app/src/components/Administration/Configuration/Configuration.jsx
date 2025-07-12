import { useState } from "react";
import { SystemMessages } from "./SystemMessages";


export function Configuration() {
    const [openDropdowns, setOpenDropdowns] = useState(new Set()); // Dropdowns ouverts
    const [tabs, setTabs] = useState([{ id: 1, name: "Messages", content: <SystemMessages />, icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>}]);
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

    const openTab = (name, content, icon) => {
        const existingTab = tabs.find((tab) => tab.name === name);
        if (existingTab) {
            setActiveTab(existingTab.id);
        } else {
            const newTab = { id: Date.now(), name, content, icon };
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
            case "Messages":
                return <SystemMessages />;
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
                            {/* Dropdown: System */}
                            <li>
                                <p
                                    className="font-semibold cursor-pointer hover:underline flex items-center gap-1"
                                    onClick={() => toggleDropdown("System")}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
                                    </svg>
                                    System
                                </p>
                                {openDropdowns.has("System") && (
                                    <ul className="pl-4 space-y-1 pt-1">
                                        <li
                                            className="cursor-pointer hover:underline flex items-center gap-1"
                                            onClick={() => openTab("Messages", renderContentForTab("Messages"),
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                                                </svg>
                                            )}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                                            </svg>
                                            Messages
                                        </li>
                                    </ul>
                                )}
                            </li>
                        </ul >
                    </div>
                </div>

                {/* Contenu principal avec onglets */}
                <div className="flex flex-col w-[calc(100vw-204px)] h-100vw border border-primary rounded-r-lg">
                    <div className="flex bg-gray-200 px-2 pt-1 space-x-2 border-b border-primary rounded-tr-lg">
                        {tabs.map((tab) => (
                            <div
                                key={tab.id}
                                className={`flex items-center text-sm h-7 px-4 py-1 rounded-t cursor-pointer ${activeTab === tab.id ? "bg-white border border-b-0 border-primary" : "bg-gray-300"
                                    }`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <span className="flex items-center gap-2">
                                    {tab.icon}
                                    {tab.name}
                                </span>
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

                    <div className="flex-grow overflow-hidden relative">
                        <div className="h-full w-full overflow-x-auto overflow-y-auto">
                            {tabs.find((tab) => tab.id === activeTab)?.content || "No Content"}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}