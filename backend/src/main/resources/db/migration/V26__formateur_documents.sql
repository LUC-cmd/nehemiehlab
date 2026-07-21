-- Documents deposes par les formateurs depuis leur espace dedie : contrat,
-- projets realises (.sb3) et presentations (PPTX/PDF) demandees par le
-- Directeur. Historique illimite, consultable par le Directeur.
CREATE TABLE IF NOT EXISTS formateur_documents (
    id BIGSERIAL PRIMARY KEY,
    formateur_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL,
    titre VARCHAR(180),
    url VARCHAR(500) NOT NULL,
    nom_fichier_original VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_formateur_documents_formateur ON formateur_documents(formateur_id);
CREATE INDEX IF NOT EXISTS idx_formateur_documents_type ON formateur_documents(type);
