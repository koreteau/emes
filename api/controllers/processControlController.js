const db = require("../config/db");
const path = require("path");
const fs = require("fs");

const DIMENSION_ROOT = "../database/config";

// 🛠️ Nettoie les paramètres de type $[Only], $[Descendants], $[Base]
const cleanValueAndMode = (raw) => {
    if (!raw) return { value: null, mode: "Only" };
    const match = raw.match(/^(.*?)\$?\[(Only|Descendants|Base)\]$/);
    if (match) {
        return { value: match[1], mode: match[2] };
    }
    return { value: raw, mode: "Only" };
};

const getStatusTree = async (req, res) => {
    try {
        const rawPov = req.query;
        console.log("📥 Requête reçue avec POV:", rawPov);

        const povKeys = ["scenario", "year", "period"];
        if (!povKeys.every(k => rawPov[k])) {
            return res.status(400).json({ error: "POV incomplet (scenario, year, period requis)" });
        }

        const { value: entityId, mode: entityMode } = cleanValueAndMode(rawPov.entity);
        const { value: period } = cleanValueAndMode(rawPov.period);
        const { value: scenario } = cleanValueAndMode(rawPov.scenario);
        const { value: year } = cleanValueAndMode(rawPov.year);

        console.log("🔧 POV nettoyé:", { scenario, year, period, entityId, entityMode });

        // 🔄 Charger les dimensions
        const dimRes = await db.query(`SELECT path FROM capaci_dimension_data ORDER BY created_at DESC LIMIT 1`);
        const jsonPath = path.join(DIMENSION_ROOT, `${dimRes.rows[0].path}.json`);
        const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        const entityMembers = parsed?.entity?.members || [];
        const valueMembers = parsed?.value?.members || [];
        const custom2Members = parsed?.custom2?.members || [];
        const accountMembers = parsed?.account?.members || [];

        const curDescendants = custom2Members
            .filter(m => m.parent && (m.parent === 'CUR' || m.parent.startsWith('CUR')))
            .map(m => m.id);
        const isExcludedCustom2 = (c2) => curDescendants.includes(c2);

        // Fonction pour obtenir tous les descendants d'un parent donné
        const getDescendantsOfParent = (parentId, members) => {
            const descendants = [];
            const stack = [parentId];

            while (stack.length > 0) {
                const currentParent = stack.pop();
                const children = members.filter(m => m.parent === currentParent);
                children.forEach(child => {
                    descendants.push(child.id);
                    stack.push(child.id);
                });
            }
            return descendants;
        };

        // Exclure les descendants de CURRENCY et OWNERSHIP
        const currencyDescendants = getDescendantsOfParent('CURRENCY', accountMembers);
        const ownershipDescendants = getDescendantsOfParent('OWNERSHIP', accountMembers);
        const excludedAccounts = [...currencyDescendants, ...ownershipDescendants];
        const isExcludedAccount = (account) => excludedAccounts.includes(account);

        // Debug: Afficher les exclusions
        console.log("🔍 curDescendants:", curDescendants);
        console.log("🔍 excludedAccounts:", excludedAccounts);
        console.log("🔍 '[None]' est exclu:", isExcludedCustom2('[None]'));

        // 🧱 Construire la hiérarchie d'entité
        const entities = entityMembers.map(e => ({ ...e, children: [], level: null }));
        const entityMap = Object.fromEntries(entities.map(e => [e.id, e]));
        entities.forEach(e => {
            if (e.parent && entityMap[e.parent]) entityMap[e.parent].children.push(e.id);
        });

        const getDescendants = (startId, tree) => {
            const stack = [{ id: startId, level: 0 }];
            const result = {};
            while (stack.length) {
                const { id, level } = stack.pop();
                const node = tree[id];
                if (node && !result[id]) {
                    result[id] = { ...node, level };
                    node.children.forEach(childId => stack.push({ id: childId, level: level + 1 }));
                }
            }
            return Object.values(result);
        };

        let selectedEntities = [];
        if (entityId) {
            const descendants = getDescendants(entityId, entityMap);
            if (entityMode === "Only") selectedEntities = [entityMap[entityId]].filter(Boolean);
            else if (entityMode === "Descendants") selectedEntities = descendants;
            else if (entityMode === "Base") selectedEntities = descendants.filter(e => e.children.length === 0);
        } else {
            selectedEntities = entities;
        }
        const entityIds = selectedEntities.map(e => e.id);

        // 📦 Charger les données
        const dataRows = await db.query(`
            SELECT entity, value, custom2, account, SUM(data_value::numeric) as data_value
            FROM capaci_data
            WHERE scenario = $1 AND year = $2 AND period = $3
            AND entity = ANY($4)
            GROUP BY entity, value, custom2, account
        `, [scenario, year, period, entityIds]);

        const stagedRows = await db.query(`
            SELECT entity, value, custom2, account, source, SUM(data_value::numeric) as data_value
            FROM capaci_staged_data
            WHERE scenario = $1 AND year = $2 AND period = $3
            AND entity = ANY($4)
            GROUP BY entity, value, custom2, account, source
        `, [scenario, year, period, entityIds]);

        const draftRows = await db.query(`
            SELECT entity FROM capaci_journals
            WHERE scenario = $1 AND year = $2 AND period = $3 AND status = 'draft'
        `, [scenario, year, period]);

        // 📇 Indexation
        const dataMap = {};
        const contributionTotalMap = {}; // Séparer les Contribution Total
        const stagedMap = {};
        const sourcesMap = {};

        dataRows.rows.forEach(row => {
            console.log(`📊 Processing data row: ${row.entity}|${row.value}|${row.custom2}|${row.account} = ${row.data_value}`);

            // Filtrer les comptes techniques
            if (isExcludedAccount(row.account)) {
                console.log(`🚫 Excluded account: ${row.account}`);
                return;
            }

            // Pour [Contribution Total], on ne filtre pas par custom2
            if (row.value === '[Contribution Total]') {
                contributionTotalMap[row.entity] = (contributionTotalMap[row.entity] || 0) + parseFloat(row.data_value);
                console.log(`✅ Added [Contribution Total] for ${row.entity}: ${row.data_value}`);
            } else {
                // Pour les autres données, on applique le filtre custom2
                if (isExcludedCustom2(row.custom2)) {
                    console.log(`🚫 Excluded custom2: ${row.custom2} for ${row.entity}|${row.value}`);
                    return;
                }

                // Filtrer les valeurs techniques [None]
                if (row.value === '[None]') {
                    console.log(`🚫 Excluded [None] value for ${row.entity}`);
                    return;
                }

                dataMap[`${row.entity}|${row.value}`] = parseFloat(row.data_value);
                console.log(`✅ Added data: ${row.entity}|${row.value} = ${row.data_value}`);
            }
        });

        stagedRows.rows.forEach(row => {
            // Filtrer les comptes techniques
            if (isExcludedAccount(row.account)) {
                return;
            }

            // Filtrer les custom2 exclus
            if (isExcludedCustom2(row.custom2)) {
                return;
            }

            const key = `${row.entity}|${row.value}`;
            stagedMap[key] = (stagedMap[key] || 0) + parseFloat(row.data_value);
            if (!sourcesMap[key]) sourcesMap[key] = new Set();
            if (row.source) sourcesMap[key].add(row.source);
        });

        const draftCountByEntity = {};
        draftRows.rows.forEach(row => {
            draftCountByEntity[row.entity] = (draftCountByEntity[row.entity] || 0) + 1;
        });

        // Construction de la hiérarchie des valeurs
        const valueMap = Object.fromEntries(valueMembers.map(v => [v.id, v]));
        const valueChildrenMap = {};
        for (const v of valueMembers) {
            if (v.parent) {
                if (!valueChildrenMap[v.parent]) valueChildrenMap[v.parent] = [];
                valueChildrenMap[v.parent].push(v.id);
            }
        }

        const enrichedTree = selectedEntities.map(e => {
            const { id, label, level, parent, children } = e;
            const hasChildren = children.length > 0;

            // Debug base
            console.log(`\n📦 Entity: ${id} (${label})`);

            // Toutes les clés présentes dans capaci_data
            const dataKeys = Object.keys(dataMap).filter(k => k.startsWith(`${id}|`));
            const stagedKeys = Object.keys(stagedMap).filter(k => k.startsWith(`${id}|`));

            const hasData = dataKeys.length > 0;
            const hasStaged = stagedKeys.length > 0;

            console.log(`📊 hasData: ${hasData}, hasStaged: ${hasStaged}`);

            // Vérifier si cette entité a un [Contribution Total]
            const hasContributionTotal = contributionTotalMap[id] !== undefined;
            const hasOtherData = dataKeys.length > 0; // Les autres données (non [Contribution Total])
            const hasStagedEntityCurrency = stagedMap[`${id}|<Entity Currency>`] !== undefined;

            console.log(`🔍 hasContributionTotal: ${hasContributionTotal} (value: ${contributionTotalMap[id]})`);
            console.log(`🔍 hasOtherData: ${hasOtherData}`);
            console.log(`🔍 hasStagedEntityCurrency: ${hasStagedEntityCurrency}`);
            console.log(`🧒 hasChildren: ${hasChildren}`);

            // Vérifier si les enfants ont des [Contribution Total]
            const childHasContribution = children.some(childId => {
                const childContrib = contributionTotalMap[childId] !== undefined;
                console.log(`    ↳ 👶 Child ${childId} has [CT]: ${childContrib}`);
                return childContrib;
            });

            console.log(`👨‍👦‍👦 childHasContribution: ${childHasContribution}`);

            let calcStatus = 'noData';

            if (hasContributionTotal) {
                calcStatus = 'upToDate';
                console.log(`✅ Status = upToDate`);
            } else if (!parent && stagedMap[`${id}|<Entity Currency>`] !== undefined) {
                calcStatus = 'upToDate';
                console.log(`✅ Status = upToDate (no parent + <Entity Currency>)`);
            } else if (hasOtherData) {
                calcStatus = 'raiseNeeded';
                console.log(`🔼 Status = raiseNeeded`);
            } else if (hasStaged) {
                calcStatus = 'calcNeeded';
                console.log(`🛠️ Status = calcNeeded`);
            } else if (hasChildren && childHasContribution && !hasStagedEntityCurrency) {
                calcStatus = 'rollupNeeded';
                console.log(`📥 Status = rollupNeeded`);
            } else {
                calcStatus = 'noData';
                console.log(`🚫 Status = noData`);
            }

            return {
                id,
                label,
                level,
                parent,
                children,
                hasChildren,
                calcStatus,
                journalStatus: "none",
                unpostedCount: draftCountByEntity[id] || 0,
                reviewLevel: null
            };
        });

        res.status(200).json(enrichedTree);
    } catch (err) {
        console.error("❌ Erreur getStatusTree:", err.stack || err.message);
        res.status(500).json({ error: "Erreur serveur", detail: err.message });
    }
};

module.exports = {
    getStatusTree
};