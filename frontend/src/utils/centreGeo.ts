import type { Centre, Role } from '../types';

export function hasCentreGps(centre: Centre): boolean {
  return (
    typeof centre.latitude === 'number' &&
    typeof centre.longitude === 'number' &&
    Number.isFinite(centre.latitude) &&
    Number.isFinite(centre.longitude)
  );
}

export function canEditCentreLocation(
  centre: Centre,
  opts: { role: Role | null; userId?: number; assignedCluster?: string; hasFeature: boolean },
): boolean {
  if (!opts.hasFeature || !opts.role || !opts.userId) return false;
  if (opts.role === 'DIRECTEUR') return true;
  if (opts.role === 'COORDINATEUR' && centre.coordinateur?.id === opts.userId) return true;
  if (opts.role === 'RESPONSABLE_CLUSTER' && centre.cluster && centre.cluster === opts.assignedCluster) return true;
  if (opts.role === 'FORMATEUR' && centre.formateurs?.some((f) => f.id === opts.userId)) {
    return true;
  }
  return false;
}

export function centresGeoSummary(centres: Centre[]) {
  const withGps = centres.filter(hasCentreGps).length;
  const regionList = [...new Set(centres.map((c) => c.region).filter(Boolean) as string[])].sort();
  const clusterList = [...new Set(centres.map((c) => c.cluster).filter(Boolean) as string[])].sort();
  return {
    total: centres.length,
    withGps,
    withoutGps: centres.length - withGps,
    regions: regionList.length,
    clusters: clusterList.length,
    regionList,
    clusterList,
  };
}

/** Coordinateur / Formateur : GPS sur place. Directeur : peut aussi coller un lien Maps. */
export function requiresOnSiteGpsCapture(role: Role | null): boolean {
  return role === 'COORDINATEUR' || role === 'FORMATEUR';
}

export function locationSetButtonLabel(role: Role | null, hasGps: boolean): string {
  if (role === 'DIRECTEUR') {
    return hasGps ? 'Mettre à jour la localisation' : 'Définir la localisation du centre';
  }
  return hasGps ? 'Mettre à jour (sur place)' : 'Je suis au centre — partager la position';
}

