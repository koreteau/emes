// routes/dsl.js
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const dslController = require("../controllers/dslController");

// Route POST simple pour exécuter rules.dsl
router.post("/", authenticateToken, dslController.executeDSL);

module.exports = router;