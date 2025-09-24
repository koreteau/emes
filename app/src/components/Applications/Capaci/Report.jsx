import { useEffect, useState, useCallback } from "react";
import { SmallSpinner } from "../../Spinner";
import { PointOfView } from "./PointOfView";
import { resolveDimensionMembers } from "./utils/dimensionUtils";


const EXCLUDED_DIMENSIONS_SELECTION_MODE = new Set(["scenario", "year", "ICP", "value", "view"]);


const expandValuesFromSelection = (selection, dim, members) => {
    const resolved = new Set();
    for (const raw of selection || []) {
        if (!raw.includes("$[")) { resolved.add(raw); continue; }
        const [id, mode] = raw.split("$[");
        const cleanMode = mode.replace("]", "");
        if (cleanMode === "Only") {
            resolved.add(id);
        } else if (cleanMode === "Descendants") {
            const stack = [id];
            while (stack.length) {
                const cur = stack.pop(); resolved.add(cur);
                const children = members.filter(m => m.parent === cur).map(m => m.id);
                stack.push(...children);
            }
        } else if (cleanMode === "Base") {
            const stack = [id];
            while (stack.length) {
                const cur = stack.pop();
                const childMembers = members.filter(m => m.parent === cur);
                if (childMembers.length === 0) resolved.add(cur);
                else stack.push(...childMembers.map(m => m.id));
            }
        }
    }
    return Array.from(resolved);
};

const resolvePovSelection = (pov, dimensionData) => {
    const resolved = {};
    for (const [dim, rawVals] of Object.entries(pov || {})) {
        const members = dimensionData[dim]?.members || [];
        if (EXCLUDED_DIMENSIONS_SELECTION_MODE.has(dim)) {
            resolved[dim] = (rawVals || []).map(v => v.split("$[")[0]);
        } else {
            resolved[dim] = expandValuesFromSelection(rawVals, dim, members);
        }
    }
    return resolved;
};

const cartesianProduct = (arrays) =>
    arrays.reduce((acc, curr) => acc.flatMap(a => curr.map(b => [...a, b])), [[]]);

function ToolBarLite({ onRefresh, onExportPdf, onExportPng, disabled }) {
    return (
        <div className="flex gap-2 mb-3">
            <button className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300" onClick={onRefresh} disabled={disabled}>
                Rafraîchir
            </button>
            <button className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300" onClick={onExportPdf} disabled={disabled}>
                Export PDF
            </button>
            <button className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300" onClick={onExportPng} disabled={disabled}>
                Export PNG
            </button>
        </div>
    );
}

