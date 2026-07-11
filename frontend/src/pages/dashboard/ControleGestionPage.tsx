import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, TrendingUp, Clock3, CheckCircle2 } from 'lucide-react';
import { dashboardService, transactionService } from '../../services/api';
import type { DashboardStats, Transaction } from '../../types';

export default function ControleGestionPage() {
  const [stats, setStats] = useState<DashboardStats>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    dashboardService.getStats()
      .then((r) => setStats(r.data))
      .catch(() => setStats({}));

    transactionService.getAll()
      .then((r) => setTransactions(r.data))
      .catch(() => setTransactions([]));
  }, []);

  const pending = useMemo(
    () => transactions.filter((t) => t.statut === 'EN_ATTENTE').length,
    [transactions],
  );
  const approved = useMemo(
    () => transactions.filter((t) => t.statut === 'VALIDEE').length,
    [transactions],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Contrôle de gestion SKA</h1>
        <p className="text-dark-400 mt-1">
          Pilotage financier, validation des transactions et suivi des indicateurs de performance.
        </p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card border border-dark-700">
          <p className="text-xs text-dark-400 mb-2">Transactions en attente</p>
          <p className="text-2xl text-white font-bold">{stats.transactionsEnAttente ?? pending}</p>
          <Clock3 className="w-4 h-4 text-amber-400 mt-2" />
        </div>
        <div className="card border border-dark-700">
          <p className="text-xs text-dark-400 mb-2">Transactions validées</p>
          <p className="text-2xl text-white font-bold">{approved}</p>
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-2" />
        </div>
        <div className="card border border-dark-700">
          <p className="text-xs text-dark-400 mb-2">Montant global</p>
          <p className="text-2xl text-white font-bold">
            {(stats.montantTotalTransactions ?? 0).toLocaleString('fr-FR')} FCFA
          </p>
          <CreditCard className="w-4 h-4 text-primary-400 mt-2" />
        </div>
        <div className="card border border-dark-700">
          <p className="text-xs text-dark-400 mb-2">Centres actifs</p>
          <p className="text-2xl text-white font-bold">{stats.totalCentres ?? 0}</p>
          <TrendingUp className="w-4 h-4 text-blue-400 mt-2" />
        </div>
      </div>

      <div className="card border border-dark-700">
        <h2 className="text-white font-semibold mb-4">Dernières opérations</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-dark-400 border-b border-dark-700">
                <th className="py-2">Formateur</th>
                <th className="py-2">Type</th>
                <th className="py-2">Montant</th>
                <th className="py-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 10).map((t) => (
                <tr key={t.id} className="border-b border-dark-800">
                  <td className="py-2 text-white">{t.formateur?.prenom} {t.formateur?.nom}</td>
                  <td className="py-2 text-dark-300">{t.type}</td>
                  <td className="py-2 text-dark-300">{t.montant.toLocaleString('fr-FR')} FCFA</td>
                  <td className="py-2">
                    <span className={`badge ${
                      t.statut === 'VALIDEE'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : t.statut === 'REFUSEE'
                        ? 'bg-red-500/15 text-red-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      {t.statut}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <p className="text-dark-500 text-sm py-6 text-center">Aucune opération disponible.</p>
          )}
        </div>
      </div>
    </div>
  );
}
