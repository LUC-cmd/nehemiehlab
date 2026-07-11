import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, AlertTriangle, BookOpen, TrendingUp, ArrowUpRight, Clock, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { centreService, dashboardService, formationService, signalementService } from '../../services/api';
import type { Centre, ModuleFormation, Signalement } from '../../types';
import { fetchWithOfflineCache } from '../../utils/offlineCache';
import EnfantsProfilesShowcase from '../../components/dashboard/EnfantsProfilesShowcase';
import LocalisationDashboardSection from '../../components/dashboard/LocalisationDashboardSection';

export default function ResponsableClusterDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [recentSignalements, setRecentSignalements] = useState<Signalement[]>([]);
  const [recentFormations, setRecentFormations] = useState<ModuleFormation[]>([]);
  const [mesCentres, setMesCentres] = useState<Centre[]>([]);
  const [usingOfflineCache, setUsingOfflineCache] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsResult, sigResult, centresResult] = await Promise.all([
          fetchWithOfflineCache('resp:stats', async () => (await dashboardService.getStats()).data),
          fetchWithOfflineCache('resp:signalements', async () => (await signalementService.getAll()).data as Signalement[]),
          fetchWithOfflineCache('resp:centres', async () => (await centreService.getMesCentres()).data),
        ]);
        setStats(statsResult.data);
        setMesCentres(centresResult.data || []);
        setRecentSignalements(sigResult.data.filter((s) => s.statut === 'EN_ATTENTE').slice(0, 5));

        const formations: ModuleFormation[] = [];
        for (const centre of (centresResult.data || []).slice(0, 3)) {
          const f = await fetchWithOfflineCache(
            `resp:formations:${centre.id}`,
            async () => (await formationService.getByCentre(centre.id)).data as ModuleFormation[],
          );
          formations.push(...f.data);
        }
        setRecentFormations(formations.slice(0, 5));
        setUsingOfflineCache(
          statsResult.fromCache || sigResult.fromCache || centresResult.fromCache || !navigator.onLine,
        );
      } catch {
        setUsingOfflineCache(!navigator.onLine);
      }
    };
    load();
  }, []);

  const kpis = [
    { label: 'Centres du cluster', value: stats.totalCentres ?? mesCentres.length, icon: <Building2 className="w-5 h-5" />, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
    { label: 'Élèves du cluster', value: stats.totalEleves ?? 0, icon: <Users className="w-5 h-5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Signalements actifs', value: stats.signalementsNonTraites ?? 0, icon: <AlertTriangle className="w-5 h-5" />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    { label: 'Heures totales', value: stats.totalHeuresFormation ?? 0, icon: <TrendingUp className="w-5 h-5" />, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  ];

  const actions = [
    { label: 'Voir les centres du cluster', href: '/dashboard/mes-centres', color: 'text-violet-400' },
    { label: 'Profils & projets enfants', href: '/dashboard/profils-enfants', color: 'text-[#5ED9FF]' },
    { label: 'Consulter les signalements', href: '/dashboard/signalements', color: 'text-red-400' },
    { label: 'Journal des formations', href: '/dashboard/formations', color: 'text-blue-400' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Bonjour, {user?.prenom}</h1>
        <p className="text-dark-400 mt-1">
          Suivi du cluster {user?.assignedCluster ? `« ${user.assignedCluster} »` : ''} — {mesCentres.length} centre(s).
        </p>
        {usingOfflineCache && (
          <p className="text-xs text-amber-400 mt-2">Mode hors ligne: affichage des dernières données enregistrées.</p>
        )}
      </div>

      <EnfantsProfilesShowcase
        limit={6}
        showFilters
        title="Profils des enfants du cluster"
        subtitle="Consultez tous les profils des centres de votre cluster"
      />

      <LocalisationDashboardSection
        centres={mesCentres}
        centresHref="/dashboard/mes-centres"
        title="Localisation des centres"
        subtitle="Vue cartographique de tous les centres de votre cluster."
        mapHeightClassName="h-[380px]"
        onCentresRefresh={() => {
          centreService.getMesCentres().then((r) => setMesCentres(r.data || [])).catch(() => {});
        }}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`kpi-card border ${kpi.bg}`}
          >
            <div className={`${kpi.color} mb-3`}>{kpi.icon}</div>
            <div className="text-2xl font-bold text-white">{kpi.value}</div>
            <div className="text-dark-400 text-xs mt-1">{kpi.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Actions</h3>
          <div className="space-y-3">
            {actions.map((a) => (
              <Link key={a.label} to={a.href} className="action-link group">
                <span className={`text-sm font-medium ${a.color}`}>{a.label}</span>
                <ArrowUpRight className={`w-4 h-4 ${a.color} group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform`} />
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-white font-semibold mb-4">Signalements récents</h3>
          {recentSignalements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-dark-400">
              <AlertTriangle className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">Aucun signalement en attente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSignalements.map((s) => (
                <div key={s.id} className="p-3 rounded-xl bg-dark-800 border border-dark-700">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-white text-sm font-medium">
                      {s.elevePrenom} {s.eleveNom}
                    </span>
                    <span className="badge badge-warning flex items-center gap-1 text-xs">
                      <Clock className="w-3 h-3" /> En attente
                    </span>
                  </div>
                  <p className="text-dark-400 text-xs line-clamp-2">{s.description}</p>
                </div>
              ))}
              <Link to="/dashboard/signalements" className="btn-secondary w-full justify-center text-sm">
                Voir tous les signalements
              </Link>
            </div>
          )}
        </div>

        <div className="card lg:col-span-2">
          <h3 className="text-white font-semibold mb-4">Dernières formations (cluster)</h3>
          {recentFormations.length === 0 ? (
            <p className="text-sm text-dark-400">Aucune formation récente.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {recentFormations.map((f) => (
                <div key={f.id} className="p-3 rounded-xl bg-dark-800 border border-dark-700">
                  <p className="text-sm text-white font-medium">{f.titre}</p>
                  <p className="text-xs text-dark-400 mt-1">
                    {new Date(f.date).toLocaleDateString('fr-FR')} • {f.dureeHeures} h
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
