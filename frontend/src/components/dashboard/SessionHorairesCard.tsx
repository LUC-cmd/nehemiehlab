import React, { useEffect, useState } from 'react';
import { Clock, MapPin, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { sessionService } from '../../services/api';
import type { SessionCours } from '../../types';
import {
  formatSessionDateTime,
  nowForDatetimeLocal,
  toDatetimeLocalValue,
} from '../../utils/datetime';
import { formatCoords } from '../../utils/geo';

type Props = {
  session: SessionCours;
  readOnly?: boolean;
  onUpdated?: () => void;
};

export default function SessionHorairesCard({ session, readOnly = false, onUpdated }: Props) {
  const [heureDebut, setHeureDebut] = useState(toDatetimeLocalValue(session.heureDebut));
  const [heureFin, setHeureFin] = useState(
    session.heureFin ? toDatetimeLocalValue(session.heureFin) : nowForDatetimeLocal(),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHeureDebut(toDatetimeLocalValue(session.heureDebut));
    setHeureFin(session.heureFin ? toDatetimeLocalValue(session.heureFin) : nowForDatetimeLocal());
  }, [session.heureDebut, session.heureFin, session.id]);

  const saveHoraires = async () => {
    setSaving(true);
    try {
      await sessionService.updateHoraires(session.id, {
        heureDebut: new Date(heureDebut).toISOString(),
        ...(session.statut === 'CLOTUREE' || session.heureFin
          ? { heureFin: new Date(heureFin).toISOString() }
          : {}),
      });
      toast.success('Horaires enregistrés.');
      onUpdated?.();
    } catch {
      toast.error('Impossible de mettre à jour les horaires.');
    } finally {
      setSaving(false);
    }
  };

  const isClosed = session.statut === 'CLOTUREE';

  return (
    <div className="rounded-2xl border border-dark-700 bg-dark-900/50 p-4 mb-5 space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-sky-400" />
        <h4 className="text-sm font-bold text-white">Horaires & localisation</h4>
      </div>

      {!readOnly ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Heure de début *</label>
            <input
              type="datetime-local"
              className="input-field"
              value={heureDebut}
              onChange={(e) => setHeureDebut(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Heure de fin {isClosed ? '*' : '(à la clôture)'}</label>
            <input
              type="datetime-local"
              className="input-field"
              value={heureFin}
              disabled={!isClosed && !session.heureFin}
              onChange={(e) => setHeureFin(e.target.value)}
            />
            {!isClosed && (
              <p className="text-[11px] text-dark-500 mt-1">Renseignée automatiquement à la clôture.</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={() => void saveHoraires()}
              disabled={saving}
              className="btn-ghost text-sm inline-flex items-center gap-2 text-sky-300"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer les horaires
            </button>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-dark-800/60 border border-dark-700 p-3">
            <p className="text-[10px] uppercase text-dark-500 font-semibold">Début</p>
            <p className="text-white font-medium mt-0.5">{formatSessionDateTime(session.heureDebut)}</p>
          </div>
          <div className="rounded-xl bg-dark-800/60 border border-dark-700 p-3">
            <p className="text-[10px] uppercase text-dark-500 font-semibold">Fin</p>
            <p className="text-white font-medium mt-0.5">
              {session.heureFin ? formatSessionDateTime(session.heureFin) : '—'}
            </p>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <div className={`rounded-xl border p-3 flex gap-2 ${
          session.latitudeDebut != null
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
        }`}>
          <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold uppercase tracking-wide text-[10px] opacity-80">GPS début</p>
            <p className="mt-0.5">
              {session.latitudeDebut != null
                ? formatCoords(session.latitudeDebut, session.longitudeDebut!)
                : 'Non capturé — utilisez « Capturer début »'}
            </p>
          </div>
        </div>
        <div className={`rounded-xl border p-3 flex gap-2 ${
          session.latitudeFin != null
            ? 'border-sky-500/30 bg-sky-500/10 text-sky-200'
            : 'border-dark-600 bg-dark-800/40 text-dark-500'
        }`}>
          <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold uppercase tracking-wide text-[10px] opacity-80">GPS fin</p>
            <p className="mt-0.5">
              {session.latitudeFin != null
                ? formatCoords(session.latitudeFin, session.longitudeFin!)
                : isClosed ? 'Non capturé' : 'À la clôture'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
