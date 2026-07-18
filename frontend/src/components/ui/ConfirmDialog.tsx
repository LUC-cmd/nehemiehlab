import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import ValidationActionButton from './ValidationActionButton';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  /**
   * Si renseigné, le bouton de confirmation reste désactivé tant que
   * l'utilisateur n'a pas retapé exactement ce texte dans le champ prévu.
   * Utile pour les actions irréversibles (suppression définitive, etc.).
   */
  requireTypedConfirmation?: string;
  typedConfirmationLabel?: React.ReactNode;
}

/**
 * Modale de confirmation réutilisable (déconnexion, suppressions, etc.).
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  danger = false,
  onConfirm,
  onCancel,
  requireTypedConfirmation,
  typedConfirmationLabel,
}: ConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState('');
  // Empeche les doubles soumissions : une fois "Confirmer" clique, le bouton
  // se desactive jusqu'a ce que onConfirm() se termine (succes ou erreur).
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || submitting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, submitting, onCancel]);

  useEffect(() => {
    if (!open) {
      setTypedValue('');
      setSubmitting(false);
    }
  }, [open]);

  const handleConfirmClick = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  const typedConfirmationOk = useMemo(
    () => !requireTypedConfirmation || typedValue.trim() === requireTypedConfirmation,
    [requireTypedConfirmation, typedValue],
  );

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="modal-overlay" role="presentation" onClick={submitting ? undefined : onCancel}>
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-desc"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            className="modal-panel modal-panel-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    danger ? 'bg-red-50 text-red-600' : 'bg-primary-50 text-primary-700'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 id="confirm-dialog-title" className="modal-title">
                    {title}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onCancel}
                disabled={submitting}
                className="modal-close disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="modal-body space-y-3">
              <p id="confirm-dialog-desc" className="text-sm text-slate-600 leading-relaxed">
                {message}
              </p>
              {requireTypedConfirmation && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {typedConfirmationLabel || (
                      <>
                        Pour confirmer, tapez exactement :{' '}
                        <span className="font-mono font-semibold text-slate-700">{requireTypedConfirmation}</span>
                      </>
                    )}
                  </label>
                  <input
                    type="text"
                    autoFocus
                    disabled={submitting}
                    className="input-field w-full"
                    value={typedValue}
                    onChange={(e) => setTypedValue(e.target.value)}
                    placeholder={requireTypedConfirmation}
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={onCancel}
                disabled={submitting}
                className="btn-ghost w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelLabel}
              </button>
              <ValidationActionButton
                size="md"
                variant={danger ? 'danger' : 'success'}
                onClick={() => void handleConfirmClick()}
                loading={submitting}
                disabled={!typedConfirmationOk}
              >
                {confirmLabel}
              </ValidationActionButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
