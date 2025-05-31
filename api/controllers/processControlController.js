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

    // 1. Charger le dernier fichier de dimension
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

    // Fonction pour créer l’arbre logique enraciné depuis pov.entity
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

    // 2. Journaux "posted"
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

    // 3. Lignes de journaux
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

    // 4. Données "data"
    const dataRes = await db.query(`
      SELECT * FROM data
      WHERE scenario = $1 AND year = $2 AND period = $3
    `, [pov.scenario, pov.year, pov.period]);

    const dataMap = {};
    dataRes.rows.forEach(d => {
      dataMap[d.entity] = parseFloat(d.value);
    });

    // 5. Journaux "draft"
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

    // 6. Construction de la réponse enrichie
    const enrichedTree = finalTree.map(e => {
      const postedSum = sums[e.id] ?? null;
      const storedValue = dataMap[e.id] ?? null;

      let calcStatus = "noData";

      if (postedSum !== null) {
        if (storedValue === null) {
          calcStatus = "calcNeeded";
        } else {
          const diff = Math.abs(postedSum - storedValue);
          calcStatus = diff < 0.0001 ? "upToDate" : "calcNeeded";
        }
      }

      if (
        e.children.length > 0 &&
        (postedSum === null || postedSum === 0) &&
        (storedValue === null || storedValue === 0) &&
        e.children.some(childId => dataMap[childId] !== undefined)
      ) {
        calcStatus = "consoNeeded";
      }

      const draftCount = draftCountByEntity[e.id] || 0;
      const journalStatus = draftCount > 0 ? "unPosted" : (journalByEntity[e.id] ? "posted" : "none");

      return {
        id: e.id,
        label: e.label,
        level: e.level ?? 0,
        parent: e.parent,
        hasChildren: e.children.length > 0,
        calcStatus,
        journalStatus,
        unpostedCount: draftCount,
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