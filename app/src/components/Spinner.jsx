import { Spinner } from "@material-tailwind/react";

export function SmallSpinner () {
    return (
        <div className="flex justify-center items-center h-64 flex gap-2">
            <Spinner />
            Loading
        </div>
    )
}