const express = require("express");
const { authenticateToken, isAdmin } = require("../middleware/auth");
const {
    createDocument,
    getAllDocuments,
    getDocumentById,
    getDocumentContentById,
    updateDocument,
    deleteDocument,
    renderReport
} = require("../controllers/documentsController");

const router = express.Router();

// Routes accessibles uniquement aux administrateurs
router.post("/", authenticateToken, isAdmin, createDocument); // Créer un document
router.put("/:documentId", authenticateToken, isAdmin, updateDocument); // Modifier un document
router.delete("/:documentId", authenticateToken, isAdmin, deleteDocument); // Supprimer un document

// Routes accessibles aux utilisateurs connectés avec filtrage par permissions
router.get("/", authenticateToken, getAllDocuments); // Récupérer tous les documents
router.get("/:documentId", authenticateToken, getDocumentById); // Récupérer un document par ID
router.get("/:documentId/content", authenticateToken, getDocumentContentById);

// DEV -> Export PDF/PNG du rapport (utilisateur connecté + permissions déjà vérifiées dans le controller)
router.post("/:documentId/render", authenticateToken, renderReport);


module.exports = router;