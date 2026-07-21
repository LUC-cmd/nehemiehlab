/**
 * Comparateur unifié pour trier les listes d'élèves/enfants alphabétiquement,
 * en commençant par le Nom puis le Prénom (ex: "Adjovi Kossi" avant "Agbeko Ama").
 * À utiliser partout où une liste d'élèves est affichée (tableaux, dropdowns,
 * cartes, exports) pour garantir un ordre cohérent dans toute l'application.
 */
export function compareEleveNomPrenom(
  a: { nom?: string | null; prenom?: string | null },
  b: { nom?: string | null; prenom?: string | null }
): number {
  const nomA = (a.nom || '').trim();
  const nomB = (b.nom || '').trim();
  const cmpNom = nomA.localeCompare(nomB, 'fr', { sensitivity: 'base' });
  if (cmpNom !== 0) return cmpNom;
  const prenomA = (a.prenom || '').trim();
  const prenomB = (b.prenom || '').trim();
  return prenomA.localeCompare(prenomB, 'fr', { sensitivity: 'base' });
}

/** Retourne une copie triée (Nom puis Prénom, A→Z) sans muter le tableau d'origine. */
export function sortEleves<T extends { nom?: string | null; prenom?: string | null }>(eleves: T[]): T[] {
  return [...eleves].sort(compareEleveNomPrenom);
}
