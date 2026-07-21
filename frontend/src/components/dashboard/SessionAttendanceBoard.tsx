import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  UserCheck, UserX, Search, Clock, Star, MessageSquare,
  Briefcase, Users, TrendingUp, Award, FlaskConical,
  AlertTriangle, Eye, Hammer, Paperclip, Upload, Trash2, Loader2,
  ChevronDown, ChevronRight,
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

/** Durée en secondes : chrono en direct si la séance est en cours, sinon valeur figée à la clôture. */
function computeDureeSecondes(ev: EvaluationSession, session: SessionCours, tick: number): number | null {
  if (!ev.present) return null;
  if (session.statut === 'EN_COURS' && ev.heureArrivee) {
    return Math.max(0, Math.floor((tick - new Date(ev.heureArrivee).getTime()) / 1000));
  }
  if (ev.dureeSecondes != null) return ev.dureeSecondes;
  if (ev.dureeMinutes != null) return ev.dureeMinutes * 60;
  return null;
}

function formatHMS(totalSeconds: number | null): string {
  if (totalSeconds == null) return '—';
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

/** Construit le payload d'enregistrement serveur à partir de l'état local courant d'un élève. */
function buildEvaluationPayload(ev: EvaluationSession) {
  return {
    id: ev.id,
    present: ev.present,
    note: ev.present ? ev.note : undefined,
    commentaire: ev.commentaire,
    projetTravaille: ev.projetTravaille,
    projetFinal: ev.present ? (ev.projetFinal ?? false) : false,
    projetProbleme: ev.present && ev.projetFinal ? ev.projetProbleme : undefined,
    projetSolution: ev.present && ev.projetFinal ? ev.projetSolution : undefined,
  };
}

function noteLabel(note?: number | null): string {
  if (note == null) return '—';
  const n = note > 10 ? note / 2 : note;
  if (n >= 8) return 'Excellent';
  if (n >= 6) return 'Bien';
  if (n >= 4) return 'Moyen';
  return 'À suivre';
}

function noteTextColor(note?: number | null): string {
  if (note == null) return 'text-dark-500';
  const n = note > 10 ? note / 2 : note;
  if (n >= 8) return 'text-emerald-300';
  if (n >= 5) return 'text-amber-300';
  return 'text-rose-300';
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
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [alertTarget, setAlertTarget] = useState<EvaluationSession | null>(null);
  const [alertForm, setAlertForm] = useState({
    description: '',
    priorite: 'NORMALE' as 'NORMALE' | 'URGENTE',
    inclureDansRapport: true,
  });
  const [alertSending, setAlertSending] = useState(false);

  // Chrono en direct : se met à jour chaque seconde tant que la séance est en cours,
  // pour afficher une durée h:min:s qui avance réellement sous les yeux du formateur.
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (session.statut !== 'EN_COURS') return;
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [session.statut]);

  // --- Enregistrement automatique côté serveur ---------------------------------
  // Avant : les présences/notes/commentaires n'étaient sauvegardées que si le
  // formateur cliquait sur "Enregistrer" avant de quitter la page. En quittant le
  // lien plus tôt (ce qui arrive tout le temps sur le terrain), tout disparaissait.
  // Maintenant chaque changement est envoyé au serveur automatiquement : la
  // présence est enregistrée immédiatement au clic, et les autres champs (note,
  // commentaire, projet) sont sauvegardés quelques instants après la saisie ou dès
  // que le formateur quitte le champ. Rien ne dépend plus d'un clic manuel.
  const evaluationsRef = useRef(evaluations);
  useEffect(() => {
    evaluationsRef.current = evaluations;
  }, [evaluations]);

  const saveTimers = useRef<Map<number, number>>(new Map());
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [failedIds, setFailedIds] = useState<Set<number>>(new Set());

  // persistEvaluation prend l'objet à jour directement (pas un lookup dans le state,
  // qui n'est pas encore "commit" juste après un setState synchrone) : c'est ce qui
  // garantit qu'on envoie bien la toute dernière valeur cliquée/tapée, jamais une
  // valeur en retard d'un cran.
  const persistEvaluation = async (ev: EvaluationSession, opts: { syncResponse?: boolean } = {}) => {
    if (!sessionId) return; // brouillon hors ligne : géré par la sauvegarde locale existante
    setSavingIds((prev) => new Set(prev).add(ev.id));
    try {
      const { data } = await sessionService.updateEvaluations(sessionId, [buildEvaluationPayload(ev)]);
      setFailedIds((prev) => {
        if (!prev.has(ev.id)) return prev;
        const next = new Set(prev);
        next.delete(ev.id);
        return next;
      });
      if (opts.syncResponse && data?.evaluations) {
        // On ne resynchronise QUE la ligne qu'on vient d'enregistrer (heure
        // d'arrivée, durée...) — surtout ne pas remplacer tout le tableau, ça
        // écraserait une saisie en cours (non encore sauvegardée) sur une autre
        // ligne pendant que ce toggle était en vol.
        const fresh = (data.evaluations as EvaluationSession[]).find((u) => u.id === ev.id);
        if (fresh) {
          onEvaluationsChange((prev) => prev.map((p) => (p.id === ev.id ? fresh : p)));
        }
      }
    } catch {
      setFailedIds((prev) => new Set(prev).add(ev.id));
      toast.error("Échec de l'enregistrement — vérifiez votre connexion et réessayez.");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(ev.id);
        return next;
      });
    }
  };

  // Pour la sauvegarde différée (saisie de texte) : on relit l'état le plus frais
  // dans evaluationsRef au moment où le minuteur se déclenche, ce qui laisse le
  // temps au re-rendu React de s'être produit entre-temps.
  const persistFromRef = (evalId: number) => {
    const ev = evaluationsRef.current.find((e) => e.id === evalId);
    if (ev) void persistEvaluation(ev);
  };

  const scheduleSave = (evalId: number) => {
    const existing = saveTimers.current.get(evalId);
    if (existing) window.clearTimeout(existing);
    const timer = window.setTimeout(() => {
      saveTimers.current.delete(evalId);
      persistFromRef(evalId);
    }, 700);
    saveTimers.current.set(evalId, timer);
  };

  const flushSave = (evalId: number) => {
    const existing = saveTimers.current.get(evalId);
    if (existing) {
      window.clearTimeout(existing);
      saveTimers.current.delete(evalId);
      persistFromRef(evalId);
    }
  };

  const cancelScheduledSave = (evalId: number) => {
    const existing = saveTimers.current.get(evalId);
    if (existing) {
      window.clearTimeout(existing);
      saveTimers.current.delete(evalId);
    }
  };

  // Si le formateur quitte l'écran (change de page dans l'app) pendant qu'une
  // saisie était en attente de sauvegarde, on la pousse quand même immédiatement.
  useEffect(() => {
    return () => {
      saveTimers.current.forEach((timer, evalId) => {
        window.clearTimeout(timer);
        persistFromRef(evalId);
      });
      saveTimers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const updated: EvaluationSession = {
      ...ev,
      present: !ev.present,
      note: !ev.present ? ev.note : undefined,
      heureArrivee: !ev.present ? ev.heureArrivee || new Date().toISOString() : undefined,
      dureeMinutes: !ev.present ? ev.dureeMinutes : undefined,
      dureeSecondes: !ev.present ? ev.dureeSecondes : undefined,
      projetFinal: !ev.present ? ev.projetFinal : false,
      projetProbleme: !ev.present ? ev.projetProbleme : undefined,
      projetSolution: !ev.present ? ev.projetSolution : undefined,
    };
    onEvaluationsChange((prev) => prev.map((p) => (p.id === ev.id ? updated : p)));
    if (!ev.present) setExpandedId(null);
    // Le bouton de présence doit être un vrai bouton d'activation : la présence est
    // enregistrée côté serveur tout de suite, pas seulement en mémoire locale, et
    // pas via l'objet potentiellement pas encore à jour dans le state React.
    cancelScheduledSave(ev.id);
    void persistEvaluation(updated, { syncResponse: true });
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
  const showAlertColumn = canSignal && !supervisionMode;

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
            'Feuille de présence : activez chaque enfant présent, saisissez note et projet en face de son nom. Tout alimente le rapport annuel.'
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
        <div className="rounded-2xl border border-dark-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-dark-800/80 border-b border-dark-700 text-dark-400 text-[10px] uppercase tracking-wide">
                  <th className="text-left font-semibold px-3 py-2.5 w-10">#</th>
                  <th className="text-left font-semibold px-3 py-2.5 min-w-[190px]">Élève</th>
                  <th className="text-center font-semibold px-3 py-2.5 w-[116px]">Présence</th>
                  <th className="text-center font-semibold px-3 py-2.5 w-[104px]">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Durée (h:min:s)
                    </span>
                  </th>
                  <th className="text-center font-semibold px-3 py-2.5 w-[76px]">Note /10</th>
                  <th className="text-left font-semibold px-3 py-2.5 min-w-[170px]">
                    <span className="inline-flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> Projet travaillé
                    </span>
                  </th>
                  <th className="text-center font-semibold px-3 py-2.5 w-12">Fichier</th>
                  <th className="text-left font-semibold px-3 py-2.5 min-w-[160px]">
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> Commentaire
                    </span>
                  </th>
                  <th className="text-center font-semibold px-3 py-2.5 w-12">Détails</th>
                  {showAlertColumn && <th className="text-center font-semibold px-3 py-2.5 w-12">Alerte</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {filtered.map((ev, idx) => {
                  const noteVal = displayNote10(ev.note);
                  const working = isWorking(ev);
                  const dureeSec = computeDureeSecondes(ev, session, tick);
                  const isExpanded = expandedId === ev.id;
                  const rowBorder = ev.present
                    ? working
                      ? 'border-l-sky-500'
                      : 'border-l-emerald-500'
                    : 'border-l-transparent';

                  return (
                    <React.Fragment key={ev.id}>
                      <tr
                        className={`border-l-4 ${rowBorder} transition-colors ${
                          ev.present ? 'bg-emerald-500/[0.03]' : 'bg-transparent'
                        } hover:bg-dark-800/40`}
                      >
                        <td className="px-3 py-2 text-dark-500 text-xs align-top">{idx + 1}</td>

                        <td className="px-3 py-2 align-top">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                                ev.present
                                  ? working
                                    ? 'bg-gradient-to-br from-sky-500 to-indigo-600'
                                    : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                                  : 'bg-gradient-to-br from-slate-600 to-slate-800'
                              }`}
                            >
                              {initials(ev.eleve.prenom, ev.eleve.nom)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-white leading-tight truncate">
                                {formatFullName(ev.eleve.prenom, ev.eleve.nom)}
                              </p>
                              <p className="text-[10px] text-dark-500 truncate mt-0.5">
                                {ev.eleve.classe ? `${ev.eleve.classe} · ` : ''}
                                {ev.eleve.age} ans · {ev.eleve.sexe === 'F' ? 'Fille' : 'Garçon'}
                              </p>
                              {ev.projetFinal && (
                                <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  <Award className="w-2.5 h-2.5" /> Projet final
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-2 align-top text-center">
                          <button
                            type="button"
                            disabled={displayOnly}
                            onClick={() => togglePresence(ev)}
                            title={
                              displayOnly
                                ? undefined
                                : ev.present
                                ? 'Cliquer pour marquer absent'
                                : "Cliquer pour activer la présence"
                            }
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-wide transition-all ${
                              ev.present
                                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                                : 'border-dark-600 bg-dark-800/80 text-dark-400'
                            } ${
                              displayOnly
                                ? 'cursor-default'
                                : ev.present
                                ? 'hover:bg-emerald-500/25 cursor-pointer'
                                : 'hover:border-rose-500/40 hover:text-rose-300 cursor-pointer'
                            }`}
                          >
                            {ev.present ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                            {ev.present ? 'Présent' : 'Absent'}
                          </button>
                          {ev.present && ev.heureArrivee && (
                            <p className="text-[9px] text-dark-500 mt-1">
                              depuis {new Date(ev.heureArrivee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                          {savingIds.has(ev.id) && (
                            <p className="text-[9px] text-sky-400 mt-1 flex items-center justify-center gap-1">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" /> Enregistrement…
                            </p>
                          )}
                          {!savingIds.has(ev.id) && failedIds.has(ev.id) && (
                            <button
                              type="button"
                              onClick={() => void persistEvaluation(ev)}
                              className="text-[9px] text-rose-400 mt-1 underline decoration-dotted"
                              title="Cliquer pour réessayer l'enregistrement"
                            >
                              ⚠ Non enregistré — réessayer
                            </button>
                          )}
                        </td>

                        <td className="px-3 py-2 align-top text-center">
                          <span
                            className={`font-mono text-xs font-semibold ${
                              ev.present ? (session.statut === 'EN_COURS' ? 'text-emerald-300' : 'text-white') : 'text-dark-600'
                            }`}
                          >
                            {formatHMS(dureeSec)}
                          </span>
                        </td>

                        <td className="px-3 py-2 align-top text-center">
                          {!ev.present ? (
                            <span className="text-dark-600 text-xs">—</span>
                          ) : displayOnly ? (
                            <span className={`text-sm font-bold ${noteTextColor(ev.note)}`}>
                              {noteVal !== '' ? noteVal : '—'}
                            </span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={10}
                              step={0.5}
                              className="input-field text-center text-xs py-1.5 px-1 w-16 mx-auto"
                              placeholder="—"
                              value={noteVal}
                              onChange={(e) => {
                                onNoteChange(ev.id, e.target.value);
                                scheduleSave(ev.id);
                              }}
                              onBlur={() => flushSave(ev.id)}
                            />
                          )}
                          {ev.present && (
                            <p className={`text-[9px] mt-0.5 ${noteTextColor(ev.note)}`}>{noteLabel(ev.note)}</p>
                          )}
                        </td>

                        <td className="px-3 py-2 align-top">
                          {!ev.present ? (
                            <span className="text-dark-600 text-xs italic">Marquer présent pour saisir</span>
                          ) : displayOnly ? (
                            <span className="text-dark-200 text-sm">{ev.projetTravaille || '—'}</span>
                          ) : (
                            <input
                              type="text"
                              className="input-field text-sm py-1.5"
                              placeholder={ev.eleve.projet?.nom || 'Projet du jour…'}
                              value={ev.projetTravaille || ''}
                              onChange={(e) => {
                                onEvaluationsChange((prev) =>
                                  prev.map((p) =>
                                    p.id === ev.id ? { ...p, projetTravaille: e.target.value } : p,
                                  ),
                                );
                                scheduleSave(ev.id);
                              }}
                              onBlur={() => flushSave(ev.id)}
                            />
                          )}
                        </td>

                        <td className="px-3 py-2 align-top text-center">
                          {!ev.present ? (
                            <span className="text-dark-700">—</span>
                          ) : ev.projetFichierUrl ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => void handleDownloadProjetFichier(ev)}
                                disabled={downloadingEvalId === ev.id}
                                title={ev.projetFichierNom || 'Voir le fichier'}
                                className="p-1.5 rounded text-sky-300 hover:bg-sky-500/10"
                              >
                                {downloadingEvalId === ev.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Paperclip className="w-3.5 h-3.5" />
                                )}
                              </button>
                              {!displayOnly && (
                                <button
                                  type="button"
                                  onClick={() => void handleRemoveProjetFichier(ev)}
                                  title="Retirer le fichier"
                                  className="p-1.5 rounded text-dark-500 hover:text-rose-400 hover:bg-rose-500/10"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ) : displayOnly ? (
                            <span className="text-dark-700">—</span>
                          ) : (
                            <label
                              title="Ajouter un fichier (photo, vidéo, .sb3)"
                              className={`inline-flex p-1.5 rounded text-dark-400 hover:text-sky-300 hover:bg-sky-500/10 cursor-pointer ${
                                uploadingEvalId === ev.id ? 'opacity-60 pointer-events-none' : ''
                              }`}
                            >
                              {uploadingEvalId === ev.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Upload className="w-3.5 h-3.5" />
                              )}
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
                        </td>

                        <td className="px-3 py-2 align-top">
                          {!ev.present ? (
                            <span className="text-dark-700 text-xs">—</span>
                          ) : displayOnly ? (
                            <span className="text-dark-300 text-sm">{ev.commentaire || '—'}</span>
                          ) : (
                            <input
                              type="text"
                              className="input-field text-sm py-1.5"
                              placeholder="Observation…"
                              value={ev.commentaire || ''}
                              onChange={(e) => {
                                onEvaluationsChange((prev) =>
                                  prev.map((p) =>
                                    p.id === ev.id ? { ...p, commentaire: e.target.value } : p,
                                  ),
                                );
                                scheduleSave(ev.id);
                              }}
                              onBlur={() => flushSave(ev.id)}
                            />
                          )}
                        </td>

                        <td className="px-3 py-2 align-top text-center">
                          <button
                            type="button"
                            disabled={!ev.present}
                            onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                            title="Type de projet, problème et solution"
                            className={`p-1.5 rounded ${
                              !ev.present
                                ? 'text-dark-700 cursor-not-allowed'
                                : 'text-dark-400 hover:text-primary-300 hover:bg-primary-500/10'
                            }`}
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </td>

                        {showAlertColumn && (
                          <td className="px-3 py-2 align-top text-center">
                            <button
                              type="button"
                              onClick={() => setAlertTarget(ev)}
                              title="Signaler / alerter"
                              className="p-1.5 rounded text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>

                      {isExpanded && ev.present && (
                        <tr className="bg-dark-900/60 border-l-4 border-l-dark-700">
                          <td />
                          <td colSpan={showAlertColumn ? 8 : 7} className="px-3 py-3">
                            <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-3 space-y-3">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-dark-500 mb-1.5">
                                  Type de projet
                                </p>
                                {displayOnly ? (
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                      ev.projetFinal
                                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                        : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                    }`}
                                  >
                                    {ev.projetFinal ? <Award className="w-3.5 h-3.5" /> : <FlaskConical className="w-3.5 h-3.5" />}
                                    {ev.projetFinal ? 'Projet final' : 'Pratique'}
                                  </span>
                                ) : (
                                  <div className="inline-flex rounded-xl border border-dark-700 p-0.5 bg-dark-900/60">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated: EvaluationSession = {
                                          ...ev,
                                          projetFinal: false,
                                          projetProbleme: undefined,
                                          projetSolution: undefined,
                                        };
                                        onEvaluationsChange((prev) => prev.map((p) => (p.id === ev.id ? updated : p)));
                                        cancelScheduledSave(ev.id);
                                        void persistEvaluation(updated);
                                      }}
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
                                      onClick={() => {
                                        const updated: EvaluationSession = { ...ev, projetFinal: true };
                                        onEvaluationsChange((prev) => prev.map((p) => (p.id === ev.id ? updated : p)));
                                        cancelScheduledSave(ev.id);
                                        void persistEvaluation(updated);
                                      }}
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
                                )}
                              </div>

                              {ev.projetFinal && (
                                <div className="grid sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wide text-dark-500 mb-1.5 block">
                                      Problème
                                    </label>
                                    {displayOnly ? (
                                      <p className="text-dark-200 text-sm">{ev.projetProbleme || '—'}</p>
                                    ) : (
                                      <textarea
                                        rows={2}
                                        className="input-field text-sm py-2 resize-y min-h-[4rem]"
                                        value={ev.projetProbleme || ''}
                                        onChange={(e) => {
                                          onEvaluationsChange((prev) =>
                                            prev.map((p) =>
                                              p.id === ev.id ? { ...p, projetProbleme: e.target.value } : p,
                                            ),
                                          );
                                          scheduleSave(ev.id);
                                        }}
                                        onBlur={() => flushSave(ev.id)}
                                      />
                                    )}
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wide text-dark-500 mb-1.5 block">
                                      Solution
                                    </label>
                                    {displayOnly ? (
                                      <p className="text-dark-200 text-sm">{ev.projetSolution || '—'}</p>
                                    ) : (
                                      <textarea
                                        rows={2}
                                        className="input-field text-sm py-2 resize-y min-h-[4rem]"
                                        value={ev.projetSolution || ''}
                                        onChange={(e) => {
                                          onEvaluationsChange((prev) =>
                                            prev.map((p) =>
                                              p.id === ev.id ? { ...p, projetSolution: e.target.value } : p,
                                            ),
                                          );
                                          scheduleSave(ev.id);
                                        }}
                                        onBlur={() => flushSave(ev.id)}
                                      />
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
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
