import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Image, Video, FileText } from 'lucide-react';
import type { Publication } from '../../types';
import { mediaUrl, youtubeEmbedUrl } from '../../utils/media';

interface Props {
  publication: Publication;
  onClose: () => void;
}

export default function PublicationModal({ publication, onClose }: Props) {
  const yt = youtubeEmbedUrl(publication.lienExterne);
  const [mediaReady, setMediaReady] = useState(false);

  useEffect(() => {
    setMediaReady(false);
  }, [publication.id, publication.mediaUrl, publication.type, publication.lienExterne]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="modal-overlay z-[100]" role="presentation" onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="publication-modal-title"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="modal-panel modal-panel-lg relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="p-2 rounded-lg bg-[#004b57]/10 text-[#004b57] shrink-0">
              {publication.type === 'IMAGE' && <Image className="w-4 h-4" />}
              {publication.type === 'VIDEO' && <Video className="w-4 h-4" />}
              {publication.type === 'TEXTE' && <FileText className="w-4 h-4" />}
            </span>
            <div className="min-w-0">
              <h2 id="publication-modal-title" className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {publication.titre}
              </h2>
              {publication.description && (
                <p className="text-slate-500 text-xs sm:text-sm mt-1 line-clamp-2">{publication.description}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors shrink-0"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="modal-body">
          {publication.type === 'IMAGE' && (publication.mediaUrl || publication.lienExterne) && (
            <div className="relative rounded-xl border border-slate-200 overflow-hidden">
              {!mediaReady && <div className="skeleton-block h-48 sm:h-64 w-full" />}
              <img
                src={mediaUrl(publication.mediaUrl || publication.lienExterne)}
                alt={publication.titre}
                onLoad={() => setMediaReady(true)}
                className={`w-full max-h-[50vh] object-contain bg-slate-50 transition-opacity duration-300 ${
                  mediaReady ? 'opacity-100' : 'opacity-0 absolute inset-0'
                }`}
              />
            </div>
          )}

          {publication.type === 'VIDEO' && (
            <>
              {yt ? (
                <div className="aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  {!mediaReady && <div className="skeleton-block h-full w-full" />}
                  <iframe
                    src={yt}
                    title={publication.titre}
                    onLoad={() => setMediaReady(true)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : publication.mediaUrl || publication.lienExterne ? (
                <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                  {!mediaReady && <div className="skeleton-block h-48 sm:h-64 w-full" />}
                  <video
                    controls
                    className={`w-full max-h-[50vh] transition-opacity duration-300 ${
                      mediaReady ? 'opacity-100' : 'opacity-0 absolute inset-0'
                    }`}
                    onLoadedData={() => setMediaReady(true)}
                    src={mediaUrl(publication.mediaUrl || publication.lienExterne)}
                  />
                </div>
              ) : null}
            </>
          )}

          {publication.contenu && (
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed whitespace-pre-wrap">
              {publication.contenu}
            </p>
          )}

          {!publication.contenu &&
            !publication.mediaUrl &&
            !publication.lienExterne &&
            publication.description && (
              <p className="text-sm text-slate-600 leading-relaxed">{publication.description}</p>
            )}
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-primary w-full sm:w-auto justify-center px-6">
            Fermer
          </button>
        </div>
      </motion.div>
    </div>
  );
}
