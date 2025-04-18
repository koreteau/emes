const express = require('express');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const {
    createData,
    getAllData,
    updateData,
    deleteData,
} = require('../controllers/dataController');

const router = express.Router();

router.post('/', authenticateToken, isAdmin, createData);
router.put('/:dataId', authenticateToken, isAdmin, updateData);
router.delete('/:dataId', authenticateToken, isAdmin, deleteData);
router.get('/', authenticateToken, getAllData);

module.exports = router;
