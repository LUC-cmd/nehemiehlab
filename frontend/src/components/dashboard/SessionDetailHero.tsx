import React from 'react';
import {
  BookOpen, Building2, Calendar, Clock, MapPin, Timer, Wrench, AlertTriangle,
} from 'lucide-react';
import type { SessionCours } from '../../types';
import { centreLabel } from '../../utils/centreLabel';
import { formatCoords } from '../../utils/geo';

type Props = {
  session: SessionCours;
  moduleLabel: string;
  equipment?: string;
  challenges?: string;
  presentCount: number;
  totalCount: number;
  formatElapsed: (minutes: number) => string;
};

export default function SessionDetailHero({
  session,
  moduleLabel,
  equipment,
  challenges,
  presentCount,
  totalCount,
  formatElapsed,
}: Props) {
  const isLive = session.statut === 'EN_COURS';
  const presenceRate = totalCount ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white mb-5 shadow-sm">
      <div className="relative p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                  isLive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                {isLive ? 'En cours' : 'Clôturée'}
              </span>
              {session.manuelle && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-violet-50 text-violet-700 border border-violet-200">
                  Saisie manuelle
                </span>
              )}
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(session.heureDebut).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">{session.titre}</h3>
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 shrink-0 text-primary-600" />
              {centreLabel(session.centre)}
            </p>
            {session.modifieLe && (
              <p className="text-[11px] text-slate-500">
                Modifié le{' '}
                {new Date(session.modifieLe).toLocaleString('fr-FR', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
                {session.modifieParNom ? ` par ${session.modifieParNom}` : ''}
              </p>
            )}
          </div>

          <div className="flex gap-3 shrink-0">
            <div className="text-center px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 min-w-[88px]">
              <p className="text-2xl font-bold text-slate-900">{presentCount}</p>
              <p className="text-[10px] text-emerald-600 font-semibold uppercase">Présents</p>
            </div>
            <div className="text-center px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 min-w-[88px]">
              <p className="text-2xl font-bold text-slate-900">{presenceRate}%</p>
              <p className="text-[10px] text-violet-600 font-semibold uppercase">Taux</p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3">
            <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Module</p>
              <p className="text-sm text-slate-900 font-medium truncate">{moduleLabel}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3">
            <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Horaires</p>
              <p className="text-sm text-slate-900 font-medium">
                {new Date(session.heureDebut).toLocaleString('fr-FR', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
                {session.heureFin
                  ? ` → ${new Date(session.heureFin).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                  : isLive ? ' → en cours' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Durée</p>
              <p className="text-sm text-slate-900 font-medium">
                {session.statut === 'CLOTUREE' && session.dureeReelleMinutes != null
                  ? formatElapsed(session.dureeReelleMinutes)
                  : `${session.dureePrevueMinutes} min prévues`}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">GPS</p>
              <p className="text-xs text-slate-700 truncate">
                {session.latitudeDebut != null
                  ? `Début ${formatCoords(session.latitudeDebut, session.longitudeDebut!)}`
                  : 'Début non capturé'}
                {session.latitudeFin != null
                  ? ` · Fin ${formatCoords(session.latitudeFin, session.longitudeFin!)}`
                  : ''}
              </p>
            </div>
          </div>
        </div>

        {(equipment || challenges) && (
          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            {equipment && (
              <div className="flex gap-2 text-sm text-slate-700 bg-slate-50 rounded-xl p-3 border border-slate-200">
                <Wrench className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-[10px] uppercase text-slate-500 font-semibold mb-0.5">Équipements</p>
                  <p className="leading-relaxed">{equipment}</p>
                </div>
              </div>
            )}
            {challenges && (
              <div className="flex gap-2 text-sm text-slate-700 bg-slate-50 rounded-xl p-3 border border-slate-200">
                <AlertTriangle className="w-4 h-4 shrink-0 text-orange-600 mt-0.5" />
                <div>
                  <p className="text-[10px] uppercase text-slate-500 font-semibold mb-0.5">Défis</p>
                  <p className="leading-relaxed">{challenges}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
