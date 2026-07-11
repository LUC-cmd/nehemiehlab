import React, { useEffect, useState } from 'react';
import { fetchSecureMediaBlobUrl, isSecureMediaPath, mediaUrl } from '../../utils/media';

interface SecureImageProps {
  path?: string | null;
  alt: string;
  className?: string;
}

/** Affiche une image publique ou protégée (CNI / justificatifs) avec JWT. */
export default function SecureImage({ path, alt, className }: SecureImageProps) {
  const [src, setSrc] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;

    const load = async () => {
      setError(false);
      if (!path) {
        setSrc('');
        return;
      }
      if (!isSecureMediaPath(path)) {
        setSrc(mediaUrl(path));
        return;
      }
      try {
        const blobUrl = await fetchSecureMediaBlobUrl(path);
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        revoked = blobUrl;
        setSrc(blobUrl);
      } catch {
        if (!cancelled) {
          setError(true);
          setSrc('');
        }
      }
    };

    load();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [path]);

  if (!path || error) {
    return (
      <div className={`flex items-center justify-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-300 ${className || ''}`}>
        {error ? 'Accès refusé' : 'Aucune photo'}
      </div>
    );
  }

  if (!src) {
    return (
      <div className={`flex items-center justify-center text-xs text-slate-400 bg-slate-50 ${className || ''}`}>
        Chargement…
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} />;
}
