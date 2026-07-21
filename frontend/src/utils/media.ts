/** Préfixe API pour les fichiers uploadés */
import { safeExternalUrl, safeYouTubeEmbedUrl } from './safeUrl';
import { API_BASE } from '../services/api';

export function mediaUrl(path?: string | null): string {

  if (!path) return '';

  if (/^https?:/i.test(path)) return safeExternalUrl(path) || '';

  // Assets statiques du frontend (public/)
  if (path.startsWith('/assets/')) return path;

  // Fichiers sensibles : passer par l'endpoint authentifié.
  // IMPORTANT : on utilise API_BASE (qui reflete VITE_API_URL) et non un
  // prefixe relatif "/api" en dur. En production, le frontend et le backend
  // sont deux services Railway distincts (VITE_API_URL pointe vers le domaine
  // du backend) : un chemin relatif "/api/..." serait resolu contre le domaine
  // du frontend (ska-management.com), qui ne sert que la SPA statique, et
  // renverrait donc index.html au lieu de l'image (upload "reussi" mais photo
  // jamais visible).

  if (path.startsWith('/uploads/avatars/')) {
    return `${API_BASE}/secure-files/avatars/${path.slice('/uploads/avatars/'.length)}`;
  }

  if (path.startsWith('/uploads/identite/')) {

    return `${API_BASE}/secure-files/identite/${path.slice('/uploads/identite/'.length)}`;

  }

  if (path.startsWith('/uploads/transactions/')) {

    return `${API_BASE}/secure-files/transactions/${path.slice('/uploads/transactions/'.length)}`;

  }
  if (path.startsWith('/uploads/enfants/')) {
    return `${API_BASE}/secure-files/enfants/${path.slice('/uploads/enfants/'.length)}`;
  }
  if (path.startsWith('/uploads/projets-enfants/')) {
    return `${API_BASE}/secure-files/projets-enfants/${path.slice('/uploads/projets-enfants/'.length)}`;
  }
  if (path.startsWith('/uploads/rapports/')) {
    return `${API_BASE}/secure-files/rapports/${path.slice('/uploads/rapports/'.length)}`;
  }
  if (path.startsWith('/uploads/formateur-documents/')) {
    return `${API_BASE}/secure-files/formateur-documents/${path.slice('/uploads/formateur-documents/'.length)}`;
  }

  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

}



/** Indique si le média nécessite un Bearer token (img ne l'envoie pas) */

export function isSecureMediaPath(path?: string | null): boolean {

  if (!path) return false;

  return path.startsWith('/uploads/identite/')

    || path.startsWith('/uploads/transactions/')
    || path.startsWith('/uploads/enfants/')
    || path.startsWith('/uploads/projets-enfants/')
    || path.startsWith('/uploads/rapports/')
    || path.startsWith('/uploads/formateur-documents/')

    || path.includes('/secure-files/identite/')

    || path.includes('/secure-files/transactions/')
    || path.includes('/secure-files/enfants/')
    || path.includes('/secure-files/projets-enfants/')
    || path.includes('/secure-files/rapports/')
    || path.includes('/secure-files/formateur-documents/');

}



/**

 * Charge un fichier protégé avec le JWT et retourne une blob URL.

 * À révoquer avec URL.revokeObjectURL quand le composant se démonte.

 */

export async function fetchSecureMediaBlobUrl(path?: string | null): Promise<string> {

  if (!path) return '';

  const url = mediaUrl(path);

  const token = localStorage.getItem('nehemiah_token');

  const response = await fetch(url, {

    headers: token ? { Authorization: `Bearer ${token}` } : {},

  });

  if (!response.ok) {

    throw new Error('Impossible de charger le fichier protégé.');

  }

  const blob = await response.blob();

  return URL.createObjectURL(blob);

}



/** Extrait l'ID YouTube d'une URL */

export function youtubeEmbedUrl(url?: string): string | null {
  return safeYouTubeEmbedUrl(url);

}


