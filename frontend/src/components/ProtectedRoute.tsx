import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import type { Role } from '../types';
import type { FeatureId } from '../constants/roleAccess';
import ForbiddenState from './ui/ForbiddenState';
import AppLoader from './ui/AppLoader';

interface Props {
  children: React.ReactNode;
  roles?: Role[];
  /** Si défini, l’accès dépend aussi des permissions configurées par le Directeur */
  feature?: FeatureId | string;
}

export default function ProtectedRoute({ children, roles, feature }: Props) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const { hasFeature, loading: accessLoading } = useAccess();

  if (isLoading || (isAuthenticated && feature && accessLoading)) {
    return (
      <AppLoader
        variant="fullPage"
        message="Préparation de votre espace…"
        label="Vérification de la session"
      />
    );
  }

  if (!isAuthenticated) return <Navigate to="/connexion" replace />;
  if (roles && role && !roles.includes(role)) {
    return <ForbiddenState message="Cette section est réservée à un autre rôle sur la plateforme." />;
  }
  if (feature && !hasFeature(feature)) {
    return <ForbiddenState message="Le Directeur n'a pas activé cette fonctionnalité pour votre compte." />;
  }

  return <>{children}</>;
}
