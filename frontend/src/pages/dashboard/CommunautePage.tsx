import React, { useEffect, useMemo, useState } from 'react';
import {
  Users, Search, UserCircle2, Plus, Trash2, Save, Phone, Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { contentManagementService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../constants/roleAccess';
import type { CommunityProfile, CommunityProfileType, Role } from '../../types';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import MediaDropZone from '../../components/ui/MediaDropZone';
import Modal from '../../components/ui/Modal';
import { mediaUrl } from '../../utils/media';

const PROFILE_TYPE_OPTIONS: { value: CommunityProfileType; label: string }[] = [
  { value: 'SKA_TEACHER', label: 'Formateur SKA' },
  { value: 'AUTRE_PARTICIPANT', label: 'Membre CEDJ' },
];

function profileTypeLabel(type?: CommunityProfileType): string {
  return PROFILE_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? 'Membre CEDJ';
}

function defaultProfileType(role: Role | null): CommunityProfileType {
  return role === 'FORMATEUR' ? 'SKA_TEACHER' : 'AUTRE_PARTICIPANT';
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

function validateProfileForm(data: Partial<CommunityProfile>): string | null {
  if (!data.nomComplet?.trim() || data.nomComplet.trim().length < 2) {
    return 'Indiquez un nom complet (2 caractères minimum).';
  }
  if (normalizePhone(data.contacts || '').length < 8) {
    return 'Un numéro de téléphone valide est obligatoire.';
  }
  if (!data.type) {
    return 'Choisissez un type de profil.';
  }
  return null;
}

function apiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
  return data?.message || fallback;
}

function toPayload(data: Partial<CommunityProfile>): Partial<CommunityProfile> {
  return {
    nomComplet: data.nomComplet?.trim(),
    type: data.type,
    roleAffiche: data.roleAffiche?.trim() || undefined,
    bio: data.bio?.trim() || undefined,
    competences: data.competences?.trim() || undefined,
    contacts: normalizePhone(data.contacts || ''),
    enfantsAccompagnes: data.type === 'SKA_TEACHER' ? Math.max(0, data.enfantsAccompagnes || 0) : 0,
    actif: data.actif ?? true,
  };
}

const emptyProfile = (): Partial<CommunityProfile> => ({
  nomComplet: '',
  type: 'AUTRE_PARTICIPANT',
  roleAffiche: '',
  bio: '',
  enfantsAccompagnes: 0,
  competences: '',
  contacts: '',
  actif: true,
});

interface ProfileCardProps {
  profile: CommunityProfile;
  isDirector: boolean;
  onEdit: (profile: CommunityProfile) => void;
  onDelete: (id: number) => void;
  accent?: 'primary' | 'neutral';
}

function ProfileCard({ profile, isDirector, onEdit, onDelete, accent = 'neutral' }: ProfileCardProps) {
  const iconWrap =
    accent === 'primary'
      ? 'bg-primary-500/15 border-primary-500/25 text-primary-400'
      : 'bg-dark-800 border-dark-700 text-dark-300';

  const competences = (profile.competences || '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

  return (
    <div className="card border border-dark-700 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center overflow-hidden shrink-0 ${iconWrap}`}>
          {profile.photoUrl ? (
            <img
              src={mediaUrl(profile.photoUrl)}
              alt={profile.nomComplet}
              className="w-full h-full object-cover"
            />
          ) : (
            <UserCircle2 className="w-5 h-5" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold truncate">{profile.nomComplet}</p>
          <p className="text-xs text-dark-400 truncate">
            {profile.roleAffiche || profileTypeLabel(profile.type)}
          </p>
        </div>
      </div>

      <p className="text-sm text-dark-300 flex-1">
        {profile.bio?.trim() || 'Présentation en cours de rédaction.'}
      </p>

      {profile.contacts && (
        <p className="text-xs text-dark-400 mt-2 inline-flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 shrink-0" />
          {profile.contacts}
        </p>
      )}

      {profile.type === 'SKA_TEACHER' && (profile.enfantsAccompagnes ?? 0) > 0 && (
        <p className="text-xs text-primary-400 mt-1">
          {profile.enfantsAccompagnes} enfant{(profile.enfantsAccompagnes ?? 0) > 1 ? 's' : ''} accompagné{(profile.enfantsAccompagnes ?? 0) > 1 ? 's' : ''}
        </p>
      )}

      {competences.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {competences.slice(0, 4).map((c) => (
            <span
              key={c}
              className="text-[10px] px-2 py-0.5 rounded-full bg-dark-800 border border-dark-700 text-dark-300"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {isDirector && (
        <div className="mt-4 pt-3 border-t border-dark-700 flex gap-3">
          <button
            type="button"
            onClick={() => onEdit(profile)}
            className="inline-flex items-center gap-1 text-xs text-[#5ED9FF] hover:text-[#7ee4ff]"
          >
            <Pencil className="w-3.5 h-3.5" />
            Modifier
          </button>
          <button
            type="button"
            onClick={() => onDelete(profile.id)}
            className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

export default function CommunautePage() {
  const { role, user } = useAuth();
  const isDirector = role === 'DIRECTEUR';
  const canEditSelf = !!role && role !== 'PARENT';
  const isFormateur = role === 'FORMATEUR';

  const [profiles, setProfiles] = useState<CommunityProfile[]>([]);
  const [search, setSearch] = useState('');
  const [myForm, setMyForm] = useState<Partial<CommunityProfile>>(emptyProfile());
  const [directorForm, setDirectorForm] = useState<Partial<CommunityProfile>>(emptyProfile());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [myPhotoFile, setMyPhotoFile] = useState<File | null>(null);
  const [directorPhotoFile, setDirectorPhotoFile] = useState<File | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showDirectorModal, setShowDirectorModal] = useState(false);
  const [savingMy, setSavingMy] = useState(false);
  const [savingDirector, setSavingDirector] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    contentManagementService
      .getCommunaute()
      .then((r) => setProfiles(r.data || []))
      .catch(() => {
        setProfiles([]);
        toast.error('Impossible de charger la communauté.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!canEditSelf) return;
    contentManagementService
      .getMonProfilCommunaute()
      .then((r) => {
        if (r.data) {
          setMyForm(r.data);
        } else {
          setMyForm({
            ...emptyProfile(),
            nomComplet: `${user?.prenom || ''} ${user?.nom || ''}`.trim(),
            type: defaultProfileType(role),
            roleAffiche: role ? ROLE_LABELS[role] : '',
          });
        }
      })
      .catch(() => {
        setMyForm({
          ...emptyProfile(),
          nomComplet: `${user?.prenom || ''} ${user?.nom || ''}`.trim(),
          type: defaultProfileType(role),
          roleAffiche: role ? ROLE_LABELS[role] : '',
        });
      });
  }, [canEditSelf, role, user?.nom, user?.prenom]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return profiles;
    return profiles.filter((p) =>
      (p.nomComplet || '').toLowerCase().includes(q) ||
      (p.roleAffiche || '').toLowerCase().includes(q) ||
      (p.competences || '').toLowerCase().includes(q),
    );
  }, [profiles, search]);

  const teachers = filtered.filter((p) => p.type === 'SKA_TEACHER');
  const stakeholders = filtered.filter((p) => p.type !== 'SKA_TEACHER');

  const saveMyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = toPayload({
      ...myForm,
      type: defaultProfileType(role),
      roleAffiche: role ? ROLE_LABELS[role] : myForm.roleAffiche,
    });
    const error = validateProfileForm(payload);
    if (error) {
      toast.error(error);
      return;
    }
    setSavingMy(true);
    try {
      await contentManagementService.saveMonProfilCommunaute(payload);
      if (myPhotoFile) {
        const uploaded = await contentManagementService.uploadMaPhotoCommunaute(myPhotoFile);
        if (uploaded.data?.photoUrl) {
          setMyForm((prev) => ({ ...prev, photoUrl: uploaded.data.photoUrl }));
        }
        setMyPhotoFile(null);
      }
      toast.success('Profil mis à jour.');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Impossible d’enregistrer votre profil.'));
    } finally {
      setSavingMy(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setDirectorPhotoFile(null);
    setDirectorForm(emptyProfile());
    setShowDirectorModal(true);
  };

  const startEditDirectorProfile = (profile: CommunityProfile) => {
    setEditingId(profile.id);
    setDirectorPhotoFile(null);
    setDirectorForm({
      nomComplet: profile.nomComplet,
      type: profile.type,
      roleAffiche: profile.roleAffiche || '',
      bio: profile.bio || '',
      photoUrl: profile.photoUrl || '',
      enfantsAccompagnes: profile.enfantsAccompagnes || 0,
      competences: profile.competences || '',
      contacts: profile.contacts || '',
      actif: profile.actif,
    });
    setShowDirectorModal(true);
  };

  const closeDirectorModal = () => {
    setShowDirectorModal(false);
    setEditingId(null);
    setDirectorPhotoFile(null);
    setDirectorForm(emptyProfile());
  };

  const saveDirectorProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = toPayload(directorForm);
    const error = validateProfileForm(payload);
    if (error) {
      toast.error(error);
      return;
    }
    setSavingDirector(true);
    try {
      if (editingId) {
        await contentManagementService.updateCommunaute(editingId, payload);
        if (directorPhotoFile) {
          await contentManagementService.uploadCommunautePhoto(editingId, directorPhotoFile);
        }
        toast.success('Profil modifié.');
      } else {
        const created = await contentManagementService.createCommunaute(payload);
        const createdId = created?.data?.id;
        if (createdId && directorPhotoFile) {
          await contentManagementService.uploadCommunautePhoto(createdId, directorPhotoFile);
        }
        toast.success('Membre ajouté à la communauté.');
      }
      closeDirectorModal();
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Impossible d’enregistrer ce profil.'));
    } finally {
      setSavingDirector(false);
    }
  };

  const confirmDeleteProfile = async () => {
    if (confirmDeleteId == null) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      await contentManagementService.deleteCommunaute(id);
      toast.success('Profil supprimé.');
      load();
    } catch {
      toast.error('Impossible de supprimer le profil.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Communauté CEDJ</h1>
          <p className="text-dark-400 mt-1">
            Annuaire interne : formateurs SKA et membres de la communauté.
          </p>
        </div>
        {isDirector && (
          <button type="button" onClick={openCreateModal} className="btn-primary shrink-0">
            <Plus className="w-4 h-4" />
            Ajouter un membre
          </button>
        )}
      </div>

      {canEditSelf && (
        <form onSubmit={saveMyProfile} className="card border border-dark-700 space-y-4">
          <div>
            <h2 className="text-white font-semibold inline-flex items-center gap-2">
              <Save className="w-4 h-4" />
              Mon profil
            </h2>
            <p className="text-sm text-dark-400 mt-1">
              Complétez vos informations pour apparaître dans l’annuaire CEDJ.
            </p>
          </div>

          <div className="grid lg:grid-cols-[auto,1fr] gap-4 items-start">
            <MediaDropZone
              compact
              files={myPhotoFile ? [myPhotoFile] : []}
              onChange={(files) => setMyPhotoFile(files[0] || null)}
              accept="image/*"
              maxSizeMb={5}
              label="Photo"
              hint="JPG ou PNG, 5 Mo max"
              existingFiles={
                myForm.photoUrl && !myPhotoFile
                  ? [{ name: 'Photo actuelle', url: mediaUrl(myForm.photoUrl), kind: 'image' }]
                  : []
              }
            />
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-dark-400 mb-1">Nom complet *</label>
                <input
                  className="input-field"
                  placeholder="Ex. Ama Koffi"
                  value={myForm.nomComplet || ''}
                  onChange={(e) => setMyForm((p) => ({ ...p, nomComplet: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-dark-400 mb-1">Fonction</label>
                <div className="input-field bg-dark-800/60 text-dark-300 cursor-default">
                  {role ? ROLE_LABELS[role] : '—'}
                </div>
              </div>
              <div>
                <label className="block text-xs text-dark-400 mb-1">Téléphone *</label>
                <input
                  className="input-field"
                  type="tel"
                  placeholder="Ex. +228 90 00 00 00"
                  value={myForm.contacts || ''}
                  onChange={(e) => setMyForm((p) => ({ ...p, contacts: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-dark-400 mb-1">Présentation</label>
            <textarea
              className="input-field min-h-[88px]"
              placeholder="Quelques mots sur votre rôle dans la communauté…"
              maxLength={500}
              value={myForm.bio || ''}
              onChange={(e) => setMyForm((p) => ({ ...p, bio: e.target.value }))}
            />
            <p className="text-[11px] text-dark-500 mt-1">{(myForm.bio || '').length}/500</p>
          </div>

          <div>
            <label className="block text-xs text-dark-400 mb-1">Compétences (optionnel)</label>
            <input
              className="input-field"
              placeholder="Ex. Scratch, animation, gestion de groupe"
              value={myForm.competences || ''}
              onChange={(e) => setMyForm((p) => ({ ...p, competences: e.target.value }))}
            />
          </div>

          {isFormateur && (
            <div className="max-w-xs">
              <label className="block text-xs text-dark-400 mb-1">Enfants accompagnés</label>
              <input
                className="input-field"
                type="number"
                min={0}
                max={9999}
                value={myForm.enfantsAccompagnes ?? 0}
                onChange={(e) =>
                  setMyForm((p) => ({ ...p, enfantsAccompagnes: Number(e.target.value) || 0 }))
                }
              />
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={savingMy}>
            {savingMy ? 'Enregistrement…' : 'Enregistrer mon profil'}
          </button>
        </form>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un membre…"
          className="input-field pl-11"
        />
      </div>

      <section className="space-y-4">
        <h2 className="text-white font-semibold">Formateurs SKA</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {teachers.map((u) => (
            <ProfileCard
              key={u.id}
              profile={u}
              isDirector={isDirector}
              onEdit={startEditDirectorProfile}
              onDelete={setConfirmDeleteId}
              accent="primary"
            />
          ))}
          {!loading && teachers.length === 0 && (
            <div className="col-span-full card text-center py-10 text-dark-500">
              Aucun formateur SKA pour le moment.
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-white font-semibold">Membres CEDJ</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {stakeholders.map((u) => (
            <ProfileCard
              key={u.id}
              profile={u}
              isDirector={isDirector}
              onEdit={startEditDirectorProfile}
              onDelete={setConfirmDeleteId}
            />
          ))}
          {!loading && stakeholders.length === 0 && (
            <div className="col-span-full card text-center py-10 text-dark-500">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Aucun autre membre pour le moment.
            </div>
          )}
        </div>
      </section>

      <Modal
        open={showDirectorModal}
        title={editingId ? 'Modifier le profil' : 'Ajouter un membre'}
        subtitle="Renseignez les informations essentielles du membre."
        size="lg"
        onClose={closeDirectorModal}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={closeDirectorModal}>
              Annuler
            </button>
            <button
              type="submit"
              form="director-profile-form"
              className="btn-primary"
              disabled={savingDirector}
            >
              {savingDirector ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Ajouter'}
            </button>
          </>
        }
      >
        <form id="director-profile-form" onSubmit={saveDirectorProfile} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet *</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                placeholder="Ex. Ama Koffi"
                value={directorForm.nomComplet || ''}
                onChange={(e) => setDirectorForm((p) => ({ ...p, nomComplet: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type de profil *</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 bg-white"
                value={directorForm.type || 'AUTRE_PARTICIPANT'}
                onChange={(e) =>
                  setDirectorForm((p) => ({
                    ...p,
                    type: e.target.value as CommunityProfileType,
                    enfantsAccompagnes: e.target.value === 'SKA_TEACHER' ? p.enfantsAccompagnes : 0,
                  }))
                }
              >
                {PROFILE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fonction affichée</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                placeholder="Ex. Coordinateur régional"
                value={directorForm.roleAffiche || ''}
                onChange={(e) => setDirectorForm((p) => ({ ...p, roleAffiche: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone *</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                type="tel"
                placeholder="Ex. +228 90 00 00 00"
                value={directorForm.contacts || ''}
                onChange={(e) => setDirectorForm((p) => ({ ...p, contacts: e.target.value }))}
                required
              />
            </div>
          </div>

          <MediaDropZone
            compact
            files={directorPhotoFile ? [directorPhotoFile] : []}
            onChange={(files) => setDirectorPhotoFile(files[0] || null)}
            accept="image/*"
            maxSizeMb={5}
            label="Photo de profil"
            hint="JPG ou PNG, 5 Mo max"
            existingFiles={
              directorForm.photoUrl && !directorPhotoFile
                ? [{ name: 'Photo actuelle', url: mediaUrl(directorForm.photoUrl), kind: 'image' }]
                : []
            }
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Présentation</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 min-h-[88px]"
              placeholder="Courte présentation du membre…"
              maxLength={500}
              value={directorForm.bio || ''}
              onChange={(e) => setDirectorForm((p) => ({ ...p, bio: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Compétences (optionnel)</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              placeholder="Séparez par des virgules"
              value={directorForm.competences || ''}
              onChange={(e) => setDirectorForm((p) => ({ ...p, competences: e.target.value }))}
            />
          </div>

          {directorForm.type === 'SKA_TEACHER' && (
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-slate-700 mb-1">Enfants accompagnés</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                type="number"
                min={0}
                max={9999}
                value={directorForm.enfantsAccompagnes ?? 0}
                onChange={(e) =>
                  setDirectorForm((p) => ({
                    ...p,
                    enfantsAccompagnes: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDeleteId != null}
        title="Supprimer ce profil ?"
        message="Le profil sera définitivement retiré de la communauté CEDJ."
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmDeleteProfile}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
