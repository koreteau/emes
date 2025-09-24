const db = require('../config/db');
const path = require("path");
const fs = require("fs");
const { checkPermissions } = require('../middleware/permissions');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const puppeteer = require('puppeteer');


const WEBFORM_ROOT = "../database/documents"


// Créer un document (folder, webform, report)
const createDocument = async (req, res) => {
    const { name, type, path, parent_id, security_classes } = req.body;

    if (!name || !type) {
        return res.status(400).json({ error: "Nom et type sont obligatoires" });
    }

    try {
        const query = `
            INSERT INTO capaci_documents (name, type, path, parent_id, security_classes)
            VALUES ($1, $2, $3, CAST(NULLIF($4, '') AS UUID), $5)
            RETURNING *;
        `;
        const values = [name, type, path || null, parent_id || null, security_classes || 'public'];

        const result = await db.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Erreur lors de la création du document:", err.message);
        res.status(500).json({ error: "Erreur lors de la création du document" });
    }
};

// Récupérer tous les documents (filtrage par permissions uniquement)
const getAllDocuments = async (req, res) => {
    const userId = req.user.id;

    try {
        let query;
        let values = [];

        if (req.user.is_admin) {
            query = `SELECT * FROM capaci_documents ORDER BY name`;
        } else {
            const authorizedClasses = await checkPermissions(userId, 'documents', 'read');
            query = `
                SELECT * FROM capaci_documents
                WHERE security_classes = ANY($1)
                ORDER BY name;
            `;
            values = [authorizedClasses];
        }

        const result = await db.query(query, values);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Erreur lors de la récupération des documents:", err.message);
        res.status(500).json({ error: "Erreur lors de la récupération des documents" });
    }
};


// Récupérer un document par ID
const getDocumentById = async (req, res) => {
    const { documentId } = req.params;
    const userId = req.user.id;

    try {
        let query = `SELECT * FROM capaci_documents WHERE id = $1`;
        let values = [documentId];

        if (!req.user.is_admin) {
            const authorizedClasses = await checkPermissions(userId, 'documents', 'read');

            query += ` AND security_classes = ANY($2)`;
            values.push(authorizedClasses);
        }

        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Document non trouvé" });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error("Erreur lors de la récupération du document:", err.message);
        res.status(500).json({ error: "Erreur serveur" });
    }
};


/*
// V1 -> PROD
const getDocumentContentById = async (req, res) => {
    const { documentId } = req.params;
    const userId = req.user.id;

    try {
      let query = `SELECT * FROM capaci_documents WHERE id = $1`;
      let values = [documentId];
  
      if (!req.user.is_admin) {
        const authorizedClasses = await checkPermissions(userId, "documents", "read");
  
        query += ` AND security_classes = ANY($2)`;
        values.push(authorizedClasses);
      }
  
      const result = await db.query(query, values);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Document introuvable ou non autorisé" });
      }
  
      const doc = result.rows[0];
  
      const fullPath = path.join(WEBFORM_ROOT, `${doc.path}.json`);
  
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: "Fichier JSON introuvable sur le disque" });
      }
  
      const fileContent = fs.readFileSync(fullPath, "utf-8");
      const parsed = JSON.parse(fileContent);
  
      // ✅ On ne retourne que ce qui est utile maintenant
      res.status(200).json({
        parameters: parsed.parameters || {},
        structure: parsed.structure || {}
      });
  
    } catch (err) {
      res.status(500).json({ error: "Erreur serveur lors de la lecture du fichier JSON" });
    }
};
*/

// V2 -> DEV (ajout du support "report")
const getDocumentContentById = async (req, res) => {
    const { documentId } = req.params;
    const userId = req.user.id;

    try {
        let query = `SELECT * FROM capaci_documents WHERE id = $1`;
        let values = [documentId];

        if (!req.user.is_admin) {
            const authorizedClasses = await checkPermissions(userId, "documents", "read");
            query += ` AND security_classes = ANY($2)`;
            values.push(authorizedClasses);
        }

        const result = await db.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Document introuvable ou non autorisé" });
        }

        const doc = result.rows[0];
        const fullPath = path.join(WEBFORM_ROOT, `${doc.path}.json`);

        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: "Fichier JSON introuvable sur le disque" });
        }

        const parsed = JSON.parse(fs.readFileSync(fullPath, "utf-8"));

        // 🧠 Retour adapté selon le type
        if (doc.type === "report") {
            return res.status(200).json({
                type: "report",
                parameters: parsed.parameters || {},
                layout: parsed.layout || {},
                sections: parsed.sections || []
            });
        } else {
            // Comportement existant pour les webforms
            return res.status(200).json({
                type: "webform",
                parameters: parsed.parameters || {},
                structure: parsed.structure || {}
            });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur lors de la lecture du fichier JSON" });
    }
};


