const db = require('../config/db');
const { checkPermissions } = require('../middleware/permissions');

// Créer un compte
const createAccount = async (req, res) => {
    const {
        account_name, account_type, currency, entity_id, internal_id, parent_account_id,
        flow_ope, flow_cho, flow_ini, flow_inc, flow_dec, flow_dcp, flow_dco, flow_dcm, 
        flow_cti, flow_riv, flow_dev, flow_cwc, flow_cai, flow_cad, flow_mrg, flow_sin, 
        flow_sou, flow_sva, flow_rec, flow_act, flow_app, flow_nin, flow_div, flow_varpl, 
        flow_vareq, flow_ctrpl, flow_ctreq, flow_rel, flow_mkv, flow_le1, flow_chk, flow_clo
    } = req.body;

    try {
        const query = `
            INSERT INTO Accounts (
                account_name, account_type, currency, entity_id, internal_id, parent_account_id,
                flow_ope, flow_cho, flow_ini, flow_inc, flow_dec, flow_dcp, flow_dco, flow_dcm,
                flow_cti, flow_riv, flow_dev, flow_cwc, flow_cai, flow_cad, flow_mrg, flow_sin,
                flow_sou, flow_sva, flow_rec, flow_act, flow_app, flow_nin, flow_div, flow_varpl,
                flow_vareq, flow_ctrpl, flow_ctreq, flow_rel, flow_mkv, flow_le1, flow_chk, flow_clo
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38
            ) RETURNING *;
        `;
        const values = [
            account_name, account_type, currency, entity_id, internal_id, parent_account_id,
            flow_ope, flow_cho, flow_ini, flow_inc, flow_dec, flow_dcp, flow_dco, flow_dcm,
            flow_cti, flow_riv, flow_dev, flow_cwc, flow_cai, flow_cad, flow_mrg, flow_sin,
            flow_sou, flow_sva, flow_rec, flow_act, flow_app, flow_nin, flow_div, flow_varpl,
            flow_vareq, flow_ctrpl, flow_ctreq, flow_rel, flow_mkv, flow_le1, flow_chk, flow_clo
        ];
        const result = await db.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creating account' });
    }
};


