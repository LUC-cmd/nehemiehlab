/** Cibles d'alerte pour diffusion / relais par le Directeur */
export type AlertPresetId = 'FORMATEUR' | 'COMPTABLE' | 'FORMATEUR_COMPTABLE' | 'TOUS';

export const ALERT_PRESETS: Record<AlertPresetId, { label: string; subtitle: string; roles: string[] }> = {
  FORMATEUR: {
    label: 'Formateurs',
    subtitle: 'Formateurs du centre concerné',
    roles: ['FORMATEUR'],
  },
  COMPTABLE: {
    label: 'Comptable',
    subtitle: 'Tous les comptables actifs',
    roles: ['COMPTABLE'],
  },
  FORMATEUR_COMPTABLE: {
    label: 'Formateurs + Comptable',
    subtitle: 'Terrain et comptabilité',
    roles: ['FORMATEUR', 'COMPTABLE'],
  },
  TOUS: {
    label: 'Tout le système',
    subtitle: 'Tous les comptes actifs de la plateforme',
    roles: ['TOUS'],
  },
};
