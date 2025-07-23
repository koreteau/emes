// controllers/dslController.js
// Contrôleur ultra-simple : juste exécuter rules.dsl

const db = require('../config/db');
const { executeDSLWithDB } = require('../dsl/dsl-executor');

const dslFile = "./dsl/rules.dsl"

/**
 * Exécute le fichier rules.dsl - route POST simple
 */
const executeDSL = async (req, res) => {
    try {
        console.log('🔄 Exécution de rules.dsl');

        // Variables de base pour le DSL (très simple)
        const dslVariables = {
            executionDate: new Date().toISOString().split('T')[0],
            executionTime: new Date().toISOString(),
            userId: req.user?.id || 'api-user'
        };

        // Exécuter rules.dsl avec connexion DB
        const result = await executeDSLWithDB(
            dslFile,
            dslVariables,
            db,
            {
                debug: false,
                showResults: false,
                showVariables: false,
                timeout: 30000
            }
        );

        if (result.success) {
            // Réponse simple
            const response = {
                success: true,
                executionTime: result.executionTime,
                data: {}
            };

            // Récupérer les variables calculées par le DSL
            if (result.variables) {
                for (const [key, value] of result.variables) {
                    // Exclure les variables système
                    if (!key.startsWith('$') && !key.startsWith('execution')) {
                        response.data[key] = value;
                    }
                }
            }

            res.status(200).json(response);

        } else {
            console.error('❌ Erreur DSL:', result.error);
            
            res.status(500).json({
                success: false,
                error: result.error
            });
        }

    } catch (err) {
        console.error("❌ Erreur executeDSL:", err.message);
        
        res.status(500).json({
            success: false,
            error: "Erreur lors de l'exécution du DSL"
        });
    }
};

module.exports = {
    executeDSL
};