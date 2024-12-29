import { useState } from "react";
import { Dialog } from "@material-tailwind/react";

export function Navbar({ onLogout, openTab }) {
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [activeSubDropdown, setActiveSubDropdown] = useState(null);

    const toggleDropdown = (dropdown) => {
        setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
    };

    const toggleSubDropdown = (dropdown) => {
        setActiveSubDropdown(activeSubDropdown === dropdown ? null : dropdown);
    };

    const dropdownItems = {
        navigate: {
            Applications: ["Alexandria Inventory", "Bespin Cloud", "Capaci Finance"],
            "Shared Services": ["Administration", "Data"],
        },
        preferences: ["Settings", "Theme", "Language"],
        help: ["Infos", "Support"],
    };

    const handleItemClick = (item) => {
        console.log(`Clicked on: ${item}`); // Ajout d'un log pour vérifier les clics
        if (item === "Infos") {
            setIsDialogOpen(true);
        } else {
            openTab(item, <div>{item} Content</div>);
        }
        setActiveDropdown(false)
    };

    return (
        <>
            <nav className="bg-primary text-white py-2 px-4 shadow-lg flex justify-between items-center text-sm">
                {/* Left side: Home Button and Dropdowns */}
                <ul className="flex space-x-6">
                    {/* Home Button */}
                    <li>
                        <button
                            className="flex items-center space-x-2 hover:underline focus:outline-none"
                            onClick={() => openTab("Home", <div>Home Content</div>)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.3" stroke="currentColor" class="size-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                            </svg>
                        </button>
                    </li>

                    {/* Navigate Dropdown */}
                    <li className="relative">
                        <button
                            className="hover:underline focus:outline-none"
                            onClick={() => toggleDropdown("navigate")}
                        >
                            Navigate
                        </button>
                        {activeDropdown === "navigate" && (
                            <ul className="absolute bg-white text-black mt-2 py-2 shadow-lg rounded w-40">
                                {Object.keys(dropdownItems.navigate).map((key) => (
                                    <li
                                        key={key}
                                        className="px-4 py-2 hover:bg-gray-200 cursor-pointer relative"
                                        onClick={() => toggleSubDropdown(key)}
                                    >
                                        {key}
                                        {activeSubDropdown === key && (
                                            <ul className="absolute bg-white text-black left-full top-0 mt-[-8px] py-2 shadow-lg rounded w-48">
                                                {dropdownItems.navigate[key].map((subItem) => (
                                                    <li
                                                        key={subItem}
                                                        className="px-4 py-2 hover:bg-gray-200 cursor-pointer"
                                                        onClick={() => handleItemClick(subItem)}
                                                    >
                                                        {subItem}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </li>

                    {/* Other Dropdowns */}
                    {["preferences", "help"].map((key) => (
                        <li key={key} className="relative">
                            <button
                                className="hover:underline focus:outline-none"
                                onClick={() => toggleDropdown(key)}
                            >
                                {key.charAt(0).toUpperCase() + key.slice(1)}
                            </button>
                            {activeDropdown === key && (
                                <ul className="absolute bg-white text-black mt-2 py-2 shadow-lg rounded w-40">
                                    {dropdownItems[key].map((item) => (
                                        <li
                                            key={item}
                                            className="px-4 py-2 hover:bg-gray-200 cursor-pointer"
                                            onClick={() => handleItemClick(item)}
                                        >
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>

                {/* Right side: Logout Button */}
                <button className="text-white hover:underline" onClick={onLogout}>
                    Logout
                </button>
            </nav>

            {/* Dialog for Infos */}
            {isDialogOpen && (
                <Dialog
                    open={isDialogOpen}
                    handler={() => setIsDialogOpen(false)}
                    className="p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto"
                >
                    <h3 className="text-xl font-bold mb-4">Application Information</h3>
                    <p>
                        SYNAPS. ecosystem, an Enterprise Performance Management Solution
                        designed to help you manage your business data efficiently.
                    </p>
                    <p className="mt-4">
                        Version: 1.1.0 <br />
                        Your company contact: corto.colloc@epitech.digital
                    </p>
                    <button
                        className="mt-6 bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
                        onClick={() => setIsDialogOpen(false)}
                    >
                        Close
                    </button>
                </Dialog>
            )}
        </>
    );
}