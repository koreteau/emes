import { useState, useEffect } from "react"
import { SmallSpinner } from "../../Spinner";


export function Accounts() {

    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [formData, setFormData] = useState({
        account_name: "",
        account_type: "",
        currency: "",
        entity_id: "",
        iban: "",
        internal_id: "",
        exchange_fee_rate: "",
        transfer_fee: "",
        maintenance_fee: "",
        min_balance: "",
        max_balance: "",
        overdraft_limit: "",
        opening_date: "",
        closing_date: "",
    });
    const [isAdmin, setIsAdmin] = useState(false);
    const [selectedAccounts, setSelectedAccounts] = useState([]);

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
            // Récupérer les comptes
            const accountsResponse = await fetch("http://localhost:8080/api/accounts", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            const accountsData = await accountsResponse.json();

            // Récupérer les entités
            const entitiesMap = await fetchEntities();

            // Ajouter les informations des entités aux comptes
            const enrichedAccounts = accountsData.map((account) => ({
                ...account,
                entity: entitiesMap[account.entity_id] || { internal_id: "", entity_name: "Entité inconnue" },
            }));

            setAccounts(enrichedAccounts);
        } catch (error) {
            console.error("Erreur lors de la récupération des comptes :", error);
        } finally {
            setLoading(false);
        }
    };


    const handleCreateOrUpdate = async () => {
        if (!formData.account_name || !formData.currency || !formData.entity_id) {
            console.error("Tous les champs obligatoires ne sont pas remplis !");
            return;
        }

        setLoading(true);
        const token = localStorage.getItem("authToken");
        try {
            const method = selectedAccount ? "PUT" : "POST";
            const url = selectedAccount
                ? `http://localhost:8080/api/accounts/${selectedAccount.account_id}`
                : "http://localhost:8080/api/accounts";

            // Retirer la date de fermeture si elle est vide
            const filteredData = { ...formData };
            if (!filteredData.closing_date) {
                delete filteredData.closing_date;
            }

            await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(filteredData),
            });
            fetchAccounts();
            setFormData({
                account_name: "",
                account_type: "",
                currency: "",
                entity_id: "",
                iban: "",
                internal_id: "",
                exchange_fee_rate: "",
                transfer_fee: "",
                maintenance_fee: "",
                min_balance: "",
                max_balance: "",
                overdraft_limit: "",
                opening_date: "",
                closing_date: "",
            });
            setSelectedAccount(null);
        } catch (error) {
            console.error("Erreur lors de la sauvegarde du compte :", error);
        } finally {
            setLoading(false);
        }
    };

    const editSelectedAccount = () => {
        if (selectedAccounts.length === 1) {
            const account = accounts.find(acc => acc.account_id === selectedAccounts[0]);
            setSelectedAccount(account);
            setFormData({
                account_name: account.account_name,
                account_type: account.account_type,
                currency: account.currency,
                entity_id: account.entity_id,
                iban: account.iban,
            });
        } else {
            console.error("Veuillez sélectionner un seul compte à éditer.");
        }
    };

    const handleCloseAccounts = async () => {
        const token = localStorage.getItem("authToken");
        try {
            await Promise.all(
                selectedAccounts.map((id) =>
                    fetch(`http://localhost:8080/api/accounts/${id}/close`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ closed_date: new Date().toISOString() }),
                    })
                )
            );
            fetchAccounts();
            setSelectedAccounts([]);
        } catch (error) {
            console.error("Erreur lors de la fermeture des comptes :", error);
        }
    };

    const openSelectedAccounts = async () => {
        const token = localStorage.getItem("authToken");
        try {
            await Promise.all(
                selectedAccounts.map((id) =>
                    fetch(`http://localhost:8080/api/accounts/${id}/open`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ opened_date: new Date().toISOString() }),
                    })
                )
            );
            fetchAccounts();
            setSelectedAccounts([]);
        } catch (error) {
            console.error("Erreur lors de l'ouverture des comptes :", error);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Vérification si l'utilisateur est admin au chargement
    useEffect(() => {
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
                    <div className="border-l-2 pl-2 flex gap-2">
                        {isAdmin ? (
                            <>
                                <div>
                                    <button
                                        onClick={() => {
                                            setSelectedAccount(null);
                                            setFormData({
                                                account_name: "",
                                                account_type: "",
                                                currency: "",
                                                entity_id: "",
                                                iban: "",
                                            });
                                        }}
                                        className="p-0.5 rounded hover:bg-gray-200"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                    </button>
                                </div>
                                <div>
                                    <button
                                        onClick={editSelectedAccount}
                                        className="p-0.5 rounded hover:bg-gray-200"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                        </svg>
                                    </button>
                                </div>


                                <div>
                                    <button
                                        onClick={handleCloseAccounts}
                                        className="p-0.5 rounded hover:bg-gray-200"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                        </svg>
                                    </button>
                                </div>
                                <div>
                                    <button
                                        onClick={openSelectedAccounts}
                                        className="p-0.5 rounded hover:bg-gray-200"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                        </svg>
                                    </button>
                                </div>
                            </>
                        ) : (<></>)}
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
                                        <th className="border p-2 w-8"></th>
                                        <th className="border p-2 w-24 ">Internal ID</th>
                                        <th className="border p-2 w-40">Name</th>
                                        <th className="border p-2 w-16">Type</th>
                                        <th className="border p-2 w-16">Currency</th>
                                        <th className="border p-2 w-40">Entity</th>
                                        <th className="border p-2 w-40 truncate">Minimum Balance</th>
                                        <th className="border p-2 w-40 truncate">Maximum Balance</th>
                                        <th className="border p-2 w-40 truncate">Overdraft Limit</th>
                                        <th className="border p-2 w-40 truncate">Exchange Fee Rates</th>
                                        <th className="border p-2 w-40 truncate">Transfer Fee</th>
                                        <th className="border p-2 w-60 truncate">Maintenance Fee</th>
                                        <th className="border p-2 w-60 truncate">Opening Date</th>
                                        <th className="border p-2 w-60 truncate">Closing Date</th>
                                        <th className="border p-2 w-60">IBAN</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.isArray(accounts) && accounts.length > 0 ? (
                                        accounts.map((account) => {
                                            const isFutureOpening =
                                                account.opening_date && new Date(account.opening_date) > new Date();
                                            const hasClosingDate = account.closing_date;
                                            const textStyle =
                                                isFutureOpening || hasClosingDate ? "bg-yellow-100" : "bg-green-100";

                                            return (
                                                <tr key={account.account_id} className={`${textStyle}`}>
                                                    <td className="border p-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedAccounts.includes(account.account_id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedAccounts([
                                                                        ...selectedAccounts,
                                                                        account.account_id,
                                                                    ]);
                                                                } else {
                                                                    setSelectedAccounts(
                                                                        selectedAccounts.filter(
                                                                            (id) => id !== account.account_id
                                                                        )
                                                                    );
                                                                }
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="border p-2">{account.internal_id}</td>
                                                    <td
                                                        className="border p-2 truncate overflow-hidden text-ellipsis whitespace-nowrap"
                                                        title={account.account_name} // Tooltip pour le contenu complet
                                                    >
                                                        {account.account_name}
                                                    </td>
                                                    <td className="border p-2">{account.account_type}</td>
                                                    <td className="border p-2">{account.currency}</td>
                                                    <td
                                                        className="border p-2 max-w-40 truncate overflow-hidden text-ellipsis whitespace-nowrap"
                                                        title={`${account.entity.internal_id} - ${account.entity.entity_name}`}
                                                    >
                                                        {account.entity.internal_id} - {account.entity.entity_name}
                                                    </td>
                                                    <td className="border p-2">{account.min_balance}</td>
                                                    <td className="border p-2">{account.max_balance}</td>
                                                    <td className="border p-2">{account.overdraft_limit}</td>
                                                    <td className="border p-2">{account.exchange_fee_rate}</td>
                                                    <td className="border p-2">{account.transfer_fee}</td>
                                                    <td className="border p-2">{account.maintenance_fee}</td>
                                                    <td className="border p-2">{account.opening_date}</td>
                                                    <td className="border p-2">{account.closing_date}</td>
                                                    <td
                                                        className="border p-2 truncate overflow-hidden text-ellipsis whitespace-nowrap"
                                                        title={account.iban}
                                                    >
                                                        {account.iban}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="12" className="text-center p-2">
                                                Aucun compte trouvé.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {/* Fenêtre de création/édition pour les Admin*/}
                {isAdmin ? (
                    <div className="absolute bottom-0 left-0 w-full border-t bg-gray-100 p-4 max-h-64 overflow-y-auto rounded-br-lg">
                        <h3 className="text-lg font-bold">
                            {selectedAccount ? "Modifier le compte" : "Créer un compte"}
                        </h3>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleCreateOrUpdate();
                            }}
                        >
                            <div className="mb-2">
                                <label className="block text-sm">Nom du compte</label>
                                <input
                                    type="text"
                                    name="account_name"
                                    value={formData.account_name}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div className="mb-2">
                                <label className="block text-sm">Type</label>
                                <input
                                    type="text"
                                    name="account_type"
                                    value={formData.account_type}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div className="mb-2">
                                <label className="block text-sm">Devise</label>
                                <input
                                    type="text"
                                    name="currency"
                                    value={formData.currency}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div className="mb-2">
                                <label className="block text-sm">Entity ID</label>
                                <input
                                    type="text"
                                    name="entity_id"
                                    value={formData.entity_id}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div className="mb-2">
                                <label className="block text-sm">IBAN</label>
                                <input
                                    type="text"
                                    name="iban"
                                    value={formData.iban}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div className="mb-2">
                                <label className="block text-sm">Internal ID</label>
                                <input
                                    type="text"
                                    name="internal_id"
                                    value={formData.internal_id}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div className="mb-2">
                                <label className="block text-sm">Exchange Fee Rate</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="exchange_fee_rate"
                                    value={formData.exchange_fee_rate}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div className="mb-2">
                                <label className="block text-sm">Frais de transfert</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="transfer_fee"
                                    value={formData.transfer_fee}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div className="mb-2">
                                <label className="block text-sm">Frais de maintenance</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="maintenance_fee"
                                    value={formData.maintenance_fee}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div className="mb-2">
                                <label className="block text-sm">Solde minimum</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="min_balance"
                                    value={formData.min_balance}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div className="mb-2">
                                <label className="block text-sm">Solde maximum</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="max_balance"
                                    value={formData.max_balance}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div className="mb-2">
                                <label className="block text-sm">Limite de découvert</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="overdraft_limit"
                                    value={formData.overdraft_limit}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div className="mb-2">
                                <label className="block text-sm">Date d'ouverture</label>
                                <input
                                    type="date"
                                    name="opening_date"
                                    value={formData.opening_date}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div className="mb-2">
                                <label className="block text-sm">Date de fermeture</label>
                                <input
                                    type="date"
                                    name="closing_date"
                                    value={formData.closing_date}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <button
                                type="submit"
                                className="p-2 bg-green-500 text-white rounded"
                            >
                                {selectedAccount ? "Modifier" : "Créer"}
                            </button>
                        </form>
                    </div>
                ) : (<></>)}
            </div>
        </>
    );
}