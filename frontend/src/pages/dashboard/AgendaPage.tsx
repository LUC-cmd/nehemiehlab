import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarDays, Clock, MapPin, Plus, Trash2, Pencil, X } from 'lucide-react';
import { agendaService, centreService } from '../../services/api';
import type { Centre, FormateurAgendaEntry } from '../../types';
import { PageLoadingSkeleton } from '../../components/ui/DashboardSkeletons';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const JOURS: { id: number; label: string; short: string }[] = [
  { id: 1, label: 'Lundi', short: 'Lun' },
  { id: 2, label: 'Mardi', short: 'Mar' },
  { id: 3, label: 'Mercredi', short: 'Mer' },
  { id: 4, label: 'Jeudi', short: 'Jeu' },
  { id: 5, label: 'Vendredi', short: 'Ven' },
  { id: 6, label: 'Samedi', short: 'Sam' },
  { id: 7, label: 'Dimanche', short: 'Dim' },
];

type FormState = {
  centreId: string;
  jourSemaine: string;
  heureDebut: string;
  heureFin: string;
  notes: string;
};

const emptyForm: FormState = {
  centreId: '',
  jourSemaine: '1',
  heureDebut: '',
  heureFin: '',
  notes: '',
};

function trimHeure(value?: string | null): string {
  if (!value) return '';
  return value.length > 5 ? value.slice(0, 5) : value;
}

export default function AgendaPage() {
  const [entries, setEntries] = useState<FormateurAgendaEntry[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<FormateurAgendaEntry | null>(null);

  const load = async () => {
    const [entriesRes, centresRes] = await Promise.allSettled([
      agendaService.getMine(),
      centreService.getMesCentres(),
    ]);
    if (entriesRes.status === 'fulfilled') {
      setEntries(entriesRes.value.data || []);
    } else {
      toast.error("Impossible de charger l'agenda.");
    }
    if (centresRes.status === 'fulfilled') {
      setCentres(centresRes.value.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entriesByJour = useMemo(() => {
    const map = new Map<number, FormateurAgendaEntry[]>();
    JOURS.forEach((j) => map.set(j.id, []));
    entries.forEach((entry) => {
      const list = map.get(entry.jourSemaine) || [];
      list.push(entry);
      map.set(entry.jourSemaine, list);
    });
    map.forEach((list) => list.sort((a, b) => trimHeure(a.heureDebut).localeCompare(trimHeure(b.heureDebut))));
    return map;
  }, [entries]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, centreId: centres[0] ? String(centres[0].id) : '' });
    setShowForm(true);
  };

  const openEdit = (entry: FormateurAgendaEntry) => {
    setEditingId(entry.id);
    setForm({
      centreId: String(entry.centre?.id ?? ''),
      jourSemaine: String(entry.jourSemaine),
      heureDebut: trimHeure(entry.heureDebut),
      heureFin: trimHeure(entry.heureFin),
      notes: entry.notes || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.centreId) {
      toast.error('Choisissez un centre.');
      return;
    }
    if (!form.heureDebut || !form.heureFin) {
      toast.error('Renseignez les heures de début et de fin.');
      return;
    }
    if (form.heureFin <= form.heureDebut) {
      toast.error("L'heure de fin doit être après l'heure de début.");
      return;
    }

    const payload = {
      centreId: Number(form.centreId),
      jourSemaine: Number(form.jourSemaine),
      heureDebut: form.heureDebut,
      heureFin: form.heureFin,
      notes: form.notes.trim() || undefined,
    };

    setSaving(true);
    try {
      if (editingId != null) {
        const { data } = await agendaService.update(editingId, payload);
        setEntries((prev) => prev.map((entry) => (entry.id === editingId ? data : entry)));
        toast.success('Créneau modifié.');
      } else {
        const { data } = await agendaService.create(payload);
        setEntries((prev) => [...prev, data]);
        toast.success('Créneau ajouté.');
      }
      closeForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Impossible d'enregistrer ce créneau.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await agendaService.remove(toDelete.id);
      setEntries((prev) => prev.filter((entry) => entry.id !== toDelete.id));
      toast.success('Créneau supprimé.');
    } catch {
      toast.error('Impossible de supprimer ce créneau.');
    } finally {
      setToDelete(null);
    }
  };

  if (loading) return <PageLoadingSkeleton cardCount={4} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mon agenda</h1>
          <p className="mt-1 text-slate-500">
            Planifiez vos créneaux récurrents par centre, jour et horaire.
          </p>
        </div>
        <button type="button" className="btn-primary self-start" onClick={openCreate} disabled={centres.length === 0}>
          <Plus className="w-4 h-4" /> Ajouter un créneau
        </button>
      </div>

      {centres.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Vous n&apos;êtes rattaché à aucun centre pour le moment : impossible d&apos;ajouter un créneau.
        </div>
      )}

      {showForm && (
        <div className="card border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">
              {editingId != null ? 'Modifier le créneau' : 'Nouveau créneau'}
            </h2>
            <button type="button" onClick={closeForm} className="p-1.5 rounded text-slate-500 hover:bg-slate-100">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2">
              <label className="label">Centre</label>
              <select
                className="input-field"
                value={form.centreId}
                onChange={(e) => setForm((f) => ({ ...f, centreId: e.target.value }))}
              >
                {centres.map((centre) => (
                  <option key={centre.id} value={centre.id}>{centre.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Jour</label>
              <select
                className="input-field"
                value={form.jourSemaine}
                onChange={(e) => setForm((f) => ({ ...f, jourSemaine: e.target.value }))}
              >
                {JOURS.map((j) => (
                  <option key={j.id} value={j.id}>{j.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Heure de début</label>
              <input
                type="time"
                className="input-field"
                value={form.heureDebut}
                onChange={(e) => setForm((f) => ({ ...f, heureDebut: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Heure de fin</label>
              <input
                type="time"
                className="input-field"
                value={form.heureFin}
                onChange={(e) => setForm((f) => ({ ...f, heureFin: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-5">
              <label className="label">Notes (optionnel)</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex. Atelier Scratch, groupe avancé…"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-5 flex gap-2 justify-end">
              <button type="button" className="btn-ghost" onClick={closeForm}>Annuler</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Enregistrement…' : editingId != null ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {JOURS.map((jour) => {
          const dayEntries = entriesByJour.get(jour.id) || [];
          return (
            <div key={jour.id} className="rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-bold uppercase tracking-wide text-slate-600">{jour.label}</span>
              </div>
              <div className="p-2 space-y-2 flex-1 min-h-[64px]">
                {dayEntries.length === 0 ? (
                  <p className="text-[11px] text-slate-300 text-center py-3">—</p>
                ) : (
                  dayEntries.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-primary-200 bg-primary-50 p-2">
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-primary-700">
                        <Clock className="w-3 h-3" />
                        {trimHeure(entry.heureDebut)}–{trimHeure(entry.heureFin)}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{entry.centreNom || entry.centre?.nom}</span>
                      </div>
                      {entry.notes && (
                        <p className="text-[10px] text-slate-500 mt-1 leading-snug">{entry.notes}</p>
                      )}
                      <div className="flex items-center gap-1 mt-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(entry)}
                          className="p-1 rounded text-slate-500 hover:text-primary-700 hover:bg-primary-100"
                          title="Modifier"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setToDelete(entry)}
                          className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer ce créneau ?"
        message="Ce créneau récurrent sera retiré de votre agenda. Cette action est définitive."
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
