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
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border px-4 py-1 text-center"></th>
                            <th className="border px-4 py-1 text-center">Calc Status</th>
                            <th className="border px-4 py-1 text-center">Journal Status</th>
                            <th className="border px-4 py-1 text-center">Review Level</th>
                        </tr>
                    </thead>
                    <tbody>
                        {statusTree.map((node) => (
                            <tr key={node.id}>
                                <td className="border px-4 py-1" style={{ paddingLeft: `${node.level * 20}px` }}>
                                    {node.label}
                                </td>
                                <td className="border px-4 py-1">{node.calcStatus}</td>
                                <td className="border px-4 py-1">{node.journalStatus}</td>
                                <td className="border px-4 py-1">{node.reviewLevel || ""}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}