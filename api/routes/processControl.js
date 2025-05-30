const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { getStatusTree } = require("../controllers/processControlController");

router.get("/status-tree", authenticateToken, getStatusTree);

module.exports = router;