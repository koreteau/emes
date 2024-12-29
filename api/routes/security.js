const express = require('express');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const {
    createSecurityClass,
    getAllSecurityClasses,
    getSecurityClassById,
    updateSecurityClass,
    deleteSecurityClass,
} = require('../controllers/securityController');

const router = express.Router();

// Routes pour gérer les SecurityClasses (admin uniquement)
router.post('/', authenticateToken, isAdmin, createSecurityClass); // Créer une classe
router.get('/', authenticateToken, isAdmin, getAllSecurityClasses); // Récupérer toutes les classes
router.get('/:securityClassId', authenticateToken, isAdmin, getSecurityClassById); // Récupérer une classe par ID
router.put('/:securityClassId', authenticateToken, isAdmin, updateSecurityClass); // Modifier une classe par ID
router.delete('/:securityClassId', authenticateToken, isAdmin, deleteSecurityClass); // Supprimer une classe par ID

module.exports = router;
