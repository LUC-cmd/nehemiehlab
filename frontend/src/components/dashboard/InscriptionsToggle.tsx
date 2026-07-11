import React from 'react';
import { Loader2 } from 'lucide-react';
import { useInscriptionsSettings } from '../../context/InscriptionsSettingsContext';

interface Props {
  /** Variante pour la topbar teal (texte clair) ou pour une page claire */
  variant?: 'topbar' | 'page';
  className?: string;
}

/**
 * Interrupteur booléen Directeur : ouvre / ferme les inscriptions formateurs.
 * État partagé (un seul source de vérité) pour éviter le va-et-vient ON/OFF.
 */
export default function InscriptionsToggle({ variant = 'topbar', className = '' }: Props) {
  const { ouverte, loading, toggling, setOuverte } = useInscriptionsSettings();
  const isTopbar = variant === 'topbar';
  const busy = loading || toggling;

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    void setOuverte(!ouverte);
  };

  return (
    <div
      className={`inscriptions-toggle inline-flex items-center gap-2.5 sm:gap-3 rounded-full border px-2.5 sm:px-3 py-1.5 select-none ${
        isTopbar
          ? ouverte
            ? 'bg-emerald-400/20 border-emerald-300/50'
            : 'bg-red-500/25 border-red-300/40'
          : ouverte
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-red-50 border-red-200'
      } ${className}`}
    >
      <div className="hidden sm:flex flex-col leading-tight min-w-0">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider ${
            isTopbar ? 'text-white/70' : 'text-slate-500'
          }`}
        >
          Inscriptions
        </span>
        <span
          className={`text-xs font-bold ${
            isTopbar
              ? ouverte
                ? 'text-emerald-200'
                : 'text-red-100'
              : ouverte
                ? 'text-emerald-700'
                : 'text-red-700'
          }`}
        >
          {loading ? '…' : ouverte ? 'Ouvertes' : 'Fermées'}
        </span>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={ouverte}
        aria-busy={busy}
        aria-label={ouverte ? 'Fermer les inscriptions formateurs' : 'Ouvrir les inscriptions formateurs'}
        disabled={busy}
        onClick={handleToggle}
        className={`inscriptions-toggle-switch relative inline-flex h-8 w-[3.25rem] shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-70 disabled:cursor-wait ${
          isTopbar
            ? `focus-visible:ring-white focus-visible:ring-offset-[#004b57] ${
                ouverte ? 'bg-emerald-400' : 'bg-red-500'
              }`
            : `focus-visible:ring-[#004b57] focus-visible:ring-offset-white ${
                ouverte ? 'bg-emerald-500' : 'bg-red-500'
              }`
        }`}
      >
        <span
          className={`pointer-events-none inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-200 ease-out ${
            ouverte ? 'translate-x-[1.55rem]' : 'translate-x-1'
          }`}
        >
          {busy ? (
            <Loader2 className={`w-3.5 h-3.5 animate-spin ${ouverte ? 'text-emerald-600' : 'text-red-500'}`} />
          ) : (
            <span
              className={`block h-2 w-2 rounded-full ${ouverte ? 'bg-emerald-500' : 'bg-red-500'}`}
            />
          )}
        </span>
      </button>

      <span
        className={`sm:hidden text-xs font-bold ${
          isTopbar ? (ouverte ? 'text-emerald-200' : 'text-red-200') : ouverte ? 'text-emerald-700' : 'text-red-700'
        }`}
      >
        {ouverte ? 'ON' : 'OFF'}
      </span>
    </div>
  );
}
