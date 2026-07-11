-- Migrations additives : suppose un schéma métier existant (users, eleves, centres…).
-- Idempotent : peut être rejouée sans erreur sur une base déjà partiellement migrée.

-- Codes d'activation parent (usage unique, hachés côté application).
CREATE TABLE IF NOT EXISTS parent_activation_codes (
    id              BIGSERIAL PRIMARY KEY,
    eleve_id        BIGINT       NOT NULL,
    code_hash       VARCHAR(100) NOT NULL,
    expires_at      TIMESTAMP    NOT NULL,
    used_at         TIMESTAMP,
    locked_until    TIMESTAMP,
    failed_attempts INTEGER      NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_activation_eleve_created
    ON parent_activation_codes (eleve_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parent_activation_expires
    ON parent_activation_codes (expires_at);

-- Comptes parent : le matricule n'est plus un mot de passe.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS parent_credentials_activated BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users
SET parent_credentials_activated = FALSE
WHERE role = 'PARENT';

-- Profils enfants : filtrage géographique et traçabilité.
ALTER TABLE enfant_profiles
    ADD COLUMN IF NOT EXISTS centre_id BIGINT,
    ADD COLUMN IF NOT EXISTS region VARCHAR(120),
    ADD COLUMN IF NOT EXISTS cluster VARCHAR(120),
    ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT,
    ADD COLUMN IF NOT EXISTS eleve_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_enfant_profiles_centre
    ON enfant_profiles (centre_id);
CREATE INDEX IF NOT EXISTS idx_enfant_profiles_eleve
    ON enfant_profiles (eleve_id);

-- Ressources multi-fichiers.
CREATE TABLE IF NOT EXISTS ressource_fichiers (
    id           BIGSERIAL PRIMARY KEY,
    url          VARCHAR(500) NOT NULL,
    nom          VARCHAR(255) NOT NULL,
    mime_type    VARCHAR(120),
    ordre        INTEGER      NOT NULL DEFAULT 0,
    ressource_id BIGINT       NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ressource_fichiers_ressource
    ON ressource_fichiers (ressource_id);

-- Index métier fréquents.
CREATE INDEX IF NOT EXISTS idx_eleves_matricule
    ON eleves (matricule);
CREATE INDEX IF NOT EXISTS idx_eleves_centre
    ON eleves (centre_id);
CREATE INDEX IF NOT EXISTS idx_transactions_formateur_created
    ON transactions (formateur_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_cours_centre
    ON sessions_cours (centre_id);
