import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { banqueService, userService } from '../../services/api';
import type { Banque } from '../../types';
import {
  Building2, Camera, CreditCard, FileImage, Loader2, Lock, Mail, MapPin, Phone, Smartphone, Trash2, User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import UserAvatar from '../../components/ui/UserAvatar';
import SecureImage from '../../components/ui/SecureImage';
import MediaDropZone from '../../components/ui/MediaDropZone';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import {
  cleanNameInput,
  cleanPhoneInput,
  FIRSTNAME_EXAMPLE,
  NAME_EXAMPLE,
  PHONE_EXAMPLE,
} from '../../utils/formInputs';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MAX_CNI_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_CNI_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

export default function ProfilPage() {
  const { user, role, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileIncomplete = useMemo(() => {
    if (!user) return true;
    const missingPayment = !user.rib && !user.numeroCompteBancaire && !user.numeroMobileMoney;
    const missingPhone = !user.telephone;
    return missingPayment || missingPhone;
  }, [user]);

  const [form, setForm] = useState({
    prenom: user?.prenom || '',
    nom: user?.nom || '',
    telephone: user?.telephone || '',
    telephoneSecondaire: user?.telephoneSecondaire || '',
    dateNaissance: user?.dateNaissance ? String(user.dateNaissance).slice(0, 10) : '',
    lieuNaissance: user?.lieuNaissance || '',
    adresse: user?.adresse || '',
    numeroCompteBancaire: user?.numeroCompteBancaire || '',
    numeroMobileMoney: user?.numeroMobileMoney || '',
    operateurMobileMoney: user?.operateurMobileMoney || '',
    banqueNom: user?.banqueNom || '',
    rib: user?.rib || '',
    codeAgence: user?.codeAgence || '',
    intituleCompte: user?.intituleCompte || '',
    ancienMotDePasse: '',
    motDePasse: '',
    confirmer: '',
  });

  const [loading, setLoading] = useState(false);
  const [banques, setBanques] = useState<Banque[]>([]);
  useEffect(() => {
    banqueService.list().then(({ data }) => setBanques(data)).catch(() => setBanques([]));
  }, []);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [cniLoading, setCniLoading] = useState<'recto' | 'verso' | null>(null);
  const [showCompleteBanner, setShowCompleteBanner] = useState(profileIncomplete);
  const [confirmRemove, setConfirmRemove] = useState<
    | { type: 'avatar' }
    | { type: 'cni'; face: 'recto' | 'verso' }
    | null
  >(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (form.motDePasse) {
      if (!form.ancienMotDePasse) {
        toast.error('Saisissez votre ancien mot de passe avant d’en définir un nouveau.');
        return;
      }
      if (form.motDePasse !== form.confirmer) {
        toast.error('Les mots de passe ne correspondent pas.');
        return;
      }
      if (form.motDePasse.length < 6) {
        toast.error('Le nouveau mot de passe doit contenir au moins 6 caractères.');
        return;
      }
    }

    if (form.dateNaissance && form.dateNaissance > todayIso()) {
      toast.error('La date de naissance ne peut pas dépasser aujourd’hui.');
      return;
    }

    if (!form.rib && !form.numeroMobileMoney) {
      toast.error('Ajoutez un compte bancaire (RIB) ou un numéro Mobile Money.');
      return;
    }
    if (form.numeroMobileMoney && !form.operateurMobileMoney) {
      toast.error('Sélectionnez votre opérateur Mobile Money (Mixx by Yas ou Moov Money).');
      return;
    }
    if (form.rib && (!form.codeAgence || !form.intituleCompte)) {
      toast.error('Pour le compte bancaire, renseignez le RIB, le code agence et l’intitulé du compte.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await userService.updateProfile(user.id, {
        nom: form.nom,
        prenom: form.prenom,
        telephone: form.telephone,
        telephoneSecondaire: form.telephoneSecondaire || undefined,
        dateNaissance: form.dateNaissance || undefined,
        lieuNaissance: form.lieuNaissance || undefined,
        adresse: form.adresse || undefined,
        numeroCompteBancaire: form.numeroCompteBancaire || undefined,
        numeroMobileMoney: form.numeroMobileMoney || undefined,
        operateurMobileMoney: form.operateurMobileMoney,
        banqueNom: form.banqueNom,
        rib: form.rib,
        codeAgence: form.codeAgence,
        intituleCompte: form.intituleCompte,
        ancienMotDePasse: form.ancienMotDePasse || undefined,
        motDePasse: form.motDePasse || undefined,
      });

      updateUser({
        nom: data.nom ?? form.nom,
        prenom: data.prenom ?? form.prenom,
        telephone: data.telephone ?? form.telephone,
        telephoneSecondaire: data.telephoneSecondaire ?? form.telephoneSecondaire,
        dateNaissance: data.dateNaissance ?? form.dateNaissance,
        lieuNaissance: data.lieuNaissance ?? form.lieuNaissance,
        adresse: data.adresse ?? form.adresse,
        numeroCompteBancaire: data.numeroCompteBancaire ?? form.numeroCompteBancaire,
        numeroMobileMoney: data.numeroMobileMoney ?? form.numeroMobileMoney,
        operateurMobileMoney: (data.operateurMobileMoney ?? form.operateurMobileMoney) as '' | 'MIXX_BY_YAS' | 'MOOV_MONEY',
        banqueNom: data.banqueNom ?? form.banqueNom,
        rib: data.rib ?? form.rib,
        codeAgence: data.codeAgence ?? form.codeAgence,
        intituleCompte: data.intituleCompte ?? form.intituleCompte,
        avatar: data.avatar,
        carteIdentiteRecto: data.carteIdentiteRecto,
        carteIdentiteVerso: data.carteIdentiteVerso,
      });

      toast.success('Profil mis à jour.');
      setShowCompleteBanner(false);
      setForm((prev) => ({ ...prev, ancienMotDePasse: '', motDePasse: '', confirmer: '' }));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Erreur lors de la mise à jour du profil.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarPick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Format non supporté. Utilisez JPG, PNG, WEBP ou GIF.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('La photo ne doit pas dépasser 5 Mo.');
      return;
    }
    setAvatarLoading(true);
    try {
      const { data } = await userService.uploadAvatar(file);
      updateUser({ avatar: data.avatar });
      toast.success('Photo de profil mise à jour.');
    } catch {
      toast.error("Impossible d'envoyer la photo de profil.");
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.avatar) return;
    setAvatarLoading(true);
    try {
      await userService.deleteAvatar();
      updateUser({ avatar: undefined });
      toast.success('Photo de profil retirée.');
    } catch {
      toast.error('Impossible de retirer la photo.');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleCniFile = async (face: 'recto' | 'verso', file: File | null) => {
    if (!file) return;
    if (!ALLOWED_CNI_TYPES.includes(file.type)) {
      toast.error('Format non supporté. Utilisez JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > MAX_CNI_BYTES) {
      toast.error('La photo ne doit pas dépasser 8 Mo.');
      return;
    }
    setCniLoading(face);
    try {
      const { data } = await userService.uploadCarteIdentite(face, file);
      updateUser({
        carteIdentiteRecto: data.carteIdentiteRecto,
        carteIdentiteVerso: data.carteIdentiteVerso,
      });
      toast.success(`Carte d’identité (${face}) enregistrée.`);
    } catch {
      toast.error(`Impossible d’envoyer le ${face} de la carte.`);
    } finally {
      setCniLoading(null);
    }
  };

  const handleRemoveCni = async (face: 'recto' | 'verso') => {
    setCniLoading(face);
    try {
      const { data } = await userService.deleteCarteIdentite(face);
      updateUser({
        carteIdentiteRecto: data.carteIdentiteRecto ?? undefined,
        carteIdentiteVerso: data.carteIdentiteVerso ?? undefined,
      });
      toast.success(`${face === 'recto' ? 'Recto' : 'Verso'} retiré.`);
    } catch {
      toast.error('Impossible de retirer la photo.');
    } finally {
      setCniLoading(null);
    }
  };

  const confirmRemoveAction = async () => {
    if (!confirmRemove) return;
    const action = confirmRemove;
    setConfirmRemove(null);
    if (action.type === 'avatar') {
      await handleRemoveAvatar();
    } else {
      await handleRemoveCni(action.face);
    }
  };

  const isFormateur = user?.role === 'FORMATEUR';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mon Profil</h1>
          <p className="text-slate-500 mt-1">
            Retrouvez ici les informations de votre inscription, vos contacts, paiement
            {isFormateur ? ' et votre carte d’identité' : ''}.
          </p>
        </div>
        {profileIncomplete && (
          <button
            type="button"
            onClick={() => {
              setShowCompleteBanner(true);
              document.getElementById('profil-paiement')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="btn-primary shrink-0"
          >
            Compléter mon profil
          </button>
        )}
      </div>

      {showCompleteBanner && profileIncomplete && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Profil incomplet</p>
          <p className="mt-0.5 text-amber-800/90">
            Ajoutez au moins un moyen de paiement (compte bancaire ou Mobile Money) et votre numéro de téléphone.
          </p>
        </div>
      )}

      <div className="card border border-slate-200 bg-white">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-slate-200">
            <div className="relative">
              <UserAvatar user={user} size="xl" />
              <button
                type="button"
                onClick={handleAvatarPick}
                disabled={avatarLoading}
                className="absolute -bottom-1 -right-1 p-2 rounded-full bg-[#004b57] text-white shadow"
              >
                {avatarLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{user?.prenom} {user?.nom}</p>
              <p className="text-sm text-slate-500">{role}</p>
              <p className="text-xs text-slate-400 mt-1">{user?.email}</p>
              {user?.avatar && (
                <button
                  type="button"
                  onClick={() => setConfirmRemove({ type: 'avatar' })}
                  className="mt-2 text-xs text-red-600 inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Retirer la photo
                </button>
              )}
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <User className="w-4 h-4 text-[#004b57]" /> Identité (infos d’inscription)
            </h2>
            <p className="text-xs text-slate-500">
              Ces informations correspondent à celles saisies à la création du compte. Vous pouvez les mettre à jour.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Prénom</label>
                <input
                  className="input-field"
                  required
                  placeholder={FIRSTNAME_EXAMPLE}
                  value={form.prenom}
                  onChange={(e) => setForm({ ...form, prenom: cleanNameInput(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Nom</label>
                <input
                  className="input-field"
                  required
                  placeholder={NAME_EXAMPLE}
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: cleanNameInput(e.target.value) })}
                />
              </div>
              <div>
                <label className="label flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</label>
                <input className="input-field bg-slate-50" value={user?.email || ''} disabled />
              </div>
              <div>
                <label className="label">Date de naissance</label>
                <input
                  type="date"
                  className="input-field"
                  max={todayIso()}
                  value={form.dateNaissance}
                  onChange={(e) => setForm({ ...form, dateNaissance: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Lieu de naissance</label>
                <input
                  className="input-field"
                  placeholder="Ex: Lomé"
                  value={form.lieuNaissance}
                  onChange={(e) => setForm({ ...form, lieuNaissance: e.target.value })}
                />
              </div>
              <div>
                <label className="label flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Adresse</label>
                <input
                  className="input-field"
                  placeholder="Quartier, ville…"
                  value={form.adresse}
                  onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#004b57]" /> Téléphones (chiffres uniquement)
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Téléphone principal</label>
                <input
                  className="input-field"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder={PHONE_EXAMPLE}
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: cleanPhoneInput(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Téléphone supplémentaire</label>
                <input
                  className="input-field"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Optionnel"
                  value={form.telephoneSecondaire}
                  onChange={(e) => setForm({ ...form, telephoneSecondaire: cleanPhoneInput(e.target.value) })}
                />
              </div>
            </div>
          </section>

          {isFormateur && (
            <section id="profil-cni" className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <FileImage className="w-4 h-4 text-[#004b57]" /> Carte d’identité
              </h2>
              <p className="text-xs text-slate-500">
                Optionnel : ajoutez le recto et le verso maintenant, ou plus tard. Le Directeur pourra les consulter dès qu’ils sont présents.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {([
                  ['recto', 'Recto', user?.carteIdentiteRecto] as const,
                  ['verso', 'Verso', user?.carteIdentiteVerso] as const,
                ]).map(([face, label, url]) => (
                  <div key={face} className="space-y-2">
                    {url && (
                      <SecureImage
                        path={url}
                        alt={`CNI ${label}`}
                        className="w-full h-36 object-cover rounded-lg border border-slate-200 bg-white"
                      />
                    )}
                    <MediaDropZone
                      compact
                      files={[]}
                      onChange={(files) => {
                        if (files[0]) void handleCniFile(face, files[0]);
                      }}
                      accept="image/jpeg,image/png,image/webp"
                      maxSizeMb={8}
                      label={`CNI — ${label}`}
                      hint="Glisser-déposer ou Ctrl+V"
                      disabled={cniLoading === face}
                      existingFiles={url ? [{ name: `${label} enregistré`, kind: 'image' as const }] : []}
                      onRemoveExisting={() => setConfirmRemove({ type: 'cni', face })}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section id="profil-paiement" className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#004b57]" /> Paiement
            </h2>
            <p className="text-xs text-slate-500">
              Indiquez votre compte bancaire et/ou le numéro Mobile Money sur lequel on peut vous envoyer de l’argent.
            </p>
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-3 space-y-3">
                <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" /> Mobile Money
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Opérateur</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([['MIXX_BY_YAS', 'Mixx by Yas'], ['MOOV_MONEY', 'Moov Money']] as const).map(([val, lab]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setForm({ ...form, operateurMobileMoney: form.operateurMobileMoney === val ? '' : val })}
                          className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                            form.operateurMobileMoney === val
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-slate-300 text-slate-500 hover:border-slate-400'
                          }`}
                        >
                          {lab}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">N° Mobile Money</label>
                    <input
                      className="input-field"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder={PHONE_EXAMPLE}
                      value={form.numeroMobileMoney}
                      onChange={(e) => setForm({ ...form, numeroMobileMoney: cleanPhoneInput(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 space-y-3">
                <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Compte bancaire
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Banque</label>
                    {banques.length === 0 ? (
                      <p className="text-xs text-slate-500 border border-dashed border-slate-300 rounded-xl p-3">
                        Aucune banque disponible pour le moment — le comptable doit d’abord les ajouter.
                      </p>
                    ) : (
                      <select
                        className="input-field"
                        value={form.banqueNom}
                        onChange={(e) => setForm({ ...form, banqueNom: e.target.value })}
                      >
                        <option value="">— Choisir une banque —</option>
                        {banques.map((b) => (
                          <option key={b.id} value={b.nom}>{b.nom}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="label">RIB</label>
                    <input
                      className="input-field"
                      placeholder="Relevé d'identité bancaire"
                      value={form.rib}
                      onChange={(e) => setForm({ ...form, rib: e.target.value.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 40) })}
                    />
                  </div>
                  <div>
                    <label className="label">Code agence</label>
                    <input
                      className="input-field"
                      placeholder="Ex: 010"
                      value={form.codeAgence}
                      onChange={(e) => setForm({ ...form, codeAgence: e.target.value.replace(/[^A-Za-z0-9-]/g, '').slice(0, 12) })}
                    />
                  </div>
                  <div>
                    <label className="label">Intitulé du compte</label>
                    <input
                      className="input-field"
                      placeholder="Nom figurant sur le compte"
                      value={form.intituleCompte}
                      onChange={(e) => setForm({ ...form, intituleCompte: e.target.value.slice(0, 100) })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#004b57]" /> Mot de passe
            </h2>
            <p className="text-xs text-slate-500">Pour changer le mot de passe, saisissez d’abord l’ancien.</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Ancien mot de passe</label>
                <input
                  type="password"
                  className="input-field"
                  autoComplete="current-password"
                  value={form.ancienMotDePasse}
                  onChange={(e) => setForm({ ...form, ancienMotDePasse: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Nouveau</label>
                <input
                  type="password"
                  className="input-field"
                  autoComplete="new-password"
                  value={form.motDePasse}
                  onChange={(e) => setForm({ ...form, motDePasse: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Confirmer</label>
                <input
                  type="password"
                  className="input-field"
                  autoComplete="new-password"
                  value={form.confirmer}
                  onChange={(e) => setForm({ ...form, confirmer: e.target.value })}
                />
              </div>
            </div>
          </section>

          <div className="pt-2">
            <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto justify-center">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Enregistrer mon profil
            </button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmRemove != null}
        title={
          confirmRemove?.type === 'avatar'
            ? 'Retirer la photo de profil ?'
            : confirmRemove?.type === 'cni'
              ? `Retirer le ${confirmRemove.face === 'recto' ? 'recto' : 'verso'} de la CNI ?`
              : 'Confirmer la suppression'
        }
        message={
          confirmRemove?.type === 'avatar'
            ? 'Votre photo de profil sera définitivement retirée.'
            : confirmRemove?.type === 'cni'
              ? 'Cette image sera supprimée de votre dossier formateur.'
              : ''
        }
        confirmLabel="Retirer"
        danger
        onConfirm={confirmRemoveAction}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  );
}
