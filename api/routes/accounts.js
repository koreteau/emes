const express = require('express');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const {
    createAccount,
    getAllAccounts,
    getAccountById,
    updateAccount,
    deleteAccount,
} = require('../controllers/accountController');

const router = express.Router();

// Routes accessibles uniquement aux administrateurs
router.post('/', authenticateToken, isAdmin, createAccount); // Créer un compte
router.put('/:accountId', authenticateToken, isAdmin, updateAccount); // Modifier un compte
router.delete('/:accountId', authenticateToken, isAdmin, deleteAccount); // Supprimer un compte

// Routes accessibles à tous les utilisateurs connectés
router.get('/', authenticateToken, getAllAccounts); // Récupérer tous les comptes
router.get('/:accountId', authenticateToken, getAccountById); // Récupérer un compte par ID

module.exports = router;