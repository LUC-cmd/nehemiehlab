-- Catalogue des clusters : entite geree independamment du champ texte libre
-- centres.cluster, pour permettre au Directeur de creer un cluster une seule
-- fois puis de le selectionner dans une liste (evite les doublons de saisie).
CREATE TABLE IF NOT EXISTS clusters (
    id         BIGSERIAL PRIMARY KEY,
    nom        VARCHAR(150) NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clusters_nom_unique ON clusters (LOWER(nom));

-- Reprise des valeurs de cluster deja utilisees sur des centres existants,
-- pour qu'elles apparaissent immediatement dans la liste de selection.
INSERT INTO clusters (nom)
SELECT DISTINCT TRIM(cluster) FROM centres
WHERE cluster IS NOT NULL AND TRIM(cluster) <> ''
ON CONFLICT DO NOTHING;
