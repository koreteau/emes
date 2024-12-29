const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Créer un utilisateur
const createUser = async (req, res) => {
    const { username, password, is_admin, security_classes } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = `
            INSERT INTO Users (username, password, is_admin, security_classes)
            VALUES ($1, $2, $3, $4) RETURNING *;
        `;
        const values = [username, hashedPassword, is_admin || false, security_classes || []];

        const result = await db.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creating user' });
    }
};


// Récupérer tous les utilisateurs
const getAllUsers = async (req, res) => {
    try {
        const result = await db.query('SELECT id, username, is_admin FROM Users');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error fetching users' });
    }
};

// Récupérer un utilisateur par ID
const getUserById = async (req, res) => {
    const { userId } = req.params;

    try {
        const result = await db.query('SELECT id, username, is_admin FROM Users WHERE id = $1', [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error fetching user' });
    }
};

const updateUser = async (req, res) => {
    const { userId } = req.params;
    const { username, password, is_admin, security_classes } = req.body;

    try {
        // Hacher le mot de passe uniquement s'il est fourni
        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

        const query = `
            UPDATE Users
            SET username = COALESCE($1, username),
                password = COALESCE($2, password),
                is_admin = COALESCE($3, is_admin),
                security_classes = COALESCE($4, security_classes)
            WHERE id = $5
            RETURNING id, username, is_admin, security_classes;
        `;
        const values = [username, hashedPassword, is_admin, security_classes, userId];

        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating user' });
    }
};


// Supprimer un utilisateur
const deleteUser = async (req, res) => {
    const { userId } = req.params;

    try {
        const result = await db.query('DELETE FROM Users WHERE id = $1 RETURNING id', [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ message: 'User deleted', userId: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error deleting user' });
    }
};

module.exports = {
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
};

