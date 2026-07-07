import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/api';
import type { User } from '../../types';
import { Plus, X, GraduationCap, Mail, Phone, Shield, Search, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FormateursPage() {
  const { hasRole } = useAuth();
  const [formateurs, setFormateurs] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFormateur, setNewFormateur] = useState({ nom: '', prenom: '', email: '', telephone: '' });

  useEffect(() => {
    fetchFormateurs();
  }, []);

  const fetchFormateurs = async () => {
    setLoading(true);
    try {
      const res = await userService.getFormateurs();
      setFormateurs(res.data);
    } catch {
      toast.error('Erreur lors du chargement des formateurs.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await userService.preEnregistrerFormateur(newFormateur);
      toast.success('Formateur pré-enregistré avec succès. Il peut maintenant créer son compte.');
      setShowAddModal(false);
      setNewFormateur({ nom: '', prenom: '', email: '', telephone: '' });
      fetchFormateurs();
    } catch {
      toast.error('Erreur lors du pré-enregistrement.');
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
  const filtered = formateurs.filter(f => {
    const searchLower = search.toLowerCase();
    const matchName = `${f.prenom} ${f.nom}`.toLowerCase().includes(searchLower) || f.email.toLowerCase().includes(searchLower);
    const matchCentre = f.centres?.some(c => 
      c.nom.toLowerCase().includes(searchLower) || 
      (c.region && c.region.toLowerCase().includes(searchLower)) ||
      c.ville.toLowerCase().includes(searchLower)
    );
    return matchName || matchCentre;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Formateurs</h1>
          <p className="text-dark-400 mt-1">Liste des formateurs de la plateforme.</p>
        </div>
        {isDir && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Pré-enregistrer un formateur
          </button>
        )}
      </div>

      {/* Barre de recherche */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
        <input type="text" placeholder="Rechercher par nom, centre, région..." className="input-field pl-11"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((formateur) => (
          <div key={formateur.id} className="card border border-dark-700 hover:border-dark-600 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-bold">{formateur.prenom} {formateur.nom}</h3>
                <span className={`badge mt-1 ${formateur.actif ? 'badge-success' : 'badge-warning'}`}>
                  {formateur.actif ? 'Compte actif' : 'En attente d\'inscription'}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-dark-800 text-sm">
              <div className="flex items-center gap-2 text-dark-300">
                <Mail className="w-4 h-4 text-dark-400" />
                <span className="truncate">{formateur.email}</span>
              </div>
              <div className="flex items-center gap-2 text-dark-300">
                <Phone className="w-4 h-4 text-dark-400" />
                <span>{formateur.telephone || 'Non renseigné'}</span>
              </div>
              <div className="flex items-center gap-2 text-dark-300">
                <Shield className="w-4 h-4 text-dark-400" />
                <span className="text-xs uppercase tracking-wider font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">Formateur</span>
              </div>
            </div>

            {/* Centres affectés */}
            <div className="mt-4 pt-4 border-t border-dark-800">
              <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider block mb-2">Centres d'affectation</span>
              {formateur.centres && formateur.centres.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {formateur.centres.map(c => (
                    <div key={c.id} className="text-xs p-2 rounded-lg bg-dark-800 border border-dark-700">
                      <div className="font-semibold text-white">{c.nom}</div>
                      <div className="text-dark-400 mt-0.5">
                        {c.ville} {c.region ? `— ${c.region}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-dark-500 italic">Aucun centre assigné</p>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full card text-center py-12 text-dark-500">
            Aucun formateur trouvé.
          </div>
        )}
      </div>

      {/* Modal Pré-enregistrement */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full border border-dark-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Pré-enregistrer un formateur</h2>
              <button onClick={() => setShowAddModal(false)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handlePreRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Prénom</label>
                  <input type="text" required placeholder="Prénom" className="input-field"
                    value={newFormateur.prenom} onChange={e => setNewFormateur({ ...newFormateur, prenom: e.target.value })} />
                </div>
                <div>
                  <label className="label">Nom</label>
                  <input type="text" required placeholder="Nom" className="input-field"
                    value={newFormateur.nom} onChange={e => setNewFormateur({ ...newFormateur, nom: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Adresse email</label>
                <input type="email" required placeholder="formateur@email.com" className="input-field"
                  value={newFormateur.email} onChange={e => setNewFormateur({ ...newFormateur, email: e.target.value })} />
              </div>
              <div>
                <label className="label">Téléphone (optionnel)</label>
                <input type="tel" placeholder="+228 XX XX XX XX" className="input-field"
                  value={newFormateur.telephone} onChange={e => setNewFormateur({ ...newFormateur, telephone: e.target.value })} />
              </div>
              <p className="text-xs text-dark-400">
                En pré-enregistrant ce formateur, vous lui permettez de créer son propre compte formateur avec le même nom, prénom et email.
              </p>
              <button type="submit" className="btn-primary w-full justify-center">Pré-enregistrer</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
