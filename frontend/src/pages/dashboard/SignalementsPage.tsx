import React, { useEffect, useState } from 'react';
import { eleveService } from '../../services/api';
import type { Signalement } from '../../types';
import { AlertTriangle, Check, Clock, User, Calendar, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SignalementsPage() {
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSignalements();
  }, []);

  const fetchSignalements = async () => {
    setLoading(true);
    try {
      // Pour faire simple dans le prototype, on simule l'obtention des signalements du centre
      // En production, il y aura un endpoint dédié pour les signalements
      const res = await eleveService.getSignalements(0); 
      setSignalements(res.data);
    } catch {
      // Silencieusement ignoré pour le prototype si l'endpoint n'est pas encore prêt
      setSignalements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTraiter = async (id: number) => {
    try {
      await eleveService.traiterSignalement(id);
      toast.success('Signalement marqué comme traité.');
      fetchSignalements();
    } catch {
      toast.error('Erreur lors du traitement du signalement.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Signalements d'incidents</h1>
        <p className="text-dark-400 mt-1">Consultez et gérez les incidents signalés dans votre centre.</p>
      </div>

      <div className="space-y-4">
        {signalements.map((s) => (
          <div key={s.id} className="card border border-dark-700 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <span className="text-white font-bold text-lg">Élève ID : {s.eleveId}</span>
              </div>
              <p className="text-dark-300 text-sm">{s.description}</p>
              
              <div className="flex flex-wrap gap-4 pt-2 text-xs text-dark-400">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  Signalé par : {s.auteur?.prenom} {s.auteur?.nom}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  le {new Date(s.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              {s.statut === 'EN_ATTENTE' ? (
                <>
                  <span className="badge badge-warning flex items-center gap-1"><Clock className="w-3 h-3" /> En attente</span>
                  <button onClick={() => handleTraiter(s.id)}
                    className="btn-primary py-2 px-4 text-xs bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25 hover:shadow-emerald-500/40">
                    <Check className="w-3.5 h-3.5" />
                    Marquer traité
                  </button>
                </>
              ) : (
                <span className="badge badge-success flex items-center gap-1"><Check className="w-3 h-3" /> Traité</span>
              )}
            </div>
          </div>
        ))}

        {signalements.length === 0 && (
          <div className="card text-center py-12 text-dark-500">
            Aucun incident signalé. Tout est calme !
          </div>
        )}
      </div>
    </div>
  );
}
