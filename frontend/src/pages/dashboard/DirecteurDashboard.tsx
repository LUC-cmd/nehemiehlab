import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, Users, GraduationCap, CreditCard,
  TrendingUp, AlertTriangle, Clock, ArrowUpRight
} from 'lucide-react';
import { dashboardService, centreService, eleveService, signalementService, transactionService } from '../../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import type { DashboardStats, Centre, Signalement, Transaction } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatFullName } from '../../utils/displayName';
import { fetchWithOfflineCache } from '../../utils/offlineCache';
import EnfantsProfilesShowcase from '../../components/dashboard/EnfantsProfilesShowcase';
import CentreElevesPanel from '../../components/dashboard/CentreElevesPanel';
import LocalisationDashboardSection from '../../components/dashboard/LocalisationDashboardSection';

const chartTooltipStyle = { background: '#18152c', border: '1px solid #282343', borderRadius: '12px', color: '#fff' };

export default function DirecteurDashboard() {
  const { user } = useAuth();
  const [usingOfflineCache, setUsingOfflineCache] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalCentres: 0, totalFormateurs: 0, totalEleves: 0,
    totalHeuresFormation: 0, transactionsEnAttente: 0,
    montantTotalTransactions: 0, signalementsNonTraites: 0,
  });
  const [dataEleves, setDataEleves] = useState<{ centre: string; eleves: number }[]>([]);
  const [pendingSignalements, setPendingSignalements] = useState<Signalement[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);

  useEffect(() => {
    const load = async () => {
      let cached = false;
      try {
        const [statsResult, centresResult, sigResult, txResult] = await Promise.all([
          fetchWithOfflineCache('dir:stats', async () => (await dashboardService.getStats()).data),
          fetchWithOfflineCache('dir:centres', async () => (await centreService.getAll()).data as Centre[]),
          fetchWithOfflineCache('dir:signalements:pending', async () => (await signalementService.getAll()).data as Signalement[]),
          fetchWithOfflineCache('dir:transactions:pending', async () => (await transactionService.getAll({ statut: 'EN_ATTENTE' })).data as Transaction[]),
        ]);
        cached = statsResult.fromCache || centresResult.fromCache || sigResult.fromCache || txResult.fromCache;
        setStats(statsResult.data);
        setCentres(centresResult.data || []);
        setPendingSignalements(sigResult.data.filter((s) => s.statut === 'EN_ATTENTE').slice(0, 5));
        setPendingTransactions(txResult.data.slice(0, 5));

        const data = await Promise.all(
          centresResult.data.map(async (c: Centre) => {
            try {
              const byCentre = await fetchWithOfflineCache(`dir:eleves:centre:${c.id}`, async () => (await eleveService.getByCentre(c.id)).data);
              if (byCentre.fromCache) cached = true;
              return { centre: c.nom.length > 12 ? c.nom.slice(0, 12) + '…' : c.nom, eleves: byCentre.data.length };
            } catch {
              return { centre: c.nom, eleves: 0 };
            }
          }),
        );
        setDataEleves(data.slice(0, 8));
      } catch {
        // keep defaults
      } finally {
        setUsingOfflineCache(cached || !navigator.onLine);
      }
    };

    load();
  }, []);

  const dataHeures = [
    { mois: 'Jan', heures: Math.round((stats.totalHeuresFormation ?? 0) * 0.08) },
    { mois: 'Fév', heures: Math.round((stats.totalHeuresFormation ?? 0) * 0.1) },
    { mois: 'Mar', heures: Math.round((stats.totalHeuresFormation ?? 0) * 0.09) },
    { mois: 'Avr', heures: Math.round((stats.totalHeuresFormation ?? 0) * 0.12) },
    { mois: 'Mai', heures: Math.round((stats.totalHeuresFormation ?? 0) * 0.11) },
    { mois: 'Jun', heures: Math.round((stats.totalHeuresFormation ?? 0) * 0.14) },
    { mois: 'Jul', heures: Math.round((stats.totalHeuresFormation ?? 0) * 0.16) },
    { mois: 'Aoû', heures: Math.round((stats.totalHeuresFormation ?? 0) * 0.2) },
  ];

  const kpis = [
    { label: 'Centres actifs', value: stats.totalCentres ?? 0, icon: <Building2 className="w-6 h-6" />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { label: 'Formateurs', value: stats.totalFormateurs ?? 0, icon: <GraduationCap className="w-6 h-6" />, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    { label: 'Élèves inscrits', value: stats.totalEleves ?? 0, icon: <Users className="w-6 h-6" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Heures de formation', value: stats.totalHeuresFormation ?? 0, icon: <Clock className="w-6 h-6" />, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Paiements en attente', value: stats.transactionsEnAttente ?? 0, icon: <CreditCard className="w-6 h-6" />, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    { label: 'Signalements actifs', value: stats.signalementsNonTraites ?? 0, icon: <AlertTriangle className="w-6 h-6" />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  ];

  const actions = [
    { label: 'Journal d\'activité', href: '/dashboard/journal-activite', color: 'text-violet-400' },
    { label: 'Profils & projets enfants', href: '/dashboard/profils-enfants', color: 'text-[#5ED9FF]' },
    { label: 'Ajouter un centre', href: '/dashboard/centres', color: 'text-blue-400' },
    { label: 'Valider les formateurs', href: '/dashboard/formateurs', color: 'text-purple-400' },
    { label: 'Gérer les comptes', href: '/dashboard/utilisateurs', color: 'text-emerald-400' },
    { label: 'Générer rapport', href: '/dashboard/rapports', color: 'text-amber-400' },
    { label: 'Publications site web', href: '/dashboard/publications', color: 'text-orange-400' },
    { label: 'Nouveautés & activités', href: '/dashboard/actualites', color: 'text-pink-400' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Bonjour, {formatFullName(user?.prenom, user?.nom) || user?.prenom}
        </h1>
        <p className="text-dark-400 mt-1">Voici l'état de la plateforme Nehemiah Lab aujourd'hui.</p>
        {usingOfflineCache && (
          <p className="text-xs text-amber-400 mt-2">Mode hors ligne: affichage des dernières données enregistrées.</p>
        )}
      </div>

      <EnfantsProfilesShowcase
        limit={8}
        showFilters
        title="Profils des enfants"
        subtitle="Vue d’ensemble — filtrez par région, cluster ou centre"
      />

      <LocalisationDashboardSection
        centres={centres}
        centresHref="/dashboard/centres"
        title="Réseau SKA — carte nationale"
        subtitle="Vue d’ensemble des centres, GPS et itinéraires pour toute l’équipe."
        mapHeightClassName="h-[400px]"
        onCentresRefresh={() => {
          centreService.getAll().then((r) => setCentres(r.data || [])).catch(() => {});
        }}
      />

      <CentreElevesPanel
        centres={centres}
        title="Élèves par centre"
        subtitle="Choisissez un centre pour voir l’effectif et la liste complète, classée de A à Z."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`kpi-card border ${kpi.bg} group hover:-translate-y-0.5`}>
            <div className={`${kpi.color} mb-3`}>{kpi.icon}</div>
            <div className="text-2xl font-bold text-white mb-0.5">{kpi.value}</div>
            <div className="text-dark-400 text-xs font-medium">{kpi.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-semibold">Heures de formation</h3>
              <p className="text-dark-400 text-sm">Répartition estimée</p>
            </div>
            <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              {stats.totalHeuresFormation ?? 0}h total
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
              <CartesianGrid strokeDasharray="3 3" stroke="#282343" />
              <XAxis dataKey="mois" stroke="#777298" tick={{ fontSize: 11 }} />
              <YAxis stroke="#777298" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area type="monotone" dataKey="heures" stroke="#F43B1D" strokeWidth={2} fill="url(#heuresGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-semibold">Élèves par centre</h3>
              <p className="text-dark-400 text-sm">Répartition actuelle</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dataEleves.length > 0 ? dataEleves : [{ centre: '—', eleves: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#282343" />
              <XAxis dataKey="centre" stroke="#777298" tick={{ fontSize: 11 }} />
              <YAxis stroke="#777298" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="eleves" fill="#F43B1D" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card">
        <h3 className="text-white font-semibold mb-4">Actions rapides</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {actions.map((a) => (
            <Link key={a.label} to={a.href} className="action-link group">
              <span className={`text-sm font-medium ${a.color}`}>{a.label}</span>
              <ArrowUpRight className={`w-4 h-4 ${a.color} group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform`} />
            </Link>
          ))}
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="card">
          <h3 className="text-white font-semibold mb-4">Signalements en attente</h3>
          {pendingSignalements.length === 0 ? (
            <p className="text-sm text-dark-400">Aucun signalement en attente.</p>
          ) : (
            <div className="space-y-3">
              {pendingSignalements.map((s) => (
                <div key={s.id} className="p-3 rounded-xl border border-dark-700 bg-dark-800/60">
                  <p className="text-sm text-white font-medium">{s.elevePrenom} {s.eleveNom}</p>
                  <p className="text-xs text-dark-400 line-clamp-2 mt-1">{s.description}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="card">
          <h3 className="text-white font-semibold mb-4">Transactions à traiter</h3>
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
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
