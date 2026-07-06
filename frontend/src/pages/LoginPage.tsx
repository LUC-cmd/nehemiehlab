import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, motDePasse);
      navigate('/dashboard');
    } catch {
      setError('Email ou mot de passe incorrect. Vérifiez vos informations.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Panneau gauche — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 flex-col items-center justify-center p-12 overflow-hidden">
        {/* Décor */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djJoLTJ2LTJoMnptMC00aDJ2MmgtMnYtMnptLTQgNHYyaC0ydi0yaDJ6bTAtNGgydjJoLTJ2LTJ6bS00IDR2MmgtMnYtMmgyek0yOCAzMGgydjJoLTJ2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative text-center"
        >
          <img src="http://nehemiahlab.com/assets/img/logo.png" alt="Nehemiah Lab" className="h-16 mx-auto mb-8 drop-shadow-xl" />
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Plateforme de<br />Gestion Nehemiah Lab
          </h1>
          <p className="text-white/80 text-lg leading-relaxed max-w-sm mx-auto">
            Gérez vos centres, formateurs, élèves et formations depuis un seul tableau de bord.
          </p>

          {/* Badges rôles */}
          <div className="flex flex-wrap justify-center gap-3 mt-10">
            {['Directeur', 'Formateur', 'Coordinateur', 'Comptable'].map((role) => (
              <span key={role}
                className="px-4 py-2 bg-white/15 border border-white/25 rounded-full text-white text-sm font-medium backdrop-blur-sm">
                {role}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Panneau droit — Formulaire */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Retour au site */}
          <Link to="/"
            className="inline-flex items-center gap-2 text-dark-400 hover:text-white text-sm font-medium mb-8 transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Retour au site
          </Link>

          {/* Logo mobile */}
          <div className="lg:hidden mb-6">
            <img src="http://nehemiahlab.com/assets/img/logo.png" alt="Nehemiah Lab" className="h-10" />
          </div>

          <h2 className="text-3xl font-bold text-white mb-2">Connexion</h2>
          <p className="text-dark-400 mb-8">
            Connectez-vous à votre espace personnel Nehemiah Lab.
          </p>

          {/* Erreur */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="label">Adresse email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  id="login-email"
                  type="email"
                  required
                  placeholder="votre@email.com"
                  className="input-field pl-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="label">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="input-field pl-11 pr-11"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors">
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          {/* Inscription Formateur */}
          <div className="mt-8 p-5 bg-dark-800 border border-dark-700 rounded-xl">
            <p className="text-dark-300 text-sm text-center mb-3">
              Vous êtes formateur et vous n'avez pas encore de compte ?
            </p>
            <Link to="/inscription-formateur"
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-primary-500/40 text-primary-400 rounded-lg text-sm font-medium hover:bg-primary-500/10 transition-all">
              Créer mon compte Formateur
            </Link>
          </div>

          <p className="text-dark-500 text-xs text-center mt-6">
            Les comptes Comptable et Coordinateur sont créés par le Directeur.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
