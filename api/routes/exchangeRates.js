const express = require('express');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const {
    createExchangeRate,
    getAllExchangeRates,
    getExchangeRateById,
    updateExchangeRate,
    deleteExchangeRate,
} = require('../controllers/exchangeRateController');

const router = express.Router();

// Routes accessibles uniquement aux administrateurs
router.post('/', authenticateToken, isAdmin, createExchangeRate); // Créer un taux de change
router.put('/:exchangeRateId', authenticateToken, isAdmin, updateExchangeRate); // Modifier un taux de change
router.delete('/:exchangeRateId', authenticateToken, isAdmin, deleteExchangeRate); // Supprimer un taux de change

// Routes accessibles à tous les utilisateurs connectés (filtrées par SecurityClasses)
router.get('/', authenticateToken, getAllExchangeRates); // Récupérer tous les taux de change
router.get('/:exchangeRateId', authenticateToken, getExchangeRateById); // Récupérer un taux de change par ID

module.exports = router;
