const db = require("../config/db");
const path = require("path");
const fs = require("fs");

const DIMENSION_ROOT = "../database/config";

const getStatusTree = async (req, res) => {
	try {
		const pov = req.query;
		const povKeys = ["scenario", "year", "period"];
		const hasPov = povKeys.every(k => pov[k]);

		if (!hasPov) {
			return res.status(400).json({ error: "POV incomplet (scenario, year, period requis)" });
		}

		// 1. Charger la dernière dimension
		const result = await db.query(`
			SELECT path FROM dimensionData
			ORDER BY created_at DESC
			LIMIT 1
		`);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: "Aucun document dimension disponible" });
		}

		const relativePath = result.rows[0].path;
		const fullPath = path.join(DIMENSION_ROOT, `${relativePath}.json`);
		if (!fs.existsSync(fullPath)) {
			return res.status(404).json({ error: "Fichier JSON introuvable" });
		}
		const fileContent = fs.readFileSync(fullPath, "utf-8");
		const parsed = JSON.parse(fileContent);
		const members = parsed?.entity?.members || [];

		// 2. Construire la hiérarchie brute
		const entities = members.map(e => ({
			...e,
			parentIds: Array.isArray(e.parent) ? e.parent : (e.parent ? [e.parent] : []),
			children: [],
			level: null
		}));
		const entityMap = Object.fromEntries(entities.map(e => [e.id, e]));
		entities.forEach(e => {
			e.parentIds.forEach(p => {
				if (entityMap[p]) {
					entityMap[p].children.push(e.id);
				}
			});
		});

		// 3. Fonction pour reconstruire l'arbre logique depuis pov.entity
		const getDescendants = (startId) => {
			const stack = [{ id: startId, level: 0, parent: null }];
			const resultMap = {};

			while (stack.length > 0) {
				const { id, level, parent } = stack.pop();
				if (!resultMap[id]) {
					const node = entityMap[id];
					if (node) {
						resultMap[id] = {
							id: node.id,
							label: node.label,
							level,
							parent,
							children: node.children
						};
						node.children.forEach(childId => {
							stack.push({ id: childId, level: level + 1, parent: id });
						});
					}
				}
			}
			return Object.values(resultMap);
		};

		let finalTree = entities;
		if (pov.entity) {
			if (!entityMap[pov.entity]) {
				return res.status(400).json({ error: `Entité "${pov.entity}" introuvable` });
			}
			finalTree = getDescendants(pov.entity);
		}

		// 4. Récupérer les journaux 'posted' pour ce POV
		const journalRes = await db.query(`
			SELECT * FROM journals
			WHERE status = 'posted'
			AND scenario = $1 AND year = $2 AND period = $3
		`, [pov.scenario, pov.year, pov.period]);

		const journalIds = journalRes.rows.map(j => j.id);
		const journalByEntity = {};
		for (const j of journalRes.rows) {
			if (!journalByEntity[j.entity]) journalByEntity[j.entity] = [];
			journalByEntity[j.entity].push(j.id);
		}

		// 5. Récupérer les lignes associées à ces journaux
		const lineRes = await db.query(`
			SELECT jl.*, j.entity
			FROM journal_lines jl
			INNER JOIN journals j ON jl.journal_id = j.id
			WHERE j.id = ANY($1)
		`, [journalIds]);

		const sums = {};
		lineRes.rows.forEach(line => {
			const ent = line.entity;
			if (!sums[ent]) sums[ent] = 0;
			sums[ent] += parseFloat(line.amount);
		});

		// 6. Charger les valeurs dans data pour ce POV
		const dataRes = await db.query(`
			SELECT * FROM data
			WHERE scenario = $1 AND year = $2 AND period = $3
		`, [pov.scenario, pov.year, pov.period]);

		const dataMap = {};
		dataRes.rows.forEach(d => {
			dataMap[d.entity] = parseFloat(d.value);
		});

		// 7. Enrichir l'arbre avec les statuts
		const enrichedTree = finalTree.map(e => {
			const postedSum = sums[e.id] ?? null;
			const storedValue = dataMap[e.id] ?? null;

			let calcStatus = "noData";
			if (postedSum !== null && storedValue === null) calcStatus = "needsRecalc";
			else if (postedSum !== null && storedValue !== null) {
				const diff = Math.abs(postedSum - storedValue);
				calcStatus = diff < 0.0001 ? "upToDate" : "needsRecalc";
			}

			const journalStatus = journalByEntity[e.id] ? "hasPosted" : "none";

			return {
				id: e.id,
				label: e.label,
				level: e.level ?? 0,
				parent: e.parent,
				hasChildren: e.children.length > 0,
				calcStatus,
				journalStatus,
				reviewLevel: null
			};
		});

		res.status(200).json(enrichedTree);

	} catch (err) {
		console.error("❌ Erreur getStatusTree:", err.message);
		res.status(500).json({ error: "Erreur serveur" });
	}
};

module.exports = {
	getStatusTree
};