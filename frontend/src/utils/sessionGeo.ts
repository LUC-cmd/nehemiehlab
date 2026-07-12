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
        maximumAge: phase === 'debut' ? 120000 : 0,
      },
    );
  });
}
