const express = require('express');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const {
    createProfitCenter,
    getAllProfitCenters,
    getProfitCenterById,
    updateProfitCenter,
    deleteProfitCenter,
} = require('../controllers/profitCenterController');

const router = express.Router();

// Routes accessibles uniquement aux administrateurs
router.post('/', authenticateToken, isAdmin, createProfitCenter); // Créer un Profit Center
router.put('/:profitCenterId', authenticateToken, isAdmin, updateProfitCenter); // Modifier un Profit Center
router.delete('/:profitCenterId', authenticateToken, isAdmin, deleteProfitCenter); // Supprimer un Profit Center

// Routes accessibles à tous les utilisateurs connectés
router.get('/', authenticateToken, getAllProfitCenters); // Récupérer tous les Profit Centers
router.get('/:profitCenterId', authenticateToken, getProfitCenterById); // Récupérer un Profit Center par ID

module.exports = router;
