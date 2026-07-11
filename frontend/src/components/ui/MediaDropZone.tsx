import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { FileText, Image as ImageIcon, Link2, Upload, Video, X } from 'lucide-react';
import { safeExternalUrl } from '../../utils/safeUrl';

export type MediaDropKind = 'image' | 'video' | 'document' | 'other';

export interface MediaDropExistingFile {
  id?: number | string;
  name: string;
  url?: string;
  kind?: MediaDropKind;
}

interface MediaDropZoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  maxFiles?: number;
  maxSizeMb?: number;
  disabled?: boolean;
  label?: string;
  hint?: string;
  /** Fichiers déjà enregistrés (affichage + retrait optionnel) */
  existingFiles?: MediaDropExistingFile[];
  onRemoveExisting?: (file: MediaDropExistingFile, index: number) => void;
  /** Si fourni, un lien collé (Ctrl+V) est transmis ici au lieu d’être ignoré */
  onUrlPaste?: (url: string) => void;
  className?: string;
  compact?: boolean;
}

function detectKind(file: File | MediaDropExistingFile): MediaDropKind {
  if ('type' in file && file.type) {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (
      file.type.includes('pdf') ||
      file.type.includes('word') ||
      file.type.includes('sheet') ||
      file.type.includes('presentation') ||
      file.type.includes('text')
    ) {
      return 'document';
    }
    return 'other';
  }
  if ('kind' in file && file.kind) return file.kind;
  const name = ('name' in file ? file.name : '').toLowerCase();
  if (/\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(name)) return 'image';
  if (/\.(mp4|webm|mov|avi|mkv)$/i.test(name)) return 'video';
  if (/\.(pdf|docx?|xlsx?|pptx?|txt|csv)$/i.test(name)) return 'document';
  return 'other';
}

function KindIcon({ kind }: { kind: MediaDropKind }) {
  if (kind === 'image') return <ImageIcon className="w-4 h-4" />;
  if (kind === 'video') return <Video className="w-4 h-4" />;
  if (kind === 'document') return <FileText className="w-4 h-4" />;
  return <Upload className="w-4 h-4" />;
}

function acceptMatches(file: File, accept?: string) {
  if (!accept || accept === '*' || accept === '*/*') return true;
  const tokens = accept.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
  const name = file.name.toLowerCase();
  const type = (file.type || '').toLowerCase();
  return tokens.some((token) => {
    if (token.endsWith('/*')) {
      const prefix = token.slice(0, -1);
      return type.startsWith(prefix);
    }
    if (token.startsWith('.')) return name.endsWith(token);
    return type === token;
  });
}

