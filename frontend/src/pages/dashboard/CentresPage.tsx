import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { centreService, userService } from '../../services/api';
import type { Centre, User } from '../../types';
import { Plus, X, Building2, UserPlus, Trash2, MapPin, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CentresPage() {
  const { hasRole } = useAuth();
  const [centres, setCentres] = useState<Centre[]>([]);
  const [formateurs, setFormateurs] = useState<User[]>([]);
  const [coordinateurs, setCoordinateurs] = useState<User[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCentre, setNewCentre] = useState({ nom: '', adresse: '', ville: '', region: '' });
  const [regionFilter, setRegionFilter] = useState('');
  
  const [selectedCentre, setSelectedCentre] = useState<Centre | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignFormateurId, setAssignFormateurId] = useState('');
  const [assignCoordinateurId, setAssignCoordinateurId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const isDirecteur = hasRole('DIRECTEUR');

      // Le formateur ne voit que ses propres centres
      const centresRes = isDirecteur
        ? await centreService.getAll()
        : await centreService.getMesCentres();
      setCentres(centresRes.data);

      // Seul le directeur a accès à la liste des formateurs/coordinateurs
      if (isDirecteur) {
        const [formateursRes, coordRes] = await Promise.all([
          userService.getFormateurs(),
          userService.getCoordinateurs()
        ]);
        setFormateurs(formateursRes.data);
        setCoordinateurs(coordRes.data);
      }
    } catch {
      toast.error('Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCentre = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await centreService.create(newCentre);
      toast.success('Centre créé avec succès.');
      setShowAddModal(false);
      setNewCentre({ nom: '', adresse: '', ville: '', region: '' });
      fetchData();
    } catch {
      toast.error('Erreur lors de la création du centre.');
    }
  };

  const handleDeleteCentre = async (id: number) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce centre ?')) return;
    try {
      await centreService.delete(id);
      toast.success('Centre supprimé.');
      fetchData();
    } catch {
      toast.error('Erreur lors de la suppression.');
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCentre) return;
    try {
      if (assignFormateurId) {
        await centreService.assignerFormateur(selectedCentre.id, Number(assignFormateurId));
        toast.success('Formateur assigné.');
      }
      if (assignCoordinateurId) {
        await centreService.assignerCoordinateur(selectedCentre.id, Number(assignCoordinateurId));
        toast.success('Coordinateur assigné.');
      }
      setShowAssignModal(false);
      setAssignFormateurId('');
      setAssignCoordinateurId('');
      fetchData();
    } catch {
      toast.error('Erreur lors des affectations.');
    }
  };

  const handleRemoveFormateur = async (centreId: number, formateurId: number) => {
    if (!window.confirm('Retirer ce formateur du centre ?')) return;
    try {
      await centreService.retirerFormateur(centreId, formateurId);
      toast.success('Formateur retiré.');
      fetchData();
    } catch {
      toast.error('Erreur lors du retrait.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  const isDir = hasRole('DIRECTEUR');
  
  const filteredCentres = regionFilter ? centres.filter(c => c.region === regionFilter) : centres;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isDir ? 'Centres de formation' : 'Mes Centres'}
          </h1>
          <p className="text-dark-400 mt-1">
            {isDir
              ? 'Gérez les centres de Nehemiah Lab, leurs formateurs et coordinateurs.'
              : 'Les centres auxquels vous êtes affecté.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={regionFilter} 
            onChange={e => setRegionFilter(e.target.value)}
            className="input-field py-2"
          >
            <option value="">Toutes les régions</option>
            <option value="Maritime">Maritime</option>
            <option value="Plateaux">Plateaux</option>
            <option value="Centrale">Centrale</option>
            <option value="Kara">Kara</option>
            <option value="Savanes">Savanes</option>
          </select>
          {isDir && (
            <button onClick={() => setShowAddModal(true)} className="btn-primary py-2">
              <Plus className="w-4 h-4" />
              Nouveau centre
            </button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCentres.map((centre) => (
          <div key={centre.id} className="card border border-dark-700 hover:border-dark-600 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400">
                  <Building2 className="w-6 h-6" />
                </div>
                {isDir && (
                  <button onClick={() => handleDeleteCentre(centre.id)} className="text-dark-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-dark-800 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <h3 className="text-lg font-bold text-white mb-1">{centre.nom}</h3>
              {centre.region && (
                <span className="inline-block px-2 py-0.5 mb-2 text-xs font-medium bg-dark-800 border border-dark-700 rounded-lg text-primary-400">
                  Région {centre.region}
                </span>
              )}
              <p className="text-dark-400 text-sm flex items-center gap-1 mb-4">
                <MapPin className="w-3.5 h-3.5" />
                {centre.adresse}, {centre.ville}
              </p>

              <div className="space-y-3 pt-3 border-t border-dark-800">
                <div>
                  <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Coordinateur</span>
                  <p className="text-sm text-white mt-0.5">
                    {centre.coordinateur ? `${centre.coordinateur.prenom} ${centre.coordinateur.nom}` : 'Non assigné'}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Formateurs ({centre.formateurs?.length ?? 0})</span>
                  {centre.formateurs && centre.formateurs.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {centre.formateurs.map((f) => (
                        <span key={f.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-dark-800 border border-dark-700 text-xs text-dark-200">
                          {f.prenom} {f.nom}
                          {isDir && (
                            <button onClick={() => handleRemoveFormateur(centre.id, f.id)} className="text-dark-400 hover:text-red-400 ml-1">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-dark-500 mt-0.5 italic">Aucun formateur</p>
                  )}
                </div>
              </div>
            </div>

            {isDir && (
              <div className="mt-6 pt-4 border-t border-dark-800">
                <button
                  onClick={() => { setSelectedCentre(centre); setShowAssignModal(true); }}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-dark-700 hover:border-primary-500/40 text-dark-300 hover:text-primary-400 rounded-xl text-sm font-medium transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  Assigner des membres
                </button>
              </div>
            )}
          </div>
        ))}

        {filteredCentres.length === 0 && (
          <div className="col-span-full card text-center py-12 text-dark-500 border border-dashed border-dark-700">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>{isDir ? 'Aucun centre créé pour le moment.' : "Vous n'êtes affecté à aucun centre. Contactez le directeur."}</p>
          </div>
        )}
      </div>

      {/* Modal Ajout */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full border border-dark-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Nouveau centre</h2>
              <button onClick={() => setShowAddModal(false)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddCentre} className="space-y-4">
              <div>
                <label className="label">Nom du centre</label>
                <input type="text" required placeholder="Ex: Centre de Lomé" className="input-field"
                  value={newCentre.nom} onChange={e => setNewCentre({ ...newCentre, nom: e.target.value })} />
              </div>
              <div>
                <label className="label">Adresse</label>
                <input type="text" required placeholder="Ex: Quartier Adidogomé" className="input-field"
                  value={newCentre.adresse} onChange={e => setNewCentre({ ...newCentre, adresse: e.target.value })} />
              </div>
              <div>
                <label className="label">Ville</label>
                <input type="text" required placeholder="Ex: Lomé" className="input-field"
                  value={newCentre.ville} onChange={e => setNewCentre({ ...newCentre, ville: e.target.value })} />
              </div>
              <div>
                <label className="label">Région du Togo</label>
                <select className="input-field" required value={newCentre.region} onChange={e => setNewCentre({ ...newCentre, region: e.target.value })}>
                  <option value="">Sélectionner une région...</option>
                  <option value="Maritime">Maritime</option>
                  <option value="Plateaux">Plateaux</option>
                  <option value="Centrale">Centrale</option>
                  <option value="Kara">Kara</option>
                  <option value="Savanes">Savanes</option>
                </select>
              </div>
              <button type="submit" className="btn-primary w-full justify-center">Créer le centre</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Assigner */}
      {showAssignModal && selectedCentre && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full border border-dark-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Assigner à {selectedCentre.nom}</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="label">Coordinateur du centre</label>
                <select className="input-field" value={assignCoordinateurId} onChange={e => setAssignCoordinateurId(e.target.value)}>
                  <option value="">Sélectionner un coordinateur...</option>
                  {coordinateurs.map(c => (
                    <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Ajouter un formateur</label>
                <select className="input-field" value={assignFormateurId} onChange={e => setAssignFormateurId(e.target.value)}>
                  <option value="">Sélectionner un formateur...</option>
                  {formateurs.map(f => (
                    <option key={f.id} value={f.id}>{f.prenom} {f.nom}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary w-full justify-center">Enregistrer les affectations</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
