import React, { useState, useEffect } from "react";

export function CurrencyRates() {
    const [year, setYear] = useState(localStorage.getItem("currencyYear") || new Date().getFullYear());
    const [period, setPeriod] = useState(localStorage.getItem("currencyPeriod") || "P01");
    const [data, setData] = useState(JSON.parse(localStorage.getItem("currencyData")) || []); // Récupère les données depuis localStorage
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(false);
    const daysInMonth = new Date(year, parseInt(period.slice(1)), 0).getDate();

    // Fonction pour récupérer les données
    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("authToken");
            const response = await fetch("http://localhost:8080/api/exchange-rates", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Erreur ${response.status} : ${response.statusText}`);
            }

            const result = await response.json();
            setData(result); // Mise à jour directe des données
            localStorage.setItem("currencyData", JSON.stringify(result)); // Sauvegarde des données dans localStorage
        } catch (error) {
            console.error("Erreur lors du chargement des données :", error);
            setData([]); // Remet les données à vide en cas d'erreur
        } finally {
            setLoading(false);
        }
    };

    // Filtrage des données basées sur `year` et `period`
    useEffect(() => {
        const filtered = data.filter((entry) => {
            const entryDateParts = entry.effective_date.split("/"); // Format reçu : DD/MM/YYYY
            const entryDate = new Date(`${entryDateParts[2]}-${entryDateParts[1]}-${entryDateParts[0]}`); // Conversion en YYYY-MM-DD
            const startDate = new Date(`${year}-${String(parseInt(period.slice(1))).padStart(2, "0")}-01`);
            const endDate = new Date(`${year}-${String(parseInt(period.slice(1))).padStart(2, "0")}-${daysInMonth}`);
            return entryDate >= startDate && entryDate <= endDate;
        });
        setFilteredData(filtered);
    }, [data, year, period, daysInMonth]);

    // Sauvegarder les valeurs de year et period dans localStorage
    const handleYearChange = (newYear) => {
        setYear(newYear);
        localStorage.setItem("currencyYear", newYear);
    };

    const handlePeriodChange = (newPeriod) => {
        setPeriod(newPeriod);
        localStorage.setItem("currencyPeriod", newPeriod);
    };

    const labelBaseClass = "bg-blue-100"; // Base pour le style des labels
    const cellBaseClass = "border border-slate-700 px-2 py-1"; // Style des cellules
    const columnWidth = "w-32"; // Largeur fixe des colonnes

    return (
        <>
            <div className="flex items-center p-2 border-b gap-2 text-sm">
                <div className="flex gap-2">
                    <button
                        onClick={fetchData}
                        className="p-0.5 rounded hover:bg-gray-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                    </button>
                </div>
                <div className="border-l-2 pl-2 flex gap-2">
                    <div>
                        <label htmlFor="year" className="mr-2">Year:</label>
                        <select
                            id="year"
                            value={year}
                            onChange={(e) => handleYearChange(e.target.value)}
                            className="border rounded px-2 py-1"
                        >
                            {[2024, 2025, 2026].map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="period" className="mr-2">Period:</label>
                        <select
                            id="period"
                            value={period}
                            onChange={(e) => handlePeriodChange(e.target.value)}
                            className="border rounded px-2 py-1"
                        >
                            {Array.from({ length: 12 }, (_, i) => `P${String(i + 1).padStart(2, "0")}`).map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    Chargement...
                </div>
            ) : (
                <div className="h-full w-full overflow-x-auto">
                    <table className="table-auto border-collapse border border-slate-500">
                        <thead>
                            <tr>
                                <th className={`border border-slate-600 px-4 py-2 ${labelBaseClass}`}>Currency</th>
                                {Array.from({ length: daysInMonth }, (_, i) => (
                                    <th key={i} className={`border border-slate-600 px-4 py-2 ${columnWidth} ${labelBaseClass}`}>
                                        {i + 1}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className={`border border-slate-600 px-4 py-2 ${labelBaseClass}`}>EUR</td>
                                {Array.from({ length: daysInMonth }, (_, i) => (
                                    <td key={i} className={`${cellBaseClass} bg-green-100 ${columnWidth}`}>
                                        1
                                    </td>
                                ))}
                            </tr>
                            {filteredData.map((entry) => (
                                <tr key={entry.to_currency}>
                                    <td className={`border border-slate-600 px-4 py-2 ${labelBaseClass}`}>
                                        {entry.to_currency}
                                    </td>
                                    {Array.from({ length: daysInMonth }, (_, i) => {
                                        const day = i + 1;
                                        const effectiveDate = `${String(day).padStart(2, "0")}/${String(parseInt(period.slice(1))).padStart(
                                            2,
                                            "0"
                                        )}/${year}`;
                                        const value =
                                            entry.effective_date === effectiveDate ? entry.rate : "";
                                        return (
                                            <td
                                                key={i}
                                                className={`${cellBaseClass} ${columnWidth} ${value ? "bg-green-100" : "bg-yellow-100"
                                                    }`}
                                            >
                                                {value || ""}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
