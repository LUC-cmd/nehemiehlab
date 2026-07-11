import { useEffect, useRef, useState } from 'react';

export function useMinDelayLoading(loading: boolean, minMs = 220): boolean {
  const [visible, setVisible] = useState(loading);
  const startRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (loading) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      startRef.current = Date.now();
      setVisible(true);
      return;
    }

    const elapsed = Date.now() - startRef.current;
    const remaining = Math.max(minMs - elapsed, 0);

    if (remaining === 0) {
      setVisible(false);
      return;
    }

    timerRef.current = window.setTimeout(() => {
      setVisible(false);
      timerRef.current = null;
    }, remaining);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [loading, minMs]);

  return visible;
}
