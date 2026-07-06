import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/api';
import { User, Phone, Mail, Lock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilPage() {
  const { user, role } = useAuth();
  
  const [form, setForm] = useState({
    prenom: user?.prenom || '',
    nom: user?.nom || '',
    telephone: user?.telephone || '',
    motDePasse: '',
    confirmer: ''
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (form.motDePasse && form.motDePasse !== form.confirmer) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }
    
    setLoading(true);
    try {
      await userService.updateProfile(user.id, {
        nom: form.nom,
        prenom: form.prenom,
        telephone: form.telephone,
        motDePasse: form.motDePasse || undefined
      });
      
      // Update local storage user
      const updatedUser = { ...user, nom: form.nom, prenom: form.prenom, telephone: form.telephone };
      localStorage.setItem('nehemiah_user', JSON.stringify(updatedUser));
      
      toast.success('Profil mis à jour.');
      setForm(prev => ({ ...prev, motDePasse: '', confirmer: '' }));
    } catch {
      toast.error('Erreur lors de la mise à jour du profil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mon Profil</h1>
        <p className="text-dark-400 mt-1">Gérez vos informations personnelles et de connexion.</p>
      </div>

      <div className="card border border-dark-700">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4 pb-6 border-b border-dark-800">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 text-primary-400 flex items-center justify-center text-2xl font-bold">
              {user?.prenom?.[0]}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{user?.prenom} {user?.nom}</h3>
              <span className="badge border border-primary-500/30 bg-primary-500/10 text-primary-400 text-xs uppercase tracking-wider font-semibold">
                {role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Prénom</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input type="text" required className="input-field pl-10" value={form.prenom}
                  onChange={e => setForm({ ...form, prenom: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Nom</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input type="text" required className="input-field pl-10" value={form.nom}
                  onChange={e => setForm({ ...form, nom: e.target.value })} />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Adresse email (Non modifiable)</label>
            <div className="relative opacity-60">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input type="email" disabled className="input-field pl-10 cursor-not-allowed" value={user?.email || ''} />
            </div>
          </div>

          <div>
            <label className="label">Téléphone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input type="tel" className="input-field pl-10" value={form.telephone}
                onChange={e => setForm({ ...form, telephone: e.target.value })} />
            </div>
          </div>

          <div className="pt-4 border-t border-dark-800 space-y-4">
            <h4 className="text-white font-bold">Changer le mot de passe</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nouveau mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input type="password" placeholder="••••••••" className="input-field pl-10" value={form.motDePasse}
                    onChange={e => setForm({ ...form, motDePasse: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input type="password" placeholder="••••••••" className="input-field pl-10" value={form.confirmer}
                    onChange={e => setForm({ ...form, confirmer: e.target.value })} />
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-6">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Enregistrer les modifications
          </button>
        </form>
      </div>
    </div>
  );
}
