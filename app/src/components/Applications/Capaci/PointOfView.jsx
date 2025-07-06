import { useState, useEffect } from "react";

const DIMENSION_ORDER = [
    "scenario", "year", "period", "entity", "account",
    "custom1", "custom2", "custom3", "custom4", "ICP", "value", "view"
];

const EXCLUDED_DIMENSIONS_SELECTION_MODE = new Set(["scenario", "year", "ICP", "value", "view"]);

export function PointOfView({ parameters, structure, dimensionData, onChangePov }) {
    const [selection, setSelection] = useState({});
    const [modalDim, setModalDim] = useState(null);
    const [modalSearch, setModalSearch] = useState("");
    const [modalSelectedItem, setModalSelectedItem] = useState(null);
    const [modalSelectedMode, setModalSelectedMode] = useState("Only");
    const [modalValues, setModalValues] = useState([]);

    useEffect(() => {
        if (modalDim) {
            setModalValues(selection[modalDim] || []);
        }
    }, [modalDim]);

    useEffect(() => {
        const initial = {};
        for (const dim of DIMENSION_ORDER) {
            const isActive = parameters?.[dim]?.isActivated ?? false;
            if (isActive) {
                initial[dim] = parameters?.[dim]?.default
                    ? [parameters[dim].default]
                    : ["[None]"];
            }
        }
        setSelection(initial);
    }, [parameters]);

    useEffect(() => {
        if (onChangePov) {
            onChangePov(selection);
        }
    }, [selection, onChangePov]);

    const dimsUsedInWebform = new Set([
        ...(structure?.rows || []),
        ...(structure?.columns || [])
    ]);

    const getOptionsForDimension = (dim) => {
        const allMembers = dimensionData?.[dim]?.members || [];
        return allMembers.map((m) => m.id);
    };

    const handleModalSave = () => {
        setSelection(prev => ({
            ...prev,
            [modalDim]: modalValues
        }));
        setModalDim(null);
        setModalValues([]);
    };

    return (
        <>
            <div className="flex p-2 flex-wrap gap-3 text-xs border-b">
                {DIMENSION_ORDER.filter(dim => {
                    const isActivated = parameters?.[dim]?.isActivated ?? false;
                    return isActivated && !dimsUsedInWebform.has(dim);
                }).map((dim) => {
                    const selected = selection[dim] || [];
                    const formatted = selected.length > 1
                        ? `${selected[0]}...`
                        : (selected[0] || "[None]");


                    return (
                        <div key={dim} className="relative">
                            <span className="text-gray-700 font-medium">
                                {dim.charAt(0).toUpperCase() + dim.slice(1)}:
                            </span>{" "}
                            <span
                                className="hover:underline cursor-pointer hover:text-blue-800"
                                onClick={() => {
                                    setModalDim(dim);
                                    setModalValues(selection[dim] || []);
                                }}
                            >
                                {formatted || "[None]"}
                            </span>
                        </div>
                    );
                })}
            </div>

            {modalDim && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-xl shadow-xl w-[90%] max-w-5xl grid grid-cols-2 gap-6 relative">
                        <h2 className="absolute top-4 left-6 text-xl font-semibold">
                            Select values for <span className="text-blue-600">{modalDim}</span>
                        </h2>

                        {/* Colonne de gauche : membres disponibles */}
                        <div className="flex flex-col border-r pr-4">
                            <input
                                type="text"
                                placeholder="Search..."
                                value={modalSearch}
                                onChange={(e) => setModalSearch(e.target.value)}
                                className="mb-3 border px-3 py-2 rounded"
                            />
                            <div className="overflow-y-auto max-h-[400px] space-y-1">
                                {(dimensionData[modalDim]?.members || [])
                                    .filter(m => {
                                        const label = m.label || m.id || "";
                                        return label.toLowerCase().includes(modalSearch.toLowerCase()) ||
                                            (m.id || "").toLowerCase().includes(modalSearch.toLowerCase());
                                    })
                                    .map((m) => (
                                        <div
                                            key={m.id}
                                            className={`cursor-pointer px-3 py-2 rounded hover:bg-gray-200 ${modalSelectedItem?.id === m.id ? "bg-blue-100" : ""
                                                }`}
                                            onClick={() => setModalSelectedItem(m)}
                                        >
                                            <div className="text-sm font-medium">{m.label}</div>
                                            <div className="text-xs text-gray-500">{m.id}</div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Colonne de droite : sélection en cours */}
                        <div className="flex flex-col">
                            <div className="border-b pb-4 mb-4">
                                <h3 className="font-semibold text-lg mb-2">Selected Item</h3>
                                {modalSelectedItem ? (
                                    <>
                                        <div className="text-md font-medium">
                                            {modalSelectedItem.label} ({modalSelectedItem.id})
                                        </div>
                                        {!EXCLUDED_DIMENSIONS_SELECTION_MODE.has(modalDim) && (
                                            <div className="flex gap-3 mt-2">
                                                {["Only", "Descendants", "Base"].map((mode) => (
                                                    <button
                                                        key={mode}
                                                        onClick={() => setModalSelectedMode(mode)}
                                                        className={`px-3 py-1 border rounded ${modalSelectedMode === mode
                                                            ? "bg-blue-600 text-white"
                                                            : "bg-gray-100"
                                                            }`}
                                                    >
                                                        {mode}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <button
                                            onClick={() => {
                                                if (modalSelectedItem) {
                                                    const value = EXCLUDED_DIMENSIONS_SELECTION_MODE.has(modalDim)
                                                        ? modalSelectedItem.id
                                                        : `${modalSelectedItem.id}$[${modalSelectedMode}]`;

                                                    if (!modalValues.includes(value)) {
                                                        setModalValues([...modalValues, value]);
                                                    }
                                                }
                                            }}
                                            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                        >
                                            Add to selection
                                        </button>
                                    </>
                                ) : (
                                    <p className="text-sm text-gray-500">Select a member from the left.</p>
                                )}
                            </div>

                            {/* Résumé de sélection */}
                            <div>
                                <h3 className="font-semibold text-lg mb-2">Selected Values</h3>
                                <ul className="space-y-1">
                                    {modalValues.map((val, idx) => (
                                        <li
                                            key={idx}
                                            className="flex justify-between items-center text-sm border px-3 py-1 rounded"
                                        >
                                            <span>{val}</span>
                                            <button
                                                onClick={() =>
                                                    setModalValues(modalValues.filter((v) => v !== val))
                                                }
                                                className="text-red-500 hover:underline text-xs"
                                            >
                                                Remove
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="mt-auto pt-4 flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setModalDim(null);
                                        setModalSelectedItem(null);
                                        setModalSelectedMode("Only");
                                        setModalValues([]);
                                    }}
                                    className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (modalValues.length > 0) {
                                            const updated = { ...selection, [modalDim]: modalValues };
                                            setSelection(updated);
                                            if (onChangePov) onChangePov(updated);
                                        }
                                        setModalDim(null);
                                        setModalSelectedItem(null);
                                        setModalSelectedMode("Only");
                                        setModalValues([]);
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
}
