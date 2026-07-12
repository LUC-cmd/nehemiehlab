export const CLASSE_PRESETS = [
  'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2',
  '6ème', '5ème', '4ème', '3ème',
  'Seconde', 'Première', 'Terminale',
] as const;

export const AGE_MIN = 6;
export const AGE_MAX = 22;

export type EleveFicheValues = {
  nom: string;
  prenom: string;
  age: string;
  sexe: 'M' | 'F';
  classe: string;
  centreId: string;
  dateDebutFormation: string;
};

export const emptyEleveFiche = (centreId = ''): EleveFicheValues => ({
  nom: '',
  prenom: '',
  age: '',
  sexe: 'M',
  classe: '',
  centreId,
  dateDebutFormation: new Date().toISOString().split('T')[0],
});

export function eleveToFicheValues(eleve: {
  nom: string;
  prenom: string;
  age: number;
  sexe: string;
  classe: string;
  centre?: { id: number };
  dateDebutFormation: string;
}): EleveFicheValues {
  return {
    nom: eleve.nom,
    prenom: eleve.prenom,
    age: String(eleve.age),
    sexe: eleve.sexe === 'F' ? 'F' : 'M',
    classe: eleve.classe,
    centreId: eleve.centre?.id ? String(eleve.centre.id) : '',
    dateDebutFormation: eleve.dateDebutFormation?.split('T')[0] || new Date().toISOString().split('T')[0],
  };
}
