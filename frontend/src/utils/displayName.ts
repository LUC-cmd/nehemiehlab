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

export function formatFullName(prenom?: string | null, nom?: string | null): string {
  return [formatDisplayName(prenom), formatDisplayName(nom)].filter(Boolean).join(' ');
}
