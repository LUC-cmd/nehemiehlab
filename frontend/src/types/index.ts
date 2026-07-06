// ============================================================
//  Types globaux de la plateforme Nehemiah Lab
// ============================================================

// --- Rôles ---
export type Role = 'DIRECTEUR' | 'FORMATEUR' | 'COORDINATEUR' | 'COMPTABLE';

// --- Utilisateur ---
export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  telephone?: string;
  avatar?: string;
  actif: boolean;
  createdAt: string;
}

// --- Centre ---
export interface Centre {
  id: number;
  nom: string;
  adresse: string;
  ville: string;
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
  createdAt: string;
}

// --- Projet élève ---
export interface Projet {
  id: number;
  nom: string;
  description: string;
  evolution: number; // 0-100 %
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
  eleveId: number;
  auteur: User;
  description: string;
  statut: 'EN_ATTENTE' | 'TRAITE';
  createdAt: string;
}

// --- Module de formation (journal) ---
export interface ModuleFormation {
  id: number;
  date: string;
  centreId: number;
  formateurId: number;
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
