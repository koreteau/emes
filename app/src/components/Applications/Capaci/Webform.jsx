import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { SmallSpinner } from "../../Spinner";
import { PointOfView } from "./PointOfView";
import { ToolBar } from "./ToolBar";


export function Webform({ docId }) {
    const [webformData, setWebformData] = useState(null);

    useEffect(() => {
        const fetchWebform = async () => {
            const token = localStorage.getItem("authToken");
            try {
                const res = await fetch(`http://localhost:8080/api/documents/${docId}/content`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });                  
    
                const data = await res.json();
                setWebformData(data);
            } catch (error) {
                toast.error("❌ Erreur lors du fetch de la webform");
            }
        };
    
        if (docId) {
            fetchWebform();
        }
    }, [docId]);
    

    if (!webformData || !webformData.layout || !webformData.data || !Array.isArray(webformData.data) || webformData.data.length === 0) {
        return <p className="p-4 text-sm">Chargement ou données invalides…</p>;
    }
    if (!webformData) return <SmallSpinner />;

    const layout = webformData.layout;
    const data = webformData.data[0].cells; // Utilisation du premier "pov" pour l'affichage
    const mergedCells = layout.merged_cells || [];

    // Gestion des couleurs des cellules
    const colors = layout.colors || {};
    const colorClasses = {
        default: colors.default || "#bedbff",
        locked: colors.locked || "#ffd6a8",
        calculated: colors.calculated || "#b9f8cf",
        open: colors.open || "#fef9c2",
    };

    // Fonction pour retrouver les fusions de cellules
    const mergeMap = {};
    mergedCells.forEach(({ start, end }) => {
        const [startRow, startCol] = start.slice(1).split("C").map(Number);
        const [endRow, endCol] = end.slice(1).split("C").map(Number);

        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                mergeMap[`R${r}C${c}`] = { startRow, startCol, endRow, endCol };
            }
        }
    });

    // Fonction pour vérifier si une cellule doit être affichée ou fusionnée
    const shouldRenderCell = (row, col) => {
        const key = `R${row}C${col}`;
        if (!mergeMap[key]) return true;
        return mergeMap[key].startRow === row && mergeMap[key].startCol === col;
    };

    // Fonction pour récupérer les attributs de fusion
    const getMergeAttributes = (row, col) => {
        const key = `R${row}C${col}`;
        if (!mergeMap[key]) return {};
        const { startRow, startCol, endRow, endCol } = mergeMap[key];

        return {
            rowSpan: endRow - startRow + 1,
            colSpan: endCol - startCol + 1,
        };
    };

    // Rendu du tableau
    return (
        <div>
            <ToolBar
            onRefresh={() => console.log("🔁 Refresh clicked")}
            onCalculate={() => console.log("📊 Calculate clicked")}
            onSave={() => console.log("💾 Save clicked")}
        />
            <PointOfView parameters={webformData.parameters} />
            <table className="table-auto border-collapse border border-gray-500 text-xs">
                <tbody>
                    {Array.from({ length: layout.rows }, (_, rowIndex) => (
                        <tr key={rowIndex}>
                            {Array.from({ length: layout.columns }, (_, colIndex) => {
                                const cellKey = `R${rowIndex + 1}C${colIndex + 1}`;
                                const cell = data[cellKey];

                                if (!shouldRenderCell(rowIndex + 1, colIndex + 1)) {
                                    return null; // Ne pas afficher une cellule qui fait partie d'une fusion déjà affichée
                                }

                                const { rowSpan, colSpan } = getMergeAttributes(rowIndex + 1, colIndex + 1);

                                const backgroundColor = cell ? colorClasses[cell.type] : "#ffffff";
                                const fontWeight = cell?.bold ? "bold" : "normal";

                                return (
                                    <td
                                        key={colIndex}
                                        className="border border-gray-700 px-2 py-1 text-center"
                                        style={{ backgroundColor, fontWeight }}
                                        rowSpan={rowSpan}
                                        colSpan={colSpan}
                                    >
                                        {cell?.value || ""}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
