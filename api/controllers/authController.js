const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = (await db.query('SELECT * FROM Users WHERE username = $1', [username])).rows[0];
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, is_admin: user.is_admin }, process.env.JWT_SECRET, { expiresIn: '2h' });
        res.status(200).json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error during login' });
    }
};

// Nouvelle route pour rafraîchir le token
const refreshToken = async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: 'Token is missing' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        // Générer un nouveau token
        const newToken = jwt.sign({ id: payload.id, is_admin: payload.is_admin }, process.env.JWT_SECRET, { expiresIn: '2h' });
        res.status(200).json({ token: newToken });
    } catch (err) {
        console.error(err);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

const getUserInfo = async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1]; // Récupère le token de l'en-tête Authorization
    if (!token) {
        return res.status(401).json({ error: 'Token is missing' });
    }

    try {
        // Vérifie et décode le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Récupère l'utilisateur depuis la base de données avec son ID
        const user = (await db.query('SELECT id, username, is_admin FROM Users WHERE id = $1', [decoded.id])).rows[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Récupère les security classes liées à cet utilisateur
        const securityClasses = (
            await db.query(
                'SELECT security_class_id FROM UserSecurityClasses WHERE user_id = $1',
                [user.id]
            )
        ).rows.map((row) => row.security_class_id);

        // Ajoute les security classes au payload
        user.security_classes = securityClasses;

        res.status(200).json(user);
    } catch (err) {
        console.error(err);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = { login, refreshToken, getUserInfo };

