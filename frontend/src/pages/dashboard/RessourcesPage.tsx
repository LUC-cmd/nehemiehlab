import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen, ShieldCheck, Lightbulb, FolderKanban, Plus, Trash2, Download,
  FileText, Image as ImageIcon, Video, ExternalLink, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { contentManagementService } from '../../services/api';
import type { ResourceCategory, RessourceFichier, RessourceItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import MediaDropZone, { type MediaDropExistingFile } from '../../components/ui/MediaDropZone';
import { mediaUrl } from '../../utils/media';

type ResourceTab = ResourceCategory;

const tabConfig: Record<ResourceTab, { label: string; icon: React.ReactNode }> = {
  PROTECTION_ENFANCE: { label: "Protection de l'enfance", icon: <ShieldCheck className="w-4 h-4" /> },
  SOFT_SKILLS: { label: 'Soft skills SKA', icon: <Lightbulb className="w-4 h-4" /> },
  PROJETS_REALISES: { label: 'Projets réalisés', icon: <FolderKanban className="w-4 h-4" /> },
};

const emptyForm: Partial<RessourceItem> = {
  titre: '',
  description: '',
  categorie: 'PROTECTION_ENFANCE',
  lien: '',
  actif: true,
};

const ACCEPT_RESSOURCES =
  'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.sb3,application/pdf';

function resourceFiles(resource: RessourceItem): RessourceFichier[] {
  if (resource.fichiers && resource.fichiers.length > 0) return resource.fichiers;
  if (resource.fichierUrl) {
    return [{ url: resource.fichierUrl, nom: resource.fichierNom || 'document', id: undefined }];
  }
  return [];
}

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

export default function RessourcesPage() {
  const { role } = useAuth();
  const isDirector = role === 'DIRECTEUR';
  const [activeTab, setActiveTab] = useState<ResourceTab>('PROTECTION_ENFANCE');
  const [resources, setResources] = useState<RessourceItem[]>([]);
  const [form, setForm] = useState<Partial<RessourceItem>>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [confirmRemoveFile, setConfirmRemoveFile] = useState<MediaDropExistingFile | null>(null);
  const [removingFileKey, setRemovingFileKey] = useState<string | null>(null);

  const load = () => {
    contentManagementService.getRessources()
      .then((r) => setResources(r.data || []))
      .catch(() => setResources([]));
  };

  useEffect(() => {
    load();
  }, []);

  const activeResources = useMemo(
    () => resources.filter((r) => r.categorie === activeTab),
    [resources, activeTab],
  );

  const editingResource = editingId != null ? resources.find((r) => r.id === editingId) : null;
  const existingDropFiles: MediaDropExistingFile[] = editingResource
    ? resourceFiles(editingResource).map((f) => ({
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

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm, categorie: activeTab });
    setSelectedFiles([]);
  };

  const createResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre || !form.description || !form.categorie) return;
    setSaving(true);
    try {
      if (selectedFiles.length > 0) {
        const data = new FormData();
        data.append('titre', form.titre);
        data.append('description', form.description);
        data.append('categorie', form.categorie);
        data.append('lien', form.lien || '');
        selectedFiles.forEach((file) => data.append('files', file));
        await contentManagementService.createRessourceWithFile(data);
      } else {
        await contentManagementService.createRessource(form);
      }
      toast.success('Ressource ajoutée.');
      resetForm();
      load();
    } catch {
      toast.error("Impossible d'ajouter la ressource.");
    } finally {
      setSaving(false);
    }
  };

  const removeResource = async (id: number) => {
    try {
      await contentManagementService.deleteRessource(id);
      toast.success('Ressource supprimée.');
      load();
    } catch {
      toast.error('Impossible de supprimer la ressource.');
    } finally {
      setDeleteId(null);
    }
  };

  const startEdit = (resource: RessourceItem) => {
    setEditingId(resource.id);
    setForm({
      titre: resource.titre,
      description: resource.description,
      categorie: resource.categorie,
      lien: resource.lien || '',
      actif: resource.actif,
    });
    setSelectedFiles([]);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      await contentManagementService.updateRessource(editingId, form);
      if (selectedFiles.length > 0) {
        await contentManagementService.uploadRessourceFichiers(editingId, selectedFiles);
      }
      toast.success('Ressource modifiée.');
      resetForm();
      load();
    } catch {
      toast.error('Impossible de modifier la ressource.');
    } finally {
      setSaving(false);
    }
  };

  const removeExistingFile = async (file: MediaDropExistingFile) => {
    if (!editingId) return;
    const key = String(file.id ?? file.url ?? file.name);
    setRemovingFileKey(key);
    try {
      if (file.id != null) {
        await contentManagementService.deleteRessourceFichier(editingId, Number(file.id));
      } else {
        const current = resources.find((r) => r.id === editingId);
        const first = current ? resourceFiles(current)[0] : null;
        if (first?.id != null) {
          await contentManagementService.deleteRessourceFichier(editingId, first.id);
        } else {
          await contentManagementService.deleteRessourceFichier(editingId, 0);
        }
      }
      toast.success('Fichier retiré.');
      load();
    } catch {
      toast.error('Impossible de retirer le fichier.');
    } finally {
      setRemovingFileKey(null);
      setConfirmRemoveFile(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ressources SKA</h1>
        <p className="text-slate-500 mt-1">
          Référentiels, projets de référence et contenus d&apos;appui pédagogique — documents, photos, vidéos.
        </p>
      </div>

      <div className="card border border-slate-200 p-3">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(tabConfig) as ResourceTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                if (!editingId) setForm((p) => ({ ...p, categorie: tab }));
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-primary-50 border border-primary-200 text-primary-700'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {tabConfig[tab].icon}
              {tabConfig[tab].label}
            </button>
          ))}
        </div>
      </div>

      {isDirector && (
        <form onSubmit={editingId ? saveEdit : createResource} className="card border border-slate-200 space-y-4">
          <h2 className="text-slate-900 font-semibold inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {editingId ? 'Modifier la ressource' : 'Ajouter une ressource'}
          </h2>
          <div className="grid lg:grid-cols-2 gap-3">
            <input
              className="input-field"
              placeholder="Titre"
              required
              value={form.titre || ''}
              onChange={(e) => setForm((p) => ({ ...p, titre: e.target.value }))}
            />
            <select
              className="input-field"
              value={form.categorie || 'PROTECTION_ENFANCE'}
              onChange={(e) => setForm((p) => ({ ...p, categorie: e.target.value as ResourceCategory }))}
            >
              <option value="PROTECTION_ENFANCE">Protection de l&apos;enfance</option>
              <option value="SOFT_SKILLS">Soft skills SKA</option>
              <option value="PROJETS_REALISES">Projets réalisés</option>
            </select>
          </div>
          <textarea
            className="input-field min-h-[90px]"
            placeholder="Description"
            required
            value={form.description || ''}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          <input
            className="input-field"
            placeholder="Lien externe (optionnel) — YouTube, Drive, site…"
            value={form.lien || ''}
            onChange={(e) => setForm((p) => ({ ...p, lien: e.target.value }))}
          />
          <MediaDropZone
            multiple
            maxFiles={20}
            maxSizeMb={100}
            accept={ACCEPT_RESSOURCES}
            files={selectedFiles}
            onChange={setSelectedFiles}
            existingFiles={existingDropFiles}
            onRemoveExisting={(file) => {
              if (removingFileKey) return;
              setConfirmRemoveFile(file);
            }}
            onUrlPaste={(url) => {
              setForm((p) => ({ ...p, lien: url }));
              toast.success('Lien collé.');
            }}
            label="Documents, photos, vidéos"
            hint="PDF, Word, Excel, images, vidéos… Glisser-déposer ou Ctrl+V. Plusieurs fichiers possibles."
            disabled={saving}
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingId ? 'Enregistrer' : 'Publier la ressource'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="btn-ghost" disabled={saving}>
                Annuler
              </button>
            )}
          </div>
        </form>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {activeResources.map((resource) => {
          const files = resourceFiles(resource);
          return (
            <article key={resource.id} className="card border border-slate-200 hover:border-slate-300 transition-colors flex flex-col">
              <div className="w-11 h-11 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 mb-4">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-slate-900 font-semibold mb-2">{resource.titre}</h3>
              <p className="text-sm text-slate-600 leading-relaxed flex-1">{resource.description}</p>

              {resource.lien && (
                <a
                  href={resource.lien}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ouvrir le lien
                </a>
              )}

              {files.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {files.map((f, idx) => (
                    <li key={`${f.id ?? f.url}-${idx}`}>
                      <a
                        href={mediaUrl(f.url)}
                        target="_blank"
                        rel="noreferrer"
                        download={f.nom}
                        className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 text-sm text-slate-700 hover:border-primary-200 hover:bg-primary-50/40 transition-colors"
                      >
                        <span className="text-primary-700 shrink-0">{fileKindIcon(f.nom, f.mimeType)}</span>
                        <span className="truncate flex-1">{f.nom}</span>
                        <Download className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              {isDirector && (
                <div className="mt-4 flex gap-3 pt-3 border-t border-slate-100">
                  <button type="button" onClick={() => startEdit(resource)} className="text-sm font-medium text-[#004b57] hover:underline">
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(resource.id)}
                    className="inline-flex items-center gap-1 text-sm text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </div>
              )}
            </article>
          );
        })}
        {activeResources.length === 0 && (
          <div className="col-span-full card text-center py-12 text-slate-500 border-dashed border border-slate-200">
            Aucune ressource dans cet onglet.
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteId != null}
        title="Supprimer la ressource ?"
        message="Cette ressource et tous ses documents seront définitivement supprimés."
        confirmLabel="Supprimer"
        danger
        onConfirm={() => { if (deleteId != null) return removeResource(deleteId); }}
        onCancel={() => setDeleteId(null)}
      />

      <ConfirmDialog
        open={confirmRemoveFile != null}
        title="Retirer ce fichier ?"
        message={
          confirmRemoveFile
            ? `Le fichier « ${confirmRemoveFile.name} » sera définitivement retiré de cette ressource.`
            : ''
        }
        confirmLabel="Retirer"
        danger
        onConfirm={() => { if (confirmRemoveFile) return removeExistingFile(confirmRemoveFile); }}
        onCancel={() => setConfirmRemoveFile(null)}
      />
    </div>
  );
}
