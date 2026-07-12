import React, { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AppLoader, { ButtonSpinner } from '../components/ui/AppLoader';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  CheckCircle,
  Calendar,
  MapPin,
  FileImage,
} from 'lucide-react';
import { authService } from '../services/api';
import { useInscriptionFormateursOuverte } from '../hooks/useInscriptionFormateursOuverte';
import AuthShell from '../components/auth/AuthShell';
import EmailDeliveryHint from '../components/ui/EmailDeliveryHint';
import MediaDropZone from '../components/ui/MediaDropZone';
import {
  cleanNameInput,
  cleanPhoneInput,
  FIRSTNAME_EXAMPLE,
  NAME_EXAMPLE,
  PHONE_EXAMPLE,
} from '../utils/formInputs';
import { BRAND_TEAL, BRAND_TEAL_DEEP, BRAND_TEAL_LIGHT } from '../constants/branding';

import { isValidEmail, normalizeEmail } from '../utils/email';

type FieldKey =
  | 'prenom'
  | 'nom'
  | 'email'
  | 'telephone'
  | 'dateNaissance'
  | 'lieuNaissance'
  | 'motDePasse'
  | 'confirmer';

export default function InscriptionFormateurPage() {
  const navigate = useNavigate();
  const { ouverte: inscriptionsOuvertes, loading: statutLoading } = useInscriptionFormateursOuverte();
  const now = new Date();
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().split('T')[0];
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    dateNaissance: '',
    lieuNaissance: '',
    motDePasse: '',
    confirmer: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successEmail, setSuccessEmail] = useState('');
  const [emailEnvoye, setEmailEnvoye] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [cniRecto, setCniRecto] = useState<File | null>(null);
  const [cniVerso, setCniVerso] = useState<File | null>(null);
  const [cniRectoPreview, setCniRectoPreview] = useState<string | null>(null);
  const [cniVersoPreview, setCniVersoPreview] = useState<string | null>(null);

  const prenomRef = useRef<HTMLInputElement>(null);
  const nomRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const telephoneRef = useRef<HTMLInputElement>(null);
  const dateNaissanceRef = useRef<HTMLInputElement>(null);
  const lieuNaissanceRef = useRef<HTMLInputElement>(null);
  const motDePasseRef = useRef<HTMLInputElement>(null);
  const confirmerRef = useRef<HTMLInputElement>(null);
  const pickCni = (face: 'recto' | 'verso', file: File | null) => {
    if (!file) {
      if (face === 'recto') {
        if (cniRectoPreview) URL.revokeObjectURL(cniRectoPreview);
        setCniRecto(null);
        setCniRectoPreview(null);
      } else {
        if (cniVersoPreview) URL.revokeObjectURL(cniVersoPreview);
        setCniVerso(null);
        setCniVersoPreview(null);
      }
      return;
    }
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setError('Format CNI non supporté. Utilisez JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('La photo de la carte d’identité ne doit pas dépasser 8 Mo.');
      return;
    }
    setError('');
    const preview = URL.createObjectURL(file);
    if (face === 'recto') {
      if (cniRectoPreview) URL.revokeObjectURL(cniRectoPreview);
      setCniRecto(file);
      setCniRectoPreview(preview);
    } else {
      if (cniVersoPreview) URL.revokeObjectURL(cniVersoPreview);
      setCniVerso(file);
      setCniVersoPreview(preview);
    }
  };

  const refs: Record<FieldKey, React.RefObject<HTMLInputElement>> = {
    prenom: prenomRef,
    nom: nomRef,
    email: emailRef,
    telephone: telephoneRef,
    dateNaissance: dateNaissanceRef,
    lieuNaissance: lieuNaissanceRef,
    motDePasse: motDePasseRef,
    confirmer: confirmerRef,
  };

  const focusFirstError = (errs: Partial<Record<FieldKey, string>>) => {
    const order: FieldKey[] = [
      'prenom', 'nom', 'email', 'telephone', 'dateNaissance', 'lieuNaissance', 'motDePasse', 'confirmer',
    ];
    const first = order.find((k) => errs[k]);
    if (first) requestAnimationFrame(() => refs[first].current?.focus());
  };

  const clearFieldError = (key: FieldKey) => {
    if (fieldErrors[key]) setFieldErrors((p) => ({ ...p, [key]: undefined }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errs: Partial<Record<FieldKey, string>> = {};

    if (!form.prenom.trim()) errs.prenom = 'Veuillez remplir le prénom.';
    if (!form.nom.trim()) errs.nom = 'Veuillez remplir le nom.';
    if (!form.email.trim()) errs.email = 'Veuillez remplir l\'email.';
    else if (!isValidEmail(form.email)) {
      errs.email = 'Format email invalide. Exemple : nom@gmail.com';
    }
    if (!form.telephone.trim()) errs.telephone = 'Veuillez remplir le téléphone.';
    else if (form.telephone.replace(/\D/g, '').length < 8) {
      errs.telephone = 'Le téléphone doit contenir 8 chiffres.';
    }
    if (!form.dateNaissance) errs.dateNaissance = 'Veuillez indiquer la date de naissance.';
    else if (form.dateNaissance > today) {
      errs.dateNaissance = 'La date de naissance ne peut pas être dans le futur.';
    }
    if (!form.lieuNaissance.trim()) errs.lieuNaissance = 'Veuillez indiquer le lieu de naissance.';
    if (!form.motDePasse) errs.motDePasse = 'Veuillez saisir un mot de passe.';
    else if (form.motDePasse.length < 8) errs.motDePasse = 'Minimum 8 caractères.';
    if (!form.confirmer) errs.confirmer = 'Veuillez confirmer le mot de passe.';
    else if (form.motDePasse !== form.confirmer) {
      errs.confirmer = 'Les mots de passe ne correspondent pas.';
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      focusFirstError(errs);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      const { data } = await authService.inscriptionFormateur({
        nom: form.nom,
        prenom: form.prenom,
        email: form.email.trim().toLowerCase(),
        telephone: form.telephone,
        dateNaissance: form.dateNaissance,
        lieuNaissance: form.lieuNaissance.trim(),
        motDePasse: form.motDePasse,
        carteIdentiteRecto: cniRecto,
        carteIdentiteVerso: cniVerso,
      });
      setSuccess(true);
      setEmailEnvoye(Boolean(data?.emailEnvoye));
      setSuccessEmail(form.email.trim().toLowerCase());
      setSuccessMessage(
        data?.message
          || 'Votre compte est en attente de validation par le Directeur.'
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const message = e?.response?.data?.message || 'Impossible de créer le compte. Réessayez plus tard.';
      setError(message);
      if (message.toLowerCase().includes('email')) {
        setFieldErrors({ email: message });
        requestAnimationFrame(() => refs.email.current?.focus());
      }
    } finally {
      setLoading(false);
    }
  };

  if (!statutLoading && !inscriptionsOuvertes && !success) {
    return <Navigate to="/connexion" replace />;
  }

  if (success) {
    return (
      <div
        className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-10"
        style={{
          background: `linear-gradient(155deg, ${BRAND_TEAL_DEEP} 0%, ${BRAND_TEAL} 48%, ${BRAND_TEAL_LIGHT} 100%)`,
        }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-white/10 blur-[100px]" />
          <div className="absolute -bottom-28 -left-24 w-96 h-96 rounded-full bg-black/20 blur-[110px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-md rounded-3xl bg-white border border-white/60 shadow-2xl shadow-black/25 p-8 sm:p-10 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Inscription enregistrée</h2>
          <p className="text-slate-500 mb-4 leading-relaxed">
            {successMessage || (
              <>
                Votre compte est en attente de validation par le Directeur. Vous pourrez compléter
                votre carte d&apos;identité plus tard depuis votre profil, si ce n&apos;est pas déjà fait.
              </>
            )}
          </p>
          {emailEnvoye === true && successEmail && (
            <div className="mb-6 space-y-3 text-left">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <p className="font-semibold flex items-center gap-2">
                  <Mail className="w-4 h-4 shrink-0" />
                  Email de confirmation envoyé
                </p>
                <p className="mt-1.5 leading-relaxed">
                  Un message a été envoyé à <strong>{successEmail}</strong>.
                </p>
              </div>
              <EmailDeliveryHint email={successEmail} />
            </div>
          )}
          {emailEnvoye === false && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
              <p className="font-semibold">Email non envoyé pour le moment</p>
              <p className="mt-1.5 leading-relaxed">
                Votre inscription est bien enregistrée. Le Directeur validera votre compte — vous pourrez vous connecter une fois validé.
              </p>
            </div>
          )}
          <div className="space-y-3">
            <button onClick={() => navigate('/connexion')} className="btn-primary w-full justify-center">
              Aller à la connexion
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-3 rounded-xl border-2 border-[#004b57]/25 text-[#004b57] font-semibold hover:bg-[#004b57]/08 transition-colors"
            >
              Retour à l&apos;accueil
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (statutLoading) {
    return (
      <AppLoader
        variant="fullPage"
        tone="brand"
        message="Préparation du formulaire…"
        label="Chargement de la page d'inscription"
      />
    );
  }

  return (
    <AuthShell
      title="Créer mon compte Formateur"
      subtitle="Complétez le formulaire pour rejoindre Smart Kids Academy."
      maxWidthClass="max-w-xl"
      navLinks={[{ to: '/', label: "Retour à l'accueil" }]}
    >
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
        >
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Prénom <span className="text-red-500">*</span></label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={refs.prenom}
                type="text"
                placeholder={`Ex: ${FIRSTNAME_EXAMPLE}`}
                className={`input-field pl-10 text-sm ${fieldErrors.prenom ? 'border-red-400' : ''}`}
                value={form.prenom}
                onChange={(e) => {
                  setForm({ ...form, prenom: cleanNameInput(e.target.value) });
                  clearFieldError('prenom');
                }}
              />
            </div>
            {fieldErrors.prenom && <p className="mt-1 text-sm text-red-600">{fieldErrors.prenom}</p>}
          </div>
          <div>
            <label className="label">Nom <span className="text-red-500">*</span></label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={refs.nom}
                type="text"
                placeholder={`Ex: ${NAME_EXAMPLE}`}
                className={`input-field pl-10 text-sm ${fieldErrors.nom ? 'border-red-400' : ''}`}
                value={form.nom}
                onChange={(e) => {
                  setForm({ ...form, nom: cleanNameInput(e.target.value) });
                  clearFieldError('nom');
                }}
              />
            </div>
            {fieldErrors.nom && <p className="mt-1 text-sm text-red-600">{fieldErrors.nom}</p>}
          </div>
        </div>

        <div>
          <label className="label">Adresse email <span className="text-red-500">*</span></label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={refs.email}
              type="email"
              inputMode="email"
              placeholder="exemple@gmail.com"
              className={`input-field pl-10 text-sm ${fieldErrors.email ? 'border-red-400' : ''}`}
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                clearFieldError('email');
              }}
            />
          </div>
          {fieldErrors.email && <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>}
        </div>

        <div>
          <label className="label">Téléphone <span className="text-red-500">*</span></label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={refs.telephone}
              type="tel"
              inputMode="numeric"
              maxLength={8}
              placeholder={`Ex: ${PHONE_EXAMPLE}`}
              className={`input-field pl-10 text-sm ${fieldErrors.telephone ? 'border-red-400' : ''}`}
              value={form.telephone}
              onChange={(e) => {
                setForm({ ...form, telephone: cleanPhoneInput(e.target.value) });
                clearFieldError('telephone');
              }}
            />
          </div>
          {fieldErrors.telephone && <p className="mt-1 text-sm text-red-600">{fieldErrors.telephone}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Date de naissance <span className="text-red-500">*</span></label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={refs.dateNaissance}
                type="date"
                max={today}
                className={`input-field pl-10 text-sm ${fieldErrors.dateNaissance ? 'border-red-400' : ''}`}
                value={form.dateNaissance}
                onChange={(e) => {
                  setForm({ ...form, dateNaissance: e.target.value });
                  clearFieldError('dateNaissance');
                }}
              />
            </div>
            {fieldErrors.dateNaissance && <p className="mt-1 text-sm text-red-600">{fieldErrors.dateNaissance}</p>}
          </div>
          <div>
            <label className="label">Lieu de naissance <span className="text-red-500">*</span></label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={refs.lieuNaissance}
                type="text"
                placeholder="Ex: Lomé"
                className={`input-field pl-10 text-sm ${fieldErrors.lieuNaissance ? 'border-red-400' : ''}`}
                value={form.lieuNaissance}
                onChange={(e) => {
                  setForm({ ...form, lieuNaissance: e.target.value });
                  clearFieldError('lieuNaissance');
                }}
              />
            </div>
            {fieldErrors.lieuNaissance && <p className="mt-1 text-sm text-red-600">{fieldErrors.lieuNaissance}</p>}
          </div>
        </div>

        <div>
          <label className="label">Mot de passe <span className="text-red-500">*</span></label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={refs.motDePasse}
              type={showPass ? 'text' : 'password'}
              placeholder="Min. 8 caractères"
              className={`input-field pl-10 pr-10 text-sm ${fieldErrors.motDePasse ? 'border-red-400' : ''}`}
              value={form.motDePasse}
              onChange={(e) => {
                setForm({ ...form, motDePasse: e.target.value });
                clearFieldError('motDePasse');
              }}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#004b57]"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {fieldErrors.motDePasse && <p className="mt-1 text-sm text-red-600">{fieldErrors.motDePasse}</p>}
        </div>

        <div>
          <label className="label">Confirmer le mot de passe <span className="text-red-500">*</span></label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={refs.confirmer}
              type={showPass ? 'text' : 'password'}
              placeholder="Répétez le mot de passe"
              className={`input-field pl-10 text-sm ${fieldErrors.confirmer ? 'border-red-400' : ''}`}
              value={form.confirmer}
              onChange={(e) => {
                setForm({ ...form, confirmer: e.target.value });
                clearFieldError('confirmer');
              }}
            />
          </div>
          {fieldErrors.confirmer && <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmer}</p>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <FileImage className="w-4 h-4 text-[#004b57] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Carte d’identité (optionnel)</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Vous pouvez l’ajouter maintenant ou plus tard depuis votre profil. Le Directeur
                pourra la consulter dès qu’elle est présente.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <MediaDropZone
              compact
              files={cniRecto ? [cniRecto] : []}
              onChange={(files) => pickCni('recto', files[0] || null)}
              accept="image/jpeg,image/png,image/webp"
              maxSizeMb={5}
              label="CNI — Recto"
              hint="Glisser-déposer ou Ctrl+V"
            />
            <MediaDropZone
              compact
              files={cniVerso ? [cniVerso] : []}
              onChange={(files) => pickCni('verso', files[0] || null)}
              accept="image/jpeg,image/png,image/webp"
              maxSizeMb={5}
              label="CNI — Verso"
              hint="Glisser-déposer ou Ctrl+V"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full justify-center py-3.5 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
              {loading ? (
                <>
                  <ButtonSpinner className="w-4 h-4" />
              Création en cours...
            </>
          ) : (
            'Créer mon compte'
          )}
        </button>
      </form>

      <div className="mt-7 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
        <p className="text-slate-500 text-sm mb-3">Vous avez déjà un compte ?</p>
        <button
          type="button"
          onClick={() => navigate('/connexion')}
          className="inline-flex w-full items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-[#004b57]/30 text-[#004b57] text-sm font-semibold hover:bg-[#004b57]/08 transition-all"
        >
          Aller à la connexion
        </button>
      </div>
    </AuthShell>
  );
}
