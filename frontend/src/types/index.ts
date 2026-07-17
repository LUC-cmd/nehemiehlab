// ============================================================
//  Types globaux de la plateforme Nehemiah Lab
// ============================================================

// --- Rôles ---
export type Role =
  | 'DIRECTEUR'
  | 'FORMATEUR'
  | 'COORDINATEUR'
  | 'RESPONSABLE_CLUSTER'
  | 'COMPTABLE'
  | 'STAFF_NEHEMIAH'
  | 'ANIMATEUR'
  | 'PARENT'
  | 'BENEVOLE'
  | 'PARTICIPANT';

// --- Utilisateur ---
export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  telephone?: string;
  telephoneSecondaire?: string;
  numeroCompteBancaire?: string;
  numeroMobileMoney?: string;
  operateurMobileMoney?: 'MIXX_BY_YAS' | 'MOOV_MONEY' | '';
  banqueNom?: string;
  rib?: string;
  codeAgence?: string;
  intituleCompte?: string;
  avatar?: string;
  carteIdentiteRecto?: string;
  carteIdentiteVerso?: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  adresse?: string;
  eleveId?: number;
  assignedCluster?: string;
  actif: boolean;
  totalHeuresSeances?: number;
  centres?: Centre[];
  createdAt: string;
}

// --- Centre ---
export interface Centre {
  id: number;
  nom: string;
  adresse: string;
  ville: string;
  region?: string;
  cluster?: string;
  latitude?: number;
  longitude?: number;
  telephoneResponsable?: string;
  coordinateurNom?: string;
  coordinateurPrenom?: string;
  telephoneCoordinateur?: string;
  telephoneFormateur?: string;
  codeCdej?: string;
  lieuFormation?: string;
  coordinateur?: User;
  formateurs: User[];
  nombreEleves: number;
  createdAt: string;
}

// --- Cluster ---
export interface Cluster {
  id: number;
  nom: string;
  createdAt?: string;
}

// --- Élève ---
export interface Eleve {
  id: number;
  nom: string;
  prenom: string;
  matricule?: string;
  dateNaissance?: string;
  age: number;
  sexe: 'M' | 'F';
  classe: string;
  centre: Centre;
  formateur?: User;
  dateDebutFormation: string;
  dateFinFormation?: string;
  totalHeures: number;
  raisonSelection?: string;
  projet?: Projet;
  commentaires?: Commentaire[];
  signalements?: Signalement[];
  presences?: Presence[];
  performanceMoyenne?: number;
  createdAt: string;
}

// --- Session de Cours ---
export interface SessionCours {
  id: number;
  titre: string;
  centre: Centre;
  formateur: User;
  heureDebut: string;
  heureFin?: string;
  dureePrevueMinutes: number;
  statut: 'EN_COURS' | 'CLOTUREE';
  dureeReelleMinutes?: number;
  latitudeDebut?: number;
  longitudeDebut?: number;
  precisionDebutMetres?: number;
  latitudeFin?: number;
  longitudeFin?: number;
  precisionFinMetres?: number;
  rapportUrl?: string;
  moduleFait?: string;
  moduleCoursId?: number;
  etatEquipements?: string;
  defisSession?: string;
  nbPresents?: number;
  nbTotalEleves?: number;
  createdAt: string;
}

// --- Evaluation Session ---
export interface EvaluationSession {
  id: number;
  sessionCours: SessionCours;
  eleve: Eleve;
  present: boolean;
  /** Note de participation sur 10 */
  note?: number;
  commentaire?: string;
  projetTravaille?: string;
  /** true = projet de fin (rapport annuel), false = pratique */
  projetFinal?: boolean;
  projetProbleme?: string;
  projetSolution?: string;
  /** Arrivée réelle (retard possible) */
  heureArrivee?: string;
  heureDepart?: string;
  /** Minutes réellement effectuées */
  dureeMinutes?: number;
}

// --- Projet élève ---
export interface Projet {
  id: number;
  nom: string;
  description: string;
  evolution: number; // 0-100 %
  causeNonAvancement?: string;
  justificationPedagogique?: string;
  pointsForts?: string;
  recommandations?: string;
  probleme?: string;
  solution?: string;
  niveauMaitrise?: string;
  observationsRapport?: string;
  updatedAt: string;
}

// --- Présence ---
export interface Presence {
  id: number;
  eleveId: number;
  date: string;
  heureDebut?: string;
  heureFin?: string;
  dureeMinutes?: number;
  sessionActive: boolean;
}

// --- Commentaire ---
export interface Commentaire {
  id: number;
  eleveId: number;
  auteur: User;
  contenu: string;
  createdAt: string;
}

