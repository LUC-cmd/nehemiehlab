import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { eleveService, centreService } from '../../services/api';
import type { Eleve, Centre, ChildSessionRow } from '../../types';
import { centreLabel } from '../../utils/centreLabel';
import { NIVEAUX_MAITRISE } from '../../types';
import { Plus, Search, MessageSquare, AlertTriangle, Edit2, KeyRound, Copy, CalendarDays, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import EleveFicheForm from '../../components/dashboard/EleveFicheForm';
import { emptyEleveFiche, eleveToFicheValues } from '../../utils/eleveForm';
import { PageLoadingSkeleton, TableSkeleton } from '../../components/ui/DashboardSkeletons';
import { useMinDelayLoading } from '../../hooks/useMinDelayLoading';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ChildSessionHistory from '../../components/dashboard/ChildSessionHistory';
import { formatFullName } from '../../utils/displayName';

export default function ElevesPage() {
  const { hasRole, user } = useAuth();
  const { hasFeature } = useAccess();
  
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [selectedCentreId, setSelectedCentreId] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const skeletonLoading = useMinDelayLoading(loading, 220);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showSignalModal, setShowSignalModal] = useState(false);
  const [parentCodeInfo, setParentCodeInfo] = useState<{
    eleve: Eleve;
    code: string;
    expireLe: string;
  } | null>(null);
  
  // Selected eleve for action
  const [activeEleve, setActiveEleve] = useState<Eleve | null>(null);
  
  // Form states
  const [ficheValues, setFicheValues] = useState(emptyEleveFiche());
  const [projectForm, setProjectForm] = useState({
    nom: '',
    description: '',
    evolution: 0,
    causeNonAvancement: '',
    justificationPedagogique: '',
    pointsForts: '',
    recommandations: '',
    probleme: '',
    solution: '',
    niveauMaitrise: '',
    observationsRapport: '',
  });
  const [commentText, setCommentText] = useState('');
  const [signalText, setSignalText] = useState('');
  const [signalIncludeInReport, setSignalIncludeInReport] = useState(true);
  const [signalPriorite, setSignalPriorite] = useState<'NORMALE' | 'URGENTE'>('NORMALE');
  const [signalEquipements, setSignalEquipements] = useState('');
  const [signalDefis, setSignalDefis] = useState('');

  const [showSeancesModal, setShowSeancesModal] = useState(false);
  const [seancesEleve, setSeancesEleve] = useState<ChildSessionRow[]>([]);
  const [seancesLoading, setSeancesLoading] = useState(false);

  const [deleteEleveTarget, setDeleteEleveTarget] = useState<Eleve | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCentreId) {
      fetchEleves(Number(selectedCentreId));
    }
  }, [selectedCentreId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      let centresList: Centre[] = [];
      if (hasRole('DIRECTEUR')) {
        const res = await centreService.getAll();
        centresList = res.data;
      } else if (hasRole('FORMATEUR')) {
        const res = await centreService.getMesCentres();
        centresList = res.data;
      } else if (hasRole('COORDINATEUR', 'RESPONSABLE_CLUSTER')) {
        const res = await centreService.getMesCentres();
        centresList = res.data;
      }
      setCentres(centresList);
      if (centresList.length > 0) {
        setSelectedCentreId(String(centresList[0].id));
      } else {
        setLoading(false);
      }
    } catch {
      toast.error('Erreur lors du chargement des données.');
      setLoading(false);
    }
  };

  const fetchEleves = async (centreId: number) => {
    setLoading(true);
    try {
      const res = await eleveService.getByCentre(centreId);
      setEleves(res.data);
    } catch {
      toast.error('Erreur lors du chargement des élèves.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEleve = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await eleveService.create({
        nom: ficheValues.nom,
        prenom: ficheValues.prenom,
        dateNaissance: ficheValues.dateNaissance,
        age: Number(ficheValues.age),
        sexe: ficheValues.sexe,
        classe: ficheValues.classe,
        centreId: Number(ficheValues.centreId || selectedCentreId),
        dateDebutFormation: ficheValues.dateDebutFormation,
        raisonSelection: ficheValues.raisonSelection || undefined,
      });
      const matricule = data?.matricule || data?.eleve?.matricule || data?.codeAccesParent;
      toast.success(
        matricule
          ? `Élève inscrit — matricule : ${matricule}. Générez ensuite un code d’activation parent.`
          : 'Élève inscrit avec succès.',
        { duration: 8000 },
      );
      setShowAddModal(false);
      setFicheValues(emptyEleveFiche(selectedCentreId));
      fetchEleves(Number(selectedCentreId));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Erreur lors de l\'inscription de l\'élève.');
    }
  };

  const handleUpdateEleve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEleve) return;
    try {
      await eleveService.update(activeEleve.id, {
        nom: ficheValues.nom,
        prenom: ficheValues.prenom,
        dateNaissance: ficheValues.dateNaissance,
        age: Number(ficheValues.age),
        sexe: ficheValues.sexe,
        classe: ficheValues.classe,
        dateDebutFormation: ficheValues.dateDebutFormation,
        raisonSelection: ficheValues.raisonSelection || undefined,
      });
      toast.success('Fiche élève mise à jour.');
      setShowEditModal(false);
      setActiveEleve(null);
      fetchEleves(Number(selectedCentreId));
    } catch {
      toast.error('Erreur lors de la mise à jour.');
    }
  };

  const openAddModal = () => {
    setFicheValues(emptyEleveFiche(selectedCentreId));
    setShowAddModal(true);
  };

  const openEditModal = (eleve: Eleve) => {
    setActiveEleve(eleve);
    setFicheValues(eleveToFicheValues(eleve));
    setShowEditModal(true);
  };

  const handleIssueParentCode = async (eleve: Eleve) => {
    try {
      const response = await eleveService.issueParentActivationCode(eleve.id);
      setParentCodeInfo({
        eleve,
        code: response.data.codeActivation,
        expireLe: response.data.expireLe,
      });
    } catch {
      toast.error("Impossible de générer le code d'activation parent.");
    }
  };

  const handleDeleteEleve = async () => {
    if (!deleteEleveTarget) return;
    try {
      const res = await eleveService.delete(deleteEleveTarget.id);
      toast.success((res.data as { message?: string })?.message || 'Élève supprimé définitivement.');
      setDeleteEleveTarget(null);
      fetchEleves(Number(selectedCentreId));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Erreur lors de la suppression de l'élève.";
      toast.error(msg);
      throw err;
    }
  };

  const handleStartPresence = async (id: number) => {
    try {
      await eleveService.demarrerSession(id);
      toast.success('Session de présence démarrée.');
      fetchEleves(Number(selectedCentreId));
    } catch {
      toast.error('Erreur lors du démarrage de la session.');
    }
  };

  const handleEndPresence = async (id: number) => {
    try {
      await eleveService.terminerSession(id);
      toast.success('Session de présence terminée.');
      fetchEleves(Number(selectedCentreId));
    } catch {
      toast.error('Erreur lors de la clôture de la session.');
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEleve) return;
    try {
      await eleveService.updateProjet(activeEleve.id, projectForm);
      toast.success('Projet mis à jour.');
      setShowProjectModal(false);
      fetchEleves(Number(selectedCentreId));
    } catch {
      toast.error('Erreur lors de la mise à jour du projet.');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEleve) return;
    try {
      await eleveService.addCommentaire(activeEleve.id, commentText);
      toast.success('Commentaire ajouté.');
      setShowCommentModal(false);
      setCommentText('');
      fetchEleves(Number(selectedCentreId));
    } catch {
      toast.error('Erreur lors de l\'ajout du commentaire.');
    }
  };

  const handleOpenSeances = async (eleve: Eleve) => {
    setActiveEleve(eleve);
    setShowSeancesModal(true);
    setSeancesLoading(true);
    setSeancesEleve([]);
    try {
      const { data } = await eleveService.getSeances(eleve.id);
      setSeancesEleve(data || []);
    } catch {
      toast.error('Impossible de charger l\'historique des séances.');
    } finally {
      setSeancesLoading(false);
    }
  };

  const handleAddSignalement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEleve) return;
    try {
      await eleveService.signalerEleve(
        activeEleve.id,
        signalText,
        signalIncludeInReport,
        {
          priorite: signalPriorite,
          etatEquipements: signalEquipements.trim() || undefined,
          defis: signalDefis.trim() || undefined,
        }
      );
      toast.success('Alerte enfant enregistrée (centre + directeur).');
      setShowSignalModal(false);
      setSignalText('');
      setSignalIncludeInReport(true);
      setSignalPriorite('NORMALE');
      setSignalEquipements('');
      setSignalDefis('');
      fetchEleves(Number(selectedCentreId));
    } catch {
      toast.error('Erreur lors de l\'envoi du signalement.');
    }
  };

  const isFormateur = hasRole('FORMATEUR');
  const isDir = hasRole('DIRECTEUR');
  const isCoordinateur = hasRole('COORDINATEUR');
  const canIssueParentCode = hasRole('DIRECTEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER');
  const canEdit = (isDir || isFormateur || hasRole('COORDINATEUR', 'RESPONSABLE_CLUSTER')) && hasFeature('create_eleve');
  const showCentrePicker = !(isCoordinateur && centres.length <= 1);

  const filtered = eleves.filter(e =>
    `${e.prenom} ${e.nom}`.toLowerCase().includes(search.toLowerCase()) ||
    e.classe.toLowerCase().includes(search.toLowerCase()) ||
    (e.matricule || '').toLowerCase().includes(search.toLowerCase())
  );

  if (skeletonLoading && centres.length === 0) {
    return <PageLoadingSkeleton showTable />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Élèves / Apprenants</h1>
          <p className="text-dark-400 mt-1">Infos fixes enfant (identité/scolarité) + suivi évolutif par séance et projet.</p>
        </div>
        {canEdit && (
          <button onClick={openAddModal} className="btn-primary">
            <Plus className="w-4 h-4" />
            Inscrire un élève
          </button>
        )}
      </div>

      {/* Filtre par Centre */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-sm text-dark-400 whitespace-nowrap">Centre :</label>
          {showCentrePicker ? (
            <select className="input-field py-2 text-sm" value={selectedCentreId} onChange={e => setSelectedCentreId(e.target.value)}>
              {centres.map(c => (
                <option key={c.id} value={c.id}>{centreLabel(c)}</option>
              ))}
            </select>
          ) : (
            <span className="text-sm text-white font-medium">{centres[0] ? centreLabel(centres[0]) : '—'}</span>
          )}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input type="text" placeholder="Rechercher un élève..." className="input-field pl-11 py-2 text-sm"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {skeletonLoading ? (
        <TableSkeleton rows={7} />
      ) : (
        <div className="card overflow-hidden p-0 border border-dark-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-dark-800/50 border-b border-dark-700">
                  <th className="p-4 font-semibold text-dark-200">Élève</th>
                  <th className="p-4 font-semibold text-dark-200">Matricule</th>
                  <th className="p-4 font-semibold text-dark-200">Âge / Sexe</th>
                  <th className="p-4 font-semibold text-dark-200">Classe</th>
                  <th className="p-4 font-semibold text-dark-200">Perf. Globale</th>
                  <th className="p-4 font-semibold text-dark-200">Projet</th>
                  <th className="p-4 font-semibold text-dark-200 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {filtered.map((eleve) => (
                  <tr key={eleve.id} className="hover:bg-dark-800/20 transition-colors">
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => handleOpenSeances(eleve)}
                        className="text-left group"
                      >
                        <div className="font-medium text-white group-hover:text-primary-300 transition-colors">
                          {formatFullName(eleve.prenom, eleve.nom)}
                        </div>
                        <div className="text-xs text-dark-400 mt-0.5 group-hover:text-dark-300">
                          {eleve.totalHeures ? `${eleve.totalHeures.toFixed(1)} hrs` : '0 hr'}
                          <span className="mx-1">·</span>
                          <span className="text-primary-400/80">Voir les séances</span>
                        </div>
                        {eleve.raisonSelection && (
                          <p
                            className="text-[11px] text-dark-500 italic mt-1 max-w-xs truncate"
                            title={eleve.raisonSelection}
                          >
                            Raison de sélection : {eleve.raisonSelection}
                          </p>
                        )}
                      </button>
                    </td>
                    <td className="p-4">
                      {eleve.matricule ? (
                        <div>
                          <code className="text-xs font-bold text-primary-300 bg-primary-500/10 border border-primary-500/20 px-2 py-1 rounded-lg">
                            {eleve.matricule}
                          </code>
                          <p className="text-[10px] text-dark-500 mt-1">Identifiant uniquement</p>
                        </div>
                      ) : (
                        <span className="text-dark-500 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-4 text-dark-300 text-sm">
                      {eleve.age} ans • {eleve.sexe}
                    </td>
                    <td className="p-4 text-dark-300 text-sm">
                      {eleve.classe}
                    </td>
                    <td className="p-4">
                      {eleve.performanceMoyenne !== undefined && eleve.performanceMoyenne !== null ? (
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${eleve.performanceMoyenne >= 10 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {eleve.performanceMoyenne}
                          </span>
                          <span className="text-dark-400 text-xs">/ 20</span>
                        </div>
                      ) : (
                        <span className="text-dark-500 italic text-xs">Non évalué</span>
                      )}
                    </td>
                    <td className="p-4">
                      {eleve.projet ? (
                        <div className="w-32">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-primary-400 truncate w-20">{eleve.projet.nom}</span>
                            <span className="text-dark-300">{eleve.projet.evolution}%</span>
                          </div>
                          <div className="w-full bg-dark-700 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-primary-500 h-full rounded-full" style={{ width: `${eleve.projet.evolution}%` }} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-dark-500 italic text-xs">Aucun projet</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenSeances(eleve)}
                          className="p-2 text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded-lg transition-colors"
                          title="Historique des séances"
                        >
                          <CalendarDays className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setActiveEleve(eleve); setCommentText(''); setShowCommentModal(true); }}
                          className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors" title="Commenter">
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => openEditModal(eleve)}
                            className="p-2 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition-colors"
                            title="Modifier la fiche"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => {
                            setActiveEleve(eleve);
                            setProjectForm({
                              nom: eleve.projet?.nom ?? '',
                              description: eleve.projet?.description ?? '',
                              evolution: eleve.projet?.evolution ?? 0,
                              causeNonAvancement: eleve.projet?.causeNonAvancement ?? '',
                              justificationPedagogique: eleve.projet?.justificationPedagogique ?? '',
                              pointsForts: eleve.projet?.pointsForts ?? '',
                              recommandations: eleve.projet?.recommandations ?? '',
                              probleme: eleve.projet?.probleme ?? '',
                              solution: eleve.projet?.solution ?? '',
                              niveauMaitrise: eleve.projet?.niveauMaitrise ?? '',
                              observationsRapport: eleve.projet?.observationsRapport ?? '',
                            });
                            setShowProjectModal(true);
                          }}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors" title="Projet">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canIssueParentCode && (
                          <button
                            onClick={() => handleIssueParentCode(eleve)}
                            className="p-2 text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 rounded-lg transition-colors"
                            title="Générer un code d’activation parent"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => { setActiveEleve(eleve); setSignalText(''); setSignalIncludeInReport(true); setSignalPriorite('NORMALE'); setSignalEquipements(''); setSignalDefis(''); setShowSignalModal(true); }}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors" title="Signaler">
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                        {isDir && (
                          <button
                            onClick={() => setDeleteEleveTarget(eleve)}
                            className="p-2 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Supprimer définitivement l'élève"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-dark-500">
                      Aucun élève trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Inscription Élève */}
      <Modal
        open={showAddModal}
        title="Inscrire un élève"
        size="md"
        onClose={() => setShowAddModal(false)}
        footer={
          <>
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-ghost w-full sm:w-auto justify-center">
              Annuler
            </button>
            <button type="submit" form="add-eleve-form" className="btn-primary w-full sm:w-auto justify-center">
              Inscrire l&apos;élève
            </button>
          </>
        }
      >
        <EleveFicheForm
          formId="add-eleve-form"
          values={ficheValues}
          onChange={setFicheValues}
          onSubmit={handleAddEleve}
          centres={centres}
          showCentreSelect={centres.length > 1}
          mode="create"
        />
      </Modal>

      <Modal
        open={showEditModal && !!activeEleve}
        title={activeEleve ? `Fiche — ${activeEleve.prenom} ${activeEleve.nom}` : 'Modifier'}
        size="md"
        onClose={() => { setShowEditModal(false); setActiveEleve(null); }}
        footer={
          <>
            <button type="button" onClick={() => { setShowEditModal(false); setActiveEleve(null); }} className="btn-ghost w-full sm:w-auto justify-center">
              Annuler
            </button>
            <button type="submit" form="edit-eleve-form" className="btn-primary w-full sm:w-auto justify-center">
              Enregistrer
            </button>
          </>
        }
      >
        <EleveFicheForm
          formId="edit-eleve-form"
          values={ficheValues}
          onChange={setFicheValues}
          onSubmit={handleUpdateEleve}
          centres={centres}
          showCentreSelect={false}
          mode="edit"
        />
      </Modal>

      {/* Modal Projet */}
      <Modal
        open={showProjectModal && !!activeEleve}
        title={activeEleve ? `Projet final — ${activeEleve.prenom}` : 'Projet'}
        subtitle="Ces informations alimentent le rapport annuel formateur (problème, solution, niveau, observations)."
        size="lg"
        onClose={() => setShowProjectModal(false)}
        footer={
          <>
            <button type="button" onClick={() => setShowProjectModal(false)} className="btn-ghost w-full sm:w-auto justify-center">
              Annuler
            </button>
            <button type="submit" form="project-form" className="btn-primary w-full sm:w-auto justify-center">
              Enregistrer le projet
            </button>
          </>
        }
      >
        <form id="project-form" onSubmit={handleUpdateProject} className="space-y-3 sm:space-y-4">
          <div>
            <label className="label">Nom du projet</label>
            <input type="text" required placeholder="Nom du projet" className="input-field"
              value={projectForm.nom} onChange={e => setProjectForm({ ...projectForm, nom: e.target.value })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea rows={3} required placeholder="Description du projet..." className="input-field"
              value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Évolution (%) : {projectForm.evolution}%</label>
            <input type="range" min="0" max="100" step="5" className="w-full accent-primary-500"
              value={projectForm.evolution} onChange={e => setProjectForm({ ...projectForm, evolution: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Problème illustré par le projet (rapport annuel)</label>
            <textarea rows={2} placeholder="Quel problème local ou personnel le projet adresse-t-il ?" className="input-field"
              value={projectForm.probleme} onChange={e => setProjectForm({ ...projectForm, probleme: e.target.value })} />
          </div>
          <div>
            <label className="label">Solution illustrée par le projet</label>
            <textarea rows={2} placeholder="Comment le projet Scratch propose une solution ?" className="input-field"
              value={projectForm.solution} onChange={e => setProjectForm({ ...projectForm, solution: e.target.value })} />
          </div>
          <div>
            <label className="label">Niveau de maîtrise (rapport annuel)</label>
            <select className="input-field" value={projectForm.niveauMaitrise}
              onChange={e => setProjectForm({ ...projectForm, niveauMaitrise: e.target.value })}>
              <option value="">Auto (selon notes de séance)</option>
              {NIVEAUX_MAITRISE.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Observations consolidées (rapport annuel)</label>
            <textarea rows={3} placeholder="Synthèse comportement, assiduité, progrès…" className="input-field"
              value={projectForm.observationsRapport} onChange={e => setProjectForm({ ...projectForm, observationsRapport: e.target.value })} />
          </div>
          <div>
            <label className="label">Cause (pourquoi le projet n&apos;avance pas / n&apos;est pas terminé)</label>
            <textarea rows={3} placeholder="Précisez les freins rencontrés..." className="input-field"
              value={projectForm.causeNonAvancement} onChange={e => setProjectForm({ ...projectForm, causeNonAvancement: e.target.value })} />
          </div>
          <div>
            <label className="label">Justification pédagogique (pour le rapport)</label>
            <textarea rows={3} placeholder="Expliquez la situation d&apos;un point de vue pédagogique..." className="input-field"
              value={projectForm.justificationPedagogique} onChange={e => setProjectForm({ ...projectForm, justificationPedagogique: e.target.value })} />
          </div>
          <div>
            <label className="label">Points forts</label>
            <textarea rows={3} placeholder="Décrivez les acquis et points forts..." className="input-field"
              value={projectForm.pointsForts} onChange={e => setProjectForm({ ...projectForm, pointsForts: e.target.value })} />
          </div>
          <div>
            <label className="label">Recommandations</label>
            <textarea rows={3} placeholder="Indiquez les prochaines étapes recommandées..." className="input-field"
              value={projectForm.recommandations} onChange={e => setProjectForm({ ...projectForm, recommandations: e.target.value })} />
          </div>
        </form>
      </Modal>

      {/* Modal Commentaire */}
      <Modal
        open={showCommentModal && !!activeEleve}
        title="Ajouter un commentaire"
        size="md"
        onClose={() => setShowCommentModal(false)}
        footer={
          <>
            <button type="button" onClick={() => setShowCommentModal(false)} className="btn-ghost w-full sm:w-auto justify-center">
              Annuler
            </button>
            <button type="submit" form="comment-form" className="btn-primary w-full sm:w-auto justify-center">
              Ajouter
            </button>
          </>
        }
      >
        <form id="comment-form" onSubmit={handleAddComment} className="space-y-3 sm:space-y-4">
          <div>
            <label className="label">Observations sur {activeEleve?.prenom}</label>
            <textarea rows={4} required placeholder="Saisir vos remarques..." className="input-field"
              value={commentText} onChange={e => setCommentText(e.target.value)} />
          </div>
        </form>
      </Modal>

      {/* Modal Signalement */}
      <Modal
        open={showSignalModal && !!activeEleve}
        title="Signaler un incident"
        subtitle={activeEleve ? `Alerte concernant ${activeEleve.prenom}` : undefined}
        size="md"
        onClose={() => setShowSignalModal(false)}
        footer={
          <>
            <button type="button" onClick={() => setShowSignalModal(false)} className="btn-ghost w-full sm:w-auto justify-center">
              Annuler
            </button>
            <button type="submit" form="signal-form" className="btn-danger w-full sm:w-auto justify-center">
              Envoyer le signalement
            </button>
          </>
        }
      >
        <form id="signal-form" onSubmit={handleAddSignalement} className="space-y-3 sm:space-y-4">
          <div>
            <label className="label">Décrire l&apos;incident ou le comportement</label>
            <textarea rows={4} required placeholder="Soyez précis dans votre description..." className="input-field border-red-500/30 focus:border-red-500"
              value={signalText} onChange={e => setSignalText(e.target.value)} />
          </div>
          <div>
            <label className="label">Priorité</label>
            <select className="input-field" value={signalPriorite} onChange={e => setSignalPriorite(e.target.value as 'NORMALE' | 'URGENTE')}>
              <option value="NORMALE">Normale</option>
              <option value="URGENTE">Urgente</option>
            </select>
          </div>
          <div>
            <label className="label">État des équipements (optionnel)</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ex: 7 ordinateurs bon état"
              value={signalEquipements}
              onChange={e => setSignalEquipements(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Défis (optionnel)</label>
            <textarea
              rows={2}
              className="input-field"
              placeholder="Ex: panne internet, manque souris..."
              value={signalDefis}
              onChange={e => setSignalDefis(e.target.value)}
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={signalIncludeInReport}
              onChange={e => setSignalIncludeInReport(e.target.checked)}
            />
            Inclure cette alerte dans le rapport enfant
          </label>
        </form>
      </Modal>

      <Modal
        open={showSeancesModal && !!activeEleve}
        title={activeEleve ? `Séances — ${formatFullName(activeEleve.prenom, activeEleve.nom)}` : 'Séances'}
        subtitle={activeEleve?.matricule ? `Matricule ${activeEleve.matricule}` : undefined}
        size="xl"
        onClose={() => setShowSeancesModal(false)}
        footer={
          <button type="button" onClick={() => setShowSeancesModal(false)} className="btn-ghost w-full sm:w-auto justify-center">
            Fermer
          </button>
        }
      >
        {seancesLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            <p className="text-dark-400 text-sm">Chargement du parcours…</p>
          </div>
        ) : (
          <ChildSessionHistory
            sessions={seancesEleve}
            childName={formatFullName(activeEleve?.prenom, activeEleve?.nom)}
            theme="dark"
          />
        )}
      </Modal>

      <Modal
        open={!!parentCodeInfo}
        title="Code d’activation parent"
        subtitle={parentCodeInfo
          ? `${parentCodeInfo.eleve.prenom} ${parentCodeInfo.eleve.nom} · ${parentCodeInfo.eleve.matricule}`
          : undefined}
        size="sm"
        onClose={() => setParentCodeInfo(null)}
        footer={
          <button type="button" onClick={() => setParentCodeInfo(null)} className="btn-primary w-full justify-center">
            J’ai remis le code au parent
          </button>
        }
      >
        {parentCodeInfo && (
          <div className="space-y-4">
            <p className="text-sm text-dark-300">
              Ce code est affiché une seule fois. Remettez-le au parent par un canal hors ligne sécurisé.
            </p>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
              <code className="text-2xl font-black tracking-[0.2em] text-amber-200">
                {parentCodeInfo.code}
              </code>
            </div>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(parentCodeInfo.code);
                toast.success('Code copié.');
              }}
              className="btn-secondary w-full justify-center"
            >
              <Copy className="w-4 h-4" />
              Copier le code
            </button>
            <p className="text-xs text-dark-400">
              Expiration : {new Date(parentCodeInfo.expireLe).toLocaleString('fr-FR')}.
              Générer un nouveau code invalide immédiatement le précédent.
            </p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteEleveTarget != null}
        title="Supprimer définitivement cet élève ?"
        message={
          deleteEleveTarget
            ? `Toutes les données liées à ${formatFullName(deleteEleveTarget.prenom, deleteEleveTarget.nom)} (présences, commentaires, signalements, projet) seront définitivement supprimées. Cette action est irréversible.`
            : ''
        }
        confirmLabel="Supprimer définitivement"
        danger
        requireTypedConfirmation={deleteEleveTarget ? formatFullName(deleteEleveTarget.prenom, deleteEleveTarget.nom) : undefined}
        typedConfirmationLabel={
          deleteEleveTarget ? (
            <>
              Pour confirmer, retapez le nom complet de l'élève :{' '}
              <span className="font-mono font-semibold text-slate-700">
                {formatFullName(deleteEleveTarget.prenom, deleteEleveTarget.nom)}
              </span>
            </>
          ) : undefined
        }
        onConfirm={handleDeleteEleve}
        onCancel={() => setDeleteEleveTarget(null)}
      />
    </div>
  );
}
