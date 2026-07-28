import { useEffect, useState } from 'react';
import { siteService } from '../services/api';

/**
 * Cache partagé au niveau du module : évite de refaire le même appel réseau
 * quand plusieurs composants (en-tête, pied de page, page d'accueil) sont
 * montés en même temps et utilisent tous ce hook — sans ce cache, la même
 * requête partait 3 fois au chargement de la page d'accueil.
 */
let cachedPromise: ReturnType<typeof siteService.getInscriptionsFormateurs> | null = null;

function fetchInscriptionsOnce() {
  if (!cachedPromise) {
    cachedPromise = siteService.getInscriptionsFormateurs().catch((err) => {
      // Permet une nouvelle tentative au prochain montage si l'appel a échoué.
      cachedPromise = null;
      throw err;
    });
  }
  return cachedPromise;
}

/** Statut public : le Directeur ouvre/ferme les inscriptions formateurs. */
export function useInscriptionFormateursOuverte() {
  const [ouverte, setOuverte] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchInscriptionsOnce()
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
