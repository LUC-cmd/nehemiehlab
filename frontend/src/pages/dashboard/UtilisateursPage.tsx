import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userService, centreService } from '../../services/api';
import { ROLE_LABELS, ROLES_CREABLES_PAR_DIRECTEUR, ROLE_ACCESS_SUMMARY } from '../../constants/roleAccess';
import type { User, Centre, Role } from '../../types';
import { centreLabel } from '../../utils/centreLabel';
import { ancienneteDate, formatAnciennete } from '../../utils/anciennete';
import { Plus, Search, Shield, UserCheck, UserX, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { cleanNameInput, cleanPhoneInput, FIRSTNAME_EXAMPLE, NAME_EXAMPLE } from '../../utils/formInputs';
import { PageLoadingSkeleton, TableSkeleton } from '../../components/ui/DashboardSkeletons';
import { useMinDelayLoading } from '../../hooks/useMinDelayLoading';
import UserAvatar from '../../components/ui/UserAvatar';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function UtilisateursPage() {
  const { hasRole } = useAuth();
  
  const [users, setUsers] = useState<User[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDesactiverId, setConfirmDesactiverId] = useState<number | null>(null);
  const [editAncienneteUser, setEditAncienneteUser] = useState<User | null>(null);
  const [ancienneteValue, setAncienneteValue] = useState('');
  const [savingAnciennete, setSavingAnciennete] = useState(false);
  const skeletonLoading = useMinDelayLoading(loading, 220);
  
  // Form states
  const [newAccount, setNewAccount] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    dateNaissance: '',
    lieuNaissance: '',
    adresse: '',
    role: 'RESPONSABLE_CLUSTER' as Role,
    centreId: '',
    cluster: '',
    motDePasse: '',
  });
  const [clusters, setClusters] = useState<string[]>([]);

  useEffect(() => {
    fetchUsers();
    if (hasRole('DIRECTEUR')) {
      centreService.getAll().then(r => setCentres(r.data)).catch(() => {});
      userService.getClusters().then(r => setClusters(r.data)).catch(() => {
        centreService.getAll().then((r) => {
          const distinct = [...new Set((r.data || []).map((c: Centre) => c.cluster).filter(Boolean))] as string[];
          setClusters(distinct.sort());
        }).catch(() => {});
      });
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
    const today = new Date().toISOString().split('T')[0];
    if (newAccount.dateNaissance && newAccount.dateNaissance > today) {
      toast.error('La date de naissance ne peut pas dépasser aujourd\'hui.');
      return;
    }
    if (newAccount.role === 'COORDINATEUR' && !newAccount.centreId) {
      toast.error('Sélectionnez le centre pour le coordinateur.');
      return;
    }
    if (newAccount.role === 'RESPONSABLE_CLUSTER' && !newAccount.cluster) {
      toast.error('Sélectionnez le cluster pour le responsable.');
      return;
    }
    try {
      const res = await userService.createCompte({
        ...newAccount,
        centreId: newAccount.centreId ? Number(newAccount.centreId) : undefined,
        cluster: newAccount.cluster || undefined,
        motDePasse: newAccount.motDePasse.trim() || undefined,
      });
      const pwd = res?.data?.motDePasseInitial;
      if (pwd) {
        toast.success(`Compte créé. Mot de passe initial: ${pwd}`);
      } else {
        toast.success('Compte créé avec succès.');
      }
      setShowAddModal(false);
      setNewAccount({
        nom: '', prenom: '', email: '', telephone: '', dateNaissance: '', lieuNaissance: '', adresse: '',
        role: 'RESPONSABLE_CLUSTER', centreId: '', cluster: '', motDePasse: '',
      });
      fetchUsers();
    } catch {
      toast.error('Erreur lors de la création du compte.');
    }
  };

  const handleDesactiver = (id: number) => {
    setConfirmDesactiverId(id);
  };

  const confirmDesactiver = async () => {
    if (confirmDesactiverId == null) return;
    const id = confirmDesactiverId;
    setConfirmDesactiverId(null);
    try {
      await userService.desactiver(id);
      toast.success('Compte désactivé.');
      fetchUsers();
    } catch {
      toast.error('Erreur lors de la désactivation.');
    }
  };

  const openEditAnciennete = (u: User) => {
    setEditAncienneteUser(u);
    setAncienneteValue(u.dateEntree || '');
  };

  const saveAnciennete = async () => {
    if (!editAncienneteUser) return;
    setSavingAnciennete(true);
    try {
      await userService.updateProfile(editAncienneteUser.id, { dateEntree: ancienneteValue });
      toast.success('Ancienneté mise à jour.');
      setEditAncienneteUser(null);
      fetchUsers();
    } catch {
      toast.error("Erreur lors de la mise à jour de l'ancienneté.");
    } finally {
      setSavingAnciennete(false);
    }
  };

  if (skeletonLoading && users.length === 0) {
    return <PageLoadingSkeleton showTable />;
  }

  const isDir = hasRole('DIRECTEUR');
  const filtered = users.filter(u => 
    `${u.prenom} ${u.nom}`.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role: Role) => {
    const colors: Record<Role, string> = {
      DIRECTEUR: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
      FORMATEUR: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
      COORDINATEUR: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
      RESPONSABLE_CLUSTER: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
      COMPTABLE: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
      STAFF_NEHEMIAH: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
      ANIMATEUR: 'border-teal-500/30 bg-teal-500/10 text-teal-400',
      PARENT: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
      BENEVOLE: 'border-lime-500/30 bg-lime-500/10 text-lime-400',
      PARTICIPANT: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
    };
    return (
      <span className={`badge border text-xs ${colors[role] || ''}`}>
        {ROLE_LABELS[role] || role}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestion des Utilisateurs</h1>
          <p className="text-dark-400 mt-1">
            Créez les comptes staff / CDEJ. Les parents se connectent avec le matricule (Espace parent).
          </p>
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

      {skeletonLoading ? (
        <TableSkeleton rows={6} />
      ) : (
        <>
          {isDir && (
            <div className="card border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <h2 className="text-sm font-semibold text-slate-900">Qui voit quoi (aperçu)</h2>
                <Link
                  to="/dashboard/permissions"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#004b57] hover:underline"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Configurer les permissions
                </Link>
              </div>
              <ul className="grid sm:grid-cols-2 gap-2 text-xs text-slate-600">
                {(Object.keys(ROLE_ACCESS_SUMMARY) as Role[]).map((r) => (
                  <li key={r} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                    <span className="font-semibold text-slate-800">{ROLE_LABELS[r]}</span>
                    <span className="block mt-0.5 leading-snug">{ROLE_ACCESS_SUMMARY[r]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nom &amp; Prénom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Ancienneté</th>
                {isDir && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <UserAvatar user={u} size="sm" />
                      <span className="text-white font-medium">{u.prenom} {u.nom}</span>
                    </div>
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
                  <td>
                    <span className="inline-flex items-center gap-1.5 text-xs text-dark-300">
                      {formatAnciennete(ancienneteDate(u))}
                      {isDir && (
                        <button
                          type="button"
                          onClick={() => openEditAnciennete(u)}
                          title="Modifier l'ancienneté"
                          className="text-dark-500 hover:text-[#5ED9FF] transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
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
                  <td colSpan={isDir ? 6 : 5} className="text-center py-8 text-dark-500">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Modal Créer Compte */}
      <Modal
        open={showAddModal}
        title="Nouveau compte"
        size="md"
        onClose={() => setShowAddModal(false)}
        footer={
          <>
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-ghost w-full sm:w-auto justify-center">
              Annuler
            </button>
            <button type="submit" form="create-account-form" className="btn-primary w-full sm:w-auto justify-center">
              Créer le compte
            </button>
          </>
        }
      >
        <form id="create-account-form" onSubmit={handleCreateAccount} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="label">Prénom</label>
              <input type="text" required placeholder={`Ex: ${FIRSTNAME_EXAMPLE}`} className="input-field"
                value={newAccount.prenom} onChange={e => setNewAccount({ ...newAccount, prenom: cleanNameInput(e.target.value) })} />
            </div>
            <div>
              <label className="label">Nom</label>
              <input type="text" required placeholder={`Ex: ${NAME_EXAMPLE}`} className="input-field"
                value={newAccount.nom} onChange={e => setNewAccount({ ...newAccount, nom: cleanNameInput(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="label">Adresse email</label>
            <input type="email" required placeholder="Ex: email@nehemiahlab.com" className="input-field"
              value={newAccount.email} onChange={e => setNewAccount({ ...newAccount, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Téléphone</label>
            <input
              type="text"
              placeholder="Ex: 99099509"
              className="input-field"
              inputMode="numeric"
              value={newAccount.telephone}
              onChange={e => setNewAccount({ ...newAccount, telephone: cleanPhoneInput(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="label">Date de naissance</label>
              <input
                type="date"
                className="input-field"
                max={new Date().toISOString().split('T')[0]}
                value={newAccount.dateNaissance}
                onChange={e => setNewAccount({ ...newAccount, dateNaissance: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Lieu de naissance</label>
              <input type="text" className="input-field"
                value={newAccount.lieuNaissance} onChange={e => setNewAccount({ ...newAccount, lieuNaissance: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Adresse</label>
            <input type="text" className="input-field"
              value={newAccount.adresse} onChange={e => setNewAccount({ ...newAccount, adresse: e.target.value })} />
          </div>
          <div>
            <label className="label">Rôle</label>
            <select className="input-field" value={newAccount.role} onChange={e => setNewAccount({ ...newAccount, role: e.target.value as Role })}>
              {ROLES_CREABLES_PAR_DIRECTEUR.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-dark-400">
              {ROLE_ACCESS_SUMMARY[newAccount.role]}
            </p>
            {newAccount.role === 'DIRECTEUR' && (
              <p className="mt-2 text-xs text-violet-300 bg-violet-500/10 border border-violet-500/25 rounded-lg px-3 py-2">
                Vous pouvez créer un autre directeur avec les mêmes droits de supervision et de diffusion d&apos;alertes.
              </p>
            )}
            <p className="mt-1 text-xs text-dark-500">
              Parent : pas de création ici — connexion via matricule (Espace parent).
            </p>
          </div>
          <div>
            <label className="label">Mot de passe initial (optionnel)</label>
            <input
              type="text"
              placeholder="Généré automatiquement si vide"
              className="input-field"
              value={newAccount.motDePasse}
              onChange={e => setNewAccount({ ...newAccount, motDePasse: e.target.value })}
            />
          </div>
          {newAccount.role === 'COORDINATEUR' && (
            <div>
              <label className="label">Centre assigné *</label>
              <select className="input-field" required value={newAccount.centreId} onChange={e => setNewAccount({ ...newAccount, centreId: e.target.value })}>
                <option value="">Sélectionner le centre...</option>
                {centres.filter(c => !c.coordinateur).map(c => (
                  <option key={c.id} value={c.id}>{centreLabel(c)} — {c.cluster || c.ville}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-dark-500">Un coordinateur ne gère qu&apos;un seul centre.</p>
            </div>
          )}
          {newAccount.role === 'RESPONSABLE_CLUSTER' && (
            <div>
              <label className="label">Cluster assigné *</label>
              <select className="input-field" required value={newAccount.cluster} onChange={e => setNewAccount({ ...newAccount, cluster: e.target.value })}>
                <option value="">Sélectionner le cluster...</option>
                {clusters.map((cl) => (
                  <option key={cl} value={cl}>{cl}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-dark-500">Le responsable voit tous les centres de ce cluster.</p>
            </div>
          )}
          <p className="text-xs text-slate-500">
            Si aucun mot de passe n&apos;est saisi, un mot de passe temporaire sécurisé sera généré
            et devra être communiqué au collaborateur.
          </p>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDesactiverId != null}
        title="Désactiver ce compte ?"
        message="Le compte ne pourra plus se connecter tant qu’il n’est pas réactivé."
        confirmLabel="Désactiver"
        danger
        onConfirm={confirmDesactiver}
        onCancel={() => setConfirmDesactiverId(null)}
      />

      <Modal
        open={editAncienneteUser != null}
        title="Modifier l'ancienneté"
        subtitle={editAncienneteUser ? `${editAncienneteUser.prenom} ${editAncienneteUser.nom}` : undefined}
        size="sm"
        onClose={() => setEditAncienneteUser(null)}
        footer={
          <>
            <button type="button" onClick={() => setEditAncienneteUser(null)} className="btn-ghost w-full sm:w-auto justify-center">
              Annuler
            </button>
            <button
              type="button"
              disabled={savingAnciennete}
              onClick={saveAnciennete}
              className="btn-primary w-full sm:w-auto justify-center disabled:opacity-60"
            >
              {savingAnciennete ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">Date d&apos;entrée</label>
            <input
              type="date"
              className="input-field"
              max={new Date().toISOString().split('T')[0]}
              value={ancienneteValue}
              onChange={(e) => setAncienneteValue(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Utilisée pour calculer l&apos;ancienneté affichée. Laissez vide pour revenir à la date de création
              du compte ({editAncienneteUser?.createdAt ? new Date(editAncienneteUser.createdAt).toLocaleDateString('fr-FR') : '—'}).
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
