import React, { useEffect, useState } from 'react';
import { ExternalLink, FileText, Loader2 } from 'lucide-react';
import { fetchSecureMediaBlobUrl, isSecureMediaPath, mediaUrl } from '../../utils/media';
import type { Transaction } from '../../types';

function isImageProof(tx: Transaction) {
  const t = (tx.justificatifType || '').toLowerCase();
  const name = (tx.justificatifNom || tx.justificatifUrl || '').toLowerCase();
  return t.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/.test(name);
}

function isPdfProof(tx: Transaction) {
  const t = (tx.justificatifType || '').toLowerCase();
  const name = (tx.justificatifNom || tx.justificatifUrl || '').toLowerCase();
  return t.includes('pdf') || name.endsWith('.pdf');
}

interface SecureProofViewerProps {
  tx: Transaction;
}

/** Affiche un justificatif protégé (image / PDF / lien) avec JWT. */
export default function SecureProofViewer({ tx }: SecureProofViewerProps) {
  const [src, setSrc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const path = tx.justificatifUrl;

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
      setLoading(true);
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
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [path]);

  if (!path) return null;

  if (loading) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-slate-500 gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Chargement du justificatif…
      </div>
    );
  }

  if (error || !src) {
    return <p className="text-sm text-red-600">Impossible de charger le justificatif.</p>;
  }

  return (
    <>
      <div className="flex items-center justify-end mb-2">
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-[#004b57] inline-flex items-center gap-1 hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Ouvrir
        </a>
      </div>
      <p className="text-xs text-slate-500 mb-3 truncate">
        {tx.justificatifNom || 'Fichier joint'}
      </p>
      {isImageProof(tx) ? (
        <img
          src={src}
          alt="Justificatif"
          className="max-h-80 w-full object-contain rounded-lg border border-slate-100 bg-slate-50"
        />
      ) : isPdfProof(tx) ? (
        <iframe
          title="Justificatif PDF"
          src={src}
          className="w-full h-80 rounded-lg border border-slate-200"
        />
      ) : (
        <a href={src} target="_blank" rel="noreferrer" className="btn-primary inline-flex">
          <FileText className="w-4 h-4" />
          Télécharger le document
        </a>
      )}
    </>
  );
}
