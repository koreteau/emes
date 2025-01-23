import React, { useState, useEffect } from "react"
import { SmallSpinner } from "../../../Spinner";


export function Accounts() {
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);

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


    const buildHierarchy = (accounts) => {
        const accountMap = {};
        const hierarchy = [];

        // Map des comptes par ID pour un accès rapide
        accounts.forEach(account => {
            accountMap[account.account_id] = { ...account, children: [] };
        });

        // Construire la hiérarchie
        accounts.forEach(account => {
            if (account.parent_account_id) {
                const parent = accountMap[account.parent_account_id];
                if (parent) {
                    parent.children.push(accountMap[account.account_id]);
                }
            } else {
                hierarchy.push(accountMap[account.account_id]);
            }
        });

        return hierarchy;
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

            const hierarchy = buildHierarchy(enrichedAccounts);
            setAccounts(hierarchy);
        } catch (error) {
            console.error("Erreur lors de la récupération des comptes :", error);
        } finally {
            setLoading(false);
        }
    };


    const renderAccounts = (accounts, level = 0) => {
        return accounts.map(account => (
            <React.Fragment key={account.account_id}>
                <tr style={{ paddingLeft: `${level * 20}px` }}>
                    <td className="border p-2">{account.internal_id}</td>
                    <td className="border p-2 max-w-40 truncate overflow-hidden text-ellipsis whitespace-nowrap">
                        {account.account_name}
                    </td>
                    <td className="border p-2">{account.account_type}</td>
                    <td className="border p-2">{account.currency}</td>
                    <td
                        className="border p-2 max-w-40 truncate overflow-hidden text-ellipsis whitespace-nowrap"
                        title={`${account.entity?.internal_id} - ${account.entity?.entity_name}`}
                    >
                        {account.entity?.internal_id} - {account.entity?.entity_name}
                    </td>
                    {[
                        "flow_ope",
                        "flow_cho",
                        "flow_ini",
                        "flow_inc",
                        "flow_dec",
                        "flow_dcp",
                        "flow_dco",
                        "flow_dcm",
                        "flow_cti",
                        "flow_riv",
                        "flow_dev",
                        "flow_cwc",
                        "flow_cai",
                        "flow_cad",
                        "flow_mrg",
                        "flow_sin",
                        "flow_sou",
                        "flow_sva",
                        "flow_rec",
                        "flow_act",
                        "flow_app",
                        "flow_nin",
                        "flow_div",
                        "flow_varpl",
                        "flow_vareq",
                        "flow_ctrpl",
                        "flow_ctreq",
                        "flow_rel",
                        "flow_mkv",
                        "flow_le1",
                        "flow_chk",
                        "flow_clo",
                    ].map((field) => (
                        <td key={field} className="border p-2">{account[field]}</td>
                    ))}
                </tr>
                {account.children && renderAccounts(account.children, level + 1)}
            </React.Fragment>
        ));
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
            <div className="text-xs">
                <div className="flex items-center p-2 border-b gap-2 text-sm">
                    <div className="flex gap-2">
                        <button
                            onClick={fetchAccounts}
                            className="p-0.5 rounded hover:bg-gray-200"
                            title="Refesh"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                        </button>
                    </div>
                    {isAdmin ? (
                        <div className="flex gap-2 border-l-2 pl-2">
                            <button
                                onClick={fetchAccounts}
                                className="p-0.5 rounded hover:bg-gray-200"
                                title="Export to Excel"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
                                </svg>

                            </button>
                        </div>
                    ) : (<></>)}
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
                                            "flow_ope",
                                            "flow_cho",
                                            "flow_ini",
                                            "flow_inc",
                                            "flow_dec",
                                            "flow_dcp",
                                            "flow_dco",
                                            "flow_dcm",
                                            "flow_cti",
                                            "flow_riv",
                                            "flow_dev",
                                            "flow_cwc",
                                            "flow_cai",
                                            "flow_cad",
                                            "flow_mrg",
                                            "flow_sin",
                                            "flow_sou",
                                            "flow_sva",
                                            "flow_rec",
                                            "flow_act",
                                            "flow_app",
                                            "flow_nin",
                                            "flow_div",
                                            "flow_varpl",
                                            "flow_vareq",
                                            "flow_ctrpl",
                                            "flow_ctreq",
                                            "flow_rel",
                                            "flow_mkv",
                                            "flow_le1",
                                            "flow_chk",
                                            "flow_clo",
                                        ].map((field) => (
                                            <th key={field} className="border p-2">{field.toUpperCase()}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.isArray(accounts) && accounts.length > 0 ? (
                                        renderAccounts(accounts)
                                    ) : (
                                        <tr>
                                            <td colSpan="40" className="text-center p-2">
                                                Aucun compte trouvé.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}