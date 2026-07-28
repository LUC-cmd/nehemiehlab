import { readStoredPosition, storePosition, type LatLng } from './geo';

export type SessionGeoPosition = LatLng & { precisionMetres?: number };

export type GeoPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export async function queryGeolocationPermission(): Promise<GeoPermissionState> {
  if (!navigator.geolocation) return 'unsupported';
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return status.state as GeoPermissionState;
  } catch {
    return 'prompt';
  }
}

/**
 * Démarre une acquisition GPS en arrière-plan, sans bloquer ni afficher
 * d'erreur, pour "préchauffer" le cache de position du navigateur avant que
 * le formateur ne clique sur démarrer/clôturer. Grâce au maximumAge ci-dessus,
 * si cet appel a réussi récemment, le clic sur démarrer/clôturer réutilise
 * cette position déjà en cache au lieu d'attendre une nouvelle acquisition —
 * c'était la principale source de lenteur ressentie sur ces deux actions.
 * À appeler au chargement de la page Séances (pas d'effet si déjà en échec :
 * le flux normal de demande de localisation prendra le relais comme avant).
 */
export function warmUpSessionGeolocation(): void {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      storePosition({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    },
    () => { /* ignoré : le flux démarrer/clôturer redemandera si besoin */ },
    { enableHighAccuracy: true, timeout: 25000, maximumAge: 120000 },
  );
}

/**
 * Géolocalisation obligatoire pour début/fin de séance.
 * Fonctionne sans internet (GPS de l'appareil). Position mise en cache pour reprise hors ligne.
 */
export async function requireSessionGeolocation(
  phase: 'debut' | 'fin',
  options?: { allowCached?: boolean },
): Promise<SessionGeoPosition> {
  const label = phase === 'debut' ? 'démarrage' : 'clôture';
  if (!navigator.geolocation) {
    throw new Error(
      `La géolocalisation est obligatoire pour le ${label} de séance. Votre appareil ne la prend pas en charge.`,
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const result: SessionGeoPosition = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          precisionMetres: pos.coords.accuracy,
        };
        storePosition(result);
        resolve(result);
      },
      (err) => {
        if (options?.allowCached) {
          const cached = readStoredPosition();
          if (cached) {
            resolve({ ...cached });
            return;
          }
        }
        if (err?.code === 1) {
          reject(
            new Error(
              `Autorisez l'accès à la localisation dans votre navigateur pour le ${label} de séance.`,
            ),
          );
          return;
        }
        if (err?.code === 2) {
          reject(
            new Error(
              `Position GPS indisponible. Activez la localisation de l'appareil pour le ${label} de séance.`,
            ),
          );
          return;
        }
        reject(new Error(`Impossible d'obtenir la position pour le ${label}. Réessayez.`));
      },
      {
        enableHighAccuracy: true,
        timeout: 25000,
        // maximumAge : réutilise une position déjà obtenue par le navigateur il y a
        // moins de 2 min au lieu de forcer une nouvelle acquisition GPS (qui peut
        // prendre plusieurs secondes, surtout en intérieur). Aucune validation
        // serveur ne dépend de la fraîcheur exacte de cette position (stockée pour
        // audit/affichage uniquement) — voir warmUpSessionGeolocation ci-dessous,
        // qui pré-charge cette position dès l'ouverture de la page Séances pour que
        // démarrer/clôturer répondent quasi instantanément dans le cas courant.
        maximumAge: 120000,
      },
    );
  });
}
