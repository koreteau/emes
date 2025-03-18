const express = require('express');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');
const db = require('./config/db'); // Connexion à la DB

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

// Routes
const authRoutes = require('./routes/auth');
const securityRoutes = require('./routes/security');
const userRoutes = require('./routes/users');
const transactionsRoutes = require('./routes/transactions');
const dataRoutes = require('./routes/data');
const webformRoutes = require('./routes/webforms');

app.use('/api/auth', authRoutes);
app.use('/api/security-classes', securityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/webforms', webformRoutes);


// Lancer le serveur uniquement si la base est connectée
const startServer = async () => {
    await verifyDatabaseConnection(); // Vérification DB
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
};

startServer();
