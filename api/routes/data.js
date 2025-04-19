const express = require('express');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const {
    createData,
    getFilteredData,
    updateData,
    deleteData,
} = require('../controllers/dataController');

const router = express.Router();

router.post('/', authenticateToken, isAdmin, createData);
router.get('/', authenticateToken, getFilteredData);
router.put('/:dataId', authenticateToken, isAdmin, updateData);
router.delete('/:dataId', authenticateToken, isAdmin, deleteData);


module.exports = router;
