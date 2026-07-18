import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AccessProvider } from './context/AccessContext';
import { InscriptionsSettingsProvider } from './context/InscriptionsSettingsContext';
import RouteTransitionShell from './components/RouteTransitionShell';
import FloatingLogoMarks from './components/site/FloatingLogoMarks';
import { PAGE_BG } from './constants/branding';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import InscriptionFormateurPage from './pages/InscriptionFormateurPage';
import ProtectedRoute from './components/ProtectedRoute';
import { PAGE_ROLES } from './constants/roleAccess';
import { PageLoadingSkeleton } from './components/ui/DashboardSkeletons';

// Dashboard layout — chargé immédiatement (structure commune à toutes les pages)
import DashboardLayout from './pages/dashboard/DashboardLayout';
import DashboardIndex from './pages/dashboard/DashboardIndex';

// Pages du dashboard — chargées à la demande (code-splitting) : chaque
// utilisateur ne télécharge que le JS des pages de son propre rôle, au lieu
// de tout le dashboard (30+ pages) dès le premier chargement.
const CentresPage = lazy(() => import('./pages/dashboard/CentresPage'));
const FormateursPage = lazy(() => import('./pages/dashboard/FormateursPage'));
const ElevesPage = lazy(() => import('./pages/dashboard/ElevesPage'));
const SessionsPage = lazy(() => import('./pages/dashboard/SessionsPage'));
const FormationsPage = lazy(() => import('./pages/dashboard/FormationsPage'));
const JournalActivitePage = lazy(() => import('./pages/dashboard/JournalActivitePage'));
const EvaluationFormateurPage = lazy(() => import('./pages/dashboard/EvaluationFormateurPage'));
const TransactionsPage = lazy(() => import('./pages/dashboard/TransactionsPage'));
const RapportsPage = lazy(() => import('./pages/dashboard/RapportsPage'));
const UtilisateursPage = lazy(() => import('./pages/dashboard/UtilisateursPage'));
const ProfilPage = lazy(() => import('./pages/dashboard/ProfilPage'));
const SignalementsPage = lazy(() => import('./pages/dashboard/SignalementsPage'));
const PublicationsPage = lazy(() => import('./pages/dashboard/PublicationsPage'));
const ActualitesPage = lazy(() => import('./pages/dashboard/ActualitesPage'));
const RessourcesPage = lazy(() => import('./pages/dashboard/RessourcesPage'));
const CommunautePage = lazy(() => import('./pages/dashboard/CommunautePage'));
const GroupesDiscussionPage = lazy(() => import('./pages/dashboard/GroupesDiscussionPage'));
const ProfilsEnfantsPage = lazy(() => import('./pages/dashboard/ProfilsEnfantsPage'));
const ControleGestionPage = lazy(() => import('./pages/dashboard/ControleGestionPage'));
const PermissionsPage = lazy(() => import('./pages/dashboard/PermissionsPage'));
const GaleriePage = lazy(() => import('./pages/dashboard/GaleriePage'));
const SupportsCoursPage = lazy(() => import('./pages/dashboard/SupportsCoursPage'));

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function AppRoutes() {
  const location = useLocation();
  // Ne pas remonter tout le dashboard à chaque clic menu (sinon le toggle inscriptions « saute »)
  const routeKey = location.pathname.startsWith('/dashboard')
    ? 'dashboard'
    : location.pathname;

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoadingSkeleton />}>
      <Routes location={location} key={routeKey}>
        {/* Site Public */}
        <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/connexion" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/inscription-formateur" element={<PageTransition><InscriptionFormateurPage /></PageTransition>} />

        {/* Plateforme Privée (Dashboard) — layout stable, seul <Outlet /> change */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<PageTransition><DashboardIndex /></PageTransition>} />
          
          {/* Centres */}
          <Route path="centres" element={
            <ProtectedRoute roles={PAGE_ROLES.centres} feature="centres">
              <PageTransition><CentresPage /></PageTransition>
            </ProtectedRoute>
          } />
          <Route path="mes-centres" element={
            <ProtectedRoute roles={PAGE_ROLES['mes-centres']} feature="mes-centres">
              <PageTransition><CentresPage /></PageTransition>
            </ProtectedRoute>
          } />

          {/* Formateurs */}
          <Route path="formateurs" element={
            <ProtectedRoute roles={PAGE_ROLES.formateurs} feature="formateurs">
              <PageTransition><FormateursPage /></PageTransition>
            </ProtectedRoute>
          } />

          {/* Élèves */}
          <Route path="eleves" element={
            <ProtectedRoute roles={PAGE_ROLES.eleves} feature="eleves">
              <PageTransition><ElevesPage /></PageTransition>
            </ProtectedRoute>
          } />

          {/* Sessions */}
          <Route path="sessions" element={
            <ProtectedRoute roles={PAGE_ROLES.sessions} feature="sessions">
              <PageTransition><SessionsPage /></PageTransition>
            </ProtectedRoute>
          } />

          {/* Formations */}
          <Route path="formations" element={
            <ProtectedRoute roles={PAGE_ROLES.formations} feature="formations">
              <PageTransition><FormationsPage /></PageTransition>
            </ProtectedRoute>
          } />

          {/* Supports de cours / modules SKA */}
          <Route path="supports-cours" element={
            <ProtectedRoute roles={PAGE_ROLES['supports-cours']} feature="supports-cours">
              <PageTransition><SupportsCoursPage /></PageTransition>
            </ProtectedRoute>
          } />

          {/* Journal d'activité — Directeur */}
          <Route path="journal-activite" element={
            <ProtectedRoute roles={PAGE_ROLES['journal-activite']} feature="journal-activite">
              <PageTransition><JournalActivitePage /></PageTransition>
            </ProtectedRoute>
          } />

          <Route path="evaluation-formateur" element={
            <ProtectedRoute roles={PAGE_ROLES['evaluation-formateur']} feature="evaluation-formateur">
              <PageTransition><EvaluationFormateurPage /></PageTransition>
            </ProtectedRoute>
          } />

          {/* Transactions */}
          <Route path="transactions" element={
            <ProtectedRoute roles={PAGE_ROLES.transactions} feature="transactions">
              <PageTransition><TransactionsPage /></PageTransition>
            </ProtectedRoute>
          } />

          {/* Rapports */}
          <Route path="rapports" element={
            <ProtectedRoute roles={PAGE_ROLES.rapports} feature="rapports">
              <PageTransition><RapportsPage /></PageTransition>
            </ProtectedRoute>
          } />

          {/* Utilisateurs */}
          <Route path="utilisateurs" element={
            <ProtectedRoute roles={PAGE_ROLES.utilisateurs} feature="utilisateurs">
              <PageTransition><UtilisateursPage /></PageTransition>
            </ProtectedRoute>
          } />

          {/* Permissions dashboards — Directeur */}
          <Route path="permissions" element={
            <ProtectedRoute roles={PAGE_ROLES.permissions} feature="permissions">
              <PageTransition><PermissionsPage /></PageTransition>
            </ProtectedRoute>
          } />

          {/* Signalements */}
          <Route path="signalements" element={
            <ProtectedRoute roles={PAGE_ROLES.signalements} feature="signalements">
              <PageTransition><SignalementsPage /></PageTransition>
            </ProtectedRoute>
          } />

          {/* Site public — Directeur */}
          <Route path="publications" element={
            <ProtectedRoute roles={PAGE_ROLES.publications} feature="publications">
              <PageTransition><PublicationsPage /></PageTransition>
            </ProtectedRoute>
          } />
          <Route path="actualites" element={
            <ProtectedRoute roles={PAGE_ROLES.actualites} feature="actualites">
              <PageTransition><ActualitesPage /></PageTransition>
            </ProtectedRoute>
          } />
          <Route path="galerie" element={
            <ProtectedRoute roles={PAGE_ROLES.galerie} feature="galerie">
              <PageTransition><GaleriePage /></PageTransition>
            </ProtectedRoute>
          } />

          {/* Contenu interne CDEJ */}
          <Route path="ressources" element={
            <ProtectedRoute roles={PAGE_ROLES.ressources} feature="ressources">
              <PageTransition><RessourcesPage /></PageTransition>
            </ProtectedRoute>
          } />
          <Route path="communaute" element={
            <ProtectedRoute roles={PAGE_ROLES.communaute} feature="communaute">
              <PageTransition><CommunautePage /></PageTransition>
            </ProtectedRoute>
          } />
          <Route path="discussion" element={
            <ProtectedRoute roles={PAGE_ROLES.discussion} feature="discussion">
              <PageTransition><GroupesDiscussionPage /></PageTransition>
            </ProtectedRoute>
          } />
          <Route path="profils-enfants" element={
            <ProtectedRoute roles={PAGE_ROLES['profils-enfants']} feature="profils-enfants">
              <PageTransition><ProfilsEnfantsPage /></PageTransition>
            </ProtectedRoute>
          } />
          <Route path="controle-gestion" element={
            <ProtectedRoute roles={PAGE_ROLES['controle-gestion']} feature="controle-gestion">
              <PageTransition><ControleGestionPage /></PageTransition>
            </ProtectedRoute>
          } />

          {/* Profil */}
          <Route path="profil" element={
            <ProtectedRoute feature="profil">
              <PageTransition><ProfilPage /></PageTransition>
            </ProtectedRoute>
          } />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AccessProvider>
        <InscriptionsSettingsProvider>
          <div className="app-frame relative" style={{ backgroundColor: PAGE_BG }}>
            <FloatingLogoMarks />
            <div className="relative z-10 text-slate-900 min-h-[calc(100vh-20px)] sm:min-h-[calc(100vh-20px)]">
              <Router>
                <RouteTransitionShell>
                  <AppRoutes />
                </RouteTransitionShell>
              </Router>
            </div>
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#ffffff',
                color: '#0f172a',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
              },
            }}
          />
        </InscriptionsSettingsProvider>
      </AccessProvider>
    </AuthProvider>
  );
}
