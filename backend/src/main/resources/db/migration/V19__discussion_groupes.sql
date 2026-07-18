-- Groupes de discussion internes (formateurs / directeur / comptable).
-- Canaux fixes, appartenance deduite du role — pas de table de membres.
CREATE TABLE IF NOT EXISTS message_groupes (
    id         BIGSERIAL PRIMARY KEY,
    canal      VARCHAR(40)  NOT NULL,
    auteur_id  BIGINT       NOT NULL REFERENCES users(id),
    contenu    TEXT         NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_groupes_canal_created ON message_groupes (canal, created_at);
