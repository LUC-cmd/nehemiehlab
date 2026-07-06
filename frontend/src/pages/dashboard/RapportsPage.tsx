import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { rapportService, centreService } from '../../services/api';
import type { Centre } from '../../types';
import { FileSpreadsheet, Download, Calendar, Building2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RapportsPage() {
  const { hasRole } = useAuth();
  
  const [centres, setCentres] = useState<Centre[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [selectedCentreId, setSelectedCentreId] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    fetchCentres();
  }, []);

  const fetchCentres = async () => {
    try {
      let res;
      if (hasRole('DIRECTEUR')) {
        res = await centreService.getAll();
      } else {
        res = await centreService.getMesCentres();
      }
      setCentres(res.data);
      if (res.data.length > 0) {
        setSelectedCentreId(String(res.data[0].id));
      }
    } catch {
      toast.error('Erreur lors du chargement des centres.');
    } finally {
      setLoading(false);
    }
  };

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

  const handleExportEleves = async () => {
    setExporting('eleves');
    try {
      const res = await rapportService.exporterEleves(selectedCentreId ? Number(selectedCentreId) : undefined);
      downloadFile(res.data, `eleves_nehemiahlab_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Rapport exporté avec succès.');
    } catch {
      toast.error('Erreur lors de l\'exportation.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportHeures = async () => {
    setExporting('heures');
    try {
      const res = await rapportService.exporterHeures({
        centreId: selectedCentreId ? Number(selectedCentreId) : undefined,
        debut: dateDebut || undefined,
        fin: dateFin || undefined
      });
      downloadFile(res.data, `rapport_heures_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Rapport exporté avec succès.');
    } catch {
      toast.error('Erreur lors de l\'exportation.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportTransactions = async () => {
    setExporting('transactions');
    try {
      const res = await rapportService.exporterTransactions({
        debut: dateDebut || undefined,
        fin: dateFin || undefined
      });
      downloadFile(res.data, `rapport_transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Rapport exporté avec succès.');
    } catch {
      toast.error('Erreur lors de l\'exportation.');
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  const isComptable = hasRole('COMPTABLE');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Rapports &amp; Exports Excel</h1>
        <p className="text-dark-400 mt-1">Générez et téléchargez des rapports résumés au format Excel (.xlsx).</p>
      </div>

      {/* Zone de filtres */}
      <div className="card grid md:grid-cols-3 gap-4 border border-dark-700">
        <div>
          <label className="label flex items-center gap-1.5"><Building2 className="w-4 h-4 text-dark-400" /> Centre</label>
          <select className="input-field" value={selectedCentreId} onChange={e => setSelectedCentreId(e.target.value)}>
            <option value="">Tous les centres</option>
            {centres.map(c => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label flex items-center gap-1.5"><Calendar className="w-4 h-4 text-dark-400" /> Date de début (optionnel)</label>
          <input type="date" className="input-field" value={dateDebut} onChange={e => setDateDebut(e.target.value)} />
        </div>
        <div>
          <label className="label flex items-center gap-1.5"><Calendar className="w-4 h-4 text-dark-400" /> Date de fin (optionnel)</label>
          <input type="date" className="input-field" value={dateFin} onChange={e => setDateFin(e.target.value)} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Export élèves */}
        {!isComptable && (
          <div className="card border border-dark-700 hover:border-dark-600 transition-all p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Liste des élèves</h3>
                <p className="text-dark-400 text-sm">Nom, prénom, âge, sexe, classe et projet en cours.</p>
              </div>
            </div>
            <button
              onClick={handleExportEleves}
              disabled={!!exporting}
              className="btn-primary w-full justify-center disabled:opacity-50"
            >
              {exporting === 'eleves' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Exporter la liste
            </button>
          </div>
        )}

        {/* Export Heures de présence */}
        {!isComptable && (
          <div className="card border border-dark-700 hover:border-dark-600 transition-all p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Cumul des heures</h3>
                <p className="text-dark-400 text-sm">Total des heures effectuées par élève sur la période.</p>
              </div>
            </div>
            <button
              onClick={handleExportHeures}
              disabled={!!exporting}
              className="btn-primary w-full justify-center disabled:opacity-50"
            >
              {exporting === 'heures' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Exporter les heures
            </button>
          </div>
        )}

        {/* Export Transactions */}
        {(hasRole('DIRECTEUR') || isComptable) && (
          <div className="card border border-dark-700 hover:border-dark-600 transition-all p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Rapport financier</h3>
                <p className="text-dark-400 text-sm">Historique des transactions, statuts et montants payés.</p>
              </div>
            </div>
            <button
              onClick={handleExportTransactions}
              disabled={!!exporting}
              className="btn-primary w-full justify-center disabled:opacity-50"
            >
              {exporting === 'transactions' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Exporter les transactions
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
