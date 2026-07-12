import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, KeyRound, ShieldCheck, Hash } from 'lucide-react';
import { ButtonSpinner } from '../components/ui/AppLoader';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { useInscriptionFormateursOuverte } from '../hooks/useInscriptionFormateursOuverte';
import AuthShell from '../components/auth/AuthShell';
import EmailDeliveryHint from '../components/ui/EmailDeliveryHint';
import toast from 'react-hot-toast';
import { isValidEmail, normalizeEmail } from '../utils/email';

type ResetStep = 'email' | 'otp';
type LoginMode = 'staff' | 'parent';

const MATRICULE_REGEX = /^\d{2}SKA\d{4}$/i;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,128}$/;

export default function LoginPage() {
  const { login, loginParent } = useAuth();
  const navigate = useNavigate();
  const { ouverte: inscriptionsOuvertes } = useInscriptionFormateursOuverte();
  const [mode, setMode] = useState<LoginMode>('staff');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [matricule, setMatricule] = useState('');
  const [showParentActivation, setShowParentActivation] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [activationPassword, setActivationPassword] = useState('');
  const [activationConfirm, setActivationConfirm] = useState('');
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationErrors, setActivationErrors] = useState<Record<string, string>>({});
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    motDePasse?: string;
    matricule?: string;
  }>({});
  const [showReset, setShowReset] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>('email');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmMotDePasse, setConfirmMotDePasse] = useState('');
  const [resetFieldErrors, setResetFieldErrors] = useState<Record<string, string>>({});

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const matriculeRef = useRef<HTMLInputElement>(null);
  const parentPasswordRef = useRef<HTMLInputElement>(null);
  const resetEmailRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const newPassRef = useRef<HTMLInputElement>(null);
  const confirmPassRef = useRef<HTMLInputElement>(null);

  const focusField = (ref: React.RefObject<HTMLInputElement | null>) => {
    requestAnimationFrame(() => ref.current?.focus());
  };

  const switchMode = (next: LoginMode) => {
    setMode(next);
    setError('');
    setFieldErrors({});
    if (next === 'parent' && showReset) {
      setShowReset(false);
      resetResetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');

    if (mode === 'parent') {
      const nextErrors: { matricule?: string; motDePasse?: string } = {};
      const mat = matricule.trim().toUpperCase();
      if (!mat) {
        nextErrors.matricule = 'Veuillez saisir le matricule de l\'enfant.';
      } else if (!MATRICULE_REGEX.test(mat)) {
        nextErrors.matricule = 'Format invalide. Exemple : 26SKA0487';
      }
      if (!motDePasse) {
        nextErrors.motDePasse = 'Veuillez saisir votre mot de passe parent.';
      }

      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors);
        if (nextErrors.matricule) focusField(matriculeRef);
        else focusField(parentPasswordRef);
        return;
      }

      setFieldErrors({});
      setLoading(true);
      try {
        await loginParent(mat, motDePasse);
        navigate('/dashboard');
      } catch (err: unknown) {
        const apiErr = err as {
          response?: { data?: { message?: string; field?: string }; status?: number };
        };
        const message =
          apiErr?.response?.data?.message ||
          'Matricule ou mot de passe incorrect.';
        setError(message);
        setFieldErrors({ motDePasse: message });
        focusField(parentPasswordRef);
      } finally {
        setLoading(false);
      }
      return;
    }

    const nextErrors: { email?: string; motDePasse?: string } = {};

    if (!email.trim()) {
      nextErrors.email = 'Veuillez remplir le champ email.';
    } else if (!isValidEmail(email)) {
      nextErrors.email = 'Format email invalide. Exemple : nom@gmail.com';
    }
    if (!motDePasse) {
      nextErrors.motDePasse = 'Veuillez remplir le champ mot de passe.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      if (nextErrors.email) focusField(emailRef);
      else focusField(passwordRef);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      await login(normalizeEmail(email), motDePasse);
      navigate('/dashboard');
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { data?: { message?: string; field?: string }; status?: number };
        code?: string;
        message?: string;
      };
      const status = apiErr?.response?.status;
      const serverMessage = apiErr?.response?.data?.message;
      const message =
        serverMessage ||
        (status === 429
          ? 'Trop de tentatives. Réessayez dans quelques minutes.'
          : apiErr?.code === 'ERR_NETWORK' || apiErr?.message === 'Network Error'
            ? 'Connexion impossible. Vérifiez le réseau mobile et réessayez.'
            : status === 401 || status === 403
              ? 'Email ou mot de passe incorrect.'
              : 'Connexion impossible. Rechargez la page et réessayez.');
      const field = apiErr?.response?.data?.field;
      setError(message);
      if (field === 'email') {
        setFieldErrors({ email: message });
        focusField(emailRef);
      } else if (field === 'motDePasse') {
        setFieldErrors({ motDePasse: message });
        focusField(passwordRef);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleActivateParent = async (event: React.FormEvent) => {
    event.preventDefault();
    const mat = matricule.trim().toUpperCase();
    const errors: Record<string, string> = {};
    if (!MATRICULE_REGEX.test(mat)) errors.matricule = 'Matricule invalide.';
    if (!/^[A-Z2-9]{10}$/.test(activationCode.trim().toUpperCase())) {
      errors.codeActivation = 'Le code remis par le centre doit contenir 10 caractères.';
    }
    if (!STRONG_PASSWORD_REGEX.test(activationPassword)) {
      errors.password = '10 caractères minimum avec majuscule, minuscule et chiffre.';
    }
    if (activationPassword !== activationConfirm) {
      errors.confirm = 'Les mots de passe ne correspondent pas.';
    }
    if (Object.keys(errors).length) {
      setActivationErrors(errors);
      return;
    }

    setActivationErrors({});
    setActivationLoading(true);
    try {
      const response = await authService.activateParent({
        matricule: mat,
        codeActivation: activationCode.trim().toUpperCase(),
        nouveauMotDePasse: activationPassword,
      });
      toast.success(response.data?.message || 'Compte parent activé.');
      setMotDePasse(activationPassword);
      setActivationCode('');
      setActivationPassword('');
      setActivationConfirm('');
      setShowParentActivation(false);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setActivationErrors({
        form: apiError.response?.data?.message || "Impossible d'activer le compte parent.",
      });
    } finally {
      setActivationLoading(false);
    }
  };

  const resetResetForm = () => {
    setResetStep('email');
    setResetEmail('');
    setOtp('');
    setNouveauMotDePasse('');
    setConfirmMotDePasse('');
    setResetFieldErrors({});
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!resetEmail.trim()) {
      errs.email = 'Veuillez remplir le champ email.';
    } else if (!isValidEmail(resetEmail)) {
      errs.email = 'Format email invalide. Exemple : nom@gmail.com';
    }
    if (Object.keys(errs).length > 0) {
      setResetFieldErrors(errs);
      focusField(resetEmailRef);
      return;
    }
    setResetFieldErrors({});
    setResetLoading(true);
    try {
      const res = await authService.requestPasswordResetOtp(resetEmail.trim().toLowerCase());
      toast.success(
        res.data?.message
          || 'Code envoyé. Vérifiez votre boîte mail et le dossier Spam dans Gmail.',
      );
      setResetStep('otp');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const message = e?.response?.data?.message || "Impossible d'envoyer le code OTP.";
      setResetFieldErrors({ email: message });
      toast.error(message);
      focusField(resetEmailRef);
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!otp.trim()) errs.otp = 'Veuillez saisir le code OTP reçu par email.';
    else if (otp.trim().length !== 6) errs.otp = 'Le code OTP doit contenir 6 chiffres.';
    if (!nouveauMotDePasse) errs.nouveauMotDePasse = 'Veuillez saisir le nouveau mot de passe.';
    else if (!STRONG_PASSWORD_REGEX.test(nouveauMotDePasse)) {
      errs.nouveauMotDePasse = '10 caractères minimum avec majuscule, minuscule et chiffre.';
    }
    if (!confirmMotDePasse) errs.confirmMotDePasse = 'Veuillez confirmer le mot de passe.';
    else if (nouveauMotDePasse !== confirmMotDePasse) {
      errs.confirmMotDePasse = 'Les mots de passe ne correspondent pas.';
    }

    if (Object.keys(errs).length > 0) {
      setResetFieldErrors(errs);
      if (errs.otp) focusField(otpRef);
      else if (errs.nouveauMotDePasse) focusField(newPassRef);
      else focusField(confirmPassRef);
      return;
    }

    setResetFieldErrors({});
    setResetLoading(true);
    try {
      await authService.confirmResetPassword({
        email: resetEmail.trim().toLowerCase(),
        otp: otp.trim(),
        nouveauMotDePasse,
      });
      toast.success('Mot de passe réinitialisé. Vous pouvez vous connecter.');
      setShowReset(false);
      resetResetForm();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const message = e?.response?.data?.message || 'Impossible de réinitialiser le mot de passe.';
      setResetFieldErrors({ otp: message });
      toast.error(message);
      focusField(otpRef);
    } finally {
      setResetLoading(false);
    }
  };

  const navLinks = [{ to: '/', label: "Retour à l'accueil" }];

  const inputClass = (hasError?: string) =>
    `input-field pl-11 ${hasError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`;

  const subtitle =
    mode === 'parent'
      ? 'Connectez-vous avec le matricule de votre enfant et votre mot de passe personnel.'
      : 'Accédez à votre espace sécurisé Smart Kids Academy.';

  return (
    <AuthShell title="Connexion" subtitle={subtitle} navLinks={navLinks}>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
          role="alert"
        >
          {error}
        </motion.div>
      )}

      <div
        className="mb-5 grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200"
        role="tablist"
        aria-label="Mode de connexion"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'staff'}
          onClick={() => switchMode('staff')}
          className={`py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
            mode === 'staff'
              ? 'bg-[#004b57] text-white shadow-sm'
              : 'text-slate-600 hover:text-[#004b57]'
          }`}
        >
          Personnel
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'parent'}
          onClick={() => switchMode('parent')}
          className={`py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
            mode === 'parent'
              ? 'bg-[#004b57] text-white shadow-sm'
              : 'text-slate-600 hover:text-[#004b57]'
          }`}
        >
          Espace parent
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {mode === 'parent' ? (
          <>
            <div>
              <label className="label" htmlFor="login-matricule">
                Matricule de l&apos;enfant <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  ref={matriculeRef}
                  id="login-matricule"
                  type="text"
                  placeholder="26SKA0487"
                  maxLength={9}
                  className={inputClass(fieldErrors.matricule)}
                  value={matricule}
                  onChange={(e) => {
                    setMatricule(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 9));
                    if (fieldErrors.matricule) setFieldErrors((p) => ({ ...p, matricule: undefined }));
                    if (error) setError('');
                  }}
                  autoComplete="username"
                  aria-invalid={!!fieldErrors.matricule}
                />
              </div>
              {fieldErrors.matricule && (
                <p className="mt-1.5 text-sm text-red-600">{fieldErrors.matricule}</p>
              )}
              <p className="mt-1.5 text-xs text-slate-500">
                Le matricule est un identifiant; il ne remplace jamais votre mot de passe.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="login-parent-password">
                Mot de passe parent <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  ref={parentPasswordRef}
                  id="login-parent-password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Votre mot de passe personnel"
                  className={`input-field pl-11 pr-11 ${fieldErrors.motDePasse ? 'border-red-400' : ''}`}
                  value={motDePasse}
                  onChange={(event) => {
                    setMotDePasse(event.target.value);
                    if (fieldErrors.motDePasse) {
                      setFieldErrors((previous) => ({ ...previous, motDePasse: undefined }));
                    }
                    if (error) setError('');
                  }}
                  autoComplete="current-password"
                  aria-invalid={!!fieldErrors.motDePasse}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((visible) => !visible)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#004b57]"
                  aria-label={showPass ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {fieldErrors.motDePasse && (
                <p className="mt-1.5 text-sm text-red-600">{fieldErrors.motDePasse}</p>
              )}
            </div>

            <motion.button
              id="login-submit-parent"
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="btn-primary w-full justify-center py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <ButtonSpinner className="w-5 h-5" />
                  Connexion en cours...
                </>
              ) : (
                'Accéder au suivi'
              )}
            </motion.button>
          </>
        ) : (
          <>
            <div>
              <label className="label" htmlFor="login-email">
                Adresse email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  ref={emailRef}
                  id="login-email"
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="exemple@gmail.com"
                  className={inputClass(fieldErrors.email)}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                    if (error) setError('');
                  }}
                  autoComplete="email"
                  aria-invalid={!!fieldErrors.email}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1.5 text-sm text-red-600">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="login-password">
                Mot de passe <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  ref={passwordRef}
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="••••••••"
                  className={`input-field pl-11 pr-11 ${fieldErrors.motDePasse ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  value={motDePasse}
                  onChange={(e) => {
                    setMotDePasse(e.target.value);
                    if (fieldErrors.motDePasse) setFieldErrors((p) => ({ ...p, motDePasse: undefined }));
                    if (error) setError('');
                  }}
                  autoComplete="current-password"
                  aria-invalid={!!fieldErrors.motDePasse}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#004b57] transition-colors"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {fieldErrors.motDePasse && (
                <p className="mt-1.5 text-sm text-red-600">{fieldErrors.motDePasse}</p>
              )}
            </div>

            <motion.button
              id="login-submit"
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="btn-primary w-full justify-center py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <ButtonSpinner className="w-5 h-5" />
                  Connexion en cours...
                </>
              ) : (
                'Se connecter'
              )}
            </motion.button>
          </>
        )}
      </form>

      {mode === 'parent' && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              setShowParentActivation((visible) => !visible);
              setActivationErrors({});
            }}
            className="text-sm text-[#004b57] font-semibold inline-flex items-center gap-2 hover:underline"
          >
            <KeyRound className="w-4 h-4" />
            Première connexion ? Activer mon compte
          </button>

          {showParentActivation && (
            <form
              onSubmit={handleActivateParent}
              className="mt-4 p-4 rounded-2xl border border-[#004b57]/20 bg-[#004b57]/[0.04] space-y-3"
              noValidate
            >
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-5 h-5 text-[#004b57] shrink-0 mt-0.5" />
                <p className="text-sm text-slate-600">
                  Utilisez une seule fois le code confidentiel remis par votre centre, puis choisissez
                  votre propre mot de passe.
                </p>
              </div>
              {activationErrors.form && (
                <p className="text-sm text-red-600" role="alert">{activationErrors.form}</p>
              )}
              <div>
                <input
                  className={`input-field uppercase tracking-widest ${activationErrors.codeActivation ? 'border-red-400' : ''}`}
                  value={activationCode}
                  onChange={(event) => setActivationCode(
                    event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 10),
                  )}
                  placeholder="Code d’activation (10 caractères)"
                  autoComplete="one-time-code"
                  maxLength={10}
                />
                {activationErrors.codeActivation && (
                  <p className="mt-1 text-sm text-red-600">{activationErrors.codeActivation}</p>
                )}
              </div>
              <div>
                <input
                  className={`input-field ${activationErrors.password ? 'border-red-400' : ''}`}
                  type="password"
                  value={activationPassword}
                  onChange={(event) => setActivationPassword(event.target.value)}
                  placeholder="Nouveau mot de passe"
                  autoComplete="new-password"
                />
                {activationErrors.password && (
                  <p className="mt-1 text-sm text-red-600">{activationErrors.password}</p>
                )}
              </div>
              <div>
                <input
                  className={`input-field ${activationErrors.confirm ? 'border-red-400' : ''}`}
                  type="password"
                  value={activationConfirm}
                  onChange={(event) => setActivationConfirm(event.target.value)}
                  placeholder="Confirmer le mot de passe"
                  autoComplete="new-password"
                />
                {activationErrors.confirm && (
                  <p className="mt-1 text-sm text-red-600">{activationErrors.confirm}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={activationLoading}
                className="btn-primary w-full justify-center disabled:opacity-60"
              >
                {activationLoading ? <ButtonSpinner className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                Activer le compte
              </button>
            </form>
          )}
        </div>
      )}

      {mode === 'staff' && (
        <>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                setShowReset((v) => !v);
                if (showReset) resetResetForm();
              }}
              className="text-sm text-[#004b57] hover:text-[#003840] font-medium inline-flex items-center gap-1.5"
            >
              <KeyRound className="w-4 h-4" />
              Mot de passe oublié ?
            </button>
          </div>

          {showReset && (
            <div className="mt-4 p-4 rounded-2xl border border-[#004b57]/20 bg-[#004b57]/[0.04] space-y-3">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-5 h-5 text-[#004b57] shrink-0 mt-0.5" />
                <p className="text-sm text-slate-600">
                  Un code de vérification sera envoyé uniquement si cet email correspond à un compte actif.
                  Sans ce code, le mot de passe ne peut pas être changé.
                </p>
              </div>

              {resetStep === 'email' && (
                <EmailDeliveryHint className="text-xs" />
              )}

              {resetStep === 'email' ? (
                <form onSubmit={handleRequestOtp} className="space-y-3" noValidate>
                  <div>
                    <input
                      ref={resetEmailRef}
                      className={`input-field ${resetFieldErrors.email ? 'border-red-400' : ''}`}
                      placeholder="Email du compte"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => {
                        setResetEmail(e.target.value);
                        if (resetFieldErrors.email) setResetFieldErrors((p) => ({ ...p, email: '' }));
                      }}
                      autoComplete="email"
                    />
                    {resetFieldErrors.email && (
                      <p className="mt-1.5 text-sm text-red-600">{resetFieldErrors.email}</p>
                    )}
                  </div>
                  <button type="submit" disabled={resetLoading} className="btn-primary w-full justify-center">
                    {resetLoading ? (
                      <>
                        <ButtonSpinner className="w-4 h-4" />
                        Envoi du code...
                      </>
                    ) : (
                      'Recevoir le code OTP'
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleConfirmReset} className="space-y-3" noValidate>
                  <EmailDeliveryHint email={resetEmail.trim().toLowerCase()} />
                  <p className="text-xs text-slate-500">
                    Code envoyé à <span className="font-semibold text-slate-700">{resetEmail}</span>
                    {' '}— valide 10 minutes
                  </p>
                  <div>
                    <input
                      ref={otpRef}
                      className={`input-field tracking-[0.35em] text-center text-lg font-semibold ${resetFieldErrors.otp ? 'border-red-400' : ''}`}
                      placeholder="Code OTP (6 chiffres)"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => {
                        setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                        if (resetFieldErrors.otp) setResetFieldErrors((p) => ({ ...p, otp: '' }));
                      }}
                    />
                    {resetFieldErrors.otp && (
                      <p className="mt-1.5 text-sm text-red-600">{resetFieldErrors.otp}</p>
                    )}
                  </div>
                  <div>
                    <input
                      ref={newPassRef}
                      className={`input-field ${resetFieldErrors.nouveauMotDePasse ? 'border-red-400' : ''}`}
                      type="password"
                      placeholder="Nouveau mot de passe"
                      value={nouveauMotDePasse}
                      onChange={(e) => {
                        setNouveauMotDePasse(e.target.value);
                        if (resetFieldErrors.nouveauMotDePasse) {
                          setResetFieldErrors((p) => ({ ...p, nouveauMotDePasse: '' }));
                        }
                      }}
                      minLength={10}
                    />
                    {resetFieldErrors.nouveauMotDePasse && (
                      <p className="mt-1.5 text-sm text-red-600">{resetFieldErrors.nouveauMotDePasse}</p>
                    )}
                  </div>
                  <div>
                    <input
                      ref={confirmPassRef}
                      className={`input-field ${resetFieldErrors.confirmMotDePasse ? 'border-red-400' : ''}`}
                      type="password"
                      placeholder="Confirmer le mot de passe"
                      value={confirmMotDePasse}
                      onChange={(e) => {
                        setConfirmMotDePasse(e.target.value);
                        if (resetFieldErrors.confirmMotDePasse) {
                          setResetFieldErrors((p) => ({ ...p, confirmMotDePasse: '' }));
                        }
                      }}
                      minLength={10}
                    />
                    {resetFieldErrors.confirmMotDePasse && (
                      <p className="mt-1.5 text-sm text-red-600">{resetFieldErrors.confirmMotDePasse}</p>
                    )}
                  </div>
                  <button type="submit" disabled={resetLoading} className="btn-primary w-full justify-center">
                    {resetLoading ? (
                      <>
                        <ButtonSpinner className="w-4 h-4" />
                        Validation...
                      </>
                    ) : (
                      'Valider et changer le mot de passe'
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={resetLoading}
                    onClick={handleRequestOtp}
                    className="w-full text-sm text-[#004b57] font-medium hover:underline disabled:opacity-50"
                  >
                    Renvoyer le code
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetStep('email');
                      setResetFieldErrors({});
                    }}
                    className="w-full text-sm text-slate-500 hover:text-slate-700"
                  >
                    Changer d&apos;email
                  </button>
                </form>
              )}
            </div>
          )}

          {inscriptionsOuvertes && (
            <div className="mt-7 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-slate-500 text-sm mb-3">Formateur sans compte ?</p>
              <Link
                to="/inscription-formateur"
                className="inline-flex w-full items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-[#004b57]/30 text-[#004b57] text-sm font-semibold hover:bg-[#004b57]/08 transition-all"
              >
                Créer mon compte formateur
              </Link>
            </div>
          )}
        </>
      )}
    </AuthShell>
  );
}
