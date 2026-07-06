import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, BookOpen, CreditCard, TrendingUp, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const dataPresence = [
  { jour: 'Lun', heures: 4.5 }, { jour: 'Mar', heures: 6 },
  { jour: 'Mer', heures: 5 }, { jour: 'Jeu', heures: 7 },
  { jour: 'Ven', heures: 3.5 }, { jour: 'Sam', heures: 5.5 },
];

export default function FormateurDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    dashboardService.getStats().then(r => setStats(r.data)).catch(() => {});
  }, []);

  const kpis = [
    { label: 'Mes centres', value: stats.totalCentres ?? 0, icon: <Building2 className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
    { label: 'Mes élèves', value: stats.totalEleves ?? 0, icon: <Users className="w-5 h-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
    { label: 'Heures ce mois', value: stats.totalHeuresFormation ?? 0, icon: <Clock className="w-5 h-5" />, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
    { label: 'Formations dispensées', value: stats.totalFormations ?? 0, icon: <BookOpen className="w-5 h-5" />, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
    { label: 'Paiements en attente', value: stats.transactionsEnAttente ?? 0, icon: <CreditCard className="w-5 h-5" />, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bienvenue, {user?.prenom} 👋</h1>
        <p className="text-gray-500 mt-1">Voici un résumé de votre activité de formation.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`card border ${kpi.bg}`}>
            <div className={`${kpi.color} mb-3`}>{kpi.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
            <div className="text-gray-600 text-xs mt-1">{kpi.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-gray-900 font-semibold">Présence cette semaine</h3>
              <p className="text-gray-500 text-sm">Heures de formation par jour</p>
            </div>
            <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
              <TrendingUp className="w-4 h-4" /> +12%
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={dataPresence}>
              <defs>
                <linearGradient id="presGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F43B1D" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F43B1D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="jour" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1f2937' }} />
              <Area type="monotone" dataKey="heures" stroke="#F43B1D" strokeWidth={2} fill="url(#presGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="card">
          <h3 className="text-gray-900 font-semibold mb-4">Accès rapides</h3>
          <div className="space-y-3">
            {[
              { label: '▶  Démarrer une session de présence', href: '/dashboard/eleves', color: 'bg-primary-50 border-primary-100 text-primary-600 hover:bg-primary-100/50' },
              { label: '📝  Saisir le module du jour', href: '/dashboard/formations', color: 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100/50' },
              { label: '⚠️  Signaler un élève', href: '/dashboard/eleves', color: 'bg-amber-50 border-amber-100 text-amber-600 hover:bg-amber-100/50' },
              { label: '💳  Voir mes paiements en attente', href: '/dashboard/transactions', color: 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100/50' },
            ].map((a) => (
              <a key={a.label} href={a.href}
                className={`block px-4 py-3 rounded-xl border text-sm font-medium transition-all ${a.color}`}>
                {a.label}
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
