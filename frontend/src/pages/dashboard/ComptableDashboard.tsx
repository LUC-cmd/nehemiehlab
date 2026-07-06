import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const dataMois = [
  { mois: 'Jan', montant: 150000 }, { mois: 'Fév', montant: 220000 },
  { mois: 'Mar', montant: 180000 }, { mois: 'Avr', montant: 310000 },
  { mois: 'Mai', montant: 260000 }, { mois: 'Jun', montant: 290000 },
];

export default function ComptableDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    dashboardService.getStats().then(r => setStats(r.data)).catch(() => {});
  }, []);

  const kpis = [
    { label: 'En attente', value: stats.transactionsEnAttente ?? 0, icon: <Clock className="w-5 h-5" />, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
    { label: 'Validées', value: stats.transactionsValidees ?? 0, icon: <CheckCircle className="w-5 h-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
    { label: 'Refusées', value: stats.transactionsRefusees ?? 0, icon: <XCircle className="w-5 h-5" />, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
    { label: 'Total décaissé (FCFA)', value: stats.montantTotalTransactions ?? 0, icon: <CreditCard className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bonjour, {user?.prenom} 👋</h1>
        <p className="text-gray-500 mt-1">Tableau de bord de la comptabilité Nehemiah Lab.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`card border ${kpi.bg}`}>
            <div className={`${kpi.color} mb-3`}>{kpi.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{kpi.value.toLocaleString('fr-FR')}</div>
            <div className="text-gray-600 text-xs mt-1">{kpi.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-gray-900 font-semibold">Décaissements mensuels</h3>
              <p className="text-gray-500 text-sm">En FCFA</p>
            </div>
            <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
              <TrendingUp className="w-4 h-4" /> +8%
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dataMois}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mois" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1f2937' }}
                formatter={(v: number) => [`${v.toLocaleString('fr-FR')} FCFA`, 'Montant']}
              />
              <Bar dataKey="montant" fill="#F43B1D" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-gray-900 font-semibold mb-4">Actions rapides</h3>
          <div className="space-y-3">
            {[
              { label: '➕  Créer une transaction', href: '/dashboard/transactions', color: 'bg-primary-50 border-primary-100 text-primary-600' },
              { label: '⏳  Transactions en attente', href: '/dashboard/transactions?statut=EN_ATTENTE', color: 'bg-amber-50 border-amber-100 text-amber-600' },
              { label: '📊  Générer rapport comptable', href: '/dashboard/rapports', color: 'bg-blue-50 border-blue-100 text-blue-600' },
            ].map((a) => (
              <a key={a.label} href={a.href}
                className={`block px-4 py-3 rounded-xl border text-sm font-medium transition-all hover:opacity-80 ${a.color}`}>
                {a.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
