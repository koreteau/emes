import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { SmallSpinner } from "../../Spinner";
import { PointOfView } from "./PointOfView";
import { ToolBar } from "./ToolBar";

const cartesianProduct = (arrays) =>
  arrays.reduce((acc, curr) => acc.flatMap((a) => curr.map((b) => [...a, b])), [[]]);

export function Webform({ docId }) {
  const [currentPov, setCurrentPov] = useState(null);
  const [webformData, setWebformData] = useState(null);
  const [dataMap, setDataMap] = useState(new Map());

  const [rowCombinations, setRowCombinations] = useState([]);
  const [columnCombinations, setColumnCombinations] = useState([]);

  useEffect(() => {
    const fetchDefinition = async () => {
      const token = localStorage.getItem("authToken");
      try {
        const res = await fetch(`http://localhost:8080/api/documents/${docId}/content`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        setWebformData(json);
      } catch (err) {
        toast.error("❌ Erreur lors du chargement de la définition de la webform");
      }
    };
    fetchDefinition();
  }, [docId]);

  useEffect(() => {
    const fetchDataPerCell = async () => {
      if (!currentPov || !webformData?.structure) return;

      const token = localStorage.getItem("authToken");

      const { fixed = [], rows = [], columns = [] } = webformData.structure;

      const allDims = {
        account: ["CLOSING", "AVERAGE"],
        custom1: ["EUR", "GBP", "USD"],
        period: ["P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08", "P09", "P10", "P11", "P12"],
        // Tu pourras remplacer ça par un vrai fetch plus tard
      };

      const rowValues = rows.map((dim) => allDims[dim] || []);
      const colValues = columns.map((dim) => allDims[dim] || []);

      const rowCombos = cartesianProduct(rowValues);
      const colCombos = cartesianProduct(colValues);

      setRowCombinations(rowCombos);
      setColumnCombinations(colCombos);

      const tempMap = new Map();

      for (const row of rowCombos) {
        for (const col of colCombos) {
          const filter = { ...currentPov };

          rows.forEach((dim, i) => {
            filter[dim] = row[i];
          });

          columns.forEach((dim, i) => {
            filter[dim] = col[i];
          });

          const params = new URLSearchParams();
          [...fixed, ...rows, ...columns].forEach((dim) => {
            if (filter[dim]) {
              params.append(dim, filter[dim]);
            }
          });

          try {
            const res = await fetch(`http://localhost:8080/api/data?${params.toString()}`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            const json = await res.json();
            if (json.length > 0) {
              const key = [...row, ...col].join("|");
              tempMap.set(key, json[0]); // première valeur trouvée
            }
          } catch (err) {
            console.error("❌ Erreur cellule :", err.message);
          }
        }
      }

      setDataMap(tempMap);
    };

    fetchDataPerCell();
  }, [webformData, currentPov]);

  const getCellValue = (rowDimVals, colDimVals) => {
    const key = [...rowDimVals, ...colDimVals].join("|");
    return dataMap.get(key)?.data_value || "";
  };

  return (
    <div>
      <ToolBar
        onRefresh={() => console.log("🔁 Refresh clicked")}
        onCalculate={() => console.log("📊 Calculate clicked")}
        onSave={() => console.log("💾 Save clicked")}
      />

      {webformData?.parameters && (
        <PointOfView
          parameters={webformData.parameters}
          onChangePov={(pov) => setCurrentPov(pov)}
        />
      )}

      {!webformData || !currentPov ? (
        <SmallSpinner />
      ) : (
        <table className="table-auto border-collapse border border-gray-500 text-xs w-full mt-2">
          <thead>
            <tr>
              {webformData.structure.rows.map((dim, i) => (
                <th
                  key={`dim-${i}`}
                  className="border border-gray-700 bg-gray-200 font-bold px-2 py-1 text-left"
                >
                  {dim}
                </th>
              ))}
              {columnCombinations.map((colVals, idx) => (
                <th
                  key={`col-${idx}`}
                  className="border border-gray-700 bg-gray-100 font-bold px-2 py-1 text-center"
                >
                  {colVals.join(" / ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowCombinations.map((rowVals, rowIdx) => (
              <tr key={`row-${rowIdx}`}>
                {rowVals.map((v, i) => (
                  <td
                    key={`label-${i}`}
                    className="border border-gray-300 px-2 py-1 font-medium"
                  >
                    {v}
                  </td>
                ))}
                {columnCombinations.map((colVals, colIdx) => (
                  <td
                    key={`cell-${rowIdx}-${colIdx}`}
                    className="border border-gray-300 text-center px-2 py-1"
                  >
                    {getCellValue(rowVals, colVals)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
