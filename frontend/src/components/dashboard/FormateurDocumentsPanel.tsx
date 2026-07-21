import React, { useEffect, useState } from 'react';
import { FileText, Upload, Trash2, Loader2, FileSignature, FolderKanban, Presentation } from 'lucide-react';
import toast from 'react-hot-toast';
import { formateurDocumentService } from '../../services/api';
import { fetchSecureMediaBlobUrl } from '../../utils/media';
import type { FormateurDocument, FormateurDocumentType } from '../../types';

interface Props {
  /** 'own' : le formateur gère ses propres documents. 'readonly' : le Directeur consulte ceux d'un formateur. */
  mode: 'own' | 'readonly';
  formateurId?: number;
}

const TYPE_CONFIG: Record<FormateurDocumentType, {
  label: string; hint: string; accept: string; icon: React.ReactNode;
  withTitre: boolean; titrePlaceholder?: string;
}> = {
  CONTRAT: {
    label: 'Contrat',
    hint: 'Déposez votre contrat signé (PDF, Word ou image). Le Directeur le voit dès l’envoi.',
    accept: '.pdf,.doc,.docx,image/*',
    icon: <FileSignature className="w-4 h-4" />,
    withTitre: false,
  },
  PROJET: {
    label: 'Projets réalisés (.sb3)',
    hint: 'Déposez vos projets Scratch (.sb3). Vous pouvez en ajouter autant que vous voulez.',
    accept: '.sb3',
    icon: <FolderKanban className="w-4 h-4" />,
    withTitre: true,
    titrePlaceholder: 'Nom du projet',
  },
  PRESENTATION: {
    label: 'Présentations',
    hint: 'Déposez les présentations (PowerPoint ou PDF) demandées par le Directeur.',
    accept: '.ppt,.pptx,.pdf',
    icon: <Presentation className="w-4 h-4" />,
    withTitre: true,
    titrePlaceholder: 'Titre de la présentation',
  },
};

const TYPES = Object.keys(TYPE_CONFIG) as FormateurDocumentType[];

export default function FormateurDocumentsPanel({ mode, formateurId }: Props) {
  const [docs, setDocs] = useState<FormateurDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<FormateurDocumentType | null>(null);
  const [titreDraft, setTitreDraft] = useState<Record<string, string>>({});
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = mode === 'own'
        ? await formateurDocumentService.listMine()
        : await formateurDocumentService.listForFormateur(formateurId as number);
      setDocs(data);
    } catch {
      toast.error('Impossible de charger les documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'readonly' && !formateurId) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, formateurId]);

  const handleUpload = async (type: FormateurDocumentType, file: File) => {
    setUploading(type);
    try {
      await formateurDocumentService.uploadMine(type, file, titreDraft[type]);
      setTitreDraft((p) => ({ ...p, [type]: '' }));
      toast.success('Fichier envoyé.');
      await load();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Échec de l'envoi du fichier.");
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await formateurDocumentService.deleteMine(id);
      setDocs((p) => p.filter((d) => d.id !== id));
    } catch {
      toast.error('Impossible de supprimer ce fichier.');
    }
  };

  const handleDownload = async (doc: FormateurDocument) => {
    setDownloadingId(doc.id);
    try {
      const blobUrl = await fetchSecureMediaBlobUrl(doc.url);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.nomFichierOriginal || doc.titre || 'document';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch {
      toast.error('Impossible de télécharger ce fichier.');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Chargement des documents…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {TYPES.map((type) => {
        const cfg = TYPE_CONFIG[type];
        const items = docs.filter((d) => d.type === type);
        return (
          <div key={type} className="space-y-2">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              {cfg.icon} {cfg.label}
            </p>
            <p className="text-xs text-slate-500">{cfg.hint}</p>

            {items.length > 0 ? (
              <ul className="space-y-1.5">
                {items.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => void handleDownload(doc)}
                      disabled={downloadingId === doc.id}
                      className="flex items-center gap-2 text-sm text-[#004b57] font-medium hover:underline min-w-0"
                    >
                      {downloadingId === doc.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="truncate">{doc.titre || doc.nomFichierOriginal || 'Fichier'}</span>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-slate-400">
                        {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                      {mode === 'own' && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(doc.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 italic">Aucun fichier déposé.</p>
            )}

            {mode === 'own' && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {cfg.withTitre && (
                  <input
                    type="text"
                    value={titreDraft[type] || ''}
                    onChange={(e) => setTitreDraft((p) => ({ ...p, [type]: e.target.value }))}
                    placeholder={cfg.titrePlaceholder}
                    className="input-field !py-1.5 !text-xs max-w-[200px]"
                  />
                )}
                <label
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer ${
                    uploading === type
                      ? 'opacity-60 pointer-events-none'
                      : 'border-[#004b57] text-[#004b57] hover:bg-[#004b57]/5'
                  }`}
                >
                  {uploading === type ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  Ajouter un fichier
                  <input
                    type="file"
                    accept={cfg.accept}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUpload(type, file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
