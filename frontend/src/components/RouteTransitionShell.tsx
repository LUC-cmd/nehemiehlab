import React from 'react';
import { useRouteTransition } from '../hooks/useRouteTransition';
import { RouteProgressBar } from './ui/AppLoader';

/** Barre de progression globale lors de la navigation entre pages. */
export default function RouteTransitionShell({ children }: { children: React.ReactNode }) {
  const routeLoading = useRouteTransition();

  return (
    <>
      <RouteProgressBar active={routeLoading} />
      {children}
    </>
  );
}
