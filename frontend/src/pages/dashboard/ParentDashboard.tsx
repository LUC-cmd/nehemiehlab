import React, { useEffect, useState } from 'react';
import { BookOpen, Clock, GraduationCap, Hash, MapPin, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { parentService } from '../../services/api';
import toast from 'react-hot-toast';
import { PageLoadingSkeleton } from '../../components/ui/DashboardSkeletons';

interface ParentEnfantView {
  id: number;
  nom: string;
  prenom: string;
  matricule?: string;
  age?: number;
  sexe?: string;
  classe?: string;
  centre?: string;
  dateDebutFormation?: string;
  totalHeures?: number;
  performanceMoyenne?: number | null;
  projet?: { nom: string; description: string; evolution: number } | null;
}

export default function ParentDashboard() {
  const { user } = useAuth();
  const [enfant, setEnfant] = useState<ParentEnfantView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentService
      .getMonEnfant()
      .then((r) => setEnfant(r.data))
      .catch(() => {
        toast.error('Impossible de charger les informations de l’enfant.');
        setEnfant(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoadingSkeleton cardCount={4} />;

  if (!enfant) {
    return (
      <div className="card border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900">Espace parent</h1>
        <p className="text-slate-500 mt-2">Aucun enfant lié à ce compte.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Bonjour{user?.prenom ? `, ${user.prenom}` : ''}
        </h1>
        <p className="text-slate-500 mt-1">
          Suivi de <strong className="text-slate-800">{enfant.prenom} {enfant.nom}</strong>
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card border border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-50 text-primary-700">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Matricule</p>
              <p className="font-bold text-slate-900 tracking-wide">{enfant.matricule || '—'}</p>
            </div>
          </div>
        </div>
        <div className="card border border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Classe</p>
              <p className="font-bold text-slate-900">{enfant.classe || '—'}</p>
            </div>
          </div>
        </div>
        <div className="card border border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Heures</p>
              <p className="font-bold text-slate-900">
                {(enfant.totalHeures ?? 0).toFixed(1)} h
              </p>
            </div>
          </div>
        </div>
        <div className="card border border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-50 text-violet-700">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Performance</p>
              <p className="font-bold text-slate-900">
                {enfant.performanceMoyenne != null
                  ? `${enfant.performanceMoyenne} / 20`
                  : 'Non évalué'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card border border-slate-200 bg-white space-y-3">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#004b57]" />
            Informations
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Âge</dt>
              <dd className="font-medium text-slate-900">{enfant.age ?? '—'} ans</dd>
            </div>
            <div>
              <dt className="text-slate-500">Sexe</dt>
              <dd className="font-medium text-slate-900">{enfant.sexe === 'F' ? 'Féminin' : 'Masculin'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Centre
              </dt>
              <dd className="font-medium text-slate-900">{enfant.centre || '—'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-slate-500">Début de formation</dt>
              <dd className="font-medium text-slate-900">
                {enfant.dateDebutFormation
                  ? new Date(enfant.dateDebutFormation).toLocaleDateString('fr-FR')
                  : '—'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="card border border-slate-200 bg-white space-y-3">
          <h2 className="font-semibold text-slate-900">Projet en cours</h2>
          {enfant.projet ? (
            <>
              <p className="text-slate-900 font-medium">{enfant.projet.nom}</p>
              <p className="text-sm text-slate-500">{enfant.projet.description || 'Pas de description.'}</p>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Avancement</span>
                  <span>{enfant.projet.evolution}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#004b57]"
                    style={{ width: `${Math.min(100, Math.max(0, enfant.projet.evolution))}%` }}
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500 italic">Aucun projet renseigné pour le moment.</p>
          )}
        </div>
      </div>
    </div>
  );
}
