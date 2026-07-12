ALTER TABLE rapport_synthese_centre DROP CONSTRAINT IF EXISTS rapport_synthese_centre_centre_id_module_label_annee_key;
DROP INDEX IF EXISTS idx_rsc_centre_module_annee;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rsc_centre_module_periode
    ON rapport_synthese_centre (centre_id, module_label, date_debut, date_fin);