export function Report({ docId }) {
    const [definition, setDefinition] = useState(null); // { type, parameters, layout, sections }
    const [dimensionData, setDimensionData] = useState(null);
    const [currentPov, setCurrentPov] = useState(null);
    const [dataMapsBySection, setDataMapsBySection] = useState({}); // {secIndex: Map(key -> value)}
    const [axesBySection, setAxesBySection] = useState({}); // {secIndex: {rowItems, columnItems}}
    const [isLoadingData, setIsLoadingData] = useState(false);

    // 1) Charger la définition du rapport
    useEffect(() => {
        const fetchDefinition = async () => {
            const token = localStorage.getItem("authToken");
            const res = await fetch(`http://localhost:8080/api/documents/${docId}/content`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            setDefinition(json);
        };
        fetchDefinition();
    }, [docId]);

    // 2) Charger les dimensions
    useEffect(() => {
        const fetchDimensionData = async () => {
            const token = localStorage.getItem("authToken");
            const res = await fetch(`http://localhost:8080/api/dimensions/latest`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            setDimensionData(json);
        };
        fetchDimensionData();
    }, []);

    // 3) Construire les axes (par section de type table)
    useEffect(() => {
        if (!definition || !dimensionData) return;

        const parseStructureItem = (item) => {
            if (item.includes('=')) {
                const [dim, expr] = item.split('=');
                return { dim: dim.trim(), expr: expr.trim() };
            } else {
                return { dim: item.trim(), expr: null };
            }
        };

        const buildAxis = (axisList) => {
            const results = [];
            for (const item of axisList || []) {
                const { dim, expr } = parseStructureItem(item);
                const members = dimensionData[dim]?.members || [];

                if (expr) {
                    const resolved = resolveDimensionMembers(members, expr);
                    results.push({ dim, members: resolved.map(m => m.id) });
                } else {
                    results.push({ dim, members: members.map(m => m.id) });
                }
            }
            return results;
        };

        const newAxes = {};
        (definition.sections || []).forEach((sec, idx) => {
            if (sec.type !== "table") return;
            const rowItems = buildAxis(sec.source?.rows || []);
            const columnItems = buildAxis(sec.source?.columns || []);
            newAxes[idx] = { rowItems, columnItems };
        });
        setAxesBySection(newAxes);
    }, [definition, dimensionData]);

    // 4) Fetch data pour toutes les sections
    const fetchAllSectionsData = useCallback(async () => {
        if (!definition || !dimensionData || !currentPov) return;

        setIsLoadingData(true);
        const token = localStorage.getItem("authToken");
        const resolvedPov = resolvePovSelection(currentPov, dimensionData);

        const newMaps = {};

        for (const [idxStr, axes] of Object.entries(axesBySection)) {
            const secIndex = Number(idxStr);
            const { rowItems, columnItems } = axes;

            const rowCombos = cartesianProduct(rowItems.map(i => i.members));
            const colCombos = cartesianProduct(columnItems.map(i => i.members));
            const tempMap = new Map();

            for (const row of rowCombos) {
                for (const col of colCombos) {
                    const filter = { ...resolvedPov };
                    rowItems.forEach((it, i) => (filter[it.dim] = row[i]));
                    columnItems.forEach((it, i) => (filter[it.dim] = col[i]));

                    const params = new URLSearchParams();
                    Object.entries(filter).forEach(([k, v]) => { if (v) params.append(k, v); });

                    try {
                        const res = await fetch(`http://localhost:8080/api/data?${params.toString()}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        const json = await res.json();
                        if (json.length > 0) {
                            const key = [...row, ...col].join("|");
                            tempMap.set(key, json[0]);
                        }
                    } catch (err) {
                        console.error("❌ Erreur fetch cellule:", err.message);
                    }
                }
            }

            newMaps[secIndex] = tempMap;
        }

        setDataMapsBySection(newMaps);
        setIsLoadingData(false);
    }, [definition, dimensionData, currentPov, axesBySection]);

    useEffect(() => {
        if (definition && dimensionData && currentPov) {
            fetchAllSectionsData();
        }
    }, [definition, dimensionData, currentPov, fetchAllSectionsData]);

    const getCellValue = (secIndex, rowVals, colVals) => {
        const key = [...rowVals, ...colVals].join("|");
        return dataMapsBySection[secIndex]?.get(key)?.data_value || "";
        // Option: formatter selon sec.options.cellFormat
    };

    // Export via l’endpoint serveur
    const exportNow = async (fmt) => {
        if (!definition) return;
        const token = localStorage.getItem("authToken");
        const res = await fetch(`http://localhost:8080/api/documents/${docId}/render?format=${fmt}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ pov: currentPov || {} })
        });
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = definition?.name ? `${definition.name}.${fmt}` : `report.${fmt}`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (!definition || !dimensionData) return <SmallSpinner />;

    return (
        <div>
            {definition?.parameters && (
                <PointOfView
                    parameters={definition.parameters}
                    structure={{}} // pour compat, pas utilisé en report
                    dimensionData={dimensionData}
                    onChangePov={(pov) => setCurrentPov(pov)}
                />
            )}

            <ToolBarLite
                onRefresh={fetchAllSectionsData}
                onExportPdf={() => exportNow("pdf")}
                onExportPng={() => exportNow("png")}
                disabled={!currentPov || isLoadingData}
            />

            {isLoadingData ? (
                <SmallSpinner />
            ) : (
                (definition.sections || []).map((sec, idx) => {
                    if (sec.type === "title") {
                        let txt = sec.text || "";
                        if (currentPov?.year?.length) txt = txt.replace("{year}", currentPov.year[0].split("$[")[0]);
                        if (currentPov?.scenario?.length) txt = txt.replace("{scenario}", currentPov.scenario[0].split("$[")[0]);
                        return (
                            <div key={`sec-${idx}`} className="mb-3">
                                <h1 className="text-lg font-semibold">{txt}</h1>
                            </div>
                        );
                    }
                    if (sec.type === "table") {
                        const axes = axesBySection[idx];
                        if (!axes) return null;
                        const { rowItems, columnItems } = axes;
                        const rows = rowItems.length ? cartesianProduct(rowItems.map(i => i.members)) : [];
                        const cols = columnItems.length ? cartesianProduct(columnItems.map(i => i.members)) : [];
                        return (
                            <div key={`sec-${idx}`} className="overflow-x-auto mb-6">
                                {sec.title && <div className="mb-1 font-semibold">{sec.title}</div>}
                                <table className="table-auto border-collapse border border-gray-500 text-xs w-full">
                                    <thead>
                                        <tr>
                                            {rowItems.map((it, i) => (
                                                <th key={`rhead-${i}`} className="border border-gray-700 bg-gray-200 font-bold px-2 py-2 text-left whitespace-nowrap">
                                                    {it.dim}
                                                </th>
                                            ))}
                                            {cols.map((colVals, cIdx) => (
                                                <th key={`chead-${cIdx}`} className="border border-gray-700 bg-gray-200 font-bold px-2 py-2 text-center whitespace-nowrap">
                                                    {colVals.join(" / ")}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((rowVals, rIdx) => (
                                            <tr key={`row-${rIdx}`}>
                                                {rowVals.map((v, i) => (
                                                    <td key={`lbl-${i}`} className="border border-gray-300 px-2 py-1 font-medium whitespace-nowrap">
                                                        {v}
                                                    </td>
                                                ))}
                                                {cols.map((colVals, cIdx) => (
                                                    <td key={`cell-${rIdx}-${cIdx}`} className="border border-gray-300 text-center px-2 py-1">
                                                        {getCellValue(idx, rowVals, colVals)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    }
                    return null;
                })
            )}
        </div>
    );
}
