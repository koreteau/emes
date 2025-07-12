const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getFilteredLogs } = require('../controllers/logsController');

const router = express.Router();

router.get('/', authenticateToken, getFilteredLogs);

module.exports = router;