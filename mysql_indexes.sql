-- ============================================
-- INDEX SQL POUR OPTIMISATION DES PERFORMANCES (MySQL/MariaDB)
-- ============================================
-- 
-- Ce fichier contient les index recommandés pour optimiser
-- les requêtes de recherche spatiale dans la table transactions.
--
-- EXÉCUTION :
--   mysql -u your_user -p your_database < mysql_indexes.sql
--   OU exécutez ces commandes directement dans votre client MySQL
--
-- IMPORTANT : Assurez-vous que la colonne `geom` est de type GEOMETRY ou POINT
--             avec SRID 4326 pour que les index spatiaux fonctionnent.

-- ============================================
-- 1. INDEX SPATIAL (CRITIQUE pour ST_DWithin)
-- ============================================
-- Cet index est ESSENTIEL pour les recherches géographiques rapides.
-- Il permet à MySQL d'utiliser un index spatial au lieu de scanner toute la table.
-- 
-- NOTE : La colonne `geom` doit être de type GEOMETRY, POINT, ou similaire avec SRID 4326

CREATE SPATIAL INDEX idx_transactions_geom_spatial 
ON transactions (geom);

-- ============================================
-- 2. INDEX SUR CODE_POSTAL (pour la recherche géographique)
-- ============================================
-- Accélère les recherches par code postal ou ville
-- Utile pour les filtres géographiques et les recherches par localisation

CREATE INDEX idx_transactions_code_postal 
ON transactions (code_postal);

-- Index sur nom_commune pour les recherches par ville
CREATE INDEX idx_transactions_nom_commune 
ON transactions (nom_commune);

-- Index composite code_postal + nom_commune (pour les recherches combinées)
CREATE INDEX idx_transactions_code_commune 
ON transactions (code_postal, nom_commune);

-- ============================================
-- 3. INDEX SUR TYPE_LOCAL (pour le filtre)
-- ============================================
-- Accélère le filtrage par type de bien (Maison, Appartement, etc.)

CREATE INDEX idx_transactions_type_local 
ON transactions (type_local);

-- Index composite pour optimiser les filtres combinés type_local + surface_terrain
CREATE INDEX idx_transactions_type_surface 
ON transactions (type_local, surface_terrain);

-- ============================================
-- 4. INDEX SUR DATE_MUTATION (pour ORDER BY)
-- ============================================
-- Accélère le tri par date (ORDER BY date_mutation DESC)
-- CRITIQUE car utilisé dans toutes les requêtes de recherche

CREATE INDEX idx_transactions_date_mutation 
ON transactions (date_mutation DESC);

-- Index composite pour optimiser GROUP BY id_mutation + ORDER BY date_mutation
-- Améliore les performances des requêtes avec GROUP BY et ORDER BY combinés
CREATE INDEX idx_transactions_id_date 
ON transactions (id_mutation, date_mutation DESC);

-- ============================================
-- 5. INDEX SUR VALEUR_FONCIERE (pour les filtres de prix)
-- ============================================
-- Accélère les filtres et tris par prix
-- Utile pour les recherches avec filtres de prix min/max

CREATE INDEX idx_transactions_valeur_fonciere 
ON transactions (valeur_fonciere);

-- Index composite prix + date (pour les tris par prix puis date)
CREATE INDEX idx_transactions_prix_date 
ON transactions (valeur_fonciere DESC, date_mutation DESC);

-- ============================================
-- 6. INDEX SUR SURFACE_TERRAIN (pour le filtre Terrain)
-- ============================================
-- Accélère le filtre (type_local IS NULL AND surface_terrain > 0)
-- Utile pour identifier les terrains nus

CREATE INDEX idx_transactions_surface_terrain 
ON transactions (surface_terrain);

-- Index composite pour les terrains (type_local NULL + surface_terrain > 0)
-- Note : MySQL ne supporte pas les index partiels avec WHERE comme PostgreSQL,
-- mais cet index aidera quand même pour les requêtes sur surface_terrain
CREATE INDEX idx_transactions_terrain_null 
ON transactions (type_local, surface_terrain);

-- ============================================
-- 7. INDEX COMPOSITE OPTIMISÉ (pour la requête complète)
-- ============================================
-- Index composite qui couvre plusieurs colonnes fréquemment utilisées ensemble
-- Peut être utilisé par MySQL pour optimiser les requêtes complexes

CREATE INDEX idx_transactions_composite 
ON transactions (type_local, date_mutation DESC, valeur_fonciere);

-- ============================================
-- 8. ANALYSE DES STATISTIQUES
-- ============================================
-- Mettre à jour les statistiques pour que l'optimiseur MySQL
-- choisisse les meilleurs index

ANALYZE TABLE transactions;

-- ============================================
-- VÉRIFICATION DES INDEX
-- ============================================
-- Pour vérifier que les index sont créés, exécutez :
--
-- SHOW INDEX FROM transactions;
--
-- OU pour plus de détails :
--
-- SELECT 
--   INDEX_NAME,
--   COLUMN_NAME,
--   SEQ_IN_INDEX,
--   INDEX_TYPE,
--   NON_UNIQUE
-- FROM INFORMATION_SCHEMA.STATISTICS
-- WHERE TABLE_SCHEMA = DATABASE()
--   AND TABLE_NAME = 'transactions'
-- ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- ============================================
-- NOTES DE PERFORMANCE
-- ============================================
-- 
-- 1. Les index spatiaux (SPATIAL INDEX) sont optimaux pour les requêtes spatiales
--    mais peuvent être plus lents à créer sur de grandes tables.
--    Planifiez une maintenance pendant une période de faible activité.
--
-- 2. Les index sur les colonnes fréquemment filtrées (type_local, code_postal)
--    accélèrent considérablement les requêtes avec WHERE.
--
-- 3. Les index composites sont utiles quand plusieurs colonnes sont utilisées
--    ensemble dans WHERE, ORDER BY, ou GROUP BY.
--
-- 4. Après création des index, exécutez ANALYZE TABLE pour mettre à jour
--    les statistiques de l'optimiseur MySQL.
--
-- 5. Surveillez la taille des index avec :
--    SELECT 
--      TABLE_NAME,
--      INDEX_NAME,
--      ROUND(STAT_VALUE * @@innodb_page_size / 1024 / 1024, 2) AS 'Size (MB)'
--    FROM mysql.innodb_index_stats
--    WHERE TABLE_NAME = 'transactions';
--
-- 6. Si les performances ne s'améliorent pas, utilisez EXPLAIN pour voir
--    quel index est utilisé :
--    EXPLAIN SELECT ... FROM transactions WHERE ST_DWithin(...);
--
-- 7. Pour les grandes tables (> 1M lignes), la création des index peut prendre
--    plusieurs minutes. Surveillez la progression avec :
--    SHOW PROCESSLIST;

-- ============================================
-- OPTIMISATION SUPPLÉMENTAIRE
-- ============================================
-- Si vous avez des problèmes de performance après la création des index,
-- vous pouvez également optimiser la table :
--
-- OPTIMIZE TABLE transactions;
--
-- Cela reconstruit les index et défragmente la table.
-- À exécuter périodiquement (ex: une fois par semaine) sur les tables
-- qui subissent beaucoup d'insertions/suppressions.

