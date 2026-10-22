-- Bascule atomique vers la livraison DVF du 20/10/2026.
--
-- L'ancienne table n'est PAS supprimée : elle est renommée et conservée telle quelle.
-- C'est le seul endroit où subsistent le millésime 2020 et le 1er semestre 2021, que la
-- source ne diffuse plus (fenêtre glissante de 5 ans). Ne pas la DROP sans décision
-- explicite — ces données sont irrécupérables.
--
-- Les deux renommages sont dans la même transaction : aucune requête ne peut voir un état
-- intermédiaire sans table `transactions`.
BEGIN;

ALTER TABLE transactions    RENAME TO transactions_archive_20260103;
ALTER TABLE transactions_v2 RENAME TO transactions;

-- Les index gardent leur nom (idx_tv2_*), sans conséquence fonctionnelle : on les renomme
-- pour que la table reste lisible à l'inspection.
ALTER INDEX idx_tv2_geom_geography RENAME TO idx_transactions_geom_geography;
ALTER INDEX idx_tv2_geom           RENAME TO idx_transactions_geom;
ALTER INDEX idx_tv2_id_mutation    RENAME TO idx_transactions_id_mutation;
ALTER INDEX idx_tv2_date_mutation  RENAME TO idx_transactions_date_mutation;
ALTER INDEX idx_tv2_type_local     RENAME TO idx_transactions_type_local;
ALTER INDEX idx_tv2_dept_date_type RENAME TO idx_transactions_dept_date_type;

COMMIT;
