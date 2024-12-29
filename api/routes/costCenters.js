const express = require('express');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const {
    createCostCenter,
    getAllCostCenters,
    getCostCenterById,
    updateCostCenter,
    deleteCostCenter,
} = require('../controllers/costCenterController');

const router = express.Router();

// Routes accessibles uniquement aux administrateurs
router.post('/', authenticateToken, isAdmin, createCostCenter); // Créer un Cost Center
router.put('/:costCenterId', authenticateToken, isAdmin, updateCostCenter); // Modifier un Cost Center
router.delete('/:costCenterId', authenticateToken, isAdmin, deleteCostCenter); // Supprimer un Cost Center

// Routes accessibles à tous les utilisateurs connectés
router.get('/', authenticateToken, getAllCostCenters); // Récupérer tous les Cost Centers
router.get('/:costCenterId', authenticateToken, getCostCenterById); // Récupérer un Cost Center par ID

module.exports = router;

