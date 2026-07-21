-- Permet au formateur de joindre optionnellement un fichier (photo, vidéo ou
-- projet Scratch .sb3) prouvant qu'un enfant a réalisé un projet pendant une
-- séance donnée. Champs nullables : rien n'est enregistré si l'enfant n'a
-- rien réalisé pendant la séance.
ALTER TABLE evaluations_session
    ADD COLUMN IF NOT EXISTS projet_fichier_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS projet_fichier_nom VARCHAR(255);
