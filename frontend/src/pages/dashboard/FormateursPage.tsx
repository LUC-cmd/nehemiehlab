import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { centreService, userService } from '../../services/api';
import type { Centre, User } from '../../types';
import {
  Mail, Phone, Shield, Search, CheckCircle2,
  Building2, Clock, Calendar, MapPin, FileImage, Eye,
  Trash2, Play, Filter, Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageLoadingSkeleton } from '../../components/ui/DashboardSkeletons';
import { useMinDelayLoading } from '../../hooks/useMinDelayLoading';
import InscriptionsToggle from '../../components/dashboard/InscriptionsToggle';
import UserAvatar from '../../components/ui/UserAvatar';
import { formatFullName } from '../../utils/displayName';
import { computeFormateurExperience } from '../../utils/formateurExperience';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SecureImage from '../../components/ui/SecureImage';
import ValidationActionButton from '../../components/ui/ValidationActionButton';
import { ancienneteDate, formatAnciennete } from '../../utils/anciennete';

function formatDate(value?: string) {
  if (!value) return 'Non renseigné';
  try {
    return new Date(value).toLocaleDateString('fr-FR');
  } catch {
    return String(value).slice(0, 10);
  }
}

type AssignPicker = { centreId: string };

const emptyPicker = (): AssignPicker => ({ centreId: '' });

function centreLabel(c: Centre): string {
  const nomAvecCode = c.codeCdej ? `${c.nom} (${c.codeCdej})` : c.nom;
  const parts = [nomAvecCode, c.ville];
  if (c.region) parts.push(c.region);
  if (c.cluster) parts.push(c.cluster);
  return parts.filter(Boolean).join(' · ');
}

function centreHasOtherFormateur(centre: Centre, formateurId: number): boolean {
  return (centre.formateurs ?? []).some((f) => f.id !== formateurId);
}
function CniBadge({ formateur }: { formateur: User }) {
  const ok = Boolean(formateur.carteIdentiteRecto && formateur.carteIdentiteVerso);
  const partial = Boolean(formateur.carteIdentiteRecto || formateur.carteIdentiteVerso);
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
        <FileImage className="w-3 h-3" /> CNI complète
      </span>
    );
  }
  if (partial) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
        <FileImage className="w-3 h-3" /> CNI partielle
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
      <FileImage className="w-3 h-3" /> CNI manquante
    </span>
  );
}

