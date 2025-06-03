import React from "react";

export function ToolBar({ onRefresh, onCalculate, onConsolidate, onSave }) {
	return (
		<div className="flex items-center p-2 border-b gap-2 text-xs">
			{onRefresh && (
				<div className="flex gap-2">
					<button
						onClick={onRefresh}
						className="p-0.5 rounded hover:bg-gray-200"
						title="Refresh"
					>
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
							<path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
						</svg>
					</button>
				</div>
			)}

			{(onCalculate || onConsolidate) && (
				<div className="border-l-2 pl-2 flex gap-2">
					{onCalculate && (
						<button onClick={onCalculate} title="Calculate">
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
								<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" />
							</svg>
						</button>
					)}
					{onConsolidate && (
						<button onClick={onConsolidate} title="Consolidate">
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
								<path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h2.25A2.25 2.25 0 0 1 7.5 6.75v11.25A2.25 2.25 0 0 1 5.25 20.25H3m0-15.75v15.75M21 4.5h-2.25A2.25 2.25 0 0 0 16.5 6.75v11.25a2.25 2.25 0 0 0 2.25 2.25H21m0-15.75v15.75M12 4.5v15" />
							</svg>
						</button>
					)}
				</div>
			)}

			{onSave && (
				<div className="border-l-2 pl-2 flex gap-2">
					<button onClick={onSave} title="Save">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
							<path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
						</svg>
					</button>
				</div>
			)}
		</div>
	);
}