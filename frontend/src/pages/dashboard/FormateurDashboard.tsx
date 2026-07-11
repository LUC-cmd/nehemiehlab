import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Clock, BookOpen, CreditCard, TrendingUp, Building2, ArrowUpRight, Phone, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { centreService, dashboardService, formationService, sessionService } from '../../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Centre, ModuleFormation, SessionCours } from '../../types';
import { fetchWithOfflineCache } from '../../utils/offlineCache';
import EnfantsProfilesShowcase from '../../components/dashboard/EnfantsProfilesShowcase';
import LocalisationDashboardSection from '../../components/dashboard/LocalisationDashboardSection';

const chartTooltipStyle = { background: '#18152c', border: '1px solid #282343', borderRadius: '12px', color: '#fff' };

export default function FormateurDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [usingOfflineCache, setUsingOfflineCache] = useState(false);
  const [recentFormations, setRecentFormations] = useState<ModuleFormation[]>([]);
  const [openSessions, setOpenSessions] = useState<SessionCours[]>([]);
  const [mesCentres, setMesCentres] = useState<Centre[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsResult, formationsResult, sessionsResult, centresResult] = await Promise.all([
          fetchWithOfflineCache('formateur:stats', async () => (await dashboardService.getStats()).data),
          fetchWithOfflineCache('formateur:formations', async () => (await formationService.getMesFormations()).data as ModuleFormation[]),
          fetchWithOfflineCache('formateur:sessions', async () => (await sessionService.getAll()).data as SessionCours[]),
          fetchWithOfflineCache('formateur:centres', async () => (await centreService.getMesCentres()).data as Centre[]),
        ]);
        setStats(statsResult.data);
        setRecentFormations(formationsResult.data.slice(0, 5));
        setMesCentres(centresResult.data || []);
        const userId = user?.id;
        const filtered = sessionsResult.data.filter((s) => s.formateur?.id === userId && s.statut === 'EN_COURS');
        setOpenSessions(filtered.slice(0, 5));
        setUsingOfflineCache(
          statsResult.fromCache ||
            formationsResult.fromCache ||
            sessionsResult.fromCache ||
            centresResult.fromCache ||
            !navigator.onLine,
        );
      } catch {
        setUsingOfflineCache(!navigator.onLine);
      }
    };
    load();
  }, [user?.id]);

  const coordinateurs = mesCentres
    .filter((c) => c.coordinateurNom || c.coordinateurPrenom || c.coordinateur?.id)
    .map((c) => ({
      centre: c.nom,
      region: c.region,
      nom: c.coordinateur
        ? `${c.coordinateur.prenom} ${c.coordinateur.nom}`
        : `${c.coordinateurPrenom || ''} ${c.coordinateurNom || ''}`.trim(),
      telephone: c.telephoneCoordinateur || c.coordinateur?.telephone || '',
    }));

  const kpis = [
    { label: 'Mes centres', value: stats.totalCentres ?? 0, icon: <Building2 className="w-5 h-5" />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { label: 'Mes élèves', value: stats.totalEleves ?? 0, icon: <Users className="w-5 h-5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Heures totales', value: stats.totalHeuresFormation ?? 0, icon: <Clock className="w-5 h-5" />, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Formations dispensées', value: stats.totalFormations ?? 0, icon: <BookOpen className="w-5 h-5" />, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    { label: 'Paiements en attente', value: stats.transactionsEnAttente ?? 0, icon: <CreditCard className="w-5 h-5" />, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  ];

  const actions = [
    { label: 'Profils & projets enfants', href: '/dashboard/profils-enfants', color: 'text-[#5ED9FF]' },
    { label: 'Démarrer une session', href: '/dashboard/sessions', color: 'text-primary-400' },
    { label: 'Saisir le module du jour', href: '/dashboard/formations', color: 'text-blue-400' },
    { label: 'Gérer mes élèves', href: '/dashboard/eleves', color: 'text-amber-400' },
    { label: 'Voir mes paiements', href: '/dashboard/transactions', color: 'text-emerald-400' },
  ];

  const dataPresence = [
    { jour: 'Lun', heures: Math.round((stats.totalHeuresFormation ?? 0) * 0.12) },
    { jour: 'Mar', heures: Math.round((stats.totalHeuresFormation ?? 0) * 0.16) },
    { jour: 'Mer', heures: Math.round((stats.totalHeuresFormation ?? 0) * 0.14) },
    { jour: 'Jeu', heures: Math.round((stats.totalHeuresFormation ?? 0) * 0.18) },
    { jour: 'Ven', heures: Math.round((stats.totalHeuresFormation ?? 0) * 0.1) },
    { jour: 'Sam', heures: Math.round((stats.totalHeuresFormation ?? 0) * 0.15) },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Bienvenue, {user?.prenom}</h1>
        <p className="text-dark-400 mt-1">Voici un résumé de votre activité de formation.</p>
        {usingOfflineCache && (
          <p className="text-xs text-amber-400 mt-2">Mode hors ligne: affichage des dernières données enregistrées.</p>
        )}
      </div>

      <EnfantsProfilesShowcase
        limit={8}
        showFilters
        title="Mes profils enfants"
        subtitle="Ajoutez un enfant, déposez ses projets terminés — filtrez par centre"
      />

      <LocalisationDashboardSection
        centres={mesCentres}
        centresHref="/dashboard/mes-centres"
        title="Mes centres — localisation"
        subtitle="Retrouvez vos centres sur la carte, fixez le GPS sur place et lancez l’itinéraire."
        sessions={openSessions}
        showSessionsOnMap
        mapHeightClassName="h-[360px]"
        enableSessionStart
        onCentresRefresh={() => {
          centreService.getMesCentres().then((r) => setMesCentres(r.data || [])).catch(() => {});
        }}
      />

      {coordinateurs.length > 0 && (
        <section className="card border border-dark-700">
          <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
            <UserRound className="w-4 h-4 text-[#5ED9FF]" />
            Coordinateurs de mes centres
          </h3>
          <p className="text-sm text-dark-400 mb-4">Contacts utiles pour vos centres d&apos;affectation.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {coordinateurs.map((c) => (
              <div key={`${c.centre}-${c.nom}`} className="rounded-xl border border-dark-700 bg-dark-800/60 p-3">
                <p className="text-sm font-semibold text-white">{c.nom || 'Coordinateur'}</p>
                <p className="text-xs text-dark-400 mt-1">{c.centre}{c.region ? ` · ${c.region}` : ''}</p>
                {c.telephone && (
                  <a href={`tel:${c.telephone}`} className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#5ED9FF]">
                    <Phone className="w-3.5 h-3.5" /> {c.telephone}
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-semibold">Activité de formation</h3>
              <p className="text-dark-400 text-sm">Heures estimées par jour</p>
            </div>
            <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium">
              <TrendingUp className="w-4 h-4" /> {stats.totalHeuresFormation ?? 0}h
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
              <CartesianGrid strokeDasharray="3 3" stroke="#282343" />
              <XAxis dataKey="jour" stroke="#777298" tick={{ fontSize: 11 }} />
              <YAxis stroke="#777298" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area type="monotone" dataKey="heures" stroke="#F43B1D" strokeWidth={2} fill="url(#presGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="card">
          <h3 className="text-white font-semibold mb-4">Accès rapides</h3>
          <div className="space-y-3">
            {actions.map((a) => (
              <Link key={a.label} to={a.href} className="action-link group">
                <span className={`text-sm font-medium ${a.color}`}>{a.label}</span>
                <ArrowUpRight className={`w-4 h-4 ${a.color} group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform`} />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Sessions en cours</h3>
          {openSessions.length === 0 ? (
            <p className="text-sm text-dark-400">Aucune session en cours.</p>
          ) : (
            <div className="space-y-3">
              {openSessions.map((s) => (
                <div key={s.id} className="p-3 rounded-xl border border-dark-700 bg-dark-800/60">
                  <p className="text-sm font-medium text-white">{s.titre}</p>
                  <p className="text-xs text-dark-400 mt-1">{s.centre?.nom} • {new Date(s.heureDebut).toLocaleDateString('fr-FR')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Derniers modules saisis</h3>
          {recentFormations.length === 0 ? (
            <p className="text-sm text-dark-400">Aucun module récent.</p>
          ) : (
            <div className="space-y-3">
              {recentFormations.map((f) => (
                <div key={f.id} className="p-3 rounded-xl border border-dark-700 bg-dark-800/60">
                  <p className="text-sm font-medium text-white">{f.titre}</p>
                  <p className="text-xs text-dark-400 mt-1">{new Date(f.date).toLocaleDateString('fr-FR')} • {f.dureeHeures} h</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
