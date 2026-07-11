import React, { useEffect, useState } from 'react';
import { galerieService } from '../../services/api';
import type { GaleriePhoto } from '../../types';
import { Plus, Trash2, Edit2, Upload, Image as ImageIcon, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { mediaUrl } from '../../utils/media';
import { PageLoadingSkeleton } from '../../components/ui/DashboardSkeletons';
import { useMinDelayLoading } from '../../hooks/useMinDelayLoading';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import MediaDropZone from '../../components/ui/MediaDropZone';

const emptyForm = {
  legende: '',
  ordre: 0,
  actif: true,
};

export default function GaleriePage() {
  const [items, setItems] = useState<GaleriePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const skeletonLoading = useMinDelayLoading(loading, 220);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GaleriePhoto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await galerieService.getAll();
      setItems(res.data);
    } catch {
      toast.error('Erreur chargement galerie.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, ordre: items.length });
    setPhotoFiles([]);
    setShowModal(true);
  };

  const openEdit = (photo: GaleriePhoto) => {
    setEditing(photo);
    setPhotoFiles([]);
    setForm({
      legende: photo.legende,
      ordre: photo.ordre,
      actif: photo.actif,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.legende.trim()) {
      toast.error('La légende est obligatoire.');
      return;
    }
    try {
      let savedId = editing?.id;
      const payload = {
        legende: form.legende.trim(),
        ordre: Number(form.ordre) || 0,
        actif: form.actif,
      };
      if (editing) {
        await galerieService.update(editing.id, { ...editing, ...payload });
        toast.success('Photo mise à jour.');
      } else {
        const res = await galerieService.create(payload);
        savedId = res.data?.id;
        toast.success('Photo ajoutée à la galerie.');
      }
      if (savedId && photoFiles[0]) {
        await galerieService.uploadImage(savedId, photoFiles[0]);
      }
      setShowModal(false);
      setPhotoFiles([]);
      fetchAll();
    } catch {
      toast.error('Erreur lors de la sauvegarde.');
    }
  };

  const handleUpload = async (id: number, file: File) => {
    try {
      await galerieService.uploadImage(id, file);
      toast.success('Image remplacée.');
      fetchAll();
    } catch {
      toast.error('Erreur upload.');
    }
  };

  const movePhoto = async (photo: GaleriePhoto, direction: -1 | 1) => {
    const sorted = [...items].sort((a, b) => a.ordre - b.ordre);
    const index = sorted.findIndex((p) => p.id === photo.id);
    const target = sorted[index + direction];
    if (!target) return;
    try {
      await Promise.all([
        galerieService.update(photo.id, { ...photo, ordre: target.ordre }),
        galerieService.update(target.id, { ...target, ordre: photo.ordre }),
      ]);
      fetchAll();
    } catch {
      toast.error('Impossible de réordonner.');
    }
  };

  const confirmDelete = async () => {
    if (confirmDeleteId == null) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      await galerieService.delete(id);
      toast.success('Photo supprimée.');
      fetchAll();
    } catch {
      toast.error('Erreur suppression.');
    }
  };

  if (skeletonLoading) {
    return <PageLoadingSkeleton cardCount={6} message="Chargement de la galerie…" />;
  }

  const sortedItems = [...items].sort((a, b) => a.ordre - b.ordre);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-7 h-7 text-primary-500" />
            Galerie du site
          </h1>
          <p className="text-dark-400 mt-1">
            Ajoutez, modifiez ou masquez les photos de la section « Galerie » sur la page d&apos;accueil.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Ajouter une photo
        </button>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedItems.map((photo, index) => (
          <div
            key={photo.id}
            className={`card border overflow-hidden flex flex-col ${photo.actif ? 'border-dark-700' : 'opacity-60'}`}
          >
            {photo.imageUrl ? (
              <img
                src={mediaUrl(photo.imageUrl)}
                alt=""
                className="w-full aspect-[4/3] object-cover"
              />
            ) : (
              <div className="w-full aspect-[4/3] bg-dark-800 flex items-center justify-center">
                <ImageIcon className="w-10 h-10 text-dark-600" />
              </div>
            )}
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="badge badge-info text-xs">Ordre {photo.ordre}</span>
                {!photo.actif && <span className="badge badge-warning text-xs">Masquée</span>}
              </div>
              <p className="text-white font-medium text-sm line-clamp-2 flex-1">{photo.legende}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <button type="button" onClick={() => openEdit(photo)} className="btn-ghost p-1.5 text-xs">
                  <Edit2 className="w-3.5 h-3.5" /> Modifier
                </button>
                <label className="btn-ghost p-1.5 text-xs cursor-pointer">
                  <Upload className="w-3.5 h-3.5" /> Photo
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleUpload(photo.id, e.target.files[0])}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => galerieService.update(photo.id, { ...photo, actif: !photo.actif }).then(fetchAll)}
                  className="btn-ghost p-1.5 text-xs"
                >
                  {photo.actif ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => movePhoto(photo, -1)}
                  className="btn-ghost p-1.5 text-xs disabled:opacity-40"
                  title="Monter"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === sortedItems.length - 1}
                  onClick={() => movePhoto(photo, 1)}
                  className="btn-ghost p-1.5 text-xs disabled:opacity-40"
                  title="Descendre"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(photo.id)}
                  className="btn-ghost p-1.5 text-xs text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sortedItems.length === 0 && (
        <div className="card text-center py-12 text-dark-500 border-dashed">
          Aucune photo dans la galerie. Ajoutez des visuels pour la page d&apos;accueil.
        </div>
      )}

      <Modal
        open={showModal}
        title={editing ? 'Modifier la photo' : 'Nouvelle photo'}
        size="lg"
        onClose={() => setShowModal(false)}
        footer={
          <>
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost w-full sm:w-auto justify-center">
              Annuler
            </button>
            <button type="submit" form="galerie-form" className="btn-primary w-full sm:w-auto justify-center">
              Enregistrer
            </button>
          </>
        }
      >
        <form id="galerie-form" onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Légende *</label>
            <textarea
              className="input-field"
              rows={2}
              required
              placeholder="Ex : Atelier Scratch avec les élèves de Lomé"
              value={form.legende}
              onChange={(e) => setForm({ ...form, legende: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Ordre d&apos;affichage</label>
            <input
              type="number"
              min={0}
              className="input-field"
              value={form.ordre}
              onChange={(e) => setForm({ ...form, ordre: Number(e.target.value) })}
            />
          </div>
          <MediaDropZone
            compact
            files={photoFiles}
            onChange={setPhotoFiles}
            accept="image/*"
            maxSizeMb={10}
            label="Photo"
            hint="JPG, PNG ou WebP — max 10 Mo"
            existingFiles={
              editing?.imageUrl && photoFiles.length === 0
                ? [{ name: 'Photo actuelle', url: mediaUrl(editing.imageUrl), kind: 'image' }]
                : []
            }
            onRemoveExisting={() => {}}
          />
          <label className="flex items-center gap-2 text-slate-600 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.actif}
              onChange={(e) => setForm({ ...form, actif: e.target.checked })}
            />
            Visible sur le site public
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDeleteId != null}
        title="Supprimer cette photo ?"
        message="Elle sera retirée définitivement de la galerie publique."
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
