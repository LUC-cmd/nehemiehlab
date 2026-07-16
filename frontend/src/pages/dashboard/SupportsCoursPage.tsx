import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen, Plus, Trash2, Download, FileText, Image as ImageIcon,
  Video, Loader2, GraduationCap, Clock, Target, Pencil, Upload, Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { moduleCoursService, serieSupportService } from '../../services/api';
import type { ModuleCours, SerieSupportCours, SupportCoursFichier } from '../../types';
import { useAuth } from '../../context/AuthContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import MediaDropZone, { type MediaDropExistingFile } from '../../components/ui/MediaDropZone';
import { mediaUrl } from '../../utils/media';
import { CardsSkeleton } from '../../components/ui/DashboardSkeletons';
import { useMinDelayLoading } from '../../hooks/useMinDelayLoading';

const ACCEPT_SUPPORTS =
  'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.sb3,application/pdf';

const emptyModuleForm = {
  numeroOrdre: 1,
  titre: '',
  description: '',
  objectifs: '',
  dureeRecommandeeHeures: '',
  niveau: '',
  actif: true,
};

const emptySerieForm = {
  titre: '',
  description: '',
  ordre: 0,
  actif: true,
  moduleIds: [] as number[],
};

function fileKindIcon(name: string, mime?: string) {
  const lower = name.toLowerCase();
  if (mime?.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg)$/i.test(lower)) {
    return <ImageIcon className="w-4 h-4" />;
  }
  if (mime?.startsWith('video/') || /\.(mp4|webm|mov|avi)$/i.test(lower)) {
    return <Video className="w-4 h-4" />;
  }
  return <FileText className="w-4 h-4" />;
}

