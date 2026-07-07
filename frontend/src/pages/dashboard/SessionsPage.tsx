import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { centreService, sessionService } from '../../services/api';
import type { Centre, SessionCours, EvaluationSession } from '../../types';
import { Plus, X, Timer, Clock, User, Check, Loader2, Save, Lock, UploadCloud, FileText, DownloadCloud, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SessionsPage() {
  const { hasRole } = useAuth();
  
  const [sessions, setSessions] = useState<SessionCours[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSession, setNewSession] = useState({ titre: '', centreId: '', duree: '120' });
  
  const [selectedSession, setSelectedSession] = useState<SessionCours | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationSession[]>([]);
  const [showSessionDetail, setShowSessionDetail] = useState(false);
  
  // Filters for Directeur
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedFormateurId, setSelectedFormateurId] = useState<string>('');
  const [selectedCentreId, setSelectedCentreId] = useState<string>('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [sessRes, centRes] = await Promise.all([
        sessionService.getAll(),
        hasRole('DIRECTEUR') ? centreService.getAll() : centreService.getMesCentres()
      ]);
      setSessions(sessRes.data);
      setCentres(centRes.data);
    } catch {
      toast.error('Erreur lors du chargement des sessions.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sessionService.create({
        titre: newSession.titre,
        centre: { id: Number(newSession.centreId) },
        dureePrevueMinutes: Number(newSession.duree)
      });
      toast.success('Session démarrée !');
      setShowAddModal(false);
      fetchInitialData();
    } catch {
      toast.error('Erreur lors de la création de la session.');
    }
  };

  const openSessionDetail = async (session: SessionCours) => {
    try {
      const res = await sessionService.getById(session.id);
      setSelectedSession(res.data.session);
      setEvaluations(res.data.evaluations);
      setShowSessionDetail(true);
    } catch {
      toast.error('Erreur lors du chargement des détails.');
    }
  };

  const handleUpdateEvaluations = async () => {
    if (!selectedSession) return;
    try {
      const data = evaluations.map(ev => ({
        id: ev.id,
        present: ev.present,
        note: ev.note
      }));
      await sessionService.updateEvaluations(selectedSession.id, data);
      toast.success('Évaluations sauvegardées');
      // On recharge la session pour être à jour
      openSessionDetail(selectedSession);
    } catch {
      toast.error('Erreur lors de la sauvegarde.');
    }
  };

  const handleCloturer = async () => {
    if (!selectedSession) return;
    if (!window.confirm('Voulez-vous vraiment clôturer cette session ? Elle ne pourra plus être modifiée.')) return;
    try {
      await handleUpdateEvaluations(); // save before closing
      await sessionService.cloturer(selectedSession.id);
      toast.success('Session clôturée définitivement.');
      setShowSessionDetail(false);
      fetchInitialData();
    } catch {
      toast.error('Erreur lors de la clôture.');
    }
  };

  const handleNoteChange = (evalId: number, val: string) => {
    let note: number | undefined = parseFloat(val);
    if (isNaN(note)) note = undefined;
    if (note !== undefined && note > 20) note = 20;
    if (note !== undefined && note < 0) note = 0;
    
    setEvaluations(prev => prev.map(ev => ev.id === evalId ? { ...ev, note } : ev));
  };

  const handleUploadReport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedSession || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Check file size (e.g. max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Le fichier est trop volumineux (max 5MB)');
      return;
    }

    try {
      toast.loading('Upload en cours...', { id: 'upload' });
      await sessionService.uploadRapport(selectedSession.id, file);
      toast.success('Rapport ajouté avec succès !', { id: 'upload' });
      openSessionDetail(selectedSession); // Refresh
    } catch {
      toast.error('Erreur lors de l\'upload du rapport', { id: 'upload' });
    }
  };

  const isFormateur = hasRole('FORMATEUR');
  
  // Computed for filters
  const regions = Array.from(new Set(centres.map(c => c.region).filter(Boolean))) as string[];
  const filteredCentresByRegion = selectedRegion ? centres.filter(c => c.region === selectedRegion) : [];
  
  // Extract unique formateurs from the region's centres
  const formateursMap = new Map<number, any>();
  filteredCentresByRegion.forEach(c => {
    if (c.formateurs) {
      c.formateurs.forEach(f => formateursMap.set(f.id, f));
    }
  });
  const formateurs = Array.from(formateursMap.values());

  // Extract centres for the selected formateur in this region
  let formateurCentres: Centre[] = [];
  if (selectedFormateurId) {
    formateurCentres = filteredCentresByRegion.filter(c => c.formateurs?.some(f => f.id === Number(selectedFormateurId)));
  }

  let displayedSessions = sessions;
  if (hasRole('DIRECTEUR')) {
    if (!selectedRegion || !selectedFormateurId || !selectedCentreId) {
      displayedSessions = [];
    } else {
      displayedSessions = sessions.filter(s => 
        s.centre.region === selectedRegion &&
        s.formateur.id === Number(selectedFormateurId) &&
        s.centre.id === Number(selectedCentreId)
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Sessions de cours</h1>
          <p className="text-dark-400 mt-1">Démarrage, évaluation et clôture des séances.</p>
        </div>
        {isFormateur && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Démarrer une session
          </button>
        )}
      </div>

      {hasRole('DIRECTEUR') && (
        <div className="card border border-dark-700 bg-dark-900/50 p-4 flex flex-col md:flex-row gap-4 mb-2">
          <div className="flex-1">
            <label className="label">1. Filtrer par Région</label>
            <select className="input-field" value={selectedRegion} onChange={e => { setSelectedRegion(e.target.value); setSelectedFormateurId(''); setSelectedCentreId(''); }}>
              <option value="">Sélectionner une région...</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="label">2. Filtrer par Enseignant</label>
            <select className="input-field" value={selectedFormateurId} onChange={e => { setSelectedFormateurId(e.target.value); setSelectedCentreId(''); }} disabled={!selectedRegion}>
              <option value="">Sélectionner un enseignant...</option>
              {formateurs.map(f => <option key={f.id} value={f.id}>{f.prenom} {f.nom}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="label">3. Filtrer par Centre</label>
            <select className="input-field" value={selectedCentreId} onChange={e => setSelectedCentreId(e.target.value)} disabled={!selectedFormateurId}>
              <option value="">Sélectionner un centre...</option>
              {formateurCentres.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center h-48 items-center"><Loader2 className="animate-spin w-8 h-8 text-primary-500"/></div>
      ) : hasRole('DIRECTEUR') && (!selectedRegion || !selectedFormateurId || !selectedCentreId) ? (
        <div className="card text-center text-dark-500 py-12">
          Veuillez sélectionner la région, l'enseignant, puis le centre pour afficher les sessions.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedSessions.map(s => {
            const isClosed = s.statut === 'CLOTUREE';
            return (
              <div key={s.id} onClick={() => openSessionDetail(s)} className={`card border cursor-pointer transition-all hover:scale-[1.02] ${isClosed ? 'border-dark-700 bg-dark-900/50' : 'border-primary-500/50 bg-primary-500/5 shadow-lg shadow-primary-500/10'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isClosed ? 'bg-dark-800 text-dark-400' : 'bg-primary-500/20 text-primary-400'}`}>
                      <Timer className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{s.titre}</h3>
                      <p className="text-xs text-dark-400">{s.centre.nom}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${isClosed ? 'bg-dark-800 text-dark-400' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                    {isClosed ? 'CLÔTURÉE' : 'EN COURS'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-dark-400 border-t border-dark-800 pt-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> 
                    {isClosed && s.dureeReelleMinutes ? s.dureeReelleMinutes : (isClosed ? 0 : s.dureePrevueMinutes)} min / {s.dureePrevueMinutes} min
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> 
                    {s.nbPresents ?? 0}/{s.nbTotalEleves ?? 0} présents
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> 
                    {new Date(s.heureDebut).toLocaleDateString('fr-FR')}
                  </span>
                  {isClosed && (
                    <span className={`flex items-center gap-1 ml-auto ${s.rapportUrl ? 'text-emerald-400' : 'text-orange-400'}`}>
                      <FileText className="w-3.5 h-3.5" /> {s.rapportUrl ? 'Rapport joint' : 'Rapport manquant'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
          {displayedSessions.length === 0 && <div className="col-span-full card text-center text-dark-500 py-12">Aucune session enregistrée.</div>}
        </div>
      )}

      {/* Modal Créer Session */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full border border-dark-700">
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Démarrer une session</h2>
              <button onClick={() => setShowAddModal(false)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="label">Centre</label>
                <select required className="input-field" value={newSession.centreId} onChange={e => setNewSession({...newSession, centreId: e.target.value})}>
                  <option value="">Sélectionner...</option>
                  {centres.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Titre de la session</label>
                <input type="text" required placeholder="Ex: TP React - Matin" className="input-field" value={newSession.titre} onChange={e => setNewSession({...newSession, titre: e.target.value})} />
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
              <button type="submit" className="btn-primary w-full justify-center">Lancer le chrono</button>
            </form>
          </div>
        </div>
      )}

      {/* Détail Session (Plein écran ou grande modale) */}
      {showSessionDetail && selectedSession && (
        <div className="fixed inset-0 bg-dark-950 z-50 overflow-y-auto flex flex-col">
          <div className="sticky top-0 bg-dark-900 border-b border-dark-800 p-4 px-6 flex items-center justify-between z-10 shadow-xl">
            <div className="flex items-center gap-4">
              <button onClick={() => setShowSessionDetail(false)} className="p-2 rounded-lg bg-dark-800 text-dark-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {selectedSession.titre}
                  {selectedSession.statut === 'CLOTUREE' && <Lock className="w-4 h-4 text-red-400" />}
                </h2>
                <p className="text-sm text-dark-400">{selectedSession.centre.nom} • Démarrée le {new Date(selectedSession.heureDebut).toLocaleString('fr-FR')}</p>
              </div>
            </div>
            
            {selectedSession.statut === 'EN_COURS' && isFormateur && (
              <div className="flex items-center gap-3">
                <button onClick={handleUpdateEvaluations} className="btn-ghost flex items-center gap-2 text-primary-400 hover:bg-primary-500/10">
                  <Save className="w-4 h-4" /> Sauvegarder
                </button>
                <button onClick={handleCloturer} className="btn-primary bg-red-500 hover:bg-red-600 shadow-red-500/20 border-none">
                  <Lock className="w-4 h-4" /> Clôturer la session
                </button>
              </div>
            )}
            
            {selectedSession.statut === 'CLOTUREE' && (
              <div className="flex items-center gap-3">
                {selectedSession.rapportUrl ? (
                  <a href={`http://localhost:8080${selectedSession.rapportUrl}`} target="_blank" rel="noreferrer" className="btn-primary bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 border-none flex items-center gap-2">
                    <DownloadCloud className="w-4 h-4" /> Télécharger le rapport
                  </a>
                ) : isFormateur ? (
                  <label className="btn-ghost flex items-center gap-2 text-blue-400 hover:bg-blue-500/10 cursor-pointer">
                    <UploadCloud className="w-4 h-4" /> Ajouter un rapport (Word/PDF)
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleUploadReport} />
                  </label>
                ) : (
                  <span className="text-dark-500 italic text-sm">Aucun rapport</span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
            <div className="card overflow-hidden p-0 border border-dark-700">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-dark-800/50 border-b border-dark-700">
                      <th className="p-4 font-semibold text-dark-200">Élève</th>
                      <th className="p-4 font-semibold text-dark-200">Classe</th>
                      <th className="p-4 font-semibold text-dark-200 text-center w-32">Présence</th>
                      <th className="p-4 font-semibold text-dark-200 w-48">Note (/20)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-800">
                    {evaluations.map(ev => (
                      <tr key={ev.id} className="hover:bg-dark-800/20 transition-colors">
                        <td className="p-4">
                          <div className="font-medium text-white">{ev.eleve.prenom} {ev.eleve.nom}</div>
                        </td>
                        <td className="p-4 text-dark-300 text-sm">{ev.eleve.classe}</td>
                        <td className="p-4 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" 
                               checked={ev.present} 
                               disabled={selectedSession.statut === 'CLOTUREE'}
                               onChange={e => setEvaluations(prev => prev.map(p => p.id === ev.id ? {...p, present: e.target.checked} : p))} />
                            <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-dark-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                          </label>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              min="0" max="20" step="0.5"
                              disabled={selectedSession.statut === 'CLOTUREE' || !ev.present}
                              className="input-field py-1.5 w-24 text-center font-bold text-primary-400 disabled:opacity-50" 
                              placeholder="-"
                              value={ev.note ?? ''} 
                              onChange={e => handleNoteChange(ev.id, e.target.value)} 
                            />
                            <span className="text-dark-400 font-medium">/ 20</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {evaluations.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-dark-500 italic">Aucun élève trouvé.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
