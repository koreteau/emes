import React, { useState } from "react";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import axios from "axios";

export function LoadDataCurrencyRates() {
    const [previewData, setPreviewData] = useState([]);
    const [errors, setErrors] = useState([]);
    const [showDialog, setShowDialog] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchExistingRates = async () => {
        const token = localStorage.getItem("authToken");
        try {
            console.log("Fetching existing rates...");
            const response = await axios.get("http://localhost:8080/api/exchange-rates", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const rates = response.data.map((rate) => ({
                id: rate.exchange_rate_id, // Propagation de l'ID pour utilisation ultérieure
                from_currency: rate.from_currency,
                to_currency: rate.to_currency,
                rate: parseFloat(rate.rate), // Conversion pour éviter les erreurs de comparaison
                effective_date: rate.effective_date,
            }));
            console.log("Existing rates fetched and normalized:", rates);
            return rates;
        } catch (error) {
            console.error("Erreur lors de la récupération des données existantes :", error);
            return [];
        }
    };      

    const determineType = (date, currency, rate, existingRates) => {
        console.log("Comparing data:");
        console.log("Date:", date, "Currency:", currency, "Rate:", rate);
    
        // Convertir la date en format DD/MM/YYYY pour correspondre à la base de données
        const normalizedDate = date.split("-").reverse().join("/");
    
        console.log("Normalized Date:", normalizedDate);
    
        const existingRate = existingRates.find(
            (entry) => 
                entry.effective_date === normalizedDate &&
                entry.to_currency === currency
        );
    
        if (existingRate) {
            const existingRateValue = parseFloat(existingRate.rate);
    
            console.log("Match found in database:", existingRate);
    
            if (rate === 0) {
                console.log("Type determined: Delete (rate is 0)");
                return "Delete"; // Suppression si la valeur est 0
            }
            if (existingRateValue.toFixed(4) === rate.toFixed(4)) {
                console.log("Type determined: Identical (exact match)");
                return "Identical"; // Identique si même valeur
            }
            console.log("Type determined: Modification (rate differs)");
            return "Modification"; // Modification si valeur différente
        }
    
        console.log("Type determined: New (no match found)");
        return "New"; // Création si aucun match
    };
    
       

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        console.log("File selected:", file.name);

        const existingRates = await fetchExistingRates();

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            delimiter: ";",
            complete: (result) => {
                console.log("Parsed CSV data:", result.data);

                const data = result.data;
                const validationErrors = [];
                const validData = [];

                data.forEach((row, index) => {
                    const { Date, Currency, Value } = row;
                
                    console.log(`Processing row ${index + 2}:`, row);
                
                    // Validation
                    if (!Date || !/^\d{2}\/\d{2}\/\d{4}$/.test(Date)) {
                        const error = `Ligne ${index + 2}: Date invalide`;
                        console.error(error);
                        validationErrors.push(error);
                        return;
                    }
                    if (!Currency || Currency.length !== 3) {
                        const error = `Ligne ${index + 2}: Devise invalide`;
                        console.error(error);
                        validationErrors.push(error);
                        return;
                    }
                    const rate = parseFloat(Value.replace(",", "."));
                    if (isNaN(rate)) {
                        const error = `Ligne ${index + 2}: Taux de change invalide`;
                        console.error(error);
                        validationErrors.push(error);
                        return;
                    }
                
                    // Normalisation
                    const effectiveDate = Date.split("/").reverse().join("-"); // Convertir en YYYY-MM-DD
                    const currency = Currency.toUpperCase();
                
                    // Détection du type
                    const existingRate = existingRates.find(
                        (entry) =>
                            entry.effective_date === Date &&
                            entry.to_currency === currency
                    );
                
                    const type = determineType(effectiveDate, currency, rate, existingRates);
                
                    if (type === "New" && rate === 0) {
                        const error = `Ligne ${index + 2}: Nouvelle valeur ne peut pas être 0`;
                        console.error(error);
                        validationErrors.push(error);
                        return; // Ignore cette ligne
                    }
                
                    console.log(
                        `Row analysis: Date=${effectiveDate}, Currency=${currency}, Rate=${rate}, Type=${type}`
                    );
                
                    validData.push({
                        type,
                        id: existingRate ? existingRate.id : null,
                        date: Date,
                        currency,
                        rate: rate.toFixed(4),
                    });
                });                                               

                console.log("Validation errors:", validationErrors);
                console.log("Valid data for preview:", validData);

                setPreviewData(validData);
                setErrors(validationErrors);
                setShowDialog(validationErrors.length === 0);
            },
        });
    };

    const handleDownloadTemplate = () => {
        const csvContent = "Date;Currency;Value\n01/01/2025;USD;1,0000";
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        saveAs(blob, "currency_rates_template.csv");
    };

    const handleLoad = async () => {
        setLoading(true);
        const apiUrl = "http://localhost:8080/api/exchange-rates";
        const token = localStorage.getItem("authToken");
    
        console.log("Starting data load...");
        console.log("Preview data to load:", previewData);
    
        const requests = previewData
            .filter((item) => item.type !== "Identical") // Ignorer les données identiques
            .map((item) => {
                const payload = {
                    from_currency: "EUR",
                    to_currency: item.currency,
                    rate: parseFloat(item.rate),
                    effective_date: item.date.split("/").reverse().join("-"),
                };
    
                console.log(`Preparing request for type: ${item.type}`, payload);
    
                if (item.type === "New" && item.rate !== "0.0000") {
                    // N'ajoute pas de nouvelle entrée si le taux est 0
                    return axios.post(apiUrl, payload, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                } else if (item.type === "Modification" && item.id) {
                    const url = `${apiUrl}/${item.id}`;
                    return axios.put(url, payload, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                } else if (item.type === "Delete" && item.id) {
                    const url = `${apiUrl}/${item.id}`;
                    return axios.delete(url, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                } else {
                    console.log(`Skipping operation for type: ${item.type}`, item);
                    return null;
                }
            });
    
        try {
            await Promise.all(requests);
            console.log("Data loaded successfully!");
            alert("Données chargées avec succès !");
        } catch (error) {
            console.error("Erreur lors du chargement des données :", error);
            alert("Erreur lors du chargement des données. Consultez la console pour plus d'informations.");
        } finally {
            setLoading(false);
            setShowDialog(false);
            setPreviewData([]);
        }
    };        

    const handleReject = () => {
        console.log("Preview data rejected.");
        setShowDialog(false);
        setPreviewData([]);
    };

    return (
        <div className="load-data-currency-rates">
            <button
                onClick={handleDownloadTemplate}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4"
            >
                Télécharger le Template
            </button>
            <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="file-input mb-4"
            />

            {errors.length > 0 && (
                <div className="text-red-500 mb-4">
                    <h4 className="font-bold">Erreurs détectées :</h4>
                    <ul>
                        {errors.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                    </ul>
                </div>
            )}

            {showDialog && (
                <div className="dialog">
                    <div className="dialog-content border rounded p-4">
                        <h3 className="text-lg font-bold mb-2">Preview Data</h3>
                        <table className="table-auto border-collapse border border-gray-500 w-full">
                            <thead>
                                <tr>
                                    <th className="border border-gray-700 px-2 py-1">Type</th>
                                    <th className="border border-gray-700 px-2 py-1">Date</th>
                                    <th className="border border-gray-700 px-2 py-1">Currency</th>
                                    <th className="border border-gray-700 px-2 py-1">Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.map((row, index) => (
                                    <tr key={index}>
                                        <td className="border border-gray-700 px-2 py-1">{row.type}</td>
                                        <td className="border border-gray-700 px-2 py-1">{row.date}</td>
                                        <td className="border border-gray-700 px-2 py-1">{row.currency}</td>
                                        <td className="border border-gray-700 px-2 py-1">{row.rate}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="flex justify-end mt-4 gap-2">
                            <button
                                onClick={handleReject}
                                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                            >
                                Reject
                            </button>
                            <button
                                onClick={handleLoad}
                                disabled={loading}
                                className={`${
                                    loading ? "bg-gray-500" : "bg-green-500 hover:bg-green-600"
                                } text-white px-4 py-2 rounded`}
                            >
                                {loading ? "Loading..." : "Load"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}