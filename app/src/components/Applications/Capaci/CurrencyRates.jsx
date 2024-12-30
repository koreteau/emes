import React, { useState, useEffect } from "react";

export function CurrencyRates() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [period, setPeriod] = useState("P01");
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(false);
    const daysInMonth = new Date(year, parseInt(period.slice(1)), 0).getDate();

    // Fonction pour convertir une date UTC en heure locale (Paris)
    const convertToParisTime = (utcDate) => {
        const options = { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" };
        const parisDate = new Intl.DateTimeFormat("en-CA", options).format(new Date(utcDate)); // Format YYYY-MM-DD
        return parisDate; // Retourne la date au format "2024-12-30"
    };

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
            // Conversion des dates en heure locale (Paris)
            const adjustedData = result.map((entry) => ({
                ...entry,
                effective_date: convertToParisTime(entry.effective_date),
            }));
            setData(adjustedData);
        } catch (error) {
            console.error("Erreur lors du chargement des données :", error);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const filtered = data.filter((entry) => {
            const entryDate = new Date(entry.effective_date);
            const startDate = new Date(`${year}-${String(parseInt(period.slice(1))).padStart(2, "0")}-01`);
            const endDate = new Date(`${year}-${String(parseInt(period.slice(1))).padStart(2, "0")}-${daysInMonth}`);
            return entryDate >= startDate && entryDate <= endDate;
        });
        setFilteredData(filtered);
    }, [data, year, period, daysInMonth]);

    const labelBaseClass = "bg-blue-100 font-bold"; // Base pour le style des labels
    const cellBaseClass = "border border-slate-700 px-2 py-1"; // Style des cellules
    const columnWidth = "w-24"; // Largeur fixe des colonnes

    return (
        <>
            <div className="flex items-center space-x-4 p-4 border-b">
                <div>
                    <label htmlFor="year" className="mr-2">Year:</label>
                    <select
                        id="year"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
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
                        onChange={(e) => setPeriod(e.target.value)}
                        className="border rounded px-2 py-1"
                    >
                        {Array.from({ length: 12 }, (_, i) => `P${String(i + 1).padStart(2, "0")}`).map((p) => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={fetchData}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    Chargement...
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="table-auto border-collapse border border-slate-500 w-full">
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
                                <tr key={entry.from_currency}>
                                    <td className={`border border-slate-600 px-4 py-2 ${labelBaseClass}`}>
                                        {entry.to_currency}
                                    </td>
                                    {Array.from({ length: daysInMonth }, (_, i) => {
                                        const day = i + 1;
                                        const effectiveDate = `${year}-${String(parseInt(period.slice(1))).padStart(
                                            2,
                                            "0"
                                        )}-${String(day).padStart(2, "0")}`;
                                        const value =
                                            entry.effective_date === effectiveDate ? entry.rate : "";
                                        return (
                                            <td
                                                key={i}
                                                className={`${cellBaseClass} ${columnWidth} ${
                                                    value ? "bg-green-100" : "bg-yellow-100"
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