// Modifier un document
const updateDocument = async (req, res) => {
    const { documentId } = req.params;
    const { name, path, security_classes, parent_id } = req.body;

    try {
        const query = `
            UPDATE capaci_documents
            SET name = COALESCE($1, name),
                path = COALESCE($2, path),
                security_classes = COALESCE($3, security_classes),
                parent_id = COALESCE(CAST(NULLIF($4, '') AS UUID), parent_id)
            WHERE id = $5
            RETURNING *;
        `;
        const values = [name, path, security_classes, parent_id, documentId];

        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Document non trouvé" });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error("Erreur lors de la mise à jour du document:", err.message);
        res.status(500).json({ error: "Erreur serveur" });
    }
};

// Supprimer un document
const deleteDocument = async (req, res) => {
    const { documentId } = req.params;

    try {
        const result = await db.query("DELETE FROM capaci_documents WHERE id = $1 RETURNING *", [documentId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Document non trouvé" });
        }

        res.status(200).json({ message: "Document supprimé", documentId: result.rows[0].id });
    } catch (err) {
        console.error("Erreur lors de la suppression du document:", err.message);
        res.status(500).json({ error: "Erreur serveur" });
    }
};


// V1 -> DEV (ajout pour fonctionnalité reports)
const renderReport = async (req, res) => {
    const { documentId } = req.params;
    const { format = 'pdf' } = req.query;
    const { pov = {} } = req.body || {};
    const userId = req.user.id;

    try {
        // 1) Lire doc + permissions
        let query = `SELECT * FROM capaci_documents WHERE id = $1`;
        let values = [documentId];

        if (!req.user.is_admin) {
            const authorizedClasses = await checkPermissions(userId, "documents", "read");
            query += ` AND security_classes = ANY($2)`;
            values.push(authorizedClasses);
        }
        const result = await db.query(query, values);
        if (result.rows.length === 0) return res.status(404).json({ error: "Document introuvable" });

        const doc = result.rows[0];
        const fullPath = path.join(WEBFORM_ROOT, `${doc.path}.json`);
        if (!fs.existsSync(fullPath)) return res.status(404).json({ error: "Fichier JSON introuvable" });

        const def = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
        if (doc.type !== 'report') return res.status(400).json({ error: "Le document n'est pas un rapport" });

        // 2) Charger les dimensions (pour résoudre expr. de membres)
        const baseUrl = process.env.PUBLIC_API_BASE || 'http://localhost:8080';
        const auth = req.headers.authorization || '';
        const dimResp = await fetch(`${baseUrl}/api/dimensions/latest`, { headers: { Authorization: auth } });
        const dimensionData = await dimResp.json();

        // 3) Petits helpers (alignés sur le front)
        const parseStructureItem = (item) => {
            if (item.includes('=')) {
                const [dim, expr] = item.split('=');
                return { dim: dim.trim(), expr: expr.trim() };
            } else {
                return { dim: item.trim(), expr: null };
            }
        };

        // Résolution d'expressions via le même util que le front (implémentation simple ici)
        const resolveExpr = (members, expr) => {
            // Appelle l'endpoint du front si vous avez une logique complexe.
            // Ici, version minimaliste : si expr contient "$[Base]" on ne prend que les feuilles.
            if (!expr) return members.map(m => m.id);
            if (expr.endsWith('$[Only]')) {
                const id = expr.replace('$[Only]', '').trim();
                return members.some(m => m.id === id) ? [id] : [];
            }
            if (expr.endsWith('$[Base]')) {
                const root = expr.replace('$[Base]', '').trim();
                const stack = [root]; const out = new Set();
                while (stack.length) {
                    const cur = stack.pop();
                    const children = members.filter(m => m.parent === cur);
                    if (children.length === 0) out.add(cur);
                    else stack.push(...children.map(c => c.id));
                }
                return [...out];
            }
            if (expr.endsWith('$[Descendants]')) {
                const root = expr.replace('$[Descendants]', '').trim();
                const stack = [root]; const out = new Set();
                while (stack.length) {
                    const cur = stack.pop(); out.add(cur);
                    const children = members.filter(m => m.parent === cur).map(m => m.id);
                    stack.push(...children);
                }
                return [...out];
            }
            // Fallback: membre exact
            return members.some(m => m.id === expr) ? [expr] : [];
        };

        const buildAxis = (axisList = []) => {
            const results = [];
            for (const item of axisList) {
                const { dim, expr } = parseStructureItem(item);
                const members = dimensionData[dim]?.members || [];
                const ids = expr ? resolveExpr(members, expr) : members.map(m => m.id);
                results.push({ dim, members: ids });
            }
            return results;
        };

        const cartesian = (arrays) => arrays.reduce((acc, curr) =>
            acc.flatMap(a => curr.map(b => [...a, b])), [[]]);

        const renderTableHtml = async (section, resolvedPov) => {
            const rowItems = buildAxis(section.source?.rows || []);
            const colItems = buildAxis(section.source?.columns || []);

            const rows = cartesian(rowItems.map(x => x.members));
            const cols = cartesian(colItems.map(x => x.members));

            // Appels /api/data strictement identiques au front (mêmes query params)
            const getCell = async (rowVals, colVals) => {
                const filter = { ...(resolvedPov || {}) };
                rowItems.forEach((it, i) => filter[it.dim] = rowVals[i]);
                colItems.forEach((it, i) => filter[it.dim] = colVals[i]);
                const params = new URLSearchParams();
                Object.entries(filter).forEach(([k, v]) => { if (v) params.append(k, v); });
                const r = await fetch(`${baseUrl}/api/data?${params.toString()}`, { headers: { Authorization: auth } });
                const j = await r.json();
                return j?.[0]?.data_value ?? '';
            };

            // En-têtes colonnes
            const colHeader = cols.map(col => `<th class="th">${col.join(' / ')}</th>`).join('');

            // Lignes
            let body = '';
            for (const row of rows) {
                const rowLabels = row.map(v => `<td class="rowLabel">${v}</td>`).join('');
                let cells = '';
                for (const col of cols) {
                    const v = await getCell(row, col);
                    cells += `<td class="td val">${v}</td>`;
                }
                body += `<tr>${rowLabels}${cells}</tr>`;
            }

            // En-têtes des labels de lignes (une th par dim de ligne)
            const rowHead = rowItems.map(it => `<th class="th">${it.dim}</th>`).join('');

            return `
        <div class="section">
          ${section.title ? `<div class="title"><strong>${section.title}</strong></div>` : ''}
          <table class="tbl">
            <thead><tr>${rowHead}${colHeader}</tr></thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      `;
        };

        // Résoudre POV côté serveur comme dans le front (version courte : on retire juste le suffixe $[...])
        const EXCLUDED = new Set(["scenario", "year", "ICP", "value", "view"]);
        const expandSelection = (sel, dim) => {
            const members = dimensionData[dim]?.members || [];
            const out = new Set();
            for (const raw of sel || []) {
                if (!raw.includes("$[")) { out.add(raw); continue; }
                const [id, modeRaw] = raw.split("$["); const mode = modeRaw.replace(']', '');
                if (mode === 'Only') out.add(id);
                else if (mode === 'Descendants') {
                    const stack = [id]; while (stack.length) { const cur = stack.pop(); out.add(cur); const ch = members.filter(m => m.parent === cur).map(m => m.id); stack.push(...ch); }
                } else if (mode === 'Base') {
                    const stack = [id]; while (stack.length) { const cur = stack.pop(); const ch = members.filter(m => m.parent === cur); if (ch.length === 0) out.add(cur); else stack.push(...ch.map(m => m.id)); }
                }
            }
            return [...out];
        };
        const resolvePov = (p) => {
            const res = {};
            for (const [dim, vals] of Object.entries(p || {})) {
                if (EXCLUDED.has(dim)) res[dim] = (vals || []).map(v => v.split("$[")[0]);
                else res[dim] = expandSelection(vals, dim);
            }
            return res;
        };

        const resolvedPov = resolvePov(pov);

        // 4) HTML + CSS
        const css = `
      <style>
        body { font-family: Inter, Arial, sans-serif; font-size: 12px; color:#111827; margin:0; padding:24px; }
        .title { margin: 0 0 8px; }
        .section { margin: 0 0 18px; page-break-inside: avoid; }
        .tbl { border-collapse: collapse; width: 100%; }
        .th, .td { border: 1px solid #9ca3af; padding: 6px 8px; background: #e5e7eb; font-weight:600; }
        .td { background: #fff; font-weight: 400; text-align: center; }
        .rowLabel { border: 1px solid #9ca3af; padding: 6px 8px; background: #f9fafb; font-weight:500; text-align:left; white-space:nowrap; }
      </style>
    `;

        let sectionsHtml = '';
        for (const sec of def.sections || []) {
            if (sec.type === 'title') {
                const txt = (sec.text || '')
                    .replace('{year}', (pov?.year?.[0] || ''))
                    .replace('{scenario}', (pov?.scenario?.[0] || ''));
                sectionsHtml += `<div class="section"><h1 class="title">${txt}</h1></div>`;
            }
            if (sec.type === 'table') {
                sectionsHtml += await renderTableHtml(sec, resolvedPov);
            }
        }

        const html = `<!doctype html><html><head><meta charset="utf-8" />${css}</head><body>${sectionsHtml}</body></html>`;

        // 5) Puppeteer
        const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const { pageSize, orientation, margins } = def.layout || {};
        if (format === 'png') {
            const buffer = await page.screenshot({ fullPage: true });
            await browser.close();
            res.setHeader('Content-Type', 'image/png');
            return res.send(buffer);
        } else {
            const buffer = await page.pdf({
                format: pageSize || 'A4',
                landscape: orientation === 'landscape',
                margin: {
                    top: (margins?.top ?? 24) + 'px',
                    right: (margins?.right ?? 18) + 'px',
                    bottom: (margins?.bottom ?? 24) + 'px',
                    left: (margins?.left ?? 18) + 'px'
                },
                printBackground: true
            });
            await browser.close();
            res.setHeader('Content-Type', 'application/pdf');
            return res.send(buffer);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Export failed" });
    }
};




module.exports = {
    createDocument,
    getAllDocuments,
    getDocumentById,
    getDocumentContentById, // DEV
    updateDocument,
    deleteDocument,
    renderReport // DEV
};