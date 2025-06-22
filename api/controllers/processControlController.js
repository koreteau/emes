const db = require("../config/db");
const path = require("path");
const fs = require("fs");

const DIMENSION_ROOT = "../database/config";

const getStatusTree = async (req, res) => {
    try {
        const pov = req.query;
        const povKeys = ["scenario", "year", "period"];
        if (!povKeys.every(k => pov[k])) {
            return res.status(400).json({ error: "POV incomplet (scenario, year, period requis)" });
        }

        const result = await db.query(`SELECT path FROM dimensionData ORDER BY created_at DESC LIMIT 1`);
        if (result.rows.length === 0) return res.status(404).json({ error: "Aucune dimension trouvée" });

        const jsonPath = path.join(DIMENSION_ROOT, `${result.rows[0].path}.json`);
        if (!fs.existsSync(jsonPath)) return res.status(404).json({ error: "Fichier JSON manquant" });

        const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        const members = parsed?.entity?.members || [];

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
            if (!entityMap[pov.entity]) return res.status(400).json({ error: "Entité inconnue dans le POV" });
            finalTree = getDescendants(pov.entity);
        }

        // Données officielles
        const dataRes = await db.query(`
      SELECT * FROM data
      WHERE scenario = $1 AND year = $2 AND period = $3
    `, [pov.scenario, pov.year, pov.period]);

        const dataMap = {};
        dataRes.rows.forEach(d => {
            dataMap[d.entity] = parseFloat(d.value);
        });

        // Données staging <Entity Currency>
        const stagedRes = await db.query(`
      SELECT entity, SUM(data_value::numeric) as value
      FROM staged_data
      WHERE scenario = $1 AND year = $2 AND period = $3
        AND value = '<Entity Currency>'
      GROUP BY entity
    `, [pov.scenario, pov.year, pov.period]);

        const stagedMap = {};
        stagedRes.rows.forEach(row => {
            stagedMap[row.entity] = parseFloat(row.value);
        });

        // Brouillons
        const draftRes = await db.query(`
      SELECT * FROM journals
      WHERE status = 'draft'
        AND scenario = $1 AND year = $2 AND period = $3
    `, [pov.scenario, pov.year, pov.period]);

        const draftCountByEntity = {};
        for (const j of draftRes.rows) {
            if (!draftCountByEntity[j.entity]) draftCountByEntity[j.entity] = 0;
            draftCountByEntity[j.entity]++;
        }

        // Première passe : calcul initial des statuts
        const enrichedTree = finalTree.map(e => {
            const stagedValue = stagedMap[e.id] ?? null;
            const storedValue = dataMap[e.id] ?? null;

            let calcStatus = "noData";

            if (stagedValue !== null) {
                if (storedValue === null) {
                    calcStatus = "calcNeeded";
                } else {
                    const diff = Math.abs(stagedValue - storedValue);
                    calcStatus = diff < 0.0001 ? "upToDate" : "calcNeeded";
                }
            }

            const draftCount = draftCountByEntity[e.id] || 0;
            const journalStatus = draftCount > 0 ? "unPosted" : "none";

            return {
                id: e.id,
                label: e.label,
                level: e.level ?? 0,
                parent: e.parent,
                children: e.children,
                hasChildren: e.children.length > 0,
                calcStatus,
                journalStatus,
                unpostedCount: draftCount,
                reviewLevel: null
            };
        });

        // Propagation consoNeeded depuis les feuilles vers la racine
        const calcStatusById = Object.fromEntries(
            enrichedTree.map(e => [e.id, e.calcStatus])
        );

        const sortedByLevelDesc = [...enrichedTree].sort((a, b) => (b.level ?? 0) - (a.level ?? 0));

        sortedByLevelDesc.forEach(e => {
            if (
                e.hasChildren &&
                calcStatusById[e.id] === "noData" &&
                e.children.some(childId => {
                    const status = calcStatusById[childId];
                    return status && status !== "noData";
                })
            ) {
                calcStatusById[e.id] = "consoNeeded";
            }
        });

        enrichedTree.forEach(e => {
            e.calcStatus = calcStatusById[e.id];
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
