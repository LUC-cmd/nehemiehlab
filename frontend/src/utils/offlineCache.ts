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

export async function fetchWithOfflineCache<T>(
  rawKey: string,
  fetcher: () => Promise<T>,
): Promise<{ data: T; fromCache: boolean }> {
  try {
    const data = await fetcher();
    writeCache(rawKey, data);
    return { data, fromCache: false };
  } catch (error) {
    const cached = readCache<T>(rawKey);
    if (cached !== null) {
      return { data: cached, fromCache: true };
    }
    throw error;
  }
}
