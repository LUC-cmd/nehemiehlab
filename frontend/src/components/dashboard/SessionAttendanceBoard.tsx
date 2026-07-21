import React, { useMemo, useState } from 'react';
import {
  UserCheck, UserX, Search, Clock, Star, MessageSquare,
  Briefcase, Users, TrendingUp, Sparkles, Award, FlaskConical,
  AlertTriangle, Eye, Hammer, Paperclip, Upload, Trash2, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { EvaluationSession, SessionCours } from '../../types';
import { formatFullName } from '../../utils/displayName';
import { signalementService, sessionService } from '../../services/api';
import { fetchSecureMediaBlobUrl } from '../../utils/media';
import Modal from '../ui/Modal';

type FilterTab = 'all' | 'present' | 'absent' | 'working';

type Props = {
  evaluations: EvaluationSession[];
  session: SessionCours;
  readOnly: boolean;
  supervisionMode?: boolean;
  canSignal?: boolean;
  sessionId?: number;
  onEvaluationsChange: (updater: (prev: EvaluationSession[]) => EvaluationSession[]) => void;
  onNoteChange: (evalId: number, val: string) => void;
  displayNote10: (note?: number | null) => number | '';
};

function initials(prenom?: string, nom?: string) {
  const p = (prenom || '').trim().charAt(0);
  const n = (nom || '').trim().charAt(0);
  return `${p}${n}`.toUpperCase() || '?';
}

function formatDuration(ev: EvaluationSession, session: SessionCours): string {
  if (!ev.present) return '—';
  if (ev.dureeMinutes != null) {
    const h = Math.floor(ev.dureeMinutes / 60);
    const m = ev.dureeMinutes % 60;
    return h > 0 ? `${h} h ${m.toString().padStart(2, '0')}` : `${m} min`;
  }
  if (ev.heureArrivee && session.statut === 'EN_COURS') {
    const mins = Math.max(0, Math.floor((Date.now() - new Date(ev.heureArrivee).getTime()) / 60000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h} h ${m.toString().padStart(2, '0')}` : `${m} min`;
  }
  return '—';
}

function noteColor(note?: number | null): string {
  if (note == null) return 'from-slate-500 to-slate-600';
  const n = note > 10 ? note / 2 : note;
  if (n >= 8) return 'from-emerald-400 to-teal-500';
  if (n >= 5) return 'from-amber-400 to-orange-500';
  return 'from-rose-400 to-red-500';
}

function noteLabel(note?: number | null): string {
  if (note == null) return '—';
  const n = note > 10 ? note / 2 : note;
  if (n >= 8) return 'Excellent';
  if (n >= 6) return 'Bien';
  if (n >= 4) return 'Moyen';
  return 'À suivre';
}

function isWorking(ev: EvaluationSession): boolean {
  return ev.present && !!(ev.projetTravaille && ev.projetTravaille.trim());
}

export default function SessionAttendanceBoard({
  evaluations,
  session,
  readOnly,
  supervisionMode = false,
  canSignal = false,
  sessionId,
  onEvaluationsChange,
  onNoteChange,
  displayNote10,
}: Props) {
  const [tab, setTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [alertTarget, setAlertTarget] = useState<EvaluationSession | null>(null);
  const [alertForm, setAlertForm] = useState({
    description: '',
    priorite: 'NORMALE' as 'NORMALE' | 'URGENTE',
    inclureDansRapport: true,
  });
  const [alertSending, setAlertSending] = useState(false);

  const stats = useMemo(() => {
    const total = evaluations.length;
    const present = evaluations.filter((e) => e.present).length;
    const absent = total - present;
    const working = evaluations.filter(isWorking).length;
    const notes = evaluations
      .filter((e) => e.present && e.note != null)
      .map((e) => {
        const n = e.note!;
        return n > 10 ? n / 2 : n;
      });
    const avg = notes.length ? notes.reduce((a, b) => a + b, 0) / notes.length : null;
    const rate = total ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, working, avg, rate };
  }, [evaluations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return evaluations.filter((ev) => {
      if (tab === 'present' && !ev.present) return false;
      if (tab === 'absent' && ev.present) return false;
      if (tab === 'working' && !isWorking(ev)) return false;
      if (!q) return true;
      const name = `${ev.eleve.prenom} ${ev.eleve.nom}`.toLowerCase();
      return name.includes(q) || (ev.eleve.classe || '').toLowerCase().includes(q);
    });
  }, [evaluations, tab, search]);

  const togglePresence = (ev: EvaluationSession) => {
    if (readOnly) return;
    onEvaluationsChange((prev) =>
      prev.map((p) =>
        p.id === ev.id
          ? {
              ...p,
              present: !p.present,
              note: !p.present ? p.note : undefined,
              heureArrivee: !p.present
                ? p.heureArrivee || new Date().toISOString()
                : undefined,
              dureeMinutes: !p.present ? p.dureeMinutes : undefined,
              projetFinal: !p.present ? p.projetFinal : false,
              projetProbleme: !p.present ? p.projetProbleme : undefined,
              projetSolution: !p.present ? p.projetSolution : undefined,
            }
          : p,
      ),
    );
  };

  const [uploadingEvalId, setUploadingEvalId] = useState<number | null>(null);
  const [downloadingEvalId, setDownloadingEvalId] = useState<number | null>(null);

  const handleUploadProjetFichier = async (ev: EvaluationSession, file: File) => {
    if (!session.id) return;
    setUploadingEvalId(ev.id);
    try {
      const { data } = await sessionService.uploadProjetFichier(session.id, ev.id, file);
      onEvaluationsChange((prev) =>
        prev.map((p) =>
          p.id === ev.id
            ? { ...p, projetFichierUrl: data.projetFichierUrl, projetFichierNom: data.projetFichierNom }
            : p,
        ),
      );
      toast.success('Fichier du projet ajouté.');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Échec de l'envoi du fichier.");
    } finally {
      setUploadingEvalId(null);
    }
  };

  const handleRemoveProjetFichier = async (ev: EvaluationSession) => {
    if (!session.id) return;
    try {
      await sessionService.deleteProjetFichier(session.id, ev.id);
      onEvaluationsChange((prev) =>
        prev.map((p) => (p.id === ev.id ? { ...p, projetFichierUrl: undefined, projetFichierNom: undefined } : p)),
      );
    } catch {
      toast.error('Impossible de retirer ce fichier.');
    }
  };

  const handleDownloadProjetFichier = async (ev: EvaluationSession) => {
    if (!ev.projetFichierUrl) return;
    setDownloadingEvalId(ev.id);
    try {
      const blobUrl = await fetchSecureMediaBlobUrl(ev.projetFichierUrl);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = ev.projetFichierNom || 'projet';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch {
      toast.error('Impossible de télécharger ce fichier.');
    } finally {
      setDownloadingEvalId(null);
    }
  };

  const submitAlert = async () => {
    if (!alertTarget || !alertForm.description.trim()) {
      toast.error('Décrivez l\'alerte ou l\'incident.');
      return;
    }
    setAlertSending(true);
    try {
      await signalementService.createAlerteEnfant({
        eleveId: alertTarget.eleve.id,
        description: alertForm.description.trim(),
        priorite: alertForm.priorite,
        inclureDansRapport: alertForm.inclureDansRapport,
        sessionId: sessionId && sessionId > 0 ? sessionId : undefined,
      });
      toast.success('Alerte enregistrée — le directeur est notifié.');
      setAlertTarget(null);
      setAlertForm({ description: '', priorite: 'NORMALE', inclureDansRapport: true });
    } catch {
      toast.error('Erreur lors de l\'envoi de l\'alerte.');
    } finally {
      setAlertSending(false);
    }
  };

  const displayOnly = readOnly || supervisionMode;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <p className="col-span-full text-xs text-dark-500 -mb-2">
          {supervisionMode ? (
            <span className="inline-flex items-center gap-1.5 text-sky-300">
              <Eye className="w-3.5 h-3.5" />
              Mode consultation — suivi en direct des enfants sur le terrain (lecture seule).
            </span>
          ) : (
            'Saisie terrain : présence, note, projet (pratique ou final), commentaire et alerte si besoin. Tout alimente le rapport annuel.'
          )}
        </p>
        <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/15 to-emerald-900/10 p-4">
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold uppercase tracking-wide">
            <UserCheck className="w-4 h-4" /> Présents
          </div>
          <p className="text-3xl font-bold text-white mt-1">{stats.present}</p>
          <p className="text-xs text-emerald-400/80 mt-0.5">sur {stats.total} élèves</p>
        </div>
        <div className="rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/15 to-sky-900/10 p-4">
          <div className="flex items-center gap-2 text-sky-300 text-xs font-semibold uppercase tracking-wide">
            <Hammer className="w-4 h-4" /> En travail
          </div>
          <p className="text-3xl font-bold text-white mt-1">{stats.working}</p>
          <p className="text-xs text-sky-400/80 mt-0.5">projet en cours</p>
        </div>
        <div className="rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/15 to-rose-900/10 p-4">
          <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold uppercase tracking-wide">
            <UserX className="w-4 h-4" /> Absents
          </div>
          <p className="text-3xl font-bold text-white mt-1">{stats.absent}</p>
          <p className="text-xs text-rose-400/80 mt-0.5">à signaler</p>
        </div>
        <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/15 to-violet-900/10 p-4">
          <div className="flex items-center gap-2 text-violet-300 text-xs font-semibold uppercase tracking-wide">
            <TrendingUp className="w-4 h-4" /> Taux
          </div>
          <div className="flex items-end gap-2 mt-1">
            <p className="text-3xl font-bold text-white">{stats.rate}%</p>
            <div className="flex-1 h-2 rounded-full bg-violet-950/50 mb-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all duration-500"
                style={{ width: `${stats.rate}%` }}
              />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/15 to-amber-900/10 p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wide">
            <Star className="w-4 h-4" /> Moyenne
          </div>
          <p className="text-3xl font-bold text-white mt-1">
            {stats.avg != null ? stats.avg.toFixed(1) : '—'}
            <span className="text-lg text-amber-400/70 font-medium"> /10</span>
          </p>
          <p className="text-xs text-amber-400/80 mt-0.5">participation</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="inline-flex flex-wrap p-1 rounded-xl bg-dark-800/80 border border-dark-700 gap-0.5">
          {([
            { id: 'all' as const, label: 'Tous', icon: Users },
            { id: 'present' as const, label: 'Présents', icon: UserCheck },
            { id: 'working' as const, label: 'En travail', icon: Hammer },
            { id: 'absent' as const, label: 'Absents', icon: UserX },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === id
                  ? 'bg-primary-500/20 text-primary-300 shadow-sm border border-primary-500/30'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="search"
            placeholder="Rechercher un élève…"
            className="input-field pl-10 py-2.5 text-sm w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-dark-600 py-16 text-center">
          <Users className="w-10 h-10 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 text-sm">Aucun élève ne correspond à ce filtre.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((ev) => {
            const noteVal = displayNote10(ev.note);
            const noteNum = typeof noteVal === 'number' ? noteVal : null;
            const pct = noteNum != null ? Math.min(100, (noteNum / 10) * 100) : 0;
            const ringStroke =
              noteNum == null ? '#475569' : noteNum >= 8 ? '#34d399' : noteNum >= 5 ? '#fbbf24' : '#fb7185';
            const working = isWorking(ev);

            return (
              <article
                key={ev.id}
                className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                  ev.present
                    ? working
                      ? 'border-sky-500/40 bg-gradient-to-br from-sky-500/[0.1] via-dark-900/40 to-dark-900/60 shadow-lg shadow-sky-900/10'
                      : 'border-emerald-500/35 bg-gradient-to-br from-emerald-500/[0.08] via-dark-900/40 to-dark-900/60 shadow-lg shadow-emerald-900/10'
                    : 'border-dark-700/80 bg-dark-900/50 opacity-90'
                } ${!displayOnly && !ev.present ? 'hover:border-rose-500/30' : ''}`}
              >
                {ev.present && session.statut === 'EN_COURS' && (
                  <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                  </span>
                )}

                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-4">
                    <div
                      className={`relative shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-inner ${
                        ev.present
                          ? working
                            ? 'bg-gradient-to-br from-sky-500 to-indigo-600 ring-2 ring-sky-400/40'
                            : 'bg-gradient-to-br from-emerald-500 to-teal-600 ring-2 ring-emerald-400/40'
                          : 'bg-gradient-to-br from-slate-600 to-slate-800 ring-2 ring-dark-600'
                      }`}
                    >
                      {initials(ev.eleve.prenom, ev.eleve.nom)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-white text-lg leading-tight truncate">
                        {formatFullName(ev.eleve.prenom, ev.eleve.nom)}
                      </h3>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {ev.eleve.classe && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md bg-dark-800 text-dark-300 border border-dark-700">
                            {ev.eleve.classe}
                          </span>
                        )}
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-dark-800 text-dark-400 border border-dark-700">
                          {ev.eleve.age} ans · {ev.eleve.sexe === 'F' ? 'Fille' : 'Garçon'}
                        </span>
                        {working && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30">
                            En travail
                          </span>
                        )}
                        {ev.projetFinal && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Projet final
                          </span>
                        )}
                      </div>
                    </div>

                    {displayOnly ? (
                      <span
                        className={`shrink-0 flex flex-col items-center gap-1 rounded-xl px-3 py-2 border ${
                          ev.present
                            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                            : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                        }`}
                      >
                        {ev.present ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {ev.present ? 'Présent' : 'Absent'}
                        </span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => togglePresence(ev)}
                        className={`shrink-0 flex flex-col items-center gap-1 rounded-xl px-3 py-2 border transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                          ev.present
                            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                            : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                        }`}
                      >
                        {ev.present ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {ev.present ? 'Présent' : 'Absent'}
                        </span>
                      </button>
                    )}
                  </div>

                  {canSignal && !supervisionMode && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setAlertTarget(ev)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Signaler / alerter
                      </button>
                    </div>
                  )}

                  {ev.present && (
                    <div className="mt-4 pt-4 border-t border-dark-700/60 space-y-4">
                      <div className="flex items-center gap-4">
                        {displayOnly ? (
                          <div className="w-16 h-16 shrink-0 rounded-2xl bg-dark-800 border border-dark-700 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-white">
                              {noteNum != null ? noteNum : '—'}
                            </span>
                            <span className="text-[9px] text-dark-500">/10</span>
                          </div>
                        ) : (
                          <div className="relative w-16 h-16 shrink-0">
                            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                              <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2" className="text-dark-700" />
                              <circle
                                cx="18" cy="18" r="15.5" fill="none" strokeWidth="2.5"
                                strokeLinecap="round"
                                stroke={ringStroke}
                                strokeDasharray={`${pct} 100`}
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <input
                                type="number"
                                min={0}
                                max={10}
                                step={0.5}
                                className="w-10 bg-transparent text-center text-lg font-bold text-white focus:outline-none"
                                placeholder="—"
                                value={noteVal}
                                onChange={(e) => onNoteChange(ev.id, e.target.value)}
                              />
                              <span className="text-[9px] text-dark-500 font-medium">/10</span>
                            </div>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-dark-500 uppercase tracking-wide font-semibold">Participation</p>
                          <p className={`text-sm font-semibold mt-0.5 bg-gradient-to-r ${noteColor(ev.note)} bg-clip-text text-transparent`}>
                            {noteLabel(ev.note)}
                          </p>
                          {!displayOnly && (
                            <div className="h-1.5 rounded-full bg-dark-800 mt-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${noteColor(ev.note)} transition-all duration-500`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <div className="inline-flex items-center gap-1 text-xs text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2 py-1 rounded-lg">
                            <Clock className="w-3 h-3" />
                            {ev.heureArrivee
                              ? new Date(ev.heureArrivee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                              : 'À l\'appel'}
                          </div>
                          <p className="text-xs font-semibold text-emerald-400">{formatDuration(ev, session)}</p>
                        </div>
                      </div>

                      {displayOnly ? (
                        <div className="space-y-2 text-sm">
                          {ev.projetTravaille && (
                            <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-3">
                              <p className="text-[10px] uppercase font-semibold text-dark-500 flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                {ev.projetFinal ? 'Projet final' : 'Projet travaillé'}
                              </p>
                              <p className="text-white font-medium mt-1">{ev.projetTravaille}</p>
                              {ev.projetFinal && ev.projetProbleme && (
                                <p className="text-dark-300 text-xs mt-2"><span className="text-dark-500">Problème :</span> {ev.projetProbleme}</p>
                              )}
                              {ev.projetFinal && ev.projetSolution && (
                                <p className="text-dark-300 text-xs mt-1"><span className="text-dark-500">Solution :</span> {ev.projetSolution}</p>
                              )}
                              {ev.projetFichierUrl && (
                                <button
                                  type="button"
                                  onClick={() => void handleDownloadProjetFichier(ev)}
                                  disabled={downloadingEvalId === ev.id}
                                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-300 hover:underline"
                                >
                                  {downloadingEvalId === ev.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Paperclip className="w-3.5 h-3.5" />
                                  )}
                                  {ev.projetFichierNom || 'Voir le fichier du projet'}
                                </button>
                              )}
                            </div>
                          )}
                          {ev.commentaire && (
                            <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-3">
                              <p className="text-[10px] uppercase font-semibold text-dark-500 flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" /> Observation
                              </p>
                              <p className="text-dark-200 mt-1">{ev.commentaire}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2">
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-dark-500 mb-1.5">
                              <Briefcase className="w-3 h-3" /> Projet travaillé
                            </label>
                            <input
                              type="text"
                              className="input-field text-sm py-2"
                              placeholder={ev.eleve.projet?.nom || 'Projet du jour…'}
                              value={ev.projetTravaille || ''}
                              onChange={(e) =>
                                onEvaluationsChange((prev) =>
                                  prev.map((p) =>
                                    p.id === ev.id ? { ...p, projetTravaille: e.target.value } : p,
                                  ),
                                )
                              }
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-dark-500 mb-1.5">
                              <Paperclip className="w-3 h-3" /> Fichier du projet réalisé (optionnel)
                            </p>
                            <p className="text-[11px] text-dark-500 mb-1.5">
                              Uniquement si l'enfant a réalisé quelque chose pendant cette séance — photo, vidéo ou fichier .sb3.
                            </p>
                            {ev.projetFichierUrl ? (
                              <div className="flex items-center justify-between gap-2 rounded-lg border border-dark-700 bg-dark-800/40 px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => void handleDownloadProjetFichier(ev)}
                                  disabled={downloadingEvalId === ev.id}
                                  className="flex items-center gap-2 text-sm text-sky-300 font-medium hover:underline min-w-0"
                                >
                                  {downloadingEvalId === ev.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                  ) : (
                                    <Paperclip className="w-3.5 h-3.5 shrink-0" />
                                  )}
                                  <span className="truncate">{ev.projetFichierNom || 'Fichier envoyé'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleRemoveProjetFichier(ev)}
                                  className="p-1 rounded text-dark-500 hover:text-rose-400 hover:bg-rose-500/10 shrink-0"
                                  aria-label="Retirer le fichier"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <label
                                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer ${
                                  uploadingEvalId === ev.id
                                    ? 'opacity-60 pointer-events-none'
                                    : 'border-dark-600 text-dark-300 hover:border-sky-500/40 hover:text-sky-300'
                                }`}
                              >
                                {uploadingEvalId === ev.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Upload className="w-3.5 h-3.5" />
                                )}
                                Ajouter un fichier
                                <input
                                  type="file"
                                  accept="image/*,video/*,.sb3"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) void handleUploadProjetFichier(ev, file);
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            )}
                          </div>

                          <div className="sm:col-span-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-dark-500 mb-1.5">
                              Type de projet
                            </p>
                            <div className="inline-flex rounded-xl border border-dark-700 p-0.5 bg-dark-900/60">
                              <button
                                type="button"
                                onClick={() =>
                                  onEvaluationsChange((prev) =>
                                    prev.map((p) =>
                                      p.id === ev.id
                                        ? { ...p, projetFinal: false, projetProbleme: undefined, projetSolution: undefined }
                                        : p,
                                    ),
                                  )
                                }
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                  !ev.projetFinal
                                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                    : 'text-dark-400 hover:text-dark-200'
                                }`}
                              >
                                <FlaskConical className="w-3.5 h-3.5" />
                                Pratique
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onEvaluationsChange((prev) =>
                                    prev.map((p) =>
                                      p.id === ev.id ? { ...p, projetFinal: true } : p,
                                    ),
                                  )
                                }
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                  ev.projetFinal
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'text-dark-400 hover:text-dark-200'
                                }`}
                              >
                                <Award className="w-3.5 h-3.5" />
                                Projet final
                              </button>
                            </div>
                          </div>

                          {ev.projetFinal && (
                            <>
                              <div>
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-dark-500 mb-1.5 block">
                                  Problème
                                </label>
                                <textarea
                                  rows={2}
                                  className="input-field text-sm py-2 resize-y min-h-[4rem]"
                                  value={ev.projetProbleme || ''}
                                  onChange={(e) =>
                                    onEvaluationsChange((prev) =>
                                      prev.map((p) =>
                                        p.id === ev.id ? { ...p, projetProbleme: e.target.value } : p,
                                      ),
                                    )
                                  }
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-dark-500 mb-1.5 block">
                                  Solution
                                </label>
                                <textarea
                                  rows={2}
                                  className="input-field text-sm py-2 resize-y min-h-[4rem]"
                                  value={ev.projetSolution || ''}
                                  onChange={(e) =>
                                    onEvaluationsChange((prev) =>
                                      prev.map((p) =>
                                        p.id === ev.id ? { ...p, projetSolution: e.target.value } : p,
                                      ),
                                    )
                                  }
                                />
                              </div>
                            </>
                          )}

                          <div className={ev.projetFinal ? 'sm:col-span-2' : ''}>
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-dark-500 mb-1.5">
                              <MessageSquare className="w-3 h-3" /> Commentaire
                            </label>
                            <input
                              type="text"
                              className="input-field text-sm py-2"
                              placeholder="Observation…"
                              value={ev.commentaire || ''}
                              onChange={(e) =>
                                onEvaluationsChange((prev) =>
                                  prev.map((p) =>
                                    p.id === ev.id ? { ...p, commentaire: e.target.value } : p,
                                  ),
                                )
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!ev.present && !displayOnly && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-dark-500 italic">
                      <Sparkles className="w-3.5 h-3.5 text-dark-600" />
                      Marquer présent pour saisir note et suivi
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={alertTarget != null}
        onClose={() => setAlertTarget(null)}
        title={alertTarget ? `Alerte — ${formatFullName(alertTarget.eleve.prenom, alertTarget.eleve.nom)}` : 'Alerte'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Description de l&apos;incident ou observation</label>
            <textarea
              rows={4}
              className="input-field"
              placeholder="Comportement, matériel, difficulté, incident…"
              value={alertForm.description}
              onChange={(e) => setAlertForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Priorité</label>
            <select
              className="input-field"
              value={alertForm.priorite}
              onChange={(e) => setAlertForm((f) => ({ ...f, priorite: e.target.value as 'NORMALE' | 'URGENTE' }))}
            >
              <option value="NORMALE">Normale</option>
              <option value="URGENTE">Urgente</option>
            </select>
          </div>
          <label className="flex items-start gap-2 text-sm text-dark-300 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={alertForm.inclureDansRapport}
              onChange={(e) => setAlertForm((f) => ({ ...f, inclureDansRapport: e.target.checked }))}
            />
            <span>
              Inclure dans le rapport de fin de formation
              <span className="block text-xs text-dark-500 mt-0.5">
                Le logiciel intègre automatiquement cette alerte dans les observations du rapport annuel.
              </span>
            </span>
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={submitAlert} disabled={alertSending} className="btn-primary flex-1">
              {alertSending ? 'Envoi…' : 'Enregistrer l\'alerte'}
            </button>
            <button type="button" onClick={() => setAlertTarget(null)} className="btn-ghost">
              Annuler
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
