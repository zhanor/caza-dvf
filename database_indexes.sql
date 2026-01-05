-- ============================================
-- INDEX SQL POUR OPTIMISATION DES PERFORMANCES
-- ============================================
-- 
-- Ce fichier contient les index recommandés pour optimiser
-- les requêtes de recherche spatiale dans la table transactions.
--
-- EXÉCUTION :
--   psql -U postgres -d postgres -f database_indexes.sql
--   OU exécutez ces commandes directement dans votre client PostgreSQL
--

-- ============================================
-- 1. INDEX SPATIAL GIST (CRITIQUE pour ST_DWithin)
-- ============================================
-- Cet index est ESSENTIEL pour les recherches géographiques rapides.
-- Il permet à PostGIS d'utiliser un index spatial au lieu de scanner toute la table.

CREATE INDEX IF NOT EXISTS idx_transactions_geom_gist 
ON transactions 
USING GIST (geom);

-- Index supplémentaire sur la géographie (pour ST_DWithin avec ::geography)
CREATE INDEX IF NOT EXISTS idx_transactions_geom_geography_gist 
ON transactions 
USING GIST (geom::geography);

-- ============================================
-- 2. INDEX SUR TYPE_LOCAL (pour le filtre)
-- ============================================
-- Accélère le filtrage par type de bien

CREATE INDEX IF NOT EXISTS idx_transactions_type_local 
ON transactions (type_local) 
WHERE type_local IS NOT NULL;

-- Index partiel pour les types spécifiques recherchés
CREATE INDEX IF NOT EXISTS idx_transactions_type_local_filtered 
ON transactions (type_local) 
WHERE type_local IN ('Maison', 'Appartement', 'Local industriel. commercial ou assimilé');

-- ============================================
-- 3. INDEX SUR DATE_MUTATION (pour ORDER BY)
-- ============================================
-- Accélère le tri par date (ORDER BY date_mutation DESC)

CREATE INDEX IF NOT EXISTS idx_transactions_date_mutation 
ON transactions (date_mutation DESC);

-- Index composite pour optimiser GROUP BY + ORDER BY
CREATE INDEX IF NOT EXISTS idx_transactions_id_date 
ON transactions (id_mutation, date_mutation DESC);

-- ============================================
-- 4. INDEX SUR SURFACE_TERRAIN (pour le filtre Terrain)
-- ============================================
-- Accélère le filtre (type_local IS NULL AND surface_terrain > 0)

CREATE INDEX IF NOT EXISTS idx_transactions_surface_terrain 
ON transactions (surface_terrain) 
WHERE type_local IS NULL AND surface_terrain > 0;

-- ============================================
-- 5. INDEX COMPOSITE OPTIMISÉ (pour la requête complète)
-- ============================================
-- Index couvrant qui peut être utilisé pour la requête entière
-- (PostgreSQL peut choisir cet index si plus efficace)

CREATE INDEX IF NOT EXISTS idx_transactions_composite 
ON transactions 
USING GIST (geom) 
INCLUDE (id_mutation, date_mutation, type_local, surface_terrain);

-- ============================================
-- 6. ANALYSE DES STATISTIQUES
-- ============================================
-- Mettre à jour les statistiques pour que le planificateur de requêtes
-- choisisse les meilleurs index

ANALYZE transactions;

-- ============================================
-- VÉRIFICATION DES INDEX
-- ============================================
-- Pour vérifier que les index sont créés, exécutez :
--
-- SELECT 
--   indexname, 
--   indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'transactions' 
-- ORDER BY indexname;
--
-- ============================================
-- NOTES DE PERFORMANCE
-- ============================================
-- 
-- 1. Les index GIST sont optimaux pour les requêtes spatiales
--    mais peuvent être plus lents à créer sur de grandes tables.
--    Planifiez une maintenance pendant une période de faible activité.
--
-- 2. Les index partiels (avec WHERE) sont plus petits et plus rapides
--    car ils n'indexent que les lignes pertinentes.
--
-- 3. Après création des index, exécutez ANALYZE pour mettre à jour
--    les statistiques du planificateur de requêtes.
--
-- 4. Surveillez la taille des index avec :
--    SELECT pg_size_pretty(pg_relation_size('idx_transactions_geom_gist'));
--
-- 5. Si les performances ne s'améliorent pas, utilisez EXPLAIN ANALYZE
--    pour voir quel index est utilisé :
--    EXPLAIN ANALYZE SELECT ... FROM transactions WHERE ST_DWithin(...);
--

