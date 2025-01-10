// Changer le principe de récupération des données et ajouter une route dans l'API avec 2 paramètres (year et period) pour charger qu'un mois à la fois. quand on change les dropdown il faut cliquer sur refresh pour charger les valeurs du mois séléctionné
// Régler le pb de front (largeur de component)
import React, { useState, useEffect } from "react";

export function CurrencyRates() {
    const [year, setYear] = useState(localStorage.getItem("currencyYear") || new Date().getFullYear());
    const [period, setPeriod] = useState(localStorage.getItem("currencyPeriod") || "P01");
    const [data, setData] = useState(JSON.parse(localStorage.getItem("currencyData")) || []);
    const [groupedData, setGroupedData] = useState([]);
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
            setData(result);
            localStorage.setItem("currencyData", JSON.stringify(result));
        } catch (error) {
            console.error("Erreur lors du chargement des données :", error);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    // Grouper les données par devise et par date
    useEffect(() => {
        const grouped = data.reduce((acc, entry) => {
            const { to_currency, rate, effective_date } = entry;
            const entryDateParts = effective_date.split("/"); // Format DD/MM/YYYY
            const entryDate = new Date(`${entryDateParts[2]}-${entryDateParts[1]}-${entryDateParts[0]}`);
            const startDate = new Date(`${year}-${String(parseInt(period.slice(1))).padStart(2, "0")}-01`);
            const endDate = new Date(`${year}-${String(parseInt(period.slice(1))).padStart(2, "0")}-${daysInMonth}`);

            if (entryDate >= startDate && entryDate <= endDate) {
                if (!acc[to_currency]) {
                    acc[to_currency] = {};
                }
                acc[to_currency][effective_date] = rate;
            }
            return acc;
        }, {});
        setGroupedData(grouped);
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

    const labelBaseClass = "bg-blue-100";
    const cellBaseClass = "border border-slate-700 px-2 py-1";
    const columnWidth = "w-32";

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
                        <label htmlFor="year">Year:</label>
                        <select id="year" value={year} onChange={(e) => handleYearChange(e.target.value)}>
                            {[2024, 2025, 2026].map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="period">Period:</label>
                        <select id="period" value={period} onChange={(e) => handlePeriodChange(e.target.value)}>
                            {Array.from({ length: 12 }, (_, i) => `P${String(i + 1).padStart(2, "0")}`).map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">Chargement...</div>
            ) : (
                <div className="h-full w-full overflow-x-auto text-sm">
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
                            <tr key="EUR">
                                <td className={`border border-slate-600 px-4 py-2 ${labelBaseClass}`}>EUR</td>
                                {Array.from({ length: daysInMonth }, (_, i) => (
                                    <td key={i} className={`${cellBaseClass} ${columnWidth} bg-green-100`}>1</td>
                                ))}
                            </tr>
                            {Object.entries(groupedData).map(([currency, rates]) => (
                                <tr key={currency}>
                                    <td className={`border border-slate-600 px-4 py-2 ${labelBaseClass}`}>{currency}</td>
                                    {Array.from({ length: daysInMonth }, (_, i) => {
                                        const day = i + 1;
                                        const effectiveDate = `${String(day).padStart(2, "0")}/${String(parseInt(period.slice(1))).padStart(
                                            2,
                                            "0"
                                        )}/${year}`;
                                        return (
                                            <td key={i} className={`${cellBaseClass} ${columnWidth} ${rates[effectiveDate] ? "bg-green-100" : "bg-yellow-100"}`}>
                                                {rates[effectiveDate] || ""}
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
