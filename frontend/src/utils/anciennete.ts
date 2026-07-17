/**
 * Ancienneté d'un compte : basée sur la date d'entrée (dateEntree) si le
 * Directeur l'a renseignée, sinon sur la date de création du compte (createdAt).
 */
export function ancienneteDate(user: { dateEntree?: string; createdAt?: string }): string | undefined {
  return user.dateEntree || user.createdAt;
}

/** Formatte une ancienneté lisible (ex: "2 ans 3 mois", "5 mois", "Aujourd'hui"). */
export function formatAnciennete(dateStr?: string): string {
  if (!dateStr) return 'Non renseignée';
  const start = new Date(dateStr);
  if (Number.isNaN(start.getTime())) return 'Non renseignée';

  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return 'Non renseignée';

  if (years === 0 && months === 0) {
    const days = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000));
    if (days <= 1) return "Aujourd'hui";
    return `${days} jour${days > 1 ? 's' : ''}`;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} an${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} mois`);
  return parts.join(' ');
}
