import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User, Role } from '../types';
import { authService } from '../services/api';
import toast from 'react-hot-toast';
import {
  clearAuthSession,
  getAuthToken,
  getAuthUserRaw,
  getRefreshToken,
  persistAuthSession,
} from '../utils/authStorage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: Role | null;
  login: (email: string, motDePasse: string) => Promise<void>;
  loginParent: (matricule: string, motDePasse: string) => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => void;
  updateUser: (partial: Partial<User>) => void;
  hasRole: (...roles: Role[]) => boolean;
}

function isPublicAuthPath(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path.startsWith('/connexion') || path.startsWith('/inscription-formateur');
}

function readStoredSession(): { token: string | null; user: User | null } {
  if (isPublicAuthPath()) {
    clearAuthSession();
    return { token: null, user: null };
  }

  const savedToken = getAuthToken();
  const savedUser = getAuthUserRaw();
  if (!savedToken || !savedUser) {
    return { token: null, user: null };
  }

  try {
    return { token: savedToken, user: JSON.parse(savedUser) as User };
  } catch {
    clearAuthSession();
    return { token: null, user: null };
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialSession = readStoredSession();
  const [user, setUser] = useState<User | null>(initialSession.user);
  const [token, setToken] = useState<string | null>(initialSession.token);
  const [isLoading, setIsLoading] = useState(false);

  const clearSession = useCallback(() => {
    clearAuthSession();
    setToken(null);
    setUser(null);
  }, []);

  const persistSession = (newToken: string, refreshToken: string, userData: User) => {
    persistAuthSession(newToken, refreshToken, JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const login = useCallback(async (email: string, motDePasse: string) => {
    setIsLoading(true);
    try {
      const { data } = await authService.login(email, motDePasse);
      const { token: newToken, refreshToken, user: userData } = data;
      persistSession(newToken, refreshToken, userData);
      toast.success(`Bienvenue, ${userData.prenom} !`);
    } catch (error: unknown) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginParent = useCallback(async (matricule: string, motDePasse: string) => {
    setIsLoading(true);
    try {
      const { data } = await authService.loginParent(matricule, motDePasse);
      const { token: newToken, refreshToken, user: userData } = data;
      persistSession(newToken, refreshToken, userData);
      const enfant = data.eleve;
      toast.success(
        enfant
          ? `Bienvenue — suivi de ${enfant.prenom} ${enfant.nom}`
          : 'Bienvenue dans l’espace parent.',
      );
    } catch (error: unknown) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      await authService.logout(refreshToken);
    } catch {
      // La session locale doit être supprimée même si le serveur est indisponible.
    }
    clearSession();
    toast.success('Déconnexion réussie.');
  }, [clearSession]);

  const updateUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      persistAuthSession(getAuthToken() || '', getRefreshToken() || '', JSON.stringify(next));
      return next;
    });
  }, []);

  const hasRole = useCallback((...roles: Role[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token && !!user,
      isLoading,
      role: user?.role ?? null,
      login,
      loginParent,
      logout,
      clearSession,
      updateUser,
      hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return context;
};
