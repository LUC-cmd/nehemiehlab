import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeClass: Record<ModalSize, string> = {
  sm: 'modal-panel-sm',
  md: 'modal-panel-md',
  lg: 'modal-panel-lg',
  xl: 'modal-panel-xl',
};

interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  size?: ModalSize;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Contenu sans padding (ex: bandeau custom) */
  bare?: boolean;
}

/**
 * Popup système : centrée, responsive, thème clair unifié.
 */
export default function Modal({
  open,
  title,
  subtitle,
  size = 'md',
  onClose,
  children,
  footer,
  bare = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="system-modal-title"
        className={`modal-panel ${sizeClass[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        {!bare && (
          <div className="modal-header">
            <div className="min-w-0">
              <h2 id="system-modal-title" className="modal-title">
                {title}
              </h2>
              {subtitle && <p className="modal-subtitle">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="modal-close"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {bare ? children : <div className="modal-body">{children}</div>}

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
