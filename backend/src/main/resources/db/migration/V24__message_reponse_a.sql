-- Reponse a un message precis (citation) dans les groupes de discussion et
-- les conversations ciblees/libres. Reference simple vers l'id du message
-- d'origine (dans la meme table) ; ON DELETE SET NULL pour ne jamais bloquer
-- la table si un message d'origine venait a etre supprime.
ALTER TABLE message_groupes
    ADD COLUMN IF NOT EXISTS reponse_a_id BIGINT REFERENCES message_groupes(id) ON DELETE SET NULL;

ALTER TABLE messages_cibles
    ADD COLUMN IF NOT EXISTS reponse_a_id BIGINT REFERENCES messages_cibles(id) ON DELETE SET NULL;
