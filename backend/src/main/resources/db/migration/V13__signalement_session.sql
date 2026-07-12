ALTER TABLE signalements
    ADD COLUMN IF NOT EXISTS session_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_signalements_session ON signalements (session_id);
