export const CLASSE_PRESETS = [
  'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2',
  '6ème', '5ème', '4ème', '3ème',
  'Seconde', 'Première', 'Terminale',
] as const;

export const AGE_MIN = 6;
export const AGE_MAX = 22;

export function computeAgeFromDate(dateNaissance: string): number | null {
  if (!dateNaissance) return null;
  const dn = new Date(dateNaissance);
  if (Number.isNaN(dn.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dn.getFullYear();
  const m = now.getMonth() - dn.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dn.getDate())) age -= 1;
  return age;
}

export type EleveFicheValues = {
  nom: string;
  prenom: string;
  dateNaissance: string;
  age: string;
  sexe: 'M' | 'F';
  classe: string;
  centreId: string;
  dateDebutFormation: string;
  raisonSelection: string;
};

export const emptyEleveFiche = (centreId = ''): EleveFicheValues => ({
  nom: '',
  prenom: '',
  dateNaissance: '',
  age: '',
  sexe: 'M',
  classe: '',
  centreId,
  dateDebutFormation: new Date().toISOString().split('T')[0],
  raisonSelection: '',
});

export function eleveToFicheValues(eleve: {
  nom: string;
  prenom: string;
  dateNaissance?: string;
  age: number;
  sexe: string;
  classe: string;
  centre?: { id: number };
  dateDebutFormation: string;
  raisonSelection?: string;
}): EleveFicheValues {
  return {
    nom: eleve.nom,
    prenom: eleve.prenom,
    dateNaissance: eleve.dateNaissance?.split('T')[0] || '',
    age: String(eleve.age),
    sexe: eleve.sexe === 'F' ? 'F' : 'M',
    classe: eleve.classe,
    centreId: eleve.centre?.id ? String(eleve.centre.id) : '',
    dateDebutFormation: eleve.dateDebutFormation?.split('T')[0] || new Date().toISOString().split('T')[0],
    raisonSelection: eleve.raisonSelection || '',
  };
}
