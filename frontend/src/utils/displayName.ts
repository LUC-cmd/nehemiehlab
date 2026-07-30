/** Retire emojis / symboles en tête de chaîne pour l'affichage des noms. */
const LEADING_SYMBOLS =
  /^[\s\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]+/u;

export function formatDisplayName(value?: string | null): string {
  if (!value) return '';
  let cleaned = value.trim();
  while (LEADING_SYMBOLS.test(cleaned)) {
    cleaned = cleaned.replace(LEADING_SYMBOLS, '').trim();
  }
  return cleaned;
}

/**
 * Nom de famille pret a afficher : toujours tout en MAJUSCULES, quelle que
 * soit la casse saisie a l'inscription/creation du compte.
 */
export function formatNomAffiche(value?: string | null): string {
  const cleaned = formatDisplayName(value);
  return cleaned ? cleaned.toLocaleUpperCase('fr-FR') : '';
}

/**
 * Prenom(s) prets a afficher : une majuscule en debut de chaque prenom (et
 * de chaque partie d'un prenom compose avec un tiret), le reste en
 * minuscules. Gere les prenoms multiples separes par un espace
 * (« Marie Claire ») et les prenoms composes avec un tiret (« Jean-Paul »).
 */
export function formatPrenomAffiche(value?: string | null): string {
  const cleaned = formatDisplayName(value);
  if (!cleaned) return '';
  const capitalize = (part: string) =>
    part ? part.charAt(0).toLocaleUpperCase('fr-FR') + part.slice(1).toLocaleLowerCase('fr-FR') : part;
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.split('-').map(capitalize).join('-'))
    .join(' ');
}

/**
 * "NOM Prenom" pret a afficher : nom de famille en majuscules d'abord, puis
 * le(s) prenom(s) en casse normale (majuscule initiale, reste en minuscule).
 * A utiliser partout ou une personne (formateur, coordinateur, eleve,
 * directeur, utilisateur...) est affichee : listes, fiches, exports.
 *
 * Le nom du parametre `prenom` en premiere position est conserve pour ne
 * pas casser les appels existants ; seul l'ORDRE D'AFFICHAGE change (nom de
 * famille toujours avant le prenom).
 */
export function formatFullName(prenom?: string | null, nom?: string | null): string {
  const n = formatNomAffiche(nom);
  const p = formatPrenomAffiche(prenom);
  return [n, p].filter(Boolean).join(' ');
}
