/**
 * Helpers localisation centres — liens Google Maps ↔ coordonnées GPS.
 */

export type LatLng = { latitude: number; longitude: number };

const LAT_LNG_PAIR =
  /(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)/;

/**
 * Extrait latitude / longitude depuis un lien Google Maps ou un texte "lat, lng".
 */
export function parseLocationInput(raw: string): LatLng | null {
  const input = (raw || '').trim();
  if (!input) return null;

  // @lat,lng,zoom (URL Maps classique)
  const atMatch = input.match(/@(-?\d+\.?\d*),\s*(-?\d+\.?\d*)(?:,\d+\.?\d*z)?/i);
  if (atMatch) {
    return toLatLng(atMatch[1], atMatch[2]);
  }

  // !3dLAT!4dLNG
  const dMatch = input.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/i);
  if (dMatch) {
    return toLatLng(dMatch[1], dMatch[2]);
  }

  // query= / q= / destination=
  const queryMatch = input.match(
    /(?:[?&](?:q|query|destination|ll)=)(-?\d+\.?\d*)[,+](-?\d+\.?\d*)/i,
  );
  if (queryMatch) {
    return toLatLng(queryMatch[1], queryMatch[2]);
  }

  // place/.../data=... parfois avec /@ déjà couvert ; sinon paire libre
  const pairMatch = input.match(LAT_LNG_PAIR);
  if (pairMatch) {
    return toLatLng(pairMatch[1], pairMatch[2]);
  }

  return null;
}

function toLatLng(latStr: string, lngStr: string): LatLng | null {
  const latitude = Number(latStr);
  const longitude = Number(lngStr);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

/** Lien pour voir le point sur Google Maps */
export function googleMapsViewUrl(lat: number, lng: number, label?: string): string {
  const q = label
    ? encodeURIComponent(`${label}@${lat},${lng}`)
    : `${lat},${lng}`;
  return `https://www.google.com/maps?q=${q}`;
}

/** Lien itinéraire Google Maps */
export function googleMapsDirectionsUrl(
  dest: LatLng,
  origin?: LatLng | null,
  mode: 'walking' | 'driving' = 'driving',
): string {
  const destination = `${dest.latitude},${dest.longitude}`;
  const originPart = origin ? `&origin=${origin.latitude},${origin.longitude}` : '';
  return `https://www.google.com/maps/dir/?api=1${originPart}&destination=${destination}&travelmode=${mode}`;
}

export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function getCurrentPositionAsync(
  options?: PositionOptions,
): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalisation non disponible sur cet appareil.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => reject(new Error('Impossible de récupérer votre position. Autorisez la localisation.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0, ...options },
    );
  });
}

/** Distance en km entre deux points GPS (formule haversine). */
export function haversineDistanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km)) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

const POSITION_STORAGE_KEY = 'ska_my_position';

export function readStoredPosition(): LatLng | null {
  try {
    const raw = sessionStorage.getItem(POSITION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LatLng;
    if (Number.isFinite(parsed?.latitude) && Number.isFinite(parsed?.longitude)) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function storePosition(pos: LatLng): void {
  try {
    sessionStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(pos));
  } catch {
    /* ignore */
  }
}