export default function FormateursPage() {
  const { hasRole, user } = useAuth();
  const navigate = useNavigate();
  const [formateurs, setFormateurs] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [clusterFilter, setClusterFilter] = useState('');
  const [centreFilter, setCentreFilter] = useState('');
  const [validatingId, setValidatingId] = useState<number | null>(null);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [assignPickers, setAssignPickers] = useState<Record<number, AssignPicker>>({});
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [confirmRemoveCentre, setConfirmRemoveCentre] = useState<{
    formateurId: number;
    centreId: number;
    formateurName: string;
    centreName: string;
  } | null>(null);
  const [detailFormateur, setDetailFormateur] = useState<User | null>(null);
  const [confirmDeleteFormateur, setConfirmDeleteFormateur] = useState<User | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingAnciennete, setEditingAnciennete] = useState(false);
  const [ancienneteDraft, setAncienneteDraft] = useState('');
  const [savingAnciennete, setSavingAnciennete] = useState(false);
  const assignSectionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const skeletonLoading = useMinDelayLoading(loading, 220);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    setEditingAnciennete(false);
    setAncienneteDraft(detailFormateur?.dateEntree || '');
  }, [detailFormateur]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [formateursRes, centresRes] = await Promise.all([
        userService.getFormateurs(),
        hasRole('DIRECTEUR') ? centreService.getAll() : Promise.resolve({ data: [] }),
      ]);
      setFormateurs(formateursRes.data);
      setCentres(centresRes.data);
    } catch {
      toast.error('Erreur lors du chargement des formateurs.');
    } finally {
      setLoading(false);
    }
  };

  const handleValider = async (id: number) => {
    setValidatingId(id);
    try {
      const { data } = await userService.validerFormateur(id);
      toast.success(data?.message || 'Formateur validé. Vous pouvez lui assigner un ou plusieurs centres.');
      await fetchAll();
      setDetailFormateur((prev) => (prev?.id === id ? { ...prev, actif: true } : prev));
    } catch {
      toast.error('Erreur lors de la validation.');
    } finally {
      setValidatingId(null);
    }
  };

  const handleAssigner = async (formateurId: number) => {
    const picker = assignPickers[formateurId] || emptyPicker();
    const centreId = Number(picker.centreId);
    if (!centreId) {
      toast.error('Sélectionnez un centre.');
      return;
    }
    setAssigningId(formateurId);
    try {
      await centreService.assignerFormateur(centreId, formateurId);
      toast.success('Centre assigné au formateur.');
      setAssignPickers((current) => ({
        ...current,
        [formateurId]: emptyPicker(),
      }));
      await fetchAll();
      requestAnimationFrame(() => {
        assignSectionRefs.current[formateurId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      });
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string } | string } })?.response?.data;
      const message =
        (typeof data === 'string' ? data : data?.message) ||
        'Impossible d’assigner ce centre au formateur.';
      toast.error(message);
    } finally {
      setAssigningId(null);
    }
  };

  const handleRetirer = async () => {
    if (!confirmRemoveCentre) return;
    const { formateurId, centreId } = confirmRemoveCentre;
    const key = `${formateurId}-${centreId}`;
    setConfirmRemoveCentre(null);
    setRemovingKey(key);
    try {
      await centreService.retirerFormateur(centreId, formateurId);
      toast.success('Centre retiré de l’affectation.');
      await fetchAll();
    } catch {
      toast.error('Impossible de retirer ce centre.');
    } finally {
      setRemovingKey(null);
    }
  };

  const handleSupprimerCompteEnAttente = async () => {
    if (!confirmDeleteFormateur) return;
    const id = confirmDeleteFormateur.id;
    setConfirmDeleteFormateur(null);
    setDeletingId(id);
    try {
      await userService.supprimerCompteEnAttente(id);
      toast.success('Compte en attente supprimé définitivement.');
      setDetailFormateur((prev) => (prev?.id === id ? null : prev));
      await fetchAll();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string } | string } })?.response?.data;
      const message =
        (typeof data === 'string' ? data : data?.message) ||
        'Impossible de supprimer ce compte.';
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const saveAncienneteFormateur = async () => {
    if (!detailFormateur) return;
    setSavingAnciennete(true);
    try {
      const { data } = await userService.updateProfile(detailFormateur.id, { dateEntree: ancienneteDraft });
      toast.success('Ancienneté mise à jour.');
      setDetailFormateur(data);
      setEditingAnciennete(false);
      await fetchAll();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string } | string } })?.response?.data;
      const message =
        (typeof data === 'string' ? data : data?.message) ||
        "Impossible de mettre à jour l'ancienneté.";
      toast.error(message);
    } finally {
      setSavingAnciennete(false);
    }
  };

  const startSessionForCentre = (centreId: number) => {
    navigate(`/dashboard/sessions?centreId=${centreId}&action=new`);
  };

  const getPicker = (formateurId: number): AssignPicker =>
    assignPickers[formateurId] || emptyPicker();

  const setPickerField = (
    formateurId: number,
    field: keyof AssignPicker,
    value: string,
  ) => {
    setAssignPickers((current) => {
      const prev = current[formateurId] || emptyPicker();
      return { ...current, [formateurId]: { ...prev, [field]: value } };
    });
  };

  const isDir = hasRole('DIRECTEUR');
  const isFormateur = hasRole('FORMATEUR');
  const enAttente = formateurs.filter((f) => !f.actif);
  const actifs = formateurs.filter((f) => f.actif);

  const regions = useMemo(() => {
    const source = isDir && centres.length > 0
      ? centres
      : formateurs.flatMap((f) => f.centres || []);
    return [...new Set(source.map((c) => c.region).filter(Boolean) as string[])].sort();
  }, [centres, formateurs, isDir]);

  const pageClusters = useMemo(() => {
    const source = isDir && centres.length > 0
      ? centres
      : formateurs.flatMap((f) => f.centres || []);
    let list = source;
    if (regionFilter) list = list.filter((c) => c.region === regionFilter);
    return [...new Set(list.map((c) => c.cluster).filter(Boolean) as string[])].sort();
  }, [centres, formateurs, isDir, regionFilter]);

  const pageCentresOptions = useMemo(() => {
    const source = isDir && centres.length > 0
      ? centres
      : formateurs.flatMap((f) => f.centres || []);
    let list = source;
    if (regionFilter) list = list.filter((c) => c.region === regionFilter);
    if (clusterFilter) list = list.filter((c) => c.cluster === clusterFilter);
    const unique = [...new Map(list.map((c) => [c.id, c])).values()];
    return unique.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }, [centres, formateurs, isDir, regionFilter, clusterFilter]);

  const availableCentresFor = (formateur: User): Centre[] => {
    const assignedIds = new Set((formateur.centres || []).map((c) => c.id));
    return centres
      .filter((c) => {
        if (assignedIds.has(c.id)) return false;
        if (centreHasOtherFormateur(c, formateur.id)) return false;
        return true;
      })
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  };

  const filtered = useMemo(() => formateurs.filter((f) => {
    const searchLower = search.toLowerCase().trim();
    const matchName =
      !searchLower ||
      `${f.prenom} ${f.nom}`.toLowerCase().includes(searchLower) ||
      f.email.toLowerCase().includes(searchLower);
    const matchCentre =
      searchLower &&
      f.centres?.some(
        (c) =>
          c.nom.toLowerCase().includes(searchLower) ||
          (c.region && c.region.toLowerCase().includes(searchLower)) ||
          (c.cluster && c.cluster.toLowerCase().includes(searchLower)) ||
          c.ville.toLowerCase().includes(searchLower),
      );

    if (searchLower && !matchName && !matchCentre) return false;

    if (regionFilter && !f.centres?.some((c) => c.region === regionFilter)) return false;
    if (clusterFilter && !f.centres?.some((c) => c.cluster === clusterFilter)) return false;
    if (centreFilter && !f.centres?.some((c) => c.id === Number(centreFilter))) return false;

    return true;
  }), [formateurs, search, regionFilter, clusterFilter, centreFilter]);

  if (skeletonLoading) {
    return <PageLoadingSkeleton cardCount={6} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Formateurs</h1>
          <p className="text-slate-500 mt-1">
            Un formateur peut intervenir sur un ou plusieurs centres. Chaque centre ne peut avoir
            qu&apos;un seul formateur à la fois.
          </p>
        </div>
      </div>

      {isDir && (
        <div className="card border border-slate-200 bg-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-slate-900 font-semibold">Inscriptions formateurs (site public)</p>
              <p className="text-sm text-slate-500 mt-1">
                ON = bouton Inscription visible sur le site. OFF = masqué. Les nouveaux comptes
                restent inactifs jusqu&apos;à votre validation.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <InscriptionsToggle variant="page" />
              <span className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
                {enAttente.length} en attente
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
                {actifs.length} validés
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, centre..."
            className="input-field pl-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {(centres.length > 0 || regions.length > 0) && (
          <div className="card border border-dark-700 p-4 space-y-3">
            <p className="text-sm font-semibold text-white inline-flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#5ED9FF]" />
              Filtrer les formateurs
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-dark-400 mb-1">Région</label>
                <select
                  className="input-field text-sm"
                  value={regionFilter}
                  onChange={(e) => {
                    setRegionFilter(e.target.value);
                    setClusterFilter('');
                    setCentreFilter('');
                  }}
                >
                  <option value="">Toutes les régions</option>
                  {regions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-dark-400 mb-1">Cluster</label>
                <select
                  className="input-field text-sm"
                  value={clusterFilter}
                  onChange={(e) => {
                    setClusterFilter(e.target.value);
                    setCentreFilter('');
                  }}
                  disabled={!regionFilter && pageClusters.length === 0}
                >
                  <option value="">Tous les clusters</option>
                  {pageClusters.map((cl) => (
                    <option key={cl} value={cl}>{cl}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-dark-400 mb-1">Centre</label>
                <select
                  className="input-field text-sm"
                  value={centreFilter}
                  onChange={(e) => setCentreFilter(e.target.value)}
                >
                  <option value="">Tous les centres</option>
                  {pageCentresOptions.map((c) => (
                    <option key={c.id} value={c.id}>{centreLabel(c)}</option>
                  ))}
                </select>
              </div>
            </div>
            {(regionFilter || clusterFilter || centreFilter) && (
              <button
                type="button"
                className="text-xs text-[#5ED9FF] hover:underline"
                onClick={() => {
                  setRegionFilter('');
                  setClusterFilter('');
                  setCentreFilter('');
                }}
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}
      </div>

      {isDir && enAttente.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            À valider ({enAttente.filter((f) => filtered.includes(f)).length})
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered
              .filter((f) => !f.actif)
              .map((formateur) => (
                <div key={formateur.id} className="card border border-amber-500/30 bg-amber-500/5">
                  <div className="flex items-center gap-4 mb-4">
                    <UserAvatar user={formateur} size="md" rounded="xl" />
                    <div>
                      <h3 className="text-white font-bold">
                        {formatFullName(formateur.prenom, formateur.nom)}
                      </h3>
                      <span className="badge badge-warning mt-1">En attente de validation</span>
                      <div className="mt-2">
                        <CniBadge formateur={formateur} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-dark-300 mb-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-dark-400" />
                      <span className="truncate">{formateur.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-dark-400" />
                      <span>{formateur.telephone || 'Non renseigné'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-dark-400" />
                      <span>{formatDate(formateur.dateNaissance)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailFormateur(formateur)}
                      className="btn-ghost w-full justify-center"
                    >
                      <Eye className="w-4 h-4" />
                      Voir le dossier
                    </button>
                    <ValidationActionButton
                      fullWidth
                      size="lg"
                      variant="success"
                      icon={CheckCircle2}
                      loading={validatingId === formateur.id}
                      onClick={() => handleValider(formateur.id)}
                    >
                      {validatingId === formateur.id ? 'Validation…' : 'Valider le compte'}
                    </ValidationActionButton>
                    <ValidationActionButton
                      fullWidth
                      size="sm"
                      variant="danger"
                      icon={Trash2}
                      loading={deletingId === formateur.id}
                      onClick={() => setConfirmDeleteFormateur(formateur)}
                    >
                      {deletingId === formateur.id ? 'Suppression…' : 'Supprimer définitivement'}
                    </ValidationActionButton>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Formateurs ({filtered.filter((f) => f.actif || !isDir).length})</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered
            .filter((f) => (isDir ? f.actif : true))
            .map((formateur) => (
              <div key={formateur.id} className="card border border-dark-700 hover:border-dark-600 transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <UserAvatar user={formateur} size="md" rounded="xl" />
                  <div>
                    <h3 className="text-white font-bold">
                      {formatFullName(formateur.prenom, formateur.nom)}
                    </h3>
                    <span className={`badge mt-1 ${formateur.actif ? 'badge-success' : 'badge-warning'}`}>
                      {formateur.actif ? 'Compte validé' : 'En attente'}
                    </span>
                    {formateur.centres && formateur.centres.length > 0 && (
                      <span className="ml-2 badge bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">
                        {formateur.centres.length} centre{formateur.centres.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {isDir && (
                      <div className="mt-2">
                        <CniBadge formateur={formateur} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-dark-800 text-sm">
                  <div className="flex items-center gap-2 text-dark-300">
                    <Mail className="w-4 h-4 text-dark-400" />
                    <span className="truncate">{formateur.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-dark-300">
                    <Phone className="w-4 h-4 text-dark-400" />
                    <span>{formateur.telephone || 'Non renseigné'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-dark-300">
                    <Shield className="w-4 h-4 text-dark-400" />
                    <span className="text-xs uppercase tracking-wider font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                      Formateur
                    </span>
                  </div>
                </div>

                {isDir && (
                  <button
                    type="button"
                    onClick={() => setDetailFormateur(formateur)}
                    className="btn-ghost w-full justify-center mt-3"
                  >
                    <Eye className="w-4 h-4" />
                    Voir le dossier / CNI
                  </button>
                )}

                <div
                  className="mt-4 pt-4 border-t border-dark-800"
                  ref={(el) => {
                    assignSectionRefs.current[formateur.id] = el;
                  }}
                >
                  <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider block mb-2">
                    Centres d&apos;affectation
                  </span>

                  {formateur.centres && formateur.centres.length > 0 ? (
                    <div className="flex flex-col gap-2 mb-3">
                      {formateur.centres.map((c) => {
                        const removeKey = `${formateur.id}-${c.id}`;
                        const isOwnProfile = isFormateur && user?.id === formateur.id;
                        return (
                          <div
                            key={c.id}
                            className="text-xs p-2.5 rounded-lg bg-dark-800 border border-dark-700"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-semibold text-white">{c.codeCdej ? `${c.nom} (${c.codeCdej})` : c.nom}</div>
                                <div className="text-dark-400 mt-0.5">
                                  {c.ville}
                                  {c.region ? ` · ${c.region}` : ''}
                                  {c.cluster ? ` · ${c.cluster}` : ''}
                                </div>
                              </div>
                              {isDir && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmRemoveCentre({
                                      formateurId: formateur.id,
                                      centreId: c.id,
                                      formateurName: formatFullName(formateur.prenom, formateur.nom),
                                      centreName: c.codeCdej ? `${c.nom} (${c.codeCdej})` : c.nom,
                                    })
                                  }
                                  disabled={removingKey === removeKey}
                                  className="shrink-0 p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                                  title="Retirer ce centre"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            {isOwnProfile && formateur.actif && (
                              <button
                                type="button"
                                onClick={() => startSessionForCentre(c.id)}
                                className="mt-2 w-full btn-primary py-1.5 text-xs justify-center"
                              >
                                <Play className="w-3.5 h-3.5" />
                                Démarrer une séance
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-dark-500 italic mb-3">Aucun centre assigné</p>
                  )}

                  {isDir && formateur.actif && (() => {
                    const picker = getPicker(formateur.id);
                    const options = availableCentresFor(formateur);
                    const experience = computeFormateurExperience(formateur.totalHeuresSeances);
                    return (
                      <div className="space-y-2 rounded-xl border border-dashed border-dark-600 p-3 bg-dark-900/30">
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-1.5 text-xs font-medium text-dark-300">
                            <Building2 className="w-3.5 h-3.5" />
                            {formateur.centres?.length ? 'Ajouter un centre' : 'Assigner un centre'}
                          </label>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${experience.badgeClass}`}>
                            {experience.label} · {Math.round(formateur.totalHeuresSeances ?? 0)} h
                          </span>
                        </div>
                        <select
                          className="input-field text-sm"
                          value={picker.centreId}
                          onChange={(e) => setPickerField(formateur.id, 'centreId', e.target.value)}
                        >
                          <option value="">
                            {options.length === 0
                              ? 'Aucun centre disponible'
                              : 'Choisir un centre…'}
                          </option>
                          {options.map((centre) => (
                            <option key={centre.id} value={centre.id}>
                              {centreLabel(centre)}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-dark-500 leading-relaxed">
                          Sélectionnez directement le centre à assigner. Un centre = un formateur à la fois.
                        </p>
                        <button
                          type="button"
                          className="btn-primary w-full justify-center disabled:opacity-50 text-sm py-2"
                          disabled={
                            !picker.centreId || assigningId === formateur.id || options.length === 0
                          }
                          onClick={() => handleAssigner(formateur.id)}
                        >
                          {assigningId === formateur.id ? 'Assignation…' : 'Assigner'}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}

          {filtered.filter((f) => (isDir ? f.actif : true)).length === 0 && (
            <div className="col-span-full card text-center py-12 text-dark-500">
              Aucun formateur trouvé.
            </div>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(detailFormateur)}
        title={detailFormateur ? `${detailFormateur.prenom} ${detailFormateur.nom}` : 'Dossier formateur'}
        subtitle="Informations d’inscription et carte d’identité"
        size="lg"
        onClose={() => setDetailFormateur(null)}
        footer={
          detailFormateur && !detailFormateur.actif ? (
            <ValidationActionButton
              size="lg"
              variant="success"
              icon={CheckCircle2}
              loading={validatingId === detailFormateur.id}
              onClick={() => handleValider(detailFormateur.id)}
            >
              {validatingId === detailFormateur.id ? 'Validation…' : 'Valider le compte'}
            </ValidationActionButton>
          ) : undefined
        }
      >
        {detailFormateur && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <UserAvatar user={detailFormateur} size="lg" rounded="xl" />
              <div>
                <p className="font-bold text-slate-900 text-lg">
                  {detailFormateur.prenom} {detailFormateur.nom}
                </p>
                <p className="text-sm text-slate-500">{detailFormateur.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`badge ${detailFormateur.actif ? 'badge-success' : 'badge-warning'}`}>
                    {detailFormateur.actif ? 'Compte validé' : 'En attente'}
                  </span>
                  <CniBadge formateur={detailFormateur} />
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" /> Téléphone</p>
                <p className="font-medium text-slate-800 mt-0.5">{detailFormateur.telephone || '—'}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> Date de naissance</p>
                <p className="font-medium text-slate-800 mt-0.5">{formatDate(detailFormateur.dateNaissance)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Lieu de naissance</p>
                <p className="font-medium text-slate-800 mt-0.5">{detailFormateur.lieuNaissance || '—'}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Adresse</p>
                <p className="font-medium text-slate-800 mt-0.5">{detailFormateur.adresse || '—'}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:col-span-2">
                <p className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Ancienneté</p>
                {editingAnciennete ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      className="input-field text-sm py-1.5"
                      max={new Date().toISOString().split('T')[0]}
                      value={ancienneteDraft}
                      onChange={(e) => setAncienneteDraft(e.target.value)}
                    />
                    <button
                      type="button"
                      disabled={savingAnciennete}
                      onClick={saveAncienneteFormateur}
                      className="btn-primary text-xs px-3 py-1.5 disabled:opacity-60"
                    >
                      {savingAnciennete ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingAnciennete(false)}
                      className="btn-ghost text-xs px-3 py-1.5"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <p className="font-medium text-slate-800 mt-0.5 flex items-center gap-2">
                    {formatAnciennete(ancienneteDate(detailFormateur))}
                    {isDir && (
                      <button
                        type="button"
                        onClick={() => setEditingAnciennete(true)}
                        title="Modifier l'ancienneté"
                        className="text-slate-400 hover:text-[#004b57] transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <FileImage className="w-4 h-4 text-[#004b57]" />
                Carte d’identité
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {([
                  ['Recto', detailFormateur.carteIdentiteRecto],
                  ['Verso', detailFormateur.carteIdentiteVerso],
                ] as const).map(([label, url]) => (
                  <div key={label} className="rounded-xl border border-slate-200 p-2 bg-white">
                    <p className="text-xs font-semibold text-slate-600 mb-1.5">{label}</p>
                    {url ? (
                      <SecureImage
                        path={url}
                        alt={`CNI ${label}`}
                        className="w-full h-44 object-cover rounded-lg border border-slate-100"
                      />
                    ) : (
                      <div className="h-44 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 bg-slate-50">
                        Non fourni
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmRemoveCentre != null}
        title="Retirer ce centre ?"
        message={
          confirmRemoveCentre
            ? `Retirer le centre « ${confirmRemoveCentre.centreName} » de l’affectation de ${confirmRemoveCentre.formateurName} ?`
            : ''
        }
        confirmLabel="Retirer"
        danger
        onConfirm={handleRetirer}
        onCancel={() => setConfirmRemoveCentre(null)}
      />

      <ConfirmDialog
        open={confirmDeleteFormateur != null}
        title="Supprimer définitivement ce compte ?"
        message={
          confirmDeleteFormateur
            ? `Cette action est irréversible : le compte de ${formatFullName(confirmDeleteFormateur.prenom, confirmDeleteFormateur.nom)} (${confirmDeleteFormateur.email}) et toutes ses données (documents fournis, informations personnelles) seront supprimés définitivement. Cette suppression n’est possible que pour les comptes en attente de validation.`
            : ''
        }
        confirmLabel="Supprimer définitivement"
        danger
        requireTypedConfirmation={confirmDeleteFormateur?.email}
        typedConfirmationLabel={
          confirmDeleteFormateur ? (
            <>
              Pour confirmer, retapez l’email du compte :{' '}
              <span className="font-mono font-semibold text-slate-700">{confirmDeleteFormateur.email}</span>
            </>
          ) : undefined
        }
        onConfirm={handleSupprimerCompteEnAttente}
        onCancel={() => setConfirmDeleteFormateur(null)}
      />
    </div>
  );
}
