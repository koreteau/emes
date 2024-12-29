import { useState, useEffect } from "react";

export function Header () {
    const [dateTime, setDateTime] = useState("");

    useEffect(() => {
        const updateDateTime = () => {
            const now = new Date();
            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const formattedDateTime = `${now.toLocaleDateString()} ${now.toLocaleTimeString()} (${timeZone})`;
            setDateTime(formattedDateTime);
        };

        // Initial update
        updateDateTime();

        // Update every second
        const intervalId = setInterval(updateDateTime, 1000);
        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="bg-black text-white flex justify-between items-center px-4 py-1 text-xs">
            {/* Left: Production Label */}
            <div className="bg-red-500 text-white px-2 py-1 rounded">
                PRODUCTION
            </div>

            {/* Right: Date and Time */}
            <div>
                {dateTime}
            </div>
        </div>
    );
}