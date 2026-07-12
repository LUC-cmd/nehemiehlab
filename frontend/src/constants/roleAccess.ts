import type { Role } from '../types';

/**
 * Matrice d'accès — défauts + catalogue pour le Directeur.
 * Le Directeur peut activer/désactiver les options par rôle (API /access).
 */

export const ROLE_LABELS: Record<Role, string> = {
  DIRECTEUR: 'Directeur',
  FORMATEUR: 'Formateur',
  COORDINATEUR: 'Coordinateur',
  RESPONSABLE_CLUSTER: 'Responsable cluster',
  COMPTABLE: 'Comptable',
  STAFF_NEHEMIAH: 'Staff Nehemiah',
  ANIMATEUR: 'Animateur CDEJ',
  PARENT: 'Parent',
  BENEVOLE: 'Bénévole CDEJ',
  PARTICIPANT: 'Participant CDEJ',
};

export const ROLES_CREABLES_PAR_DIRECTEUR: Role[] = [
  'DIRECTEUR',
  'RESPONSABLE_CLUSTER',
  'COORDINATEUR',
  'COMPTABLE',
  'STAFF_NEHEMIAH',
  'ANIMATEUR',
  'BENEVOLE',
  'PARTICIPANT',
];

/** Rôles configurables par le Directeur (pas Directeur ni Parent) */
export const CONFIGURABLE_ROLES: Role[] = [
  'FORMATEUR',
  'RESPONSABLE_CLUSTER',
  'COORDINATEUR',
  'COMPTABLE',
  'STAFF_NEHEMIAH',
  'ANIMATEUR',
  'BENEVOLE',
  'PARTICIPANT',
];

export type DashboardPage =
  | 'home'
  | 'centres'
  | 'mes-centres'
  | 'formateurs'
  | 'eleves'
  | 'sessions'
  | 'formations'
  | 'supports-cours'
  | 'journal-activite'
  | 'evaluation-formateur'
  | 'transactions'
  | 'rapports'
  | 'publications'
  | 'actualites'
  | 'galerie'
  | 'ressources'
  | 'communaute'
  | 'profils-enfants'
  | 'controle-gestion'
  | 'utilisateurs'
  | 'signalements'
  | 'profil'
  | 'permissions';

export type FeatureId = DashboardPage | 'edit_centre_location' | 'create_eleve' | 'manage_sessions' | 'validate_transactions' | 'manage_signalements';

export type FeatureKind = 'voir' | 'modifier';

export type FeatureDef = {
  id: FeatureId;
  label: string;
  kind: FeatureKind;
};

export const FEATURE_CATALOG: FeatureDef[] = [
  { id: 'home', label: "Vue d'ensemble", kind: 'voir' },
  { id: 'centres', label: 'Centres (tous)', kind: 'voir' },
  { id: 'mes-centres', label: 'Mes centres', kind: 'voir' },
  { id: 'formateurs', label: 'Formateurs', kind: 'voir' },
  { id: 'eleves', label: 'Élèves', kind: 'voir' },
  { id: 'sessions', label: 'Séances terrain (présences / clôture)', kind: 'voir' },
  { id: 'formations', label: 'Modules enseignés (journal pédagogique)', kind: 'voir' },
  { id: 'supports-cours', label: 'Supports de cours / modules SKA', kind: 'voir' },
  { id: 'journal-activite', label: "Journal d'activité", kind: 'voir' },
  { id: 'evaluation-formateur', label: 'Évaluation formateur (quiz / Scratch)', kind: 'voir' },
  { id: 'transactions', label: 'Transactions / paiements', kind: 'voir' },
  { id: 'rapports', label: 'Rapports', kind: 'voir' },
  { id: 'publications', label: 'Publications site', kind: 'voir' },
  { id: 'actualites', label: 'Nouveautés', kind: 'voir' },
  { id: 'galerie', label: 'Galerie site', kind: 'voir' },
  { id: 'ressources', label: 'Ressources', kind: 'voir' },
  { id: 'communaute', label: 'Communauté CDEJ', kind: 'voir' },
  { id: 'profils-enfants', label: 'Profils enfants', kind: 'voir' },
  { id: 'controle-gestion', label: 'Contrôle de gestion', kind: 'voir' },
  { id: 'utilisateurs', label: 'Utilisateurs', kind: 'voir' },
  { id: 'signalements', label: 'Signalements', kind: 'voir' },
  { id: 'permissions', label: 'Permissions dashboards', kind: 'voir' },
  { id: 'profil', label: 'Mon profil', kind: 'voir' },
  { id: 'edit_centre_location', label: 'Modifier localisation centre', kind: 'modifier' },
  { id: 'create_eleve', label: 'Inscrire un élève', kind: 'modifier' },
  { id: 'manage_sessions', label: 'Démarrer / clôturer sessions', kind: 'modifier' },
  { id: 'validate_transactions', label: 'Valider transactions', kind: 'modifier' },
  { id: 'manage_signalements', label: 'Gérer signalements', kind: 'modifier' },
];