export default function SupportsCoursPage() {
  const { role } = useAuth();
  const isDirector = role === 'DIRECTEUR';

  const [modules, setModules] = useState<ModuleCours[]>([]);
  const [series, setSeries] = useState<SerieSupportCours[]>([]);
  const [loading, setLoading] = useState(true);
  const skeletonLoading = useMinDelayLoading(loading, 220);

  const [moduleForm, setModuleForm] = useState(emptyModuleForm);
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [savingModule, setSavingModule] = useState(false);
  const [deleteModuleId, setDeleteModuleId] = useState<number | null>(null);

  const [serieForm, setSerieForm] = useState(emptySerieForm);
  const [editingSerieId, setEditingSerieId] = useState<number | null>(null);
  const [serieFiles, setSerieFiles] = useState<File[]>([]);
  const [savingSerie, setSavingSerie] = useState(false);
  const [deleteSerieId, setDeleteSerieId] = useState<number | null>(null);
  const [togglingModuleId, setTogglingModuleId] = useState<number | null>(null);
  const [togglingSerieId, setTogglingSerieId] = useState<number | null>(null);
  const [uploadingSerieId, setUploadingSerieId] = useState<number | null>(null);
  const [confirmRemoveFile, setConfirmRemoveFile] = useState<{
    serieId: number;
    file: MediaDropExistingFile;
  } | null>(null);
  const [removingFileKey, setRemovingFileKey] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([moduleCoursService.list(), serieSupportService.list()])
      .then(([modRes, serieRes]) => {
        setModules(modRes.data || []);
        setSeries(serieRes.data || []);
      })
      .catch(() => {
        setModules([]);
        setSeries([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const visibleModules = useMemo(
    () => modules.filter((m) => isDirector || m.actif),
    [modules, isDirector],
  );

  const visibleSeries = useMemo(
    () => series.filter((s) => isDirector || s.actif),
    [series, isDirector],
  );

  const editingSerie = editingSerieId != null ? series.find((s) => s.id === editingSerieId) : null;
  const existingSerieFiles: MediaDropExistingFile[] = editingSerie
    ? (editingSerie.fichiers ?? []).map((f) => ({
        id: f.id,
        name: f.nom,
        url: mediaUrl(f.url),
        kind: f.mimeType?.startsWith('image/')
          ? 'image'
          : f.mimeType?.startsWith('video/')
            ? 'video'
            : /\.(pdf|docx?|xlsx?|pptx?)$/i.test(f.nom)
              ? 'document'
              : 'other',
      }))
    : [];

  const resetModuleForm = () => {
    setEditingModuleId(null);
    setModuleForm({ ...emptyModuleForm, numeroOrdre: modules.length + 1 });
  };

  const resetSerieForm = () => {
    setEditingSerieId(null);
    setSerieForm({ ...emptySerieForm, ordre: series.length + 1 });
    setSerieFiles([]);
  };

  const toggleSerieModule = (moduleId: number) => {
    setSerieForm((prev) => {
      const has = prev.moduleIds.includes(moduleId);
      return {
        ...prev,
        moduleIds: has
          ? prev.moduleIds.filter((id) => id !== moduleId)
          : [...prev.moduleIds, moduleId],
      };
    });
  };

  const saveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleForm.titre.trim()) {
      toast.error('Le titre du module est obligatoire.');
      return;
    }
    setSavingModule(true);
    try {
      const payload = {
        numeroOrdre: Number(moduleForm.numeroOrdre) || 0,
        titre: moduleForm.titre.trim(),
        description: moduleForm.description.trim(),
        objectifs: moduleForm.objectifs.trim(),
        dureeRecommandeeHeures: moduleForm.dureeRecommandeeHeures
          ? Number(moduleForm.dureeRecommandeeHeures)
          : undefined,
        niveau: moduleForm.niveau.trim() || undefined,
        actif: moduleForm.actif,
      };
      if (editingModuleId) {
        await moduleCoursService.update(editingModuleId, payload);
      } else {
        await moduleCoursService.create(payload);
      }
      toast.success(editingModuleId ? 'Module mis à jour.' : 'Module publié.');
      resetModuleForm();
      load();
    } catch {
      toast.error("Impossible d'enregistrer le module.");
    } finally {
      setSavingModule(false);
    }
  };

  const saveSerie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serieForm.titre.trim()) {
      toast.error('Le titre de la série est obligatoire pour différencier les supports.');
      return;
    }
    if (serieForm.moduleIds.length === 0) {
      toast.error('Sélectionnez au moins un module SKA concerné.');
      return;
    }
    setSavingSerie(true);
    try {
      const payload = {
        titre: serieForm.titre.trim(),
        description: serieForm.description.trim(),
        ordre: Number(serieForm.ordre) || 0,
        actif: serieForm.actif,
        moduleIds: serieForm.moduleIds,
      };
      let saved: SerieSupportCours;
      if (editingSerieId) {
        const res = await serieSupportService.update(editingSerieId, payload);
        saved = res.data;
      } else {
        const res = await serieSupportService.create(payload);
        saved = res.data;
      }
      if (serieFiles.length > 0) {
        await serieSupportService.uploadFichiers(saved.id, serieFiles);
      }
      toast.success(editingSerieId ? 'Série mise à jour.' : 'Série de supports publiée.');
      resetSerieForm();
      load();
    } catch {
      toast.error("Impossible d'enregistrer la série de supports.");
    } finally {
      setSavingSerie(false);
    }
  };

  const startEditModule = (module: ModuleCours) => {
    setEditingModuleId(module.id);
    setModuleForm({
      numeroOrdre: module.numeroOrdre,
      titre: module.titre,
      description: module.description || '',
      objectifs: module.objectifs || '',
      dureeRecommandeeHeures: module.dureeRecommandeeHeures?.toString() || '',
      niveau: module.niveau || '',
      actif: module.actif,
    });
  };

  const startEditSerie = (serie: SerieSupportCours) => {
    setEditingSerieId(serie.id);
    setSerieForm({
      titre: serie.titre,
      description: serie.description || '',
      ordre: serie.ordre,
      actif: serie.actif,
      moduleIds: serie.moduleIds ?? [],
    });
    setSerieFiles([]);
  };

  const toggleModuleActif = async (module: ModuleCours) => {
    setTogglingModuleId(module.id);
    try {
      await moduleCoursService.update(module.id, { actif: !module.actif });
      toast.success(module.actif ? 'Module dépublié — masqué aux formateurs.' : 'Module publié — visible par tous les centres.');
      load();
    } catch {
      toast.error('Impossible de changer la visibilité du module.');
    } finally {
      setTogglingModuleId(null);
    }
  };

  const toggleSerieActif = async (serie: SerieSupportCours) => {
    setTogglingSerieId(serie.id);
    try {
      await serieSupportService.update(serie.id, { actif: !serie.actif });
      toast.success(serie.actif ? 'Série dépubliée — masquée aux formateurs.' : 'Série publiée — visible par tous les centres.');
      load();
    } catch {
      toast.error('Impossible de changer la visibilité de la série.');
    } finally {
      setTogglingSerieId(null);
    }
  };

  const quickUploadToSerie = async (serieId: number, fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    setUploadingSerieId(serieId);
    try {
      await serieSupportService.uploadFichiers(serieId, files);
      toast.success(files.length > 1 ? `${files.length} fichiers ajoutés.` : 'Fichier ajouté.');
      load();
    } catch {
      toast.error("Impossible d'ajouter les fichiers.");
    } finally {
      setUploadingSerieId(null);
    }
  };

  const removeSerieFile = async (serieId: number, file: MediaDropExistingFile) => {
    const fichierId = typeof file.id === 'number' ? file.id : Number(file.id);
    if (!Number.isFinite(fichierId)) return;
    const key = `${serieId}-${fichierId}`;
    setRemovingFileKey(key);
    try {
      await serieSupportService.deleteFichier(serieId, fichierId);
      toast.success('Fichier retiré.');
      load();
    } catch {
      toast.error('Impossible de retirer le fichier.');
    } finally {
      setRemovingFileKey(null);
      setConfirmRemoveFile(null);
    }
  };

  if (skeletonLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 skeleton-block rounded" />
        <CardsSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-6xl">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Supports de cours</h1>
            <p className="text-sm text-slate-600 mt-0.5">
              {isDirector
                ? 'Créez des séries titrées (ex. « Séance 1 — Scratch ») et associez-les à un ou plusieurs modules. Déposez les fichiers dans chaque série.'
                : 'Consultez les séries de supports liées au module que vous enseignez.'}
            </p>
          </div>
        </div>
      </header>

      {isDirector && (
        <form onSubmit={saveSerie} className="card space-y-4 border border-primary-200 bg-primary-50/20">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            {editingSerieId ? <Pencil className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
            {editingSerieId ? 'Modifier la série de supports' : 'Nouvelle série de supports'}
          </h2>
          <p className="text-xs text-slate-500 -mt-2">
            Donnez un titre distinct à chaque série. Une même série peut couvrir plusieurs modules SKA.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Titre de la série *</label>
              <input
                className="input-field"
                required
                placeholder="Ex. Module 01 — Fiches élèves & présentation Scratch"
                value={serieForm.titre}
                onChange={(e) => setSerieForm((p) => ({ ...p, titre: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description (optionnel)</label>
              <textarea
                className="input-field min-h-[70px]"
                placeholder="Contenu de cette série, consignes pour le formateur…"
                value={serieForm.description}
                onChange={(e) => setSerieForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">N° d&apos;ordre</label>
              <input
                type="number"
                min={0}
                className="input-field"
                value={serieForm.ordre}
                onChange={(e) => setSerieForm((p) => ({ ...p, ordre: Number(e.target.value) }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer pb-2 self-end">
              <input
                type="checkbox"
                checked={serieForm.actif}
                onChange={(e) => setSerieForm((p) => ({ ...p, actif: e.target.checked }))}
              />
              Série visible pour les formateurs
            </label>
          </div>

          <div>
            <label className="label">Modules SKA concernés *</label>
            <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-slate-200 bg-white max-h-40 overflow-y-auto">
              {modules.length === 0 ? (
                <p className="text-xs text-amber-700">Créez d&apos;abord au moins un module ci-dessous.</p>
              ) : (
                modules.map((m) => {
                  const checked = serieForm.moduleIds.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                        checked
                          ? 'border-primary-400 bg-primary-50 text-primary-800'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleSerieModule(m.id)}
                      />
                      #{m.numeroOrdre} {m.titre}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <MediaDropZone
            multiple
            maxFiles={20}
            maxSizeMb={100}
            accept={ACCEPT_SUPPORTS}
            files={serieFiles}
            onChange={setSerieFiles}
            existingFiles={existingSerieFiles}
            onRemoveExisting={(file) => {
              if (!editingSerieId || removingFileKey) return;
              setConfirmRemoveFile({ serieId: editingSerieId, file });
            }}
            label="Fichiers de la série (PDF, PPT, vidéos…)"
            hint="Un ou plusieurs fichiers pour cette série titrée."
            disabled={savingSerie}
          />

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary" disabled={savingSerie}>
              {savingSerie ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingSerieId ? 'Enregistrer la série' : 'Publier la série'}
            </button>
            {editingSerieId && (
              <button type="button" onClick={resetSerieForm} className="btn-ghost" disabled={savingSerie}>
                Annuler
              </button>
            )}
          </div>
        </form>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary-600" />
          Séries de supports
        </h2>
        {visibleSeries.length === 0 ? (
          <div className="card text-center text-slate-600 py-10">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-400" />
            {isDirector
              ? 'Aucune série pour le moment. Créez une série titrée ci-dessus.'
              : 'Aucun support publié pour le moment.'}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {visibleSeries.map((serie) => {
              const fichiers = serie.fichiers ?? [];
              const linked = serie.modules ?? [];
              return (
                <article
                  key={serie.id}
                  className={`card border flex flex-col ${
                    serie.actif ? 'border-slate-200' : 'border-amber-200 bg-amber-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{serie.titre}</h3>
                      {!serie.actif && isDirector && (
                        <span className="text-xs text-amber-700">Masquée</span>
                      )}
                    </div>
                    {isDirector && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleSerieActif(serie)}
                          disabled={togglingSerieId === serie.id}
                          className={`btn-ghost text-xs py-1 px-2 ${serie.actif ? 'text-amber-700' : 'text-primary-700'}`}
                        >
                          {togglingSerieId === serie.id ? '…' : serie.actif ? 'Dépublier' : 'Publier'}
                        </button>
                        <button type="button" onClick={() => startEditSerie(serie)} className="btn-ghost text-xs py-1 px-2">
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteSerieId(serie.id)}
                          className="btn-ghost text-xs py-1 px-2 text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {serie.description && (
                    <p className="text-sm text-slate-600 mb-3">{serie.description}</p>
                  )}

                  {linked.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {linked.map((m) => (
                        <span
                          key={m.id}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"
                        >
                          #{m.numeroOrdre} {m.titre}
                        </span>
                      ))}
                    </div>
                  )}

                  {fichiers.length > 0 ? (
                    <ul className="mt-auto pt-3 border-t border-slate-100 space-y-1.5">
                      {fichiers.map((f: SupportCoursFichier, idx) => (
                        <li key={`${f.id ?? f.url}-${idx}`}>
                          <a
                            href={mediaUrl(f.url)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-800"
                          >
                            {fileKindIcon(f.nom, f.mimeType)}
                            <span className="truncate max-w-[220px]">{f.nom}</span>
                            <Download className="w-3.5 h-3.5 shrink-0" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 mt-auto pt-3 border-t border-slate-100">
                      Aucun fichier dans cette série
                    </p>
                  )}

                  {isDirector && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-primary-700 cursor-pointer">
                        {uploadingSerieId === serie.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        Ajouter des fichiers
                        <input
                          type="file"
                          multiple
                          className="sr-only"
                          accept={ACCEPT_SUPPORTS}
                          disabled={uploadingSerieId === serie.id}
                          onChange={(e) => {
                            void quickUploadToSerie(serie.id, e.target.files);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary-600" />
          Modules pédagogiques SKA
        </h2>
        <p className="text-sm text-slate-500 -mt-2">
          Référentiel des modules enseignés (sans fichiers — les supports sont dans les séries ci-dessus).
        </p>

        {isDirector && (
          <form onSubmit={saveModule} className="card space-y-4 border border-slate-200">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-base">
              {editingModuleId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingModuleId ? 'Modifier le module' : 'Nouveau module'}
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">N° d&apos;ordre</label>
                <input
                  type="number"
                  min={0}
                  className="input-field"
                  value={moduleForm.numeroOrdre}
                  onChange={(e) => setModuleForm((p) => ({ ...p, numeroOrdre: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="label">Niveau (optionnel)</label>
                <input
                  className="input-field"
                  value={moduleForm.niveau}
                  onChange={(e) => setModuleForm((p) => ({ ...p, niveau: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="label">Titre du module *</label>
              <input
                className="input-field"
                required
                value={moduleForm.titre}
                onChange={(e) => setModuleForm((p) => ({ ...p, titre: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="input-field min-h-[60px]"
                value={moduleForm.description}
                onChange={(e) => setModuleForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Objectifs</label>
              <textarea
                className="input-field min-h-[60px]"
                value={moduleForm.objectifs}
                onChange={(e) => setModuleForm((p) => ({ ...p, objectifs: e.target.value }))}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4 items-end">
              <div>
                <label className="label">Durée recommandée (h)</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  className="input-field"
                  value={moduleForm.dureeRecommandeeHeures}
                  onChange={(e) => setModuleForm((p) => ({ ...p, dureeRecommandeeHeures: e.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 text-sm pb-2">
                <input
                  type="checkbox"
                  checked={moduleForm.actif}
                  onChange={(e) => setModuleForm((p) => ({ ...p, actif: e.target.checked }))}
                />
                Visible formateurs
              </label>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={savingModule}>
                {savingModule ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editingModuleId ? 'Enregistrer' : 'Publier'}
              </button>
              {editingModuleId && (
                <button type="button" onClick={resetModuleForm} className="btn-ghost">
                  Annuler
                </button>
              )}
            </div>
          </form>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {visibleModules.map((module) => (
            <article
              key={module.id}
              className={`card border text-sm ${
                module.actif ? 'border-slate-200' : 'border-amber-200 bg-amber-50/30'
              }`}
            >
              <div className="flex justify-between gap-2 mb-1">
                <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                  #{module.numeroOrdre}
                </span>
                {isDirector && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => toggleModuleActif(module)}
                      disabled={togglingModuleId === module.id}
                      className={`btn-ghost text-xs py-0 px-2 ${module.actif ? 'text-amber-700' : 'text-primary-700'}`}
                    >
                      {togglingModuleId === module.id ? '…' : module.actif ? 'Dépublier' : 'Publier'}
                    </button>
                    <button type="button" onClick={() => startEditModule(module)} className="btn-ghost text-xs py-0 px-2">
                      Modifier
                    </button>
                    <button type="button" onClick={() => setDeleteModuleId(module.id)} className="btn-ghost text-xs text-red-600 px-2">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {!module.actif && isDirector && (
                <span className="text-xs text-amber-700">Masqué</span>
              )}
              <h4 className="font-semibold text-slate-900">{module.titre}</h4>
              {module.description && <p className="text-slate-600 mt-1 line-clamp-2">{module.description}</p>}
              {module.dureeRecommandeeHeures != null && (
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {module.dureeRecommandeeHeures} h conseillées
                </p>
              )}
              {module.objectifs && (
                <p className="text-xs text-slate-500 mt-1 flex gap-1">
                  <Target className="w-3.5 h-3.5 shrink-0" />
                  <span className="line-clamp-2">{module.objectifs}</span>
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={deleteModuleId != null}
        title="Supprimer ce module ?"
        message="Les séries de supports restent liées si d'autres modules sont associés."
        confirmLabel="Supprimer"
        danger
        onConfirm={async () => {
          if (deleteModuleId == null) return;
          try {
            await moduleCoursService.delete(deleteModuleId);
            toast.success('Module supprimé.');
            if (editingModuleId === deleteModuleId) resetModuleForm();
            load();
          } catch {
            toast.error('Impossible de supprimer.');
          } finally {
            setDeleteModuleId(null);
          }
        }}
        onCancel={() => setDeleteModuleId(null)}
      />

      <ConfirmDialog
        open={deleteSerieId != null}
        title="Supprimer cette série ?"
        message="La série et tous ses fichiers seront supprimés."
        confirmLabel="Supprimer"
        danger
        onConfirm={async () => {
          if (deleteSerieId == null) return;
          try {
            await serieSupportService.delete(deleteSerieId);
            toast.success('Série supprimée.');
            if (editingSerieId === deleteSerieId) resetSerieForm();
            load();
          } catch {
            toast.error('Impossible de supprimer.');
          } finally {
            setDeleteSerieId(null);
          }
        }}
        onCancel={() => setDeleteSerieId(null)}
      />

      <ConfirmDialog
        open={confirmRemoveFile != null}
        title="Retirer ce fichier ?"
        message="Ce fichier sera supprimé de la série."
        confirmLabel="Retirer"
        danger
        onConfirm={() => {
          if (confirmRemoveFile) {
            void removeSerieFile(confirmRemoveFile.serieId, confirmRemoveFile.file);
          }
        }}
        onCancel={() => setConfirmRemoveFile(null)}
      />
    </div>
  );
}
