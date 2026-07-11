import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, AlertTriangle, BookOpen, TrendingUp, ArrowUpRight, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { centreService, dashboardService, formationService, signalementService } from '../../services/api';
import type { Centre, ModuleFormation, Signalement } from '../../types';
import { fetchWithOfflineCache } from '../../utils/offlineCache';
import EnfantsProfilesShowcase from '../../components/dashboard/EnfantsProfilesShowcase';
import LocalisationDashboardSection from '../../components/dashboard/LocalisationDashboardSection';

export default function CoordinateurDashboard() {
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
          fetchWithOfflineCache('coord:stats', async () => (await dashboardService.getStats()).data),
          fetchWithOfflineCache('coord:signalements', async () => (await signalementService.getAll()).data as Signalement[]),
          fetchWithOfflineCache('coord:centres', async () => (await centreService.getMesCentres()).data),
        ]);
        setStats(statsResult.data);
        setMesCentres(centresResult.data || []);
        setRecentSignalements(sigResult.data.filter((s) => s.statut === 'EN_ATTENTE').slice(0, 5));

        const firstCentre = centresResult.data?.[0];
        if (firstCentre?.id) {
          const f = await fetchWithOfflineCache(`coord:formations:${firstCentre.id}`, async () => (await formationService.getByCentre(firstCentre.id)).data as ModuleFormation[]);
          setRecentFormations(f.data.slice(0, 5));
          setUsingOfflineCache(statsResult.fromCache || sigResult.fromCache || centresResult.fromCache || f.fromCache || !navigator.onLine);
        } else {
          setRecentFormations([]);
          setUsingOfflineCache(statsResult.fromCache || sigResult.fromCache || centresResult.fromCache || !navigator.onLine);
        }
      } catch {
        setUsingOfflineCache(!navigator.onLine);
      }
    };
    load();
  }, []);

  const kpis = [
    { label: 'Élèves du centre', value: stats.totalEleves ?? 0, icon: <Users className="w-5 h-5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Sessions ce mois', value: stats.totalFormations ?? 0, icon: <BookOpen className="w-5 h-5" />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { label: 'Signalements actifs', value: stats.signalementsNonTraites ?? 0, icon: <AlertTriangle className="w-5 h-5" />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    { label: 'Heures totales', value: stats.totalHeuresFormation ?? 0, icon: <TrendingUp className="w-5 h-5" />, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  ];

  const actions = [
    { label: 'Profils & projets enfants', href: '/dashboard/profils-enfants', color: 'text-[#5ED9FF]' },
    { label: 'Voir les élèves du centre', href: '/dashboard/eleves', color: 'text-emerald-400' },
    { label: 'Consulter les signalements', href: '/dashboard/signalements', color: 'text-red-400' },
    { label: 'Journal des formations', href: '/dashboard/formations', color: 'text-blue-400' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Bonjour, {user?.prenom}</h1>
        <p className="text-dark-400 mt-1">Suivi de votre centre de formation.</p>
        {usingOfflineCache && (
          <p className="text-xs text-amber-400 mt-2">Mode hors ligne: affichage des dernières données enregistrées.</p>
        )}
      </div>

      <EnfantsProfilesShowcase
        limit={6}
        showFilters
        title="Profils des enfants du centre"
        subtitle="Consultez et filtrez les profils — déposez les projets terminés"
      />

      <LocalisationDashboardSection
        centres={mesCentres}
        centresHref="/dashboard/mes-centres"
        title="Localisation du centre"
        subtitle="Fixez le point GPS une fois : toute l’équipe pourra s’y rendre via Google Maps."
        mapHeightClassName="h-[340px]"
        onCentresRefresh={() => {
          centreService.getMesCentres().then((r) => setMesCentres(r.data || [])).catch(() => {});
        }}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`kpi-card border ${kpi.bg}`}>
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

        <div className="card">
          <h3 className="text-white font-semibold mb-4">Dernières formations</h3>
          {recentFormations.length === 0 ? (
            <p className="text-sm text-dark-400">Aucune formation récente.</p>
          ) : (
            <div className="space-y-3">
              {recentFormations.map((f) => (
                <div key={f.id} className="p-3 rounded-xl bg-dark-800 border border-dark-700">
                  <p className="text-sm text-white font-medium">{f.titre}</p>
                  <p className="text-xs text-dark-400 mt-1">{new Date(f.date).toLocaleDateString('fr-FR')} • {f.dureeHeures} h</p>
                </div>
              ))}
              <Link to="/dashboard/formations" className="btn-secondary w-full justify-center text-sm">
                Voir toutes les formations
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
