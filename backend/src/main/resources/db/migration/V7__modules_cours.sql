-- Modules pédagogiques SKA (Directeur) + supports de cours (fichiers)
CREATE TABLE IF NOT EXISTS modules_cours (
    id                        BIGSERIAL PRIMARY KEY,
    numero_ordre              INTEGER      NOT NULL DEFAULT 0,
    titre                     VARCHAR(200) NOT NULL,
    description               TEXT,
    objectifs                 TEXT,
    duree_recommandee_heures  DOUBLE PRECISION,
    niveau                    VARCHAR(80),
    actif                     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at                TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modules_cours_ordre ON modules_cours (numero_ordre, titre);

CREATE TABLE IF NOT EXISTS supports_cours (
    id              BIGSERIAL PRIMARY KEY,
    url             VARCHAR(500) NOT NULL,
    nom             VARCHAR(255) NOT NULL,
    mime_type       VARCHAR(120),
    ordre           INTEGER      NOT NULL DEFAULT 0,
    module_cours_id BIGINT       NOT NULL REFERENCES modules_cours (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_supports_cours_module ON supports_cours (module_cours_id);
