ALTER TABLE evaluations_session
    ADD COLUMN IF NOT EXISTS projet_final BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE evaluations_session
    ADD COLUMN IF NOT EXISTS projet_probleme TEXT;

ALTER TABLE evaluations_session
    ADD COLUMN IF NOT EXISTS projet_solution TEXT;
