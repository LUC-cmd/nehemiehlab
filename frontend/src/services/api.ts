import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// --- Request Interceptor: ajoute le token JWT ---
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nehemiah_token');
    if (token) {
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
    const originalRequest = error.config;

    // Token expiré → tentative de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('nehemiah_refresh');

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          localStorage.setItem('nehemiah_token', data.token);
          originalRequest.headers.Authorization = `Bearer ${data.token}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('nehemiah_token');
          localStorage.removeItem('nehemiah_refresh');
          window.location.href = '/connexion';
        }
      } else {
        window.location.href = '/connexion';
      }
    }

    if (error.response?.status === 403) {
      toast.error("Accès refusé — vous n'avez pas les permissions nécessaires.");
    } else if (error.response?.status === 500) {
      toast.error("Erreur serveur. Veuillez réessayer plus tard.");
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

  logout: () =>
    api.post('/auth/logout'),

  inscriptionFormateur: (data: {
    nom: string; prenom: string; email: string; motDePasse: string;
  }) => api.post('/auth/inscription-formateur', data),

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
    nom: string; prenom: string; email: string; role: string; centreId?: number;
  }) => api.post('/users/creer-compte', data),
  updateProfile: (id: number, data: Partial<{
    nom: string; prenom: string; telephone: string; motDePasse: string;
  }>) => api.put(`/users/${id}`, data),
  desactiver: (id: number) => api.put(`/users/${id}/desactiver`),
  preEnregistrerFormateur: (data: {
    nom: string; prenom: string; email: string; telephone?: string;
  }) => api.post('/users/pre-enregistrer-formateur', data),
  getFormateurs: () => api.get('/users/formateurs'),
  getCoordinateurs: () => api.get('/users/coordinateurs'),
};

// ============================================================
//  Services Centres
// ============================================================
export const centreService = {
  getAll: () => api.get('/centres'),
  getById: (id: number) => api.get(`/centres/${id}`),
  create: (data: { nom: string; adresse: string; ville: string; region?: string }) =>
    api.post('/centres', data),
  update: (id: number, data: { nom?: string; adresse?: string; ville?: string; region?: string }) =>
    api.put(`/centres/${id}`, data),
  delete: (id: number) => api.delete(`/centres/${id}`),
  assignerFormateur: (centreId: number, formateurId: number) =>
    api.post(`/centres/${centreId}/formateurs/${formateurId}`),
  retirerFormateur: (centreId: number, formateurId: number) =>
    api.delete(`/centres/${centreId}/formateurs/${formateurId}`),
  assignerCoordinateur: (centreId: number, coordinateurId: number) =>
    api.put(`/centres/${centreId}/coordinateur/${coordinateurId}`),
  getMesCentres: () => api.get('/centres/mes-centres'),
};

// ============================================================
//  Services Élèves
// ============================================================
export const eleveService = {
  getByCentre: (centreId: number) => api.get(`/eleves/centre/${centreId}`),
  getById: (id: number) => api.get(`/eleves/${id}`),
  create: (data: {
    nom: string; prenom: string; age: number; sexe: string;
    classe: string; centreId: number; dateDebutFormation: string;
  }) => api.post('/eleves', data),
  update: (id: number, data: unknown) => api.put(`/eleves/${id}`, data),
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
  signalerEleve: (eleveId: number, description: string) =>
    api.post(`/eleves/${eleveId}/signalements`, { description }),
  getSignalements: (eleveId: number) =>
    api.get(`/eleves/${eleveId}/signalements`),
  traiterSignalement: (signalementId: number) =>
    api.put(`/signalements/${signalementId}/traiter`),

  // Projets
  updateProjet: (eleveId: number, data: {
    nom: string; description: string; evolution: number;
  }) => api.put(`/eleves/${eleveId}/projet`, data),
};

// ============================================================
//  Services Formations (journal)
// ============================================================
export const formationService = {
  create: (data: {
    centreId: number; titre: string; description: string;
    dureeHeures: number; elevesPresents: number[]; date: string;
  }) => api.post('/formations', data),
  getByCentre: (centreId: number, params?: { debut?: string; fin?: string }) =>
    api.get(`/formations/centre/${centreId}`, { params }),
  getMesFormations: (params?: { debut?: string; fin?: string }) =>
    api.get('/formations/mes-formations', { params }),
};

// ============================================================
//  Services Sessions
// ============================================================
export const sessionService = {
  getAll: () => api.get('/sessions'),
  getById: (id: number) => api.get(`/sessions/${id}`),
  create: (data: { titre: string; centre: { id: number }; dureePrevueMinutes: number }) => api.post('/sessions', data),
  cloturer: (id: number) => api.put(`/sessions/${id}/cloturer`),
  updateEvaluations: (id: number, data: { id: number; present: boolean; note?: number }[]) => api.put(`/sessions/${id}/evaluations`, data),
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
  create: (data: {
    formateurId: number; montant: number; type: string; description: string;
  }) => api.post('/transactions', data),
  valider: (id: number) => api.put(`/transactions/${id}/valider`),
  refuser: (id: number) => api.put(`/transactions/${id}/refuser`),
};

// ============================================================
//  Services Notifications
// ============================================================
export const notificationService = {
  getMes: () => api.get('/notifications'),
  marquerLu: (id: number) => api.put('/notifications/${id}/lu'),
  marquerTousLus: () => api.put('/notifications/tous-lus'),
};

// ============================================================
//  Services Rapports
// ============================================================
export const rapportService = {
  exporterEleves: (centreId?: number) =>
    api.get('/rapports/eleves', {
      params: { centreId },
      responseType: 'blob'
    }),
  exporterHeures: (params?: { centreId?: string; debut?: string; fin?: string }) =>
    api.get('/rapports/heures', { params, responseType: 'blob' }),
  exporterTransactions: (params?: { formateurId?: number; debut?: string; fin?: string }) =>
    api.get('/rapports/transactions', { params, responseType: 'blob' }),
  exporterFormateur: (formateurId: number) =>
    api.get(`/rapports/formateur/${formateurId}`, { responseType: 'blob' }),
};

// ============================================================
//  Services Dashboard (stats)
// ============================================================
export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
};

export default api;
