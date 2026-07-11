import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, X } from 'lucide-react';
import { BRAND_TEAL, BRAND_TEAL_DEEP, LOGO_SRC } from '../../constants/branding';

interface LogoutConfirmDialogProps {
  open: boolean;
  userName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modale de confirmation de déconnexion — compacte et responsive.
 */
export default function LogoutConfirmDialog({
  open,
  userName,
  onConfirm,
  onCancel,
}: LogoutConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel, onConfirm]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="presentation"
          className="modal-overlay z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onCancel}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            aria-describedby="logout-dialog-desc"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
            className="modal-panel modal-panel-sm overflow-hidden !p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative px-5 pt-5 pb-5 text-center overflow-hidden"
              style={{
                background: `linear-gradient(145deg, ${BRAND_TEAL} 0%, ${BRAND_TEAL_DEEP} 100%)`,
              }}
            >
              <div
                className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }}
              />
              <button
                type="button"
                onClick={onCancel}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="relative mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                <LogOut className="w-5 h-5 text-white" strokeWidth={2.25} />
              </div>
              <img
                src={LOGO_SRC}
                alt="Smart Kids Academy"
                className="relative mx-auto h-7 w-auto object-contain opacity-95"
              />
            </div>

            <div className="px-5 pt-4 pb-5 text-center">
              <h2 id="logout-dialog-title" className="text-lg font-bold text-slate-900 tracking-tight">
                Se déconnecter ?
              </h2>
              <p id="logout-dialog-desc" className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                {userName ? (
                  <>
                    À bientôt, <span className="font-semibold text-slate-700">{userName}</span>.
                    <br />
                    Confirmez pour quitter votre session.
                  </>
                ) : (
                  <>Confirmez pour quitter votre session.</>
                )}
              </p>

              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={onConfirm}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200"
                  style={{
                    background: `linear-gradient(135deg, ${BRAND_TEAL} 0%, ${BRAND_TEAL_DEEP} 100%)`,
                    boxShadow: '0 6px 16px rgba(0, 75, 87, 0.25)',
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Oui, me déconnecter
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Rester connecté
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
