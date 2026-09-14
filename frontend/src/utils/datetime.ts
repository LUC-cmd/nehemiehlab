/** Valeur pour input datetime-local (fuseau local). */
export function nowForDatetimeLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return nowForDatetimeLocal();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return nowForDatetimeLocal();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function datetimeLocalToIso(local: string): string {
  if (!local) return new Date().toISOString();
  return new Date(local).toISOString();
}

export function formatSessionDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatSessionTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Duree reelle d'une seance clôturee, calculee directement comme
 * heure de fin moins heure de debut (demande explicite : ne pas se fier
 * seulement au champ dureeReelleMinutes stocke en base, qui peut manquer ou
 * etre incorrect sur d'anciennes seances). Retombe sur dureeReelleMinutes
 * si les horaires ne sont pas exploitables, et sur 0 en dernier recours.
 */
export function computeSessionDureeMinutes(session: {
  statut: string;
  heureDebut: string;
  heureFin?: string | null;
  dureeReelleMinutes?: number | null;
}): number {
  if (session.statut === 'CLOTUREE' && session.heureFin) {
    const debut = new Date(session.heureDebut).getTime();
    const fin = new Date(session.heureFin).getTime();
    if (Number.isFinite(debut) && Number.isFinite(fin) && fin > debut) {
      return Math.round((fin - debut) / 60000);
    }
  }
  return session.dureeReelleMinutes ?? 0;
}
