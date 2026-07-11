import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, ExternalLink, Filter, Plus, Search, Trash2,
  UserCircle2, Sparkles, MapPin, Star, FolderKanban,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { centreService, contentManagementService, eleveService } from '../../services/api';
import type { Centre, Eleve, EnfantProfilePublic, EnfantProject, ProjectMediaType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { mediaUrl } from '../../utils/media';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import MediaDropZone from '../../components/ui/MediaDropZone';
import Modal from '../../components/ui/Modal';

function toScratchEmbed(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/projects\/(\d+)/i);
  if (!match) return null;
  return `https://scratch.mit.edu/projects/${match[1]}/embed`;
}

function isSb3(url?: string | null): boolean {
  return Boolean(url && /\.sb3($|\?)/i.test(url));
}

function turboWarpEmbedUrl(filePath: string): string {
  const absolute = `${window.location.origin}${mediaUrl(filePath)}`;
  return `https://turbowarp.org/embed?project_url=${encodeURIComponent(absolute)}`;
}

function downloadFileName(titre: string, url?: string): string {
  const base = (titre || 'projet')
    .trim()
    .replace(/[^\w\-àâäéèêëïîôùûüç]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'projet';
  if (url && /\.sb3($|\?)/i.test(url)) return `${base}.sb3`;
  if (url && /\.(png|jpe?g|gif|webp)($|\?)/i.test(url)) return `${base}${url.match(/\.(png|jpe?g|gif|webp)/i)?.[0] || '.png'}`;
  if (url && /\.(mp4|webm|mov)($|\?)/i.test(url)) return `${base}${url.match(/\.(mp4|webm|mov)/i)?.[0] || '.mp4'}`;
  return base;
}

const emptyEnfant: Partial<EnfantProfilePublic> = {
  nom: '',
  prenom: '',
  age: 8,
  centre: '',
  centreId: undefined,
  region: '',
  cluster: '',
  presentation: '',
  pointsForts: '',
  photoUrl: '',
  eleveId: undefined,
  actif: true,
};

const emptyProject: Partial<EnfantProject> = {
  titre: '',
  description: '',
  mediaType: 'SCRATCH',
  mediaUrl: '',
  actif: true,
};

type ViewMode = 'profils' | 'projets';

export default function ProfilsEnfantsPage() {
  const { role, user } = useAuth();
  const location = useLocation();
  const canManage = role === 'DIRECTEUR' || role === 'FORMATEUR' || role === 'COORDINATEUR' || role === 'RESPONSABLE_CLUSTER';
  const isDirecteur = role === 'DIRECTEUR';

  const [profiles, setProfiles] = useState<EnfantProfilePublic[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [cluster, setCluster] = useState('');
  const [centreFilter, setCentreFilter] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('profils');

  const [enfantForm, setEnfantForm] = useState<Partial<EnfantProfilePublic>>(emptyEnfant);
  const [projectForm, setProjectForm] = useState<Partial<EnfantProject>>(emptyProject);
  const [selectedEnfantId, setSelectedEnfantId] = useState<number | null>(null);
  const [editingEnfantId, setEditingEnfantId] = useState<number | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [enfantPhotoFile, setEnfantPhotoFile] = useState<File | null>(null);
  const [projectMediaFile, setProjectMediaFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [showEnfantModal, setShowEnfantModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [detailEnfant, setDetailEnfant] = useState<EnfantProfilePublic | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'enfant' | 'project'; id: number } | null>(null);

  const [pickerRegion, setPickerRegion] = useState('');
  const [pickerCluster, setPickerCluster] = useState('');
  const [pickerCentreId, setPickerCentreId] = useState('');
  const [centreEleves, setCentreEleves] = useState<Eleve[]>([]);
  const [loadingCentreEleves, setLoadingCentreEleves] = useState(false);
  const [selectedEleveId, setSelectedEleveId] = useState<number | null>(null);

  const load = () => {
    contentManagementService
      .getEnfants()
      .then((r) => setProfiles(r.data || []))
      .catch(() => {
        setProfiles([]);
        toast.error('Impossible de charger les profils enfants.');
      });
  };

  useEffect(() => {
    load();
    const req = isDirecteur ? centreService.getAll() : centreService.getMesCentres();
    req.then((r) => setCentres(r.data || [])).catch(() => setCentres([]));
  }, [isDirecteur]);

  useEffect(() => {
    const focusId = (location.state as { focusEnfantId?: number } | null)?.focusEnfantId;
    if (focusId && profiles.length) {
      const found = profiles.find((p) => p.id === focusId);
      if (found) setDetailEnfant(found);
    }
  }, [location.state, profiles]);

  useEffect(() => {
    if (!pickerCentreId || editingEnfantId) {
      setCentreEleves([]);
      return;
    }
    setLoadingCentreEleves(true);
    eleveService
      .getByCentre(Number(pickerCentreId))
      .then((r) => setCentreEleves(r.data || []))
      .catch(() => {
        setCentreEleves([]);
        toast.error('Impossible de charger les élèves du centre.');
      })
      .finally(() => setLoadingCentreEleves(false));
  }, [pickerCentreId, editingEnfantId]);

  const resetPicker = () => {
    setPickerRegion('');
    setPickerCluster('');
    setPickerCentreId('');
    setCentreEleves([]);
    setSelectedEleveId(null);
  };

  const applyEleveToForm = (eleve: Eleve) => {
    const centreRef = centres.find((c) => c.id === eleve.centre?.id) || eleve.centre;
    setEnfantForm({
      nom: eleve.nom,
      prenom: eleve.prenom,
      age: eleve.age,
      centreId: centreRef?.id,
      centre: centreRef?.nom || eleve.centre?.nom || '',
      region: centreRef?.region || '',
      cluster: centreRef?.cluster || '',
      eleveId: eleve.id,
      presentation: enfantForm.presentation || '',
      pointsForts: enfantForm.pointsForts || '',
      photoUrl: enfantForm.photoUrl || '',
      actif: true,
    });
  };

  const regions = useMemo(
    () => Array.from(new Set(centres.map((c) => c.region).filter(Boolean))) as string[],
    [centres],
  );
  const clusters = useMemo(() => {
    const source = region ? centres.filter((c) => c.region === region) : centres;
    return Array.from(new Set(source.map((c) => c.cluster).filter(Boolean))) as string[];
  }, [centres, region]);
  const filteredCentres = useMemo(
    () =>
      centres.filter((c) => {
        if (region && c.region !== region) return false;
        if (cluster && c.cluster !== cluster) return false;
        return true;
      }),
    [centres, region, cluster],
  );

  const pickerRegions = useMemo(
    () => Array.from(new Set(centres.map((c) => c.region).filter(Boolean))) as string[],
    [centres],
  );
  const pickerClusters = useMemo(() => {
    const source = pickerRegion ? centres.filter((c) => c.region === pickerRegion) : centres;
    return Array.from(new Set(source.map((c) => c.cluster).filter(Boolean))) as string[];
  }, [centres, pickerRegion]);
  const pickerCentres = useMemo(
    () =>
      centres.filter((c) => {
        if (pickerRegion && c.region !== pickerRegion) return false;
        if (pickerCluster && c.cluster !== pickerCluster) return false;
        return true;
      }),
    [centres, pickerRegion, pickerCluster],
  );

  const linkedEleveIds = useMemo(
    () => new Set(profiles.map((p) => p.eleveId).filter((id): id is number => id != null)),
    [profiles],
  );

  const matchesGeo = (p: EnfantProfilePublic) => {
    if (region) {
      const ok =
        p.region === region ||
        centres.some((c) => c.id === p.centreId && c.region === region) ||
        centres.some((c) => c.nom === p.centre && c.region === region);
      if (!ok) return false;
    }
    if (cluster) {
      const ok =
        p.cluster === cluster ||
        centres.some((c) => c.id === p.centreId && c.cluster === cluster) ||
        centres.some((c) => c.nom === p.centre && c.cluster === cluster);
      if (!ok) return false;
    }
    if (centreFilter) {
      const id = Number(centreFilter);
      if (p.centreId !== id && !centres.some((c) => c.id === id && c.nom === p.centre)) return false;
    }
    return true;
  };

  const filteredProfiles = useMemo(() => {
    const q = search.toLowerCase().trim();
    return profiles.filter((p) => {
      if (!matchesGeo(p)) return false;
      if (!q) return true;
      return (
        `${p.prenom} ${p.nom}`.toLowerCase().includes(q) ||
        (p.centre || '').toLowerCase().includes(q) ||
        (p.presentation || '').toLowerCase().includes(q) ||
        (p.pointsForts || '').toLowerCase().includes(q) ||
        (p.projets || []).some((pr) => pr.titre.toLowerCase().includes(q))
      );
    });
  }, [profiles, search, region, cluster, centreFilter, centres]);

  const filteredProjects = useMemo(() => {
    const q = search.toLowerCase().trim();
    return filteredProfiles
      .flatMap((enfant) => (enfant.projets || []).map((project) => ({ enfant, project })))
      .filter(({ enfant, project }) => {
        if (!q) return true;
        return (
          `${enfant.prenom} ${enfant.nom}`.toLowerCase().includes(q) ||
          project.titre.toLowerCase().includes(q) ||
          (project.description || '').toLowerCase().includes(q)
        );
      });
  }, [filteredProfiles, search]);

  const applyCentreToForm = (centreIdValue: string) => {
    const c = centres.find((x) => String(x.id) === centreIdValue);
    if (!c) {
      setEnfantForm((p) => ({ ...p, centreId: undefined, centre: '', region: '', cluster: '' }));
      return;
    }
    setEnfantForm((p) => ({
      ...p,
      centreId: c.id,
      centre: c.nom,
      region: c.region || '',
      cluster: c.cluster || '',
    }));
  };

  const openCreateEnfant = () => {
    setEditingEnfantId(null);
    setEnfantForm(emptyEnfant);
    setEnfantPhotoFile(null);
    resetPicker();
    setShowEnfantModal(true);
  };

  const openEditEnfant = (enfant: EnfantProfilePublic) => {
    setEditingEnfantId(enfant.id);
    setEnfantForm({
      nom: enfant.nom,
      prenom: enfant.prenom,
      age: enfant.age || 8,
      centre: enfant.centre || '',
      centreId: enfant.centreId,
      region: enfant.region || '',
      cluster: enfant.cluster || '',
      presentation: enfant.presentation || '',
      pointsForts: enfant.pointsForts || '',
      photoUrl: enfant.photoUrl || '',
      eleveId: enfant.eleveId,
      actif: enfant.actif,
    });
    setPickerCentreId(enfant.centreId ? String(enfant.centreId) : '');
    setPickerRegion(enfant.region || '');
    setPickerCluster(enfant.cluster || '');
    setSelectedEleveId(enfant.eleveId ?? null);
    setEnfantPhotoFile(null);
    setShowEnfantModal(true);
  };

  const openAddProject = (enfantId?: number) => {
    setEditingProjectId(null);
    setProjectForm(emptyProject);
    setProjectMediaFile(null);
    setSelectedEnfantId(enfantId ?? detailEnfant?.id ?? null);
    setShowProjectModal(true);
  };

  const openEditProject = (enfantId: number, project: EnfantProject) => {
    setSelectedEnfantId(enfantId);
    setEditingProjectId(project.id);
    setProjectForm({
      titre: project.titre,
      description: project.description || '',
      mediaType: project.mediaType,
      mediaUrl: project.mediaUrl || '',
      actif: project.actif,
    });
    setProjectMediaFile(null);
    setShowProjectModal(true);
  };

  const saveEnfant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enfantForm.nom || !enfantForm.prenom) {
      toast.error('Nom et prénom obligatoires.');
      return;
    }
    if (!editingEnfantId && !enfantForm.eleveId) {
      toast.error('Sélectionnez un enfant inscrit dans le centre.');
      return;
    }
    if (!enfantForm.centreId) {
      toast.error('Sélectionnez un centre.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...enfantForm, createdByUserId: user?.id };
      if (editingEnfantId) {
        await contentManagementService.updateEnfant(editingEnfantId, payload);
        if (enfantPhotoFile) {
          await contentManagementService.uploadEnfantPhoto(editingEnfantId, enfantPhotoFile);
        }
        toast.success('Profil enfant mis à jour.');
      } else {
        const created = await contentManagementService.createEnfant(payload);
        const createdId = created?.data?.id;
        if (createdId && enfantPhotoFile) {
          await contentManagementService.uploadEnfantPhoto(createdId, enfantPhotoFile);
        }
        toast.success('Profil enfant créé.');
      }
      setShowEnfantModal(false);
      setEnfantPhotoFile(null);
      setEnfantForm(emptyEnfant);
      setEditingEnfantId(null);
      resetPicker();
      load();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      toast.error(apiErr?.response?.data?.message || 'Impossible d’enregistrer le profil.');
    } finally {
      setSaving(false);
    }
  };

  const saveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnfantId || !projectForm.titre || !projectForm.mediaType) {
      toast.error('Choisissez un enfant et un titre.');
      return;
    }
    const isScratch = projectForm.mediaType === 'SCRATCH';
    if (isScratch && !projectMediaFile && !projectForm.mediaUrl) {
      toast.error('Ajoutez un fichier .sb3 ou un lien Scratch.');
      return;
    }
    if (projectMediaFile?.name.toLowerCase().endsWith('.sb3') && projectMediaFile.size > 25 * 1024 * 1024) {
      toast.error('Le fichier Scratch ne doit pas dépasser 25 Mo.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...projectForm,
        mediaType: projectMediaFile?.name.toLowerCase().endsWith('.sb3')
          ? ('SCRATCH' as ProjectMediaType)
          : projectForm.mediaType,
      };
      if (editingProjectId) {
        await contentManagementService.updateProjetEnfant(editingProjectId, payload);
        if (projectMediaFile) {
          await contentManagementService.uploadProjetEnfantMedia(editingProjectId, projectMediaFile);
        }
        toast.success('Projet mis à jour.');
      } else {
        const created = await contentManagementService.createProjetEnfant(selectedEnfantId, payload);
        const createdId = created?.data?.id;
        if (createdId && projectMediaFile) {
          await contentManagementService.uploadProjetEnfantMedia(createdId, projectMediaFile);
        }
        toast.success(isScratch ? 'Projet Scratch déposé.' : 'Projet ajouté.');
      }
      setShowProjectModal(false);
      setProjectMediaFile(null);
      setProjectForm(emptyProject);
      setEditingProjectId(null);
      load();
      if (detailEnfant?.id === selectedEnfantId) {
        const refreshed = await contentManagementService.getEnfants();
        const found = (refreshed.data || []).find((p: EnfantProfilePublic) => p.id === selectedEnfantId);
        if (found) setDetailEnfant(found);
      }
    } catch {
      toast.error('Impossible d’enregistrer le projet.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === 'enfant') {
        await contentManagementService.deleteEnfant(confirmDelete.id);
        toast.success('Profil supprimé.');
        if (detailEnfant?.id === confirmDelete.id) setDetailEnfant(null);
      } else {
        await contentManagementService.deleteProjetEnfant(confirmDelete.id);
        toast.success('Projet supprimé.');
      }
      load();
    } catch {
      toast.error('Suppression impossible.');
    } finally {
      setConfirmDelete(null);
    }
  };

  const ProjectMedia = ({ project }: { project: EnfantProject }) => {
    const scratchEmbed = toScratchEmbed(project.mediaUrl);
    const sb3 = isSb3(project.mediaUrl);
    if (project.mediaType === 'SCRATCH' && sb3 && project.mediaUrl) {
      return (
        <div className="space-y-2">
          <iframe
            title={project.titre}
            src={turboWarpEmbedUrl(project.mediaUrl)}
            className="w-full aspect-video rounded-xl border border-slate-200 bg-slate-50"
            allowFullScreen
          />
          <a
            href={mediaUrl(project.mediaUrl)}
            download={downloadFileName(project.titre, project.mediaUrl)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#004b57]"
          >
            <Download className="w-3.5 h-3.5" /> Télécharger .sb3
          </a>
        </div>
      );
    }
    if (project.mediaType === 'SCRATCH' && scratchEmbed) {
      return (
        <iframe title={project.titre} src={scratchEmbed} className="w-full aspect-video rounded-xl border border-slate-200" allowFullScreen />
      );
    }
    if (project.mediaType === 'IMAGE' && project.mediaUrl) {
      return <img src={mediaUrl(project.mediaUrl)} alt="" className="w-full max-h-64 object-contain rounded-xl border border-slate-200 bg-slate-50" />;
    }
    if (project.mediaType === 'VIDEO' && project.mediaUrl) {
      return <video controls src={mediaUrl(project.mediaUrl)} className="w-full max-h-64 rounded-xl border border-slate-200 bg-slate-50" />;
    }
    if (project.mediaUrl) {
      return (
        <a href={project.mediaUrl.startsWith('http') ? project.mediaUrl : mediaUrl(project.mediaUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-[#004b57]">
          <ExternalLink className="w-4 h-4" /> Ouvrir
        </a>
      );
    }
    return <p className="text-sm text-slate-500">Aucun média.</p>;
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-[#004b57]/15 bg-gradient-to-br from-[#004b57] via-[#006878] to-[#0a8a9e] p-6 sm:p-8 text-white">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Smart Kids Academy
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold">Profils & projets des enfants</h1>
            <p className="text-white/80 mt-2 max-w-xl text-sm sm:text-base">
              Photos, centres, et projets terminés — simples à déposer, fiables à consulter.
            </p>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={openCreateEnfant} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#004b57] text-sm font-semibold hover:bg-white/90">
                <Plus className="w-4 h-4" /> Nouvel enfant
              </button>
              <button type="button" onClick={() => openAddProject()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 border border-white/30 text-white text-sm font-semibold hover:bg-white/25">
                <FolderKanban className="w-4 h-4" /> Déposer un projet
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card border border-slate-200 bg-white space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input-field pl-10 bg-white"
              placeholder="Rechercher un enfant, un centre, un projet…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex rounded-xl border border-slate-200 p-1 bg-slate-50">
            <button
              type="button"
              onClick={() => setViewMode('profils')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${viewMode === 'profils' ? 'bg-white text-[#004b57] shadow-sm' : 'text-slate-500'}`}
            >
              Profils
            </button>
            <button
              type="button"
              onClick={() => setViewMode('projets')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${viewMode === 'projets' ? 'bg-white text-[#004b57] shadow-sm' : 'text-slate-500'}`}
            >
              Projets
            </button>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          <label className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              className="input-field pl-9 bg-white text-sm"
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setCluster('');
                setCentreFilter('');
              }}
            >
              <option value="">Toutes les régions</option>
              {regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <select
            className="input-field bg-white text-sm"
            value={cluster}
            onChange={(e) => {
              setCluster(e.target.value);
              setCentreFilter('');
            }}
          >
            <option value="">Tous les clusters</option>
            {clusters.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="input-field bg-white text-sm"
            value={centreFilter}
            onChange={(e) => setCentreFilter(e.target.value)}
          >
            <option value="">Tous les centres</option>
            {filteredCentres.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
      </div>

      {viewMode === 'profils' ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          <AnimatePresence>
            {filteredProfiles.map((enfant, i) => (
              <motion.article
                key={enfant.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="group rounded-3xl overflow-hidden border border-slate-200 bg-white hover:border-[#004b57]/35 hover:shadow-lg transition-all"
              >
                <button type="button" onClick={() => setDetailEnfant(enfant)} className="w-full text-left">
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-[#004b57]/20 to-[#5ED9FF]/10">
                    {enfant.photoUrl ? (
                      <img src={mediaUrl(enfant.photoUrl)} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[#004b57]/40">
                        <UserCircle2 className="w-20 h-20" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
                      <h3 className="text-white font-bold text-lg">{enfant.prenom} {enfant.nom}</h3>
                      <p className="text-white/80 text-xs mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {[enfant.age ? `${enfant.age} ans` : null, enfant.centre].filter(Boolean).join(' · ') || 'Centre non renseigné'}
                      </p>
                    </div>
                    {(enfant.projets?.length || 0) > 0 && (
                      <span className="absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/95 text-[#004b57]">
                        {enfant.projets.length} projet{enfant.projets.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    {enfant.presentation && (
                      <p className="text-sm text-slate-600 line-clamp-2">{enfant.presentation}</p>
                    )}
                    {enfant.pointsForts && (
                      <p className="text-xs text-[#004b57] flex items-start gap-1.5">
                        <Star className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span className="line-clamp-1">{enfant.pointsForts}</span>
                      </p>
                    )}
                  </div>
                </button>
                {canManage && (
                  <div className="px-4 pb-4 flex flex-wrap gap-2">
                    <button type="button" className="text-xs font-medium text-[#004b57] hover:underline" onClick={() => openAddProject(enfant.id)}>
                      + Projet
                    </button>
                    <button type="button" className="text-xs font-medium text-slate-500 hover:underline" onClick={() => openEditEnfant(enfant)}>
                      Modifier
                    </button>
                    <button type="button" className="text-xs font-medium text-red-500 hover:underline" onClick={() => setConfirmDelete({ type: 'enfant', id: enfant.id })}>
                      Supprimer
                    </button>
                  </div>
                )}
              </motion.article>
            ))}
          </AnimatePresence>
          {filteredProfiles.length === 0 && (
            <div className="col-span-full card border-dashed border border-slate-200 text-center py-14 text-slate-500">
              Aucun profil pour ces filtres.
              {canManage && (
                <div className="mt-4">
                  <button type="button" className="btn-primary" onClick={openCreateEnfant}>
                    <Plus className="w-4 h-4" /> Créer le premier profil
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredProjects.map(({ enfant, project }) => (
            <article key={project.id} className="card border border-slate-200 bg-white space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                  {enfant.photoUrl ? (
                    <img src={mediaUrl(enfant.photoUrl)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400"><UserCircle2 className="w-7 h-7" /></div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{project.titre}</h3>
                  <p className="text-xs text-slate-500">{enfant.prenom} {enfant.nom} · {project.mediaType}</p>
                </div>
              </div>
              {project.description && <p className="text-sm text-slate-600">{project.description}</p>}
              <ProjectMedia project={project} />
              {canManage && (
                <div className="flex gap-3 pt-1">
                  <button type="button" className="text-xs text-[#004b57]" onClick={() => openEditProject(enfant.id, project)}>Modifier</button>
                  <button type="button" className="text-xs text-red-500" onClick={() => setConfirmDelete({ type: 'project', id: project.id })}>Supprimer</button>
                </div>
              )}
            </article>
          ))}
          {filteredProjects.length === 0 && (
            <div className="col-span-full card border-dashed border border-slate-200 text-center py-14 text-slate-500">
              Aucun projet pour ces filtres.
            </div>
          )}
        </div>
      )}

      {/* Détail profil */}
      <Modal
        open={!!detailEnfant}
        title={detailEnfant ? `${detailEnfant.prenom} ${detailEnfant.nom}` : ''}
        size="lg"
        onClose={() => setDetailEnfant(null)}
        footer={
          canManage && detailEnfant ? (
            <>
              <button type="button" className="btn-ghost" onClick={() => setDetailEnfant(null)}>Fermer</button>
              <button type="button" className="btn-primary" onClick={() => openAddProject(detailEnfant.id)}>
                <Plus className="w-4 h-4" /> Ajouter un projet
              </button>
            </>
          ) : (
            <button type="button" className="btn-primary" onClick={() => setDetailEnfant(null)}>Fermer</button>
          )
        }
      >
        {detailEnfant && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-40 h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-[#004b57]/15 to-[#5ED9FF]/10 shrink-0">
                {detailEnfant.photoUrl ? (
                  <img src={mediaUrl(detailEnfant.photoUrl)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#004b57]/40"><UserCircle2 className="w-16 h-16" /></div>
                )}
              </div>
              <div className="space-y-2 min-w-0">
                <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />
                  {[detailEnfant.age ? `${detailEnfant.age} ans` : null, detailEnfant.centre, detailEnfant.region].filter(Boolean).join(' · ')}
                </p>
                {detailEnfant.presentation && <p className="text-sm text-slate-700 leading-relaxed">{detailEnfant.presentation}</p>}
                {detailEnfant.pointsForts && (
                  <p className="text-sm text-[#004b57] flex items-start gap-1.5"><Star className="w-4 h-4 mt-0.5" />{detailEnfant.pointsForts}</p>
                )}
                {canManage && (
                  <button type="button" className="text-xs font-medium text-slate-500 hover:text-[#004b57]" onClick={() => openEditEnfant(detailEnfant)}>
                    Modifier le profil
                  </button>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-[#004b57]" /> Projets réalisés
              </h4>
              {(detailEnfant.projets || []).length === 0 ? (
                <p className="text-sm text-slate-500">Aucun projet encore. Déposez le prochain projet terminé ici.</p>
              ) : (
                <div className="space-y-4">
                  {detailEnfant.projets.map((project) => (
                    <div key={project.id} className="rounded-2xl border border-slate-200 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-slate-900">{project.titre}</p>
                          <p className="text-xs text-slate-500">{project.mediaType}</p>
                        </div>
                        {canManage && (
                          <div className="flex gap-2">
                            <button type="button" className="text-xs text-[#004b57]" onClick={() => openEditProject(detailEnfant.id, project)}>Modifier</button>
                            <button type="button" className="text-xs text-red-500" onClick={() => setConfirmDelete({ type: 'project', id: project.id })}><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </div>
                      {project.description && <p className="text-sm text-slate-600">{project.description}</p>}
                      <ProjectMedia project={project} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal enfant */}
      <Modal
        open={showEnfantModal}
        title={editingEnfantId ? 'Modifier le profil' : 'Nouvel enfant'}
        size="lg"
        onClose={() => setShowEnfantModal(false)}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setShowEnfantModal(false)}>Annuler</button>
            <button type="submit" form="enfant-form" className="btn-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </>
        }
      >
        <form id="enfant-form" onSubmit={saveEnfant} className="space-y-4">
          {!editingEnfantId && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-800">1. Localiser le centre</p>
              <div className="grid sm:grid-cols-3 gap-2">
                <div>
                  <label className="label text-xs">Région</label>
                  <select
                    className="input-field text-sm"
                    value={pickerRegion}
                    onChange={(e) => {
                      setPickerRegion(e.target.value);
                      setPickerCluster('');
                      setPickerCentreId('');
                      setSelectedEleveId(null);
                      setEnfantForm((p) => ({ ...emptyEnfant, presentation: p.presentation, pointsForts: p.pointsForts }));
                    }}
                  >
                    <option value="">Toutes</option>
                    {pickerRegions.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Cluster</label>
                  <select
                    className="input-field text-sm"
                    value={pickerCluster}
                    onChange={(e) => {
                      setPickerCluster(e.target.value);
                      setPickerCentreId('');
                      setSelectedEleveId(null);
                      setEnfantForm((p) => ({ ...emptyEnfant, presentation: p.presentation, pointsForts: p.pointsForts }));
                    }}
                  >
                    <option value="">Tous</option>
                    {pickerClusters.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Centre *</label>
                  <select
                    className="input-field text-sm"
                    required
                    value={pickerCentreId}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPickerCentreId(value);
                      setSelectedEleveId(null);
                      applyCentreToForm(value);
                      setEnfantForm((p) => ({
                        ...p,
                        eleveId: undefined,
                        nom: '',
                        prenom: '',
                        age: 8,
                      }));
                    }}
                  >
                    <option value="">Choisir un centre</option>
                    {pickerCentres.map((c) => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label text-xs">2. Enfant inscrit *</label>
                <select
                  className="input-field text-sm"
                  required
                  disabled={!pickerCentreId || loadingCentreEleves}
                  value={selectedEleveId || ''}
                  onChange={(e) => {
                    const id = Number(e.target.value) || null;
                    setSelectedEleveId(id);
                    const eleve = centreEleves.find((el) => el.id === id);
                    if (eleve) applyEleveToForm(eleve);
                  }}
                >
                  <option value="">
                    {loadingCentreEleves
                      ? 'Chargement des élèves…'
                      : !pickerCentreId
                        ? 'Choisissez d’abord un centre'
                        : 'Sélectionner un enfant'}
                  </option>
                  {centreEleves.map((el) => {
                    const taken = linkedEleveIds.has(el.id);
                    return (
                      <option key={el.id} value={el.id} disabled={taken}>
                        {el.prenom} {el.nom}
                        {el.matricule ? ` — ${el.matricule}` : ''}
                        {taken ? ' (profil existant)' : ''}
                      </option>
                    );
                  })}
                </select>
                {pickerCentreId && !loadingCentreEleves && centreEleves.length === 0 && (
                  <p className="mt-1.5 text-xs text-amber-700">Aucun élève inscrit dans ce centre.</p>
                )}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-[#004b57]/15 bg-white p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">
              {editingEnfantId ? 'Informations du profil' : '3. Compléter le profil'}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Prénom *</label>
                <input
                  className="input-field bg-slate-50"
                  required
                  readOnly={!editingEnfantId}
                  value={enfantForm.prenom || ''}
                  onChange={(e) => setEnfantForm((p) => ({ ...p, prenom: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Nom *</label>
                <input
                  className="input-field bg-slate-50"
                  required
                  readOnly={!editingEnfantId}
                  value={enfantForm.nom || ''}
                  onChange={(e) => setEnfantForm((p) => ({ ...p, nom: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Âge</label>
                <input
                  className="input-field bg-slate-50"
                  type="number"
                  min={4}
                  max={25}
                  readOnly={!editingEnfantId}
                  value={enfantForm.age || 8}
                  onChange={(e) => setEnfantForm((p) => ({ ...p, age: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="label">Centre</label>
                <input
                  className="input-field bg-slate-50"
                  readOnly
                  value={enfantForm.centre || ''}
                  placeholder="Sélection via l’étape ci-dessus"
                />
              </div>
            </div>
            {enfantForm.eleveId && (
              <p className="text-xs text-slate-500">
                Lié à l&apos;élève inscrit #{enfantForm.eleveId}
                {centreEleves.find((e) => e.id === enfantForm.eleveId)?.matricule
                  ? ` · ${centreEleves.find((e) => e.id === enfantForm.eleveId)?.matricule}`
                  : ''}
              </p>
            )}
          </div>

          <MediaDropZone
            compact
            files={enfantPhotoFile ? [enfantPhotoFile] : []}
            onChange={(files) => setEnfantPhotoFile(files[0] || null)}
            accept="image/*"
            maxSizeMb={10}
            label="Photo de profil"
            hint="Glisser-déposer ou Ctrl+V — portrait recommandé"
            existingFiles={
              !enfantPhotoFile && enfantForm.photoUrl
                ? [{ name: 'Photo actuelle', url: mediaUrl(enfantForm.photoUrl), kind: 'image' }]
                : []
            }
            onRemoveExisting={() => setEnfantForm((p) => ({ ...p, photoUrl: '' }))}
          />
          <div>
            <label className="label">Présentation</label>
            <textarea className="input-field min-h-[80px]" placeholder="Qui est cet enfant ? Ce qu’il aime…" value={enfantForm.presentation || ''} onChange={(e) => setEnfantForm((p) => ({ ...p, presentation: e.target.value }))} />
          </div>
          <div>
            <label className="label">Points forts</label>
            <input className="input-field" placeholder="Créativité, Scratch, leadership…" value={enfantForm.pointsForts || ''} onChange={(e) => setEnfantForm((p) => ({ ...p, pointsForts: e.target.value }))} />
          </div>
        </form>
      </Modal>

      {/* Modal projet */}
      <Modal
        open={showProjectModal}
        title={editingProjectId ? 'Modifier le projet' : 'Déposer un projet terminé'}
        size="lg"
        onClose={() => setShowProjectModal(false)}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setShowProjectModal(false)}>Annuler</button>
            <button type="submit" form="project-form" className="btn-primary" disabled={saving}>
              {saving ? 'Envoi…' : 'Enregistrer le projet'}
            </button>
          </>
        }
      >
        <form id="project-form" onSubmit={saveProject} className="space-y-4">
          <p className="text-sm text-slate-500">
            Dès qu’un enfant termine un projet, déposez-le ici — Scratch (.sb3), image, vidéo ou lien.
          </p>
          <div>
            <label className="label">Enfant *</label>
            <select className="input-field" required value={selectedEnfantId || ''} onChange={(e) => setSelectedEnfantId(Number(e.target.value) || null)}>
              <option value="">Choisir…</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.prenom} {p.nom}{p.centre ? ` — ${p.centre}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Titre *</label>
              <input className="input-field" required value={projectForm.titre || ''} onChange={(e) => setProjectForm((p) => ({ ...p, titre: e.target.value }))} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input-field" value={projectForm.mediaType || 'SCRATCH'} onChange={(e) => setProjectForm((p) => ({ ...p, mediaType: e.target.value as ProjectMediaType }))}>
                <option value="SCRATCH">Scratch (.sb3 / lien)</option>
                <option value="IMAGE">Image</option>
                <option value="VIDEO">Vidéo</option>
                <option value="LIEN">Lien</option>
              </select>
            </div>
          </div>
          <MediaDropZone
            compact
            files={projectMediaFile ? [projectMediaFile] : []}
            onChange={(files) => {
              const file = files[0] || null;
              setProjectMediaFile(file);
              if (file?.name.toLowerCase().endsWith('.sb3')) {
                setProjectForm((p) => ({ ...p, mediaType: 'SCRATCH' }));
              }
            }}
            accept={
              projectForm.mediaType === 'SCRATCH'
                ? '.sb3,application/octet-stream'
                : projectForm.mediaType === 'IMAGE'
                  ? 'image/*'
                  : projectForm.mediaType === 'VIDEO'
                    ? 'video/*'
                    : '*/*'
            }
            maxSizeMb={projectForm.mediaType === 'SCRATCH' ? 25 : 100}
            label="Fichier du projet"
            hint="Glisser-déposer ou Ctrl+V"
            onUrlPaste={(url) => {
              setProjectForm((p) => ({ ...p, mediaUrl: url }));
              toast.success('Lien collé.');
            }}
          />
          <div>
            <label className="label">Lien (optionnel)</label>
            <input
              className="input-field"
              placeholder="https://scratch.mit.edu/projects/… ou autre URL"
              value={projectForm.mediaUrl || ''}
              onChange={(e) => setProjectForm((p) => ({ ...p, mediaUrl: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input-field min-h-[70px]" value={projectForm.description || ''} onChange={(e) => setProjectForm((p) => ({ ...p, description: e.target.value }))} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete != null}
        title={confirmDelete?.type === 'enfant' ? 'Supprimer ce profil ?' : 'Supprimer ce projet ?'}
        message={confirmDelete?.type === 'enfant' ? 'Le profil et tous ses projets seront retirés.' : 'Ce projet sera définitivement retiré.'}
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
