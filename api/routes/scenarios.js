const express = require('express');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const {
    createScenario,
    getAllScenarios,
    getScenarioById,
    updateScenario,
    deleteScenario,
} = require('../controllers/scenarioController');

const router = express.Router();

// Routes accessibles uniquement aux administrateurs
router.post('/', authenticateToken, isAdmin, createScenario); // Créer un scénario
router.put('/:scenarioId', authenticateToken, isAdmin, updateScenario); // Modifier un scénario
router.delete('/:scenarioId', authenticateToken, isAdmin, deleteScenario); // Supprimer un scénario

// Routes accessibles à tous les utilisateurs connectés
router.get('/', authenticateToken, getAllScenarios); // Récupérer tous les scénarios
router.get('/:scenarioId', authenticateToken, getScenarioById); // Récupérer un scénario par ID

module.exports = router;