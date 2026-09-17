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
  heureDebut: '08:00',
  heureFin: '11:00',
  notes: '',
};

function formatHeure(value?: string | number[] | null): string {
  if (value == null || value === '') return '';
  if (Array.isArray(value) && value.length >= 2) {
    return `${String(value[0]).padStart(2, '0')}:${String(value[1]).padStart(2, '0')}`;
  }
  const text = String(value);
  return text.length > 5 ? text.slice(0, 5) : text;
}

function normalizeEntry(raw: FormateurAgendaEntry): FormateurAgendaEntry {
  const centreId = raw.centre?.id ?? raw.centreId;
  const centreNom = raw.centreNom || raw.centre?.nom || 'Centre';
  return {
    ...raw,
    centre: { id: Number(centreId || 0), nom: centreNom },
    centreNom,
    jourSemaine: Number(raw.jourSemaine),
    heureDebut: formatHeure(raw.heureDebut),
    heureFin: formatHeure(raw.heureFin),
    notes: raw.notes || null,
  };
}

function todayJourId(): number {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 7 : jsDay;
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
  const jourAujourdhui = todayJourId();

  const load = async () => {
    const [entriesRes, centresRes] = await Promise.allSettled([
      agendaService.getMine(),
      centreService.getMesCentres(),
    ]);
    if (entriesRes.status === 'fulfilled') {
      const list = Array.isArray(entriesRes.value.data) ? entriesRes.value.data : [];
      setEntries(list.map((item) => normalizeEntry(item)));
    } else {
      toast.error("Impossible de charger l'agenda.");
    }
    if (centresRes.status === 'fulfilled') {
      setCentres(centresRes.value.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const entriesByJour = useMemo(() => {
    const map = new Map<number, FormateurAgendaEntry[]>();
    JOURS.forEach((j) => map.set(j.id, []));
    entries.forEach((entry) => {
      const list = map.get(entry.jourSemaine) || [];
      list.push(entry);
      map.set(entry.jourSemaine, list);
    });
    map.forEach((list) => list.sort((a, b) => formatHeure(a.heureDebut).localeCompare(formatHeure(b.heureDebut))));
    return map;
  }, [entries]);

  const openCreate = (jourId?: number) => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      jourSemaine: String(jourId || jourAujourdhui),
      centreId: centres[0] ? String(centres[0].id) : '',
    });
    setShowForm(true);
  };

  const openEdit = (entry: FormateurAgendaEntry) => {
    setEditingId(entry.id);
    setForm({
      centreId: String(entry.centre?.id ?? ''),
      jourSemaine: String(entry.jourSemaine),
      heureDebut: formatHeure(entry.heureDebut),
      heureFin: formatHeure(entry.heureFin),
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
        await agendaService.update(editingId, payload);
        toast.success('Créneau enregistré.');
      } else {
        await agendaService.create(payload);
        toast.success('Créneau ajouté.');
      }
      closeForm();
      await load();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Impossible d'enregistrer ce créneau.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await agendaService.remove(toDelete.id);
      toast.success('Créneau supprimé.');
      await load();
    } catch {
      toast.error('Impossible de supprimer ce créneau.');
    } finally {
      setToDelete(null);
    }
  };

  if (loading) return <PageLoadingSkeleton cardCount={4} />;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-[#004b57] text-white px-5 py-5 sm:px-6 sm:py-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Planning récurrent</p>
          <h1 className="mt-1 text-2xl font-bold">Mon agenda</h1>
          <p className="mt-1.5 text-sm text-white/80 max-w-xl">
            Indiquez le jour, le centre et les horaires. Ce planning reste enregistré : il ne disparaît plus au rafraîchissement.
          </p>
          <p className="mt-2 text-sm font-medium text-teal-100">
            {entries.length === 0
              ? 'Aucun créneau pour l’instant'
              : `${entries.length} créneau${entries.length > 1 ? 'x' : ''} cette semaine`}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-[#004b57] font-semibold px-4 py-2.5 hover:bg-teal-50 disabled:opacity-50"
          onClick={() => openCreate()}
          disabled={centres.length === 0}
        >
          <Plus className="w-4 h-4" /> Ajouter un créneau
        </button>
      </div>

      {centres.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Vous n&apos;êtes rattaché à aucun centre pour le moment : impossible d&apos;ajouter un créneau.
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              {editingId != null ? 'Modifier le créneau' : 'Nouveau créneau'}
            </h2>
            <button type="button" onClick={closeForm} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Début</label>
                <input
                  type="time"
                  className="input-field"
                  value={form.heureDebut}
                  onChange={(e) => setForm((f) => ({ ...f, heureDebut: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Fin</label>
                <input
                  type="time"
                  className="input-field"
                  value={form.heureFin}
                  onChange={(e) => setForm((f) => ({ ...f, heureFin: e.target.value }))}
                />
              </div>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="label">Notes (optionnel)</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex. Atelier Scratch, groupe avancé…"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex gap-2 justify-end">
              <button type="button" className="btn-ghost" onClick={closeForm}>Annuler</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
        {JOURS.map((jour) => {
          const dayEntries = entriesByJour.get(jour.id) || [];
          const isToday = jour.id === jourAujourdhui;
          return (
            <section
              key={jour.id}
              className={`rounded-2xl border bg-white flex flex-col min-h-[220px] overflow-hidden ${
                isToday ? 'border-[#004b57] shadow-md' : 'border-slate-200'
              }`}
            >
              <header className={`px-3 py-2.5 flex items-center justify-between ${
                isToday ? 'bg-[#004b57] text-white' : 'bg-slate-50 text-slate-700 border-b border-slate-100'
              }`}>
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4" />
                  <div>
                    <p className="text-sm font-bold leading-none">{jour.short}</p>
                    <p className={`text-[11px] mt-0.5 ${isToday ? 'text-white/80' : 'text-slate-400'}`}>{jour.label}</p>
                  </div>
                </div>
                {isToday && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide bg-white/20 rounded-full px-2 py-0.5">
                    Aujourd’hui
                  </span>
                )}
              </header>
              <div className="p-2.5 space-y-2 flex-1">
                {dayEntries.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => openCreate(jour.id)}
                    disabled={centres.length === 0}
                    className="w-full h-full min-h-[120px] rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs hover:border-[#004b57]/40 hover:text-[#004b57] disabled:opacity-40"
                  >
                    Libre — ajouter
                  </button>
                ) : (
                  dayEntries.map((entry) => (
                    <article key={entry.id} className="rounded-xl border border-teal-100 bg-teal-50/70 p-3">
                      <p className="flex items-center gap-1.5 text-sm font-bold text-[#004b57]">
                        <Clock className="w-3.5 h-3.5" />
                        {formatHeure(entry.heureDebut)} – {formatHeure(entry.heureFin)}
                      </p>
                      <p className="flex items-start gap-1.5 text-xs text-slate-700 mt-1.5">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                        <span className="leading-snug">{entry.centreNom || entry.centre?.nom}</span>
                      </p>
                      {entry.notes && (
                        <p className="text-xs text-slate-500 mt-1.5 leading-snug">{entry.notes}</p>
                      )}
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          type="button"
                          onClick={() => openEdit(entry)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-white"
                        >
                          <Pencil className="w-3 h-3" /> Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => setToDelete(entry)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3 h-3" /> Retirer
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
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
