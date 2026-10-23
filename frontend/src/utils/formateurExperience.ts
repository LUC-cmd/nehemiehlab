import { ancienneteDate } from './anciennete';

export type ExperienceLevel = 'NOUVEAU' | 'JUNIOR' | 'SENIOR';

export type ExperienceInfo = {
  level: ExperienceLevel;
  label: string;
  badgeClass: string;
  /** Années complètes depuis l'entrée (0 tant qu'il n'a pas formé). */
  annees: number;
  /** Plus grand = plus ancien ; sert à classer la liste. */
  rang: number;
};

/** Années complètes écoulées depuis une date (0 si inconnue ou future). */
function anneesCompletes(dateStr?: string): number {
  if (!dateStr) return 0;
  const start = new Date(dateStr);
  if (Number.isNaN(start.getTime())) return 0;
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  if (now.getMonth() < start.getMonth()
    || (now.getMonth() === start.getMonth() && now.getDate() < start.getDate())) {
    years -= 1;
  }
  return Math.max(0, years);
}

const SENIOR_CLASSES = [
  'bg-amber-500/15 text-amber-500 border-amber-500/30',
  'bg-orange-500/15 text-orange-500 border-orange-500/30',
  'bg-rose-500/15 text-rose-500 border-rose-500/30',
  'bg-violet-500/15 text-violet-500 border-violet-500/30',
];

/**
 * Badge d'ancienneté, basé sur la date d'entrée (pas sur les heures) :
 * un formateur arrivé plus tard ne peut jamais dépasser un plus ancien.
 * - Senior : a formé et compte au moins 1 an (le nombre d'années s'affiche et grandit chaque année).
 * - Junior : a déjà formé, moins d'1 an.
 * - Nouveau : n'a pas encore formé.
 */
export function computeFormateurExperience(
  formateur: { dateEntree?: string; createdAt?: string; totalHeuresSeances?: number | null },
): ExperienceInfo {
  const debut = ancienneteDate(formateur);
  const aForme = (formateur.totalHeuresSeances ?? 0) > 0;
  const annees = aForme ? anneesCompletes(debut) : 0;
  const debutMs = debut ? new Date(debut).getTime() : NaN;
  // Ancienneté en jours : à niveau égal, le plus ancien reste devant.
  const jours = Number.isNaN(debutMs) ? 0 : Math.max(0, Math.floor((Date.now() - debutMs) / 86400000));

  if (!aForme) {
    return {
      level: 'NOUVEAU',
      label: 'Nouveau',
      badgeClass: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
      annees: 0,
      rang: jours,
    };
  }
  if (annees < 1) {
    return {
      level: 'JUNIOR',
      label: 'Junior',
      badgeClass: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
      annees: 0,
      rang: 1_000_000 + jours,
    };
  }
  return {
    level: 'SENIOR',
    label: `Senior ${'★'.repeat(Math.min(annees, 5))} ${annees} an${annees > 1 ? 's' : ''}`,
    badgeClass: SENIOR_CLASSES[Math.min(annees, SENIOR_CLASSES.length) - 1],
    annees,
    rang: 2_000_000 + jours,
  };
}
