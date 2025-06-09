const express = require('express');
const router = express.Router();
const { calculate } = require('../controllers/functionsController');

router.post('/calculate', calculate);

module.exports = router;