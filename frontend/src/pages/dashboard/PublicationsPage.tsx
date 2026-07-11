import React, { useEffect, useState } from 'react';
import { publicationService } from '../../services/api';
import type { Publication, PublicationType } from '../../types';
import { Plus, Trash2, Edit2, Loader2, Megaphone, Eye, EyeOff, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { mediaUrl } from '../../utils/media';
import { PageLoadingSkeleton } from '../../components/ui/DashboardSkeletons';
import { useMinDelayLoading } from '../../hooks/useMinDelayLoading';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import MediaDropZone from '../../components/ui/MediaDropZone';

const emptyForm = {
  titre: '',
  description: '',
  type: 'TEXTE' as PublicationType,
  contenu: '',
  lienExterne: '',
  mediaUrl: '',
  actif: true,
  ordre: 0,
};

export default function PublicationsPage() {
  const [items, setItems] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Publication | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const skeletonLoading = useMinDelayLoading(loading, 220);

  const needsMedia = form.type === 'IMAGE' || form.type === 'VIDEO';
  const localFile = localFiles[0] || null;

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await publicationService.getAll();
      setItems(res.data);
    } catch {
      toast.error('Erreur chargement publications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setLocalFiles([]);
    setShowModal(true);
  };

  const openEdit = (p: Publication) => {
    setEditing(p);
    setLocalFiles([]);
    const external =
      p.type === 'IMAGE' && p.mediaUrl?.startsWith('http')
        ? p.mediaUrl
        : p.lienExterne || '';
    setForm({
      titre: p.titre,
      description: p.description || '',
      type: p.type,
      contenu: p.contenu || '',
      lienExterne: external,
      mediaUrl: p.mediaUrl || '',
      actif: p.actif,
      ordre: p.ordre ?? 0,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needsMedia && !localFile && !form.lienExterne.trim() && !form.mediaUrl) {
      toast.error(
        form.type === 'IMAGE'
          ? 'Ajoutez une image (fichier ou lien).'
          : 'Ajoutez une vidéo (fichier ou lien).',
      );
      return;
    }

    setUploading(true);
    try {
      const payload: Partial<Publication> = {
        titre: form.titre,
        description: form.description,
        type: form.type,
        contenu: form.contenu,
        actif: form.actif,
        ordre: form.ordre,
        lienExterne: '',
        mediaUrl: undefined,
      };

      if (needsMedia && !localFile && form.lienExterne.trim()) {
        const url = form.lienExterne.trim();
        if (form.type === 'IMAGE') {
          payload.mediaUrl = url;
          payload.lienExterne = '';
        } else {
          payload.lienExterne = url;
          payload.mediaUrl = '';
        }
      } else if (editing && !localFile) {
        payload.lienExterne = editing.lienExterne || '';
        payload.mediaUrl = editing.mediaUrl;
      }

      let saved: Publication;
      if (editing) {
        const res = await publicationService.update(editing.id, payload);
        saved = res.data;
      } else {
        const res = await publicationService.create(payload);
        saved = res.data;
      }

      if (localFile) {
        await publicationService.uploadMedia(saved.id, localFile);
      }

      toast.success(editing ? 'Publication mise à jour.' : 'Publication créée — visible sur le site public.');
      setShowModal(false);
      setLocalFiles([]);
      fetchAll();
    } catch {
      toast.error('Erreur lors de la sauvegarde.');
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (confirmDeleteId == null) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      await publicationService.delete(id);
      toast.success('Publication supprimée.');
      fetchAll();
    } catch {
      toast.error('Erreur suppression.');
    }
  };

  const toggleActif = async (p: Publication) => {
    try {
      await publicationService.update(p.id, { ...p, actif: !p.actif });
      fetchAll();
    } catch {
      toast.error('Erreur.');
    }
  };

  const existingMedia =
    !localFile && needsMedia
      ? form.type === 'IMAGE' && (form.lienExterne || form.mediaUrl)
        ? [
            {
              name: 'Image actuelle',
              url: form.lienExterne || (form.mediaUrl?.startsWith('http') ? form.mediaUrl : mediaUrl(form.mediaUrl)),
              kind: 'image' as const,
            },
          ]
        : form.type === 'VIDEO' && (form.lienExterne || (editing?.mediaUrl && !editing.mediaUrl.startsWith('http')))
          ? [
              {
                name: form.lienExterne ? 'Lien vidéo' : 'Vidéo enregistrée',
                url: form.lienExterne || undefined,
                kind: 'video' as const,
              },
            ]
          : []
      : [];

  const cardThumb = (p: Publication) => {
    if (p.type === 'IMAGE') {
      const src = p.mediaUrl || p.lienExterne;
      if (src) return <img src={mediaUrl(src)} alt="" className="w-24 h-24 rounded-xl object-cover shrink-0" />;
    }
    return (
      <div className="w-24 h-24 rounded-xl bg-dark-800 flex items-center justify-center shrink-0 text-dark-400 text-xs text-center p-2">
        {p.type}
      </div>
    );
  };

  if (skeletonLoading) {
    return <PageLoadingSkeleton cardCount={6} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-primary-500" />
            Publications &amp; Annonces
          </h1>
          <p className="text-dark-400 mt-1">
            Ajoutez des images, vidéos ou textes visibles sur la page d&apos;accueil.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Nouvelle publication
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {items.map((p) => (
          <div key={p.id} className={`card border ${p.actif ? 'border-dark-700' : 'border-dark-800 opacity-60'}`}>
            <div className="flex gap-4">
              {cardThumb(p)}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-white truncate">{p.titre}</h3>
                  <span className={`badge text-xs ${p.actif ? 'badge-success' : 'badge-warning'}`}>
                    {p.actif ? 'En ligne' : 'Masquée'}
                  </span>
                </div>
                <p className="text-dark-400 text-sm mt-1 line-clamp-2">{p.description || p.contenu}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button type="button" onClick={() => openEdit(p)} className="btn-ghost p-1.5 text-xs">
                    <Edit2 className="w-3.5 h-3.5" /> Modifier
                  </button>
                  <button type="button" onClick={() => toggleActif(p)} className="btn-ghost p-1.5 text-xs">
                    {p.actif ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {p.actif ? 'Masquer' : 'Publier'}
                  </button>
                  <button type="button" onClick={() => setConfirmDeleteId(p.id)} className="btn-ghost p-1.5 text-xs text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="col-span-full card text-center py-12 text-dark-500 border-dashed">
            Aucune publication. Créez votre première annonce pour le site public.
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        title={editing ? 'Modifier publication' : 'Nouvelle publication'}
        size="lg"
        onClose={() => {
          setShowModal(false);
          setLocalFiles([]);
        }}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setLocalFiles([]);
              }}
              className="btn-ghost w-full sm:w-auto justify-center"
            >
              Annuler
            </button>
            <button type="submit" form="publication-form" disabled={uploading} className="btn-primary w-full sm:w-auto justify-center">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Enregistrer
            </button>
          </>
        }
      >
        <form id="publication-form" onSubmit={handleSave} className="space-y-3 sm:space-y-4">
          <div>
            <label className="label">Titre *</label>
            <input className="input-field" required value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} />
          </div>
          <div>
            <label className="label">Type</label>
            <select
              className="input-field"
              value={form.type}
              onChange={(e) => {
                const type = e.target.value as PublicationType;
                setLocalFiles([]);
                setForm({ ...form, type, lienExterne: '', mediaUrl: '' });
              }}
            >
              <option value="TEXTE">Texte</option>
              <option value="IMAGE">Image</option>
              <option value="VIDEO">Vidéo</option>
            </select>
          </div>

          {needsMedia && (
            <div className="space-y-3">
              <MediaDropZone
                files={localFiles}
                onChange={(files) => {
                  setLocalFiles(files.slice(0, 1));
                  if (files[0]) setForm((f) => ({ ...f, lienExterne: '', mediaUrl: '' }));
                }}
                accept={form.type === 'IMAGE' ? 'image/*' : 'video/*'}
                maxSizeMb={100}
                existingFiles={existingMedia}
                onRemoveExisting={() => setForm((f) => ({ ...f, lienExterne: '', mediaUrl: '' }))}
                onUrlPaste={(url) => {
                  setLocalFiles([]);
                  setForm((f) => ({ ...f, lienExterne: url, mediaUrl: '' }));
                  toast.success('Lien collé.');
                }}
                label={form.type === 'IMAGE' ? 'Image' : 'Vidéo'}
                hint={
                  form.type === 'IMAGE'
                    ? 'Fichier local ou collez une URL image.'
                    : 'Fichier local, YouTube, ou autre URL vidéo.'
                }
                disabled={uploading}
              />
              <div>
                <label className="label flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" />
                  {form.type === 'IMAGE' ? 'Lien image (URL)' : 'Lien vidéo (YouTube ou autre)'}
                </label>
                <input
                  className="input-field"
                  placeholder={
                    form.type === 'IMAGE'
                      ? 'https://exemple.com/photo.jpg'
                      : 'https://youtube.com/watch?v=… ou URL .mp4'
                  }
                  value={form.lienExterne}
                  onChange={(e) => {
                    setLocalFiles([]);
                    setForm((f) => ({ ...f, lienExterne: e.target.value, mediaUrl: '' }));
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label className="label">Description courte (aperçu)</label>
            <textarea className="input-field" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Contenu complet (modal au clic)</label>
            <textarea className="input-field" rows={4} value={form.contenu} onChange={(e) => setForm({ ...form, contenu: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="label">Ordre d&apos;affichage</label>
              <input type="number" className="input-field" value={form.ordre} onChange={(e) => setForm({ ...form, ordre: Number(e.target.value) })} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-slate-600 text-sm cursor-pointer">
                <input type="checkbox" checked={form.actif} onChange={(e) => setForm({ ...form, actif: e.target.checked })} className="rounded" />
                Visible sur le site
              </label>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDeleteId != null}
        title="Supprimer cette publication ?"
        message="La publication sera définitivement retirée du site public."
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
