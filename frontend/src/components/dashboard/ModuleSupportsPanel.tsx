import React, { useEffect, useState } from 'react';
import { Download, ExternalLink, FileText, Image as ImageIcon, Loader2, Video } from 'lucide-react';
import { serieSupportService } from '../../services/api';
import type { SerieSupportCours, SupportCoursFichier } from '../../types';
import { mediaUrl } from '../../utils/media';

function fileKindIcon(name: string, mime?: string) {
  const lower = name.toLowerCase();
  if (mime?.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg)$/i.test(lower)) {
    return <ImageIcon className="w-4 h-4 shrink-0" />;
  }
  if (mime?.startsWith('video/') || /\.(mp4|webm|mov|avi)$/i.test(lower)) {
    return <Video className="w-4 h-4 shrink-0" />;
  }
  return <FileText className="w-4 h-4 shrink-0" />;
}

type Props = {
  moduleId?: number | null;
  series?: SerieSupportCours[];
  variant?: 'default' | 'dark';
  className?: string;
};

export default function ModuleSupportsPanel({
  moduleId,
  series: seriesProp,
  variant = 'default',
  className = '',
}: Props) {
  const [series, setSeries] = useState<SerieSupportCours[]>(seriesProp ?? []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (seriesProp) {
      setSeries(seriesProp);
      return;
    }
    if (!moduleId) {
      setSeries([]);
      return;
    }
    setLoading(true);
    serieSupportService.list({ moduleId })
      .then((res) => setSeries(res.data || []))
      .catch(() => setSeries([]))
      .finally(() => setLoading(false));
  }, [moduleId, seriesProp]);

  if (!moduleId && !seriesProp?.length) return null;

  const isDark = variant === 'dark';
  const wrapperClass = isDark
    ? `rounded-xl border border-dark-600 bg-dark-900/50 p-3 ${className}`
    : `rounded-xl border border-slate-200 bg-slate-50 p-4 ${className}`;
  const titleClass = isDark ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-900';
  const emptyClass = isDark ? 'text-xs italic text-dark-500' : 'text-xs italic text-slate-400';
  const linkClass = isDark
    ? 'text-primary-300 hover:text-primary-200'
    : 'text-primary-700 hover:text-primary-800';
  const serieTitleClass = isDark ? 'text-xs font-bold text-primary-300' : 'text-xs font-bold text-primary-800';
  const mutedClass = isDark ? 'text-[11px] text-dark-500' : 'text-[11px] text-slate-500';

  return (
    <div className={wrapperClass}>
      <p className={titleClass}>Supports de cours</p>

      {loading ? (
        <p className={`${emptyClass} mt-2 inline-flex items-center gap-2`}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement…
        </p>
      ) : series.length === 0 ? (
        <p className={`${emptyClass} mt-2`}>
          Aucune série de supports publiée pour ce module.
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          {series.map((serie) => {
            const fichiers = serie.fichiers ?? [];
            return (
              <div key={serie.id}>
                <p className={serieTitleClass}>{serie.titre}</p>
                {serie.description && (
                  <p className={`${mutedClass} mt-0.5 line-clamp-2`}>{serie.description}</p>
                )}
                {fichiers.length === 0 ? (
                  <p className={`${emptyClass} mt-1`}>Aucun fichier dans cette série.</p>
                ) : (
                  <ul className="mt-1.5 space-y-1">
                    {fichiers.map((f: SupportCoursFichier, idx) => (
                      <li key={`${f.id ?? f.url}-${idx}`}>
                        <a
                          href={mediaUrl(f.url)}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center gap-2 text-sm font-medium hover:underline ${linkClass}`}
                        >
                          {fileKindIcon(f.nom, f.mimeType)}
                          <span className="truncate max-w-[240px]">{f.nom}</span>
                          <Download className="w-3.5 h-3.5 shrink-0 opacity-70" />
                          <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
