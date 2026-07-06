import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formationService, centreService, eleveService } from '../../services/api';
import type { ModuleFormation, Centre, Eleve } from '../../types';
import { Plus, X, BookOpen, Calendar, Clock, User, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FormationsPage() {
  const { role, hasRole } = useAuth();
  
  const [formations, setFormations] = useState<ModuleFormation[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form states
  const [selectedCentreId, setSelectedCentreId] = useState('');
  const [newFormation, setNewFormation] = useState({ titre: '', description: '', dureeHeures: '', date: new Date().toISOString().split('T')[0] });
  const [presents, setPresents] = useState<number[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCentreId) {
      fetchEleves(Number(selectedCentreId));
    } else {
      setEleves([]);
    }
  }, [selectedCentreId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Charger les formations selon le rôle
      let formRes;
      if (hasRole('FORMATEUR')) {
        formRes = await formationService.getMesFormations();
      } else {
        // Directeur et Coordinateur chargent par rapport à un centre ou global. Pour simplifier, on prend les centres d'abord
        formRes = { data: [] }; // On va charger après avoir sélectionné un centre
      }
      setFormations(formRes.data);

      // 2. Charger les centres autorisés
      let centresRes;
      if (hasRole('DIRECTEUR')) {
        centresRes = await centreService.getAll();
      } else {
        centresRes = await centreService.getMesCentres();
      }
      setCentres(centresRes.data);
      if (centresRes.data.length > 0) {
        const firstCentreId = centresRes.data[0].id;
        setSelectedCentreId(String(firstCentreId));
        if (!hasRole('FORMATEUR')) {
          // Si pas formateur, on charge les formations de ce premier centre
          const res = await formationService.getByCentre(firstCentreId);
          setFormations(res.data);
        }
      }
    } catch {
      toast.error('Erreur lors de la récupération des données.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEleves = async (centreId: number) => {
    try {
      const res = await eleveService.getByCentre(centreId);
      setEleves(res.data);
      setPresents([]); // Reset
    } catch {
      toast.error('Erreur lors du chargement des élèves du centre.');
    }
  };

  const handleCentreChange = async (centreId: string) => {
    setSelectedCentreId(centreId);
    if (!hasRole('FORMATEUR') && centreId) {
      setLoading(true);
      try {
        const res = await formationService.getByCentre(Number(centreId));
        setFormations(res.data);
      } catch {
        toast.error('Erreur lors du chargement des formations de ce centre.');
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleStudentPresence = (id: number) => {
    setPresents(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleAddFormation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCentreId) {
      toast.error('Veuillez sélectionner un centre.');
      return;
    }
    try {
      await formationService.create({
        centreId: Number(selectedCentreId),
        titre: newFormation.titre,
        description: newFormation.description,
        dureeHeures: Number(newFormation.dureeHeures),
        date: newFormation.date,
        elevesPresents: presents
      });
      toast.success('Rapport de formation enregistré.');
      setShowAddModal(false);
      setNewFormation({ titre: '', description: '', dureeHeures: '', date: new Date().toISOString().split('T')[0] });
      setPresents([]);
      
      // Recharger
      if (hasRole('FORMATEUR')) {
        const formRes = await formationService.getMesFormations();
        setFormations(formRes.data);
      } else {
        const res = await formationService.getByCentre(Number(selectedCentreId));
        setFormations(res.data);
      }
    } catch {
      toast.error('Erreur lors de l\'enregistrement de la formation.');
    }
  };

  const isFormateur = hasRole('FORMATEUR');

  if (loading && centres.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Journal des Formations</h1>
          <p className="text-dark-400 mt-1">Saisie et suivi des modules enseignés dans les centres.</p>
        </div>
        {isFormateur && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Saisir un module
          </button>
        )}
      </div>

      {/* Select Centre pour les autres rôles */}
      {!isFormateur && centres.length > 0 && (
        <div className="flex items-center gap-2 max-w-xs">
          <label className="text-sm text-dark-400 whitespace-nowrap">Centre :</label>
          <select className="input-field py-2 text-sm" value={selectedCentreId} onChange={e => handleCentreChange(e.target.value)}>
            {centres.map(c => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {formations.map((f) => (
            <div key={f.id} className="card border border-dark-700 hover:border-dark-600 transition-all p-5">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-primary-500/15 text-primary-400">
                      <BookOpen className="w-4 h-4" />
                    </span>
                    <h3 className="text-white font-bold text-lg">{f.titre}</h3>
                  </div>
                  <p className="text-dark-300 text-sm">{f.description}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-dark-400 shrink-0">
                  <span className="flex items-center gap-1.5 bg-dark-800 border border-dark-700 px-3 py-1.5 rounded-lg">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(f.date).toLocaleDateString('fr-FR')}
                  </span>
                  <span className="flex items-center gap-1.5 bg-dark-800 border border-dark-700 px-3 py-1.5 rounded-lg">
                    <Clock className="w-3.5 h-3.5" />
                    {f.dureeHeures} heures
                  </span>
                  <span className="flex items-center gap-1.5 bg-dark-800 border border-dark-700 px-3 py-1.5 rounded-lg text-emerald-400 border-emerald-500/20 bg-emerald-500/5">
                    <User className="w-3.5 h-3.5" />
                    {f.elevesPresents?.length ?? 0} élèves présents
                  </span>
                </div>
              </div>
            </div>
          ))}

          {formations.length === 0 && (
            <div className="card text-center py-12 text-dark-500">
              Aucune formation enregistrée pour ce centre.
            </div>
          )}
        </div>
      )}

      {/* Modal Ajout Formation */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card max-w-lg w-full border border-dark-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Saisir un module enseigné</h2>
              <button onClick={() => setShowAddModal(false)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddFormation} className="space-y-4">
              <div>
                <label className="label">Centre de formation</label>
                <select className="input-field" required value={selectedCentreId} onChange={e => handleCentreChange(e.target.value)}>
                  <option value="">Sélectionner le centre...</option>
                  {centres.map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Titre du module / Thème</label>
                <input type="text" required placeholder="Ex: Introduction au Lean Startup" className="input-field"
                  value={newFormation.titre} onChange={e => setNewFormation({ ...newFormation, titre: e.target.value })} />
              </div>
              <div>
                <label className="label">Description du contenu enseigné</label>
                <textarea rows={3} required placeholder="Détails du cours dispensé..." className="input-field"
                  value={newFormation.description} onChange={e => setNewFormation({ ...newFormation, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Durée (heures)</label>
                  <input type="number" step="0.5" required placeholder="Ex: 2" className="input-field"
                    value={newFormation.dureeHeures} onChange={e => setNewFormation({ ...newFormation, dureeHeures: e.target.value })} />
                </div>
                <div>
                  <label className="label">Date de la séance</label>
                  <input type="date" required className="input-field"
                    value={newFormation.date} onChange={e => setNewFormation({ ...newFormation, date: e.target.value })} />
                </div>
              </div>

              {/* Sélection des élèves présents */}
              <div>
                <label className="label">Élèves présents ({presents.length})</label>
                <div className="border border-dark-700 rounded-xl p-3 bg-dark-800 max-h-40 overflow-y-auto space-y-1.5">
                  {eleves.map(e => {
                    const isPresent = presents.includes(e.id);
                    return (
                      <div key={e.id} onClick={() => toggleStudentPresence(e.id)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          isPresent ? 'bg-primary-500/10 border border-primary-500/30 text-primary-400' : 'hover:bg-dark-700 text-dark-300'
                        }`}>
                        <span className="text-sm font-medium">{e.prenom} {e.nom}</span>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isPresent ? 'border-primary-500 bg-primary-500 text-white' : 'border-dark-600'
                        }`}>
                          {isPresent && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                  {eleves.length === 0 && (
                    <p className="text-xs text-dark-500 italic text-center py-4">Aucun élève dans ce centre.</p>
                  )}
                </div>
              </div>

              <button type="submit" className="btn-primary w-full justify-center">Enregistrer la séance</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
