import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formationService, centreService, eleveService, userService, moduleCoursService } from '../../services/api';
import type { ModuleFormation, Centre, Eleve, User as UserType, ModuleCours } from '../../types';
import { formatFullName } from '../../utils/displayName';
import { Plus, BookOpen, Calendar, Clock, User, Check, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { CardsSkeleton, PageLoadingSkeleton } from '../../components/ui/DashboardSkeletons';
import { useMinDelayLoading } from '../../hooks/useMinDelayLoading';
import Modal from '../../components/ui/Modal';
import ModuleSupportsPanel from '../../components/dashboard/ModuleSupportsPanel';
import {
  clearOfflineFormations,
  enqueueOfflineFormation,
  listOfflineFormations,
  newLocalId,
} from '../../utils/offlineSessions';

export default function FormationsPage() {
  const { hasRole } = useAuth();

  const [formations, setFormations] = useState<ModuleFormation[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [formateurs, setFormateurs] = useState<UserType[]>([]);
  const [modulesCatalog, setModulesCatalog] = useState<ModuleCours[]>([]);

  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalStudentsLoading, setModalStudentsLoading] = useState(false);
  const skeletonLoading = useMinDelayLoading(loading, 220);

  const [selectedCentreId, setSelectedCentreId] = useState('');
  const [selectedFormateurId, setSelectedFormateurId] = useState('');
  const [selectedModuleCoursId, setSelectedModuleCoursId] = useState('');
  const [newFormation, setNewFormation] = useState({
    moduleCoursId: '',
    remarques: '',
    dureeHeures: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [presents, setPresents] = useState<number[]>([]);

  const isFormateur = hasRole('FORMATEUR');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const syncPendingOfflineFormations = async () => {
      if (!navigator.onLine) return;

      const pending = listOfflineFormations();
      if (pending.length === 0) return;

      const failures = [];
      let syncedCount = 0;
      for (const draft of pending) {
        try {
          await formationService.create({
            centreId: draft.centreId,
            moduleCoursId: draft.moduleCoursId,
            remarques: draft.remarques,
            dureeHeures: draft.dureeHeures,
            date: draft.date,
            elevesPresents: draft.elevesPresents,
          });
          syncedCount += 1;
        } catch {
          failures.push(draft);
        }
      }

      clearOfflineFormations(failures);
      if (syncedCount > 0) {
        toast.success(`${syncedCount} module(s) hors ligne synchronisé(s).`);
      }
    };

    syncPendingOfflineFormations();
    window.addEventListener('online', syncPendingOfflineFormations);
    return () => window.removeEventListener('online', syncPendingOfflineFormations);
  }, []);

  useEffect(() => {
    if (selectedCentreId) {
      fetchEleves(Number(selectedCentreId));
    } else {
      setEleves([]);
    }
  }, [selectedCentreId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      let formRes;
      if (isFormateur) {
        formRes = await formationService.getMesFormations();
      } else {
        formRes = { data: [] as ModuleFormation[] };
      }
      setFormations(formRes.data);

      if (isFormateur) {
        try {
          const modRes = await moduleCoursService.list();
          setModulesCatalog((modRes.data || []).filter((m) => m.actif).slice(0, 4));
        } catch {
          setModulesCatalog([]);
        }
      }

      if (!isFormateur) {
        try {
          const modRes = await moduleCoursService.list();
          setModulesCatalog((modRes.data || []).filter((m) => m.actif).slice(0, 4));
        } catch {
          setModulesCatalog([]);
        }
      }

      const centresRes = hasRole('DIRECTEUR')
        ? await centreService.getAll()
        : await centreService.getMesCentres();
      setCentres(centresRes.data);

      if (!isFormateur) {
        const centreFormateurs = Array.from(
          new Map(
            centresRes.data
              .flatMap((centre: Centre) => centre.formateurs ?? [])
              .map((formateur: UserType) => [formateur.id, formateur]),
          ).values(),
        ) as UserType[];

        if (centreFormateurs.length > 0) {
          setFormateurs(centreFormateurs);
        } else {
          try {
            const formateursRes = await userService.getFormateurs();
            setFormateurs(formateursRes.data);
          } catch {
            setFormateurs([]);
          }
        }
      }

      if (centresRes.data.length > 0) {
        const firstCentreId = centresRes.data[0].id;
        setSelectedCentreId(String(firstCentreId));
        if (!isFormateur) {
          const res = await formationService.getByCentre(firstCentreId);
          setFormations(res.data);
        }
      }
    } catch {
      toast.error('Erreur lors de la récupération des données.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEleves = async (centreId: number) => {
    setModalStudentsLoading(true);
    try {
      const res = await eleveService.getByCentre(centreId);
      setEleves(res.data);
      setPresents([]);
    } catch {
      toast.error('Erreur lors du chargement des élèves du centre.');
    } finally {
      setModalStudentsLoading(false);
    }
  };

  const loadFormations = async (centreId: string, formateurId: string, moduleCoursId: string) => {
    if (!centreId) return;
    setLoading(true);
    try {
      const res = await formationService.getByCentre(Number(centreId), {
        formateurId: formateurId ? Number(formateurId) : undefined,
        moduleCoursId: moduleCoursId ? Number(moduleCoursId) : undefined,
      });
      setFormations(res.data);
    } catch {
      toast.error('Erreur lors du chargement des modules.');
    } finally {
      setLoading(false);
    }
  };

  const handleCentreChange = async (centreId: string) => {
    setSelectedCentreId(centreId);
    if (!isFormateur && centreId) {
      await loadFormations(centreId, selectedFormateurId, selectedModuleCoursId);
    }
  };

  const handleFormateurChange = async (formateurId: string) => {
    setSelectedFormateurId(formateurId);
    if (!selectedCentreId) return;
    await loadFormations(selectedCentreId, formateurId, selectedModuleCoursId);
  };

  const handleModuleFilterChange = async (moduleCoursId: string) => {
    setSelectedModuleCoursId(moduleCoursId);
    if (!selectedCentreId) return;
    await loadFormations(selectedCentreId, selectedFormateurId, moduleCoursId);
  };

  const selectFormateurFromCard = (formateurId: number) => {
    const id = String(formateurId);
    setSelectedFormateurId(id);
    if (selectedCentreId) {
      void loadFormations(selectedCentreId, id, selectedModuleCoursId);
    }
    toast.success('Filtre formateur appliqué.');
  };

  const toggleStudentPresence = (id: number) => {
    setPresents((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id],
    );
  };

  const handleAddFormation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCentreId) {
      toast.error('Veuillez sélectionner un centre.');
      return;
    }
    if (!newFormation.moduleCoursId) {
      toast.error('Veuillez sélectionner un module du catalogue.');
      return;
    }

    const selectedModule = modulesCatalog.find(
      (m) => m.id === Number(newFormation.moduleCoursId),
    );
    const defaultDuree = selectedModule?.dureeRecommandeeHeures ?? 1;

    const formationData = {
      centreId: Number(selectedCentreId),
      moduleCoursId: Number(newFormation.moduleCoursId),
      remarques: newFormation.remarques.trim() || undefined,
      dureeHeures: newFormation.dureeHeures
        ? Number(newFormation.dureeHeures)
        : defaultDuree,
      date: newFormation.date,
      elevesPresents: presents,
    };

    if (!navigator.onLine) {
      enqueueOfflineFormation({
        localId: newLocalId('formation'),
        centreId: formationData.centreId,
        moduleCoursId: formationData.moduleCoursId,
        moduleTitre: selectedModule?.titre || 'Module',
        remarques: formationData.remarques,
        dureeHeures: formationData.dureeHeures,
        date: formationData.date,
        elevesPresents: formationData.elevesPresents,
        createdAt: Date.now(),
      });
      toast.success('Module enregistré hors ligne. Il sera synchronisé au retour de la connexion.');
      setShowAddModal(false);
      setNewFormation({
        moduleCoursId: '',
        remarques: '',
        dureeHeures: '',
        date: new Date().toISOString().split('T')[0],
      });
      setPresents([]);
      return;
    }

    try {
      await formationService.create(formationData);
      toast.success('Module enseigné enregistré dans le journal.');
      setShowAddModal(false);
      setNewFormation({
        moduleCoursId: '',
        remarques: '',
        dureeHeures: '',
        date: new Date().toISOString().split('T')[0],
      });
      setPresents([]);

      if (isFormateur) {
        const formRes = await formationService.getMesFormations();
        setFormations(formRes.data);
      } else {
        const res = await formationService.getByCentre(Number(selectedCentreId));
        setFormations(res.data);
      }
    } catch {
      toast.error("Erreur lors de l'enregistrement du module.");
    }
  };

  if (skeletonLoading && centres.length === 0) {
    return <PageLoadingSkeleton cardCount={4} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Modules enseignés</h1>
          <p className="text-slate-500 mt-1 max-w-2xl">
            {isFormateur
              ? 'Choisissez un module défini par le Directeur, indiquez les élèves présents et enregistrez.'
              : 'Consultation du journal pédagogique des modules enseignés par centre.'}
          </p>
        </div>
        {isFormateur && (
          <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary shrink-0">
            <Plus className="w-4 h-4" />
            Enseigner un module
          </button>
        )}
      </div>

      {isFormateur && (
        <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <Info className="w-5 h-5 shrink-0 mt-0.5 text-sky-600" />
          <div>
            <p className="font-semibold">Catalogue du Directeur</p>
            <p className="text-sky-800/90 mt-0.5 text-xs sm:text-sm leading-relaxed">
              Les modules sont créés par le <strong>Directeur</strong> dans « Supports de cours ».
              Vous <strong>sélectionnez</strong> le module à enseigner — pas de saisie libre.
              Pour le chrono et les notes en direct : <strong>Séances terrain</strong>.
            </p>
          </div>
        </div>
      )}

      {!isFormateur && centres.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
          <div className="flex items-center gap-2 max-w-xs">
            <label className="text-sm text-slate-500 whitespace-nowrap">Centre :</label>
            <select
              className="input-field py-2 text-sm"
              value={selectedCentreId}
              onChange={(e) => handleCentreChange(e.target.value)}
            >
              {centres.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 max-w-xs">
            <label className="text-sm text-slate-500 whitespace-nowrap">Formateur :</label>
            <select
              className="input-field py-2 text-sm"
              value={selectedFormateurId}
              onChange={(e) => handleFormateurChange(e.target.value)}
            >
              <option value="">Tous les formateurs</option>
              {formateurs.map((formateur) => (
                <option key={formateur.id} value={formateur.id}>
                  {formatFullName(formateur.prenom, formateur.nom)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 max-w-xs">
            <label className="text-sm text-slate-500 whitespace-nowrap">Module :</label>
            <select
              className="input-field py-2 text-sm"
              value={selectedModuleCoursId}
              onChange={(e) => handleModuleFilterChange(e.target.value)}
            >
              <option value="">Tous les modules</option>
              {modulesCatalog.map((m) => (
                <option key={m.id} value={m.id}>
                  #{m.numeroOrdre} — {m.titre}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {skeletonLoading ? (
        <CardsSkeleton count={4} />
      ) : (
        <div className="space-y-4">
          {formations.map((f) => (
            <div
              key={f.id}
              className="card border border-slate-200 bg-white hover:border-slate-300 transition-all p-5"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-primary-50 text-primary-700 border border-primary-100">
                      <BookOpen className="w-4 h-4" />
                    </span>
                    <h3 className="text-slate-900 font-bold text-lg">{f.titre}</h3>
                  </div>
                  <p className="text-slate-600 text-sm whitespace-pre-wrap">{f.description}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 shrink-0">
                  <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(f.date).toLocaleDateString('fr-FR')}
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                    <Clock className="w-3.5 h-3.5" />
                    {f.dureeHeures} h
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                    <User className="w-3.5 h-3.5" />
                    {f.formateurId && !isFormateur ? (
                      <button
                        type="button"
                        className="underline decoration-dotted hover:text-primary-700"
                        onClick={() => selectFormateurFromCard(f.formateurId)}
                      >
                        {formatFullName(f.formateurPrenom, f.formateurNom) || 'Formateur inconnu'}
                      </button>
                    ) : (
                      formatFullName(f.formateurPrenom, f.formateurNom) || 'Formateur inconnu'
                    )}
                  </span>
                  <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg">
                    <User className="w-3.5 h-3.5" />
                    {f.elevesPresents?.length ?? 0} présents
                  </span>
                </div>
              </div>
            </div>
          ))}

          {formations.length === 0 && (
            <div className="card border border-slate-200 bg-white text-center py-12 text-slate-500">
              {isFormateur
                ? 'Aucun module enseigné. Le Directeur doit d\'abord publier des modules dans « Supports de cours ».'
                : 'Aucun module enregistré pour ce centre.'}
            </div>
          )}
        </div>
      )}

      <Modal
        open={showAddModal}
        title="Enseigner un module"
        size="lg"
        onClose={() => setShowAddModal(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="btn-ghost w-full sm:w-auto justify-center"
            >
              Annuler
            </button>
            <button
              type="submit"
              form="add-formation-form"
              className="btn-primary w-full sm:w-auto justify-center"
            >
              Enregistrer le module
            </button>
          </>
        }
      >
        <form id="add-formation-form" onSubmit={handleAddFormation} className="space-y-3 sm:space-y-4">
          <p className="text-xs text-slate-500 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
            Sélectionnez un module du catalogue Directeur. Consultez les supports dans « Supports de cours ».
          </p>
          <div>
            <label className="label">Centre</label>
            <select
              className="input-field"
              required
              value={selectedCentreId}
              onChange={(e) => handleCentreChange(e.target.value)}
            >
              <option value="">Sélectionner le centre...</option>
              {centres.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Module à enseigner *</label>
            <select
              className="input-field"
              required
              value={newFormation.moduleCoursId}
              onChange={(e) => {
                const id = e.target.value;
                const mod = modulesCatalog.find((m) => m.id === Number(id));
                setNewFormation({
                  ...newFormation,
                  moduleCoursId: id,
                  dureeHeures: mod?.dureeRecommandeeHeures?.toString() || '',
                });
              }}
            >
              <option value="">Choisir un module...</option>
              {modulesCatalog.map((m) => (
                <option key={m.id} value={m.id}>
                  #{m.numeroOrdre} — {m.titre}
                </option>
              ))}
            </select>
            {modulesCatalog.length === 0 && (
              <p className="text-xs text-amber-700 mt-1">
                Aucun module disponible. Demandez au Directeur d&apos;en publier dans « Supports de cours ».
              </p>
            )}
          </div>
          {newFormation.moduleCoursId && (() => {
            const mod = modulesCatalog.find((m) => m.id === Number(newFormation.moduleCoursId));
            if (!mod) return null;
            return (
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 space-y-1">
                  {mod.description && <p>{mod.description}</p>}
                  {mod.objectifs && <p><strong>Objectifs :</strong> {mod.objectifs}</p>}
                </div>
                <ModuleSupportsPanel moduleId={Number(newFormation.moduleCoursId)} />
              </div>
            );
          })()}
          <div>
            <label className="label">Remarques (optionnel)</label>
            <textarea
              rows={2}
              placeholder="Observations après la séance…"
              className="input-field"
              value={newFormation.remarques}
              onChange={(e) => setNewFormation({ ...newFormation, remarques: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="label">Durée réelle (heures)</label>
              <input
                type="number"
                step="0.5"
                min={0.5}
                placeholder="Durée conseillée pré-remplie"
                className="input-field"
                value={newFormation.dureeHeures}
                onChange={(e) => setNewFormation({ ...newFormation, dureeHeures: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                required
                className="input-field"
                value={newFormation.date}
                onChange={(e) => setNewFormation({ ...newFormation, date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">Élèves présents ({presents.length})</label>
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 max-h-40 overflow-y-auto space-y-1.5">
              {modalStudentsLoading && (
                <>
                  <div className="skeleton-block h-9 rounded-lg" />
                  <div className="skeleton-block h-9 rounded-lg" />
                  <div className="skeleton-block h-9 rounded-lg" />
                </>
              )}
              {!modalStudentsLoading &&
                eleves.map((e) => {
                  const isPresent = presents.includes(e.id);
                  return (
                    <div
                      key={e.id}
                      onClick={() => toggleStudentPresence(e.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-colors ${
                        isPresent
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100'
                      }`}
                    >
                      <span className="text-sm font-medium">
                        {e.prenom} {e.nom}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                          isPresent
                            ? 'bg-emerald-600 text-white'
                            : 'bg-red-600 text-white'
                        }`}
                      >
                        {isPresent && <Check className="w-3 h-3" />}
                        {isPresent ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  );
                })}
              {!modalStudentsLoading && eleves.length === 0 && (
                <p className="text-xs text-slate-500 italic text-center py-4">
                  Aucun élève dans ce centre.
                </p>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