// --- Signalement ---
export interface Signalement {
  id: number;
  eleveId?: number;
  centreId?: number;
  centreNom?: string;
  cibleType: 'ENFANT' | 'CENTRE';
  eleveNom?: string;
  elevePrenom?: string;
  auteur: User;
  description: string;
  inclureDansRapport: boolean;
  priorite: 'NORMALE' | 'URGENTE';
  etatEquipements?: string;
  defis?: string;
  statut: 'EN_ATTENTE' | 'TRAITE';
  createdAt: string;
}

// --- Module de formation (journal) ---
export interface ModuleFormation {
  id: number;
  date: string;
  centreId: number;
  formateurId: number;
  formateurNom?: string;
  formateurPrenom?: string;
  moduleCoursId?: number;
  titre: string;
  description: string;
  dureeHeures: number;
  elevesPresents: number[];
}

export interface FormateurEvaluation {
  id: number;
  formateurId: number;
  formateurNom?: string;
  formateurPrenom?: string;
  moduleCoursId: number;
  moduleTitre?: string;
  quizScore: number;
  quizTotal: number;
  quizReponses?: string;
  scratchUrl?: string;
  scratchNom?: string;
  analyse?: string;
  createdAt?: string;
}

export interface ChildSessionRow {
  sessionId: number;
  titre: string;
  module?: string;
  centre?: string;
  date: string;
  statut?: string;
  present: boolean;
  note?: number | null;
  commentaire?: string;
  projetTravaille?: string;
  projetFinal?: boolean;
  projetProbleme?: string;
  projetSolution?: string;
  heureArrivee?: string;
  dureeMinutes?: number | null;
}

export interface RapportSyntheseCentre {
  id?: number;
  centreId: number;
  moduleLabel: string;
  annee?: number;
  dateDebut?: string;
  dateFin?: string;
  effectifDebutFilles?: number;
  effectifDebutGarcons?: number;
  effectifFinalFilles?: number;
  effectifFinalGarcons?: number;
  projetsLibresP1?: number;
  projetsLibresP2?: number;
  projetsNonAcheves?: number;
  projetsGroupe?: number;
  projetsContextuels?: number;
  projetsPresentes?: number;
  syntheseTable?: string;
  aime?: string;
  pasAime?: string;
  vision?: string;
  empty?: boolean;
}

export const NIVEAUX_MAITRISE = ['Médiocre', 'Passable', 'Assez-bien', 'Bien', 'Très-bien'] as const;

export interface ApercuRapportFormateur {
  periodeDebut: string;
  periodeFin: string;
  periodeLabel: string;
  seancesTerrain: number;
  elevesInscrits: number;
  elevesActifs: number;
  totalPresences: number;
}

export interface RapportExecutionSeanceItem {
  id: number;
  date: string;
  heureDebut?: string;
  creneau: string;
  centreId?: number;
  centreNom?: string;
  codeCdej?: string;
  lieuFormation?: string;
  region?: string;
  cluster?: string;
  formateurId?: number;
  formateurNom?: string;
  moduleFait?: string;
  presents: number;
  totalEleves: number;
  defisSession?: string;
  etatEquipements?: string;
  statut: string;
}

export interface RapportExecutionSeancesResponse {
  total: number;
  presentsTotal: number;
  periodeDebut: string;
  periodeFin: string;
  sessions: RapportExecutionSeanceItem[];
}

export const DEFAULT_SYNTHESE_ROWS = [
  { categorie: 'Cadre', defis: '', lecons: '', propsTrainer: '', propsEnfants: '', propsCdej: '', propsNehemiah: '' },
  { categorie: 'Modules', defis: '', lecons: '', propsTrainer: '', propsEnfants: '', propsCdej: '', propsNehemiah: '' },
  { categorie: 'Enfants', defis: '', lecons: '', propsTrainer: '', propsEnfants: '', propsCdej: '', propsNehemiah: '' },
  { categorie: 'CDEJ', defis: '', lecons: '', propsTrainer: '', propsEnfants: '', propsCdej: '', propsNehemiah: '' },
  { categorie: 'Nehemiah Lab', defis: '', lecons: '', propsTrainer: '', propsEnfants: '', propsCdej: '', propsNehemiah: '' },
  { categorie: 'SKA Trainer', defis: '', lecons: '', propsTrainer: '', propsEnfants: '', propsCdej: '', propsNehemiah: '' },
];

// --- Transaction ---
export interface Transaction {
  id: number;
  formateur: User;
  montant: number;
  type: 'DEPLACEMENT' | 'HONORAIRES' | 'FRAIS_PEDAGOGIQUES' | 'MATERIEL' | 'AUTRE';
  description: string;
  justificatifUrl?: string;
  justificatifNom?: string;
  justificatifType?: string;
  statut: 'EN_ATTENTE' | 'VALIDEE' | 'REFUSEE';
  createdAt: string;
  validatedAt?: string;
}

