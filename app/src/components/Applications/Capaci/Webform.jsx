import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { SmallSpinner } from "../../Spinner";
import { PointOfView } from "./PointOfView";
import { ToolBar } from "./ToolBar";

// Utilitaire pour construire toutes les combinaisons de dimensions
const cartesianProduct = (arrays) =>
  arrays.reduce(
    (acc, curr) =>
      acc
        .map((a) => curr.map((b) => [...a, b]))
        .flat(),
    [[]]
  );

export function Webform({ docId }) {
  const [currentPov, setCurrentPov] = useState(null);
  const [webformData, setWebformData] = useState(null);
  const [data, setData] = useState([]);

  const [rowCombinations, setRowCombinations] = useState([]);
  const [columnCombinations, setColumnCombinations] = useState([]);

  useEffect(() => {
    const fetchDefinition = async () => {
      const token = localStorage.getItem("authToken");
      try {
        const res = await fetch(
          `http://localhost:8080/api/documents/${docId}/content`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const json = await res.json();
        setWebformData(json);
      } catch (err) {
        toast.error("❌ Erreur lors du chargement de la définition de la webform");
      }
    };
    fetchDefinition();
  }, [docId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentPov || !webformData?.structure) return;

      const token = localStorage.getItem("authToken");
      const fixedDims = webformData.structure.fixed;
      const params = new URLSearchParams();

      fixedDims.forEach((dim) => {
        if (currentPov[dim]) {
          params.append(dim, currentPov[dim]);
        }
      });

      try {
        const res = await fetch(`http://localhost:8080/api/data?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        setData(json);
      } catch (err) {
        toast.error("❌ Erreur lors du chargement des données");
      }
    };

    fetchData();
  }, [webformData, currentPov]);

  useEffect(() => {
    if (!webformData?.structure) return;

    const allDims = {
      account: ["CLOSING", "AVERAGE"],
      custom1: ["EUR", "GBP", "USD"],
      period: ["P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08", "P09", "P10", "P11", "P12"]
      // ⚠️ à remplacer par une vraie source plus tard
    };

    const rowDims = webformData.structure.rows;
    const colDims = webformData.structure.columns;

    const rowValues = rowDims.map((dim) => allDims[dim] || []);
    const colValues = colDims.map((dim) => allDims[dim] || []);

    const rowCombos = cartesianProduct(rowValues);
    const colCombos = cartesianProduct(colValues);

    setRowCombinations(rowCombos);
    setColumnCombinations(colCombos);
  }, [webformData]);

  const getCellValue = (rowDimVals, colDimVals) => {
    if (!webformData?.structure || !currentPov) return "";

    const filter = {
      ...currentPov,
    };

    webformData.structure.rows.forEach((dim, idx) => {
      filter[dim] = rowDimVals[idx];
    });

    webformData.structure.columns.forEach((dim, idx) => {
      filter[dim] = colDimVals[idx];
    });

    const found = data.find((d) =>
      Object.entries(filter).every(([k, v]) => d[k] === v)
    );

    return found?.data_value || "";
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
