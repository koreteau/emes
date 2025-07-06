import { useEffect, useState, useMemo } from "react";
import { PointOfView } from "../PointOfView";
import Papa from "papaparse";

const EXCLUDED_DIMENSIONS_SELECTION_MODE = new Set(["scenario", "year", "ICP", "value", "view"]);

export function ExtractData() {
    const [dimensionData, setDimensionData] = useState(null);
    const [currentPov, setCurrentPov] = useState({});
    const [showModal, setShowModal] = useState(false);
    const [progress, setProgress] = useState(0);
    const [downloadUrl, setDownloadUrl] = useState(null);

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

    const expandValuesFromSelection = (selection, dim, members) => {
        const resolved = new Set();
        for (const raw of selection || []) {
            if (!raw.includes("$[")) {
                resolved.add(raw);
                continue;
            }

            const [id, mode] = raw.split("$[");
            const cleanMode = mode.replace("]", "");

            if (cleanMode === "Only") {
                resolved.add(id);
            } else if (cleanMode === "Descendants") {
                const stack = [id];
                while (stack.length > 0) {
                    const current = stack.pop();
                    resolved.add(current);
                    const children = members.filter(m => m.parent === current).map(m => m.id);
                    stack.push(...children);
                }
            } else if (cleanMode === "Base") {
                const stack = [id];
                while (stack.length > 0) {
                    const current = stack.pop();
                    const childMembers = members.filter(m => m.parent === current);
                    if (childMembers.length === 0) {
                        resolved.add(current);
                    } else {
                        stack.push(...childMembers.map(m => m.id));
                    }
                }
            }
        }
        return Array.from(resolved);
    };

    const resolvePovSelection = (pov) => {
        const resolved = {};
        for (const [dim, rawVals] of Object.entries(pov)) {
            const members = dimensionData?.[dim]?.members || [];
            if (EXCLUDED_DIMENSIONS_SELECTION_MODE.has(dim)) {
                resolved[dim] = rawVals;
            } else {
                resolved[dim] = expandValuesFromSelection(rawVals, dim, members);
            }
        }
        return resolved;
    };

    const generateCombinations = (resolvedPov, dimensions) => {
        const recurse = (index, current) => {
            if (index === dimensions.length) return [current];
            const dim = dimensions[index];
            const values = resolvedPov[dim] || [];
            return values.flatMap(val =>
                recurse(index + 1, { ...current, [dim]: val })
            );
        };
        return recurse(0, {});
    };

    const handleDownload = async () => {
        setShowModal(true);
        setProgress(0);
        setDownloadUrl(null);

        const token = localStorage.getItem("authToken");
        const resolvedPov = resolvePovSelection(currentPov);
        const dimensions = Object.keys(resolvedPov);
        const combinations = generateCombinations(resolvedPov, dimensions);

        const total = combinations.length;
        let allData = [];

        for (let i = 0; i < total; i++) {
            const combo = combinations[i];
            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(combo)) {
                if (value && value !== "[None]") {
                    params.append(key, value);
                }
            }

            const url = `http://localhost:8080/api/staged-data?${params.toString()}`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();

            if (Array.isArray(json)) {
                allData.push(...json);
            }

            setProgress(Math.round(((i + 1) / total) * 100));
        }

        if (allData.length === 0) {
            alert("Aucune donnée à exporter.");
            setShowModal(false);
            return;
        }

        const csv = Papa.unparse(
            allData.map(row => ({
                scenario: row.scenario,
                year: row.year,
                period: row.period,
                entity: row.entity,
                account: row.account,
                custom1: row.custom1,
                custom2: row.custom2,
                custom3: row.custom3,
                custom4: row.custom4,
                icp: row.icp,
                view: row.view,
                value: row.value,
                numeric: row.data_value
            }))
        );

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
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
            <h1 className="text-lg font-bold p-3">Extract Data</h1>

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
                    Extract
                </button>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-lg w-96 text-center">
                        <h2 className="text-lg font-semibold mb-4">Extract running</h2>
                        <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                            <div
                                className="bg-blue-600 h-4 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-sm text-gray-700 mb-4">{progress}% done</p>

                        {downloadUrl && (
                            <a
                                href={downloadUrl}
                                download="staged-data-export.csv"
                                className="mt-4 inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                onClick={() => {
                                    setShowModal(false);
                                    setDownloadUrl(null);
                                }}
                            >
                                Download Extract
                            </a>
                        )}

                        {!downloadUrl && (
                            <button
                                className="mt-2 text-xs text-gray-500 hover:underline"
                                onClick={() => setShowModal(false)}
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}