// --- Notification ---
export interface Notification {
  id: number;
  titre: string;
  message: string;
  type: 'SIGNALEMENT' | 'TRANSACTION' | 'INFO';
  lu: boolean;
  createdAt: string;
  lienId?: number;
}

// --- Auth ---
export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  motDePasse: string;
}

// --- Stats Dashboard ---
export interface DashboardStats {
  totalCentres?: number;
  totalFormateurs?: number;
  totalEleves?: number;
  totalHeuresFormation?: number;
  transactionsEnAttente?: number;
  montantTotalTransactions?: number;
  signalementsNonTraites?: number;
}

// --- Pagination ---
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// --- Formulaires ---
export interface CreateCentreForm {
  nom: string;
  adresse: string;
  ville: string;
  region?: string;
  coordinateurId?: number;
}

export interface CreateEleveForm {
  nom: string;
  prenom: string;
  age: number;
  sexe: 'M' | 'F';
  classe: string;
  centreId: number;
  dateDebutFormation: string;
}

export interface CreateTransactionForm {
  formateurId: number;
  montant: number;
  type: Transaction['type'];
  description: string;
}

export interface PreEnregistrementFormateur {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
}

// --- Publications (pubs site public) ---
export type PublicationType = 'IMAGE' | 'VIDEO' | 'TEXTE';

export interface Publication {
  id: number;
  titre: string;
  description?: string;
  type: PublicationType;
  mediaUrl?: string;
  lienExterne?: string;
  contenu?: string;
  actif: boolean;
  ordre: number;
  createdAt: string;
  updatedAt?: string;
}

// --- Actualités / Nouveautés ---
export type ActualiteStatut = 'EN_COURS' | 'A_VENIR' | 'TERMINE';

export interface Actualite {
  id: number;
  titre: string;
  resume?: string;
  contenu?: string;
  imageUrl?: string;
  statut: ActualiteStatut;
  dateDebut?: string;
  dateFin?: string;
  actif: boolean;
  createdAt: string;
}

export interface GaleriePhoto {
  id: number;
  legende: string;
  imageUrl?: string;
  ordre: number;
  actif: boolean;
  createdAt: string;
}

// --- Contenus publics dynamiques ---
export type ResourceCategory = 'PROTECTION_ENFANCE' | 'SOFT_SKILLS' | 'PROJETS_REALISES';

export interface RessourceFichier {
  id?: number;
  url: string;
  nom: string;
  mimeType?: string;
  ordre?: number;
}

export interface RessourceItem {
  id: number;
  titre: string;
  description: string;
  categorie: ResourceCategory;
  lien?: string;
  /** @deprecated préférer `fichiers` */
  fichierUrl?: string;
  /** @deprecated préférer `fichiers` */
  fichierNom?: string;
  fichiers?: RessourceFichier[];
  actif: boolean;
  createdAt: string;
  updatedAt?: string;
}

/** Module pédagogique SKA — saisi par le Directeur */
export interface SupportCoursFichier {
  id?: number;
  url: string;
  nom: string;
  mimeType?: string;
  ordre?: number;
}

export interface ModuleCours {
  id: number;
  numeroOrdre: number;
  titre: string;
  description?: string;
  objectifs?: string;
  dureeRecommandeeHeures?: number;
  niveau?: string;
  actif: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SerieSupportCours {
  id: number;
  titre: string;
  description?: string;
  ordre: number;
  actif: boolean;
  fichiers: SupportCoursFichier[];
  moduleIds: number[];
  modules?: Array<{
    id: number;
    numeroOrdre: number;
    titre: string;
    actif: boolean;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export type CommunityProfileType = 'SKA_TEACHER' | 'AUTRE_PARTICIPANT';

export interface CommunityProfile {
  id: number;
  userId?: number;
  nomComplet: string;
  type: CommunityProfileType;
  roleAffiche?: string;
  bio?: string;
  photoUrl?: string;
  enfantsAccompagnes?: number;
  competences?: string;
  contacts?: string;
  actif: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type ProjectMediaType = 'IMAGE' | 'VIDEO' | 'SCRATCH' | 'LIEN';

export interface EnfantProject {
  id: number;
  titre: string;
  description?: string;
  mediaType: ProjectMediaType;
  mediaUrl?: string;
  actif: boolean;
  createdAt: string;
}

export interface EnfantProfilePublic {
  id: number;
  nom: string;
  prenom: string;
  age?: number;
  centre?: string;
  centreId?: number;
  region?: string;
  cluster?: string;
  presentation?: string;
  pointsForts?: string;
  photoUrl?: string;
  eleveId?: number;
  createdByUserId?: number;
  actif: boolean;
  projets: EnfantProject[];
  createdAt: string;
  updatedAt?: string;
}

// --- Banque (gérée par le comptable) ---
export interface Banque {
  id: number;
  nom: string;
  createdAt?: string;
}
