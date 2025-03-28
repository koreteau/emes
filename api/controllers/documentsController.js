const db = require('../config/db');
const path = require("path");
const fs = require("fs");
const { checkPermissions } = require('../middleware/permissions');

const WEBFORM_ROOT = "../database/documents"

// Créer un document (folder, webform, report)
const createDocument = async (req, res) => {
    const { name, type, path, parent_id, security_classes } = req.body;

    if (!name || !type) {
        return res.status(400).json({ error: "Nom et type sont obligatoires" });
    }

    try {
        const query = `
            INSERT INTO documents (name, type, path, parent_id, security_classes)
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
            query = `SELECT * FROM documents ORDER BY name`;
        } else {
            const authorizedClasses = await checkPermissions(userId, 'documents', 'read');
            query = `
                SELECT * FROM documents
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
        let query = `SELECT * FROM documents WHERE id = $1`;
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

const getDocumentContentById = async (req, res) => {
    const { documentId } = req.params;
    const userId = req.user.id;

    try {
        let query = `SELECT * FROM documents WHERE id = $1`;
        let values = [documentId];

        if (!req.user.is_admin) {
            const authorizedClasses = await checkPermissions(userId, 'documents', 'read');
            query += ` AND security_classes = ANY($2)`;
            values.push(authorizedClasses);
        }

        const result = await db.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Document introuvable ou non autorisé" });
        }

        const doc = result.rows[0];
        const fullPath = path.join(WEBFORM_ROOT, doc.path); // fonctionne même si le doc est un report

        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: "Fichier JSON introuvable sur le disque" });
        }

        const fileContent = fs.readFileSync(fullPath, "utf-8");
        const parsed = JSON.parse(fileContent);

        res.status(200).json({
            name: doc.name,
            type: doc.type,
            parameters: parsed.parameters,
            layout: parsed.layout,
            data: parsed.data,
        });

    } catch (err) {
        console.error("Erreur getDocumentContentById:", err.message);
        res.status(500).json({ error: "Erreur serveur lors de la lecture du fichier JSON" });
    }
};

// Modifier un document
const updateDocument = async (req, res) => {
    const { documentId } = req.params;
    const { name, path, security_classes, parent_id } = req.body;

    try {
        const query = `
            UPDATE documents
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
        const result = await db.query("DELETE FROM documents WHERE id = $1 RETURNING *", [documentId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Document non trouvé" });
        }

        res.status(200).json({ message: "Document supprimé", documentId: result.rows[0].id });
    } catch (err) {
        console.error("Erreur lors de la suppression du document:", err.message);
        res.status(500).json({ error: "Erreur serveur" });
    }
};

module.exports = {
    createDocument,
    getAllDocuments,
    getDocumentById,
    getDocumentContentById,
    updateDocument,
    deleteDocument,
};