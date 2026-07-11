import { useEffect, useState } from 'react';
import { siteService } from '../services/api';

/** Statut public : le Directeur ouvre/ferme les inscriptions formateurs. */
export function useInscriptionFormateursOuverte() {
  const [ouverte, setOuverte] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    siteService
      .getInscriptionsFormateurs()
      .then((r) => {
        if (!cancelled) setOuverte(Boolean(r.data?.ouverte));
      })
      .catch(() => {
        if (!cancelled) setOuverte(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ouverte, loading };
}
