import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/** Affiche une barre de progression brève à chaque changement de route. */
export function useRouteTransition(minVisibleMs = 380) {
  const location = useLocation();
  const [active, setActive] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startedRef = useRef(0);

  useEffect(() => {
    setActive(true);
    startedRef.current = Date.now();

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      const elapsed = Date.now() - startedRef.current;
      const remaining = Math.max(minVisibleMs - elapsed, 0);
      window.setTimeout(() => setActive(false), remaining);
    }, 120);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [location.pathname, minVisibleMs]);

  return active;
}
