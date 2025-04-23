const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const {
    getDimensionContentById,
    getLatestDimensionContent
} = require("../controllers/dimensionController")

// Route : /api/dimensions/:id/content
router.get("/:id/content", authenticateToken, getDimensionContentById);
router.get("/latest", getLatestDimensionContent);

module.exports = router;
