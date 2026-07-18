-- Conversations "libres" (style WhatsApp) : en plus des conversations ciblees par
-- centre/cluster/comptable (reservees au Directeur), n'importe quel utilisateur
-- (formateur, directeur, comptable) peut demarrer une discussion avec une ou
-- plusieurs personnes precises. La visibilite est alors strictement limitee a
-- la liste de participants stockee ici.
CREATE TABLE IF NOT EXISTS conversation_ciblee_participants (
    conversation_id BIGINT NOT NULL REFERENCES conversations_ciblees(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    PRIMARY KEY (conversation_id, user_id)
);
