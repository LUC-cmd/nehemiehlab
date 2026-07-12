ALTER TABLE projets ADD COLUMN IF NOT EXISTS probleme TEXT;
ALTER TABLE projets ADD COLUMN IF NOT EXISTS solution TEXT;
ALTER TABLE projets ADD COLUMN IF NOT EXISTS niveau_maitrise VARCHAR(32);
ALTER TABLE projets ADD COLUMN IF NOT EXISTS observations_rapport TEXT;

ALTER TABLE centres ADD COLUMN IF NOT EXISTS code_cdej VARCHAR(32);
ALTER TABLE centres ADD COLUMN IF NOT EXISTS lieu_formation VARCHAR(255);

CREATE TABLE IF NOT EXISTS rapport_synthese_centre (
    id                      BIGSERIAL PRIMARY KEY,
    centre_id               BIGINT       NOT NULL REFERENCES centres (id) ON DELETE CASCADE,
    module_label            VARCHAR(255) NOT NULL DEFAULT 'Module 01 : Apprendre à coder avec Scratch',
    annee                   INTEGER,
    date_debut              DATE,
    date_fin                DATE,
    effectif_debut_filles   INTEGER,
    effectif_debut_garcons  INTEGER,
    effectif_final_filles   INTEGER,
    effectif_final_garcons  INTEGER,
    projets_libres_p1       INTEGER,
    projets_libres_p2       INTEGER,
    projets_non_acheves     INTEGER,
    projets_groupe          INTEGER,
    projets_contextuels     INTEGER,
    projets_presentes       INTEGER,
    synthese_table          TEXT,
    aime                    TEXT,
    pas_aime                TEXT,
    vision                  TEXT,
    formateur_id            BIGINT REFERENCES users (id) ON DELETE SET NULL,
    updated_at              TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rsc_centre_module_annee
    ON rapport_synthese_centre (centre_id, module_label, annee);
