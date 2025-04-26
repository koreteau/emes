import React, { useEffect, useState, useCallback } from "react";
import { SmallSpinner } from "../../Spinner";
import { ToolBar } from "./ToolBar";
import { PointOfView } from "./PointOfView";
import { resolveDimensionMembers } from "./utils/dimensionUtils";

export function Webform({ docId }) {
    const [currentPov, setCurrentPov] = useState(null);
    const [webformData, setWebformData] = useState(null);
    const [dimensionData, setDimensionData] = useState(null);
    const [rowItems, setRowItems] = useState([]);
    const [columnItems, setColumnItems] = useState([]);
    const [dataMap, setDataMap] = useState(new Map());
    const [isLoadingData, setIsLoadingData] = useState(false);


    useEffect(() => {
        const fetchDefinition = async () => {
            const token = localStorage.getItem("authToken");
            const res = await fetch(`http://localhost:8080/api/documents/${docId}/content`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            setWebformData(json);
        };
        fetchDefinition();
    }, [docId]);

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

    useEffect(() => {
        if (!webformData || !dimensionData) return;

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
            for (const item of axisList) {
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

        setRowItems(buildAxis(webformData.structure.rows));
        setColumnItems(buildAxis(webformData.structure.columns));
    }, [webformData, dimensionData]);

    const fetchDataMap = useCallback(async () => {
        if (!rowItems.length || !columnItems.length || !currentPov) return;

        setIsLoadingData(true);

        const token = localStorage.getItem("authToken");
        const tempMap = new Map();

        const cartesianProduct = (arrays) => {
            return arrays.reduce((acc, curr) =>
                acc.flatMap(a => curr.map(b => [...a, b])), [[]]);
        };

        const rowCombos = cartesianProduct(rowItems.map(item => item.members));
        const colCombos = cartesianProduct(columnItems.map(item => item.members));

        for (const row of rowCombos) {
            for (const col of colCombos) {
                const filter = { ...currentPov };

                rowItems.forEach((item, idx) => {
                    filter[item.dim] = row[idx];
                });
                columnItems.forEach((item, idx) => {
                    filter[item.dim] = col[idx];
                });

                const params = new URLSearchParams();
                Object.entries(filter).forEach(([k, v]) => {
                    if (v) params.append(k, v);
                });

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

        setDataMap(tempMap);
        setIsLoadingData(false);
    }, [rowItems, columnItems, currentPov]);

    useEffect(() => {
        if (rowItems.length && columnItems.length && currentPov) {
            fetchDataMap();
        }
    }, [rowItems, columnItems, currentPov, fetchDataMap]);

    const getCellValue = (rowVals, colVals) => {
        const key = [...rowVals, ...colVals].join("|");
        return dataMap.get(key)?.data_value || "";
    };

    if (!webformData || !dimensionData) return <SmallSpinner />;

    const cartesianProduct = (arrays) => {
        return arrays.reduce((acc, curr) => acc.flatMap(a => curr.map(b => [...a, b])), [[]]);
    };

    const rows = rowItems.length ? cartesianProduct(rowItems.map(item => item.members)) : [];
    const cols = columnItems.length ? cartesianProduct(columnItems.map(item => item.members)) : [];

    return (
        <div>
            <ToolBar
                onRefresh={fetchDataMap}
                onCalculate={() => console.log("📊 Calculate clicked")}
                onSave={() => console.log("💾 Save clicked")}
            />

            {webformData?.parameters && (
                <PointOfView
                    parameters={webformData.parameters}
                    structure={webformData.structure}
                    dimensionData={dimensionData}
                    onChangePov={(pov) => setCurrentPov(pov)}
                />
            )}

            {isLoadingData ? (
                <SmallSpinner />
            ) : (
                <div className="overflow-x-auto">
                    <table className="table-auto border-collapse border border-gray-500 text-xs">
                        <thead>
                            <tr>
                                {rowItems.map((item, idx) => (
                                    <th
                                        key={`rhead-${idx}`}
                                        className="border border-gray-700 bg-gray-200 font-bold px-2 py-2 min-w-[80px] text-left whitespace-nowrap"
                                    >
                                        {item.dim}
                                    </th>
                                ))}
                                {cols.map((colVals, colIdx) => (
                                    <th
                                        key={`chead-${colIdx}`}
                                        className="border border-gray-700 bg-gray-200 font-bold px-2 py-2 min-w-[80px] text-center whitespace-nowrap"
                                    >
                                        {colVals.join(" / ")}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((rowVals, rowIdx) => (
                                <tr key={`rbody-${rowIdx}`}>
                                    {rowVals.map((val, idx) => (
                                        <td
                                            key={`rbodylabel-${idx}`}
                                            className="border border-gray-300 px-2 py-1 font-medium"
                                        >
                                            {val}
                                        </td>
                                    ))}
                                    {cols.map((colVals, colIdx) => (
                                        <td
                                            key={`rcell-${rowIdx}-${colIdx}`}
                                            className="border border-gray-300 text-center px-2 py-1"
                                        >
                                            {getCellValue(rowVals, colVals)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
