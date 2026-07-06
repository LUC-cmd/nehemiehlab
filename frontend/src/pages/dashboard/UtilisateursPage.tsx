import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userService, centreService } from '../../services/api';
import type { User, Centre, Role } from '../../types';
import { Plus, X, Search, Shield, UserCheck, UserX, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UtilisateursPage() {
  const { hasRole } = useAuth();
  
  const [users, setUsers] = useState<User[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form states
  const [newAccount, setNewAccount] = useState({ nom: '', prenom: '', email: '', role: 'COORDINATEUR' as Role, centreId: '' });

  useEffect(() => {
    fetchUsers();
    if (hasRole('DIRECTEUR')) {
      centreService.getAll().then(r => setCentres(r.data)).catch(() => {});
    }
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await userService.getAll();
      setUsers(res.data);
    } catch {
      toast.error('Erreur lors du chargement des utilisateurs.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await userService.createCompte({
        ...newAccount,
        centreId: newAccount.centreId ? Number(newAccount.centreId) : undefined
      });
      toast.success('Compte créé avec succès.');
      setShowAddModal(false);
      setNewAccount({ nom: '', prenom: '', email: '', role: 'COORDINATEUR', centreId: '' });
      fetchUsers();
    } catch {
      toast.error('Erreur lors de la création du compte.');
    }
  };

  const handleDesactiver = async (id: number) => {
    if (!window.confirm('Voulez-vous vraiment désactiver ce compte ?')) return;
    try {
      await userService.desactiver(id);
      toast.success('Compte désactivé.');
      fetchUsers();
    } catch {
      toast.error('Erreur lors de la désactivation.');
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  const isDir = hasRole('DIRECTEUR');
  const filtered = users.filter(u => 
    `${u.prenom} ${u.nom}`.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role: Role) => {
    const badges: Record<Role, React.ReactNode> = {
      DIRECTEUR: <span className="badge border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs">Directeur</span>,
      FORMATEUR: <span className="badge border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs">Formateur</span>,
      COORDINATEUR: <span className="badge border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs">Coordinateur</span>,
      COMPTABLE: <span className="badge border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs">Comptable</span>,
    };
    return badges[role] || role;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestion des Utilisateurs</h1>
          <p className="text-dark-400 mt-1">Créez et gérez les comptes d'accès pour les coordinateurs et comptables.</p>
        </div>
        {isDir && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Nouveau compte
          </button>
        )}
      </div>

      {/* Barre de recherche */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
        <input type="text" placeholder="Rechercher un utilisateur..." className="input-field pl-11"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nom &amp; Prénom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Statut</th>
                {isDir && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span className="text-white font-medium">{u.prenom} {u.nom}</span>
                  </td>
                  <td className="text-dark-300">{u.email}</td>
                  <td>{getRoleBadge(u.role)}</td>
                  <td>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      u.actif ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'
                    }`}>
                      {u.actif ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>
                  {isDir && (
                    <td className="text-right">
                      {u.actif && u.role !== 'DIRECTEUR' ? (
                        <button onClick={() => handleDesactiver(u.id)}
                          className="btn-ghost p-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg inline-flex items-center gap-1">
                          <UserX className="w-3.5 h-3.5" />
                          Désactiver
                        </button>
                      ) : (
                        <span className="text-xs text-dark-500 italic">-</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isDir ? 5 : 4} className="text-center py-8 text-dark-500">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Créer Compte */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full border border-dark-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Nouveau compte</h2>
              <button onClick={() => setShowAddModal(false)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Prénom</label>
                  <input type="text" required placeholder="Prénom" className="input-field"
                    value={newAccount.prenom} onChange={e => setNewAccount({ ...newAccount, prenom: e.target.value })} />
                </div>
                <div>
                  <label className="label">Nom</label>
                  <input type="text" required placeholder="Nom" className="input-field"
                    value={newAccount.nom} onChange={e => setNewAccount({ ...newAccount, nom: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Adresse email</label>
                <input type="email" required placeholder="Ex: email@nehemiahlab.com" className="input-field"
                  value={newAccount.email} onChange={e => setNewAccount({ ...newAccount, email: e.target.value })} />
              </div>
              <div>
                <label className="label">Rôle</label>
                <select className="input-field" value={newAccount.role} onChange={e => setNewAccount({ ...newAccount, role: e.target.value as Role })}>
                  <option value="COORDINATEUR">Coordinateur</option>
                  <option value="COMPTABLE">Comptable</option>
                </select>
              </div>
              {newAccount.role === 'COORDINATEUR' && (
                <div>
                  <label className="label">Affecter au centre (Optionnel)</label>
                  <select className="input-field" value={newAccount.centreId} onChange={e => setNewAccount({ ...newAccount, centreId: e.target.value })}>
                    <option value="">Sélectionner le centre...</option>
                    {centres.map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>
              )}
              <p className="text-xs text-dark-400">
                Note : Pour les formateurs, utilisez le menu de pré-enregistrement dans la page "Formateurs".
              </p>
              <button type="submit" className="btn-primary w-full justify-center">Créer le compte</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
