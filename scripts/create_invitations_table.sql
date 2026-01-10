-- Table pour les tokens d'invitation
CREATE TABLE IF NOT EXISTS invitation_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(255),  -- Email du destinataire (optionnel)
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,  -- NULL si pas encore utilisé
    used_by INTEGER REFERENCES users(id)  -- ID de l'utilisateur créé avec ce token
);

-- Index pour recherche rapide par token
CREATE INDEX IF NOT EXISTS idx_invitation_token ON invitation_tokens(token);

-- Index pour nettoyer les tokens expirés
CREATE INDEX IF NOT EXISTS idx_invitation_expires ON invitation_tokens(expires_at);
