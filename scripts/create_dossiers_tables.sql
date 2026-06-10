-- Dossiers d'expertise : sauvegarde des recherches de comparables par mission
-- Usage : psql -h localhost -p 5433 -U postgres -d postgres -f scripts/create_dossiers_tables.sql

CREATE TABLE IF NOT EXISTS dossiers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  adresse_bien TEXT,
  lat NUMERIC(12,8),
  lng NUMERIC(12,8),
  radius INTEGER DEFAULT 500,
  filtres JSONB NOT NULL DEFAULT '{}',
  statut TEXT NOT NULL DEFAULT 'en_cours', -- en_cours | termine
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dossiers_user ON dossiers (user_id, updated_at DESC);

-- Comparables rattachés à un dossier.
-- snapshot : copie JSON des données du comparable au moment de la sauvegarde
-- (traçabilité : la table transactions peut être ré-importée)
CREATE TABLE IF NOT EXISTS dossier_comparables (
  id SERIAL PRIMARY KEY,
  dossier_id INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  id_mutation TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'retenu', -- retenu | ecarte (décoché) | exclu (corbeille)
  note TEXT,
  snapshot JSONB NOT NULL,
  UNIQUE (dossier_id, id_mutation)
);

CREATE INDEX IF NOT EXISTS idx_dossier_comparables_dossier ON dossier_comparables (dossier_id);
