import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Calendar, Download, Loader2, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import { rapportService } from '../../services/api';
import { DEFAULT_SYNTHESE_ROWS, type RapportSyntheseCentre } from '../../types';
import { computePeriodePreset, PERIODE_PRESETS, type PeriodePresetId } from '../../utils/rapportPeriode';

type SyntheseRow = {
  categorie: string;
  defis: string;
  lecons: string;
  propsTrainer: string;
  propsEnfants: string;
  propsCdej: string;
  propsNehemiah: string;
};

type Apercu = {
  periodeLabel: string;
  seancesTerrain: number;
  elevesInscrits: number;
  elevesActifs: number;
  totalPresences: number;
};

type Props = {
  centreId: number;
  centreName: string;
  /** Dates suggérées depuis les filtres globaux (optionnel) */
  initialDebut?: string;
  initialFin?: string;
};

const MODULE_LABEL = 'Module 01 : Apprendre à coder avec Scratch';

function defaultPeriod() {
  return computePeriodePreset('module_6m');
}

export default function RapportAnnuelFormateurCard({
  centreId,
  centreName,
  initialDebut,
  initialFin,
}: Props) {
  const defaults = defaultPeriod();
  const [periodeDebut, setPeriodeDebut] = useState(initialDebut || defaults.debut);
  const [periodeFin, setPeriodeFin] = useState(initialFin || defaults.fin);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [apercuLoading, setApercuLoading] = useState(false);
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [rows, setRows] = useState<SyntheseRow[]>(DEFAULT_SYNTHESE_ROWS.map((r) => ({ ...r })));
  const [aime, setAime] = useState('');
  const [pasAime, setPasAime] = useState('');
  const [vision, setVision] = useState('');
  const [stats, setStats] = useState({
    projetsLibresP1: '',
    projetsLibresP2: '',
    projetsNonAcheves: '',
    projetsGroupe: '',
    projetsContextuels: '',
    projetsPresentes: '',
  });

  const periodeValide = Boolean(periodeDebut && periodeFin && periodeFin >= periodeDebut);

  const fetchApercu = useCallback(async () => {
    if (!periodeValide) {
      setApercu(null);
      return;
    }
    setApercuLoading(true);
    try {
      const { data } = await rapportService.apercuRapportFormateur(centreId, {
        debut: periodeDebut,
        fin: periodeFin,
      });
      setApercu(data as Apercu);
    } catch {
      setApercu(null);
    } finally {
      setApercuLoading(false);
    }
  }, [centreId, periodeDebut, periodeFin, periodeValide]);

  useEffect(() => {
    fetchApercu();
  }, [fetchApercu]);

  useEffect(() => {
    if (initialDebut) setPeriodeDebut(initialDebut);
    if (initialFin) setPeriodeFin(initialFin);
  }, [initialDebut, initialFin]);

  useEffect(() => {
    if (!showModal || !centreId || !periodeValide) return;
    setLoading(true);
    rapportService.getSyntheseCentre(centreId, {
      moduleLabel: MODULE_LABEL,
      debut: periodeDebut,
      fin: periodeFin,
    })
      .then(({ data }) => {
        if (data && !('empty' in data && data.empty)) {
          const s = data as RapportSyntheseCentre;
          if (s.syntheseTable) {
            try {
              const parsed = JSON.parse(s.syntheseTable) as SyntheseRow[];
              if (parsed.length) setRows(parsed);
            } catch { /* defaults */ }
          }
          setAime(s.aime || '');
          setPasAime(s.pasAime || '');
          setVision(s.vision || '');
          setStats({
            projetsLibresP1: s.projetsLibresP1 != null ? String(s.projetsLibresP1) : '',
            projetsLibresP2: s.projetsLibresP2 != null ? String(s.projetsLibresP2) : '',
            projetsNonAcheves: s.projetsNonAcheves != null ? String(s.projetsNonAcheves) : '',
            projetsGroupe: s.projetsGroupe != null ? String(s.projetsGroupe) : '',
            projetsContextuels: s.projetsContextuels != null ? String(s.projetsContextuels) : '',
            projetsPresentes: s.projetsPresentes != null ? String(s.projetsPresentes) : '',
          });
        }
      })
      .catch(() => toast.error('Impossible de charger la synthèse pour cette période.'))
      .finally(() => setLoading(false));
  }, [showModal, centreId, periodeDebut, periodeFin, periodeValide]);

  const applyPreset = (id: PeriodePresetId) => {
    const p = computePeriodePreset(id);
    setPeriodeDebut(p.debut);
    setPeriodeFin(p.fin);
  };

  const guardPeriode = (): boolean => {
    if (!periodeValide) {
      toast.error('Choisissez une période valide (début et fin) pour le rapport.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!guardPeriode()) return;
    setSaving(true);
    try {
      await rapportService.saveSyntheseCentre(centreId, {
        moduleLabel: MODULE_LABEL,
        dateDebut: periodeDebut,
        dateFin: periodeFin,
        syntheseTable: JSON.stringify(rows),
        aime,
        pasAime,
        vision,
        projetsLibresP1: stats.projetsLibresP1 ? Number(stats.projetsLibresP1) : undefined,
        projetsLibresP2: stats.projetsLibresP2 ? Number(stats.projetsLibresP2) : undefined,
        projetsNonAcheves: stats.projetsNonAcheves ? Number(stats.projetsNonAcheves) : undefined,
        projetsGroupe: stats.projetsGroupe ? Number(stats.projetsGroupe) : undefined,
        projetsContextuels: stats.projetsContextuels ? Number(stats.projetsContextuels) : undefined,
        projetsPresentes: stats.projetsPresentes ? Number(stats.projetsPresentes) : undefined,
      });
      toast.success('Synthèse enregistrée pour cette période.');
    } catch {
      toast.error('Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!guardPeriode()) return;
    setExporting(true);
    try {
      const res = await rapportService.exporterRapportFormateurPdf(centreId, {
        debut: periodeDebut,
        fin: periodeFin,
        moduleLabel: MODULE_LABEL,
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_formateur_${centreName.replace(/\s+/g, '_')}_${periodeDebut}_au_${periodeFin}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Rapport généré pour la période sélectionnée.');
    } catch {
      toast.error('Erreur lors de la génération du PDF.');
    } finally {
      setExporting(false);
    }
  };

  const updateRow = (idx: number, field: keyof SyntheseRow, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  return (
    <>
      <div className="card border-2 border-[#004b57]/20 bg-gradient-to-br from-white to-[#004b57]/5 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-2xl bg-[#004b57]/10 text-[#004b57]">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 text-lg">Rapport formateur — période ciblée</h3>
            <p className="text-sm text-slate-600 mt-1">
              Comme le PDF officiel : sélectionnez la <strong>durée d&apos;exécution du module</strong>.
              Seules les séances et présences comprises entre ces deux dates sont comptées
              (« Nbre de séance suivi » par enfant).
            </p>
            <p className="text-xs text-slate-500 mt-2">Centre : <strong>{centreName}</strong></p>
          </div>
        </div>

        <div className="rounded-xl border border-[#004b57]/15 bg-white p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#004b57]">
            <Calendar className="w-4 h-4" />
            Période du rapport
          </div>

          <div className="flex flex-wrap gap-2">
            {PERIODE_PRESETS.map(({ id, short }) => (
              <button
                key={id}
                type="button"
                onClick={() => applyPreset(id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-[#004b57]/10 hover:border-[#004b57]/30 transition-colors"
              >
                {short}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Date de début</label>
              <input
                type="date"
                className="input-field py-2"
                value={periodeDebut}
                onChange={(e) => setPeriodeDebut(e.target.value)}
              />
            </div>
            <div>
              <label className="label text-xs">Date de fin</label>
              <input
                type="date"
                className="input-field py-2"
                value={periodeFin}
                onChange={(e) => setPeriodeFin(e.target.value)}
              />
            </div>
          </div>

          {!periodeValide && (
            <p className="text-xs text-rose-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Indiquez une période valide avant de générer le rapport.
            </p>
          )}

          {periodeValide && (
            <div className="grid sm:grid-cols-4 gap-2 text-center text-xs">
              {apercuLoading ? (
                <p className="col-span-full text-slate-400 py-2">Calcul des données sur la période…</p>
              ) : apercu ? (
                <>
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-2">
                    <p className="font-bold text-slate-900">{apercu.seancesTerrain}</p>
                    <p className="text-slate-500">Séances terrain</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-2">
                    <p className="font-bold text-slate-900">{apercu.elevesActifs}</p>
                    <p className="text-slate-500">Élèves actifs</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-2">
                    <p className="font-bold text-slate-900">{apercu.totalPresences}</p>
                    <p className="text-slate-500">Présences</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-2">
                    <p className="font-bold text-slate-900 truncate" title={apercu.periodeLabel}>{apercu.periodeLabel}</p>
                    <p className="text-slate-500">Période</p>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowModal(true)} className="btn-secondary" disabled={!periodeValide}>
            Compléter la synthèse
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || !periodeValide}
            className="btn-primary"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Générer le PDF
          </button>
        </div>
      </div>

      <Modal
        open={showModal}
        title="Synthèse du rapport"
        subtitle={`${centreName} · ${periodeDebut} → ${periodeFin}`}
        size="xl"
        onClose={() => setShowModal(false)}
        footer={
          <>
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Fermer</button>
            <button type="button" onClick={handleSave} disabled={saving || loading} className="btn-secondary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </button>
            <button type="button" onClick={handleExport} disabled={exporting} className="btn-primary">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Générer PDF
            </button>
          </>
        }
      >
        {loading ? (
          <div className="py-12 text-center text-slate-500">Chargement…</div>
        ) : (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
            <p className="text-sm text-slate-600">
              Synthèse liée à la période <strong>{periodeDebut}</strong> → <strong>{periodeFin}</strong>.
              Les appréciations par enfant sont calculées uniquement sur ces dates.
            </p>

            <div className="grid sm:grid-cols-3 gap-3">
              {([
                ['projetsLibresP1', 'Projets libres partie 01'],
                ['projetsLibresP2', 'Projets libres partie 02'],
                ['projetsNonAcheves', 'Non achevés'],
                ['projetsGroupe', 'Projets de groupe'],
                ['projetsContextuels', 'Projets contextuels'],
                ['projetsPresentes', 'Projets présentés'],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="label text-xs">{label}</label>
                  <input
                    type="number"
                    min={0}
                    className="input-field py-2 text-sm"
                    placeholder="Auto (période)"
                    value={stats[key]}
                    onChange={(e) => setStats((s) => ({ ...s, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900">Synthèse — défis, leçons, propositions</h4>
              {rows.map((row, idx) => (
                <div key={row.categorie} className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50/50">
                  <p className="text-sm font-bold text-[#004b57]">{row.categorie}</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <input className="input-field text-xs py-2" placeholder="Défis"
                      value={row.defis} onChange={(e) => updateRow(idx, 'defis', e.target.value)} />
                    <input className="input-field text-xs py-2" placeholder="Leçons"
                      value={row.lecons} onChange={(e) => updateRow(idx, 'lecons', e.target.value)} />
                    <input className="input-field text-xs py-2" placeholder="Propositions Trainer"
                      value={row.propsTrainer} onChange={(e) => updateRow(idx, 'propsTrainer', e.target.value)} />
                    <input className="input-field text-xs py-2" placeholder="Propositions enfants"
                      value={row.propsEnfants} onChange={(e) => updateRow(idx, 'propsEnfants', e.target.value)} />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Qu&apos;as-tu aimé le plus ?</label>
                <textarea rows={2} className="input-field" value={aime} onChange={(e) => setAime(e.target.value)} />
              </div>
              <div>
                <label className="label">Qu&apos;est-ce que tu n&apos;as pas aimé ?</label>
                <textarea rows={2} className="input-field" value={pasAime} onChange={(e) => setPasAime(e.target.value)} />
              </div>
              <div>
                <label className="label">Vision / perspective</label>
                <textarea rows={2} className="input-field" value={vision} onChange={(e) => setVision(e.target.value)} />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
