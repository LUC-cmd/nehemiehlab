/**
 * Libellé d'affichage unifié d'un centre : nom + code CDEJ entre parenthèses
 * s'il est renseigné (ex: "LUC AD (TG045)"). À utiliser partout où un centre
 * est affiché ou proposé dans une liste, pour que le nom et le code restent
 * toujours associés à l'écran.
 */
export function centreLabel(centre: { nom: string; codeCdej?: string | null } | null | undefined): string {
  if (!centre) return '';
  return centre.codeCdej ? `${centre.nom} (${centre.codeCdej})` : centre.nom;
}

/**
 * Trie une liste de centres par numéro de centre (code CDEJ, ex: TG045),
 * pour permettre de retrouver rapidement un centre par son numéro dans les
 * listes déroulantes (inscription élève, filtres, etc.). Les centres sans
 * code sont placés à la fin, triés par nom.
 */
export function sortCentresByCode<T extends { nom: string; codeCdej?: string | null }>(centres: T[]): T[] {
  return [...centres].sort((a, b) => {
    if (a.codeCdej && b.codeCdej) {
      return a.codeCdej.localeCompare(b.codeCdej, 'fr', { numeric: true });
    }
    if (a.codeCdej) return -1;
    if (b.codeCdej) return 1;
    return a.nom.localeCompare(b.nom, 'fr');
  });
}
