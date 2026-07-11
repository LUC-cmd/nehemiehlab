import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { centreService, eleveService, sessionService, syncOfflineQueue } from '../../services/api';
import type { Centre, Eleve, SessionCours, EvaluationSession, User } from '../../types';
import { fetchWithOfflineCache, readCache, writeCache } from '../../utils/offlineCache';
import {
  getOfflineSessionDraft,
  listOfflineSessionDrafts,
  newLocalId,
  removeOfflineSessionDraft,
  saveOfflineSessionDraft,
  type OfflineSessionDraft,
} from '../../utils/offlineSessions';
import {
  Plus, Timer, Clock, User as UserIcon, Save, Lock, UploadCloud, FileText, DownloadCloud,
  Calendar, MapPin, Radio, CheckCircle2, XCircle, Users, X, Navigation,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ModalContentSkeleton, TableSkeleton } from '../../components/ui/DashboardSkeletons';
import { useMinDelayLoading } from '../../hooks/useMinDelayLoading';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import MediaDropZone from '../../components/ui/MediaDropZone';
import GeoMapPanel from '../../components/ui/GeoMapPanel';
import { formatCoords } from '../../utils/geo';

function formatElapsed(totalMinutes: number) {
  const m = Math.max(0, Math.floor(totalMinutes));
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h <= 0) return `${min} min`;
  return `${h} h ${min.toString().padStart(2, '0')}`;
}

