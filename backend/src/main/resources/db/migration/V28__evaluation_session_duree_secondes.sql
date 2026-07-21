-- Précision à la seconde pour la durée de présence d'un enfant en séance.
-- Le champ existant duree_minutes (arrondi à la minute) est conservé pour
-- compatibilité avec les rapports/exports existants ; duree_secondes est la
-- source précise utilisée pour l'affichage "heures : minutes : secondes"
-- dans le tableau de présences du formateur.
ALTER TABLE evaluations_session
    ADD COLUMN IF NOT EXISTS duree_secondes BIGINT;
