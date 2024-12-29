const express = require('express');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const {
    createPeriod,
    getAllPeriods,
    getPeriodById,
    updatePeriod,
    deletePeriod,
} = require('../controllers/periodController');

const router = express.Router();

// Routes accessibles uniquement aux administrateurs
router.post('/', authenticateToken, isAdmin, createPeriod); // Créer une période
router.put('/:periodId', authenticateToken, isAdmin, updatePeriod); // Modifier une période
router.delete('/:periodId', authenticateToken, isAdmin, deletePeriod); // Supprimer une période

// Routes accessibles à tous les utilisateurs connectés
router.get('/', authenticateToken, getAllPeriods); // Récupérer toutes les périodes
router.get('/:periodId', authenticateToken, getPeriodById); // Récupérer une période par ID

module.exports = router;