const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const journalController = require("../controllers/journalController");

// Journals
router.get("/", authenticateToken, journalController.getAllJournals);
router.get("/:id", authenticateToken, journalController.getJournalById);
router.post("/", authenticateToken, journalController.createJournal);
router.patch("/:id", authenticateToken, journalController.updateJournal);
router.delete("/:id", authenticateToken, journalController.deleteJournal);
router.post("/:id/post", authenticateToken, journalController.postJournal);

// Journal Lines
router.get("/:id/lines", authenticateToken, journalController.getJournalLines);
router.post("/:id/lines", authenticateToken, journalController.addJournalLine);
router.patch("/lines/:lineId", authenticateToken, journalController.updateJournalLine);
router.delete("/lines/:lineId", authenticateToken, journalController.deleteJournalLine);

module.exports = router;