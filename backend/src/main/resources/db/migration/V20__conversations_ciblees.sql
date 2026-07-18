-- Conversations ciblees : le Directeur peut discuter avec le comptable et/ou
-- avec les formateurs d'un centre ou d'un cluster precis (en plus des 4
-- canaux fixes de message_groupes). Audience deduite des criteres (centre_id,
-- cluster, inclure_comptable), pas de table de membres.
CREATE TABLE IF NOT EXISTS conversations_ciblees (
    id                 BIGSERIAL PRIMARY KEY,
    centre_id          BIGINT REFERENCES centres(id),
    centre_nom         VARCHAR(255),
    cluster            VARCHAR(150),
    inclure_comptable  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by         BIGINT       NOT NULL REFERENCES users(id),
    created_at         TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages_cibles (
    id               BIGSERIAL PRIMARY KEY,
    conversation_id  BIGINT       NOT NULL REFERENCES conversations_ciblees(id) ON DELETE CASCADE,
    auteur_id        BIGINT       NOT NULL REFERENCES users(id),
    contenu          TEXT         NOT NULL,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_ciblees_centre ON conversations_ciblees (centre_id);
CREATE INDEX IF NOT EXISTS idx_conversations_ciblees_cluster ON conversations_ciblees (cluster);
CREATE INDEX IF NOT EXISTS idx_messages_cibles_conv_created ON messages_cibles (conversation_id, created_at);
