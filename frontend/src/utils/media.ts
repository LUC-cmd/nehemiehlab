/** Préfixe API pour les fichiers uploadés */
import { safeExternalUrl, safeYouTubeEmbedUrl } from './safeUrl';

export function mediaUrl(path?: string | null): string {

  if (!path) return '';

  if (/^https?:/i.test(path)) return safeExternalUrl(path) || '';

  // Assets statiques du frontend (public/)
  if (path.startsWith('/assets/')) return path;

  // Fichiers sensibles : passer par l'endpoint authentifié

  if (path.startsWith('/uploads/avatars/')) {
    return `/api/secure-files/avatars/${path.slice('/uploads/avatars/'.length)}`;
  }

  if (path.startsWith('/uploads/identite/')) {

    return `/api/secure-files/identite/${path.slice('/uploads/identite/'.length)}`;

  }

  if (path.startsWith('/uploads/transactions/')) {

    return `/api/secure-files/transactions/${path.slice('/uploads/transactions/'.length)}`;

  }
  if (path.startsWith('/uploads/enfants/')) {
    return `/api/secure-files/enfants/${path.slice('/uploads/enfants/'.length)}`;
  }
  if (path.startsWith('/uploads/projets-enfants/')) {
    return `/api/secure-files/projets-enfants/${path.slice('/uploads/projets-enfants/'.length)}`;
  }
  if (path.startsWith('/uploads/rapports/')) {
    return `/api/secure-files/rapports/${path.slice('/uploads/rapports/'.length)}`;
  }

  return `/api${path.startsWith('/') ? path : `/${path}`}`;

}



/** Indique si le média nécessite un Bearer token (img ne l'envoie pas) */

export function isSecureMediaPath(path?: string | null): boolean {

  if (!path) return false;

  return path.startsWith('/uploads/identite/')

    || path.startsWith('/uploads/transactions/')
    || path.startsWith('/uploads/enfants/')
    || path.startsWith('/uploads/projets-enfants/')
    || path.startsWith('/uploads/rapports/')

    || path.includes('/secure-files/identite/')

    || path.includes('/secure-files/transactions/')
    || path.includes('/secure-files/enfants/')
    || path.includes('/secure-files/projets-enfants/')
    || path.includes('/secure-files/rapports/');

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


