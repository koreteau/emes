// rules_copy_full.dsl - Copie COMPLÈTE de la table

LOG "=== COPIE COMPLÈTE DE CAPACI_DATA ===";

// === ÉTAT INITIAL ===
SET source_count = SQL_QUERY("SELECT COUNT(*) as count FROM capaci_data");
SET source_total = TONUMBER(GET_PROP(GET_AT(source_count, 0), "count"));

SET target_count_before = SQL_QUERY("SELECT COUNT(*) as count FROM capaci_data_clonetest");
SET target_total_before = TONUMBER(GET_PROP(GET_AT(target_count_before, 0), "count"));

LOG "📊 Avant: Source=" + source_total + ", Cible=" + target_total_before;

// === NETTOYAGE ===
LOG "🧹 Nettoyage de la table cible...";
SET cleanup = SQL_QUERY("DELETE FROM capaci_data_clonetest", [], TRUE);
SET deleted_rows = GET_PROP(cleanup, "rowCount");

LOG "🗑️ " + deleted_rows + " anciennes lignes supprimées";

// === COPIE COMPLÈTE ===
LOG "📝 Copie de TOUS les enregistrements...";

SET copy_result = SQL_QUERY(
    "INSERT INTO capaci_data_clonetest SELECT * FROM capaci_data", 
    [], 
    TRUE
);

SET rows_copied = GET_PROP(copy_result, "rowCount");
LOG "✅ " + rows_copied + " enregistrements copiés";

// === VÉRIFICATION ===
SET target_count_after = SQL_QUERY("SELECT COUNT(*) as count FROM capaci_data_clonetest");
SET target_total_after = TONUMBER(GET_PROP(GET_AT(target_count_after, 0), "count"));

// Vérification que tout a été copié
SET complete_copy = target_total_after == source_total;
SET copy_integrity = rows_copied == source_total;
SET success = complete_copy AND copy_integrity;
SET status = IF(success, "SUCCESS", "FAILED");

LOG "📊 Après: Source=" + source_total + ", Cible=" + target_total_after;
LOG "🎯 Status: " + status;

// === ÉCHANTILLON DE VÉRIFICATION ===
SET copied_sample = SQL_QUERY("SELECT entity, account, period FROM capaci_data_clonetest LIMIT 5");
SET sample_count = ARRAY_LENGTH(copied_sample);

LOG "📋 Échantillon vérifié: " + sample_count + " enregistrements lisibles";

// === STATISTIQUES PAR ENTITÉ ===
SET source_entities = SQL_QUERY("SELECT entity, COUNT(*) as count FROM capaci_data GROUP BY entity ORDER BY count DESC");
SET target_entities = SQL_QUERY("SELECT entity, COUNT(*) as count FROM capaci_data_clonetest GROUP BY entity ORDER BY count DESC");

SET entities_match = ARRAY_LENGTH(source_entities) == ARRAY_LENGTH(target_entities);

LOG "🏢 Entités source: " + ARRAY_LENGTH(source_entities) + ", cible: " + ARRAY_LENGTH(target_entities);

// === RÉSUMÉ FINAL ===
SET copy_percentage = ROUND((target_total_after / source_total) * 100, 2);

SET summary = CONCAT(
    "Copie ", status, " - ",
    rows_copied, " enregistrements copiés (",
    copy_percentage, "% de la source)"
);

LOG "📋 Résumé: " + summary;

// === EXPORTS ===
EXPORT source_total;
EXPORT target_total_before;
EXPORT target_total_after;
EXPORT rows_copied;
EXPORT deleted_rows;
EXPORT complete_copy;
EXPORT copy_integrity;
EXPORT entities_match;
EXPORT copy_percentage;
EXPORT success;
EXPORT status;
EXPORT summary;
EXPORT copied_sample;
EXPORT source_entities;
EXPORT target_entities;