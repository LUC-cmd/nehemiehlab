-- Agenda hebdomadaire du formateur : planning recurrent (jour de la semaine +
-- heures) par centre, pour qu'il puisse visualiser et organiser ses semaines
-- (quel centre, quel jour, a quelle heure), independamment du demarrage
-- effectif d'une seance.
CREATE TABLE IF NOT EXISTS formateur_agenda (
    id BIGSERIAL PRIMARY KEY,
    formateur_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    centre_id BIGINT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    jour_semaine SMALLINT NOT NULL CHECK (jour_semaine BETWEEN 1 AND 7),
    heure_debut TIME NOT NULL,
    heure_fin TIME NOT NULL,
    notes VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_formateur_agenda_formateur ON formateur_agenda(formateur_id);
