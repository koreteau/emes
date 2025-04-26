import React, { useState, useEffect } from "react";
import { resolveDimensionMembers } from "./utils/dimensionUtils";

const DIMENSION_ORDER = [
    "scenario", "year", "period", "entity", "account",
    "custom1", "custom2", "custom3", "custom4", "ICP", "value", "view"
];

export function PointOfView({ parameters, structure, dimensionData, onChangePov }) {
    const [selection, setSelection] = useState({});
    const [openDropdown, setOpenDropdown] = useState(null);

    useEffect(() => {
        const initial = {};
        for (const dim of DIMENSION_ORDER) {
            const isActive = parameters?.[dim]?.isActivated ?? false;
            if (isActive) {
                initial[dim] = parameters?.[dim]?.default || "[None]";
            }
        }
        setSelection(initial);
    }, [parameters]);

    useEffect(() => {
        if (onChangePov) {
            onChangePov(selection);
        }
    }, [selection]);

    const dimsUsedInWebform = new Set([
        ...(structure?.rows || []),
        ...(structure?.columns || [])
    ]);

    const getOptionsForDimension = (dim) => {
        const allMembers = dimensionData?.[dim]?.members || [];
        const defaultFilter = parameters?.[dim]?.filter;
        if (defaultFilter) {
            const members = resolveDimensionMembers(allMembers, defaultFilter);
            return members.map(m => m.id);
        }
        return allMembers.map(m => m.id);
    };

    return (
        <div className="flex p-2 flex-wrap gap-3 text-xs border-b shadow-sm">
            {DIMENSION_ORDER.filter(dim => {
                const isActivated = parameters?.[dim]?.isActivated ?? false;
                return isActivated && !dimsUsedInWebform.has(dim);
            }).map((dim) => {
                const options = getOptionsForDimension(dim);
                const selected = selection[dim];

                return (
                    <div key={dim} className="relative">
                        <span className="text-gray-700 font-medium">
                            {dim.charAt(0).toUpperCase() + dim.slice(1)}:
                        </span>{" "}
                        <span
                            className="hover:underline cursor-pointer hover:text-blue-800"
                            onClick={() => setOpenDropdown(openDropdown === dim ? null : dim)}
                        >
                            {selected}
                        </span>

                        {openDropdown === dim && (
                            <div className="absolute z-10 mt-1 bg-white border rounded shadow w-36">
                                {options.map((opt) => (
                                    <div
                                        key={opt}
                                        onClick={() => {
                                            setSelection(prev => ({ ...prev, [dim]: opt }));
                                            setOpenDropdown(null);
                                        }}
                                        className="px-2 py-1 hover:bg-blue-100 cursor-pointer text-sm"
                                    >
                                        {opt}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
