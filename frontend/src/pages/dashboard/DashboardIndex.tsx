import React from 'react';
import { useAuth } from '../../context/AuthContext';
import DirecteurDashboard from './DirecteurDashboard';
import FormateurDashboard from './FormateurDashboard';
import CoordinateurDashboard from './CoordinateurDashboard';
import ComptableDashboard from './ComptableDashboard';

export default function DashboardIndex() {
  const { role } = useAuth();

  switch (role) {
    case 'DIRECTEUR':
      return <DirecteurDashboard />;
    case 'FORMATEUR':
      return <FormateurDashboard />;
    case 'COORDINATEUR':
      return <CoordinateurDashboard />;
    case 'COMPTABLE':
      return <ComptableDashboard />;
    default:
      return (
        <div className="card text-center py-12">
          <p className="text-dark-400">Rôle non reconnu ou accès non configuré.</p>
        </div>
      );
  }
}
