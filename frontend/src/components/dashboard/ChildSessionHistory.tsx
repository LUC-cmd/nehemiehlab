import React, { useMemo, useState } from 'react';
import {
  Calendar, CheckCircle2, XCircle, Star, Clock, BookOpen, MessageSquare, Briefcase,
  UserCheck, UserX, Search, TrendingUp, Timer, Sparkles,
} from 'lucide-react';
import type { ChildSessionRow } from '../../types';

export type { ChildSessionRow };

type FilterTab = 'all' | 'present' | 'absent';
type Theme = 'light' | 'dark';

function displayNote10(note?: number | null): number | null {
  if (note == null) return null;
  return note > 10 ? Math.round((note / 2) * 10) / 10 : note;
}

function formatDuration(mins?: number | null) {
  if (mins == null || mins <= 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} h ${m.toString().padStart(2, '0')}` : `${m} min`;
}

function noteColor(note?: number | null): string {
  const n = displayNote10(note);
  if (n == null) return 'from-slate-400 to-slate-500';
  if (n >= 8) return 'from-emerald-400 to-teal-500';
  if (n >= 5) return 'from-amber-400 to-orange-500';
  return 'from-rose-400 to-red-500';
}

function noteLabel(note?: number | null): string {
  const n = displayNote10(note);
  if (n == null) return 'Non noté';
  if (n >= 8) return 'Excellent';
  if (n >= 6) return 'Bien';
  if (n >= 4) return 'Moyen';
  return 'À suivre';
}

type Props = {
  sessions: ChildSessionRow[];
  childName: string;
  theme?: Theme;
};

export default function ChildSessionHistory({ sessions, childName, theme = 'light' }: Props) {
  const [tab, setTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

  const isDark = theme === 'dark';

  const stats = useMemo(() => {
    const total = sessions.length;
    const present = sessions.filter((s) => s.present).length;
    const absent = total - present;
    const rate = total ? Math.round((present / total) * 100) : 0;
    const notes = sessions
      .filter((s) => s.present && s.note != null)
      .map((s) => displayNote10(s.note)!);
    const avg = notes.length ? notes.reduce((a, b) => a + b, 0) / notes.length : null;
    const totalMins = sessions
      .filter((s) => s.present && s.dureeMinutes)
      .reduce((acc, s) => acc + (s.dureeMinutes || 0), 0);
    return { total, present, absent, rate, avg, totalMins };
  }, [sessions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter((s) => {
      if (tab === 'present' && !s.present) return false;
      if (tab === 'absent' && s.present) return false;
      if (!q) return true;
      return (
        s.titre.toLowerCase().includes(q)
        || (s.module || '').toLowerCase().includes(q)
        || (s.centre || '').toLowerCase().includes(q)
        || (s.projetTravaille || '').toLowerCase().includes(q)
        || (s.projetProbleme || '').toLowerCase().includes(q)
        || (s.projetSolution || '').toLowerCase().includes(q)
      );
    });
  }, [sessions, tab, search]);

  const cardBase = isDark
    ? 'border-dark-700 bg-dark-900/60'
    : 'border-slate-200 bg-white';
  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-dark-400' : 'text-slate-500';
  const inputCls = isDark ? 'input-field pl-10 py-2.5 text-sm w-full' : 'w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004b57]/30';

  if (sessions.length === 0) {
    return (
      <div className={`rounded-2xl border text-center py-16 ${cardBase}`}>
        <div className={`inline-flex p-4 rounded-2xl mb-4 ${isDark ? 'bg-dark-800' : 'bg-slate-50'}`}>
          <Calendar className={`w-10 h-10 ${isDark ? 'text-dark-500' : 'text-slate-300'}`} />
        </div>
        <p className={`font-semibold ${textMain}`}>Aucune séance enregistrée</p>
        <p className={`text-sm mt-1 ${textMuted}`}>
          Les présences et notes apparaîtront ici après les cours sur le terrain.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={`text-xl font-bold ${textMain}`}>Parcours des séances</h2>
          <p className={`text-sm mt-0.5 ${textMuted}`}>
            {childName} — suivi détaillé présence & participation
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
          stats.rate >= 75
            ? isDark ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : stats.rate >= 50
              ? isDark ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-amber-50 text-amber-800 border border-amber-200'
              : isDark ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          <TrendingUp className="w-4 h-4" />
          {stats.rate}% de présence
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Séances',
            value: stats.total,
            sub: 'au total',
            icon: Calendar,
            color: isDark ? 'text-sky-300 border-sky-500/25 bg-sky-500/10' : 'text-sky-700 border-sky-200 bg-sky-50',
          },
          {
            label: 'Présences',
            value: stats.present,
            sub: `${stats.absent} absence${stats.absent > 1 ? 's' : ''}`,
            icon: UserCheck,
            color: isDark ? 'text-emerald-300 border-emerald-500/25 bg-emerald-500/10' : 'text-emerald-700 border-emerald-200 bg-emerald-50',
          },
          {
            label: 'Moyenne',
            value: stats.avg != null ? stats.avg.toFixed(1) : '—',
            sub: '/10 participation',
            icon: Star,
            color: isDark ? 'text-amber-300 border-amber-500/25 bg-amber-500/10' : 'text-amber-700 border-amber-200 bg-amber-50',
          },
          {
            label: 'Temps',
            value: formatDuration(stats.totalMins),
            sub: 'en séance',
            icon: Timer,
            color: isDark ? 'text-violet-300 border-violet-500/25 bg-violet-500/10' : 'text-violet-700 border-violet-200 bg-violet-50',
          },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className={`rounded-2xl border p-4 ${color}`}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-80">
              <Icon className="w-3.5 h-3.5" />
              {label}
            </div>
            <p className={`text-2xl font-bold mt-1 ${textMain}`}>{value}</p>
            <p className={`text-[11px] mt-0.5 ${textMuted}`}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className={`inline-flex p-1 rounded-xl border ${isDark ? 'bg-dark-800/80 border-dark-700' : 'bg-slate-100 border-slate-200'}`}>
          {([
            { id: 'all' as const, label: 'Toutes', icon: Sparkles },
            { id: 'present' as const, label: 'Présent', icon: UserCheck },
            { id: 'absent' as const, label: 'Absent', icon: UserX },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === id
                  ? isDark
                    ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                    : 'bg-white text-[#004b57] shadow-sm border border-slate-200'
                  : isDark ? 'text-dark-400 hover:text-dark-200' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs w-full">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-dark-500' : 'text-slate-400'}`} />
          <input
            type="search"
            placeholder="Filtrer module, séance…"
            className={inputCls}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className={`rounded-2xl border border-dashed py-12 text-center ${isDark ? 'border-dark-600' : 'border-slate-200'}`}>
          <p className={textMuted}>Aucune séance ne correspond à ce filtre.</p>
        </div>
      ) : (
        <div className="relative">
          <div className={`absolute left-[1.15rem] sm:left-6 top-3 bottom-3 w-0.5 ${isDark ? 'bg-dark-700' : 'bg-slate-200'}`} />

          <div className="space-y-4">
            {filtered.map((s, idx) => {
              const note = displayNote10(s.note);
              const pct = note != null ? Math.min(100, (note / 10) * 100) : 0;
              const ringStroke = note == null ? '#94a3b8' : note >= 8 ? '#34d399' : note >= 5 ? '#fbbf24' : '#fb7185';

              return (
                <article
                  key={`${s.sessionId}-${s.date}-${idx}`}
                  className={`relative pl-10 sm:pl-14 transition-all duration-300 hover:translate-x-0.5`}
                >
                  {/* Point timeline */}
                  <div
                    className={`absolute left-2 sm:left-4 top-6 w-4 h-4 rounded-full border-2 z-10 ${
                      s.present
                        ? 'bg-emerald-500 border-emerald-300 shadow-lg shadow-emerald-500/30'
                        : isDark ? 'bg-dark-800 border-rose-400' : 'bg-white border-rose-400'
                    }`}
                  />

                  <div
                    className={`overflow-hidden rounded-2xl border transition-shadow hover:shadow-lg ${
                      s.present
                        ? isDark
                          ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.07] via-dark-900/50 to-dark-900/70'
                          : 'border-emerald-200 bg-gradient-to-br from-white via-emerald-50/30 to-white'
                        : isDark
                          ? 'border-dark-700 bg-dark-900/40 opacity-85'
                          : 'border-slate-200 bg-white opacity-90'
                    }`}
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={`text-xs flex items-center gap-1 font-medium ${textMuted}`}>
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(s.date).toLocaleDateString('fr-FR', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            {s.statut === 'CLOTUREE' && (
                              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${
                                isDark ? 'bg-dark-800 text-dark-400' : 'bg-slate-100 text-slate-600'
                              }`}>
                                Clôturée
                              </span>
                            )}
                            {s.statut === 'EN_COURS' && (
                              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                En cours
                              </span>
                            )}
                          </div>
                          <h3 className={`font-bold text-lg leading-tight ${textMain}`}>{s.titre}</h3>
                          {s.module && (
                            <p className={`text-sm mt-1 flex items-center gap-1.5 ${isDark ? 'text-primary-300' : 'text-[#004b57]'}`}>
                              <BookOpen className="w-3.5 h-3.5 shrink-0" />
                              {s.module}
                            </p>
                          )}
                          {s.centre && (
                            <p className={`text-xs mt-1 ${textMuted}`}>{s.centre}</p>
                          )}
                        </div>

                        <div
                          className={`shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-xl border font-bold text-sm ${
                            s.present
                              ? isDark
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : isDark
                                ? 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                                : 'bg-rose-50 border-rose-200 text-rose-700'
                          }`}
                        >
                          {s.present ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                          {s.present ? 'Présent' : 'Absent'}
                        </div>
                      </div>

                      {s.present && (
                        <div className={`mt-4 pt-4 border-t space-y-4 ${isDark ? 'border-dark-700/60' : 'border-slate-100'}`}>
                          <div className="flex items-center gap-4 flex-wrap">
                            {/* Anneau note */}
                            <div className="relative w-16 h-16 shrink-0">
                              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2" className={isDark ? 'text-dark-700' : 'text-slate-200'} />
                                <circle
                                  cx="18" cy="18" r="15.5" fill="none" strokeWidth="2.5"
                                  strokeLinecap="round"
                                  stroke={ringStroke}
                                  strokeDasharray={`${pct} 100`}
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-lg font-bold ${textMain}`}>
                                  {note != null ? note : '—'}
                                </span>
                                <span className={`text-[9px] ${textMuted}`}>/10</span>
                              </div>
                            </div>

                            <div className="flex-1 min-w-[140px]">
                              <p className={`text-[10px] uppercase tracking-wide font-semibold ${textMuted}`}>Participation</p>
                              <p className={`text-sm font-bold bg-gradient-to-r ${noteColor(s.note)} bg-clip-text text-transparent`}>
                                {noteLabel(s.note)}
                              </p>
                              <div className={`h-1.5 rounded-full mt-2 overflow-hidden ${isDark ? 'bg-dark-800' : 'bg-slate-100'}`}>
                                <div
                                  className={`h-full rounded-full bg-gradient-to-r ${noteColor(s.note)} transition-all duration-500`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 shrink-0">
                              {s.heureArrivee && (
                                <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${
                                  isDark ? 'bg-sky-500/10 border-sky-500/20 text-sky-300' : 'bg-sky-50 border-sky-100 text-sky-800'
                                }`}>
                                  <Clock className="w-3.5 h-3.5" />
                                  Arrivée {new Date(s.heureArrivee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                              <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${
                                isDark ? 'bg-violet-500/10 border-violet-500/20 text-violet-300' : 'bg-violet-50 border-violet-100 text-violet-800'
                              }`}>
                                <Timer className="w-3.5 h-3.5" />
                                {formatDuration(s.dureeMinutes)}
                              </div>
                            </div>
                          </div>

                          {(s.projetTravaille || s.commentaire || s.projetFinal) && (
                            <div className="grid sm:grid-cols-2 gap-3">
                              {s.projetTravaille && (
                                <div className={`flex items-start gap-2 rounded-xl p-3 border ${
                                  isDark ? 'bg-dark-800/50 border-dark-700' : 'bg-violet-50/50 border-violet-100'
                                } ${s.projetFinal ? 'sm:col-span-2' : ''}`}>
                                  <Briefcase className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className={`text-[10px] uppercase font-semibold ${textMuted}`}>
                                        {s.projetFinal ? 'Projet final' : 'Projet travaillé'}
                                      </p>
                                      {s.projetFinal && (
                                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">
                                          Rapport
                                        </span>
                                      )}
                                    </div>
                                    <p className={`text-sm font-medium mt-0.5 ${textMain}`}>{s.projetTravaille}</p>
                                    {s.projetFinal && (s.projetProbleme || s.projetSolution) && (
                                      <div className="mt-2 space-y-1.5 text-xs">
                                        {s.projetProbleme && (
                                          <p className={isDark ? 'text-dark-300' : 'text-slate-600'}>
                                            <span className="font-semibold">Problème :</span> {s.projetProbleme}
                                          </p>
                                        )}
                                        {s.projetSolution && (
                                          <p className={isDark ? 'text-dark-300' : 'text-slate-600'}>
                                            <span className="font-semibold">Solution :</span> {s.projetSolution}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              {s.commentaire && (
                                <div className={`flex items-start gap-2 rounded-xl p-3 border ${
                                  isDark ? 'bg-dark-800/50 border-dark-700' : 'bg-slate-50 border-slate-100'
                                }`}>
                                  <MessageSquare className={`w-4 h-4 shrink-0 mt-0.5 ${textMuted}`} />
                                  <div className="min-w-0">
                                    <p className={`text-[10px] uppercase font-semibold ${textMuted}`}>Observation</p>
                                    <p className={`text-sm mt-0.5 leading-relaxed ${isDark ? 'text-dark-200' : 'text-slate-600'}`}>
                                      {s.commentaire}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {!s.present && (
                        <p className={`mt-3 text-xs italic flex items-center gap-1.5 ${textMuted}`}>
                          <XCircle className="w-3.5 h-3.5" />
                          Absence enregistrée — pas de note ni de suivi pour cette séance
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