// Récupérer tous les comptes
const getAllAccounts = async (req, res) => {
    const userId = req.user.id;

    try {
        if (req.user.is_admin) {
            const result = await db.query('SELECT * FROM Accounts');
            return res.status(200).json(result.rows);
        }

        const authorizedAccounts = await checkPermissions(userId, 'account', 'read');
        if (authorizedAccounts.length === 0) {
            return res.status(200).json([]);
        }

        const query = `SELECT * FROM Accounts WHERE account_id = ANY($1)`;
        const result = await db.query(query, [authorizedAccounts]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching accounts:', err.message);
        res.status(500).json({ error: 'Error fetching accounts' });
    }
};

// Récupérer un compte par ID
const getAccountById = async (req, res) => {
    const { accountId } = req.params;

    try {
        const result = await db.query('SELECT * FROM Accounts WHERE account_id = $1', [accountId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching account:', err.message);
        res.status(500).json({ error: 'Error fetching account' });
    }
};

// Récupérer les comptes associés à une entité spécifique
const getAccountsByEntityId = async (req, res) => {
    const { entityId } = req.params;

    try {
        const result = await db.query(
            'SELECT * FROM Accounts WHERE entity_id = $1',
            [entityId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No accounts found for this entity.' });
        }

        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching accounts by entity:', err.message);
        res.status(500).json({ error: 'Error fetching accounts.' });
    }
};

// Récupérer les comptes par parent_account_id
const getAccountsByParentAccountId = async (req, res) => {
    const { parentAccountId } = req.params;

    try {
        // Récupérer le compte parent
        const parentAccountQuery = `
            SELECT * 
            FROM Accounts 
            WHERE account_id = $1
        `;
        const parentResult = await db.query(parentAccountQuery, [parentAccountId]);

        if (parentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Parent account not found' });
        }

        const parentAccount = parentResult.rows[0];

        // Récupérer les comptes enfants
        const childAccountsQuery = `
            SELECT * 
            FROM Accounts 
            WHERE parent_account_id = $1
        `;
        const childResult = await db.query(childAccountsQuery, [parentAccountId]);

        res.status(200).json({
            parentAccount,
            childAccounts: childResult.rows,
        });
    } catch (err) {
        console.error('Error fetching accounts by parent_account_id:', err.message);
        res.status(500).json({ error: 'Error fetching accounts.' });
    }
};

// Modifier un compte
const updateAccount = async (req, res) => {
    const { accountId } = req.params;
    const {
        account_name, account_type, currency, entity_id, internal_id,
        flow_ope, flow_cho, flow_ini, flow_inc, flow_dec, 
        flow_dcp, flow_dco, flow_dcm, flow_cti, flow_riv, flow_dev, 
        flow_cwc, flow_cai, flow_cad, flow_mrg, flow_sin, flow_sou, 
        flow_sva, flow_rec, flow_act, flow_app, flow_nin, flow_div, 
        flow_varpl, flow_vareq, flow_ctrpl, flow_ctreq, flow_rel, 
        flow_mkv, flow_le1, flow_chk, flow_clo
    } = req.body;

    try {
        const query = `
            UPDATE Accounts
            SET 
                account_name = COALESCE($1, account_name),
                account_type = COALESCE($2, account_type),
                currency = COALESCE($3, currency),
                entity_id = COALESCE($4, entity_id),
                internal_id = COALESCE($5, internal_id),
                flow_ope = COALESCE($6, flow_ope),
                flow_cho = COALESCE($7, flow_cho),
                flow_ini = COALESCE($8, flow_ini),
                flow_inc = COALESCE($9, flow_inc),
                flow_dec = COALESCE($10, flow_dec),
                flow_dcp = COALESCE($11, flow_dcp),
                flow_dco = COALESCE($12, flow_dco),
                flow_dcm = COALESCE($13, flow_dcm),
                flow_cti = COALESCE($14, flow_cti),
                flow_riv = COALESCE($15, flow_riv),
                flow_dev = COALESCE($16, flow_dev),
                flow_cwc = COALESCE($17, flow_cwc),
                flow_cai = COALESCE($18, flow_cai),
                flow_cad = COALESCE($19, flow_cad),
                flow_mrg = COALESCE($20, flow_mrg),
                flow_sin = COALESCE($21, flow_sin),
                flow_sou = COALESCE($22, flow_sou),
                flow_sva = COALESCE($23, flow_sva),
                flow_rec = COALESCE($24, flow_rec),
                flow_act = COALESCE($25, flow_act),
                flow_app = COALESCE($26, flow_app),
                flow_nin = COALESCE($27, flow_nin),
                flow_div = COALESCE($28, flow_div),
                flow_varpl = COALESCE($29, flow_varpl),
                flow_vareq = COALESCE($30, flow_vareq),
                flow_ctrpl = COALESCE($31, flow_ctrpl),
                flow_ctreq = COALESCE($32, flow_ctreq),
                flow_rel = COALESCE($33, flow_rel),
                flow_mkv = COALESCE($34, flow_mkv),
                flow_le1 = COALESCE($35, flow_le1),
                flow_chk = COALESCE($36, flow_chk),
                flow_clo = COALESCE($37, flow_clo)
            WHERE account_id = $38
            RETURNING *;
        `;
        const values = [
            account_name, account_type, currency, entity_id, internal_id,
            flow_ope, flow_cho, flow_ini, flow_inc, flow_dec,
            flow_dcp, flow_dco, flow_dcm, flow_cti, flow_riv, flow_dev,
            flow_cwc, flow_cai, flow_cad, flow_mrg, flow_sin, flow_sou,
            flow_sva, flow_rec, flow_act, flow_app, flow_nin, flow_div,
            flow_varpl, flow_vareq, flow_ctrpl, flow_ctreq, flow_rel,
            flow_mkv, flow_le1, flow_chk, flow_clo, accountId
        ];
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error updating account:', err.message);
        res.status(500).json({ error: 'Error updating account' });
    }
};

// Supprimer un compte
const deleteAccount = async (req, res) => {
    const { accountId } = req.params;

    try {
        const result = await db.query('DELETE FROM Accounts WHERE account_id = $1 RETURNING *', [accountId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.status(200).json({ message: 'Account deleted', accountId: result.rows[0].account_id });
    } catch (err) {
        console.error('Error deleting account:', err.message);
        res.status(500).json({ error: 'Error deleting account' });
    }
};

module.exports = {
    createAccount,
    getAllAccounts,
    getAccountById,
    getAccountsByEntityId,
    getAccountsByParentAccountId,
    updateAccount,
    deleteAccount,
};