/** Qui peut accéder à chaque page (rôle de base — le Directeur affine via features) */
export const PAGE_ROLES: Record<DashboardPage, Role[]> = {
  home: ['DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'COMPTABLE', 'STAFF_NEHEMIAH', 'ANIMATEUR', 'PARENT', 'BENEVOLE', 'PARTICIPANT'],
  centres: ['DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'COMPTABLE', 'STAFF_NEHEMIAH', 'ANIMATEUR', 'BENEVOLE', 'PARTICIPANT'],
  'mes-centres': ['DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'COMPTABLE', 'STAFF_NEHEMIAH', 'ANIMATEUR', 'BENEVOLE', 'PARTICIPANT'],
  formateurs: ['DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'COMPTABLE', 'STAFF_NEHEMIAH', 'ANIMATEUR', 'BENEVOLE', 'PARTICIPANT'],
  eleves: ['DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'COMPTABLE', 'STAFF_NEHEMIAH', 'ANIMATEUR', 'BENEVOLE', 'PARTICIPANT'],
  sessions: ['DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'COMPTABLE', 'STAFF_NEHEMIAH', 'ANIMATEUR', 'BENEVOLE', 'PARTICIPANT'],
  formations: ['DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'COMPTABLE', 'STAFF_NEHEMIAH', 'ANIMATEUR', 'BENEVOLE', 'PARTICIPANT'],
  'supports-cours': ['DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER'],
  'journal-activite': ['DIRECTEUR'],
  'evaluation-formateur': ['DIRECTEUR', 'FORMATEUR'],
  transactions: ['DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'COMPTABLE', 'STAFF_NEHEMIAH', 'ANIMATEUR', 'BENEVOLE', 'PARTICIPANT'],
  rapports: ['DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'COMPTABLE', 'STAFF_NEHEMIAH', 'ANIMATEUR', 'BENEVOLE', 'PARTICIPANT'],
  publications: ['DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'COMPTABLE', 'STAFF_NEHEMIAH', 'ANIMATEUR', 'BENEVOLE', 'PARTICIPANT'],
  actualites: ['DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'COMPTABLE', 'STAFF_NEHEMIAH', 'ANIMATEUR', 'BENEVOLE', 'PARTICIPANT'],
  galerie: ['DIRECTEUR'],
  ressources: ['DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'COMPTABLE', 'STAFF_NEHEMIAH', 'ANIMATEUR', 'BENEVOLE', 'PARTICIPANT'],
  communaute: ['DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'COMPTABLE', 'STAFF_NEHEMIAH', 'ANIMATEUR', 'BENEVOLE', 'PARTICIPANT'],
  'profils-enfants': ['DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'COMPTABLE', 'STAFF_NEHEMIAH', 'ANIMATEUR', 'BENEVOLE', 'PARTICIPANT'],
  'controle-gestion': ['DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'COMPTABLE', 'STAFF_NEHEMIAH', 'ANIMATEUR', 'BENEVOLE', 'PARTICIPANT'],
  utilisateurs: ['DIRECTEUR'],
  signalements: ['DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'COMPTABLE', 'STAFF_NEHEMIAH', 'ANIMATEUR', 'BENEVOLE', 'PARTICIPANT'],
  permissions: ['DIRECTEUR'],
  profil: ['DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'COMPTABLE', 'STAFF_NEHEMIAH', 'ANIMATEUR', 'PARENT', 'BENEVOLE', 'PARTICIPANT'],
};

export type NavItemDef = {
  page: DashboardPage;
  to: string;
  label: string;
  exact?: boolean;
};

/** Entrées de menu génériques (si le Directeur active une option absente du menu de base du rôle) */
export const NAV_FALLBACK: NavItemDef[] = [
  { page: 'home', to: '/dashboard', label: "Vue d'ensemble", exact: true },
  { page: 'centres', to: '/dashboard/centres', label: 'Centres' },
  { page: 'mes-centres', to: '/dashboard/mes-centres', label: 'Mes centres' },
  { page: 'formateurs', to: '/dashboard/formateurs', label: 'Formateurs' },
  { page: 'eleves', to: '/dashboard/eleves', label: 'Élèves' },
  { page: 'sessions', to: '/dashboard/sessions', label: 'Séances terrain' },
  { page: 'formations', to: '/dashboard/formations', label: 'Modules enseignés' },
  { page: 'supports-cours', to: '/dashboard/supports-cours', label: 'Supports de cours' },
  { page: 'journal-activite', to: '/dashboard/journal-activite', label: "Journal d'activité" },
  { page: 'evaluation-formateur', to: '/dashboard/evaluation-formateur', label: 'Évaluation formateur' },
  { page: 'transactions', to: '/dashboard/transactions', label: 'Transactions' },
  { page: 'rapports', to: '/dashboard/rapports', label: 'Rapports' },
  { page: 'publications', to: '/dashboard/publications', label: 'Publications site' },
  { page: 'actualites', to: '/dashboard/actualites', label: 'Nouveautés' },
  { page: 'galerie', to: '/dashboard/galerie', label: 'Galerie site' },
  { page: 'ressources', to: '/dashboard/ressources', label: 'Ressources' },
  { page: 'communaute', to: '/dashboard/communaute', label: 'Communauté CDEJ' },
  { page: 'profils-enfants', to: '/dashboard/profils-enfants', label: 'Profils enfants' },
  { page: 'controle-gestion', to: '/dashboard/controle-gestion', label: 'Contrôle de gestion' },
  { page: 'utilisateurs', to: '/dashboard/utilisateurs', label: 'Utilisateurs' },
  { page: 'signalements', to: '/dashboard/signalements', label: 'Signalements' },
  { page: 'permissions', to: '/dashboard/permissions', label: 'Permissions' },
];

export function buildNavForRole(role: Role, hasFeature: (f: FeatureId | string) => boolean): NavItemDef[] {
  const base = NAV_BY_ROLE[role] ?? [];
  const seen = new Set(base.map((i) => i.page));
  const extras = NAV_FALLBACK.filter((i) => !seen.has(i.page) && hasFeature(i.page));
  return [...base, ...extras].filter((i) => hasFeature(i.page));
}

export const NAV_BY_ROLE: Record<Role, NavItemDef[]> = {
  DIRECTEUR: [
    { page: 'home', to: '/dashboard', label: "Vue d'ensemble", exact: true },
    { page: 'centres', to: '/dashboard/centres', label: 'Centres' },
    { page: 'formateurs', to: '/dashboard/formateurs', label: 'Formateurs' },
    { page: 'eleves', to: '/dashboard/eleves', label: 'Élèves' },
    { page: 'sessions', to: '/dashboard/sessions', label: 'Séances terrain' },
    { page: 'formations', to: '/dashboard/formations', label: 'Modules enseignés' },
    { page: 'supports-cours', to: '/dashboard/supports-cours', label: 'Supports de cours' },
    { page: 'journal-activite', to: '/dashboard/journal-activite', label: "Journal d'activité" },
    { page: 'evaluation-formateur', to: '/dashboard/evaluation-formateur', label: 'Évaluation formateur' },
    { page: 'transactions', to: '/dashboard/transactions', label: 'Transactions' },
    { page: 'rapports', to: '/dashboard/rapports', label: 'Rapports' },
    { page: 'publications', to: '/dashboard/publications', label: 'Publications site' },
    { page: 'actualites', to: '/dashboard/actualites', label: 'Nouveautés' },
    { page: 'galerie', to: '/dashboard/galerie', label: 'Galerie site' },
    { page: 'ressources', to: '/dashboard/ressources', label: 'Ressources' },
    { page: 'communaute', to: '/dashboard/communaute', label: 'Communauté CDEJ' },
    { page: 'profils-enfants', to: '/dashboard/profils-enfants', label: 'Profils enfants' },
    { page: 'controle-gestion', to: '/dashboard/controle-gestion', label: 'Contrôle de gestion' },
    { page: 'utilisateurs', to: '/dashboard/utilisateurs', label: 'Utilisateurs' },
    { page: 'permissions', to: '/dashboard/permissions', label: 'Permissions' },
  ],
  FORMATEUR: [
    { page: 'home', to: '/dashboard', label: "Vue d'ensemble", exact: true },
    { page: 'mes-centres', to: '/dashboard/mes-centres', label: 'Mes Centres' },
    { page: 'eleves', to: '/dashboard/eleves', label: 'Mes Élèves' },
    { page: 'sessions', to: '/dashboard/sessions', label: 'Séances terrain' },
    { page: 'formations', to: '/dashboard/formations', label: 'Modules enseignés' },
    { page: 'supports-cours', to: '/dashboard/supports-cours', label: 'Supports de cours' },
    { page: 'evaluation-formateur', to: '/dashboard/evaluation-formateur', label: 'Évaluation formateur' },
    { page: 'ressources', to: '/dashboard/ressources', label: 'Ressources' },
    { page: 'communaute', to: '/dashboard/communaute', label: 'Communauté CDEJ' },
    { page: 'profils-enfants', to: '/dashboard/profils-enfants', label: 'Profils enfants' },
    { page: 'transactions', to: '/dashboard/transactions', label: 'Mes Paiements' },
    { page: 'rapports', to: '/dashboard/rapports', label: 'Mes Rapports' },
  ],
  COORDINATEUR: [
    { page: 'home', to: '/dashboard', label: "Vue d'ensemble", exact: true },
    { page: 'mes-centres', to: '/dashboard/mes-centres', label: 'Mon centre' },
    { page: 'eleves', to: '/dashboard/eleves', label: 'Élèves du centre' },
    { page: 'sessions', to: '/dashboard/sessions', label: 'Séances terrain' },
    { page: 'formations', to: '/dashboard/formations', label: 'Modules enseignés' },
    { page: 'supports-cours', to: '/dashboard/supports-cours', label: 'Supports de cours' },
    { page: 'ressources', to: '/dashboard/ressources', label: 'Ressources' },
    { page: 'communaute', to: '/dashboard/communaute', label: 'Communauté CDEJ' },
    { page: 'profils-enfants', to: '/dashboard/profils-enfants', label: 'Profils enfants' },
    { page: 'rapports', to: '/dashboard/rapports', label: 'Rapports' },
    { page: 'signalements', to: '/dashboard/signalements', label: 'Signalements' },
  ],
  RESPONSABLE_CLUSTER: [
    { page: 'home', to: '/dashboard', label: "Vue d'ensemble", exact: true },
    { page: 'mes-centres', to: '/dashboard/mes-centres', label: 'Centres du cluster' },
    { page: 'eleves', to: '/dashboard/eleves', label: 'Élèves du cluster' },
    { page: 'sessions', to: '/dashboard/sessions', label: 'Séances terrain' },
    { page: 'formations', to: '/dashboard/formations', label: 'Modules enseignés' },
    { page: 'supports-cours', to: '/dashboard/supports-cours', label: 'Supports de cours' },
    { page: 'ressources', to: '/dashboard/ressources', label: 'Ressources' },
    { page: 'communaute', to: '/dashboard/communaute', label: 'Communauté CDEJ' },
    { page: 'profils-enfants', to: '/dashboard/profils-enfants', label: 'Profils enfants' },
    { page: 'rapports', to: '/dashboard/rapports', label: 'Rapports' },
    { page: 'signalements', to: '/dashboard/signalements', label: 'Signalements' },
  ],
  COMPTABLE: [
    { page: 'home', to: '/dashboard', label: "Vue d'ensemble", exact: true },
    { page: 'transactions', to: '/dashboard/transactions', label: 'Transactions' },
    { page: 'rapports', to: '/dashboard/rapports', label: 'Rapports' },
    { page: 'communaute', to: '/dashboard/communaute', label: 'Communauté CDEJ' },
    { page: 'controle-gestion', to: '/dashboard/controle-gestion', label: 'Contrôle de gestion' },
  ],
  STAFF_NEHEMIAH: [
    { page: 'home', to: '/dashboard', label: "Vue d'ensemble", exact: true },
    { page: 'ressources', to: '/dashboard/ressources', label: 'Ressources' },
    { page: 'communaute', to: '/dashboard/communaute', label: 'Communauté CDEJ' },
  ],
  ANIMATEUR: [
    { page: 'home', to: '/dashboard', label: "Vue d'ensemble", exact: true },
    { page: 'ressources', to: '/dashboard/ressources', label: 'Ressources' },
    { page: 'communaute', to: '/dashboard/communaute', label: 'Communauté CDEJ' },
  ],
  PARENT: [
    { page: 'home', to: '/dashboard', label: 'Suivi de mon enfant', exact: true },
  ],
  BENEVOLE: [
    { page: 'home', to: '/dashboard', label: "Vue d'ensemble", exact: true },
    { page: 'communaute', to: '/dashboard/communaute', label: 'Communauté CDEJ' },
  ],
  PARTICIPANT: [
    { page: 'home', to: '/dashboard', label: "Vue d'ensemble", exact: true },
    { page: 'communaute', to: '/dashboard/communaute', label: 'Communauté CDEJ' },
  ],
};

/** Défauts features par rôle (alignés backend) */
export const DEFAULT_FEATURES_BY_ROLE: Record<Role, FeatureId[]> = {
  DIRECTEUR: [
    'home', 'centres', 'formateurs', 'eleves', 'sessions', 'formations', 'supports-cours', 'journal-activite', 'evaluation-formateur', 'transactions', 'rapports',
    'publications', 'actualites', 'galerie', 'ressources', 'communaute', 'profils-enfants', 'controle-gestion',
    'utilisateurs', 'permissions', 'profil',
    'edit_centre_location', 'create_eleve', 'manage_sessions', 'manage_signalements',
  ],
  FORMATEUR: [
    'home', 'mes-centres', 'eleves', 'sessions', 'formations', 'supports-cours', 'evaluation-formateur', 'ressources', 'communaute',
    'profils-enfants', 'transactions', 'rapports', 'profil',
    'edit_centre_location', 'create_eleve', 'manage_sessions', 'validate_transactions',
  ],
  COORDINATEUR: [
    'home', 'mes-centres', 'eleves', 'formations', 'supports-cours', 'ressources', 'communaute', 'profils-enfants',
    'signalements', 'rapports', 'profil', 'edit_centre_location', 'create_eleve', 'manage_signalements',
  ],
  RESPONSABLE_CLUSTER: [
    'home', 'mes-centres', 'eleves', 'sessions', 'formations', 'supports-cours', 'ressources', 'communaute', 'profils-enfants',
    'signalements', 'rapports', 'profil', 'edit_centre_location', 'create_eleve', 'manage_signalements',
  ],
  COMPTABLE: [
    'home', 'transactions', 'rapports', 'communaute', 'controle-gestion', 'profil', 'validate_transactions',
  ],
  STAFF_NEHEMIAH: ['home', 'ressources', 'communaute', 'profil'],
  ANIMATEUR: ['home', 'ressources', 'communaute', 'profil'],
  PARENT: ['home', 'profil'],
  BENEVOLE: ['home', 'communaute', 'profil'],
  PARTICIPANT: ['home', 'communaute', 'profil'],
};

export const LOCKED_FEATURES: Record<Role, FeatureId[]> = {
  DIRECTEUR: ['home', 'utilisateurs', 'permissions', 'profil'],
  FORMATEUR: ['home', 'profil'],
  COORDINATEUR: ['home', 'profil'],
  RESPONSABLE_CLUSTER: ['home', 'profil'],
  COMPTABLE: ['home', 'profil'],
  STAFF_NEHEMIAH: ['home', 'profil'],
  ANIMATEUR: ['home', 'profil'],
  PARENT: ['home', 'profil'],
  BENEVOLE: ['home', 'profil'],
  PARTICIPANT: ['home', 'profil'],
};

export function canAccessPage(role: Role | null | undefined, page: DashboardPage): boolean {
  if (!role) return false;
  return PAGE_ROLES[page]?.includes(role) ?? false;
}

export function defaultHasFeature(role: Role, feature: FeatureId): boolean {
  return DEFAULT_FEATURES_BY_ROLE[role]?.includes(feature) ?? false;
}

export const ROLE_ACCESS_SUMMARY: Record<Role, string> = {
  DIRECTEUR: 'Accès complet en consultation + permissions. Transactions : tout voir et imprimer, sans saisir ni modifier.',
  FORMATEUR: 'Un ou plusieurs centres assignés : élèves, séances, modules, supports de cours, ressources, communauté, profils enfants, paiements et rapports.',
  COORDINATEUR: 'Son centre uniquement : élèves, modules, supports de cours, ressources, communauté, profils enfants, signalements, rapports.',
  RESPONSABLE_CLUSTER: 'Tous les centres de son cluster : élèves, séances, modules, supports de cours, signalements, rapports, localisation.',
  COMPTABLE: 'Saisie des transactions hors app, justificatifs, rapports financiers, contrôle de gestion.',
  STAFF_NEHEMIAH: 'Ressources internes et communauté CDEJ.',
  ANIMATEUR: 'Ressources internes et communauté CDEJ.',
  PARENT: 'Uniquement le suivi de son enfant. Connexion par matricule.',
  BENEVOLE: 'Communauté CDEJ uniquement.',
  PARTICIPANT: 'Communauté CDEJ uniquement.',
};

/** Mappe une route dashboard vers la feature */
export function pageFromPath(pathname: string): DashboardPage | null {
  if (pathname === '/dashboard' || pathname === '/dashboard/') return 'home';
  const map: Record<string, DashboardPage> = {
    '/dashboard/centres': 'centres',
    '/dashboard/mes-centres': 'mes-centres',
    '/dashboard/formateurs': 'formateurs',
    '/dashboard/eleves': 'eleves',
    '/dashboard/sessions': 'sessions',
    '/dashboard/formations': 'formations',
    '/dashboard/supports-cours': 'supports-cours',
    '/dashboard/journal-activite': 'journal-activite',
    '/dashboard/evaluation-formateur': 'evaluation-formateur',
    '/dashboard/transactions': 'transactions',
    '/dashboard/rapports': 'rapports',
    '/dashboard/publications': 'publications',
    '/dashboard/actualites': 'actualites',
    '/dashboard/galerie': 'galerie',
    '/dashboard/ressources': 'ressources',
    '/dashboard/communaute': 'communaute',
    '/dashboard/profils-enfants': 'profils-enfants',
    '/dashboard/controle-gestion': 'controle-gestion',
    '/dashboard/utilisateurs': 'utilisateurs',
    '/dashboard/signalements': 'signalements',
    '/dashboard/permissions': 'permissions',
    '/dashboard/profil': 'profil',
  };
  return map[pathname] || null;
}
