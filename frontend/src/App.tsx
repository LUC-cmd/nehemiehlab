import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import InscriptionFormateurPage from './pages/InscriptionFormateurPage';
import ProtectedRoute from './components/ProtectedRoute';

// Dashboard layout & pages
import DashboardLayout from './pages/dashboard/DashboardLayout';
import DashboardIndex from './pages/dashboard/DashboardIndex';
import CentresPage from './pages/dashboard/CentresPage';
import FormateursPage from './pages/dashboard/FormateursPage';
import ElevesPage from './pages/dashboard/ElevesPage';
import SessionsPage from './pages/dashboard/SessionsPage';
import FormationsPage from './pages/dashboard/FormationsPage';
import TransactionsPage from './pages/dashboard/TransactionsPage';
import RapportsPage from './pages/dashboard/RapportsPage';
import UtilisateursPage from './pages/dashboard/UtilisateursPage';
import ProfilPage from './pages/dashboard/ProfilPage';
import SignalementsPage from './pages/dashboard/SignalementsPage';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Site Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/inscription-formateur" element={<InscriptionFormateurPage />} />

          {/* Plateforme Privée (Dashboard) */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardIndex />} />
            
            {/* Centres */}
            <Route path="centres" element={
              <ProtectedRoute roles={['DIRECTEUR']}>
                <CentresPage />
              </ProtectedRoute>
            } />
            <Route path="mes-centres" element={
              <ProtectedRoute roles={['FORMATEUR']}>
                <CentresPage />
              </ProtectedRoute>
            } />

            {/* Formateurs */}
            <Route path="formateurs" element={
              <ProtectedRoute roles={['DIRECTEUR']}>
                <FormateursPage />
              </ProtectedRoute>
            } />

            {/* Élèves */}
            <Route path="eleves" element={
              <ProtectedRoute roles={['DIRECTEUR', 'FORMATEUR', 'COORDINATEUR']}>
                <ElevesPage />
              </ProtectedRoute>
            } />

            {/* Sessions */}
            <Route path="sessions" element={
              <ProtectedRoute roles={['DIRECTEUR', 'FORMATEUR']}>
                <SessionsPage />
              </ProtectedRoute>
            } />

            {/* Formations */}
            <Route path="formations" element={
              <ProtectedRoute roles={['DIRECTEUR', 'FORMATEUR', 'COORDINATEUR']}>
                <FormationsPage />
              </ProtectedRoute>
            } />

            {/* Transactions */}
            <Route path="transactions" element={
              <ProtectedRoute roles={['DIRECTEUR', 'FORMATEUR', 'COMPTABLE']}>
                <TransactionsPage />
              </ProtectedRoute>
            } />

            {/* Rapports */}
            <Route path="rapports" element={
              <ProtectedRoute roles={['DIRECTEUR', 'FORMATEUR', 'COMPTABLE']}>
                <RapportsPage />
              </ProtectedRoute>
            } />

            {/* Utilisateurs */}
            <Route path="utilisateurs" element={
              <ProtectedRoute roles={['DIRECTEUR']}>
                <UtilisateursPage />
              </ProtectedRoute>
            } />

            {/* Signalements */}
            <Route path="signalements" element={
              <ProtectedRoute roles={['COORDINATEUR']}>
                <SignalementsPage />
              </ProtectedRoute>
            } />

            {/* Profil */}
            <Route path="profil" element={<ProfilPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f0c22',
            color: '#fff',
            border: '1px solid #282343',
            borderRadius: '12px',
          },
        }}
      />
    </AuthProvider>
  );
}
