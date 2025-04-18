import React, { useState, useEffect } from "react";

const DIMENSION_ORDER = [
    "scenario", "year", "period", "entity", "account",
    "custom1", "custom2", "custom3", "custom4",
    "ICP", "value", "view"
];

const DEFAULT_VALUES = {
    scenario: "[None]",
    year: "[None]",
    period: "[None]",
    entity: "[Base]",
    account: "[None]",
    custom1: "[None]",
    custom2: "[None]",
    custom3: "[None]",
    custom4: "[None]",
    ICP: "[None]",
    value: "[None]",
    view: "[None]"
};

const MOCK_OPTIONS = {
    scenario: ["ACTUAL", "BUD", "[None]"],
    year: ["2023", "2024", "2025", "[None]"],
    entity: ["[Base]", "Entity A", "Entity B", "[None]"],
};

export function PointOfView({ parameters, onChangePov }) {
    const [selection, setSelection] = useState(() => {
        const initial = {};
        for (const dim of DIMENSION_ORDER) {
            const isActive = parameters?.[dim]?.isActivated ?? false;
            const defaultVal = isActive ? parameters?.[dim]?.default : DEFAULT_VALUES[dim];
            initial[dim] = defaultVal;
        }
        return initial;
    });


    const [openDropdown, setOpenDropdown] = useState(null);

    const handleSelect = (dim, value) => {
        setSelection(prev => ({ ...prev, [dim]: value }));
        setOpenDropdown(null);
    };    
    
    useEffect(() => {
        if (onChangePov) {
            onChangePov(selection);
        }
    }, [selection]);

    return (
        <div className="flex p-2 flex-wrap gap-3 text-xs border-b shadow-sm">
            {DIMENSION_ORDER.map((dim) => {
                const isActivated = parameters?.[dim]?.isActivated ?? false;
                const options = MOCK_OPTIONS[dim] ?? [DEFAULT_VALUES[dim]];
                const selected = selection[dim];

                return (
                    <div key={dim} className="relative">
                        <span className="text-gray-700 font-medium">{dim.charAt(0).toUpperCase() + dim.slice(1)}:</span>{" "}
                        {isActivated ? (
                            <span
                                className="hover:underline cursor-pointer hover:text-blue-800"
                                onClick={() =>
                                    setOpenDropdown(openDropdown === dim ? null : dim)
                                }
                            >
                                {selected}
                            </span>
                        ) : (
                            <span className="text-gray-400 cursor-not-allowed">{selected}</span>
                        )}

                        {openDropdown === dim && isActivated && (
                            <div className="absolute z-10 mt-1 bg-white border rounded shadow w-36">
                                {options.map((opt) => (
                                    <div
                                        key={opt}
                                        onClick={() => handleSelect(dim, opt)}
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
