const express = require('express');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const {
    createData,
    getAllData,
    getDataById,
    updateData,
    deleteData,
} = require('../controllers/dataController');

const router = express.Router();

// Routes accessibles uniquement aux administrateurs
router.post('/', authenticateToken, isAdmin, createData); // Créer une entrée
router.put('/:dataId', authenticateToken, isAdmin, updateData); // Modifier une entrée
router.delete('/:dataId', authenticateToken, isAdmin, deleteData); // Supprimer une entrée

// Routes accessibles aux utilisateurs connectés avec filtrage par sécurité
router.get('/', authenticateToken, getAllData); // Récupérer toutes les entrées
router.get('/:dataId', authenticateToken, getDataById); // Récupérer une entrée par ID

module.exports = router;