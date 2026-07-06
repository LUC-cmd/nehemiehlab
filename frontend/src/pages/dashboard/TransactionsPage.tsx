import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { transactionService, userService } from '../../services/api';
import type { Transaction, User } from '../../types';
import { Plus, X, CreditCard, Calendar, User as UserIcon, Check, XSquare, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TransactionsPage() {
  const { role, hasRole } = useAuth();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [formateurs, setFormateurs] = useState<User[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form states
  const [newTx, setNewTx] = useState({ formateurId: '', montant: '', type: 'DEPLACEMENT', description: '' });

  useEffect(() => {
    fetchTransactions();
    if (hasRole('COMPTABLE', 'DIRECTEUR')) {
      userService.getFormateurs().then(r => setFormateurs(r.data)).catch(() => {});
    }
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let res;
      if (hasRole('FORMATEUR')) {
        res = await transactionService.getMesTransactions();
      } else {
        res = await transactionService.getAll();
      }
      setTransactions(res.data);
    } catch {
      toast.error('Erreur lors du chargement des transactions.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await transactionService.create({
        formateurId: Number(newTx.formateurId),
        montant: Number(newTx.montant),
        type: newTx.type,
        description: newTx.description
      });
      toast.success('Transaction créée avec succès.');
      setShowAddModal(false);
      setNewTx({ formateurId: '', montant: '', type: 'DEPLACEMENT', description: '' });
      fetchTransactions();
    } catch {
      toast.error('Erreur lors de la création de la transaction.');
    }
  };

  const handleValider = async (id: number) => {
    if (!window.confirm('Valider cette transaction ?')) return;
    try {
      await transactionService.valider(id);
      toast.success('Paiement validé par le formateur.');
      fetchTransactions();
    } catch {
      toast.error('Erreur lors de la validation.');
    }
  };

  const handleRefuser = async (id: number) => {
    if (!window.confirm('Refuser cette transaction ?')) return;
    try {
      await transactionService.refuser(id);
      toast.error('Transaction refusée.');
      fetchTransactions();
    } catch {
      toast.error('Erreur lors du refus.');
    }
  };

  const isComptable = hasRole('COMPTABLE');
  const isFormateur = hasRole('FORMATEUR');

  const getStatusBadge = (status: Transaction['statut']) => {
    switch (status) {
      case 'VALIDEE':
        return <span className="badge badge-success flex items-center gap-1"><Check className="w-3 h-3" /> Validée</span>;
      case 'REFUSEE':
        return <span className="badge badge-danger flex items-center gap-1"><XSquare className="w-3 h-3" /> Refusée</span>;
      default:
        return <span className="badge badge-warning flex items-center gap-1"><Clock className="w-3 h-3" /> En attente</span>;
    }
  };

  const getTypeLabel = (type: Transaction['type']) => {
    const labels: Record<string, string> = {
      DEPLACEMENT: 'Déplacement',
      HONORAIRES: 'Honoraires',
      FRAIS_PEDAGOGIQUES: 'Frais pédagogiques',
      MATERIEL: 'Matériel',
      AUTRE: 'Autre',
    };
    return labels[type] || type;
  };

  if (loading && transactions.length === 0) {
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
          <h1 className="text-2xl font-bold text-white">Transactions &amp; Paiements</h1>
          <p className="text-dark-400 mt-1">
            {isFormateur ? 'Consultez et validez vos transactions reçues.' : 'Suivi comptable des paiements aux formateurs.'}
          </p>
        </div>
        {isComptable && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Créer une transaction
          </button>
        )}
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
                <th>Date</th>
                <th>Bénéficiaire</th>
                <th>Type</th>
                <th>Description</th>
                <th>Montant</th>
                <th>Statut</th>
                {isFormateur && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>
                    <span className="flex items-center gap-1.5 text-dark-200">
                      <Calendar className="w-3.5 h-3.5 text-dark-400" />
                      {new Date(tx.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </td>
                  <td>
                    <span className="flex items-center gap-1.5 text-white font-medium">
                      <UserIcon className="w-3.5 h-3.5 text-dark-400" />
                      {tx.formateur?.prenom} {tx.formateur?.nom}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs uppercase tracking-wider font-semibold bg-dark-800 text-dark-300 px-2 py-1 rounded">
                      {getTypeLabel(tx.type)}
                    </span>
                  </td>
                  <td className="text-dark-300 max-w-xs truncate">{tx.description}</td>
                  <td className="text-white font-bold">{tx.montant.toLocaleString('fr-FR')} FCFA</td>
                  <td>{getStatusBadge(tx.statut)}</td>
                  {isFormateur && (
                    <td>
                      {tx.statut === 'EN_ATTENTE' ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleValider(tx.id)}
                            className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors" title="Valider">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleRefuser(tx.id)}
                            className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Refuser">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-dark-500 italic">-</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={isFormateur ? 7 : 6} className="text-center py-8 text-dark-500">
                    Aucune transaction enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Ajout Transaction */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full border border-dark-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Créer une transaction</h2>
              <button onClick={() => setShowAddModal(false)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateTx} className="space-y-4">
              <div>
                <label className="label">Formateur bénéficiaire</label>
                <select className="input-field" required value={newTx.formateurId} onChange={e => setNewTx({ ...newTx, formateurId: e.target.value })}>
                  <option value="">Sélectionner le formateur...</option>
                  {formateurs.map(f => (
                    <option key={f.id} value={f.id}>{f.prenom} {f.nom}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Montant (FCFA)</label>
                  <input type="number" required placeholder="Ex: 25000" className="input-field"
                    value={newTx.montant} onChange={e => setNewTx({ ...newTx, montant: e.target.value })} />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input-field" value={newTx.type} onChange={e => setNewTx({ ...newTx, type: e.target.value })}>
                    <option value="DEPLACEMENT">Déplacement</option>
                    <option value="HONORAIRES">Honoraires</option>
                    <option value="FRAIS_PEDAGOGIQUES">Frais pédagogiques</option>
                    <option value="MATERIEL">Matériel</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Description / Justification</label>
                <textarea rows={3} required placeholder="Détails de la transaction..." className="input-field"
                  value={newTx.description} onChange={e => setNewTx({ ...newTx, description: e.target.value })} />
              </div>
              <button type="submit" className="btn-primary w-full justify-center">Créer la transaction</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
