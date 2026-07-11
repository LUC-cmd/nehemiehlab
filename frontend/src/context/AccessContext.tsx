import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { accessService } from '../services/api';
import { useAuth } from './AuthContext';
import {
  DEFAULT_FEATURES_BY_ROLE,
  type FeatureId,
  type DashboardPage,
} from '../constants/roleAccess';
import type { Role } from '../types';

type AccessContextValue = {
  features: Set<string>;
  loading: boolean;
  hasFeature: (feature: FeatureId | string) => boolean;
  canSeePage: (page: DashboardPage) => boolean;
  refresh: () => Promise<void>;
};

const AccessContext = createContext<AccessContextValue | null>(null);

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const { user, role, isAuthenticated } = useAuth();
  const [features, setFeatures] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !role) {
      setFeatures(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await accessService.getMyAccess();
      const list: string[] = Array.isArray(data?.features) ? data.features : [];
      // Directeur : toujours permissions + utilisateurs
      if (role === 'DIRECTEUR') {
        if (!list.includes('permissions')) list.push('permissions');
        if (!list.includes('utilisateurs')) list.push('utilisateurs');
      }
      setFeatures(new Set(list.length ? list : DEFAULT_FEATURES_BY_ROLE[role as Role] || []));
    } catch {
      setFeatures(new Set(DEFAULT_FEATURES_BY_ROLE[role as Role] || []));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, role]);

  useEffect(() => {
    refresh();
  }, [refresh, user?.id]);

  const hasFeature = useCallback(
    (feature: FeatureId | string) => features.has(feature),
    [features],
  );

  const canSeePage = useCallback(
    (page: DashboardPage) => features.has(page),
    [features],
  );

  const value = useMemo(
    () => ({ features, loading, hasFeature, canSeePage, refresh }),
    [features, loading, hasFeature, canSeePage, refresh],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) {
    // Fallback sûr hors provider
    return {
      features: new Set<string>(),
      loading: false,
      hasFeature: () => true,
      canSeePage: () => true,
      refresh: async () => {},
    } satisfies AccessContextValue;
  }
  return ctx;
}
