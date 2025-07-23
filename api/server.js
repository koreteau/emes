const express = require('express');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');
const db = require('./config/db');

dotenv.config();

const app = express();

// Middlewares
app.use(express.json());
app.use(helmet());
app.use(cors());

// Vérification de la connexion à la base de données
const verifyDatabaseConnection = async () => {
    try {
        await db.query('SELECT NOW()'); // Requête simple pour vérifier la connexion
        console.log('✅ Database connected successfully');
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1); // Arrêter le processus si la base n'est pas accessible
    }
};



// ===== ROUTES =====
// EMES.
const authRoutes = require('./routes/auth');
const securityRoutes = require('./routes/security');
const userRoutes = require('./routes/users');
const logsRoutes = require('./routes/logs');

// Capaci
const dataRoutes = require('./routes/data');
const documentsRoutes = require('./routes/documents');
const dimensionRoutes = require('./routes/dimension');
const journalRoutes = require('./routes/journal');
const processControlRoutes = require("./routes/processControl");
const functionsRoutes = require('./routes/functions');
const stagedDataRoutes = require('./routes/stagedData');
const extractStagedData = require('./routes/extractStagedData')

// Tests
const dslRoutes = require('./routes/dsl');



// ===== USE ROUTES =====
// EMES.
app.use('/api/auth', authRoutes);
app.use('/api/security-classes', securityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/logs', logsRoutes);

// Capaci
app.use('/api/data', dataRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/dimensions', dimensionRoutes);
app.use('/api/journals', journalRoutes);
app.use("/api/process-control", processControlRoutes);
app.use('/api/functions', functionsRoutes);
app.use('/api/staged-data', stagedDataRoutes);
app.use('/api/staged-data/', extractStagedData)

// Tests
app.use('/api/dsl', dslRoutes);



// Lancer le serveur uniquement si la base est connectée
const startServer = async () => {
    await verifyDatabaseConnection(); // Vérification DB
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
};

startServer();
