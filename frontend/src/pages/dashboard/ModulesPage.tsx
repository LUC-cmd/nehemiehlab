import React, { useEffect, useMemo, useState } from 'react';
import { rapportService, centreService, userService } from '../../services/api';
import type { Centre, User, RapportExecutionSeanceItem } from '../../types';
import { centreLabel, sortCentresByCode } from '../../utils/centreLabel';
import { formatFullName } from '../../utils/displayName';
import {
  Layers, Users, Building2, Calendar, Loader2, BookOpen, Sparkles, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageLoadingSkeleton } from '../../components/ui/DashboardSkeletons';
import { useMinDelayLoading } from '../../hooks/useMinDelayLoading';

type Mode = 'formateur' | 'centre';

type ModuleGroup = {
  module: string;
  seances: number;
  presents: number;
  totalEleves: number;
  premiereDate: string | null;
  derniereDate: string | null;
  autresNoms: string[]; // centres (mode formateur) ou formateurs (mode centre)
};

function formatDateFr(iso: string | null) {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function groupByModule(rows: RapportExecutionSeanceItem[], mode: Mode): ModuleGroup[] {
  const groups = new Map<string, ModuleGroup>();
  for (const row of rows) {
    const key = row.moduleFait?.trim() || 'Module non renseigné';
    const other = mode === 'formateur' ? row.centreNom : row.formateurNom;
    if (!groups.has(key)) {
      groups.set(key, {
        module: key,
        seances: 0,
        presents: 0,
        totalEleves: 0,
        premiereDate: null,
        derniereDate: null,
        autresNoms: [],
      });
    }
    const g = groups.get(key)!;
    g.seances += 1;
    g.presents += row.presents || 0;
    g.totalEleves += row.totalEleves || 0;
    if (row.date) {
      if (!g.premiereDate || row.date < g.premiereDate) g.premiereDate = row.date;
      if (!g.derniereDate || row.date > g.derniereDate) g.derniereDate = row.date;
    }
    if (other && !g.autresNoms.includes(other)) g.autresNoms.push(other);
  }
  return Array.from(groups.values()).sort((a, b) => b.seances - a.seances);
}

export default function ModulesPage() {
  const [mode, setMode] = useState<Mode>('formateur');
  const [centres, setCentres] = useState<Centre[]>([]);
  const [formateurs, setFormateurs] = useState<User[]>([]);
  const [selectedFormateurId, setSelectedFormateurId] = useState('');
  const [selectedCentreId, setSelectedCentreId] = useState('');

  const [initialLoading, setInitialLoading] = useState(true);
  const skeletonLoading = useMinDelayLoading(initialLoading, 220);

  const [rows, setRows] = useState<RapportExecutionSeanceItem[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [centresRes, formateursRes] = await Promise.all([
          centreService.getAll(),
          userService.getFormateurs(),
        ]);
        setCentres(sortCentresByCode(centresRes.data));
        setFormateurs(
          [...formateursRes.data].sort((a, b) =>
            formatFullName(a.prenom, a.nom).localeCompare(formatFullName(b.prenom, b.nom), 'fr'),
          ),
        );
      } catch {
        toast.error('Erreur lors du chargement des formateurs et centres.');
      } finally {
        setInitialLoading(false);
      }
    };
    fetchInitial();
  }, []);

  const selectedFormateurLabel = useMemo(() => {
    const f = formateurs.find((x) => String(x.id) === selectedFormateurId);
    return f ? formatFullName(f.prenom, f.nom) : '';
  }, [formateurs, selectedFormateurId]);

  const selectedCentreLabel = useMemo(() => {
    const c = centres.find((x) => String(x.id) === selectedCentreId);
    return c ? centreLabel(c) : '';
  }, [centres, selectedCentreId]);

  useEffect(() => {
    const load = async () => {
      if (mode === 'formateur' && !selectedFormateurId) {
        setRows([]);
        setHasSearched(false);
        return;
      }
      if (mode === 'centre' && !selectedCentreId) {
        setRows([]);
        setHasSearched(false);
        return;
      }
      setLoadingRows(true);
      setHasSearched(true);
      try {
        const params = mode === 'formateur'
          ? { formateurId: selectedFormateurId }
          : { centreId: selectedCentreId };
        const { data } = await rapportService.listExecutionSeances(params);
        setRows(data.sessions || []);
      } catch {
        toast.error('Erreur lors du chargement des séances.');
        setRows([]);
      } finally {
        setLoadingRows(false);
      }
    };
    void load();
  }, [mode, selectedFormateurId, selectedCentreId]);

  const groups = useMemo(() => groupByModule(rows, mode), [rows, mode]);
  const totalSeances = rows.length;
  const totalPresents = rows.reduce((sum, r) => sum + (r.presents || 0), 0);

  const switchMode = (next: Mode) => {
    setMode(next);
    setRows([]);
    setHasSearched(false);
  };

  if (skeletonLoading) {
    return <PageLoadingSkeleton cardCount={4} />;
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#003f49] via-[#004b57] to-[#08798a] p-6 sm:p-8 text-white shadow-xl shadow-[#004b57]/10">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-[#5ED9FF]/10 blur-3xl" />
        <div className="relative">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            <Sparkles className="h-3.5 w-3.5" /> Smart Kids Academy
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold">Modules par formateur / centre</h1>
          <p className="text-white/75 mt-2 max-w-2xl text-sm sm:text-base">
            Choisissez un formateur pour voir tous les modules qu'il a enseignés, ou un centre pour voir tous
            les modules qui y ont été enseignés.
          </p>
        </div>
      </section>

      <div className="card border border-slate-200 bg-white p-4 sm:p-6 space-y-5 shadow-sm">
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => switchMode('formateur')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === 'formateur' ? 'bg-white text-[#004b57] shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" /> Par formateur
          </button>
          <button
            type="button"
            onClick={() => switchMode('centre')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === 'centre' ? 'bg-white text-[#004b57] shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building2 className="w-4 h-4" /> Par centre
          </button>
        </div>

        {mode === 'formateur' ? (
          <div>
            <label className="label">Formateur</label>
            <div className="relative">
              <select
                className="input-field appearance-none pr-9"
                value={selectedFormateurId}
                onChange={(e) => setSelectedFormateurId(e.target.value)}
              >
                <option value="">Sélectionnez un formateur…</option>
                {formateurs.map((f) => (
                  <option key={f.id} value={f.id}>{formatFullName(f.prenom, f.nom)}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>
        ) : (
          <div>
            <label className="label">Centre</label>
            <div className="relative">
              <select
                className="input-field appearance-none pr-9"
                value={selectedCentreId}
                onChange={(e) => setSelectedCentreId(e.target.value)}
              >
                <option value="">Sélectionnez un centre…</option>
                {centres.map((c) => (
                  <option key={c.id} value={c.id}>{centreLabel(c)}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>
        )}
      </div>

      {loadingRows && (
        <div className="card border border-slate-200 bg-white p-10 flex items-center justify-center text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement des modules…
        </div>
      )}

      {!loadingRows && hasSearched && groups.length === 0 && (
        <div className="card border border-slate-200 bg-white p-10 text-center text-slate-500">
          Aucune séance clôturée trouvée{mode === 'formateur' ? ` pour ${selectedFormateurLabel}` : ` pour ${selectedCentreLabel}`}.
        </div>
      )}

      {!loadingRows && !hasSearched && (
        <div className="card border border-slate-200 bg-white p-10 text-center text-slate-500">
          {mode === 'formateur'
            ? 'Sélectionnez un formateur pour afficher tous les modules qu\'il a enseignés.'
            : 'Sélectionnez un centre pour afficher tous les modules qui y ont été enseignés.'}
        </div>
      )}

      {!loadingRows && groups.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Modules distincts</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{groups.length}</p>
            </div>
            <div className="card border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Séances clôturées</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalSeances}</p>
            </div>
            <div className="card border border-slate-200 bg-white p-4 col-span-2 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Élèves présents (cumul)</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalPresents}</p>
            </div>
          </div>

          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.module} className="card border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#004b57]/10 text-[#004b57]">
                      <BookOpen className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900">{g.module}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDateFr(g.premiereDate)} — {formatDateFr(g.derniereDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="badge-primary px-2.5 py-1 rounded-lg">
                      {g.seances} séance{g.seances > 1 ? 's' : ''}
                    </span>
                    <span className="badge-success px-2.5 py-1 rounded-lg">
                      {g.presents} présent{g.presents > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                {g.autresNoms.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                    {mode === 'formateur' ? <Building2 className="w-3.5 h-3.5 text-slate-400" /> : <Users className="w-3.5 h-3.5 text-slate-400" />}
                    {g.autresNoms.map((nom) => (
                      <span key={nom} className="rounded-full bg-slate-100 px-2.5 py-1">{nom}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {!skeletonLoading && !initialLoading && formateurs.length === 0 && mode === 'formateur' && (
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" /> Aucun formateur trouvé.
        </div>
      )}
    </div>
  );
}
