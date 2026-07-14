import axios from 'axios';
import toast from 'react-hot-toast';
import type { User, Transaction, ModuleCours, FormateurEvaluation, ChildSessionRow, RapportSyntheseCentre, ApercuRapportFormateur } from '../types';
import {
  clearAuthSession,
  getAuthToken,
  getRefreshToken,
  persistAuthSession,
  getAuthUserRaw,
} from '../utils/authStorage';

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api';

function isPublicAppPath(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path === '/'
    || path.startsWith('/connexion')
    || path.startsWith('/inscription-formateur');
}

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

const OFFLINE_QUEUE_KEY = 'nehemiah_offline_queue';

export const syncOfflineQueue = async () => {
  // Les mutations contiennent souvent des données d'enfants ou financières:
  // elles ne sont jamais conservées en clair dans localStorage.
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
};

if (typeof window !== 'undefined') {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

// --- Request Interceptor: ajoute le token JWT ---
api.interceptors.request.use(
  (config) => {
    const requestUrl = String(config.url || '');
    const token = getAuthToken();
    const isPublicEndpoint =
      requestUrl.startsWith('/auth/') ||
      requestUrl.startsWith('/site/') ||
      requestUrl.startsWith('/uploads/');

    if (!token && !isPublicEndpoint) {
      const path = window.location.pathname;
      const isPublicPage =
        path === '/'
        || path.startsWith('/connexion')
        || path.startsWith('/inscription-formateur');
      if (!isPublicPage) {
        window.location.href = '/connexion';
      }
      return Promise.reject(new Error('AUTH_REQUIRED'));
    }

    const method = String(config.method || 'get').toUpperCase();
    const isMutation = method === 'POST' || method === 'PUT' || method === 'DELETE';
    const isUpload =
      config.data instanceof FormData ||
      String(config.headers?.['Content-Type'] || '').includes('multipart/form-data');

    if (!navigator.onLine && !isPublicEndpoint && isMutation) {
      toast.error(isUpload
        ? "Vous êtes hors ligne: l'upload sera possible après reconnexion."
        : 'Vous êtes hors ligne. Reconnectez-vous avant d’enregistrer cette action.');
      return Promise.reject(new Error('OFFLINE_MUTATION_BLOCKED'));
    }

    if (token && !isPublicEndpoint) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Response Interceptor: gère les erreurs globalement ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const requestUrl = String(originalRequest.url || '');
    const isAuthPublicCall =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/login-parent') ||
      requestUrl.includes('/auth/parent/activate') ||
      requestUrl.includes('/auth/inscription-formateur') ||
      requestUrl.includes('/auth/password-reset') ||
      requestUrl.includes('/auth/refresh');

    const isPublicSiteCall = requestUrl.startsWith('/site/');

    if (
      error.message === 'AUTH_REQUIRED' ||
      error.message === 'OFFLINE_MUTATION_BLOCKED'
    ) {
      return Promise.reject(error);
    }

    // Erreurs auth publiques → laisser la page gérer le message (pas de toast global)
    if (
      isAuthPublicCall &&
      (error.response?.status === 401 ||
        error.response?.status === 403 ||
        error.response?.status === 404 ||
        error.response?.status === 400)
    ) {
      return Promise.reject(error);
    }

    // Token expiré → tentative de refresh (hors appels auth publics)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = getRefreshToken();

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          persistAuthSession(data.token, data.refreshToken || getRefreshToken() || '', getAuthUserRaw() || '');
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${data.token}`;
          return api(originalRequest);
        } catch {
          clearAuthSession();
          if (!window.location.pathname.startsWith('/connexion')) {
            window.location.href = '/connexion';
          }
        }
      } else if (!window.location.pathname.startsWith('/connexion')) {
        window.location.href = '/connexion';
      }
    }

    // Ne pas toaster sur pages publiques ni sans session active (évite le spam au chargement)
    const hasSession = Boolean(getAuthToken());
    if (!isAuthPublicCall && !isPublicSiteCall && hasSession && !isPublicAppPath()) {
      if (error.response?.status === 403) {
        toast.error("Accès refusé — vous n'avez pas les permissions nécessaires.");
      } else if (error.response?.status === 500) {
        toast.error('Erreur serveur. Veuillez réessayer plus tard.');
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================
//  Services Auth
// ============================================================
export const authService = {
  login: (email: string, motDePasse: string) =>
    api.post('/auth/login', { email, motDePasse }),

  loginParent: (matricule: string, motDePasse: string) =>
    api.post('/auth/login-parent', { matricule, motDePasse }),

  activateParent: (data: {
    matricule: string;
    codeActivation: string;
    nouveauMotDePasse: string;
  }) => api.post('/auth/parent/activate', data),

  logout: (refreshToken?: string | null) =>
    api.post('/auth/logout', { refreshToken }),

  inscriptionFormateur: (data: {
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    dateNaissance: string;
    lieuNaissance: string;
    motDePasse: string;
    carteIdentiteRecto?: File | null;
    carteIdentiteVerso?: File | null;
  }) => {
    const formData = new FormData();
    formData.append('nom', data.nom);
    formData.append('prenom', data.prenom);
    formData.append('email', data.email);
    formData.append('telephone', data.telephone);
    formData.append('dateNaissance', data.dateNaissance);
    formData.append('lieuNaissance', data.lieuNaissance);
    formData.append('motDePasse', data.motDePasse);
    if (data.carteIdentiteRecto) formData.append('carteIdentiteRecto', data.carteIdentiteRecto);
    if (data.carteIdentiteVerso) formData.append('carteIdentiteVerso', data.carteIdentiteVerso);
    return api.post('/auth/inscription-formateur', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  confirmResetPassword: (data: {
    email: string;
    otp: string;
    nouveauMotDePasse: string;
  }) => api.post('/auth/password-reset/confirm', data),

  requestPasswordResetOtp: (email: string) =>
    api.post('/auth/password-reset/request-otp', { email }),

  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
};

// ============================================================
//  Services Utilisateurs
// ============================================================
export const userService = {
  getAll: () => api.get('/users'),
  getById: (id: number) => api.get(`/users/${id}`),
  createCompte: (data: {
    nom: string; prenom: string; email: string; role: string; centreId?: number; cluster?: string; motDePasse?: string;
    telephone?: string; dateNaissance?: string; lieuNaissance?: string; adresse?: string;
  }) => api.post('/users/creer-compte', data),
  updateProfile: (id: number, data: Partial<{
    nom: string; prenom: string; telephone: string; telephoneSecondaire: string;
    numeroCompteBancaire: string; numeroMobileMoney: string;
    motDePasse: string; ancienMotDePasse: string;
    dateNaissance: string; lieuNaissance: string; adresse: string;
  }>) => api.put<User>(`/users/${id}`, data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<User>('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteAvatar: () => api.delete<User>('/users/me/avatar'),
  uploadCarteIdentite: (face: 'recto' | 'verso', file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<User>(`/users/me/carte-identite/${face}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteCarteIdentite: (face: 'recto' | 'verso') =>
    api.delete<User>(`/users/me/carte-identite/${face}`),
  desactiver: (id: number) => api.put(`/users/${id}/desactiver`),
  getFormateurs: () => api.get('/users/formateurs'),
  getFormateursEnAttente: () => api.get('/users/formateurs/en-attente'),
  getCoordinateurs: () => api.get('/users/coordinateurs'),
  getClusters: () => api.get<string[]>('/users/clusters'),
  getInscriptionsFormateursStatut: () => api.get('/users/inscriptions-formateurs/statut'),
  setInscriptionsFormateursStatut: (ouverte: boolean) =>
    api.put('/users/inscriptions-formateurs/statut', { ouverte }),
  validerFormateur: (id: number) => api.put(`/users/${id}/valider-formateur`),
};

// ============================================================
//  Permissions dashboards (Directeur)
// ============================================================
export const accessService = {
  getMyAccess: () => api.get<{ role: string; features: string[] }>('/access/me'),
  getCatalog: () => api.get('/access/catalog'),
  getMatrix: () => api.get<{ matrix: Record<string, string[]>; locked: Record<string, string[]> }>('/access/matrix'),
  saveMatrix: (matrix: Record<string, string[]>) =>
    api.put<{ message: string; matrix: Record<string, string[]> }>('/access/matrix', matrix),
};

// ============================================================
//  Services Centres
// ============================================================
export const centreService = {
  getAll: () => api.get('/centres'),
  getById: (id: number) => api.get(`/centres/${id}`),
  create: (data: {
    nom: string; adresse: string; ville: string; region?: string; cluster?: string;
    latitude?: number; longitude?: number;
    telephoneResponsable?: string; telephoneCoordinateur?: string; telephoneFormateur?: string;
    coordinateurNom?: string; coordinateurPrenom?: string;
  }) => api.post('/centres', data),
  update: (id: number, data: {
    nom?: string; adresse?: string; ville?: string; region?: string; cluster?: string;
    latitude?: number; longitude?: number;
    telephoneResponsable?: string; telephoneCoordinateur?: string; telephoneFormateur?: string;
    coordinateurNom?: string; coordinateurPrenom?: string;
  }) => api.put(`/centres/${id}`, data),
  delete: (id: number) => api.delete(`/centres/${id}`),
  assignerFormateur: (centreId: number, formateurId: number) =>
    api.post(`/centres/${centreId}/formateurs/${formateurId}`),
  retirerFormateur: (centreId: number, formateurId: number) =>
    api.delete(`/centres/${centreId}/formateurs/${formateurId}`),
  assignerCoordinateur: (centreId: number, coordinateurId: number) =>
    api.put(`/centres/${centreId}/coordinateur/${coordinateurId}`),
  getMesCentres: () => api.get('/centres/mes-centres'),
  updateLocalisationCourante: (id: number, data: { latitude: number; longitude: number }) =>
    api.post(`/centres/${id}/localisation-courante`, data),
  exportExcel: () =>
    api.get('/centres/export-excel', { responseType: 'blob' }),
  importExcel: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/centres/import-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ============================================================
//  Services Élèves
// ============================================================
export const eleveService = {
  getByCentre: (centreId: number) => api.get(`/eleves/centre/${centreId}`),
  getById: (id: number) => api.get(`/eleves/${id}`),
  getSeances: (id: number) => api.get<ChildSessionRow[]>(`/eleves/${id}/seances`),
  create: (data: {
    nom: string; prenom: string; dateNaissance?: string; age: number; sexe: string;
    classe: string; centreId: number; dateDebutFormation: string;
  }) => api.post('/eleves', data),
  update: (id: number, data: {
    nom?: string; prenom?: string; dateNaissance?: string; age?: number; sexe?: string;
    classe?: string; dateDebutFormation?: string;
  }) => api.put(`/eleves/${id}`, data),
  issueParentActivationCode: (eleveId: number) =>
    api.post(`/eleves/${eleveId}/parent-activation-code`),
  delete: (id: number) => api.delete(`/eleves/${id}`),

  // Présences
  demarrerSession: (eleveId: number) =>
    api.post(`/eleves/${eleveId}/presence/debut`),
  terminerSession: (eleveId: number) =>
    api.post(`/eleves/${eleveId}/presence/fin`),
  getPresences: (eleveId: number) =>
    api.get(`/eleves/${eleveId}/presences`),

  // Commentaires
  addCommentaire: (eleveId: number, contenu: string) =>
    api.post(`/eleves/${eleveId}/commentaires`, { contenu }),
  getCommentaires: (eleveId: number) =>
    api.get(`/eleves/${eleveId}/commentaires`),

  // Signalements
  signalerEleve: (
    eleveId: number,
    description: string,
    inclureDansRapport?: boolean,
    options?: { priorite?: 'NORMALE' | 'URGENTE'; etatEquipements?: string; defis?: string }
  ) =>
    api.post(`/eleves/${eleveId}/signalements`, {
      description,
      inclureDansRapport: Boolean(inclureDansRapport),
      priorite: options?.priorite ?? 'NORMALE',
      etatEquipements: options?.etatEquipements ?? '',
      defis: options?.defis ?? '',
    }),
  getSignalements: (eleveId: number) =>
    api.get(`/eleves/${eleveId}/signalements`),
  traiterSignalement: (signalementId: number) =>
    api.put(`/signalements/${signalementId}/traiter`),

  // Projets
  updateProjet: (eleveId: number, data: {
    nom: string; description: string; evolution: number;
    causeNonAvancement?: string; justificationPedagogique?: string;
    pointsForts?: string; recommandations?: string;
  }) => api.put(`/eleves/${eleveId}/projet`, data),
};

// ============================================================
//  Services Formations (journal)
// ============================================================
export const formationService = {
  create: (data: {
    centreId: number;
    moduleCoursId: number;
    dureeHeures?: number;
    date: string;
    elevesPresents: number[];
    remarques?: string;
  }) => api.post('/formations', data),
  getByCentre: (centreId: number, params?: { debut?: string; fin?: string; formateurId?: number; moduleCoursId?: number }) =>
    api.get(`/formations/centre/${centreId}`, { params }),
  getMesFormations: (params?: { debut?: string; fin?: string }) =>
    api.get('/formations/mes-formations', { params }),
};

// ============================================================
//  Modules pédagogiques & supports de cours (Directeur → Formateurs)
// ============================================================
export const moduleCoursService = {
  list: () => api.get<ModuleCours[]>('/modules-cours'),
  get: (id: number) => api.get<ModuleCours>(`/modules-cours/${id}`),
  create: (data: Partial<ModuleCours>) => api.post<ModuleCours>('/modules-cours', data),
  update: (id: number, data: Partial<ModuleCours>) => api.put<ModuleCours>(`/modules-cours/${id}`, data),
  delete: (id: number) => api.delete(`/modules-cours/${id}`),
};

export const serieSupportService = {
  list: (params?: { moduleId?: number }) =>
    api.get<import('../types').SerieSupportCours[]>('/series-supports-cours', { params }),
  get: (id: number) => api.get<import('../types').SerieSupportCours>(`/series-supports-cours/${id}`),
  create: (data: {
    titre: string;
    description?: string;
    ordre?: number;
    actif?: boolean;
    moduleIds: number[];
  }) => api.post<import('../types').SerieSupportCours>('/series-supports-cours', data),
  update: (id: number, data: Partial<{
    titre: string;
    description: string;
    ordre: number;
    actif: boolean;
    moduleIds: number[];
  }>) => api.put<import('../types').SerieSupportCours>(`/series-supports-cours/${id}`, data),
  delete: (id: number) => api.delete(`/series-supports-cours/${id}`),
  uploadFichiers: (id: number, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return api.post<import('../types').SerieSupportCours>(`/series-supports-cours/${id}/fichiers`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteFichier: (serieId: number, fichierId: number) =>
    api.delete(`/series-supports-cours/${serieId}/fichiers/${fichierId}`),
};

export const formateurEvaluationService = {
  list: (params?: { formateurId?: number }) =>
    api.get<FormateurEvaluation[]>('/formateur-evaluations', { params }),
  submit: (data: FormData) =>
    api.post<FormateurEvaluation>('/formateur-evaluations', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ============================================================
//  Services Sessions
// ============================================================
export const sessionService = {
  getAll: () => api.get('/sessions'),
  getById: (id: number) => api.get(`/sessions/${id}`),
  create: (data: {
    titre: string;
    centre: { id: number };
    dureePrevueMinutes: number;
    heureDebut?: string;
    latitudeDebut?: number;
    longitudeDebut?: number;
    precisionDebutMetres?: number;
    moduleFait?: string;
    moduleCoursId?: number;
    etatEquipements?: string;
    defisSession?: string;
  }) => api.post('/sessions', data),
  cloturer: (id: number, data?: { heureFin?: string }) =>
    api.put(`/sessions/${id}/cloturer`, data ?? {}),
  updateHoraires: (id: number, data: { heureDebut?: string; heureFin?: string }) =>
    api.put(`/sessions/${id}/horaires`, data),
  localiserDebut: (id: number, data: { latitude: number; longitude: number; precisionMetres?: number }) =>
    api.post(`/sessions/${id}/localisation/debut`, data),
  localiserFin: (id: number, data: { latitude: number; longitude: number; precisionMetres?: number }) =>
    api.post(`/sessions/${id}/localisation/fin`, data),
  updateEvaluations: (id: number, data: {
    id: number;
    present: boolean;
    note?: number;
    commentaire?: string;
    projetTravaille?: string;
    projetFinal?: boolean;
    projetProbleme?: string;
    projetSolution?: string;
  }[]) => api.put(`/sessions/${id}/evaluations`, data),
  updateContexte: (id: number, data: {
    moduleFait?: string;
    moduleCoursId?: number;
    etatEquipements?: string;
    defisSession?: string;
  }) =>
    api.put(`/sessions/${id}/contexte`, data),
  uploadRapport: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/sessions/${id}/rapport`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// ============================================================
//  Services Transactions
// ============================================================
export const transactionService = {
  getAll: (params?: { statut?: string; formateurId?: number }) =>
    api.get('/transactions', { params }),
  getMesTransactions: () => api.get('/transactions/mes-transactions'),
  getById: (id: number) => api.get<Transaction>(`/transactions/${id}`),
  create: (data: {
    formateurId: number;
    montant: number;
    type: string;
    description: string;
    justificatif?: File | null;
  }) => {
    const formData = new FormData();
    formData.append('formateurId', String(data.formateurId));
    formData.append('montant', String(data.montant));
    formData.append('type', data.type);
    formData.append('description', data.description);
    if (data.justificatif) {
      formData.append('justificatif', data.justificatif);
    }
    return api.post<Transaction>('/transactions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadJustificatif: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<Transaction>(`/transactions/${id}/justificatif`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  valider: (id: number) => api.put(`/transactions/${id}/valider`),
  refuser: (id: number) => api.put(`/transactions/${id}/refuser`),
  relayer: (id: number, data: { roles: string[]; message?: string }) =>
    api.post(`/transactions/${id}/relayer`, data),
};

// ============================================================
//  Services Notifications
// ============================================================
export const notificationService = {
  getMes: () => api.get('/notifications'),
  marquerLu: (id: number) => api.put(`/notifications/${id}/lu`),
  marquerTousLus: () => api.put('/notifications/tous-lus'),
  diffuser: (data: {
    titre: string;
    message: string;
    roles: string[];
    centreId?: number;
    cluster?: string;
  }) => api.post('/notifications/diffuser', data),
};

// ============================================================
//  Services Signalements
// ============================================================
export const signalementService = {
  getAll: () => api.get('/signalements'),
  traiter: (id: number) => api.put(`/signalements/${id}/traiter`),
  createAlerteCentre: (data: {
    centreId: number;
    description: string;
    priorite?: 'NORMALE' | 'URGENTE';
    etatEquipements?: string;
    defis?: string;
  }) =>
    api.post('/signalements/centre', data),
  createAlerteEnfant: (data: {
    eleveId: number;
    description: string;
    inclureDansRapport?: boolean;
    priorite?: 'NORMALE' | 'URGENTE';
    etatEquipements?: string;
    defis?: string;
    sessionId?: number;
  }) =>
    api.post(`/eleves/${data.eleveId}/signalements`, {
      description: data.description,
      inclureDansRapport: Boolean(data.inclureDansRapport),
      priorite: data.priorite ?? 'NORMALE',
      etatEquipements: data.etatEquipements ?? '',
      defis: data.defis ?? '',
      sessionId: data.sessionId != null ? String(data.sessionId) : undefined,
    }),
  setInclusionRapport: (id: number, inclureDansRapport: boolean) =>
    api.put(`/signalements/${id}/inclusion-rapport`, { inclureDansRapport }),
  relayer: (id: number, data: { roles: string[]; message?: string }) =>
    api.post(`/signalements/${id}/relayer`, data),
};

export const rapportService = {
  exporterEleves: (params?: { centreId?: number; region?: string; cluster?: string; eleveId?: number }) =>
    api.get('/rapports/eleves', {
      params,
      responseType: 'blob'
    }),
  exporterEleve: (id: number) =>
    api.get(`/rapports/eleve/${id}`, { responseType: 'blob' }),
  exporterElevesPdf: (params?: { centreId?: number; region?: string; cluster?: string; eleveId?: number }) =>
    api.get('/rapports/eleves/pdf', { params, responseType: 'blob' }),
  exporterElevePdf: (id: number) =>
    api.get(`/rapports/eleve/${id}/pdf`, { responseType: 'blob' }),
  exporterEleveFichePdf: (id: number) =>
    api.get(`/rapports/eleve/${id}/fiche-pdf`, { responseType: 'blob' }),
  exporterHeures: (params?: { centreId?: string; region?: string; cluster?: string; debut?: string; fin?: string }) =>
    api.get('/rapports/heures', { params, responseType: 'blob' }),
  exporterHeuresPdf: (params?: { centreId?: string; region?: string; cluster?: string; debut?: string; fin?: string }) =>
    api.get('/rapports/heures/pdf', { params, responseType: 'blob' }),
  exporterActivites: (params?: { centreId?: string; region?: string; cluster?: string; debut?: string; fin?: string }) =>
    api.get('/rapports/activites', { params, responseType: 'blob' }),
  exporterSeances: (params?: { centreId?: string; region?: string; cluster?: string; debut?: string; fin?: string }) =>
    api.get('/rapports/seances', { params, responseType: 'blob' }),
  exporterSeancesPdf: (params?: { centreId?: string; region?: string; cluster?: string; debut?: string; fin?: string }) =>
    api.get('/rapports/seances/pdf', { params, responseType: 'blob' }),
  exporterExecutionPdf: (params?: {
    centreId?: string; region?: string; cluster?: string;
    formateurId?: string; debut?: string; fin?: string;
  }) => api.get('/rapports/execution/pdf', { params, responseType: 'blob' }),
  listExecutionSeances: (params?: {
    centreId?: string; region?: string; cluster?: string;
    formateurId?: string; debut?: string; fin?: string;
  }) => api.get<import('../types').RapportExecutionSeancesResponse>('/rapports/execution/seances', { params }),
  exporterSessionExecutionPdf: (sessionId: number) =>
    api.get(`/rapports/seances/${sessionId}/execution-pdf`, { responseType: 'blob' }),
  exporterActivitesPdf: (params?: { centreId?: string; region?: string; cluster?: string; debut?: string; fin?: string }) =>
    api.get('/rapports/activites/pdf', { params, responseType: 'blob' }),
  exporterTransactions: (params?: { formateurId?: number; debut?: string; fin?: string }) =>
    api.get('/rapports/transactions', { params, responseType: 'blob' }),
  exporterTransactionsPdf: (params?: { debut?: string; fin?: string }) =>
    api.get('/rapports/transactions/pdf', { params, responseType: 'blob' }),
  exporterRapportFormateurPdf: (centreId: number, params: {
    debut: string; fin: string; moduleLabel?: string;
  }) => api.get(`/rapports/centre/${centreId}/rapport-formateur-pdf`, { params, responseType: 'blob' }),
  apercuRapportFormateur: (centreId: number, params: { debut: string; fin: string }) =>
    api.get<ApercuRapportFormateur>(`/rapports/centre/${centreId}/rapport-formateur-apercu`, { params }),
  getSyntheseCentre: (centreId: number, params: { moduleLabel?: string; debut: string; fin: string }) =>
    api.get<RapportSyntheseCentre>(`/rapports/synthese/centre/${centreId}`, { params }),
  saveSyntheseCentre: (centreId: number, data: Partial<RapportSyntheseCentre>) =>
    api.put(`/rapports/synthese/centre/${centreId}`, data),
};

// ============================================================
//  Services Dashboard (stats)
// ============================================================
export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
};

// ============================================================
//  Site public (sans auth requise)
// ============================================================
export const siteService = {
  getPublications: () => api.get('/site/publications'),
  getPublication: (id: number) => api.get(`/site/publications/${id}`),
  getActualites: () => api.get('/site/actualites'),
  getActualite: (id: number) => api.get(`/site/actualites/${id}`),
  getGalerie: () => api.get<import('../types').GaleriePhoto[]>('/site/galerie'),
  getInscriptionsFormateurs: () => api.get<{ ouverte: boolean }>('/site/inscriptions-formateurs'),
};

// ============================================================
//  Contenu public modifiable (Directeur + profils auto)
// ============================================================
export const contentManagementService = {
  // Ressources
  getRessources: () => api.get('/content-management/ressources'),
  createRessource: (data: Partial<import('../types').RessourceItem>) =>
    api.post('/content-management/ressources', data),
  createRessourceWithFile: (formData: FormData) =>
    api.post('/content-management/ressources/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateRessource: (id: number, data: Partial<import('../types').RessourceItem>) =>
    api.put(`/content-management/ressources/${id}`, data),
  uploadRessourceFichier: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/content-management/ressources/${id}/fichier`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadRessourceFichiers: (id: number, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return api.post(`/content-management/ressources/${id}/fichier`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteRessourceFichier: (id: number, fichierId: number) =>
    api.delete(`/content-management/ressources/${id}/fichiers/${fichierId}`),
  deleteRessource: (id: number) =>
    api.delete(`/content-management/ressources/${id}`),

  // Communaute
  getCommunaute: () => api.get('/content-management/communaute'),
  createCommunaute: (data: Partial<import('../types').CommunityProfile>) =>
    api.post('/content-management/communaute', data),
  updateCommunaute: (id: number, data: Partial<import('../types').CommunityProfile>) =>
    api.put(`/content-management/communaute/${id}`, data),
  deleteCommunaute: (id: number) =>
    api.delete(`/content-management/communaute/${id}`),
  uploadCommunautePhoto: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/content-management/communaute/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getMonProfilCommunaute: () => api.get('/content-management/communaute/me'),
  saveMonProfilCommunaute: (data: Partial<import('../types').CommunityProfile>) =>
    api.put('/content-management/communaute/me', data),
  uploadMaPhotoCommunaute: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/content-management/communaute/me/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Enfants
  getEnfants: () => api.get('/content-management/enfants'),
  createEnfant: (data: Partial<import('../types').EnfantProfilePublic>) =>
    api.post('/content-management/enfants', data),
  updateEnfant: (id: number, data: Partial<import('../types').EnfantProfilePublic>) =>
    api.put(`/content-management/enfants/${id}`, data),
  deleteEnfant: (id: number) =>
    api.delete(`/content-management/enfants/${id}`),
  uploadEnfantPhoto: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/content-management/enfants/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  createProjetEnfant: (enfantId: number, data: Partial<import('../types').EnfantProject>) =>
    api.post(`/content-management/enfants/${enfantId}/projets`, data),
  updateProjetEnfant: (id: number, data: Partial<import('../types').EnfantProject>) =>
    api.put(`/content-management/projets-enfants/${id}`, data),
  uploadProjetEnfantMedia: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/content-management/projets-enfants/${id}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteProjetEnfant: (id: number) =>
    api.delete(`/content-management/projets-enfants/${id}`),
};

// ============================================================
//  Espace parent (matricule enfant)
// ============================================================
export const parentService = {
  getMonEnfant: () => api.get('/parent/mon-enfant'),
  getSeances: () => api.get<ChildSessionRow[]>('/parent/seances'),
};

// ============================================================
//  Gestion publications (Directeur)
// ============================================================
export const publicationService = {
  getAll: () => api.get('/publications'),
  create: (data: Partial<import('../types').Publication>) => api.post('/publications', data),
  update: (id: number, data: Partial<import('../types').Publication>) => api.put(`/publications/${id}`, data),
  delete: (id: number) => api.delete(`/publications/${id}`),
  uploadMedia: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/publications/${id}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ============================================================
//  Gestion actualités (Directeur)
// ============================================================
export const actualiteService = {
  getAll: () => api.get('/actualites'),
  create: (data: Partial<import('../types').Actualite>) => api.post('/actualites', data),
  update: (id: number, data: Partial<import('../types').Actualite>) => api.put(`/actualites/${id}`, data),
  delete: (id: number) => api.delete(`/actualites/${id}`),
  uploadImage: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/actualites/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ============================================================
//  Gestion galerie site (Directeur)
// ============================================================
export const galerieService = {
  getAll: () => api.get<import('../types').GaleriePhoto[]>('/galerie'),
  create: (data: Partial<import('../types').GaleriePhoto>) => api.post('/galerie', data),
  update: (id: number, data: Partial<import('../types').GaleriePhoto>) => api.put(`/galerie/${id}`, data),
  delete: (id: number) => api.delete(`/galerie/${id}`),
  uploadImage: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/galerie/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
