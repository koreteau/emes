const express = require('express');
const router = express.Router();
const { calculate, raiseData, rollupToParent} = require('../controllers/functionsController');

router.post('/calculate', calculate);
router.post('/raise-data', raiseData);
router.get('/rollup', rollupToParent);

module.exports = router;