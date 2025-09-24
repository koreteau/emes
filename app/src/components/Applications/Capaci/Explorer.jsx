import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { SmallSpinner } from "../../Spinner";
import { Button, Dialog, DialogHeader, DialogBody, DialogFooter } from "@material-tailwind/react";

const API_URL = "http://localhost:8080/api/documents";

const Explorer = ({ onOpenDocument }) => {
	const [loading, setLoading] = useState(true);
	const [documents, setDocuments] = useState([]);
	const [openFolders, setOpenFolders] = useState({});
	const [newFolderName, setNewFolderName] = useState("");
	const [openDialogNewFolder, setOpenDialogNewFolder] = React.useState(false);


	const fetchDocuments = async () => {
		setLoading(true);
		const token = localStorage.getItem("authToken");
		try {
			const res = await fetch(API_URL, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Erreur API");
			setDocuments(data);
		} catch (error) {
			toast.error("Impossible de charger les documents");
		}
		setLoading(false);
	};

	const createFolder = async () => {
		setLoading(true);
		if (!newFolderName) return toast.error("Nom du dossier requis");
		const token = localStorage.getItem("authToken");
		try {
			const res = await fetch(API_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					name: newFolderName,
					type: "folder",
					parent_id: null, // Racine
					security_classes: "public",
				}),
			});

			if (res.ok) {
				setNewFolderName("");
				fetchDocuments();
				toast.success("Dossier créé !");
				setLoading(false);
				setOpenDialogNewFolder();
			} else {
				toast.error("Erreur lors de la création");
				setLoading(false);
			}
		} catch (err) {
			toast.error("Erreur réseau");
			setLoading(false);
		}
	};

	const toggleFolder = (id) => {
		setOpenFolders((prev) => ({
			...prev,
			[id]: !prev[id],
		}));
	};

	const renderTree = (parentId = null, level = 0) => {
		const children = documents.filter((doc) => {
			return (doc.parent_id ?? null) === (parentId ?? null);
		});

		return children.map((doc) => (
			<React.Fragment key={doc.id}>
				<tr className="border-b hover:bg-gray-100">
					<td className="py-1 pl-2">
						<div className="flex items-center gap-2" style={{ paddingLeft: level * 20 }}>
							{doc.type === "folder" ? (
								<>
									<button
										onClick={() => toggleFolder(doc.id)}
										className="bg-transparent border-none p-0 m-0"
									>
										{openFolders[doc.id] ? (
											<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
												<path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
											</svg>
										) : (
											<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
												<path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
											</svg>
										)}
									</button>
									<span>{doc.name}</span>
								</>
							) : doc.type === "webform" ? (
								<>
									<span className="w-5 h-5 text-green-500">
										<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
											<path stroke-linecap="round" stroke-linejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
										</svg>
									</span>
									<span>
										<button
											className="hover:underline text-left"
											onClick={() => onOpenDocument(doc)}
										>
											{doc.name}
										</button>
									</span>
								</>
							) : doc.type === "report" ? (
								<>
									<span className="w-5 h-5 text-blue-500">
										<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
											<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25M9 16.5v.75m3-3v3M15 12v5.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
										</svg>
									</span>
									<span>
										<button
											className="hover:underline text-left"
											onClick={() => onOpenDocument(doc)}
										>
											{doc.name}
										</button>
									</span>
								</>
							) : (
								<>
									<span className="w-5 h-5">
										<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
											<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
										</svg>
									</span>
									<span>
										<button className="hover:underline">{doc.name}</button>
									</span>
								</>
							)}

						</div>
					</td>
					<td className="text-sm text-gray-600">{doc.type}</td>
					<td className="text-sm text-gray-600">{doc.path || "-"}</td>
					<td className="text-sm text-gray-600">{doc.security_classes}</td>
					<td className="text-sm text-gray-600">{doc.created_at}</td>
					<td className="text-sm text-gray-600">
						<button>
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
							</svg>
						</button>
					</td>
				</tr>

				{/* Afficher les enfants si dossier ouvert */}
				{doc.type === "folder" && openFolders[doc.id] && renderTree(doc.id, level + 1)}
			</React.Fragment>
		));
	};


	const handleOpenDialogNewFolder = () => setOpenDialogNewFolder(!openDialogNewFolder);

	useEffect(() => {
		fetchDocuments();
	}, []);

	const handleRefresh = () => {
		fetchDocuments();
	};

	return (
		<>
			<div className="flex items-center p-2 border-b gap-2 text-xs">
				<div className="flex gap-2">
					<button
						onClick={handleRefresh}
						className="p-0.5 rounded hover:bg-gray-200"
						title="Refresh"
					>
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
							<path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
						</svg>
					</button>
				</div>
				<div className="border-l-2 pl-2 flex gap-2">
					<div>
						<button onClick={handleOpenDialogNewFolder} title="Create folder">
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
							</svg>
						</button>
						<Dialog open={openDialogNewFolder} handler={handleOpenDialogNewFolder}>
							<DialogHeader>Create a new folder</DialogHeader>
							<DialogBody>
								<input
									value={newFolderName}
									onChange={(e) => setNewFolderName(e.target.value)}
									placeholder="Nom du dossier"
								/>
							</DialogBody>
							<DialogFooter>
								<Button
									variant="text"
									color="red"
									onClick={handleOpenDialogNewFolder}
									className="mr-1"
								>
									<span>Cancel</span>
								</Button>
								<Button variant="gradient" color="green" onClick={createFolder}>
									<span>Create</span>
								</Button>
							</DialogFooter>
						</Dialog>
					</div>
					<div>
						<button title="Add new file">
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
							</svg>
						</button>
					</div>
				</div>
				<div className="border-l-2 pl-2 flex gap-2">
					<div>
						<button title="More information">
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
								<path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
							</svg>
						</button>
					</div>
				</div>
			</div>
			{loading ? (
				<SmallSpinner />
			) : (
				<div>
					{documents.length === 0 ? (
						<p>Empty element.</p>
					) : (
						<table className="w-full text-left border text-sm">
							<thead className="bg-gray-200 text-xs uppercase">
								<tr>
									<th className="py-2 px-4">Name</th>
									<th className="py-2 px-4">Type</th>
									<th className="py-2 px-4">Database Path</th>
									<th className="py-2 px-4">Visibility</th>
									<th className="py-2 px-4">Created</th>
									<th className="py-2 px-4"></th>
								</tr>
							</thead>
							<tbody>
								{renderTree()}
							</tbody>
						</table>
					)}
				</div>
			)}
		</>
	);
};

export default Explorer;
