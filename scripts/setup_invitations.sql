-- Script pour configurer le système d'invitations
-- À exécuter sur le VPS avec: psql -U votre_user -d votre_db -f scripts/setup_invitations.sql

-- 1. Créer la table invitation_tokens si elle n'existe pas
CREATE TABLE IF NOT EXISTS invitation_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(255),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    used_by INTEGER REFERENCES users(id)
);

-- 2. Créer un index sur le token pour des recherches rapides
CREATE INDEX IF NOT EXISTS idx_invitation_token ON invitation_tokens(token);

-- 3. Ajouter la colonne is_admin aux users si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_admin') THEN
        ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 4. Mettre l'utilisateur zatecka.m@gmail.com comme admin
UPDATE users SET is_admin = TRUE WHERE email = 'zatecka.m@gmail.com';

-- 5. Vérifier le statut
SELECT 'Table invitation_tokens créée' AS status;
SELECT id, email, is_admin FROM users WHERE is_admin = TRUE;
