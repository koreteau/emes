const db = require('../config/db');
const path = require("path");
const fs = require("fs");

const DIMENSION_ROOT = "../database/config";


const getDimensionContentById = async (req, res) => {
	const { id } = req.params;

	try {
		const result = await db.query(
			"SELECT path FROM capaci_dimension_data WHERE id = $1",
			[id]
		);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: "Document non trouvé" });
		}

		const relativePath = result.rows[0].path;
		const fullPath = path.join(DIMENSION_ROOT, `${relativePath}.json`);

		if (!fs.existsSync(fullPath)) {
			return res.status(404).json({ error: "Fichier JSON introuvable" });
		}

		const fileContent = fs.readFileSync(fullPath, "utf-8");
		const parsed = JSON.parse(fileContent);

		res.status(200).json(parsed);
	} catch (err) {
		console.error("❌ Erreur getDimensionContentById:", err.message);
		res.status(500).json({ error: "Erreur lors du chargement du fichier dimension" });
	}
};


const getLatestDimensionContent = async (req, res) => {
	try {
		const result = await db.query(`
      SELECT path FROM capaci_dimension_data
      ORDER BY created_at DESC
      LIMIT 1
    `);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: "Aucun document dimension disponible" });
		}

		const relativePath = result.rows[0].path;
		const fullPath = path.join(DIMENSION_ROOT, `${relativePath}.json`);

		if (!fs.existsSync(fullPath)) {
			return res.status(404).json({ error: "Fichier JSON introuvable" });
		}

		const fileContent = fs.readFileSync(fullPath, "utf-8");
		const parsed = JSON.parse(fileContent);

		res.status(200).json(parsed);
	} catch (err) {
		console.error("❌ Erreur getLatestDimensionContent:", err.message);
		res.status(500).json({ error: "Erreur serveur" });
	}
};

const getLatestDimensionData = async (type = null) => {
	try {
		const result = await db.query(`
      SELECT path FROM capaci_dimension_data
      ORDER BY created_at DESC
      LIMIT 1
    `);

		const filePath = result.rows[0]?.path;
		if (!filePath) {
			throw new Error('Aucun fichier de dimension disponible dans dimensiondata.');
		}

		// 📂 2. Lecture du fichier depuis DIMENSION_ROOT
		const fullPath = path.join(DIMENSION_ROOT, `${filePath}.json`);
		const raw = fs.readFileSync(fullPath, 'utf-8');
		const content = JSON.parse(raw);

		return type ? content[type] : content;
	} catch (err) {
		console.error('Erreur getLatestDimensionData:', err);
		throw err;
	}
};


module.exports = {
	getDimensionContentById,
	getLatestDimensionContent,
	getLatestDimensionData
};
