-- Script pour configurer le système d'invitations
-- Exécuter sur le VPS: psql -U postgres -d caza_dvf -f scripts/setup_invitations.sql

-- 1. Créer la table invitation_tokens
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

-- 2. Index sur le token
CREATE INDEX IF NOT EXISTS idx_invitation_token ON invitation_tokens(token);

-- 3. Ajouter colonne is_admin si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_admin') THEN
        ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 4. Mettre admin
UPDATE users SET is_admin = TRUE WHERE email = 'zatecka.m@gmail.com';

-- Vérification
SELECT 'Setup terminé' AS status;
SELECT id, email, is_admin FROM users WHERE email = 'zatecka.m@gmail.com';
