import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Users, GraduationCap, CreditCard,
  TrendingUp, AlertTriangle, Clock, ArrowUpRight
} from 'lucide-react';
import { dashboardService } from '../../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import type { DashboardStats } from '../../types';
import { useAuth } from '../../context/AuthContext';

const dataHeures = [
  { mois: 'Jan', heures: 120 }, { mois: 'Fév', heures: 190 },
  { mois: 'Mar', heures: 160 }, { mois: 'Avr', heures: 240 },
  { mois: 'Mai', heures: 210 }, { mois: 'Jun', heures: 280 },
  { mois: 'Jul', heures: 320 }, { mois: 'Aoû', heures: 290 },
];

const dataEleves = [
  { centre: 'Centre A', eleves: 32 }, { centre: 'Centre B', eleves: 28 },
  { centre: 'Centre C', eleves: 45 }, { centre: 'Centre D', eleves: 19 },
  { centre: 'Centre E', eleves: 38 },
];

export default function DirecteurDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCentres: 0, totalFormateurs: 0, totalEleves: 0,
    totalHeuresFormation: 0, transactionsEnAttente: 0,
    montantTotalTransactions: 0, signalementsNonTraites: 0,
  });

  useEffect(() => {
    dashboardService.getStats().then(r => setStats(r.data)).catch(() => {});
  }, []);

  const kpis = [
    { label: 'Centres actifs', value: stats.totalCentres ?? 0, icon: <Building2 className="w-6 h-6" />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', trend: '+2 ce mois' },
    { label: 'Formateurs', value: stats.totalFormateurs ?? 0, icon: <GraduationCap className="w-6 h-6" />, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100', trend: '+1 ce mois' },
    { label: 'Élèves inscrits', value: stats.totalEleves ?? 0, icon: <Users className="w-6 h-6" />, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', trend: '+12 ce mois' },
    { label: 'Heures de formation', value: stats.totalHeuresFormation ?? 0, icon: <Clock className="w-6 h-6" />, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100', trend: 'Cette année' },
    { label: 'Paiements en attente', value: stats.transactionsEnAttente ?? 0, icon: <CreditCard className="w-6 h-6" />, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100', trend: 'À valider' },
    { label: 'Signalements actifs', value: stats.signalementsNonTraites ?? 0, icon: <AlertTriangle className="w-6 h-6" />, color: 'text-red-600', bg: 'bg-red-50 border-red-100', trend: 'Non traités' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, {user?.prenom} 👋
        </h1>
        <p className="text-gray-500 mt-1">Voici l'état de la plateforme Nehemiah Lab aujourd'hui.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`card border ${kpi.bg} group hover:-translate-y-0.5 transition-all`}>
            <div className={`${kpi.color} mb-3`}>{kpi.icon}</div>
            <div className="text-2xl font-bold text-gray-900 mb-0.5">{kpi.value}</div>
            <div className="text-gray-600 text-xs font-medium">{kpi.label}</div>
            <div className={`text-xs mt-2 ${kpi.color} opacity-70`}>{kpi.trend}</div>
          </motion.div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Heures par mois */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-gray-900 font-semibold">Heures de formation</h3>
              <p className="text-gray-500 text-sm">Évolution mensuelle</p>
            </div>
            <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              +18%
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dataHeures}>
              <defs>
                <linearGradient id="heuresGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F43B1D" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F43B1D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mois" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1f2937' }} />
              <Area type="monotone" dataKey="heures" stroke="#F43B1D" strokeWidth={2} fill="url(#heuresGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Élèves par centre */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-gray-900 font-semibold">Élèves par centre</h3>
              <p className="text-gray-500 text-sm">Répartition actuelle</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dataEleves}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="centre" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1f2937' }} />
              <Bar dataKey="eleves" fill="#F43B1D" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Actions rapides */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="card">
        <h3 className="text-gray-900 font-semibold mb-4">Actions rapides</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Ajouter un centre', href: '/dashboard/centres', color: 'text-blue-600 bg-blue-50 border-blue-100' },
            { label: 'Pré-enregistrer formateur', href: '/dashboard/formateurs', color: 'text-purple-600 bg-purple-50 border-purple-100' },
            { label: 'Gérer les comptes', href: '/dashboard/utilisateurs', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
            { label: 'Générer rapport', href: '/dashboard/rapports', color: 'text-amber-600 bg-amber-50 border-amber-100' },
          ].map((a) => (
            <a key={a.label} href={a.href}
              className={`flex items-center justify-between p-4 rounded-xl border ${a.color} hover:opacity-80 transition-opacity group`}>
              <span className="text-sm font-medium">{a.label}</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
