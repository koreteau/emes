import React, { useState, useEffect, useMemo, useCallback } from "react";
import { PointOfView } from "./PointOfView";
import { ToolBar } from "./ToolBar";
import { SmallSpinner } from "../../Spinner";

export function Journals() {
    const [dimensionData, setDimensionData] = useState(null);
    const [selectedPov, setSelectedPov] = useState({});
    const [journals, setJournals] = useState([]);
    const [filteredJournals, setFilteredJournals] = useState([]);
    const [selectedJournalId, setSelectedJournalId] = useState(null);
    const [journalDetails, setJournalDetails] = useState(null);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const token = localStorage.getItem("authToken");

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

    // Fonction de récupération des journaux
    const fetchData = useCallback(async () => {
        setIsLoadingData(true);
        try {
            const res = await fetch("http://localhost:8080/api/journals", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            setJournals(json);
        } catch (err) {
            console.error("Erreur lors du fetch des journaux :", err);
        } finally {
            setIsLoadingData(false);
        }
    }, [token]);


    // Utilisation de fetchData au montage
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const filtered = journals.filter(j =>
            Object.entries(selectedPov).every(([key, val]) => !val || j[key] === val)
        );
        setFilteredJournals(filtered);
    }, [journals, selectedPov]);

    useEffect(() => {
        const fetchJournalDetails = async () => {
            if (!selectedJournalId) return;
            const res = await fetch(`http://localhost:8080/api/journals/${selectedJournalId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            setJournalDetails(json);
        };
        fetchJournalDetails();
    }, [selectedJournalId, token]);

    const calculateSummary = () => {
        if (!journalDetails?.lines) return { debit: 0, credit: 0, variance: 0 };
        let debit = 0;
        let credit = 0;
        for (const line of journalDetails.lines) {
            const amount = parseFloat(line.amount);
            if (amount > 0) debit += amount;
            else credit += amount;
        }
        const variance = debit + credit;
        return { debit, credit, variance };
    };

    const summary = calculateSummary();

    // Simule les paramètres d'un document pour activer certaines dimensions
    const povParameters = useMemo(() => ({
        scenario: { isActivated: true, default: "ACT" },
        year: { isActivated: true, default: "2025" },
        period: { isActivated: true, default: "P01" },
        entity: { isActivated: true, default: "CC" },
        value: { isActivated: true, default: "<Entity Curr>" }
    }), []);


    const povStructure = {
        rows: [],
        columns: []
    };

    return (
        <div>
            {dimensionData && (
                <PointOfView
                    parameters={povParameters}
                    structure={povStructure}
                    dimensionData={dimensionData}
                    onChangePov={setSelectedPov}
                />
            )}
            <ToolBar
                onRefresh={fetchData}
                onCalculate={() => console.log("📊 Calculate clicked")}
                onSave={() => console.log("💾 Save clicked")}
            />
            {isLoadingData ? (
                <SmallSpinner />
            ) : (
                <>
                    <table className="table-auto w-full border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border px-4 py-2 text-left">Label</th>
                                <th className="border px-4 py-2 text-left">Status</th>
                                <th className="border px-4 py-2 text-left">Author</th>
                                <th className="border px-4 py-2 text-left">Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredJournals.map(journal => (
                                <tr
                                    key={journal.id}
                                    className="hover:bg-gray-50 cursor-pointer"
                                    onClick={() => setSelectedJournalId(journal.id)}
                                >
                                    <td className="border px-4 py-2">{journal.label}</td>
                                    <td className="border px-4 py-2">{journal.status}</td>
                                    <td className="border px-4 py-2">{journal.author}</td>
                                    <td className="border px-4 py-2">{new Date(journal.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {journalDetails && (
                        <div className="mt-6">
                            <h2 className="text-lg font-semibold mb-2">Détails du journal</h2>
                            <table className="table-auto w-full border text-sm">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border px-4 py-2">Account</th>
                                        <th className="border px-4 py-2">Custom1</th>
                                        <th className="border px-4 py-2">Custom2</th>
                                        <th className="border px-4 py-2">Amount</th>
                                        <th className="border px-4 py-2">Comment</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {journalDetails.lines.map(line => (
                                        <tr key={line.id}>
                                            <td className="border px-4 py-2">{line.account}</td>
                                            <td className="border px-4 py-2">{line.custom1}</td>
                                            <td className="border px-4 py-2">{line.custom2}</td>
                                            <td className="border px-4 py-2 text-right">{line.amount}</td>
                                            <td className="border px-4 py-2">{line.comment}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="mt-4 text-sm">
                                <div>Crédit total : {summary.credit}</div>
                                <div>Débit total : {summary.debit}</div>
                                <div>
                                    Variance : <span className={summary.variance === 0 ? "text-green-600" : "text-red-600"}>{summary.variance}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
