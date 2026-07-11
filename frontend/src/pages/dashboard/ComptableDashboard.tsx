import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Clock, CheckCircle, XCircle, TrendingUp, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dashboardService, transactionService } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Transaction } from '../../types';
import { fetchWithOfflineCache } from '../../utils/offlineCache';

const chartTooltipStyle = { background: '#18152c', border: '1px solid #282343', borderRadius: '12px', color: '#fff' };

export default function ComptableDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [usingOfflineCache, setUsingOfflineCache] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsResult, txResult] = await Promise.all([
          fetchWithOfflineCache('comptable:stats', async () => (await dashboardService.getStats()).data),
          fetchWithOfflineCache('comptable:transactions:pending', async () => (await transactionService.getAll({ statut: 'EN_ATTENTE' })).data as Transaction[]),
        ]);
        setStats(statsResult.data);
        setPendingTransactions(txResult.data.slice(0, 6));
        setUsingOfflineCache(statsResult.fromCache || txResult.fromCache || !navigator.onLine);
      } catch {
        setUsingOfflineCache(!navigator.onLine);
      }
    };
    load();
  }, []);

  const kpis = [
    { label: 'En attente', value: stats.transactionsEnAttente ?? 0, icon: <Clock className="w-5 h-5" />, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Validées', value: stats.transactionsValidees ?? 0, icon: <CheckCircle className="w-5 h-5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Refusées', value: stats.transactionsRefusees ?? 0, icon: <XCircle className="w-5 h-5" />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    { label: 'Total décaissé (FCFA)', value: stats.montantTotalTransactions ?? 0, icon: <CreditCard className="w-5 h-5" />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  ];

  const actions = [
    { label: 'Créer une transaction', href: '/dashboard/transactions', color: 'text-primary-400' },
    { label: 'Transactions en attente', href: '/dashboard/transactions', color: 'text-amber-400' },
    { label: 'Générer rapport comptable', href: '/dashboard/rapports', color: 'text-blue-400' },
  ];

  const montant = stats.montantTotalTransactions ?? 0;
  const dataMois = [
    { mois: 'Jan', montant: Math.round(montant * 0.08) },
    { mois: 'Fév', montant: Math.round(montant * 0.12) },
    { mois: 'Mar', montant: Math.round(montant * 0.1) },
    { mois: 'Avr', montant: Math.round(montant * 0.15) },
    { mois: 'Mai', montant: Math.round(montant * 0.13) },
    { mois: 'Jun', montant: Math.round(montant * 0.18) },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Bonjour, {user?.prenom}</h1>
        <p className="text-dark-400 mt-1">Tableau de bord de la comptabilité Nehemiah Lab.</p>
        {usingOfflineCache && (
          <p className="text-xs text-amber-400 mt-2">Mode hors ligne: affichage des dernières données enregistrées.</p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`kpi-card border ${kpi.bg}`}>
            <div className={`${kpi.color} mb-3`}>{kpi.icon}</div>
            <div className="text-2xl font-bold text-white">{kpi.value.toLocaleString('fr-FR')}</div>
            <div className="text-dark-400 text-xs mt-1">{kpi.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-semibold">Décaissements</h3>
              <p className="text-dark-400 text-sm">Répartition estimée (FCFA)</p>
            </div>
            <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              {montant.toLocaleString('fr-FR')} FCFA
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dataMois}>
              <CartesianGrid strokeDasharray="3 3" stroke="#282343" />
              <XAxis dataKey="mois" stroke="#777298" tick={{ fontSize: 11 }} />
              <YAxis stroke="#777298" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v: number) => [`${v.toLocaleString('fr-FR')} FCFA`, 'Montant']}
              />
              <Bar dataKey="montant" fill="#F43B1D" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-white font-semibold mb-4">Actions rapides</h3>
          <div className="space-y-3">
            {actions.map((a) => (
              <Link key={a.label} to={a.href} className="action-link group">
                <span className={`text-sm font-medium ${a.color}`}>{a.label}</span>
                <ArrowUpRight className={`w-4 h-4 ${a.color} group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform`} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-white font-semibold mb-4">Transactions à valider</h3>
        {pendingTransactions.length === 0 ? (
          <p className="text-sm text-dark-400">Aucune transaction en attente.</p>
        ) : (
          <div className="space-y-3">
            {pendingTransactions.map((tx) => (
              <div key={tx.id} className="p-3 rounded-xl border border-dark-700 bg-dark-800/60 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">{tx.formateur?.prenom} {tx.formateur?.nom}</p>
                  <p className="text-xs text-dark-400">{tx.type}</p>
                </div>
                <span className="text-sm font-semibold text-amber-400 whitespace-nowrap">{tx.montant.toLocaleString('fr-FR')} FCFA</span>
              </div>
            ))}
            <Link to="/dashboard/transactions" className="btn-secondary w-full justify-center text-sm">
              Ouvrir les transactions
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
