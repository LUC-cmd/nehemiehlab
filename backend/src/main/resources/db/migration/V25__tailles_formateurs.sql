-- Tailles de vetements et de casquette des formateurs, renseignees par chacun
-- depuis son profil, pour permettre au Directeur de commander habits/casquettes
-- aux bonnes tailles (et d'imprimer la liste via les exports formateurs).
ALTER TABLE users ADD COLUMN IF NOT EXISTS taille_habit VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS taille_casquette VARCHAR(15);
