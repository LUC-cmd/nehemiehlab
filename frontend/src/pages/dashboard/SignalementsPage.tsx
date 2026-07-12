import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { centreService, eleveService, signalementService, notificationService } from '../../services/api';
import type { Signalement } from '../../types';
import type { Centre, Eleve } from '../../types';
import { ALERT_PRESETS, type AlertPresetId } from '../../constants/alertPresets';
import ValidationActionButton from '../../components/ui/ValidationActionButton';
import {
  AlertTriangle, Check, Clock, User, Calendar, PlusCircle, ShieldAlert, Wrench,
  FlagTriangleRight, Send, Megaphone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageLoadingSkeleton } from '../../components/ui/DashboardSkeletons';
import { useMinDelayLoading } from '../../hooks/useMinDelayLoading';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';

export default function SignalementsPage() {
  const { hasRole } = useAuth();
  const { hasFeature } = useAccess();
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);
  const skeletonLoading = useMinDelayLoading(loading, 220);
  const [filter, setFilter] = useState<'ALL' | 'EN_ATTENTE' | 'TRAITE'>('ALL');
  const [targetFilter, setTargetFilter] = useState<'ALL' | 'ENFANT' | 'CENTRE'>('ALL');
  const [selectedCentreFilter, setSelectedCentreFilter] = useState<string>('ALL');
  const [dateDebutFilter, setDateDebutFilter] = useState('');
  const [dateFinFilter, setDateFinFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'NORMALE' | 'URGENTE'>('ALL');

  const [newType, setNewType] = useState<'ENFANT' | 'CENTRE'>('ENFANT');
  const [newCentreId, setNewCentreId] = useState('');
  const [newEleveId, setNewEleveId] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIncludeInReport, setNewIncludeInReport] = useState(true);
  const [newPriorite, setNewPriorite] = useState<'NORMALE' | 'URGENTE'>('NORMALE');
  const [newEtatEquipements, setNewEtatEquipements] = useState('');
  const [newDefis, setNewDefis] = useState('');

  const [broadcastTitre, setBroadcastTitre] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastRoles, setBroadcastRoles] = useState<string[]>(['FORMATEUR']);
  const [broadcastPreset, setBroadcastPreset] = useState<AlertPresetId>('FORMATEUR');
  const [broadcastCentreId, setBroadcastCentreId] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);

  const isDirecteur = hasRole('DIRECTEUR');

  useEffect(() => {
    fetchCentres();
    fetchSignalements();
  }, []);

  useEffect(() => {
    if (!newCentreId) {
      setEleves([]);
      setNewEleveId('');
      return;
    }
    fetchEleves(Number(newCentreId));
  }, [newCentreId]);

  const fetchSignalements = async () => {
    setLoading(true);
    try {
      const res = await signalementService.getAll();
      setSignalements(res.data);
    } catch {
      toast.error('Erreur lors du chargement des signalements.');
      setSignalements([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCentres = async () => {
    try {
      const res = hasRole('DIRECTEUR') ? await centreService.getAll() : await centreService.getMesCentres();
      setCentres(res.data);
      if (res.data.length > 0) setNewCentreId(String(res.data[0].id));
    } catch {
      setCentres([]);
    }
  };

  const fetchEleves = async (centreId: number) => {
    try {
      const res = await eleveService.getByCentre(centreId);
      setEleves(res.data);
    } catch {
      setEleves([]);
    }
  };

  const handleTraiter = async (id: number) => {
    try {
      await signalementService.traiter(id);
      toast.success('Signalement marqué comme traité.');
      fetchSignalements();
    } catch {
      toast.error('Erreur lors du traitement du signalement.');
    }
  };

  const handleCreateSignalement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim()) {
      toast.error('Veuillez décrire la situation.');
      return;
    }
    try {
      if (newType === 'ENFANT') {
        if (!newEleveId) {
          toast.error('Veuillez sélectionner un enfant concerné.');
          return;
        }
        await signalementService.createAlerteEnfant({
          eleveId: Number(newEleveId),
          description: newDescription.trim(),
          inclureDansRapport: newIncludeInReport,
          priorite: newPriorite,
          etatEquipements: newEtatEquipements.trim() || undefined,
          defis: newDefis.trim() || undefined,
        });
      } else {
        if (!newCentreId) {
          toast.error('Veuillez sélectionner le centre concerné.');
          return;
        }
        await signalementService.createAlerteCentre({
          centreId: Number(newCentreId),
          description: newDescription.trim(),
          priorite: newPriorite,
          etatEquipements: newEtatEquipements.trim() || undefined,
          defis: newDefis.trim() || undefined,
        });
      }
      toast.success('Alerte enregistrée avec succès.');
      setNewDescription('');
      setNewEleveId('');
      setNewIncludeInReport(true);
      setNewPriorite('NORMALE');
      setNewEtatEquipements('');
      setNewDefis('');
      fetchSignalements();
    } catch {
      toast.error("Erreur lors de l'enregistrement de l'alerte.");
    }
  };

  const handleToggleInclusionRapport = async (s: Signalement) => {
    try {
      await signalementService.setInclusionRapport(s.id, !s.inclureDansRapport);
      toast.success('Option rapport mise à jour.');
      fetchSignalements();
    } catch {
      toast.error('Impossible de modifier cette option.');
    }
  };

  const handleRelayer = async (id: number, roles: string[]) => {
    try {
      const res = await signalementService.relayer(id, { roles });
      toast.success(res.data?.message || 'Alerte relayée (app + email).');
    } catch {
      toast.error('Erreur lors du relais de l\'alerte.');
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitre.trim() || !broadcastMessage.trim() || broadcastRoles.length === 0) {
      toast.error('Titre, message et au moins un destinataire requis.');
      return;
    }
    setBroadcastSending(true);
    try {
      const res = await notificationService.diffuser({
        titre: broadcastTitre.trim(),
        message: broadcastMessage.trim(),
        roles: broadcastRoles,
        centreId: broadcastCentreId ? Number(broadcastCentreId) : undefined,
      });
      toast.success(res.data?.message || 'Alerte envoyée.');
      setBroadcastTitre('');
      setBroadcastMessage('');
    } catch {
      toast.error('Erreur lors de l\'envoi.');
    } finally {
      setBroadcastSending(false);
    }
  };

  const applyBroadcastPreset = (presetId: AlertPresetId) => {
    setBroadcastPreset(presetId);
    setBroadcastRoles(ALERT_PRESETS[presetId].roles);
  };

  const canTreat = hasRole('DIRECTEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER') && hasFeature('manage_signalements');

  const filtered = signalements.filter(s => {
    const statusOk = filter === 'ALL' || s.statut === filter;
    const targetOk = targetFilter === 'ALL' || s.cibleType === targetFilter;
    const centreOk = selectedCentreFilter === 'ALL' || String(s.centreId ?? '') === selectedCentreFilter;
    const priorityOk = priorityFilter === 'ALL' || (s.priorite || 'NORMALE') === priorityFilter;
    const signalDate = s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : '';
    const startOk = !dateDebutFilter || (signalDate && signalDate >= dateDebutFilter);
    const endOk = !dateFinFilter || (signalDate && signalDate <= dateFinFilter);
    return statusOk && targetOk && centreOk && priorityOk && startOk && endOk;
  });

  const liveStats = useMemo(() => {
    const urgentPending = filtered.filter(s => s.statut === 'EN_ATTENTE' && (s.priorite || 'NORMALE') === 'URGENTE').length;
    const pending = filtered.filter(s => s.statut === 'EN_ATTENTE').length;
    const centreAlerts = filtered.filter(s => s.cibleType === 'CENTRE');
    return {
      urgentPending,
      pending,
      centreAlertsCount: centreAlerts.length,
      equipementsMentions: centreAlerts.filter(s => Boolean(s.etatEquipements && s.etatEquipements.trim())).length,
      defisMentions: centreAlerts.filter(s => Boolean(s.defis && s.defis.trim())).length,
    };
  }, [filtered]);

  const centreAlerts = filtered.filter(s => s.cibleType === 'CENTRE');

  if (skeletonLoading) {
    return <PageLoadingSkeleton cardCount={4} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Alertes centre & enfants</h1>
          <p className="text-dark-400 mt-1">Enregistrez une alerte pour un enfant ou pour le centre, avec remontée ciblée.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'EN_ATTENTE', 'TRAITE'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === f
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-white'
              }`}
            >
              {f === 'ALL' ? 'Tous' : f === 'EN_ATTENTE' ? 'En attente' : 'Traités'}
            </button>
          ))}
          {(['ALL', 'ENFANT', 'CENTRE'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setTargetFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                targetFilter === f
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-white'
              }`}
            >
              {f === 'ALL' ? 'Toutes cibles' : f}
            </button>
          ))}
        </div>
      </div>

      {isDirecteur && (
        <form onSubmit={handleBroadcast} className="card border border-violet-500/35 bg-gradient-to-br from-violet-600/15 via-dark-900 to-fuchsia-900/10 overflow-hidden relative">
          <motion.div
            aria-hidden
            className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-violet-500/10 blur-3xl"
            animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.65, 0.4] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative z-[1]">
            <div className="flex items-center gap-2 text-white font-bold mb-1">
              <Megaphone className="w-5 h-5 text-violet-300" />
              Diffuser une alerte
            </div>
            <p className="text-xs text-dark-300 mb-4">
              Chaque destinataire reçoit notification in-app, email et rappel bureau PC jusqu&apos;à lecture.
            </p>

            <p className="label mb-2">Qui doit recevoir l&apos;alerte ?</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
              {(Object.keys(ALERT_PRESETS) as AlertPresetId[]).map((id) => {
                const p = ALERT_PRESETS[id];
                const active = broadcastPreset === id;
                return (
                  <motion.button
                    key={id}
                    type="button"
                    onClick={() => applyBroadcastPreset(id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`text-left rounded-xl border p-3 transition-all ${
                      active
                        ? 'border-violet-400/60 bg-violet-500/20 shadow-lg shadow-violet-900/20 ring-2 ring-violet-400/30'
                        : 'border-dark-700 bg-dark-900/50 hover:border-violet-500/30'
                    }`}
                  >
                    <p className={`text-sm font-bold ${active ? 'text-violet-100' : 'text-white'}`}>{p.label}</p>
                    <p className="text-[10px] text-dark-400 mt-1 leading-snug">{p.subtitle}</p>
                  </motion.button>
                );
              })}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Titre</label>
                <input className="input-field" value={broadcastTitre} onChange={(e) => setBroadcastTitre(e.target.value)} placeholder="Ex: Rappel séance terrain" />
              </div>
              <div>
                <label className="label">Centre (pour cibler les formateurs)</label>
                <select className="input-field" value={broadcastCentreId} onChange={(e) => setBroadcastCentreId(e.target.value)}>
                  <option value="">Tous les centres</option>
                  {centres.map((c) => <option key={c.id} value={String(c.id)}>{c.nom}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label">Message</label>
                <textarea rows={3} className="input-field" value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} placeholder="Votre message…" />
              </div>
            </div>
            <ValidationActionButton
              type="submit"
              variant="violet"
              icon={Send}
              loading={broadcastSending}
              size="lg"
              className="mt-5"
            >
              {broadcastSending ? 'Envoi en cours…' : 'Envoyer l\'alerte maintenant'}
            </ValidationActionButton>
          </div>
        </form>
      )}

      <div className="card border border-dark-700 bg-gradient-to-r from-dark-900 to-dark-800">
        <div className="flex items-center gap-2 text-white font-bold mb-4">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          Dashboard Alerte centre en direct
        </div>
        <div className="grid md:grid-cols-5 gap-3">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <div className="text-xs text-red-200">Urgentes non traitées</div>
            <div className="text-2xl font-bold text-red-300">{liveStats.urgentPending}</div>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <div className="text-xs text-amber-100">Non traitées</div>
            <div className="text-2xl font-bold text-amber-300">{liveStats.pending}</div>
          </div>
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
            <div className="text-xs text-blue-100">Alertes centre</div>
            <div className="text-2xl font-bold text-blue-300">{liveStats.centreAlertsCount}</div>
          </div>
          <div className="rounded-lg border border-primary-500/30 bg-primary-500/10 p-3">
            <div className="text-xs text-primary-100">État équipements</div>
            <div className="text-2xl font-bold text-primary-300">{liveStats.equipementsMentions}</div>
          </div>
          <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
            <div className="text-xs text-orange-100">Défis signalés</div>
            <div className="text-2xl font-bold text-orange-300">{liveStats.defisMentions}</div>
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-3 mt-4">
          <div>
            <label className="label">Filtrer par centre</label>
            <select className="input-field" value={selectedCentreFilter} onChange={e => setSelectedCentreFilter(e.target.value)}>
              <option value="ALL">Tous les centres</option>
              {centres.map(c => <option key={c.id} value={String(c.id)}>{c.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date début</label>
            <input type="date" className="input-field" value={dateDebutFilter} onChange={e => setDateDebutFilter(e.target.value)} />
          </div>
          <div>
            <label className="label">Date fin</label>
            <input type="date" className="input-field" value={dateFinFilter} onChange={e => setDateFinFilter(e.target.value)} />
          </div>
          <div>
            <label className="label">Priorité</label>
            <select className="input-field" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as 'ALL' | 'NORMALE' | 'URGENTE')}>
              <option value="ALL">Toutes</option>
              <option value="NORMALE">Normale</option>
              <option value="URGENTE">Urgente</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card border border-dark-700 space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold">
          <PlusCircle className="w-4 h-4 text-primary-400" />
          Nouvelle alerte
        </div>
        <form onSubmit={handleCreateSignalement} className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Type d'alerte</label>
            <select className="input-field" value={newType} onChange={e => setNewType(e.target.value as 'ENFANT' | 'CENTRE')}>
              <option value="ENFANT">Alerte enfant (centre + directeur)</option>
              <option value="CENTRE">Alerte centre (directeur)</option>
            </select>
          </div>
          <div>
            <label className="label">Centre concerné</label>
            <select className="input-field" value={newCentreId} onChange={e => setNewCentreId(e.target.value)}>
              <option value="">Sélectionner...</option>
              {centres.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          {newType === 'ENFANT' && (
            <div className="md:col-span-2">
              <label className="label">Enfant concerné</label>
              <select className="input-field" value={newEleveId} onChange={e => setNewEleveId(e.target.value)}>
                <option value="">Sélectionner un enfant...</option>
                {eleves.map(e => <option key={e.id} value={e.id}>{e.prenom} {e.nom} ({e.classe})</option>)}
              </select>
            </div>
          )}
          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea
              className="input-field"
              rows={4}
              placeholder="Ex: Défi matériel, comportement, incident sécurité, besoin d'appui..."
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Priorité</label>
            <select className="input-field" value={newPriorite} onChange={e => setNewPriorite(e.target.value as 'NORMALE' | 'URGENTE')}>
              <option value="NORMALE">Normale</option>
              <option value="URGENTE">Urgente</option>
            </select>
          </div>
          <div>
            <label className="label">État des équipements</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ex: 7 ordinateurs bon état"
              value={newEtatEquipements}
              onChange={e => setNewEtatEquipements(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Défis</label>
            <textarea
              className="input-field"
              rows={2}
              placeholder="Ex: panne réseau, manque souris, retard équipe..."
              value={newDefis}
              onChange={e => setNewDefis(e.target.value)}
            />
          </div>
          {newType === 'ENFANT' && (
            <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-dark-300">
              <input
                type="checkbox"
                checked={newIncludeInReport}
                onChange={e => setNewIncludeInReport(e.target.checked)}
              />
              Inclure cette alerte dans les rapports enfant
            </label>
          )}
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary">
              <AlertTriangle className="w-4 h-4" />
              Enregistrer l'alerte
            </button>
          </div>
        </form>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card border border-dark-700">
          <div className="flex items-center gap-2 text-white font-semibold mb-3">
            <Wrench className="w-4 h-4 text-primary-400" />
            État des équipements
          </div>
          <div className="space-y-2">
            {centreAlerts.filter(s => s.etatEquipements && s.etatEquipements.trim()).slice(0, 6).map(s => (
              <div key={`eq-${s.id}`} className="text-sm text-dark-200 border border-dark-700 rounded-lg p-2">
                <div className="text-xs text-dark-400 mb-1">{s.centreNom || `Centre #${s.centreId}`}</div>
                <div>{s.etatEquipements}</div>
              </div>
            ))}
            {centreAlerts.filter(s => s.etatEquipements && s.etatEquipements.trim()).length === 0 && (
              <p className="text-sm text-dark-500">Aucune information équipement pour les filtres actuels.</p>
            )}
          </div>
        </div>

        <div className="card border border-dark-700">
          <div className="flex items-center gap-2 text-white font-semibold mb-3">
            <FlagTriangleRight className="w-4 h-4 text-orange-400" />
            Défis
          </div>
          <div className="space-y-2">
            {centreAlerts.filter(s => s.defis && s.defis.trim()).slice(0, 6).map(s => (
              <div key={`def-${s.id}`} className="text-sm text-dark-200 border border-dark-700 rounded-lg p-2">
                <div className="text-xs text-dark-400 mb-1">{s.centreNom || `Centre #${s.centreId}`}</div>
                <div>{s.defis}</div>
              </div>
            ))}
            {centreAlerts.filter(s => s.defis && s.defis.trim()).length === 0 && (
              <p className="text-sm text-dark-500">Aucun défi renseigné pour les filtres actuels.</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((s) => (
          <div key={s.id} className="card border border-dark-700 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <span className="text-white font-bold text-lg">
                  {s.cibleType === 'CENTRE'
                    ? `Centre: ${s.centreNom || `#${s.centreId}`}`
                    : (s.elevePrenom && s.eleveNom
                      ? `${s.elevePrenom} ${s.eleveNom}`
                      : `Élève #${s.eleveId}`)}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded border ${
                  s.cibleType === 'CENTRE'
                    ? 'border-amber-500/40 text-amber-300 bg-amber-500/10'
                    : 'border-blue-500/40 text-blue-300 bg-blue-500/10'
                }`}>
                  {s.cibleType}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded border ${
                  (s.priorite || 'NORMALE') === 'URGENTE'
                    ? 'border-red-500/40 text-red-300 bg-red-500/10'
                    : 'border-dark-600 text-dark-300 bg-dark-800'
                }`}>
                  {(s.priorite || 'NORMALE') === 'URGENTE' ? 'URGENTE' : 'NORMALE'}
                </span>
              </div>
              <p className="text-dark-300 text-sm">{s.description}</p>
              {(s.etatEquipements || s.defis) && (
                <div className="grid md:grid-cols-2 gap-2 text-xs">
                  {s.etatEquipements ? (
                    <div className="rounded-lg border border-dark-700 bg-dark-900/40 p-2">
                      <span className="text-primary-300 font-semibold">État équipements: </span>
                      <span className="text-dark-300">{s.etatEquipements}</span>
                    </div>
                  ) : null}
                  {s.defis ? (
                    <div className="rounded-lg border border-dark-700 bg-dark-900/40 p-2">
                      <span className="text-orange-300 font-semibold">Défis: </span>
                      <span className="text-dark-300">{s.defis}</span>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="flex flex-wrap gap-4 pt-2 text-xs text-dark-400">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  Signalé par : {s.auteur?.prenom} {s.auteur?.nom}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  le {new Date(s.createdAt).toLocaleDateString('fr-FR')}
                </span>
                {s.cibleType === 'ENFANT' && (
                  <span className={`flex items-center gap-1 ${s.inclureDansRapport ? 'text-emerald-400' : 'text-dark-500'}`}>
                    {s.inclureDansRapport ? 'Inclus rapport: OUI' : 'Inclus rapport: NON'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              {s.cibleType === 'ENFANT' && (
                <button
                  type="button"
                  onClick={() => handleToggleInclusionRapport(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    s.inclureDansRapport
                      ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'
                      : 'border-dark-700 text-dark-300 bg-dark-800'
                  }`}
                >
                  {s.inclureDansRapport ? 'Retirer du rapport' : 'Inclure rapport'}
                </button>
              )}
              {s.statut === 'EN_ATTENTE' ? (
                <>
                  <span className="badge badge-warning flex items-center gap-1"><Clock className="w-3 h-3" /> En attente</span>
                  {canTreat ? (
                    <ValidationActionButton
                      size="sm"
                      variant="success"
                      icon={Check}
                      onClick={() => handleTraiter(s.id)}
                    >
                      Marquer traité
                    </ValidationActionButton>
                  ) : null}
                  {isDirecteur && (
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(ALERT_PRESETS) as AlertPresetId[]).map((presetId) => {
                        const p = ALERT_PRESETS[presetId];
                        const variant =
                          presetId === 'TOUS' ? 'violet'
                            : presetId === 'COMPTABLE' ? 'warning'
                              : presetId === 'FORMATEUR_COMPTABLE' ? 'primary'
                                : 'sky';
                        return (
                          <ValidationActionButton
                            key={presetId}
                            size="sm"
                            variant={variant}
                            icon={Send}
                            title={p.subtitle}
                            onClick={() => void handleRelayer(s.id, p.roles)}
                          >
                            → {p.label}
                          </ValidationActionButton>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <span className="badge badge-success flex items-center gap-1"><Check className="w-3 h-3" /> Traité</span>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="card text-center py-12 text-dark-500">
            Aucun incident signalé. Tout est calme !
          </div>
        )}
      </div>
    </div>
  );
}
