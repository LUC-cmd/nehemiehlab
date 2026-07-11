CREATE TABLE IF NOT EXISTS galerie_photos (
    id BIGSERIAL PRIMARY KEY,
    legende VARCHAR(500) NOT NULL,
    image_url VARCHAR(512),
    ordre INT NOT NULL DEFAULT 0,
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galerie_photos_actif_ordre ON galerie_photos (actif, ordre, created_at DESC);
