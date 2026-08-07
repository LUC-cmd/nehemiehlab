type CacheEnvelope<T> = {
  savedAt: number;
  data: T;
};

const CACHE_PREFIX = 'nh_cache:';

function keyFor(rawKey: string): string {
  return `${CACHE_PREFIX}${rawKey}`;
}

export function readCache<T>(rawKey: string): T | null {
  try {
    const payload = localStorage.getItem(keyFor(rawKey));
    if (!payload) return null;
    const parsed = JSON.parse(payload) as CacheEnvelope<T>;
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

export function writeCache<T>(rawKey: string, data: T): void {
  try {
    const payload: CacheEnvelope<T> = { savedAt: Date.now(), data };
    localStorage.setItem(keyFor(rawKey), JSON.stringify(payload));
  } catch {
    // Ignore cache write issues (quota / private mode)
  }
}

/**
 * Purge tout le cache de lecture (préfixe nh_cache:). À appeler à la
 * déconnexion : un même téléphone/tablette est souvent partagé entre
 * plusieurs formateurs sur le terrain, et sans ce nettoyage le cache du
 * compte précédent (centres, séances...) restait disponible en repli et
 * pouvait s'afficher pour le compte suivant après une nouvelle connexion.
 * N'affecte pas les brouillons hors ligne ni la file de mutations en attente
 * (autres préfixes de clés, gérés séparément) : aucune perte de données de
 * terrain non synchronisées.
 */
export function clearAllCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore (quota / mode privé)
  }
}

export async function fetchWithOfflineCache<T>(
  rawKey: string,
  fetcher: () => Promise<T>,
): Promise<{ data: T; fromCache: boolean; error?: unknown }> {
  try {
    const data = await fetcher();
    writeCache(rawKey, data);
    return { data, fromCache: false };
  } catch (error) {
    const cached = readCache<T>(rawKey);
    if (cached !== null) {
      // On garde l'erreur d'origine : elle sert à distinguer un vrai mode hors
      // ligne (pas de réseau) d'un échec pendant qu'on est en ligne (session
      // expirée, erreur serveur...). Sans ça, tous les échecs étaient affichés
      // sous l'étiquette trompeuse « Mode hors ligne », y compris quand la vraie
      // cause était par exemple une session expirée — voir describeDataLoadIssue.
      return { data: cached, fromCache: true, error };
    }
    throw error;
  }
}

/**
 * Message à afficher quand une ou plusieurs requêtes du tableau de bord sont
 * retombées sur le cache local. Distingue le vrai mode hors ligne (pas de
 * réseau : message informatif, normal) d'un échec pendant qu'on est en ligne
 * (session expirée, erreur serveur...), qui doit être signalé clairement
 * plutôt que caché derrière l'étiquette « Mode hors ligne ».
 */
export function describeDataLoadIssue(
  results: Array<{ fromCache: boolean; error?: unknown }>,
): { offline: boolean; message: string } | null {
  const stale = results.find((r) => r.fromCache);
  if (!stale) return null;

  if (!navigator.onLine) {
    return {
      offline: true,
      message: 'Mode hors ligne : affichage des dernières données enregistrées.',
    };
  }

  const withError = results.find((r) => r.fromCache && r.error !== undefined) ?? stale;
  const status = (withError.error as { response?: { status?: number } } | undefined)?.response?.status;
  if (status === 401) {
    return {
      offline: false,
      message: 'Votre session a expiré. Reconnectez-vous pour voir les données à jour.',
    };
  }
  return {
    offline: false,
    message: "Erreur de chargement : affichage des dernières données enregistrées. Réessayez.",
  };
}
