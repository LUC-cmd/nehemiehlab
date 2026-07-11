import React from 'react';
import { useAuth } from '../../context/AuthContext';
import DirecteurDashboard from './DirecteurDashboard';
import FormateurDashboard from './FormateurDashboard';
import CoordinateurDashboard from './CoordinateurDashboard';
import ComptableDashboard from './ComptableDashboard';
import CommunityMemberDashboard from './CommunityMemberDashboard';
import ParentDashboard from './ParentDashboard';
import ResponsableClusterDashboard from './ResponsableClusterDashboard';

export default function DashboardIndex() {
  const { role } = useAuth();

  switch (role) {
    case 'DIRECTEUR':
      return <DirecteurDashboard />;
    case 'FORMATEUR':
      return <FormateurDashboard />;
    case 'COORDINATEUR':
      return <CoordinateurDashboard />;
    case 'RESPONSABLE_CLUSTER':
      return <ResponsableClusterDashboard />;
    case 'COMPTABLE':
      return <ComptableDashboard />;
    case 'PARENT':
      return <ParentDashboard />;
    case 'STAFF_NEHEMIAH':
    case 'ANIMATEUR':
    case 'BENEVOLE':
    case 'PARTICIPANT':
      return <CommunityMemberDashboard />;
    default:
      return (
        <div className="card text-center py-12">
          <p className="text-dark-400">Rôle non reconnu ou accès non configuré.</p>
        </div>
      );
  }
}
