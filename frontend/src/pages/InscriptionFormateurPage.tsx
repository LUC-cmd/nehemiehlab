import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, User, Phone, Loader2, CheckCircle } from 'lucide-react';
import { authService } from '../services/api';
import toast from 'react-hot-toast';

export default function InscriptionFormateurPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', telephone: '', motDePasse: '', confirmer: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.motDePasse !== form.confirmer) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (form.motDePasse.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setLoading(true);
    try {
      await authService.inscriptionFormateur({
        nom: form.nom, prenom: form.prenom,
        email: form.email, motDePasse: form.motDePasse,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'Votre nom/prénom n\'est pas encore enregistré par le Directeur, ou cet email est déjà utilisé.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="card max-w-md w-full text-center py-12">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Compte créé avec succès !</h2>
          <p className="text-dark-300 mb-8">
            Votre compte formateur a été créé. Vous pouvez maintenant vous connecter avec votre email et mot de passe.
          </p>
          <button onClick={() => navigate('/connexion')} className="btn-primary w-full justify-center">
            Se connecter maintenant
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg">
        <Link to="/connexion" className="inline-flex items-center gap-2 text-dark-400 hover:text-white text-sm mb-8 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Retour à la connexion
        </Link>

        <div className="card">
          <div className="text-center mb-8">
            <img src="http://nehemiahlab.com/assets/img/logo.png" alt="Nehemiah Lab" className="h-10 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Créer mon compte Formateur</h2>
            <p className="text-dark-400 text-sm">
              Votre nom et prénom doivent avoir été pré-enregistrés par le Directeur.
            </p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Prénom</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input type="text" required placeholder="Prénom" className="input-field pl-10 text-sm"
                    value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Nom</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input type="text" required placeholder="Nom de famille" className="input-field pl-10 text-sm"
                    value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
                </div>
              </div>
            </div>

            <div>
              <label className="label">Adresse email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input type="email" required placeholder="votre@email.com" className="input-field pl-10 text-sm"
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="label">Téléphone (optionnel)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input type="tel" placeholder="+228 XX XX XX XX" className="input-field pl-10 text-sm"
                  value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="label">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input type={showPass ? 'text' : 'password'} required placeholder="Min. 8 caractères"
                  className="input-field pl-10 pr-10 text-sm"
                  value={form.motDePasse} onChange={(e) => setForm({ ...form, motDePasse: e.target.value })} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Confirmer le mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input type={showPass ? 'text' : 'password'} required placeholder="Répétez le mot de passe"
                  className="input-field pl-10 text-sm"
                  value={form.confirmer} onChange={(e) => setForm({ ...form, confirmer: e.target.value })} />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-3 mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Création en cours...</> : 'Créer mon compte'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
