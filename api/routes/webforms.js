const express = require('express');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const {
    createWebform,
    getAllWebforms,
    getWebformById,
    updateWebform,
    deleteWebform
} = require('../controllers/webformController');

const router = express.Router();

// Routes accessibles uniquement aux administrateurs
router.post('/', authenticateToken, isAdmin, createWebform);
router.put('/:webformId', authenticateToken, isAdmin, updateWebform);
router.delete('/:webformId', authenticateToken, isAdmin, deleteWebform);

// Routes accessibles aux utilisateurs connectés avec filtrage par security_group
router.get('/', authenticateToken, getAllWebforms);
router.get('/:webformId', authenticateToken, getWebformById);


module.exports = router;
