import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { userService } from '../services/api';

function parseOuverte(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
  if (typeof value === 'number') return value === 1;
  return false;
}

interface InscriptionsSettingsContextValue {
  ouverte: boolean;
  loading: boolean;
  toggling: boolean;
  setOuverte: (next: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

const InscriptionsSettingsContext = createContext<InscriptionsSettingsContextValue | null>(null);

export function InscriptionsSettingsProvider({ children }: { children: React.ReactNode }) {
  const { hasRole } = useAuth();
  const isDirecteur = hasRole('DIRECTEUR');
  const [ouverte, setOuverteState] = useState(false);
  const [loading, setLoading] = useState(isDirecteur);
  const [toggling, setToggling] = useState(false);
  const lockRef = useRef(false);
  const ouverteRef = useRef(false);

  useEffect(() => {
    ouverteRef.current = ouverte;
  }, [ouverte]);

  const refresh = useCallback(async () => {
    if (!isDirecteur) {
      setLoading(false);
      return;
    }
    try {
      const res = await userService.getInscriptionsFormateursStatut();
      const value = parseOuverte(res.data?.ouverte);
      ouverteRef.current = value;
      setOuverteState(value);
    } catch {
      // Ne pas écraser un état déjà connu en cas d'erreur réseau
    } finally {
      setLoading(false);
    }
  }, [isDirecteur]);

  useEffect(() => {
    if (isDirecteur) {
      setLoading(true);
      refresh();
    } else {
      setLoading(false);
    }
  }, [isDirecteur, refresh]);

  const setOuverte = useCallback(async (next: boolean) => {
    if (!isDirecteur || lockRef.current || loading) return;
    if (ouverteRef.current === next) return;

    lockRef.current = true;
    setToggling(true);
    const previous = ouverteRef.current;
    ouverteRef.current = next;
    setOuverteState(next);

    try {
      const res = await userService.setInscriptionsFormateursStatut(next);
      const confirmed = parseOuverte(res.data?.ouverte);
      ouverteRef.current = confirmed;
      setOuverteState(confirmed);
      toast.success(
        res.data?.message ||
          (confirmed
            ? 'Inscriptions ouvertes — le bouton est visible sur le site.'
            : 'Inscriptions fermées — le bouton est masqué sur le site.'),
      );
    } catch {
      ouverteRef.current = previous;
      setOuverteState(previous);
      toast.error('Impossible de modifier le statut des inscriptions.');
    } finally {
      setToggling(false);
      // Petit délai pour éviter un double-clic immédiat
      setTimeout(() => {
        lockRef.current = false;
      }, 300);
    }
  }, [isDirecteur, loading]);

  return (
    <InscriptionsSettingsContext.Provider
      value={{ ouverte, loading, toggling, setOuverte, refresh }}
    >
      {children}
    </InscriptionsSettingsContext.Provider>
  );
}

export function useInscriptionsSettings() {
  const ctx = useContext(InscriptionsSettingsContext);
  if (!ctx) {
    throw new Error('useInscriptionsSettings doit être utilisé dans InscriptionsSettingsProvider');
  }
  return ctx;
}
