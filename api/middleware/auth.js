const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Middleware : Authentification via JWT
const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1]; // Récupère le token depuis le header
    if (!token) {
        return res.status(401).json({ error: 'Access denied. Token missing.' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET); // Vérifie le token
        req.user = verified; // Ajoute les informations du token à req.user
        next();
    } catch (err) {
        console.error('Invalid token:', err.message);
        res.status(403).json({ error: 'Invalid token' });
    }
};

// Middleware : Vérification des droits administrateurs
const isAdmin = async (req, res, next) => {
    try {
        const userId = req.user.id; // Récupéré depuis authenticateToken
        const result = await db.query('SELECT is_admin FROM Users WHERE id = $1', [userId]);

        if (!result.rows[0]?.is_admin) {
            return res.status(403).json({ error: 'Access denied. Admins only.' });
        }

        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = { authenticateToken, isAdmin };
