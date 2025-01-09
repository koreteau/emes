import React from "react";
import { LoadDataCurrencyRates } from "./LoadDataCurrencyRates";

export function DataLoad() {
    return (
        <div className="p-4">
            <h1 className="text-lg font-bold mb-4">Data Load</h1>
            <div className="mt-4">
                <LoadDataCurrencyRates />
            </div>
        </div>
    );
}
