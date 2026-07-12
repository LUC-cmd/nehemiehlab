import React from 'react';
import {
  BookOpen, Building2, Calendar, Clock, MapPin, Timer, Wrench, AlertTriangle,
} from 'lucide-react';
import type { SessionCours } from '../../types';
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
    <div className="relative overflow-hidden rounded-2xl border border-dark-700 bg-gradient-to-br from-dark-900 via-[#12101f] to-dark-900 mb-5">
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_top_right,rgba(244,59,29,0.15),transparent_55%)]" />
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />

      <div className="relative p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                  isLive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                }`}
              >
                {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                {isLive ? 'En cours' : 'Clôturée'}
              </span>
              <span className="text-xs text-dark-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(session.heureDebut).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white leading-snug">{session.titre}</h3>
            <p className="text-sm text-dark-400 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 shrink-0 text-primary-400" />
              {session.centre.nom}
            </p>
          </div>

          <div className="flex gap-3 shrink-0">
            <div className="text-center px-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700 min-w-[88px]">
              <p className="text-2xl font-bold text-white">{presentCount}</p>
              <p className="text-[10px] text-emerald-400 font-semibold uppercase">Présents</p>
            </div>
            <div className="text-center px-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700 min-w-[88px]">
              <p className="text-2xl font-bold text-white">{presenceRate}%</p>
              <p className="text-[10px] text-violet-400 font-semibold uppercase">Taux</p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-start gap-3 rounded-xl bg-dark-800/50 border border-dark-700/80 p-3">
            <div className="p-2 rounded-lg bg-primary-500/15 text-primary-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-dark-500 font-semibold">Module</p>
              <p className="text-sm text-white font-medium truncate">{moduleLabel}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-dark-800/50 border border-dark-700/80 p-3">
            <div className="p-2 rounded-lg bg-sky-500/15 text-sky-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-dark-500 font-semibold">Horaires</p>
              <p className="text-sm text-white font-medium">
                {new Date(session.heureDebut).toLocaleString('fr-FR', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
                {session.heureFin
                  ? ` → ${new Date(session.heureFin).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                  : isLive ? ' → en cours' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-dark-800/50 border border-dark-700/80 p-3">
            <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-dark-500 font-semibold">Durée</p>
              <p className="text-sm text-white font-medium">
                {session.statut === 'CLOTUREE' && session.dureeReelleMinutes != null
                  ? formatElapsed(session.dureeReelleMinutes)
                  : `${session.dureePrevueMinutes} min prévues`}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-dark-800/50 border border-dark-700/80 p-3">
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-dark-500 font-semibold">GPS</p>
              <p className="text-xs text-dark-300 truncate">
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
              <div className="flex gap-2 text-sm text-dark-300 bg-dark-800/40 rounded-xl p-3 border border-dark-700/60">
                <Wrench className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <p className="text-[10px] uppercase text-dark-500 font-semibold mb-0.5">Équipements</p>
                  <p className="leading-relaxed">{equipment}</p>
                </div>
              </div>
            )}
            {challenges && (
              <div className="flex gap-2 text-sm text-dark-300 bg-dark-800/40 rounded-xl p-3 border border-dark-700/60">
                <AlertTriangle className="w-4 h-4 shrink-0 text-orange-400 mt-0.5" />
                <div>
                  <p className="text-[10px] uppercase text-dark-500 font-semibold mb-0.5">Défis</p>
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
