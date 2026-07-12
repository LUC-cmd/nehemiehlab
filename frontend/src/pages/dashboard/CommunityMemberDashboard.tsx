import React from 'react';
import { Link } from 'react-router-dom';
import { UsersRound, Library, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { Role } from '../../types';

const roleWelcome: Record<string, string> = {
  STAFF_NEHEMIAH: 'Staff Nehemiah',
  ANIMATEUR: 'Animateur CDEJ',
  BENEVOLE: 'Bénévole CDEJ',
  PARTICIPANT: 'Participant CDEJ',
};

const canAccessRessources = (role: Role | null) =>
  role === 'STAFF_NEHEMIAH' || role === 'ANIMATEUR';

export default function CommunityMemberDashboard() {
  const { user, role } = useAuth();
  const label = (role && roleWelcome[role]) || 'Membre CDEJ';
  const showRessources = canAccessRessources(role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Bonjour{user?.prenom ? `, ${user.prenom}` : ''}
        </h1>
        <p className="text-dark-400 mt-1">
          Espace interne CDEJ — {label}. Vous n&apos;êtes pas seul·e dans la communauté.
        </p>
      </div>

      <div className={`grid gap-4 ${showRessources ? 'sm:grid-cols-2' : 'sm:grid-cols-1 max-w-xl'}`}>
        <Link
          to="/dashboard/communaute"
          className="card border border-dark-700 hover:border-primary-500/40 transition-colors group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <UsersRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-white font-semibold">Communauté CDEJ</h2>
                <p className="text-sm text-dark-400 mt-1">
                  Voir les membres, formateurs SKA et participants.
                </p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-dark-500 group-hover:text-primary-400 transition-colors" />
          </div>
        </Link>

        {showRessources && (
          <Link
            to="/dashboard/ressources"
            className="card border border-dark-700 hover:border-primary-500/40 transition-colors group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Library className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-white font-semibold">Ressources</h2>
                  <p className="text-sm text-dark-400 mt-1">
                    Protection de l&apos;enfance, soft skills et projets de référence.
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-dark-500 group-hover:text-primary-400 transition-colors" />
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
