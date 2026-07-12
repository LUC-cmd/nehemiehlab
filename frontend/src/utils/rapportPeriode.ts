/** Raccourcis de période pour le rapport formateur (comme exécution d'un module). */

export type PeriodePresetId =
  | 'module_6m'
  | 'trimestre_1'
  | 'trimestre_2'
  | 'trimestre_3'
  | 'annee_scolaire'
  | 'annee_calendaire';

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function computePeriodePreset(id: PeriodePresetId, ref = new Date()): { debut: string; fin: string; label: string } {
  const y = ref.getFullYear();
  const m = ref.getMonth();

  switch (id) {
    case 'module_6m': {
      const fin = new Date(ref);
      const debut = new Date(ref);
      debut.setMonth(debut.getMonth() - 6);
      return { debut: fmt(debut), fin: fmt(fin), label: '6 derniers mois (module type)' };
    }
    case 'trimestre_1':
      return { debut: `${y}-01-01`, fin: `${y}-03-31`, label: 'Trimestre 1 (janv.–mars)' };
    case 'trimestre_2':
      return { debut: `${y}-04-01`, fin: `${y}-06-30`, label: 'Trimestre 2 (avr.–juin)' };
    case 'trimestre_3':
      return { debut: `${y}-09-01`, fin: `${y}-12-31`, label: 'Trimestre 3 (sept.–déc.)' };
    case 'annee_scolaire': {
      const startYear = m >= 8 ? y : y - 1;
      return {
        debut: `${startYear}-09-01`,
        fin: `${startYear + 1}-07-31`,
        label: `Année scolaire ${startYear}–${startYear + 1}`,
      };
    }
    case 'annee_calendaire':
    default:
      return { debut: `${y}-01-01`, fin: `${y}-12-31`, label: `Année calendaire ${y}` };
  }
}

export const PERIODE_PRESETS: { id: PeriodePresetId; short: string }[] = [
  { id: 'module_6m', short: 'Module (~6 mois)' },
  { id: 'trimestre_1', short: 'T1' },
  { id: 'trimestre_2', short: 'T2' },
  { id: 'trimestre_3', short: 'T3' },
  { id: 'annee_scolaire', short: 'Année scolaire' },
  { id: 'annee_calendaire', short: 'Année civile' },
];