export default function MediaDropZone({
  files,
  onChange,
  multiple = false,
  accept,
  maxFiles = 20,
  maxSizeMb = 100,
  disabled = false,
  label,
  hint,
  existingFiles = [],
  onRemoveExisting,
  onUrlPaste,
  className = '',
  compact = false,
}: MediaDropZoneProps) {
  const inputId = useId();
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const fileKey = useCallback((file: File, index: number) => `${file.name}-${file.size}-${file.lastModified}-${index}`, []);

  useEffect(() => {
    const next: Record<string, string> = {};
    const urls: string[] = [];
    files.forEach((file, index) => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        next[fileKey(file, index)] = url;
        urls.push(url);
      }
    });
    setPreviews(next);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files, fileKey]);

  const remainingSlots = useMemo(() => {
    if (!multiple) return files.length > 0 ? 0 : 1;
    return Math.max(0, maxFiles - files.length - existingFiles.length);
  }, [multiple, maxFiles, files.length, existingFiles.length]);

  const mergeFiles = useCallback(
    (incoming: File[]) => {
      setError(null);
      if (!incoming.length) return;

      const maxBytes = maxSizeMb * 1024 * 1024;
      const valid: File[] = [];
      for (const file of incoming) {
        if (!acceptMatches(file, accept)) {
          setError(`Type non accepté : ${file.name}`);
          continue;
        }
        if (file.size > maxBytes) {
          setError(`« ${file.name} » dépasse ${maxSizeMb} Mo.`);
          continue;
        }
        valid.push(file);
      }
      if (!valid.length) return;

      if (!multiple) {
        onChange([valid[0]]);
        return;
      }

      const room = Math.max(0, maxFiles - files.length - existingFiles.length);
      if (room <= 0) {
        setError(`Maximum ${maxFiles} fichier(s).`);
        return;
      }
      onChange([...files, ...valid.slice(0, room)]);
    },
    [accept, existingFiles.length, files, maxFiles, maxSizeMb, multiple, onChange],
  );

  const removeLocal = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  const onPaste = (e: React.ClipboardEvent) => {
    if (disabled) return;
    const items = e.clipboardData?.items;
    const pastedFiles: File[] = [];
    if (items) {
      for (const item of Array.from(items)) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }
    }
    if (pastedFiles.length) {
      e.preventDefault();
      mergeFiles(pastedFiles);
      return;
    }
    const text = e.clipboardData?.getData('text')?.trim();
    if (text && onUrlPaste && /^https?:\/\//i.test(text)) {
      e.preventDefault();
      const safeUrl = safeExternalUrl(text);
      if (!safeUrl) {
        setError('Lien refusé : utilisez une URL HTTPS publique valide.');
        return;
      }
      setError(null);
      onUrlPaste(safeUrl);
    }
  };

  const hasContent = files.length > 0 || existingFiles.length > 0;

  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <div
        tabIndex={0}
        onPaste={onPaste}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (disabled) return;
          mergeFiles(Array.from(e.dataTransfer.files || []));
        }}
        className={`relative rounded-xl border-2 border-dashed transition-colors outline-none focus-visible:border-[#004b57]/50 ${
          compact ? 'p-3' : 'p-4'
        } ${
          disabled
            ? 'opacity-60 cursor-not-allowed border-slate-200 bg-slate-50'
            : dragOver
              ? 'border-[#004b57] bg-[#004b57]/5'
              : 'border-slate-200 bg-slate-50 hover:border-[#004b57]/35'
        }`}
      >
        {!hasContent && (
          <div className={`text-center ${compact ? 'py-3' : 'py-6'}`}>
            <Upload className={`mx-auto text-slate-400 mb-2 ${compact ? 'w-6 h-6' : 'w-8 h-8'}`} />
            <p className="text-sm text-slate-600">
              Glissez-déposez{multiple ? ' vos fichiers' : ''} ou collez (Ctrl+V)
            </p>
            {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
            <label
              htmlFor={inputId}
              className={`inline-flex mt-3 btn-ghost text-xs ${disabled ? 'pointer-events-none' : 'cursor-pointer'}`}
            >
              Parcourir…
            </label>
          </div>
        )}

        {hasContent && (
          <div className="space-y-2">
            {existingFiles.map((file, index) => {
              const kind = detectKind(file);
              return (
                <div
                  key={`existing-${file.id ?? file.url ?? file.name}-${index}`}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  {kind === 'image' && file.url ? (
                    <img src={file.url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                  ) : (
                    <span className="w-10 h-10 rounded bg-[#004b57]/10 text-[#004b57] flex items-center justify-center shrink-0">
                      <KindIcon kind={kind} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800 truncate">{file.name}</p>
                    <p className="text-[11px] text-slate-500">Déjà enregistré</p>
                  </div>
                  {onRemoveExisting && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onRemoveExisting(file, index)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"
                      aria-label="Retirer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            {files.map((file, index) => {
              const kind = detectKind(file);
              const preview = previews[fileKey(file, index)];
              return (
                <div
                  key={fileKey(file, index)}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  {kind === 'image' && preview ? (
                    <img src={preview} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                  ) : kind === 'video' && preview ? (
                    <video src={preview} className="w-10 h-10 rounded object-cover shrink-0" muted />
                  ) : (
                    <span className="w-10 h-10 rounded bg-[#004b57]/10 text-[#004b57] flex items-center justify-center shrink-0">
                      <KindIcon kind={kind} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800 truncate">{file.name}</p>
                    <p className="text-[11px] text-slate-500">{(file.size / 1024).toFixed(0)} Ko · nouveau</p>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeLocal(index)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"
                    aria-label="Retirer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {(multiple ? remainingSlots > 0 : files.length === 0) && (
              <label
                htmlFor={inputId}
                className={`inline-flex items-center gap-1.5 text-xs font-medium text-[#004b57] ${
                  disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:underline'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Ajouter {multiple ? 'd’autres fichiers' : 'un fichier'}
              </label>
            )}
          </div>
        )}

        <input
          id={inputId}
          type="file"
          className="sr-only"
          multiple={multiple}
          accept={accept}
          disabled={disabled}
          onChange={(e) => {
            mergeFiles(Array.from(e.target.files || []));
            e.target.value = '';
          }}
        />
      </div>
      {onUrlPaste && (
        <p className="mt-1.5 text-[11px] text-slate-500 inline-flex items-center gap-1">
          <Link2 className="w-3 h-3" />
          Vous pouvez aussi coller un lien (Ctrl+V) dans la zone.
        </p>
      )}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
