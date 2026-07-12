export type ExperienceLevel = 'NOVICE' | 'CONFIRME' | 'SENIOR' | 'EXPERT';

export type ExperienceInfo = {
  level: ExperienceLevel;
  label: string;
  badgeClass: string;
  score: number;
};

/** Score = heures terrain + modules enseignés × 5 */
export function computeFormateurExperience(
  heures: number | undefined | null,
  modulesCount = 0,
): ExperienceInfo {
  const h = Math.max(0, heures ?? 0);
  const score = Math.round(h + modulesCount * 5);

  if (score >= 500) {
    return {
      level: 'EXPERT',
      label: 'Expert',
      badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
      score,
    };
  }
  if (score >= 200) {
    return {
      level: 'SENIOR',
      label: 'Senior',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      score,
    };
  }
  if (score >= 50) {
    return {
      level: 'CONFIRME',
      label: 'Confirmé',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      score,
    };
  }
  return {
    level: 'NOVICE',
    label: 'Novice',
    badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    score,
  };
}
