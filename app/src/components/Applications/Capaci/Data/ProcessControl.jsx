import { useEffect, useState, useMemo, useCallback } from "react";
import { PointOfView } from "./../PointOfView";
import { ToolBar } from "./../ToolBar";
import { SmallSpinner } from "../../../Spinner";

export function ProcessControl() {
    const [pov, setPov] = useState({});
    const [dimensionData, setDimensionData] = useState(null);
    const [statusTree, setStatusTree] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState(null);

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
        setLoading(true);

        const params = new URLSearchParams(pov);

        try {
            const res = await fetch(`http://localhost:8080/api/process-control/status-tree?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Erreur API statut arbre");
            const json = await res.json();
            setStatusTree(sortTree(json));
        } finally {
            setLoading(false);
        }
    }, [pov, token, isPovReady]);

    useEffect(() => {
        fetchStatusTree();
    }, [fetchStatusTree]);

    const handleRefresh = () => {
        fetchStatusTree();
    };

    const cleanPovValue = (val) => {
        if (Array.isArray(val)) {
            val = val[0]; // ne prendre que la première valeur
        }
        if (!val || typeof val !== "string") return val;
        const match = val.match(/^(.*?)\$?\[.*\]$/);
        return match ? match[1] : val;
    };


    const handleApiCall = async (type) => {
        if (!selectedEntity) {
            alert("Please select a valid entity.");
            return;
        }

        const { scenario, year, period } = pov;
        const baseUrl = "http://localhost:8080/api/functions";

        const endpointMap = {
            calculate: "calculate",
            raise: "raise-data",
            rollup: "rollup"
        };

        const url = `${baseUrl}/${endpointMap[type]}?scenario=${scenario}&year=${year}&period=${cleanPovValue(period)}&entity=${selectedEntity}`;
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            const result = await res.json();
            alert(`Réponse API (${type}) : ${JSON.stringify(result)}`);
        } catch (err) {
            alert(`Erreur API (${type}) : ${err.message}`);
        }
    };

    const handleCalculate = () => handleApiCall("calculate");
    const handleRaiseData = () => handleApiCall("raise");
    const handleRollup = () => handleApiCall("rollup");

    const povParams = useMemo(() => ({
        scenario: { isActivated: true, default: "ACT" },
        year: { isActivated: true, default: "2025" },
        period: { isActivated: true, default: "P01$[Only]" },
        entity: { isActivated: true, default: "CC$[Descendants]" }
    }), []);

    const povStructure = useMemo(() => ({ rows: [], columns: [] }), []);

    const sortTree = (nodes) => {
        const cleanEntityId = (raw) => {
            if (!raw || typeof raw !== "string") return "";
            const match = raw.match(/^(.*?)\$?\[.*\]$/);
            return match ? match[1] : raw;
        };

        const rawEntity = Array.isArray(pov.entity) ? pov.entity[0] : pov.entity;
        const rootId = cleanEntityId(rawEntity);

        const byId = Object.fromEntries(nodes.map(n => [n.id, { ...n, children: [] }]));

        nodes.forEach(n => {
            if (n.parent && byId[n.parent]) {
                byId[n.parent].children.push(byId[n.id]);
            }
        });

        const sortRecursively = (node) => {
            node.children.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
            node.children.forEach(sortRecursively);
        };

        const root = byId[rootId];

        if (!root) {
            return [];
        }

        sortRecursively(root);

        const flatten = (node) => [node, ...node.children.flatMap(flatten)];

        const flatResult = flatten(root);
        return flatResult;
    };


    return (
        <div>
            <PointOfView
                parameters={povParams}
                structure={povStructure}
                dimensionData={dimensionData}
                onChangePov={setPov}
            />
            <ToolBar
                onRefresh={handleRefresh}
                onCalculate={handleCalculate}
                onRaiseData={handleRaiseData}
                onRollup={handleRollup}
            />
            {loading ? (
                <div className="flex justify-center items-center py-2">
                    <SmallSpinner /> <span className="ml-2">Chargement...</span>
                </div>
            ) : (
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
                                    case "raiseNeeded":
                                        rowBg = "bg-yellow-100";
                                        break;
                                    case "rollupNeeded":
                                        rowBg = "bg-yellow-100";
                                        break;
                                    case "upToDate":
                                        rowBg = "bg-green-100";
                                        break;
                                    default:
                                        rowBg = "";
                                }

                                return (
                                    <tr
                                        key={node.id}
                                        onClick={() => setSelectedEntity(node.id)}
                                        className={`cursor-pointer hover:brightness-95 ${selectedEntity === node.id ? "brightness-90" : ""}`}
                                    >
                                        <td className={`border px-4 py-1 bg-gray-300 ${rowBg}`} style={{ paddingLeft: `${node.level * 20}px` }}>
                                            {node.label}
                                        </td>
                                        <td className={`border px-4 py-1 min-w-[120px] ${rowBg}`}>
                                            {node.calcStatus === "noData" && (
                                                <div className="flex items-center justify-center">NO DATA</div>
                                            )}
                                            {node.calcStatus === "calcNeeded" && (
                                                <div className="flex items-center justify-center">CLN</div>
                                            )}
                                            {node.calcStatus === "raiseNeeded" && (
                                                <div className="flex items-center justify-center">RDN</div>
                                            )}
                                            {node.calcStatus === "rollupNeeded" && (
                                                <div className="flex items-center justify-center">RLN</div>
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
            )}
        </div>
    );
}