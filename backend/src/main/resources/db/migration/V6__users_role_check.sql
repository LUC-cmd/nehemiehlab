-- Étend la contrainte CHECK sur users.role pour inclure RESPONSABLE_CLUSTER.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
    'DIRECTEUR',
    'FORMATEUR',
    'COORDINATEUR',
    'RESPONSABLE_CLUSTER',
    'COMPTABLE',
    'STAFF_NEHEMIAH',
    'ANIMATEUR',
    'PARENT',
    'BENEVOLE',
    'PARTICIPANT'
));
