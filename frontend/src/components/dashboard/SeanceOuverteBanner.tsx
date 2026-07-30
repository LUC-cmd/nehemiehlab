import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sessionService } from '../../services/api';
import type { SessionCours } from '../../types';

const POLL_INTERVAL_MS = 60_000;

/**
 * Rappel persistant : tant qu'un formateur (ou le Directeur) a une séance
 * "EN_COURS" non clôturée, cette bannière reste visible en haut de TOUTES
 * les pages du dashboard — pas seulement sur l'accueil — pour qu'il ne
 * l'oublie pas sur le terrain.
 */
export default function SeanceOuverteBanner() {
  const { role } = useAuth();
  const location = useLocation();
  const [openSessions, setOpenSessions] = useState<SessionCours[]>([]);
  const [checking, setChecking] = useState(false);

  const canHaveSessions = role === 'FORMATEUR' || role === 'DIRECTEUR';

  const refresh = useCallback(async () => {
    if (!canHaveSessions) return;
    setChecking(true);
    try {
      const res = await sessionService.getEnCours();
      setOpenSessions(res.data || []);
    } catch {
      // Silencieux : on ne veut pas remplacer la bannière par une erreur
      // réseau passagère — elle réapparaîtra au prochain contrôle.
    } finally {
      setChecking(false);
    }
  }, [canHaveSessions]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  // Revérifie à chaque changement de page (ex : juste après une clôture,
  // pour faire disparaître la bannière sans attendre le prochain sondage).
  useEffect(() => {
    void refresh();
  }, [location.pathname, refresh]);

  if (!canHaveSessions || openSessions.length === 0) return null;

  const session = openSessions[0];
  const debut = session.heureDebut ? new Date(session.heureDebut) : null;
  const heureLabel = debut
    ? debut.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '';
  const extra = openSessions.length > 1 ? ` (+${openSessions.length - 1} autre${openSessions.length - 1 > 1 ? 's' : ''})` : '';

  return (
    <div className="sticky top-0 z-40 -mx-3 sm:-mx-5 md:-mx-6 lg:-mx-8 -mt-3 sm:-mt-5 md:-mt-6 lg:-mt-8 mb-4 px-3 sm:px-5 md:px-6 lg:px-8 py-2.5 bg-amber-50 border-b border-amber-300">
      <div className="mx-auto w-full max-w-7xl flex items-center gap-3 flex-wrap">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800 flex-1 min-w-0">
          <span className="font-semibold">Séance en cours non clôturée :</span>{' '}
          {session.titre}
          {session.centre?.nom ? ` · ${session.centre.nom}` : ''}
          {heureLabel ? ` · démarrée le ${heureLabel}` : ''}
          {extra}
        </p>
        {checking && <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />}
        <Link
          to={`/dashboard/sessions?sessionId=${session.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-amber-900 bg-amber-200 hover:bg-amber-300 rounded-lg px-3 py-1.5 transition-colors shrink-0"
        >
          Clôturer maintenant
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
