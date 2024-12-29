const express = require('express');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const {
    createTransaction,
    getAllTransactions,
    getTransactionById,
    updateTransaction,
    deleteTransaction,
} = require('../controllers/transactionController');

const router = express.Router();

// Routes accessibles uniquement aux administrateurs
router.post('/', authenticateToken, isAdmin, createTransaction); // Créer une transaction
router.put('/:transactionId', authenticateToken, isAdmin, updateTransaction); // Modifier une transaction
router.delete('/:transactionId', authenticateToken, isAdmin, deleteTransaction); // Supprimer une transaction

// Routes accessibles aux utilisateurs connectés avec filtrage par sécurité
router.get('/', authenticateToken, getAllTransactions); // Récupérer toutes les transactions
router.get('/:transactionId', authenticateToken, getTransactionById); // Récupérer une transaction par ID

module.exports = router;
