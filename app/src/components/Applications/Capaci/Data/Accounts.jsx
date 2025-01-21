import { useState, useEffect } from "react"
import { SmallSpinner } from "../../../Spinner";


export function Accounts() {
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);

    const [formData, setFormData] = useState({
        account_name: "",
        account_type: "",
        currency: "",
        entity_id: "",
        opening: "open",
        increase: "open",
        decrease: "open",
        equity: "open",
        adjustment: "open",
        checking: "open",
        closing: "open",
        revenue: "open",
        expense: "open",
        transfer: "open",
        provision: "open",
        depreciation: "open",
        gain_loss: "open",
    });

    const fetchEntities = async () => {
        const token = localStorage.getItem("authToken");
        try {
            const response = await fetch("http://localhost:8080/api/entities", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            // Transformer la liste des entités en un objet clé-valeur
            return data.reduce((map, entity) => {
                map[entity.entity_id] = { internal_id: entity.internal_id, entity_name: entity.entity_name };
                return map;
            }, {});
        } catch (error) {
            console.error("Erreur lors de la récupération des entités :", error);
            return {};
        }
    };

    const fetchAccounts = async () => {
        setLoading(true);
        const token = localStorage.getItem("authToken");

        try {
            // Récupérer les entités pour enrichir les comptes
            const entitiesMap = await fetchEntities();

            // Récupérer les données utilisateur
            const userResponse = await fetch("http://localhost:8080/api/users/me", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!userResponse.ok) {
                throw new Error("Impossible de récupérer les informations utilisateur.");
            }

            const userData = await userResponse.json();

            let accounts = [];
            if (userData.is_admin) {
                // Si admin, récupérer tous les comptes
                const accountsResponse = await fetch("http://localhost:8080/api/accounts", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!accountsResponse.ok) {
                    throw new Error("Impossible de récupérer les comptes.");
                }

                accounts = await accountsResponse.json();
            } else {
                // Sinon, récupérer les comptes par entité
                const securityClasses = await Promise.all(
                    userData.security_classes.map(async (classId) => {
                        const classResponse = await fetch(`http://localhost:8080/api/security-classes/${classId}`, {
                            method: "GET",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                            },
                        });

                        if (!classResponse.ok) {
                            throw new Error(`Erreur lors de la récupération de la classe de sécurité : ${classId}`);
                        }

                        return await classResponse.json();
                    })
                );

                // Extraire les IDs d'entités
                const entityIds = [...new Set(securityClasses.map((securityClass) => securityClass.entity_id))];

                // Récupérer les comptes pour chaque entité
                for (const entityId of entityIds) {
                    const response = await fetch(`http://localhost:8080/api/accounts/${entityId}`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    });

                    if (response.ok) {
                        const data = await response.json();
                        accounts.push(...data);
                    }
                }
            }

            // Enrichir les comptes avec les données des entités
            const enrichedAccounts = accounts.map((account) => ({
                ...account,
                entity: entitiesMap[account.entity_id] || { internal_id: "N/A", entity_name: "Entité inconnue" },
            }));

            setAccounts(enrichedAccounts);
        } catch (error) {
            console.error("Erreur lors de la récupération des comptes :", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
        const token = localStorage.getItem("authToken");
        if (token) {
            const payload = JSON.parse(atob(token.split(".")[1]));
            setIsAdmin(payload.is_admin || false);
        }
    }, []);


    return (
        <>
            {/* Espace principal */}
            <div className="text-sm">
                <div className="flex items-center p-2 border-b gap-2 text-sm">
                    <div className="flex gap-2">
                        <button
                            onClick={fetchAccounts}
                            className="p-0.5 rounded hover:bg-gray-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                        </button>
                    </div>
                </div>
                {loading ? (
                    <SmallSpinner />
                ) : (
                    <div className="flex flex-col h-full">
                        <div className="overflow-x-auto max-w-full">
                            <table className="table-auto border-collapse border border-gray-300 w-full">
                                <thead className="bg-blue-100">
                                    <tr>
                                        <th className="border p-2">Code</th>
                                        <th className="border p-2">Nom</th>
                                        <th className="border p-2">Type</th>
                                        <th className="border p-2">Devise</th>
                                        <th className="border p-2">Entité</th>
                                        {[
                                            "opening",
                                            "increase",
                                            "decrease",
                                            "equity",
                                            "adjustment",
                                            "checking",
                                            "closing",
                                            "revenue",
                                            "expense",
                                            "transfer",
                                            "provision",
                                            "depreciation",
                                            "gain_loss",
                                        ].map((field) => (
                                            <th key={field} className="border p-2">{field}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.isArray(accounts) && accounts.length > 0 ? (
                                        accounts.map((account) => (
                                            <tr key={account.account_id}>
                                                <td className="border p-2">{account.internal_id}</td>
                                                <td className="border p-2 max-w-40 truncate overflow-hidden text-ellipsis whitespace-nowrap">{account.account_name}</td>
                                                <td className="border p-2">{account.account_type}</td>
                                                <td className="border p-2">{account.currency}</td>
                                                <td
                                                    className="border p-2 max-w-40 truncate overflow-hidden text-ellipsis whitespace-nowrap"
                                                    title={`${account.entity.internal_id} - ${account.entity.entity_name}`}
                                                >
                                                    {account.entity.internal_id} - {account.entity.entity_name}
                                                </td>
                                                {[
                                                    "opening",
                                                    "increase",
                                                    "decrease",
                                                    "equity",
                                                    "adjustment",
                                                    "checking",
                                                    "closing",
                                                    "revenue",
                                                    "expense",
                                                    "transfer",
                                                    "provision",
                                                    "depreciation",
                                                    "gain_loss",
                                                ].map((field) => (
                                                    <td key={field} className="border p-2">{account[field]}</td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="17" className="text-center p-2">
                                                Aucun compte trouvé.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                <tbody>
                                    
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}