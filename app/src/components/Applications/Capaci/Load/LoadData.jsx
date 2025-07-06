import React, { useEffect, useState, useMemo } from "react";
import { PointOfView } from "../PointOfView";
import Papa from "papaparse";

export function DataLoad() {
    const [dimensionData, setDimensionData] = useState(null);
    const [currentPov, setCurrentPov] = useState({});
    const [csvFile, setCsvFile] = useState(null);

    useEffect(() => {
        const fetchDimensions = async () => {
            const token = localStorage.getItem("authToken");
            const res = await fetch("http://localhost:8080/api/dimensions/latest", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            setDimensionData(json);
        };
        fetchDimensions();
    }, []);

    const handleDownload = async () => {
        const token = localStorage.getItem("authToken");
        const params = new URLSearchParams();
        Object.entries(currentPov).forEach(([key, value]) => {
            if (value && value !== "[None]") {
                params.append(key, value);
            }
        });

        const res = await fetch(`http://localhost:8080/api/staged-data?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const json = await res.json();
        if (!Array.isArray(json) || json.length === 0) return alert("Aucune donnée à exporter.");

        // Remap data_value -> numeric pour le CSV
        const csv = Papa.unparse(json.map(row => ({
            ...row,
            numeric: row.data_value
        })), {
            columns: [
                "scenario", "year", "period", "entity", "account",
                "custom1", "custom2", "custom3", "custom4", "icp",
                "view", "value", "numeric"
            ]
        });

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "staged-data-export.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleCsvChange = (e) => {
        setCsvFile(e.target.files[0]);
    };

    const handleUpload = () => {
        if (!csvFile) return;
        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const rows = results.data.map(row => ({
                    ...row,
                    data_value: parseFloat(row.numeric),
                }));
                const token = localStorage.getItem("authToken");
                const res = await fetch("http://localhost:8080/api/staged-data", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ rows })
                });
                const json = await res.json();
                if (res.ok) {
                    alert(`✅ Données importées avec succès (${json.count} lignes).`);
                } else {
                    alert(`❌ Erreur lors de l'import: ${json.error}`);
                }
            }
        });
    };

    const fakeParameters = useMemo(() => ({
        scenario: { isActivated: true },
        year: { isActivated: true },
        period: { isActivated: true },
        entity: { isActivated: true },
        account: { isActivated: true },
        value: { isActivated: true },
        custom1: { isActivated: true },
        custom3: { isActivated: true }
    }), []);

    return (
        <div>
            <h1 className="text-lg font-bold p-3">Load Data</h1>

            <PointOfView
                parameters={fakeParameters}
                structure={{ rows: [], columns: [] }}
                dimensionData={dimensionData}
                onChangePov={setCurrentPov}
            />

            <div className="p-3 flex gap-4 items-center">
                <button
                    onClick={handleDownload}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    ⬇️ Export CSV
                </button>

                <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvChange}
                    className="border px-2 py-1"
                />
                <button
                    onClick={handleUpload}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                    ⬆️ Import CSV
                </button>
            </div>
        </div>
    );
}



// import { Button, Dialog, DialogHeader, DialogBody, DialogFooter } from "@material-tailwind/react";