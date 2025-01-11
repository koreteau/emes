import React, { useState } from "react";

export function CurrencyRates() {
    // États pour l'année et la période affichées dans les dropdowns
    const [selectedView, setSelectedView] = useState(true)
    const [selectedYear, setSelectedYear] = useState(localStorage.getItem("currencyYear") || new Date().getFullYear());
    const [selectedPeriod, setSelectedPeriod] = useState(localStorage.getItem("currencyPeriod") || "P01");

    // États pour l'année et la période de la dernière requête
    const [year, setYear] = useState(localStorage.getItem("currencyYear") || new Date().getFullYear());
    const [period, setPeriod] = useState(localStorage.getItem("currencyPeriod") || "P01");

    // Données et états pour les données récupérées
    const [data, setData] = useState(JSON.parse(localStorage.getItem("currencyData")) || []);
    const [groupedData, setGroupedData] = useState([]);
    const [loading, setLoading] = useState(false);

    const daysInMonth = new Date(year, parseInt(period.slice(1)), 0).getDate();

    // Fonction pour récupérer les données
    const fetchData = async (view) => {
        setLoading(true);
        if (view === "Period") {
            // On récupère les données pour une vue par année

        } else {
            // On récupère les données pour une vue par période
            try {
                const token = localStorage.getItem("authToken");
                const response = await fetch(`http://localhost:8080/api/exchange-rates?year=${selectedYear}&period=${selectedPeriod}`, {
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

                // Grouper les données par devise et par date
                const grouped = result.reduce((acc, entry) => {
                    const { to_currency, rate, effective_date } = entry;
                    const entryDateParts = effective_date.split("/"); // Format DD/MM/YYYY
                    const entryDate = new Date(`${entryDateParts[2]}-${entryDateParts[1]}-${entryDateParts[0]}`);
                    const startDate = new Date(`${selectedYear}-${String(parseInt(selectedPeriod.slice(1))).padStart(2, "0")}-01`);
                    const endDate = new Date(`${selectedYear}-${String(parseInt(selectedPeriod.slice(1))).padStart(2, "0")}-${daysInMonth}`);

                    if (entryDate >= startDate && entryDate <= endDate) {
                        if (!acc[to_currency]) {
                            acc[to_currency] = {};
                        }
                        acc[to_currency][effective_date] = rate;
                    }
                    return acc;
                }, {});
                setGroupedData(grouped);

                // Mettre à jour l'année et la période utilisées dans la requête
                setYear(selectedYear);
                setPeriod(selectedPeriod);
            } catch (error) {
                console.error("Erreur lors du chargement des données :", error);
                setData([]);
            } finally {
                setLoading(false);
            }
        }
    };

    // Sauvegarder les valeurs de year et period dans localStorage quand refresh est cliqué
    const handleRefresh = () => {
        fetchData(selectedView);
        localStorage.setItem("currencyYear", selectedYear);
        localStorage.setItem("currencyPeriod", selectedPeriod);
    };

    const labelBaseClass = "bg-blue-100";
    const cellBaseClass = "border border-slate-700 px-2 py-1";
    const columnWidth = "w-32";

    return (
        <>
            <div className="flex items-center p-2 border-b gap-2 text-sm">
                <div className="flex gap-2">
                    <button
                        onClick={handleRefresh}
                        className="p-0.5 rounded hover:bg-gray-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                    </button>
                </div>
                <div className="border-l-2 pl-2 flex gap-2">
                    <div>
                        <label htmlFor="view">Vue:</label>
                        <select id="view" value={selectedView} onChange={(e) => setSelectedView(e.target.value)}>
                            {["Period", "Day"].map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="year">Year:</label>
                        <select id="year" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                            {[2024, 2025, 2026].map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="period">Period:</label>
                        <select id="period" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
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
                <>
                    {(selectedView === "Period") ? (
                        /* Si la vue est en "Period" */
                        <div className="h-full w-full overflow-x-auto text-sm">
                            <table className="table-auto border-collapse border border-slate-500">
                                <thead>
                                    <tr>
                                        <th
                                            className={`border border-slate-600 px-4 py-2 ${labelBaseClass} sticky left-0 bg-white`}
                                        >
                                            Currency
                                        </th>
                                        {/* Les periodes de P01 à P12 */}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr key="EUR">
                                        <td
                                            className={`border border-slate-600 px-4 py-2 ${labelBaseClass} sticky left-0 bg-white`}
                                        >
                                            EUR
                                        </td>
                                        {Array.from({ length: daysInMonth }, (_, i) => (
                                            <td
                                                key={i}
                                                className={`${cellBaseClass} ${columnWidth} bg-green-100`}
                                            >
                                                1
                                            </td>
                                        ))}
                                    </tr>
                                    {/* les currency disponibles pour cette année (2 lignes par currency évidemment) */}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* Si la vue est en "Day" */
                        <div className="h-full w-full overflow-x-auto text-sm">
                            <table className="table-auto border-collapse border border-slate-500">
                                <thead>
                                    <tr>
                                        <th
                                            className={`border border-slate-600 px-4 py-2 ${labelBaseClass} sticky left-0 bg-white`}
                                        >
                                            Currency
                                        </th>
                                        {Array.from({ length: daysInMonth }, (_, i) => (
                                            <th
                                                key={i}
                                                className={`border border-slate-600 px-4 py-2 ${columnWidth} ${labelBaseClass}`}
                                            >
                                                {i + 1}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr key="EUR">
                                        <td
                                            className={`border border-slate-600 px-4 py-2 ${labelBaseClass} sticky left-0 bg-white`}
                                        >
                                            EUR
                                        </td>
                                        {Array.from({ length: daysInMonth }, (_, i) => (
                                            <td
                                                key={i}
                                                className={`${cellBaseClass} ${columnWidth} bg-green-100`}
                                            >
                                                1
                                            </td>
                                        ))}
                                    </tr>
                                    {Object.entries(groupedData).map(([currency, rates]) => (
                                        <tr key={currency}>
                                            <td
                                                className={`border border-slate-600 px-4 py-2 ${labelBaseClass} sticky left-0 bg-white`}
                                            >
                                                {currency}
                                            </td>
                                            {Array.from({ length: daysInMonth }, (_, i) => {
                                                const day = i + 1;
                                                const effectiveDate = `${String(day).padStart(
                                                    2,
                                                    "0"
                                                )}/${String(parseInt(period.slice(1))).padStart(
                                                    2,
                                                    "0"
                                                )}/${year}`;
                                                return (
                                                    <td
                                                        key={i}
                                                        className={`${cellBaseClass} ${columnWidth} ${rates[effectiveDate]
                                                            ? "bg-green-100"
                                                            : "bg-yellow-100"
                                                            }`}
                                                    >
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


            )}
        </>
    );
}