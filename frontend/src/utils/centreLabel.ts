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
