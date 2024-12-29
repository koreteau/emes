const express = require('express');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const {
    createEntity,
    getAllEntities,
    getEntityById,
    updateEntity,
    deleteEntity,
} = require('../controllers/entityController');

const router = express.Router();

// Routes accessibles uniquement aux administrateurs
router.post('/', authenticateToken, isAdmin, createEntity); // Créer une entité
router.put('/:entityId', authenticateToken, isAdmin, updateEntity); // Modifier une entité
router.delete('/:entityId', authenticateToken, isAdmin, deleteEntity); // Supprimer une entité

// Routes accessibles à tous les utilisateurs connectés
router.get('/', authenticateToken, getAllEntities); // Récupérer toutes les entités
router.get('/:entityId', authenticateToken, getEntityById); // Récupérer une entité par ID

module.exports = router;