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
  coordinateur?: User;
  formateurs: User[];
  nombreEleves: number;
  createdAt: string;
}

// --- Élève ---
export interface Eleve {
  id: number;
  nom: string;
  prenom: string;
  matricule?: string;
  age: number;
  sexe: 'M' | 'F';
  classe: string;
  centre: Centre;
  formateur?: User;
  dateDebutFormation: string;
  dateFinFormation?: string;
  totalHeures: number;
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
  titre: string;
  description: string;
  dureeHeures: number;
  elevesPresents: number[];
}

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
