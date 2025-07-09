const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { extractStagedData } = require('../controllers/extractStagedDataController');

const router = express.Router();

router.get('/extract', authenticateToken, extractStagedData);

module.exports = router;