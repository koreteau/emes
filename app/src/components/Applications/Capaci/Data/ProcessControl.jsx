import React, { useEffect, useState, useMemo, useCallback } from "react";
import { PointOfView } from "./../PointOfView";

export function ProcessControl() {
    const [pov, setPov] = useState({});
    const [dimensionData, setDimensionData] = useState(null);
    const [statusTree, setStatusTree] = useState([]);
    const [error, setError] = useState(null);

    const token = localStorage.getItem("authToken");

    const isPovReady = useMemo(() => {
        return ["scenario", "year", "period", "entity"].every(k => pov[k]);
    }, [pov]);

    useEffect(() => {
        const fetchDimensions = async () => {
            const res = await fetch("http://localhost:8080/api/dimensions/latest", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            setDimensionData(json);
        };
        fetchDimensions();
    }, [token]);

    const fetchStatusTree = useCallback(async () => {
        if (!isPovReady) return;
        setError(null);

        const params = new URLSearchParams(pov);

        try {
            const res = await fetch(`http://localhost:8080/api/process-control/status-tree?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Erreur API statut arbre");
            const json = await res.json();
            setStatusTree(sortTree(json));
        } catch (err) {
            setError(err.message);
        }
    }, [pov, token, isPovReady]);

    useEffect(() => {
        fetchStatusTree();
    }, [fetchStatusTree]);

    const povParams = useMemo(() => ({
        scenario: { isActivated: true, default: "ACT" },
        year: { isActivated: true, default: "2025" },
        period: { isActivated: true, default: "P01" },
        entity: { isActivated: true, default: "CC" }
    }), []);

    const povStructure = useMemo(() => ({ rows: [], columns: [] }), []);

    const sortTree = (nodes) => {
        const byId = Object.fromEntries(nodes.map(n => [n.id, { ...n, children: [] }]));
        nodes.forEach(n => {
            if (n.parent && byId[n.parent]) {
                byId[n.parent].children.push(byId[n.id]);
            }
        });

        const sortFn = (a, b) => a.label.localeCompare(b.label, undefined, { numeric: true });

        const sortRecursively = (node) => {
            node.children.sort(sortFn);
            node.children.forEach(sortRecursively);
        };

        const root = pov.entity && byId[pov.entity] ? byId[pov.entity] : null;
        if (!root) return [];

        sortRecursively(root);

        const flatten = (node) => [node, ...node.children.flatMap(flatten)];
        return flatten(root);
    };

    return (
        <div>
            <PointOfView
                parameters={povParams}
                structure={povStructure}
                dimensionData={dimensionData}
                onChangePov={setPov}
            />

            {error && <div className="text-red-600">❌ {error}</div>}

            <div className="overflow-x-auto">
                <table className="table-auto border-collapse border border-gray-500 text-xs">
                    <thead className="bg-gray-300">
                        <tr>
                            <th className="border px-4 py-1 text-center"></th>
                            <th className="border px-4 py-1 text-center">Calc Status</th>
                            <th className="border px-4 py-1 text-center">Journal Status</th>
                            <th className="border px-4 py-1 text-center">Review Level</th>
                        </tr>
                    </thead>
                    <tbody>
                        {statusTree.map((node) => {
                            let rowBg = "";
                            switch (node.calcStatus) {
                                case "noData":
                                    rowBg = "bg-gray-100";
                                    break;
                                case "calcNeeded":
                                    rowBg = "bg-yellow-100";
                                    break;
                                case "consoNeeded":
                                    rowBg = "bg-orange-100";
                                    break;
                                case "upToDate":
                                    rowBg = "bg-green-100";
                                    break;
                                default:
                                    rowBg = "";
                            }

                            return (
                                <tr key={node.id}>
                                    <td className="border px-4 py-1 bg-grey-300" style={{ paddingLeft: `${node.level * 20}px` }}>
                                        {node.label}
                                    </td>
                                    <td className={`border px-4 py-1 min-w-[120px] ${rowBg}`}>
                                        {node.calcStatus === "noData" && (
                                            <div className="flex items-center justify-center">NO DATA</div>
                                        )}
                                        {node.calcStatus === "calcNeeded" && (
                                            <div className="flex items-center justify-center">CN</div>
                                        )}
                                        {node.calcStatus === "consoNeeded" && (
                                            <div className="flex items-center justify-center">CN</div>
                                        )}
                                        {node.calcStatus === "upToDate" && (
                                            <div className="flex items-center justify-center">OK</div>
                                        )}
                                    </td>
                                    <td className={`border px-4 py-1 min-w-[120px] ${rowBg}`}>
                                        {node.journalStatus === "unPosted" && (
                                            <div className="text-red-600 flex items-center justify-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                                </svg>
                                                {node.unpostedCount}
                                            </div>
                                        )}
                                        {node.journalStatus === "posted" && (
                                            <div className="flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="green" className="size-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                                </svg>
                                            </div>
                                        )}
                                        {node.journalStatus === "none" && (
                                            <div className="flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="green" className="size-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                                </svg>
                                            </div>
                                        )}
                                    </td>
                                    <td className={`border px-4 py-1 min-w-[120px] ${rowBg}`}>
                                        {node.reviewLevel || ""}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}