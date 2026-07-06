import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { eleveService, centreService } from '../../services/api';
import type { Eleve, Centre } from '../../types';
import { Plus, X, Search, Clock, MessageSquare, AlertTriangle, Play, Square, Award, Edit2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ElevesPage() {
  const { hasRole, user } = useAuth();
  
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [selectedCentreId, setSelectedCentreId] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showSignalModal, setShowSignalModal] = useState(false);
  
  // Selected eleve for action
  const [activeEleve, setActiveEleve] = useState<Eleve | null>(null);
  
  // Form states
  const [newEleve, setNewEleve] = useState({ nom: '', prenom: '', age: '', sexe: 'M' as 'M' | 'F', classe: '', centreId: '', dateDebutFormation: new Date().toISOString().split('T')[0] });
  const [projectForm, setProjectForm] = useState({ nom: '', description: '', evolution: 0 });
  const [commentText, setCommentText] = useState('');
  const [signalText, setSignalText] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCentreId) {
      fetchEleves(Number(selectedCentreId));
    }
  }, [selectedCentreId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      let centresList: Centre[] = [];
      if (hasRole('DIRECTEUR')) {
        const res = await centreService.getAll();
        centresList = res.data;
      } else if (hasRole('FORMATEUR')) {
        const res = await centreService.getMesCentres();
        centresList = res.data;
      } else if (hasRole('COORDINATEUR')) {
        // Un coordinateur est rattaché à son centre
        const res = await centreService.getMesCentres();
        centresList = res.data;
      }
      setCentres(centresList);
      if (centresList.length > 0) {
        setSelectedCentreId(String(centresList[0].id));
      } else {
        setLoading(false);
      }
    } catch {
      toast.error('Erreur lors du chargement des données.');
      setLoading(false);
    }
  };

  const fetchEleves = async (centreId: number) => {
    setLoading(true);
    try {
      const res = await eleveService.getByCentre(centreId);
      setEleves(res.data);
    } catch {
      toast.error('Erreur lors du chargement des élèves.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEleve = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await eleveService.create({
        ...newEleve,
        age: Number(newEleve.age),
        centreId: Number(newEleve.centreId || selectedCentreId)
      });
      toast.success('Élève inscrit avec succès.');
      setShowAddModal(false);
      setNewEleve({ nom: '', prenom: '', age: '', sexe: 'M', classe: '', centreId: '', dateDebutFormation: new Date().toISOString().split('T')[0] });
      fetchEleves(Number(selectedCentreId));
    } catch {
      toast.error('Erreur lors de l\'inscription de l\'élève.');
    }
  };

  const handleStartPresence = async (id: number) => {
    try {
      await eleveService.demarrerSession(id);
      toast.success('Session de présence démarrée.');
      fetchEleves(Number(selectedCentreId));
    } catch {
      toast.error('Erreur lors du démarrage de la session.');
    }
  };

  const handleEndPresence = async (id: number) => {
    try {
      await eleveService.terminerSession(id);
      toast.success('Session de présence terminée.');
      fetchEleves(Number(selectedCentreId));
    } catch {
      toast.error('Erreur lors de la clôture de la session.');
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEleve) return;
    try {
      await eleveService.updateProjet(activeEleve.id, projectForm);
      toast.success('Projet mis à jour.');
      setShowProjectModal(false);
      fetchEleves(Number(selectedCentreId));
    } catch {
      toast.error('Erreur lors de la mise à jour du projet.');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEleve) return;
    try {
      await eleveService.addCommentaire(activeEleve.id, commentText);
      toast.success('Commentaire ajouté.');
      setShowCommentModal(false);
      setCommentText('');
      fetchEleves(Number(selectedCentreId));
    } catch {
      toast.error('Erreur lors de l\'ajout du commentaire.');
    }
  };

  const handleAddSignalement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEleve) return;
    try {
      await eleveService.signalerEleve(activeEleve.id, signalText);
      toast.success('Signalement envoyé au Directeur et au Coordinateur.');
      setShowSignalModal(false);
      setSignalText('');
      fetchEleves(Number(selectedCentreId));
    } catch {
      toast.error('Erreur lors de l\'envoi du signalement.');
    }
  };

  const isFormateur = hasRole('FORMATEUR');
  const isDir = hasRole('DIRECTEUR');
  const canEdit = isDir || isFormateur;

  const filtered = eleves.filter(e => 
    `${e.prenom} ${e.nom}`.toLowerCase().includes(search.toLowerCase()) ||
    e.classe.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && centres.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Élèves / Apprenants</h1>
          <p className="text-dark-400 mt-1">Suivi quotidien des apprenants, présences et projets.</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Inscrire un élève
          </button>
        )}
      </div>

      {/* Filtre par Centre */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-sm text-dark-400 whitespace-nowrap">Centre :</label>
          <select className="input-field py-2 text-sm" value={selectedCentreId} onChange={e => setSelectedCentreId(e.target.value)}>
            {centres.map(c => (
              <option key={c.id} value={c.id}>{c.nom} ({c.ville})</option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input type="text" placeholder="Rechercher un élève..." className="input-field pl-11 py-2 text-sm"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((eleve) => {
            const hasActiveSession = eleve.presences?.some(p => p.sessionActive);
            return (
              <div key={eleve.id} className="card border border-dark-700 hover:border-dark-600 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-white font-bold text-lg">{eleve.prenom} {eleve.nom}</h3>
                      <p className="text-dark-400 text-xs mt-0.5">{eleve.age} ans • {eleve.sexe === 'M' ? 'Masculin' : 'Féminin'} • {eleve.classe}</p>
                    </div>
                    <span className="badge-primary text-xs">{eleve.totalHeures ? `${eleve.totalHeures.toFixed(1)} hrs` : '0 hr'}</span>
                  </div>

                  {/* Projet */}
                  {eleve.projet ? (
                    <div className="bg-dark-800 border border-dark-700 rounded-xl p-3.5 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-primary-400 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" />
                          Projet : {eleve.projet.nom}
                        </span>
                        <span className="text-xs text-dark-300 font-bold">{eleve.projet.evolution}%</span>
                      </div>
                      <p className="text-xs text-dark-400 line-clamp-2 mb-2">{eleve.projet.description}</p>
                      <div className="w-full bg-dark-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary-500 h-full rounded-full" style={{ width: `${eleve.projet.evolution}%` }} />
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-dark-700 rounded-xl p-3 mb-4 text-center">
                      <p className="text-xs text-dark-500 italic">Aucun projet en cours</p>
                    </div>
                  )}

                  {/* Boutons d'actions rapides */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-dark-800">
                    <button onClick={() => { setActiveEleve(eleve); setCommentText(''); setShowCommentModal(true); }}
                      className="btn-ghost p-1.5 text-xs flex items-center gap-1 hover:bg-dark-800 rounded-lg">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Commenter
                    </button>
                    <button onClick={() => { setActiveEleve(eleve); setSignalText(''); setShowSignalModal(true); }}
                      className="btn-ghost p-1.5 text-xs text-red-400 hover:text-red-300 flex items-center gap-1 hover:bg-red-500/10 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Signaler
                    </button>
                    {canEdit && (
                      <button onClick={() => {
                        setActiveEleve(eleve);
                        setProjectForm(eleve.projet || { nom: '', description: '', evolution: 0 });
                        setShowProjectModal(true);
                      }}
                        className="btn-ghost p-1.5 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:bg-blue-500/10 rounded-lg">
                        <Edit2 className="w-3.5 h-3.5" />
                        Projet
                      </button>
                    )}
                  </div>
                </div>

                {/* Présences (Boutons Formateur uniquement) */}
                {isFormateur && (
                  <div className="mt-6 pt-4 border-t border-dark-800 flex gap-2">
                    {hasActiveSession ? (
                      <button onClick={() => handleEndPresence(eleve.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-xs transition-colors">
                        <Square className="w-3.5 h-3.5" />
                        FIN DE SESSION
                      </button>
                    ) : (
                      <button onClick={() => handleStartPresence(eleve.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-xs transition-colors">
                        <Play className="w-3.5 h-3.5 fill-current" />
                        DÉBUTER SESSION
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full card text-center py-12 text-dark-500">
              Aucun élève trouvé.
            </div>
          )}
        </div>
      )}

      {/* Modal Inscription Élève */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full border border-dark-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Inscrire un élève</h2>
              <button onClick={() => setShowAddModal(false)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddEleve} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Nom</label>
                  <input type="text" required placeholder="Nom" className="input-field"
                    value={newEleve.nom} onChange={e => setNewEleve({ ...newEleve, nom: e.target.value })} />
                </div>
                <div>
                  <label className="label">Prénom</label>
                  <input type="text" required placeholder="Prénom" className="input-field"
                    value={newEleve.prenom} onChange={e => setNewEleve({ ...newEleve, prenom: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Âge</label>
                  <input type="number" required placeholder="Âge" className="input-field"
                    value={newEleve.age} onChange={e => setNewEleve({ ...newEleve, age: e.target.value })} />
                </div>
                <div>
                  <label className="label">Sexe</label>
                  <select className="input-field" value={newEleve.sexe} onChange={e => setNewEleve({ ...newEleve, sexe: e.target.value as 'M' | 'F' })}>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Classe d'étude</label>
                <input type="text" required placeholder="Ex: Terminale D, 3ème, etc." className="input-field"
                  value={newEleve.classe} onChange={e => setNewEleve({ ...newEleve, classe: e.target.value })} />
              </div>
              <div>
                <label className="label">Date de début de formation</label>
                <input type="date" required className="input-field"
                  value={newEleve.dateDebutFormation} onChange={e => setNewEleve({ ...newEleve, dateDebutFormation: e.target.value })} />
              </div>
              <button type="submit" className="btn-primary w-full justify-center">Inscrire l'élève</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Projet */}
      {showProjectModal && activeEleve && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full border border-dark-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Projet de {activeEleve.prenom}</h2>
              <button onClick={() => setShowProjectModal(false)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpdateProject} className="space-y-4">
              <div>
                <label className="label">Nom du projet</label>
                <input type="text" required placeholder="Nom du projet" className="input-field"
                  value={projectForm.nom} onChange={e => setProjectForm({ ...projectForm, nom: e.target.value })} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea rows={3} required placeholder="Description du projet..." className="input-field"
                  value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} />
              </div>
              <div>
                <label className="label">Évolution (%) : {projectForm.evolution}%</label>
                <input type="range" min="0" max="100" step="5" className="w-full accent-primary-500"
                  value={projectForm.evolution} onChange={e => setProjectForm({ ...projectForm, evolution: Number(e.target.value) })} />
              </div>
              <button type="submit" className="btn-primary w-full justify-center">Enregistrer le projet</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Commentaire */}
      {showCommentModal && activeEleve && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full border border-dark-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Ajouter un commentaire</h2>
              <button onClick={() => setShowCommentModal(false)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddComment} className="space-y-4">
              <div>
                <label className="label">Observations sur {activeEleve.prenom}</label>
                <textarea rows={4} required placeholder="Saisir vos remarques..." className="input-field"
                  value={commentText} onChange={e => setCommentText(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary w-full justify-center">Ajouter</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Signalement */}
      {showSignalModal && activeEleve && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full border border-dark-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Signaler un incident
              </h2>
              <button onClick={() => setShowSignalModal(false)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddSignalement} className="space-y-4">
              <div>
                <label className="label">Décrire l'incident ou le comportement</label>
                <textarea rows={4} required placeholder="Soyez précis dans votre description..." className="input-field border-red-500/30 focus:border-red-500"
                  value={signalText} onChange={e => setSignalText(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary w-full justify-center bg-red-500 hover:bg-red-600 shadow-red-500/25 hover:shadow-red-500/40">
                Envoyer le signalement
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
