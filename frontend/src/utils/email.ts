/** Aligné avec InputSanitizer.isSafeEmail côté backend (+ domaines locaux de dev). */
const EMAIL_REGEX =
  /^[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9.-]+\.[A-Za-z]{2,}|localhost|[A-Za-z0-9.-]+\.local)$/;

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 180) return false;
  if (trimmed.includes("'") || trimmed.includes(';') || trimmed.includes('--')) return false;
  return EMAIL_REGEX.test(trimmed);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
