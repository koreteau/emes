const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
} = require('../controllers/userController');

const router = express.Router();

// Routes réservées aux administrateurs
router.post('/', authenticateToken, createUser); // Créer un utilisateur
router.get('/', authenticateToken, getAllUsers); // Récupérer tous les utilisateurs
router.get('/:userId', authenticateToken, getUserById); // Récupérer un utilisateur par ID
router.put('/:userId', authenticateToken, updateUser); // Mettre à jour un utilisateur
router.delete('/:userId', authenticateToken, deleteUser); // Supprimer un utilisateur

module.exports = router;
