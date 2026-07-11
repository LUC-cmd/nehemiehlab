import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { PAGE_BG } from '../../constants/branding';

interface Props {
  title?: string;
  message?: string;
}

export default function ForbiddenState({
  title = 'Accès refusé',
  message = "Vous n'avez pas les permissions nécessaires pour consulter cette page.",
}: Props) {
  return (
    <div
      className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: PAGE_BG }}
    >
      <div className="w-16 h-16 rounded-2xl bg-[#004b57]/10 flex items-center justify-center mb-6">
        <ShieldX className="w-8 h-8 text-[#004b57]" aria-hidden />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">{title}</h1>
      <p className="text-slate-600 max-w-md mb-8">{message}</p>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 rounded-xl bg-[#004b57] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#003840] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Retour au tableau de bord
      </Link>
    </div>
  );
}