export default function SessionsPage() {
  const { hasRole } = useAuth();
  const { hasFeature } = useAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [sessions, setSessions] = useState<SessionCours[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [offlineDrafts, setOfflineDrafts] = useState<OfflineSessionDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const skeletonLoading = useMinDelayLoading(loading, 220);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSession, setNewSession] = useState({
    titre: '', centreId: '', duree: '120', moduleFait: '', etatEquipements: '', defisSession: '',
  });
  
  const [selectedSession, setSelectedSession] = useState<SessionCours | null>(null);
  const [selectedOfflineDraftId, setSelectedOfflineDraftId] = useState<string | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationSession[]>([]);
  const [showSessionDetail, setShowSessionDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [contextForm, setContextForm] = useState({ moduleFait: '', etatEquipements: '', defisSession: '' });
  
  // Filters for Directeur
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedFormateurId, setSelectedFormateurId] = useState<string>('');
  const [selectedCentreId, setSelectedCentreId] = useState<string>('');
  const [confirmClotureId, setConfirmClotureId] = useState<number | string | null>(null);

  const getCurrentPosition = async (): Promise<{ latitude: number; longitude: number; precisionMetres?: number } | null> => {
    if (!navigator.geolocation) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          precisionMetres: pos.coords.accuracy,
        }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 12000 },
      );
    });
  };

  const fetchInitialData = async () => {
    setLoading(true);
    setOfflineDrafts(listOfflineSessionDrafts());
    try {
      const centreCacheKey = hasRole('DIRECTEUR') ? 'centres-directeur' : 'centres-formateur';
      const [sessResult, centResult] = await Promise.all([
        fetchWithOfflineCache<SessionCours[]>('sessions', async () => {
          const response = await sessionService.getAll();
          return response.data;
        }),
        fetchWithOfflineCache<Centre[]>(centreCacheKey, async () => {
          const response = hasRole('DIRECTEUR')
            ? await centreService.getAll()
            : await centreService.getMesCentres();
          return response.data;
        }),
      ]);
      setSessions(sessResult.data);
      setCentres(centResult.data);
    } catch {
      setSessions(readCache<SessionCours[]>('sessions') || []);
      setCentres(
        readCache<Centre[]>(hasRole('DIRECTEUR') ? 'centres-directeur' : 'centres-formateur') || [],
      );
      if (navigator.onLine) toast.error('Erreur lors du chargement des sessions.');
    } finally {
      setLoading(false);
    }
  };

  const loadCentreEleves = async (centreId: number): Promise<Eleve[]> => {
    const result = await fetchWithOfflineCache<Eleve[]>(
      `eleves-centre-${centreId}`,
      async () => {
        const response = await eleveService.getByCentre(centreId);
        if (navigator.onLine) writeCache(`eleves-centre-${centreId}`, response.data);
        return response.data;
      },
    );
    return result.data;
  };

  const syncOfflineDrafts = useCallback(async () => {
    if (!navigator.onLine) return;
    const drafts = listOfflineSessionDrafts();
    let syncedCount = 0;

    for (const draft of drafts) {
      try {
        const createResponse = await sessionService.create({
          titre: draft.titre,
          centre: { id: draft.centreId },
          dureePrevueMinutes: draft.dureePrevueMinutes,
          moduleFait: draft.moduleFait,
          etatEquipements: draft.etatEquipements,
          defisSession: draft.defisSession,
        });
        if (createResponse.data?.queuedOffline) continue;

        const realSession = createResponse.data as SessionCours;
        const detailResponse = await sessionService.getById(realSession.id);
        const realEvaluations = detailResponse.data.evaluations as EvaluationSession[];
        const draftByEleve = new Map(draft.evaluations.map((evaluation) => [
          evaluation.localEleveId,
          evaluation,
        ]));
        const updates = realEvaluations.map((evaluation) => {
          const saved = draftByEleve.get(evaluation.eleve.id);
          return {
            id: evaluation.id,
            present: saved?.present ?? false,
            note: saved?.note ?? undefined,
            commentaire: saved?.commentaire ?? undefined,
            projetTravaille: saved?.projetTravaille ?? undefined,
          };
        });

        if (updates.length > 0) {
          await sessionService.updateEvaluations(realSession.id, updates);
        }
        if (draft.moduleFait || draft.etatEquipements || draft.defisSession) {
          await sessionService.updateContexte(realSession.id, {
            moduleFait: draft.moduleFait,
            etatEquipements: draft.etatEquipements,
            defisSession: draft.defisSession,
          });
        }
        if (draft.statut === 'CLOTUREE') {
          await sessionService.cloturer(realSession.id);
        }
        removeOfflineSessionDraft(draft.localId);
        syncedCount += 1;
      } catch {
        // Keep this draft for the next online retry.
      }
    }

    await syncOfflineQueue();
    if (syncedCount > 0) {
      toast.success(`${syncedCount} session(s) hors ligne synchronisée(s).`);
      await fetchInitialData();
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
    const handleOnline = () => void syncOfflineDrafts();
    window.addEventListener('online', handleOnline);
    if (navigator.onLine) void syncOfflineDrafts();
    return () => window.removeEventListener('online', handleOnline);
  }, [syncOfflineDrafts]);

  useEffect(() => {
    if (loading || centres.length === 0) return;
    const centreIdParam = searchParams.get('centreId');
    const action = searchParams.get('action');
    if (action !== 'new' || !centreIdParam) return;
    const centreId = Number(centreIdParam);
    if (!Number.isFinite(centreId) || !centres.some((c) => c.id === centreId)) return;
    setNewSession((prev) => ({ ...prev, centreId: String(centreId) }));
    setShowAddModal(true);
    void loadCentreEleves(centreId).catch(() => undefined);
    setSearchParams({}, { replace: true });
  }, [loading, centres, searchParams, setSearchParams]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const centreId = Number(newSession.centreId);
      if (!navigator.onLine) {
        const eleves = await loadCentreEleves(centreId);
        const centre = centres.find((item) => item.id === centreId);
        const draft: OfflineSessionDraft = {
          localId: newLocalId('session'),
          titre: newSession.titre,
          centreId,
          centreNom: centre?.nom,
          dureePrevueMinutes: Number(newSession.duree),
          moduleFait: newSession.moduleFait || undefined,
          etatEquipements: newSession.etatEquipements || undefined,
          defisSession: newSession.defisSession || undefined,
          heureDebut: new Date().toISOString(),
          statut: 'EN_COURS',
          evaluations: eleves.map((eleve) => ({
            localEleveId: eleve.id,
            eleveNom: eleve.nom,
            elevePrenom: eleve.prenom,
            eleveSexe: eleve.sexe,
            eleveAge: eleve.age,
            eleveClasse: eleve.classe,
            present: false,
            projetTravaille: eleve.projet?.nom || null,
          })),
          createdAt: Date.now(),
        };
        saveOfflineSessionDraft(draft);
        setOfflineDrafts(listOfflineSessionDrafts());
        toast.success('Session enregistrée hors ligne. Elle sera synchronisée au retour de la connexion.');
        setShowAddModal(false);
        setNewSession({ titre: '', centreId: '', duree: '120', moduleFait: '', etatEquipements: '', defisSession: '' });
        await fetchInitialData();
        return;
      }

      const geo = await getCurrentPosition();
      const response = await sessionService.create({
        titre: newSession.titre,
        centre: { id: centreId },
        dureePrevueMinutes: Number(newSession.duree),
        latitudeDebut: geo?.latitude,
        longitudeDebut: geo?.longitude,
        precisionDebutMetres: geo?.precisionMetres,
        moduleFait: newSession.moduleFait || undefined,
        etatEquipements: newSession.etatEquipements || undefined,
        defisSession: newSession.defisSession || undefined,
      });
      toast.success(
        response.data?.queuedOffline
          ? 'Session mise en attente hors ligne. Elle sera synchronisée automatiquement.'
          : 'Session démarrée !',
      );
      setShowAddModal(false);
      setNewSession({ titre: '', centreId: '', duree: '120', moduleFait: '', etatEquipements: '', defisSession: '' });
      fetchInitialData();
    } catch {
      toast.error('Erreur lors de la création de la session.');
    }
  };

  const openSessionDetail = async (session: SessionCours) => {
    setShowSessionDetail(true);
    setDetailLoading(true);
    setSelectedOfflineDraftId(null);
    setSelectedSession(session);
    setEvaluations([]);
    try {
      const res = await sessionService.getById(session.id);
      setSelectedSession(res.data.session);
      setEvaluations(res.data.evaluations);
      setContextForm({
        moduleFait: res.data.session?.moduleFait || '',
        etatEquipements: res.data.session?.etatEquipements || '',
        defisSession: res.data.session?.defisSession || '',
      });
    } catch {
      toast.error('Erreur lors du chargement des détails.');
      setShowSessionDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const openOfflineDraft = (localId: string) => {
    const draft = getOfflineSessionDraft(localId);
    if (!draft) {
      toast.error('Ce brouillon hors ligne est introuvable.');
      setOfflineDrafts(listOfflineSessionDrafts());
      return;
    }
    const centre = centres.find((item) => item.id === draft.centreId);
    const pseudoSession = {
      id: -draft.createdAt,
      titre: draft.titre,
      centre: centre || { id: draft.centreId, nom: draft.centreNom || 'Centre', formateurs: [] },
      heureDebut: draft.heureDebut,
      heureFin: draft.heureFin,
      dureePrevueMinutes: draft.dureePrevueMinutes,
      statut: draft.statut,
      moduleFait: draft.moduleFait,
      etatEquipements: draft.etatEquipements,
      defisSession: draft.defisSession,
      createdAt: new Date(draft.createdAt).toISOString(),
    } as SessionCours;
    const pseudoEvaluations = draft.evaluations.map((evaluation) => ({
      id: evaluation.localEleveId,
      sessionCours: pseudoSession,
      eleve: {
        id: evaluation.localEleveId,
        nom: evaluation.eleveNom,
        prenom: evaluation.elevePrenom,
        sexe: evaluation.eleveSexe || 'M',
        age: evaluation.eleveAge || 0,
        classe: evaluation.eleveClasse || '',
      } as Eleve,
      present: evaluation.present,
      note: evaluation.note ?? undefined,
      commentaire: evaluation.commentaire ?? undefined,
      projetTravaille: evaluation.projetTravaille ?? undefined,
    }));
    setSelectedOfflineDraftId(localId);
    setSelectedSession(pseudoSession);
    setEvaluations(pseudoEvaluations);
    setContextForm({
      moduleFait: draft.moduleFait || '',
      etatEquipements: draft.etatEquipements || '',
      defisSession: draft.defisSession || '',
    });
    setDetailLoading(false);
    setShowSessionDetail(true);
  };

  const handleUpdateEvaluations = async () => {
    if (!selectedSession) return;
    try {
      if (selectedOfflineDraftId) {
        const draft = getOfflineSessionDraft(selectedOfflineDraftId);
        if (!draft) throw new Error('OFFLINE_DRAFT_NOT_FOUND');
        saveOfflineSessionDraft({
          ...draft,
          evaluations: draft.evaluations.map((item) => {
            const evaluation = evaluations.find((candidate) => candidate.eleve.id === item.localEleveId);
            return evaluation
              ? {
                  ...item,
                  present: evaluation.present,
                  note: evaluation.note ?? null,
                  commentaire: evaluation.commentaire ?? null,
                  projetTravaille: evaluation.projetTravaille ?? null,
                }
              : item;
          }),
        });
        setOfflineDrafts(listOfflineSessionDrafts());
        toast.success('Présences sauvegardées hors ligne.');
        return;
      }
      const data = evaluations.map(ev => ({
        id: ev.id,
        present: ev.present,
        note: ev.note,
        commentaire: ev.commentaire,
        projetTravaille: ev.projetTravaille,
      }));
      await sessionService.updateEvaluations(selectedSession.id, data);
      toast.success('Évaluations sauvegardées');
      openSessionDetail(selectedSession);
    } catch {
      toast.error('Erreur lors de la sauvegarde.');
    }
  };

  const handleSaveContexte = async () => {
    if (!selectedSession) return;
    try {
      if (selectedOfflineDraftId) {
        const draft = getOfflineSessionDraft(selectedOfflineDraftId);
        if (!draft) throw new Error('OFFLINE_DRAFT_NOT_FOUND');
        saveOfflineSessionDraft({
          ...draft,
          moduleFait: contextForm.moduleFait || undefined,
          etatEquipements: contextForm.etatEquipements || undefined,
          defisSession: contextForm.defisSession || undefined,
        });
        setOfflineDrafts(listOfflineSessionDrafts());
        toast.success('Contexte sauvegardé hors ligne.');
        return;
      }
      await sessionService.updateContexte(selectedSession.id, {
        moduleFait: contextForm.moduleFait,
        etatEquipements: contextForm.etatEquipements,
        defisSession: contextForm.defisSession,
      });
      toast.success('Contexte de séance sauvegardé.');
      openSessionDetail(selectedSession);
      fetchInitialData();
    } catch {
      toast.error('Erreur lors de la sauvegarde du contexte.');
    }
  };

  const handleCloturer = async () => {
    if (!selectedSession) return;
    setConfirmClotureId(selectedOfflineDraftId || selectedSession.id);
  };

  const confirmCloturer = async () => {
    if (!selectedSession) return;
    if (selectedOfflineDraftId && confirmClotureId !== selectedOfflineDraftId) return;
    if (!selectedOfflineDraftId && confirmClotureId !== selectedSession.id) return;

    const missingNotes = evaluations.filter((ev) => ev.present && (ev.note === undefined || ev.note === null));
    if (missingNotes.length > 0) {
      toast.error('Chaque enfant présent doit avoir une note de participation (/10).');
      setConfirmClotureId(null);
      return;
    }

    setConfirmClotureId(null);
    try {
      await handleUpdateEvaluations();
      if (selectedOfflineDraftId) {
        const draft = getOfflineSessionDraft(selectedOfflineDraftId);
        if (!draft) throw new Error('OFFLINE_DRAFT_NOT_FOUND');
        saveOfflineSessionDraft({
          ...draft,
          statut: 'CLOTUREE',
          closedAt: Date.now(),
          heureFin: new Date().toISOString(),
          moduleFait: contextForm.moduleFait || undefined,
          etatEquipements: contextForm.etatEquipements || undefined,
          defisSession: contextForm.defisSession || undefined,
        });
        setOfflineDrafts(listOfflineSessionDrafts());
        toast.success('Session clôturée hors ligne. Elle sera synchronisée dès que possible.');
        setShowSessionDetail(false);
        return;
      }
      await sessionService.updateContexte(selectedSession.id, {
        moduleFait: contextForm.moduleFait,
        etatEquipements: contextForm.etatEquipements,
        defisSession: contextForm.defisSession,
      });
      const geo = await getCurrentPosition();
      if (geo) {
        await sessionService.localiserFin(selectedSession.id, geo);
      }
      await sessionService.cloturer(selectedSession.id);
      toast.success('Session clôturée définitivement.');
      setShowSessionDetail(false);
      fetchInitialData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Erreur lors de la clôture.';
      toast.error(msg);
    }
  };

  const markStartLocation = async () => {
    if (!selectedSession || selectedOfflineDraftId) return;
    const geo = await getCurrentPosition();
    if (!geo) {
      toast.error('Impossible de recuperer votre localisation.');
      return;
    }
    try {
      await sessionService.localiserDebut(selectedSession.id, geo);
      toast.success('Debut geolocalise avec succes.');
      openSessionDetail(selectedSession);
      fetchInitialData();
    } catch {
      toast.error('Erreur pendant la geolocalisation de debut.');
    }
  };

  const handleNoteChange = (evalId: number, val: string) => {
    let note10: number | undefined = parseFloat(val);
    if (isNaN(note10)) note10 = undefined;
    if (note10 !== undefined && note10 > 10) note10 = 10;
    if (note10 !== undefined && note10 < 0) note10 = 0;
    setEvaluations(prev => prev.map(ev => ev.id === evalId ? { ...ev, note: note10 } : ev));
  };

  /** Affiche une note /10 (compat anciennes notes /20) */
  const displayNote10 = (note?: number | null) => {
    if (note === undefined || note === null) return '';
    const n = note > 10 ? note / 2 : note;
    return Number(n.toFixed(1));
  };

  const uploadReportFile = async (file: File) => {
    if (!selectedSession) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error('Le fichier est trop volumineux (max 25 Mo)');
      return;
    }
    try {
      toast.loading('Upload en cours...', { id: 'upload' });
      await sessionService.uploadRapport(selectedSession.id, file);
      toast.success('Rapport ajouté avec succès !', { id: 'upload' });
      openSessionDetail(selectedSession);
    } catch {
      toast.error("Erreur lors de l'upload du rapport", { id: 'upload' });
    }
  };

  const isFormateur = hasRole('FORMATEUR');
  const isDirecteur = hasRole('DIRECTEUR');
  const canManageSessions = hasFeature('manage_sessions');

  // Computed for filters
  const regions = useMemo(
    () => Array.from(new Set(centres.map((c) => c.region).filter(Boolean))) as string[],
    [centres],
  );

  const filteredCentresByRegion = useMemo(
    () => (selectedRegion ? centres.filter((c) => c.region === selectedRegion) : []),
    [centres, selectedRegion],
  );

  const formateurs = useMemo(() => {
    const map = new Map<number, User>();
    filteredCentresByRegion.forEach((c) => {
      c.formateurs?.forEach((f) => map.set(f.id, f));
    });
    return Array.from(map.values()).sort((a, b) =>
      `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`, 'fr'),
    );
  }, [filteredCentresByRegion]);

  const formateurCentres = useMemo(() => {
    if (!selectedFormateurId) return [];
    return filteredCentresByRegion.filter((c) =>
      c.formateurs?.some((f) => f.id === Number(selectedFormateurId)),
    );
  }, [filteredCentresByRegion, selectedFormateurId]);

  const selectedCentre = useMemo(
    () => centres.find((c) => c.id === Number(selectedCentreId)) || null,
    [centres, selectedCentreId],
  );

  const selectedFormateur = useMemo(
    () => formateurs.find((f) => f.id === Number(selectedFormateurId)) || null,
    [formateurs, selectedFormateurId],
  );

  const sessionDetailCentre = useMemo(() => {
    if (!selectedSession?.centre) return null;
    const full = centres.find((c) => c.id === selectedSession.centre.id);
    return full ? { ...selectedSession.centre, ...full } : selectedSession.centre;
  }, [selectedSession, centres]);

  /** Sessions filtrées pour la liste */
  const displayedSessions = useMemo(() => {
    if (!isDirecteur) return sessions;
    if (!selectedRegion) return [];
    return sessions.filter((s) => {
      if (s.centre?.region !== selectedRegion) return false;
      if (selectedFormateurId && s.formateur?.id !== Number(selectedFormateurId)) return false;
      if (selectedCentreId && s.centre?.id !== Number(selectedCentreId)) return false;
      return true;
    });
  }, [isDirecteur, sessions, selectedRegion, selectedFormateurId, selectedCentreId]);

  /** Session EN_COURS = formateur déjà sur le terrain */
  const liveSession = useMemo(() => {
    if (!selectedFormateurId) return null;
    const live = displayedSessions.find(
      (s) =>
        s.statut === 'EN_COURS' &&
        s.formateur?.id === Number(selectedFormateurId) &&
        (!selectedCentreId || s.centre?.id === Number(selectedCentreId)),
    );
    return live || null;
  }, [displayedSessions, selectedFormateurId, selectedCentreId]);

  const onTerrain = Boolean(liveSession);

  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!liveSession) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [liveSession?.id]);

  const liveElapsedMinutes = useMemo(() => {
    if (!liveSession?.heureDebut) return 0;
    const start = new Date(liveSession.heureDebut).getTime();
    return Math.max(0, (nowTick - start) / 60_000);
  }, [liveSession, nowTick]);

  const liveProgressPct = useMemo(() => {
    const planned = liveSession?.dureePrevueMinutes || 0;
    if (planned <= 0) return 0;
    return Math.min(100, Math.round((liveElapsedMinutes / planned) * 100));
  }, [liveElapsedMinutes, liveSession?.dureePrevueMinutes]);

  const canShowDirecteurContent = !isDirecteur || Boolean(selectedRegion);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isFormateur ? 'Séances sur le terrain' : 'Gestion terrain'}
          </h1>
          <p className="text-slate-500 mt-1">
            {isFormateur
              ? 'Démarrez le chrono au centre, marquez les présences / notes, puis clôturez. Ce n’est pas le journal pédagogique.'
              : 'Filtrez région → formateur → centre pour suivre les séances et le statut sur le terrain.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isFormateur && canManageSessions && (
            <button
              type="button"
              onClick={() => {
                setShowAddModal(true);
                if (navigator.onLine) {
                  centres.forEach((centre) => {
                    void loadCentreEleves(centre.id).catch(() => undefined);
                  });
                }
              }}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              Démarrer une session
            </button>
          )}
        </div>
      </div>

      {isDirecteur && (
        <div className="card border border-slate-200 bg-white p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">1. Filtrer par Région</label>
            <select
              className="input-field"
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setSelectedFormateurId('');
                setSelectedCentreId('');
              }}
            >
              <option value="">Sélectionner une région...</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">2. Filtrer par Formateur</label>
            <select
              className="input-field"
              value={selectedFormateurId}
              onChange={(e) => {
                const fid = e.target.value;
                setSelectedFormateurId(fid);
                if (!fid) {
                  setSelectedCentreId('');
                  return;
                }
                const centresOfFormateur = filteredCentresByRegion.filter((c) =>
                  c.formateurs?.some((f) => f.id === Number(fid)),
                );
                setSelectedCentreId(centresOfFormateur.length === 1 ? String(centresOfFormateur[0].id) : '');
              }}
              disabled={!selectedRegion}
            >
              <option value="">Sélectionner un formateur...</option>
              {formateurs.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.prenom} {f.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">3. Filtrer par Centre</label>
            <select
              className="input-field"
              value={selectedCentreId}
              onChange={(e) => setSelectedCentreId(e.target.value)}
              disabled={!selectedFormateurId}
            >
              <option value="">Sélectionner un centre...</option>
              {formateurCentres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Statut terrain — formateur au centre, en train de travailler */}
      {isDirecteur && selectedFormateur && (
        <div
          className={`rounded-xl border px-4 py-3.5 ${
            onTerrain
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  onTerrain ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {onTerrain ? <Radio className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {selectedFormateur.prenom} {selectedFormateur.nom}
                  {selectedCentre ? ` · ${selectedCentre.nom}` : ''}
                </p>
                {onTerrain && liveSession ? (
                  <>
                    <p className="text-sm text-emerald-800 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>
                        Sur le terrain au centre — session « {liveSession.titre} » en cours
                      </span>
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-emerald-900/80">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Timer className="w-3.5 h-3.5" />
                        {formatElapsed(liveElapsedMinutes)} déjà faites
                        {liveSession.dureePrevueMinutes
                          ? ` / ${liveSession.dureePrevueMinutes} min prévues`
                          : ''}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Démarrée à{' '}
                        {new Date(liveSession.heureDebut).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {(liveSession.nbTotalEleves != null || liveSession.nbPresents != null) && (
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {liveSession.nbPresents ?? 0}/{liveSession.nbTotalEleves ?? 0} présents
                        </span>
                      )}
                    </div>
                    {liveSession.dureePrevueMinutes > 0 && (
                      <div className="mt-2.5 max-w-md">
                        <div className="h-1.5 rounded-full bg-emerald-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                            style={{ width: `${liveProgressPct}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-emerald-700/80 mt-1">{liveProgressPct}% du temps prévu</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-600 mt-0.5 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 shrink-0 text-slate-400" />
                    Pas de session en cours — le formateur n’est pas encore au centre.
                  </p>
                )}
              </div>
            </div>
            {onTerrain && (
              <span className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-600 text-white shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                SUR LE TERRAIN
              </span>
            )}
          </div>
        </div>
      )}

      {skeletonLoading ? (
        <TableSkeleton rows={6} />
      ) : !canShowDirecteurContent ? (
        <div className="card border border-slate-200 bg-white text-center text-slate-500 py-12">
          Sélectionnez une région, puis le formateur et le centre.
        </div>
      ) : (
        <>
          {isDirecteur && selectedFormateurId && selectedCentreId && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
              {displayedSessions.map((s) => {
                const isClosed = s.statut === 'CLOTUREE';
                return (
                  <div
                    key={s.id}
                    onClick={() => openSessionDetail(s)}
                    className={`card border cursor-pointer transition-all hover:border-primary-300 ${
                      isClosed
                        ? 'border-slate-200 bg-white'
                        : 'border-emerald-300 bg-emerald-50/40 shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-2 rounded-lg ${
                            isClosed ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          <Timer className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{s.titre}</h3>
                          <p className="text-xs text-slate-500">{s.centre.nom}</p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          isClosed
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isClosed ? 'CLÔTURÉE' : 'EN COURS'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 border-t border-slate-100 pt-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {isClosed && s.dureeReelleMinutes
                          ? s.dureeReelleMinutes
                          : isClosed
                            ? 0
                            : s.dureePrevueMinutes}{' '}
                        min / {s.dureePrevueMinutes} min
                      </span>
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3.5 h-3.5" />
                        {s.nbPresents ?? 0}/{s.nbTotalEleves ?? 0} présents
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(s.heureDebut).toLocaleDateString('fr-FR')}
                      </span>
                      {s.latitudeDebut && s.longitudeDebut && (
                        <span className="text-emerald-600">Début geo OK</span>
                      )}
                      {s.latitudeFin && s.longitudeFin && (
                        <span className="text-sky-600">Fin geo OK</span>
                      )}
                      {!isClosed && (
                        <span className="ml-auto text-emerald-700 font-semibold">Sur le terrain</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {displayedSessions.length === 0 && (
                <div className="col-span-full card border border-slate-200 bg-white text-center text-slate-500 py-12">
                  Aucune session pour ce centre / formateur.
                </div>
              )}
            </div>
          )}

          {isDirecteur && selectedRegion && (!selectedFormateurId || !selectedCentreId) && (
            <p className="text-sm text-slate-500 text-center">
              {!selectedFormateurId
                ? 'Choisissez un formateur pour voir s’il est sur le terrain.'
                : 'Choisissez un centre pour afficher le détail des sessions.'}
            </p>
          )}

          {!isDirecteur && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
              {isFormateur && offlineDrafts.map((draft) => {
                const isClosed = draft.statut === 'CLOTUREE';
                const presentCount = draft.evaluations.filter((evaluation) => evaluation.present).length;
                return (
                  <div
                    key={draft.localId}
                    onClick={() => openOfflineDraft(draft.localId)}
                    className={`card border cursor-pointer transition-all ${
                      isClosed
                        ? 'border-amber-200 bg-amber-50/40'
                        : 'border-amber-300 bg-amber-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4 gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                          <Timer className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 truncate">{draft.titre}</h3>
                          <p className="text-xs text-slate-500">{draft.centreNom || 'Centre'}</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
                        Hors ligne
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{isClosed ? 'CLÔTURÉE' : 'EN COURS'}</span>
                      <span>{presentCount}/{draft.evaluations.length} présents</span>
                    </div>
                  </div>
                );
              })}
              {displayedSessions.map((s) => {
                const isClosed = s.statut === 'CLOTUREE';
                return (
                  <div
                    key={s.id}
                    onClick={() => openSessionDetail(s)}
                    className={`card border cursor-pointer transition-all ${
                      isClosed
                        ? 'border-slate-200 bg-white'
                        : 'border-emerald-300 bg-emerald-50/40'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-2 rounded-lg ${
                            isClosed ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          <Timer className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{s.titre}</h3>
                          <p className="text-xs text-slate-500">{s.centre.nom}</p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          isClosed ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {isClosed ? 'CLÔTURÉE' : 'EN COURS'}
                      </span>
                    </div>
                  </div>
                );
              })}
              {displayedSessions.length === 0 && offlineDrafts.length === 0 && (
                <div className="col-span-full card border border-slate-200 bg-white text-center text-slate-500 py-12">
                  Aucune session.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal Créer Session */}
      <Modal
        open={showAddModal}
        title="Démarrer une session"
        size="md"
        onClose={() => setShowAddModal(false)}
        footer={
          <>
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-ghost w-full sm:w-auto justify-center">
              Annuler
            </button>
            <button type="submit" form="create-session-form" className="btn-primary w-full sm:w-auto justify-center">
              Lancer le chrono
            </button>
          </>
        }
      >
        <form id="create-session-form" onSubmit={handleCreateSession} className="space-y-3 sm:space-y-4">
          <div>
            <label className="label">Centre</label>
            <select
              required
              className="input-field"
              value={newSession.centreId}
              onChange={e => {
                const centreId = e.target.value;
                setNewSession({ ...newSession, centreId });
                if (centreId) void loadCentreEleves(Number(centreId)).catch(() => undefined);
              }}
            >
              <option value="">Sélectionner...</option>
              {centres.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Titre de la session</label>
            <input type="text" required placeholder="Ex: TP React - Matin" className="input-field" value={newSession.titre} onChange={e => setNewSession({...newSession, titre: e.target.value})} />
          </div>
          <div>
            <label className="label">Module fait <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              placeholder="Ex: Scratch — boucles et conditions"
              className="input-field"
              value={newSession.moduleFait}
              onChange={e => setNewSession({ ...newSession, moduleFait: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Durée prévue</label>
            <select required className="input-field" value={newSession.duree} onChange={e => setNewSession({...newSession, duree: e.target.value})}>
              <option value="60">1 Heure</option>
              <option value="120">2 Heures</option>
              <option value="180">3 Heures</option>
              <option value="240">4 Heures</option>
            </select>
          </div>
          <div>
            <label className="label">État des équipements</label>
            <textarea
              rows={2}
              className="input-field"
              placeholder="Ex: 7 ordinateurs bon état, 1 clavier à remplacer..."
              value={newSession.etatEquipements}
              onChange={e => setNewSession({ ...newSession, etatEquipements: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Défis de la séance</label>
            <textarea
              rows={2}
              className="input-field"
              placeholder="Ex: Internet instable, besoin de souris supplémentaires..."
              value={newSession.defisSession}
              onChange={e => setNewSession({ ...newSession, defisSession: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Détail Session (Plein écran ou grande modale) */}
      {showSessionDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex flex-col" style={{ backgroundColor: '#0A0818' }}>
          <div className="sticky top-0 bg-dark-900 border-b border-dark-800 p-4 px-6 flex items-center justify-between z-10 shadow-xl">
            <div className="flex items-center gap-4">
              <button onClick={() => setShowSessionDetail(false)} className="p-2 rounded-lg bg-dark-800 text-dark-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {selectedSession?.titre || 'Détail de la session'}
                  {selectedSession?.statut === 'CLOTUREE' && <Lock className="w-4 h-4 text-red-400" />}
                  {selectedOfflineDraftId && (
                    <span className="px-2 py-1 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Hors ligne
                    </span>
                  )}
                </h2>
                {selectedSession && (
                  <div>
                    <p className="text-sm text-dark-400">
                      {selectedSession.centre.nom}
                      {' • '}
                      Date: {new Date(selectedSession.heureDebut).toLocaleDateString('fr-FR')}
                      {' • '}
                      Début: {new Date(selectedSession.heureDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {selectedSession.heureFin
                        ? ` • Fin: ${new Date(selectedSession.heureFin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                        : selectedSession.statut === 'EN_COURS'
                          ? ' • Fin: en cours'
                          : ''}
                    </p>
                    <p className="text-xs text-dark-400 mt-1">
                      Module: {selectedSession.moduleFait || contextForm.moduleFait || 'non renseigné'}
                      {' • '}
                      Équipements: {selectedSession.etatEquipements || contextForm.etatEquipements || 'non renseigné'}
                      {' • '}
                      Défis: {selectedSession.defisSession || contextForm.defisSession || 'non renseignés'}
                    </p>
                    {selectedSession.statut === 'CLOTUREE' && selectedSession.dureeReelleMinutes != null && (
                      <p className="text-xs text-emerald-400 mt-1 font-medium">
                        Heures formateur (cette séance) : {formatElapsed(selectedSession.dureeReelleMinutes)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {selectedSession?.statut === 'EN_COURS' && isFormateur && canManageSessions && !detailLoading && (
              <div className="flex items-center gap-3">
                {!selectedOfflineDraftId && (!selectedSession.latitudeDebut || !selectedSession.longitudeDebut) ? (
                  <button onClick={markStartLocation} className="btn-ghost flex items-center gap-2 text-amber-400 hover:bg-amber-500/10">
                    <Navigation className="w-4 h-4" /> Capturer debut (manuel)
                  </button>
                ) : null}
                <button onClick={handleUpdateEvaluations} className="btn-ghost flex items-center gap-2 text-primary-400 hover:bg-primary-500/10">
                  <Save className="w-4 h-4" /> Sauvegarder
                </button>
                <button onClick={handleSaveContexte} className="btn-ghost flex items-center gap-2 text-amber-300 hover:bg-amber-500/10">
                  <Save className="w-4 h-4" /> Sauvegarder contexte
                </button>
                <button onClick={handleCloturer} className="btn-danger">
                  <Lock className="w-4 h-4" /> Clôturer la session
                </button>
              </div>
            )}
            
            {selectedSession?.statut === 'CLOTUREE' && !detailLoading && (
              <div className="flex items-center gap-3">
                {selectedSession.rapportUrl ? (
                  <a href={`/api${selectedSession.rapportUrl}`} target="_blank" rel="noreferrer" className="btn-success flex items-center gap-2">
                    <DownloadCloud className="w-4 h-4" /> Télécharger le rapport
                  </a>
                ) : isFormateur ? (
                  <div className="w-full max-w-md">
                    <MediaDropZone
                      compact
                      files={[]}
                      onChange={(files) => {
                        if (files[0]) void uploadReportFile(files[0]);
                      }}
                      accept=".pdf,.doc,.docx,application/pdf"
                      maxSizeMb={25}
                      label="Ajouter un rapport (Word/PDF)"
                      hint="Glisser-déposer ou Ctrl+V"
                    />
                  </div>
                ) : (
                  <span className="text-dark-500 italic text-sm">Aucun rapport</span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
            {detailLoading || !selectedSession ? (
              <ModalContentSkeleton rows={7} />
            ) : (
            <>
            {(sessionDetailCentre ||
              selectedSession.latitudeDebut ||
              selectedSession.latitudeFin) && (
              <div className="mb-5 space-y-2">
                <GeoMapPanel
                  centres={sessionDetailCentre ? [sessionDetailCentre] : []}
                  sessions={[selectedSession]}
                  focusCentre={sessionDetailCentre}
                  liveSession={selectedSession.statut === 'EN_COURS' ? selectedSession : null}
                  title="Localisation de la session"
                  subtitle="Centre de formation, points de début et de fin de séance"
                  heightClassName="h-[280px]"
                  focusKey={`session-detail-${selectedSession.id}`}
                  showSessionLegend
                />
                <div className="flex flex-wrap gap-3 text-xs text-dark-400 px-1">
                  {selectedSession.latitudeDebut != null && selectedSession.longitudeDebut != null && (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400">
                      <MapPin className="w-3.5 h-3.5" />
                      Début : {formatCoords(selectedSession.latitudeDebut, selectedSession.longitudeDebut)}
                    </span>
                  )}
                  {selectedSession.latitudeFin != null && selectedSession.longitudeFin != null && (
                    <span className="inline-flex items-center gap-1.5 text-sky-400">
                      <MapPin className="w-3.5 h-3.5" />
                      Fin : {formatCoords(selectedSession.latitudeFin, selectedSession.longitudeFin)}
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="card overflow-hidden p-0 border border-dark-700 mb-5">
              {selectedSession.statut !== 'CLOTUREE' && isFormateur && (
                <div className="p-4 border-b border-dark-700 bg-dark-900/40 grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Module fait <span className="text-red-400">*</span></label>
                    <input
                      className="input-field"
                      placeholder="Ex: Scratch — boucles"
                      value={contextForm.moduleFait}
                      onChange={e => setContextForm(prev => ({ ...prev, moduleFait: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">État des équipements</label>
                    <textarea
                      rows={2}
                      className="input-field"
                      value={contextForm.etatEquipements}
                      onChange={e => setContextForm(prev => ({ ...prev, etatEquipements: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Défis de la séance</label>
                    <textarea
                      rows={2}
                      className="input-field"
                      value={contextForm.defisSession}
                      onChange={e => setContextForm(prev => ({ ...prev, defisSession: e.target.value }))}
                    />
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-dark-800/50 border-b border-dark-700">
                      <th className="p-4 font-semibold text-dark-200">Élève</th>
                      <th className="p-4 font-semibold text-dark-200">Sexe</th>
                      <th className="p-4 font-semibold text-dark-200">Âge</th>
                      <th className="p-4 font-semibold text-dark-200">Classe</th>
                      <th className="p-4 font-semibold text-dark-200 text-center w-28">Présence *</th>
                      <th className="p-4 font-semibold text-dark-200 w-36">Note /10 *</th>
                      <th className="p-4 font-semibold text-dark-200 w-28">Arrivée</th>
                      <th className="p-4 font-semibold text-dark-200 w-28">Heures</th>
                      <th className="p-4 font-semibold text-dark-200 min-w-[160px]">Projet</th>
                      <th className="p-4 font-semibold text-dark-200 min-w-[180px]">Commentaire</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-800">
                    {evaluations.map(ev => (
                      <tr key={ev.id} className="hover:bg-dark-800/20 transition-colors">
                        <td className="p-4">
                          <div className="font-medium text-white">{ev.eleve.prenom} {ev.eleve.nom}</div>
                        </td>
                        <td className="p-4 text-dark-300 text-sm">{ev.eleve.sexe}</td>
                        <td className="p-4 text-dark-300 text-sm">{ev.eleve.age}</td>
                        <td className="p-4 text-dark-300 text-sm">{ev.eleve.classe}</td>
                        <td className="p-4 text-center">
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="sr-only peer" 
                               checked={ev.present} 
                               disabled={selectedSession.statut === 'CLOTUREE'}
                               onChange={e => setEvaluations(prev => prev.map(p => p.id === ev.id ? {
                                 ...p,
                                 present: e.target.checked,
                                 note: e.target.checked ? p.note : undefined,
                                 heureArrivee: e.target.checked
                                   ? (p.heureArrivee || new Date().toISOString())
                                   : undefined,
                                 dureeMinutes: e.target.checked ? p.dureeMinutes : undefined,
                               } : p))} />
                            <span
                              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                                ev.present ? 'bg-emerald-500' : 'bg-red-500'
                              } ${selectedSession.statut === 'CLOTUREE' ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              <span
                                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                                  ev.present ? 'translate-x-[22px]' : 'translate-x-0.5'
                                }`}
                              />
                            </span>
                            <span className={`text-xs font-bold ${ev.present ? 'text-emerald-400' : 'text-red-400'}`}>
                              {ev.present ? 'ON' : 'OFF'}
                            </span>
                          </label>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              min="0" max="10" step="0.5"
                              disabled={selectedSession.statut === 'CLOTUREE' || !ev.present}
                              className="input-field py-1.5 w-24 text-center font-bold text-primary-400 disabled:opacity-50" 
                              placeholder={ev.present ? 'Oblig.' : '-'}
                              value={displayNote10(ev.note)}
                              onChange={e => handleNoteChange(ev.id, e.target.value)} 
                            />
                            <span className="text-dark-400 font-medium">/ 10</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-dark-300 whitespace-nowrap">
                          {ev.present && ev.heureArrivee
                            ? new Date(ev.heureArrivee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                            : ev.present
                              ? 'À l’appel'
                              : '—'}
                        </td>
                        <td className="p-4 text-sm font-semibold text-emerald-300 whitespace-nowrap">
                          {(() => {
                            if (!ev.present) return '0 h';
                            if (ev.dureeMinutes != null) {
                              const h = Math.floor(ev.dureeMinutes / 60);
                              const m = ev.dureeMinutes % 60;
                              return h > 0 ? `${h} h ${m.toString().padStart(2, '0')}` : `${m} min`;
                            }
                            if (ev.heureArrivee && selectedSession.statut === 'EN_COURS') {
                              const mins = Math.max(0, Math.floor((Date.now() - new Date(ev.heureArrivee).getTime()) / 60000));
                              const h = Math.floor(mins / 60);
                              const m = mins % 60;
                              return h > 0 ? `${h} h ${m.toString().padStart(2, '0')}` : `${m} min`;
                            }
                            return '—';
                          })()}
                        </td>
                        <td className="p-4">
                          <input
                            type="text"
                            className="input-field text-sm min-w-[140px]"
                            disabled={selectedSession.statut === 'CLOTUREE'}
                            placeholder={ev.eleve.projet?.nom || 'Projet (si applicable)'}
                            value={ev.projetTravaille || ''}
                            onChange={e => setEvaluations(prev => prev.map(p =>
                              p.id === ev.id ? { ...p, projetTravaille: e.target.value } : p
                            ))}
                          />
                        </td>
                        <td className="p-4">
                          <input
                            type="text"
                            className="input-field text-sm min-w-[160px]"
                            disabled={selectedSession.statut === 'CLOTUREE'}
                            placeholder="Optionnel"
                            value={ev.commentaire || ''}
                            onChange={e => setEvaluations(prev => prev.map(p =>
                              p.id === ev.id ? { ...p, commentaire: e.target.value } : p
                            ))}
                          />
                        </td>
                      </tr>
                    ))}
                    {evaluations.length === 0 && (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-dark-500 italic">Aucun élève trouvé.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmClotureId != null}
        title="Clôturer la session ?"
        message="Cette session sera définitivement clôturée et ne pourra plus être modifiée."
        confirmLabel="Clôturer"
        danger
        onConfirm={confirmCloturer}
        onCancel={() => setConfirmClotureId(null)}
      />
    </div>
  );
}
