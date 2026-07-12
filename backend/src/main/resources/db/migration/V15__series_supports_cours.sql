-- Séries de supports (titre) liées à un ou plusieurs modules SKA
CREATE TABLE IF NOT EXISTS series_supports_cours (
    id           BIGSERIAL PRIMARY KEY,
    titre        VARCHAR(200) NOT NULL,
    description  TEXT,
    ordre        INTEGER      NOT NULL DEFAULT 0,
    actif        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_series_supports_ordre ON series_supports_cours (ordre, titre);

CREATE TABLE IF NOT EXISTS serie_support_modules (
    serie_support_id BIGINT NOT NULL REFERENCES series_supports_cours (id) ON DELETE CASCADE,
    module_cours_id  BIGINT NOT NULL REFERENCES modules_cours (id) ON DELETE CASCADE,
    PRIMARY KEY (serie_support_id, module_cours_id)
);

CREATE INDEX IF NOT EXISTS idx_serie_support_modules_module ON serie_support_modules (module_cours_id);

ALTER TABLE supports_cours ADD COLUMN IF NOT EXISTS serie_support_id BIGINT REFERENCES series_supports_cours (id) ON DELETE CASCADE;

-- Migrer les fichiers existants : une série par module qui avait des supports
INSERT INTO series_supports_cours (titre, description, ordre, actif, created_at, updated_at)
SELECT 'Supports — ' || m.titre, m.description, m.numero_ordre, m.actif, NOW(), NOW()
FROM modules_cours m
WHERE EXISTS (SELECT 1 FROM supports_cours s WHERE s.module_cours_id = m.id)
  AND NOT EXISTS (
      SELECT 1 FROM serie_support_modules ssm
      JOIN series_supports_cours ss ON ss.id = ssm.serie_support_id
      WHERE ssm.module_cours_id = m.id AND ss.titre = 'Supports — ' || m.titre
  );

INSERT INTO serie_support_modules (serie_support_id, module_cours_id)
SELECT ss.id, m.id
FROM modules_cours m
JOIN series_supports_cours ss ON ss.titre = 'Supports — ' || m.titre
WHERE EXISTS (SELECT 1 FROM supports_cours s WHERE s.module_cours_id = m.id)
ON CONFLICT DO NOTHING;

UPDATE supports_cours s
SET serie_support_id = ss.id
FROM modules_cours m
JOIN series_supports_cours ss ON ss.titre = 'Supports — ' || m.titre
WHERE s.module_cours_id = m.id
  AND s.serie_support_id IS NULL;

ALTER TABLE supports_cours DROP CONSTRAINT IF EXISTS supports_cours_module_cours_id_fkey;
ALTER TABLE supports_cours DROP COLUMN IF EXISTS module_cours_id;

ALTER TABLE supports_cours ALTER COLUMN serie_support_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_supports_cours_serie ON supports_cours (serie_support_id);
