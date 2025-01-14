import { useState, useEffect } from "react"
import { SmallSpinner } from "../../Spinner";

export function Accounts() {

    const [loading, setLoading] = useState(false);
    const [bottomView, setBottomView] = useState("default");
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [formData, setFormData] = useState({
        account_name: "",
        account_type: "",
        currency: "",
        entity_id: "",
        iban: "",
    });

    const fetchAccounts = async () => {
        setLoading(true);
        const token = localStorage.getItem("authToken");
        try {
            const response = await fetch("http://localhost:8080/api/accounts", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            setAccounts(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Erreur lors de la récupération des comptes :", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrUpdate = async () => {
        setLoading(true);
        const token = localStorage.getItem("authToken");
        try {
            const method = selectedAccount ? "PUT" : "POST";
            const url = selectedAccount
                ? `http://localhost:8080/api/accounts/${selectedAccount.id}`
                : "http://localhost:8080/api/accounts";

            await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });
            fetchAccounts();
            setFormData({
                account_name: "",
                account_type: "",
                currency: "",
                entity_id: "",
                iban: "",
            });
            setSelectedAccount(null);
        } catch (error) {
            console.error("Erreur lors de la sauvegarde du compte :", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        setLoading(true);
        const token = localStorage.getItem("authToken");
        try {
            await fetch(`http://localhost:8080/api/accounts/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            fetchAccounts();
        } catch (error) {
            console.error("Erreur lors de la suppression du compte :", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleRefresh = () => {
        setLoading(true);
    }

    return (
        <>
            {/* Espace principal */}
            <div>
                <div className="flex items-center p-2 border-b gap-2 text-sm">
                    <div className="flex gap-2">
                        <button
                            onClick={fetchAccounts}
                            className="p-0.5 rounded hover:bg-gray-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                        </button>
                    </div>
                    <div className="border-l-2 pl-2 flex gap-2">
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
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            </button>
                        </div>
                        <div>
                            <button
                                onClick={handleRefresh}
                                className="p-0.5 rounded hover:bg-gray-200"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                </svg>
                            </button>
                        </div>
                        <div>
                            <button
                                onClick={handleRefresh}
                                className="p-0.5 rounded hover:bg-gray-200"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="border-l-2 pl-2 flex gap-2">
                        <div>
                            <button
                                onClick={handleRefresh}
                                className="p-0.5 rounded hover:bg-gray-200"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                {loading ? (
                    <SmallSpinner />
                ) : (
                    <div className="flex flex-col h-full">
                        {/* Liste d'éléments */}
                        <div className="flex-grow overflow-auto">
                            <table className="w-full border-collapse border border-gray-300">
                                <thead>
                                    <tr>
                                        <th className="border p-2">Nom</th>
                                        <th className="border p-2">Type</th>
                                        <th className="border p-2">Devise</th>
                                        <th className="border p-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.isArray(accounts) && accounts.length > 0 ? (
                                        accounts.map((account) => (
                                            <tr key={account.id}>
                                                <td className="border p-2">{account.account_name}</td>
                                                <td className="border p-2">{account.account_type}</td>
                                                <td className="border p-2">{account.currency}</td>
                                                <td className="border p-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedAccount(account);
                                                            setFormData(account);
                                                        }}
                                                        className="mr-2 p-1 bg-yellow-500 text-white rounded"
                                                    >
                                                        Modifier
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(account.id)}
                                                        className="p-1 bg-red-500 text-white rounded"
                                                    >
                                                        Supprimer
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="text-center p-2">
                                                Aucun compte trouvé.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {/* Fenêtre de création/édition */}
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
                        <button
                            type="submit"
                            className="p-2 bg-green-500 text-white rounded"
                        >
                            {selectedAccount ? "Modifier" : "Créer"}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}