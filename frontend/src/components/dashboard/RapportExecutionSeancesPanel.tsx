import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { rapportService, userService } from '../../services/api';
import type { RapportExecutionSeanceItem, User } from '../../types';
import {
  ArrowDownAZ, ArrowUpAZ, Download, FileText, Loader2, RefreshCw, Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

type SortKey = 'date' | 'centre' | 'formateur' | 'presents';
type SortDir = 'asc' | 'desc';

type FilterParams = {
  centreId?: string;
  region?: string;
  cluster?: string;
  debut?: string;
  fin?: string;
};

type Props = {
  filters: FilterParams;
  isDirecteur: boolean;
  validateDates: () => boolean;
  downloadFile: (blob: Blob, filename: string) => void;
};

function defisLabel(row: RapportExecutionSeanceItem) {
  const parts: string[] = [];
  if (row.defisSession?.trim()) parts.push(row.defisSession.trim());
  if (row.etatEquipements?.trim()) parts.push(`Équipements : ${row.etatEquipements.trim()}`);
  return parts.length ? parts.join(' · ') : 'RAS';
}

function formatDateFr(iso: string) {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export default function RapportExecutionSeancesPanel({
  filters,
  isDirecteur,
  validateDates,
  downloadFile,
}: Props) {
  const [rows, setRows] = useState<RapportExecutionSeanceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [presentsTotal, setPresentsTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | 'bulk' | 'all' | null>(null);
  const [selectedFormateurId, setSelectedFormateurId] = useState('');
  const [formateurs, setFormateurs] = useState<User[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const queryParams = useMemo(() => ({
    ...filters,
    formateurId: selectedFormateurId || undefined,
  }), [filters, selectedFormateurId]);

  const loadList = useCallback(async () => {
    if (filters.debut && filters.fin && filters.debut > filters.fin) {
      setRows([]);
      setTotal(0);
      setPresentsTotal(0);
      return;
    }
    setLoading(true);
    try {
      const { data } = await rapportService.listExecutionSeances(queryParams);
      setRows(data.sessions || []);
      setTotal(data.total ?? 0);
      setPresentsTotal(data.presentsTotal ?? 0);
    } catch {
      toast.error('Impossible de charger les rapports de séances.');
      setRows([]);
      setTotal(0);
      setPresentsTotal(0);
    } finally {
      setLoading(false);
    }
  }, [queryParams, filters.debut, filters.fin]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!isDirecteur) return;
    userService.getFormateurs()
      .then((res) => setFormateurs(res.data || []))
      .catch(() => setFormateurs([]));
  }, [isDirecteur]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    const dir = sortDir === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      if (sortKey === 'date') {
        const av = `${a.date || ''} ${a.heureDebut || ''}`;
        const bv = `${b.date || ''} ${b.heureDebut || ''}`;
        return av.localeCompare(bv) * dir;
      }
      if (sortKey === 'centre') {
        return (a.centreNom || '').localeCompare(b.centreNom || '', 'fr') * dir;
      }
      if (sortKey === 'formateur') {
        return (a.formateurNom || '').localeCompare(b.formateurNom || '', 'fr') * dir;
      }
      return ((a.presents || 0) - (b.presents || 0)) * dir;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const downloadBulk = async (mode: 'filtered' | 'all') => {
    if (!validateDates()) return;
    const params = mode === 'all'
      ? { debut: filters.debut, fin: filters.fin }
      : queryParams;
    setDownloadingId(mode === 'all' ? 'all' : 'bulk');
    try {
      const res = await rapportService.exporterExecutionPdf(params);
      if (!res.data?.size) {
        toast.error('Aucune séance clôturée pour ce périmètre.');
        return;
      }
      const stamp = new Date().toISOString().split('T')[0];
      const name = mode === 'all'
        ? `rapport_execution_ska_tous_formateurs_${stamp}.pdf`
        : `rapport_execution_ska_consolide_${stamp}.pdf`;
      downloadFile(res.data, name);
      toast.success(mode === 'all'
        ? 'PDF consolidé — tous les formateurs'
        : 'PDF consolidé — filtres actuels');
    } catch {
      toast.error('Erreur lors du téléchargement PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const downloadOne = async (row: RapportExecutionSeanceItem) => {
    setDownloadingId(row.id);
    try {
      const res = await rapportService.exporterSessionExecutionPdf(row.id);
      const centre = (row.centreNom || 'centre').replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadFile(res.data, `rapport_execution_${centre}_${row.date}.pdf`);
      toast.success('Rapport de séance téléchargé');
    } catch {
      toast.error('Impossible de télécharger ce rapport.');
    } finally {
      setDownloadingId(null);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'date' ? 'desc' : 'asc');
    }
  };

  const SortBtn = ({ label, col }: { label: string; col: SortKey }) => (
    <button
      type="button"
      onClick={() => toggleSort(col)}
      className="inline-flex items-center gap-1 font-semibold text-left hover:text-[#004b57]"
    >
      {label}
      {sortKey === col ? (
        sortDir === 'asc' ? <ArrowUpAZ className="w-3 h-3" /> : <ArrowDownAZ className="w-3 h-3" />
      ) : null}
    </button>
  );

  return (
    <div className="card border border-slate-200 bg-white p-5 sm:p-6 space-y-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#004b57]/70">
            Aperçu terrain
          </p>
          <h3 className="text-lg font-bold text-slate-900 mt-0.5">
            Rapports d&apos;exécution par séance
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Liste des séances clôturées (données formateur). Téléchargez une séance ou un PDF consolidé
            {isDirecteur ? ' pour tous les formateurs du périmètre.' : '.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button type="button" onClick={() => void loadList()} className="btn-ghost text-xs" disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Actualiser
          </button>
          <button
            type="button"
            onClick={() => void downloadBulk('filtered')}
            disabled={downloadingId !== null || total === 0}
            className="btn-primary text-xs inline-flex items-center gap-1.5"
          >
            {downloadingId === 'bulk' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            PDF consolidé (filtres)
          </button>
          {isDirecteur && (
            <button
              type="button"
              onClick={() => void downloadBulk('all')}
              disabled={downloadingId !== null}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[#004b57]/25 bg-[#004b57]/5 text-[#004b57] hover:bg-[#004b57]/10 disabled:opacity-50"
            >
              {downloadingId === 'all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
              PDF tous les formateurs
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {isDirecteur && (
          <div className="min-w-[200px] flex-1 max-w-xs">
            <label className="label">Formateur</label>
            <select
              className="input-field"
              value={selectedFormateurId}
              onChange={(e) => setSelectedFormateurId(e.target.value)}
            >
              <option value="">Tous les formateurs</option>
              {formateurs.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.prenom} {f.nom}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="text-xs text-slate-500 pb-1">
          <span className="font-semibold text-slate-700">{total}</span> séance(s) ·{' '}
          <span className="font-semibold text-slate-700">{presentsTotal}</span> présences (P)
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm text-left min-w-[880px]">
          <thead className="bg-slate-50 text-xs text-slate-600 uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2.5"><SortBtn label="Date" col="date" /></th>
              <th className="px-3 py-2.5"><SortBtn label="Centre" col="centre" /></th>
              <th className="px-3 py-2.5">CDEJ</th>
              <th className="px-3 py-2.5"><SortBtn label="Formateur" col="formateur" /></th>
              <th className="px-3 py-2.5">Créneau</th>
              <th className="px-3 py-2.5">Module</th>
              <th className="px-3 py-2.5 text-center"><SortBtn label="P" col="presents" /></th>
              <th className="px-3 py-2.5">Défis</th>
              <th className="px-3 py-2.5 text-right">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                  Chargement…
                </td>
              </tr>
            ) : sortedRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400 italic">
                  Aucune séance clôturée pour ces filtres.
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80">
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-800">
                    {formatDateFr(row.date)}
                    <span className="block text-[11px] text-slate-400">{row.creneau}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-slate-800">{row.centreNom || '—'}</span>
                    {row.lieuFormation && (
                      <span className="block text-[11px] text-slate-400">{row.lieuFormation}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{row.codeCdej || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-700">{row.formateurNom || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{row.creneau}</td>
                  <td className="px-3 py-2.5 text-slate-600 max-w-[140px] truncate" title={row.moduleFait}>
                    {row.moduleFait || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center font-semibold text-[#004b57]">
                    {row.presents}/{row.totalEleves}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 max-w-[200px] truncate" title={defisLabel(row)}>
                    {defisLabel(row)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => void downloadOne(row)}
                      disabled={downloadingId !== null}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#004b57] border border-[#004b57]/20 hover:bg-[#004b57]/5 disabled:opacity-50"
                    >
                      {downloadingId === row.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
