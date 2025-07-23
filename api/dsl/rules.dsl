// rules.dsl
// Fichier de test simple avec requêtes SQL basiques

// === TESTS SQL SIMPLES ===

// Test 1 : Récupérer des données d'une entité spécifique
SET_VAR("us_data", SQL_QUERY("SELECT * FROM capaci_data WHERE entity='CCUSD' LIMIT 10"));

// Test 2 : Compter les enregistrements
SET_VAR("total_records", SQL_QUERY("SELECT COUNT(*) as count FROM capaci_data"));

// Test 3 : Données d'une autre entité
SET_VAR("fr_data", SQL_QUERY("SELECT * FROM capaci_data WHERE entity='CCEUR' LIMIT 5"));

// Test 4 : Récupérer les entités distinctes
SET_VAR("distinct_entities", SQL_QUERY("SELECT DISTINCT entity FROM capaci_data ORDER BY entity"));

// === TRAITEMENT DES DONNÉES ===

// Compter les résultats
SET_VAR("us_count", ARRAY_LENGTH(us_data));
SET_VAR("fr_count", ARRAY_LENGTH(fr_data));
SET_VAR("entities_count", ARRAY_LENGTH(distinct_entities));

// Premier enregistrement US
SET_VAR("first_us_record", GET_AT(us_data, 0));
SET_VAR("first_us_account", 
    IF(ISNOTNULL(first_us_record), GET_PROP(first_us_record, "account"), "No data"));

// Nombre total d'enregistrements depuis la requête COUNT
SET_VAR("db_total_count", 
    IF(ARRAY_LENGTH(total_records) > 0, 
       GET_PROP(GET_AT(total_records, 0), "count"), 
       0));

// === RÉSULTATS POUR L'API ===

SET_VAR("test_summary", CONCAT(
    "Test SQL completed on ", executionDate, 
    " | US records: ", us_count,
    " | FR records: ", fr_count,
    " | Total entities: ", entities_count,
    " | DB total: ", db_total_count
));

SET_VAR("test_status", "COMPLETED");
SET_VAR("data_quality", IF(us_count > 0 AND fr_count > 0, "GOOD", "PARTIAL"));