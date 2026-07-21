import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpenCheck, Upload, FileCode2, CheckCircle2, Loader2, ClipboardList,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { formateurEvaluationService, moduleCoursService } from '../../services/api';
import type { FormateurEvaluation, ModuleCours } from '../../types';
import { quizForModuleOrder } from '../../constants/skaQuiz';
import { PageLoadingSkeleton } from '../../components/ui/DashboardSkeletons';
import { formatFullName } from '../../utils/displayName';

type Step = 'module' | 'quiz' | 'scratch' | 'done';

export default function EvaluationFormateurPage() {
  const { hasRole } = useAuth();
  const isFormateur = hasRole('FORMATEUR');
  const isDirector = hasRole('DIRECTEUR');

  const [modules, setModules] = useState<ModuleCours[]>([]);
  const [evaluations, setEvaluations] = useState<FormateurEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [step, setStep] = useState<Step>('module');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [scratchFile, setScratchFile] = useState<File | null>(null);
  const [analyse, setAnalyse] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [modRes, evalRes] = await Promise.all([
          moduleCoursService.list(),
          formateurEvaluationService.list(),
        ]);
        const active = (modRes.data || []).filter((m) => m.actif).slice(0, 4);
        setModules(active);
        setEvaluations(evalRes.data || []);
      } catch {
        toast.error('Impossible de charger les données.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const selectedModule = useMemo(
    () => modules.find((m) => m.id === Number(selectedModuleId)),
    [modules, selectedModuleId],
  );

  const questions = useMemo(
    () => (selectedModule ? quizForModuleOrder(selectedModule.numeroOrdre) : []),
    [selectedModule],
  );

  const quizScore = useMemo(() => {
    if (!questions.length) return 0;
    return questions.reduce((acc, q) => (answers[q.id] === q.correctIndex ? acc + 1 : acc), 0);
  }, [questions, answers]);

  const resetFlow = () => {
    setStep('module');
    setSelectedModuleId('');
    setAnswers({});
    setScratchFile(null);
    setAnalyse('');
  };

  const handleSubmit = async () => {
    if (!selectedModule) return;
    if (!analyse.trim()) {
      toast.error('Rédigez votre analyse pédagogique.');
      return;
    }
    setSaving(true);
    try {
      const data = new FormData();
      data.append('moduleCoursId', String(selectedModule.id));
      data.append('quizScore', String(quizScore));
      data.append('quizTotal', String(questions.length));
      data.append('quizReponses', JSON.stringify(answers));
      data.append('analyse', analyse.trim());
      if (scratchFile) data.append('scratchFile', scratchFile);

      await formateurEvaluationService.submit(data);
      toast.success('Évaluation enregistrée.');
      const evalRes = await formateurEvaluationService.list();
      setEvaluations(evalRes.data || []);
      setStep('done');
    } catch {
      toast.error('Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoadingSkeleton cardCount={3} />;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Évaluation formateur</h1>
        <p className="text-slate-500 mt-1">
          {isFormateur
            ? 'Choisissez l\'un des 4 modules SKA, répondez au quiz, déposez votre projet Scratch (.sb3) et rédigez votre analyse.'
            : 'Consultation des évaluations pédagogiques soumises par les formateurs.'}
        </p>
      </div>

      {isFormateur && step !== 'done' && (
        <div className="card border border-slate-200 space-y-5">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <span className={step === 'module' ? 'text-primary-700' : ''}>1. Module</span>
            <span>→</span>
            <span className={step === 'quiz' ? 'text-primary-700' : ''}>2. Quiz</span>
            <span>→</span>
            <span className={step === 'scratch' ? 'text-primary-700' : ''}>3. Projet & analyse</span>
          </div>

          {step === 'module' && (
            <div className="space-y-3">
              <label className="label">Module SKA (1 parmi 4) *</label>
              <select
                className="input-field"
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
              >
                <option value="">Sélectionner…</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.numeroOrdre} — {m.titre}
                  </option>
                ))}
              </select>
              {modules.length === 0 && (
                <p className="text-xs text-amber-700">Le Directeur doit publier les 4 modules dans « Supports de cours ».</p>
              )}
              <button
                type="button"
                className="btn-primary"
                disabled={!selectedModuleId}
                onClick={() => setStep('quiz')}
              >
                Continuer vers le quiz
              </button>
            </div>
          )}

          {step === 'quiz' && selectedModule && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Quiz — <strong>{selectedModule.titre}</strong> ({questions.length} questions)
              </p>
              {questions.map((q, idx) => (
                <fieldset key={q.id} className="rounded-lg border border-slate-200 p-3">
                  <legend className="text-sm font-semibold text-slate-800 px-1">
                    {idx + 1}. {q.question}
                  </legend>
                  <div className="mt-2 space-y-1.5">
                    {q.options.map((opt, optIdx) => (
                      <label key={opt} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === optIdx}
                          onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              <div className="flex gap-2">
                <button type="button" className="btn-ghost" onClick={() => setStep('module')}>Retour</button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={Object.keys(answers).length < questions.length}
                  onClick={() => setStep('scratch')}
                >
                  Score actuel : {quizScore}/{questions.length} — Continuer
                </button>
              </div>
            </div>
          )}

          {step === 'scratch' && selectedModule && (
            <div className="space-y-4">
              <div>
                <label className="label flex items-center gap-2">
                  <FileCode2 className="w-4 h-4" /> Projet Scratch (.sb3)
                </label>
                <input
                  type="file"
                  accept=".sb3"
                  className="input-field"
                  onChange={(e) => setScratchFile(e.target.files?.[0] || null)}
                />
              </div>
              <div>
                <label className="label">Analyse pédagogique *</label>
                <textarea
                  rows={5}
                  className="input-field"
                  placeholder="Décrivez ce que vous avez réalisé, les difficultés et ce que les élèves apprendront…"
                  value={analyse}
                  onChange={(e) => setAnalyse(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost" onClick={() => setStep('quiz')}>Retour</button>
                <button type="button" className="btn-primary" disabled={saving} onClick={handleSubmit}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Enregistrer l&apos;évaluation
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isFormateur && step === 'done' && (
        <div className="card border border-emerald-200 bg-emerald-50 text-center py-10">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <p className="font-semibold text-emerald-900">Évaluation enregistrée avec succès.</p>
          <button type="button" className="btn-primary mt-4" onClick={resetFlow}>
            Nouvelle évaluation
          </button>
        </div>
      )}

      <section className="card border border-slate-200">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <ClipboardList className="w-4 h-4" />
          {isDirector ? 'Évaluations reçues' : 'Mes évaluations'}
        </h2>
        {evaluations.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune évaluation pour le moment.</p>
        ) : (
          <ul className="space-y-3">
            {evaluations.map((ev) => (
              <li key={ev.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                <p className="font-semibold text-slate-900">{ev.moduleTitre || `Module #${ev.moduleCoursId}`}</p>
                {isDirector && (
                  <p className="text-slate-600">
                    {formatFullName(ev.formateurPrenom, ev.formateurNom)}
                  </p>
                )}
                <p className="text-slate-500 mt-1">
                  Quiz : {ev.quizScore}/{ev.quizTotal}
                  {ev.scratchNom ? ` · Projet : ${ev.scratchNom}` : ''}
                </p>
                {ev.analyse && <p className="text-slate-600 mt-2 whitespace-pre-wrap">{ev.analyse}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
