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
