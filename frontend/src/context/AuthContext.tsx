import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Role } from '../types';
import { authService } from '../services/api';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: Role | null;
  login: (email: string, motDePasse: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaurer la session depuis le localStorage au démarrage
  useEffect(() => {
    const savedToken = localStorage.getItem('nehemiah_token');
    const savedUser = localStorage.getItem('nehemiah_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('nehemiah_token');
        localStorage.removeItem('nehemiah_user');
        localStorage.removeItem('nehemiah_refresh');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, motDePasse: string) => {
    setIsLoading(true);
    try {
      const { data } = await authService.login(email, motDePasse);
      const { token: newToken, refreshToken, user: userData } = data;

      localStorage.setItem('nehemiah_token', newToken);
      localStorage.setItem('nehemiah_refresh', refreshToken);
      localStorage.setItem('nehemiah_user', JSON.stringify(userData));

      setToken(newToken);
      setUser(userData);

      toast.success(`Bienvenue, ${userData.prenom} !`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err?.response?.data?.message || 'Email ou mot de passe incorrect.';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('nehemiah_token');
    localStorage.removeItem('nehemiah_refresh');
    localStorage.removeItem('nehemiah_user');
    setToken(null);
    setUser(null);
    toast.success('Déconnexion réussie.');
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
      logout,
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
