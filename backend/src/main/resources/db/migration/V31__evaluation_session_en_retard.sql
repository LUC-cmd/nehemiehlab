-- Ajoute un statut "retard" pour un enfant présent en séance : informatif
-- seulement (n'affecte pas le calcul de la durée, qui reste uniforme pour
-- tous les enfants présents = début -> fin de séance). Permet d'afficher un
-- décompte du nombre de retards sur la fiche/rapport de chaque enfant.
ALTER TABLE evaluations_session
    ADD COLUMN IF NOT EXISTS en_retard BOOLEAN NOT NULL DEFAULT FALSE;
