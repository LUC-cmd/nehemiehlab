import React from 'react';
import { MapPin, Navigation, Route } from 'lucide-react';
import type { Role } from '../../types';
import { requiresOnSiteGpsCapture } from '../../utils/centreGeo';

interface CentreLocationGuideProps {
  role?: Role | null;
  compact?: boolean;
  variant?: 'light' | 'dark';
  className?: string;
}

/**
 * Explique le fonctionnement : qui fixe le GPS (sur place) et qui peut s’y rendre ensuite.
 */
export default function CentreLocationGuide({
  role,
  compact = false,
  variant = 'light',
  className = '',
}: CentreLocationGuideProps) {
  const onSite = requiresOnSiteGpsCapture(role ?? null);
  const isDark = variant === 'dark';

  return (
    <div
      className={`rounded-xl border ${
        isDark
          ? 'border-dark-700 bg-dark-800/50'
          : 'border-[#004b57]/15 bg-gradient-to-br from-[#004b57]/6 to-white'
      } ${compact ? 'p-3 space-y-2' : 'p-4 space-y-3'} ${className}`}
    >
      <p className={`font-semibold ${compact ? 'text-xs' : 'text-sm'} ${isDark ? 'text-white' : 'text-slate-800'}`}>
        Comment fonctionne la localisation ?
      </p>

      <div className={`space-y-2 ${compact ? 'text-[11px]' : 'text-xs'} leading-relaxed ${isDark ? 'text-dark-300' : 'text-slate-600'}`}>
        <div className="flex items-start gap-2">
          <MapPin className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isDark ? 'text-[#5ED9FF]' : 'text-[#004b57]'}`} />
          <p>
            <strong className={isDark ? 'text-white' : 'text-slate-800'}>1. Fixer le point GPS</strong> (une fois, partagé) :
            Coordinateur sur le centre, sinon Formateur sur le terrain, ou Directeur à tout moment.
          </p>
        </div>
        {onSite && (
          <div className={`flex items-start gap-2 rounded-lg px-2.5 py-2 ${
            isDark ? 'bg-amber-500/10 border border-amber-500/25 text-amber-200' : 'bg-amber-50 border border-amber-200 text-amber-900'
          }`}>
            <Navigation className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p>
              <strong>Vous devez être au centre</strong> pour enregistrer la position.
              Elle sera partagée avec toute l’équipe.
            </p>
          </div>
        )}
        <div className="flex items-start gap-2">
          <Route className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isDark ? 'text-[#5ED9FF]' : 'text-[#004b57]'}`} />
          <p>
            <strong className={isDark ? 'text-white' : 'text-slate-800'}>2. Se rendre au centre</strong> :
            chaque personne liée au centre ouvre l’itinéraire Google Maps, où qu’elle soit.
          </p>
        </div>
      </div>
    </div>
  );
}
