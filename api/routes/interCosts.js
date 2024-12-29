const express = require('express');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const {
    createInterCost,
    getAllInterCosts,
    getInterCostById,
    updateInterCost,
    deleteInterCost,
} = require('../controllers/interCostController');

const router = express.Router();

// Routes accessibles uniquement aux administrateurs
router.post('/', authenticateToken, isAdmin, createInterCost); // Créer un InterCost
router.put('/:icId', authenticateToken, isAdmin, updateInterCost); // Modifier un InterCost
router.delete('/:icId', authenticateToken, isAdmin, deleteInterCost); // Supprimer un InterCost

// Routes accessibles à tous les utilisateurs connectés
router.get('/', authenticateToken, getAllInterCosts); // Récupérer tous les InterCosts
router.get('/:icId', authenticateToken, getInterCostById); // Récupérer un InterCost par ID

module.exports = router;
