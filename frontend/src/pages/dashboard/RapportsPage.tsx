import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { rapportService, centreService, eleveService } from '../../services/api';
import type { Centre, Eleve } from '../../types';
import {
  FileSpreadsheet, Download, Calendar, Building2, Loader2, Filter, FileText,
  Users, Clock, Activity, Wallet, ClipboardList, RotateCcw, CheckCircle2,
  ShieldCheck, Sparkles, Printer, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageLoadingSkeleton } from '../../components/ui/DashboardSkeletons';
import { useMinDelayLoading } from '../../hooks/useMinDelayLoading';

type ExportKey =
  | 'eleves'
  | 'eleves-pdf'
  | 'seances'
  | 'seances-pdf'
  | 'heures'
  | 'heures-pdf'
  | 'activites'
  | 'activites-pdf'
  | 'transactions'
  | 'transactions-pdf';

export default function RapportsPage() {
  const { hasRole } = useAuth();

  const [centres, setCentres] = useState<Centre[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);
  const skeletonLoading = useMinDelayLoading(loading, 220);

  const [selectedCentreId, setSelectedCentreId] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCluster, setSelectedCluster] = useState('');
  const [selectedEleveId, setSelectedEleveId] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  const [exporting, setExporting] = useState<ExportKey | null>(null);

  const isComptable = hasRole('COMPTABLE');
  const isDirecteur = hasRole('DIRECTEUR');
  const isFormateur = hasRole('FORMATEUR');
  const isCoordinateur = hasRole('COORDINATEUR', 'RESPONSABLE_CLUSTER');
  const canPedago = !isComptable;
  const canFinance = isDirecteur || isComptable;

  useEffect(() => {
    fetchCentres();
  }, []);

  useEffect(() => {
    if (!selectedCentreId) {
      setEleves([]);
      setSelectedEleveId('');
      return;
    }
    fetchElevesByCentre(Number(selectedCentreId));
  }, [selectedCentreId]);

  const fetchCentres = async () => {
    try {
      const res = isDirecteur ? await centreService.getAll() : await centreService.getMesCentres();
      setCentres(res.data);
    } catch {
      toast.error('Erreur lors du chargement des centres.');
    } finally {
      setLoading(false);
    }
  };

  const fetchElevesByCentre = async (centreId: number) => {
    try {
      const res = await eleveService.getByCentre(centreId);
      setEleves(res.data);
    } catch {
      setEleves([]);
    }
  };

  const regions = useMemo(
    () => Array.from(new Set(centres.map((c) => c.region).filter(Boolean))) as string[],
    [centres],
  );

  const clusters = useMemo(() => {
    const source = selectedRegion
      ? centres.filter((c) => c.region === selectedRegion)
      : centres;
    return Array.from(new Set(source.map((c) => c.cluster).filter(Boolean))) as string[];
  }, [centres, selectedRegion]);

  const filteredCentres = useMemo(() => {
    return centres.filter((c) => {
      const okRegion = selectedRegion ? c.region === selectedRegion : true;
      const okCluster = selectedCluster ? c.cluster === selectedCluster : true;
      return okRegion && okCluster;
    });
  }, [centres, selectedRegion, selectedCluster]);

  const scopeLabel = useMemo(() => {
    const parts: string[] = [];
    if (selectedRegion) parts.push(selectedRegion);
    if (selectedCluster) parts.push(`cluster ${selectedCluster}`);
    if (selectedCentreId) {
      const c = centres.find((x) => String(x.id) === selectedCentreId);
      parts.push(c?.nom || 'centre');
    } else {
      parts.push(filteredCentres.length === centres.length
        ? `${centres.length} centre(s)`
        : `${filteredCentres.length} centre(s) filtrés`);
    }
    if (selectedEleveId) {
      const e = eleves.find((x) => String(x.id) === selectedEleveId);
      if (e) parts.push(`${e.prenom} ${e.nom}`);
    }
    if (dateDebut || dateFin) {
      parts.push(`${dateDebut || '…'} → ${dateFin || '…'}`);
    }
    return parts.join(' · ');
  }, [
    selectedRegion, selectedCluster, selectedCentreId, selectedEleveId,
    dateDebut, dateFin, centres, filteredCentres, eleves,
  ]);

  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const validateDates = () => {
    if (dateDebut && dateFin && dateDebut > dateFin) {
      toast.error('La date de début doit être antérieure à la date de fin.');
      return false;
    }
    return true;
  };

  const sharedParams = {
    centreId: selectedCentreId || undefined,
    region: selectedRegion || undefined,
    cluster: selectedCluster || undefined,
    debut: dateDebut || undefined,
    fin: dateFin || undefined,
  };

  const runExport = async (
    key: ExportKey,
    action: () => Promise<{ data: Blob }>,
    filename: string,
    successMsg: string,
  ) => {
    if (!validateDates()) return;
    setExporting(key);
    try {
      const res = await action();
      if (!res.data || res.data.size === 0) {
        toast.error('Aucune donnée pour ces filtres.');
        return;
      }
      downloadFile(res.data, filename);
      toast.success(`${successMsg} — ${scopeLabel}`, { duration: 4500 });
    } catch {
      toast.error("Erreur lors de l'exportation.");
    } finally {
      setExporting(null);
    }
  };

  const stamp = () => new Date().toISOString().split('T')[0];

  const resetFilters = () => {
    setSelectedRegion('');
    setSelectedCluster('');
    setSelectedCentreId('');
    setSelectedEleveId('');
    setDateDebut('');
    setDateFin('');
  };

  if (skeletonLoading) {
    return <PageLoadingSkeleton cardCount={4} />;
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#003f49] via-[#004b57] to-[#08798a] p-6 sm:p-8 text-white shadow-xl shadow-[#004b57]/10">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-[#5ED9FF]/10 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              <Sparkles className="h-3.5 w-3.5" /> Smart Kids Academy
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold">Centre de rapports</h1>
            <p className="text-white/75 mt-2 max-w-2xl text-sm sm:text-base">
            {isFormateur
              ? 'Exportez le suivi de vos centres : apprenants, séances, heures et activités.'
              : isCoordinateur
                ? 'Rapports de votre centre — séances, apprenants et activités.'
                : isComptable
                  ? 'Exports financiers filtrés par période.'
                  : 'Exports pédagogiques et financiers par région, cluster, centre et période.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Données sécurisées
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
              <Printer className="h-3.5 w-3.5" /> PDF prêt à imprimer
            </span>
          </div>
        </div>
      </section>

      {/* Filtres */}
      <div className="card border border-slate-200 bg-white p-4 sm:p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#004b57]/10 text-[#004b57]">
                <Filter className="w-4 h-4" />
              </span>
              Périmètre du document
            </h2>
            <p className="mt-1 text-xs text-slate-500">Les filtres seront rappelés dans l’en-tête du rapport.</p>
          </div>
          <button type="button" onClick={resetFilters} className="btn-ghost shrink-0 text-xs">
            <RotateCcw className="w-3.5 h-3.5" />
            Réinitialiser
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="label">Région</label>
            <select
              className="input-field"
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setSelectedCluster('');
                setSelectedCentreId('');
                setSelectedEleveId('');
              }}
            >
              <option value="">Toutes les régions</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Cluster</label>
            <select
              className="input-field"
              value={selectedCluster}
              onChange={(e) => {
                setSelectedCluster(e.target.value);
                setSelectedCentreId('');
                setSelectedEleveId('');
              }}
            >
              <option value="">Tous les clusters</option>
              {clusters.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" /> Centre
            </label>
            <select
              className="input-field"
              value={selectedCentreId}
              onChange={(e) => {
                setSelectedCentreId(e.target.value);
                setSelectedEleveId('');
              }}
            >
              <option value="">Tous les centres du filtre</option>
              {filteredCentres.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>
          {canPedago && (
            <div>
              <label className="label">Enfant (optionnel)</label>
              <select
                className="input-field"
                value={selectedEleveId}
                onChange={(e) => setSelectedEleveId(e.target.value)}
                disabled={!selectedCentreId}
              >
                <option value="">
                  {selectedCentreId ? 'Tous les enfants du centre' : 'Choisir un centre d’abord'}
                </option>
                {eleves.map((e) => (
                  <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Début
            </label>
            <input
              type="date"
              className="input-field"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
            />
          </div>
          <div>
            <label className="label flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Fin
            </label>
            <input
              type="date"
              className="input-field"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-[#004b57]/15 bg-[#004b57]/5 px-3.5 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#004b57]" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#004b57]">Sélection actuelle</p>
            <p className="mt-0.5 text-xs text-slate-600">{scopeLabel}</p>
          </div>
        </div>
      </div>

      {/* Cartes d’export */}
      <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
        {canPedago && (
          <ReportCard
            icon={<Users className="w-5 h-5" />}
            eyebrow="Suivi pédagogique"
            title="Apprenants"
            description="Liste des élèves avec identité, centre, classe et heures. Filtrez par enfant pour une fiche pédagogique avec les causes de non-avancement et les justifications."
          >
            <ExportButtons
              exporting={exporting}
              excelKey="eleves"
              pdfKey="eleves-pdf"
              onExcel={() =>
                runExport(
                  'eleves',
                  () =>
                    selectedEleveId
                      ? rapportService.exporterEleve(Number(selectedEleveId))
                      : rapportService.exporterEleves({
                          centreId: selectedCentreId ? Number(selectedCentreId) : undefined,
                          region: selectedRegion || undefined,
                          cluster: selectedCluster || undefined,
                        }),
                  `rapport_eleves_${stamp()}.xlsx`,
                  'Rapport apprenants Excel',
                )
              }
              onPdf={() =>
                runExport(
                  'eleves-pdf',
                  () =>
                    selectedEleveId
                      ? rapportService.exporterEleveFichePdf(Number(selectedEleveId))
                      : rapportService.exporterElevesPdf({
                          centreId: selectedCentreId ? Number(selectedCentreId) : undefined,
                          region: selectedRegion || undefined,
                          cluster: selectedCluster || undefined,
                        }),
                  `rapport_eleves_${stamp()}.pdf`,
                  'Rapport apprenants PDF',
                )
              }
            />
          </ReportCard>
        )}

        {canPedago && (
          <ReportCard
            icon={<ClipboardList className="w-5 h-5" />}
            eyebrow="Opérations terrain"
            title="Suivi des séances"
            description="Format terrain : NOM, PRENOMS, SEXE, CLASSE, AGE, MODULE, PARTICIPATION /10, équipements, défis + alertes centre."
          >
            <ExportButtons
              exporting={exporting}
              excelKey="seances"
              pdfKey="seances-pdf"
              onExcel={() =>
                runExport(
                  'seances',
                  () => rapportService.exporterSeances(sharedParams),
                  `suivi_seances_${stamp()}.xlsx`,
                  'Suivi séances Excel',
                )
              }
              onPdf={() =>
                runExport(
                  'seances-pdf',
                  () => rapportService.exporterSeancesPdf(sharedParams),
                  `suivi_seances_${stamp()}.pdf`,
                  'Suivi séances PDF',
                )
              }
            />
          </ReportCard>
        )}

        {canPedago && (
          <ReportCard
            icon={<Clock className="w-5 h-5" />}
            eyebrow="Temps de formation"
            title="Heures de formation"
            description="Heures cumulées par apprenant et nombre de sessions sur la période choisie."
          >
            <ExportButtons
              exporting={exporting}
              excelKey="heures"
              pdfKey="heures-pdf"
              onExcel={() =>
                runExport(
                  'heures',
                  () => rapportService.exporterHeures(sharedParams),
                  `rapport_heures_${stamp()}.xlsx`,
                  'Rapport heures Excel',
                )
              }
              onPdf={() =>
                runExport(
                  'heures-pdf',
                  () => rapportService.exporterHeuresPdf(sharedParams),
                  `rapport_heures_${stamp()}.pdf`,
                  'Rapport heures PDF',
                )
              }
            />
          </ReportCard>
        )}

        {canPedago && (
          <ReportCard
            icon={<Activity className="w-5 h-5" />}
            eyebrow="Journal pédagogique"
            title="Activités / modules"
            description="Journal des modules réalisés : date, centre, formateur, durée et présents."
          >
            <ExportButtons
              exporting={exporting}
              excelKey="activites"
              pdfKey="activites-pdf"
              onExcel={() =>
                runExport(
                  'activites',
                  () => rapportService.exporterActivites(sharedParams),
                  `rapport_activites_${stamp()}.xlsx`,
                  'Rapport activités Excel',
                )
              }
              onPdf={() =>
                runExport(
                  'activites-pdf',
                  () => rapportService.exporterActivitesPdf(sharedParams),
                  `rapport_activites_${stamp()}.pdf`,
                  'Rapport activités PDF',
                )
              }
            />
          </ReportCard>
        )}

        {canFinance && (
          <ReportCard
            icon={<Wallet className="w-5 h-5" />}
            eyebrow="Suivi administratif"
            title="Financier"
            description="Transactions et paiements filtrés par période. Le Directeur consulte et imprime ; le Comptable saisit."
            className="md:col-span-2"
          >
            <ExportButtons
              exporting={exporting}
              excelKey="transactions"
              pdfKey="transactions-pdf"
              onExcel={() =>
                runExport(
                  'transactions',
                  () =>
                    rapportService.exporterTransactions({
                      debut: dateDebut || undefined,
                      fin: dateFin || undefined,
                    }),
                  `rapport_transactions_${stamp()}.xlsx`,
                  'Rapport financier Excel',
                )
              }
              onPdf={() =>
                runExport(
                  'transactions-pdf',
                  () =>
                    rapportService.exporterTransactionsPdf({
                      debut: dateDebut || undefined,
                      fin: dateFin || undefined,
                    }),
                  `rapport_financier_${stamp()}.pdf`,
                  'Rapport financier PDF',
                )
              }
            />
          </ReportCard>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#004b57]" />
        <p>
          Les documents respectent automatiquement votre périmètre d’accès. Chaque PDF comporte
          l’identité Smart Kids Academy, la période, le contexte du filtre, la pagination et un espace de validation.
        </p>
      </div>
    </div>
  );
}

function ReportCard({
  icon,
  eyebrow,
  title,
  description,
  children,
  className = '',
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`group card relative overflow-hidden border border-slate-200 bg-white p-5 sm:p-6 space-y-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#004b57]/30 hover:shadow-lg ${className}`}>
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#004b57] via-[#08798a] to-[#5ED9FF]" />
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl border border-[#004b57]/10 bg-[#004b57]/8 text-[#004b57] shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#004b57]/70">{eyebrow}</p>
          <h3 className="mt-0.5 text-slate-900 font-bold text-lg">{title}</h3>
          <p className="text-slate-500 text-sm mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ExportButtons({
  exporting,
  excelKey,
  pdfKey,
  onExcel,
  onPdf,
}: {
  exporting: ExportKey | null;
  excelKey: ExportKey;
  pdfKey: ExportKey;
  onExcel: () => void;
  onPdf: () => void;
}) {
  const busy = !!exporting;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      <button
        type="button"
        onClick={onExcel}
        disabled={busy}
        className="group/button w-full justify-between inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border border-[#004b57]/20 bg-[#004b57]/5 text-[#004b57] hover:bg-[#004b57]/10 disabled:opacity-50"
      >
        <span className="inline-flex items-center gap-2">
          {exporting === excelKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
          Excel
        </span>
        <ChevronRight className="h-4 w-4 opacity-50 transition-transform group-hover/button:translate-x-0.5" />
      </button>
      <button
        type="button"
        onClick={onPdf}
        disabled={busy}
        className="group/button w-full justify-between inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-[#004b57] text-white shadow-sm hover:bg-[#003f49] disabled:opacity-50"
      >
        <span className="inline-flex items-center gap-2">
          {exporting === pdfKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          PDF / Imprimer
        </span>
        <Download className="h-4 w-4 opacity-70" />
      </button>
    </div>
  );
}
