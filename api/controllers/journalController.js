const db = require("../config/db");

const getAllJournals = async (req, res) => {
    try {
        const result = await db.query(`SELECT * FROM journals ORDER BY created_at DESC`);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Erreur getAllJournals:", err.message);
        res.status(500).json({ error: "Erreur chargement journaux" });
    }
};

const getJournalById = async (req, res) => {
    const { id } = req.params;

    try {
        const headerResult = await db.query(
            `SELECT * FROM journals WHERE id = $1`,
            [id]
        );

        if (headerResult.rows.length === 0) {
            return res.status(404).json({ error: "Journal introuvable" });
        }

        const linesResult = await db.query(
            `SELECT * FROM journal_lines WHERE journal_id = $1 ORDER BY created_at ASC`,
            [id]
        );

        res.status(200).json({
            journal: headerResult.rows[0],
            lines: linesResult.rows
        });
    } catch (err) {
        console.error("Erreur getJournalById:", err.message);
        res.status(500).json({ error: "Erreur chargement journal" });
    }
};

// Créer un nouveau journal
const createJournal = async (req, res) => {
    const { label, scenario, year, period, entity, view, value } = req.body;

    const author = req.user.email || "admin";

    try {
        const result = await db.query(
            `INSERT INTO journals
            (label, scenario, year, period, entity, view, value, author)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING *`,
            [label, scenario, year, period, entity, view, value, author]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Erreur createJournal:", err.message);
        res.status(500).json({ error: "Erreur création journal" });
    }
};


// Modifier un journal (label / status)
const updateJournal = async (req, res) => {
    const { id } = req.params;
    const { label, status } = req.body;

    try {
        const result = await db.query(
            `UPDATE journals SET
            label = COALESCE($1, label),
            status = COALESCE($2, status)
            WHERE id = $3
            RETURNING *`,
            [label, status, id]
        );
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error("Erreur updateJournal:", err.message);
        res.status(500).json({ error: "Erreur modification journal" });
    }
};

// Supprimer un journal
const deleteJournal = async (req, res) => {
    const { id } = req.params;

    try {
        await db.query("DELETE FROM journals WHERE id = $1", [id]);
        res.status(204).send();
    } catch (err) {
        console.error("Erreur deleteJournal:", err.message);
        res.status(500).json({ error: "Erreur suppression journal" });
    }
};

// Poster un journal
const postJournal = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Vérifier que le journal existe
        const journalResult = await db.query(
            `SELECT scenario, year, period, entity, view, value FROM journals WHERE id = $1`,
            [id]
        );
        if (journalResult.rows.length === 0) {
            return res.status(404).json({ error: "Journal introuvable" });
        }
        const { scenario, year, period, entity, view, value } = journalResult.rows[0];

        // 2. Vérifier variance = 0
        const varianceResult = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as variance FROM journal_lines WHERE journal_id = $1`,
            [id]
        );
        const variance = parseFloat(varianceResult.rows[0].variance);

        if (Math.abs(variance) > 0.00001) {
            return res.status(400).json({ error: "Journal non balancé, variance ≠ 0" });
        }

        // 3. Insérer les données dans la table data
        await db.query(
            `INSERT INTO data (
                scenario, year, period, entity,
                account, custom1, custom2, custom3, custom4,
                icp, view, value, data_value, author, journal_id
            )
            SELECT
                $2, $3, $4, $5,
                account, custom1, custom2, custom3, custom4,
                icp, $6, $7, amount::text, $8, $1
            FROM journal_lines
            WHERE journal_id = $1`,
            [id, scenario, year, period, entity, view, value, req.user.email || "admin"]
        );

        // 4. Mettre à jour le statut du journal
        await db.query(
            `UPDATE journals
             SET status = 'posted', posted_at = NOW()
             WHERE id = $1`,
            [id]
        );

        res.status(200).json({ message: "✅ Journal posté avec succès" });
    } catch (err) {
        console.error("Erreur postJournal:", err.message);
        res.status(500).json({ error: "Erreur serveur lors du post du journal" });
    }
};

const getJournalLines = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query(
            `SELECT * FROM journal_lines WHERE journal_id = $1 ORDER BY created_at ASC`,
            [id]
        );

        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Erreur getJournalLines:", err.message);
        res.status(500).json({ error: "Erreur chargement lignes journal" });
    }
};

// Ajouter une ligne à un journal
const addJournalLine = async (req, res) => {
    const { id } = req.params;
    const { account, custom1, custom2, custom3, custom4, icp, amount, comment } = req.body;

    try {
        const result = await db.query(
            `INSERT INTO journal_lines
            (journal_id, account, custom1, custom2, custom3, custom4, icp, amount, comment)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING *`,
            [id, account, custom1, custom2, custom3, custom4, icp, amount, comment]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Erreur addJournalLine:", err.message);
        res.status(500).json({ error: "Erreur ajout ligne journal" });
    }
};


const updateJournalLine = async (req, res) => {
    const { lineId } = req.params;
    const fields = req.body;

    // Construction dynamique des SET dans la requête SQL
    const setQuery = Object.keys(fields)
        .map((key, idx) => `${key} = $${idx + 1}`)
        .join(", ");

    const values = Object.values(fields);

    try {
        const result = await db.query(
            `UPDATE journal_lines
             SET ${setQuery}
             WHERE id = $${values.length + 1}
             RETURNING *`,
            [...values, lineId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Ligne non trouvée" });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error("Erreur updateJournalLine:", err.message);
        res.status(500).json({ error: "Erreur modification ligne journal" });
    }
};

const deleteJournalLine = async (req, res) => {
    const { lineId } = req.params;

    try {
        const result = await db.query(
            `DELETE FROM journal_lines WHERE id = $1 RETURNING *`,
            [lineId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Ligne non trouvée" });
        }

        res.status(200).json({ message: "✅ Ligne supprimée avec succès" });
    } catch (err) {
        console.error("Erreur deleteJournalLine:", err.message);
        res.status(500).json({ error: "Erreur suppression ligne journal" });
    }
};


module.exports = {
    getAllJournals,
    getJournalById,
    createJournal,
    updateJournal,
    deleteJournal,
    postJournal,
    getJournalLines,
    addJournalLine,
    updateJournalLine,
    deleteJournalLine
};