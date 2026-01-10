-- Ajouter la colonne is_admin à la table users (si elle n'existe pas)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Donner les droits admin à zatecka.m@gmail.com
UPDATE users SET is_admin = TRUE WHERE email = 'zatecka.m@gmail.com';

-- Créer la table des invitations
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

-- Index pour recherche rapide par token
CREATE INDEX IF NOT EXISTS idx_invitation_token ON invitation_tokens(token);
