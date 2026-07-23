-- Permet la saisie manuelle (rétroactive) d'une séance déjà terminée, sans
-- géolocalisation obligatoire, et trace la dernière modification d'une séance
-- (date + auteur) pour que ce soit visible dans l'interface.
ALTER TABLE sessions_cours
    ADD COLUMN IF NOT EXISTS manuelle BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS modifie_le TIMESTAMP,
    ADD COLUMN IF NOT EXISTS modifie_par_nom VARCHAR(255);
