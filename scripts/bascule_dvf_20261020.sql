-- Bascule vers la livraison DVF géolocalisée du 20/10/2026.
--
-- L'ancienne table est SUPPRIMÉE : on repart sur le seul périmètre diffusé aujourd'hui par
-- la source, soit juillet 2021 à juin 2026. Cela fait disparaître le millésime 2020
-- (834 523 mutations) et le 1er semestre 2021, que data.gouv ne publie plus — le jeu
-- géolocalisé ne conserve qu'une fenêtre glissante de 5 ans.
--
-- Filet de sécurité : ces millésimes restent présents dans /home/ubuntu/dvf.csv (fichier
-- national de janvier 2026, 3,5 Go). Tant que ce fichier existe, l'historique est
-- réimportable. Le supprimer rendrait la perte définitive.
--
-- Tout est dans une seule transaction : aucune session ne peut observer un état sans
-- table `transactions`.
BEGIN;

DROP TABLE transactions;

ALTER TABLE transactions_v2 RENAME TO transactions;

-- Les index gardent sinon leur nom de travail (idx_tv2_*) : sans conséquence
-- fonctionnelle, mais on les réaligne pour que la table reste lisible à l'inspection.
ALTER INDEX idx_tv2_geom_geography RENAME TO idx_transactions_geom_geography;
ALTER INDEX idx_tv2_geom           RENAME TO idx_transactions_geom;
ALTER INDEX idx_tv2_id_mutation    RENAME TO idx_transactions_id_mutation;
ALTER INDEX idx_tv2_date_mutation  RENAME TO idx_transactions_date_mutation;
ALTER INDEX idx_tv2_type_local     RENAME TO idx_transactions_type_local;
ALTER INDEX idx_tv2_dept_date_type RENAME TO idx_transactions_dept_date_type;

ALTER TABLE transactions RENAME CONSTRAINT transactions_v2_pkey TO transactions_pkey;

COMMIT;
