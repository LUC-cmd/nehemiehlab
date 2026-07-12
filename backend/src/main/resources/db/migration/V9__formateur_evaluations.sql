CREATE TABLE IF NOT EXISTS formateur_evaluations (
    id               BIGSERIAL PRIMARY KEY,
    formateur_id     BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    module_cours_id  BIGINT       NOT NULL REFERENCES modules_cours (id) ON DELETE RESTRICT,
    quiz_score       INTEGER      NOT NULL DEFAULT 0,
    quiz_total       INTEGER      NOT NULL DEFAULT 0,
    quiz_reponses    TEXT,
    scratch_url      VARCHAR(500),
    scratch_nom      VARCHAR(255),
    analyse          TEXT,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_formateur_eval_formateur ON formateur_evaluations (formateur_id);
CREATE INDEX IF NOT EXISTS idx_formateur_eval_module ON formateur_evaluations (module_cours_id);
