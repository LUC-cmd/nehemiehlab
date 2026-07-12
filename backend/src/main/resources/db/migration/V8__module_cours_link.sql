ALTER TABLE formations ADD COLUMN IF NOT EXISTS module_cours_id BIGINT;
ALTER TABLE sessions_cours ADD COLUMN IF NOT EXISTS module_cours_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_formations_module_cours ON formations (module_cours_id);
CREATE INDEX IF NOT EXISTS idx_sessions_cours_module_cours ON sessions_cours (module_cours_id);
