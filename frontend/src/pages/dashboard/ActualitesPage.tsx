import React, { useEffect, useState } from 'react';
import { actualiteService } from '../../services/api';
import type { Actualite, ActualiteStatut } from '../../types';
import { Plus, Trash2, Edit2, Upload, Loader2, Sparkles, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { mediaUrl } from '../../utils/media';
import { PageLoadingSkeleton } from '../../components/ui/DashboardSkeletons';
import { useMinDelayLoading } from '../../hooks/useMinDelayLoading';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import MediaDropZone from '../../components/ui/MediaDropZone';

const emptyForm = {
  titre: '', resume: '', contenu: '', statut: 'EN_COURS' as ActualiteStatut,
  dateDebut: '', dateFin: '', actif: true,
};

export default function ActualitesPage() {
  const [items, setItems] = useState<Actualite[]>([]);
  const [loading, setLoading] = useState(true);
  const skeletonLoading = useMinDelayLoading(loading, 220);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Actualite | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await actualiteService.getAll();
      setItems(res.data);
    } catch {
      toast.error('Erreur chargement actualités.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setPhotoFiles([]);
    setShowModal(true);
  };

  const openEdit = (a: Actualite) => {
    setEditing(a);
    setPhotoFiles([]);
    setForm({
      titre: a.titre,
      resume: a.resume || '',
      contenu: a.contenu || '',
      statut: a.statut,
      dateDebut: a.dateDebut?.split('T')[0] || '',
      dateFin: a.dateFin?.split('T')[0] || '',
      actif: a.actif,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      dateDebut: form.dateDebut || undefined,
      dateFin: form.dateFin || undefined,
    };
    try {
      let savedId = editing?.id;
      if (editing) {
        await actualiteService.update(editing.id, payload);
        toast.success('Actualité mise à jour.');
      } else {
        const res = await actualiteService.create(payload);
        savedId = res.data?.id;
        toast.success('Actualité publiée dans « Nouveautés ».');
      }
      if (savedId && photoFiles[0]) {
        await actualiteService.uploadImage(savedId, photoFiles[0]);
      }
      setShowModal(false);
      setPhotoFiles([]);
      fetchAll();
    } catch {
      toast.error('Erreur sauvegarde.');
    }
  };

  const handleDelete = (id: number) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (confirmDeleteId == null) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      await actualiteService.delete(id);
      toast.success('Supprimée.');
      fetchAll();
    } catch {
      toast.error('Erreur.');
    }
  };

  const handleUpload = async (id: number, file: File) => {
    try {
      await actualiteService.uploadImage(id, file);
      toast.success('Image uploadée.');
      fetchAll();
    } catch {
      toast.error('Erreur upload.');
    }
  };

  const statutLabel: Record<ActualiteStatut, string> = {
    EN_COURS: 'En cours',
    A_VENIR: 'À venir',
    TERMINE: 'Terminé',
  };

  if (skeletonLoading) {
    return <PageLoadingSkeleton cardCount={5} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary-500" />
            Nouveautés &amp; Activités
          </h1>
          <p className="text-dark-400 mt-1">
            Gérez la section « Activités en cours » visible sur la page d'accueil publique.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Nouvelle activité
        </button>
      </div>

      <div className="space-y-4">
        {items.map((a) => (
          <div key={a.id} className={`card border flex flex-col sm:flex-row gap-4 ${a.actif ? 'border-dark-700' : 'opacity-60'}`}>
            {a.imageUrl ? (
              <img src={mediaUrl(a.imageUrl)} alt="" className="w-full sm:w-32 h-32 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-full sm:w-32 h-32 rounded-xl bg-dark-800 shrink-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-dark-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h3 className="font-bold text-white">{a.titre}</h3>
                <span className="badge badge-info text-xs">{statutLabel[a.statut]}</span>
                {!a.actif && <span className="badge badge-warning text-xs">Masquée</span>}
              </div>
              <p className="text-dark-400 text-sm line-clamp-2">{a.resume}</p>
              {a.dateDebut && (
                <p className="text-dark-500 text-xs mt-2">
                  Du {new Date(a.dateDebut).toLocaleDateString('fr-FR')}
                  {a.dateFin && ` au ${new Date(a.dateFin).toLocaleDateString('fr-FR')}`}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                <button type="button" onClick={() => openEdit(a)} className="btn-ghost p-1.5 text-xs"><Edit2 className="w-3.5 h-3.5" /> Modifier</button>
                <label className="btn-ghost p-1.5 text-xs cursor-pointer">
                  <Upload className="w-3.5 h-3.5" /> Photo
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(a.id, e.target.files[0])} />
                </label>
                <button type="button" onClick={() => actualiteService.update(a.id, { ...a, actif: !a.actif }).then(fetchAll)} className="btn-ghost p-1.5 text-xs">
                  {a.actif ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button type="button" onClick={() => handleDelete(a.id)} className="btn-ghost p-1.5 text-xs text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="card text-center py-12 text-dark-500 border-dashed">
            Aucune activité publiée. Ajoutez des nouveautés pour la page d'accueil.
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        title={editing ? 'Modifier activité' : 'Nouvelle activité'}
        size="lg"
        onClose={() => setShowModal(false)}
        footer={
          <>
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost w-full sm:w-auto justify-center">
              Annuler
            </button>
            <button type="submit" form="actualite-form" className="btn-primary w-full sm:w-auto justify-center">
              Enregistrer
            </button>
          </>
        }
      >
        <form id="actualite-form" onSubmit={handleSave} className="space-y-3 sm:space-y-4">
          <div>
            <label className="label">Titre *</label>
            <input className="input-field" required value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} />
          </div>
          <div>
            <label className="label">Statut</label>
            <select className="input-field" value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value as ActualiteStatut })}>
              <option value="EN_COURS">En cours</option>
              <option value="A_VENIR">À venir</option>
              <option value="TERMINE">Terminé</option>
            </select>
          </div>
          <div>
            <label className="label">Résumé</label>
            <textarea className="input-field" rows={2} value={form.resume} onChange={(e) => setForm({ ...form, resume: e.target.value })} />
          </div>
          <div>
            <label className="label">Description complète</label>
            <textarea className="input-field" rows={4} value={form.contenu} onChange={(e) => setForm({ ...form, contenu: e.target.value })} />
          </div>
          <MediaDropZone
            compact
            files={photoFiles}
            onChange={setPhotoFiles}
            accept="image/*"
            maxSizeMb={10}
            label="Photo de l'activité"
            hint="Glisser-déposer ou Ctrl+V"
            existingFiles={
              editing?.imageUrl && photoFiles.length === 0
                ? [{ name: 'Photo actuelle', url: mediaUrl(editing.imageUrl), kind: 'image' }]
                : []
            }
            onRemoveExisting={() => {
              /* remplacée à l'enregistrement si nouveau fichier */
            }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="label">Date début</label>
              <input type="date" className="input-field" value={form.dateDebut} onChange={(e) => setForm({ ...form, dateDebut: e.target.value })} />
            </div>
            <div>
              <label className="label">Date fin</label>
              <input type="date" className="input-field" value={form.dateFin} onChange={(e) => setForm({ ...form, dateFin: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-slate-600 text-sm cursor-pointer">
            <input type="checkbox" checked={form.actif} onChange={(e) => setForm({ ...form, actif: e.target.checked })} />
            Visible sur le site public
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDeleteId != null}
        title="Supprimer cette actualité ?"
        message="Cette nouveauté sera définitivement retirée du site."
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
