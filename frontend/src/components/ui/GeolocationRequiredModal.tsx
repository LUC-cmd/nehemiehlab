import React from 'react';
import { MapPin, Navigation, RefreshCw } from 'lucide-react';
import Modal from './Modal';

type Props = {
  open: boolean;
  phase: 'debut' | 'fin';
  message?: string;
  onRetry: () => void;
  onClose: () => void;
  retrying?: boolean;
};

export default function GeolocationRequiredModal({
  open,
  phase,
  message,
  onRetry,
  onClose,
  retrying,
}: Props) {
  const phaseLabel = phase === 'debut' ? 'démarrer' : 'clôturer';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Localisation obligatoire"
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-white font-medium">
              Pour {phaseLabel} une séance, vous devez autoriser la géolocalisation.
            </p>
            <p className="text-xs text-dark-300 mt-1.5 leading-relaxed">
              Le GPS fonctionne sans connexion internet. La position est enregistrée au début et à la fin
              de chaque séance pour vérifier la présence sur le terrain.
            </p>
          </div>
        </div>

        {message && (
          <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
            {message}
          </p>
        )}

        <ol className="text-sm text-dark-300 space-y-2 list-decimal list-inside">
          <li>Cliquez sur l&apos;icône de cadenas ou « Site paramètres » dans la barre d&apos;adresse.</li>
          <li>Autorisez l&apos;accès à la <strong className="text-white">Position / Localisation</strong>.</li>
          <li>Sur mobile : Paramètres → Localisation → activez le GPS.</li>
          <li>Revenez ici et cliquez sur « Réessayer ».</li>
        </ol>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="btn-primary flex items-center justify-center gap-2 flex-1"
          >
            <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Capture en cours…' : 'Réessayer la localisation'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
            Annuler
          </button>
        </div>

        <p className="text-[11px] text-dark-500 flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5" />
          Sans localisation validée, la séance ne peut pas être {phase === 'debut' ? 'démarrée' : 'clôturée'}.
        </p>
      </div>
    </Modal>
  );
}
