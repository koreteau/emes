const express = require('express');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const {
    createStagedData,
    getFilteredStagedData
} = require('../controllers/stagedDataController');

const router = express.Router();

router.post('/', authenticateToken, isAdmin, createStagedData);
router.get('/', authenticateToken, getFilteredStagedData);

module.exports = router;