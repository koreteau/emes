import { useEffect, useState } from "react";
import { SmallSpinner } from "../../Spinner";

export function SystemMessages() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [showDialog, setShowDialog] = useState(false);

    const fetchLogs = async () => {
        setLoading(true);
        const token = localStorage.getItem("authToken");
        const res = await fetch("http://localhost:8080/api/logs", {
            headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        setLogs(json);
        setLoading(false);
    };

    const downloadLogFile = () => {
        if (!selectedLog?.log_file_content) return;

        const blob = new Blob([selectedLog.log_file_content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectedLog.name || 'log'}.txt`;
        link.click();

        URL.revokeObjectURL(url);
    };

    const handleLogClick = (log) => {
        setSelectedLog(log);
        setShowDialog(true);
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    return (
        <div className="w-full h-full overflow-auto">
            <div className="flex items-center justify-between p-1 border-b text-xs">
                <div>
                    <button onClick={fetchLogs} className="hover:bg-gray-200 p-1 rounded" title="Rafraîchir">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                    </button>
                </div>
            </div>
            {loading ? (
                <SmallSpinner />
            ) : (
                <table className="w-full text-left border text-sm">
                    <thead className="bg-gray-200 text-xs uppercase">
                        <tr>
                            <th className="py-2 px-4">Date</th>
                            <th className="py-2 px-4">App</th>
                            <th className="py-2 px-4">Name</th>
                            <th className="py-2 px-4">User</th>
                            <th className="py-2 px-4">Type</th>
                            <th className="py-2 px-4">Message</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr
                                key={log.id}
                                className="hover:bg-gray-50 cursor-pointer border-b hover:bg-gray-100"
                                onClick={() => handleLogClick(log)}
                            >
                                <td className="text-sm py-1 pl-2">{new Date(log.created_at).toLocaleString()}</td>
                                <td className="text-sm ">{log.app}</td>
                                <td className="text-sm ">{log.name}</td>
                                <td className="text-sm ">{log.username}</td>
                                <td className={`text-sm ${log.type === "error" ? "text-red-600" : "text-gray-800"}`}>{log.type}</td>
                                <td className="text-sm ">{log.output}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {showDialog && selectedLog && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-lg w-2/3 max-h-[80vh] overflow-auto">
                        <h2 className="text-lg font-bold mb-2">Log Details</h2>
                        <pre className="text-xs bg-gray-100 p-3 rounded border max-h-[60vh] overflow-auto whitespace-pre-wrap">
                            {selectedLog.log_file_content || "(Aucun contenu disponible)"}
                        </pre>
                        <div className="mt-4 text-right">
                            <button
                                className="text-sm px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
                                onClick={downloadLogFile}
                            >
                                Télécharger (.txt)
                            </button>
                            <button
                                className="text-sm px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                                onClick={() => setShowDialog(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
