const KEYS = ['nehemiah_token', 'nehemiah_refresh', 'nehemiah_user'] as const;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
    return;
  } catch {
    // Safari privé / mobile : repli sessionStorage pour la démo.
  }
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function getAuthToken(): string | null {
  return read('nehemiah_token');
}

export function getRefreshToken(): string | null {
  return read('nehemiah_refresh');
}

export function getAuthUserRaw(): string | null {
  return read('nehemiah_user');
}

export function persistAuthSession(token: string, refreshToken: string, userJson: string): void {
  write('nehemiah_token', token);
  write('nehemiah_refresh', refreshToken);
  write('nehemiah_user', userJson);
}

export function clearAuthSession(): void {
  KEYS.forEach(remove);
}
