import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, AlertTriangle, BookOpen, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/api';

export default function CoordinateurDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    dashboardService.getStats().then(r => setStats(r.data)).catch(() => {});
  }, []);

  const kpis = [
    { label: 'Élèves du centre', value: stats.totalEleves ?? 0, icon: <Users className="w-5 h-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
    { label: 'Sessions ce mois', value: stats.totalFormations ?? 0, icon: <BookOpen className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
    { label: 'Signalements actifs', value: stats.signalementsNonTraites ?? 0, icon: <AlertTriangle className="w-5 h-5" />, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
    { label: 'Heures totales', value: stats.totalHeuresFormation ?? 0, icon: <TrendingUp className="w-5 h-5" />, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bonjour, {user?.prenom} 👋</h1>
        <p className="text-gray-500 mt-1">Suivi de votre centre de formation.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        <div className="card">
          <h3 className="text-gray-900 font-semibold mb-4">Actions</h3>
          <div className="space-y-3">
            {[
              { label: '👥  Voir les élèves du centre', href: '/dashboard/eleves', color: 'bg-emerald-50 border-emerald-100 text-emerald-600' },
              { label: '⚠️  Consulter les signalements', href: '/dashboard/signalements', color: 'bg-red-50 border-red-100 text-red-600' },
              { label: '📚  Journal des formations', href: '/dashboard/formations', color: 'bg-blue-50 border-blue-100 text-blue-600' },
            ].map((a) => (
              <a key={a.label} href={a.href}
                className={`block px-4 py-3 rounded-xl border text-sm font-medium transition-all hover:opacity-80 ${a.color}`}>
                {a.label}
              </a>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-gray-900 font-semibold mb-4">Signalements récents</h3>
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <AlertTriangle className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Aucun signalement récent</p>
          </div>
        </div>
      </div>
    </div>
  );
}
