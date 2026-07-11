import React from 'react';
import { MapPin, Navigation, Route } from 'lucide-react';
import Modal from './Modal';
import type { Centre } from '../../types';

interface LocationReminderModalProps {
  open: boolean;
  centres: Centre[];
  onClose: () => void;
  onDefine: (centre: Centre) => void;
}

/**
 * Rappel pro : un centre peut exister sans GPS, mais dès qu’on y touche
 * on invite Directeur / Coordinateur / Formateur à fixer le point.
 * Une fois défini, tout le monde peut s’y rendre via Google Maps.
 */
export function LocationReminderModal({
  open,
  centres,
  onClose,
  onDefine,
}: LocationReminderModalProps) {
  if (!open || centres.length === 0) return null;

  const first = centres[0];

  return (
    <Modal
      open={open}
      title="Localisation du centre"
      subtitle="Point GPS partagé pour toute l’équipe"
      size="md"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost w-full sm:w-auto justify-center">
            Plus tard
          </button>
          <button
            type="button"
            className="btn-primary w-full sm:w-auto justify-center"
            onClick={() => onDefine(first)}
          >
            <MapPin className="w-4 h-4" />
            {centres.length === 1 ? 'Définir maintenant' : `Définir — ${first.nom}`}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600 leading-relaxed">
          Le point GPS est <strong className="text-slate-800">partagé pour tout le monde</strong> lié au centre.
          En priorité le <strong>Coordinateur</strong> le fixe sur place, sinon le <strong>Formateur</strong> sur le terrain,
          ou le <strong>Directeur</strong> à tout moment.
        </p>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 leading-relaxed">
          <strong>Sur le terrain :</strong> vous devez être physiquement au centre pour enregistrer la position
          (bouton « Je suis au centre »). Ensuite, toute l’équipe pourra s’y rendre via Google Maps.
        </div>

        <div className="rounded-xl border border-[#004b57]/15 bg-[#004b57]/5 p-3.5 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <Navigation className="w-4 h-4 text-[#004b57] mt-0.5 shrink-0" />
            <p className="text-xs text-slate-700 leading-relaxed">
              Collez un lien Maps <em>ou</em> prenez votre position sur place.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <Route className="w-4 h-4 text-[#004b57] mt-0.5 shrink-0" />
            <p className="text-xs text-slate-700 leading-relaxed">
              Une fois enregistrée, <strong>toute l’équipe</strong> peut ouvrir
              l’itinéraire et se rendre au centre, où qu’elle soit.
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            {centres.length === 1
              ? 'Centre sans localisation'
              : `${centres.length} centres sans localisation`}
          </p>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {centres.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{c.nom}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {c.adresse}, {c.ville}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-xs font-semibold text-[#004b57] hover:underline"
                  onClick={() => onDefine(c)}
                >
                  Définir
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}

interface MissingLocationBannerProps {
  count: number;
  onOpenFirst: () => void;
}

export function MissingLocationBanner({ count, onOpenFirst }: MissingLocationBannerProps) {
  if (count <= 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
          <MapPin className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            {count === 1
              ? '1 centre sans point GPS'
              : `${count} centres sans point GPS`}
          </p>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
            Rendez-vous au centre pour fixer le GPS une fois — ensuite tout le monde pourra s’y rendre.
          </p>
        </div>
      </div>
      <button type="button" onClick={onOpenFirst} className="btn-primary py-2 text-sm shrink-0 justify-center">
        Compléter
      </button>
    </div>
  );
}
