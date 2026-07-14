import React, { useMemo, useState } from 'react';
import { User, GraduationCap, Building2, CheckCircle2 } from 'lucide-react';
import type { Centre } from '../../types';
import { cleanNameInput, FIRSTNAME_EXAMPLE, NAME_EXAMPLE } from '../../utils/formInputs';
import {
  AGE_MAX,
  AGE_MIN,
  CLASSE_PRESETS,
  computeAgeFromDate,
  type EleveFicheValues,
} from '../../utils/eleveForm';

type Props = {
  formId: string;
  values: EleveFicheValues;
  onChange: (values: EleveFicheValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  centres: Centre[];
  showCentreSelect?: boolean;
  mode?: 'create' | 'edit';
};

export default function EleveFicheForm({
  formId,
  values,
  onChange,
  onSubmit,
  centres,
  showCentreSelect = false,
  mode = 'create',
}: Props) {
  const [step, setStep] = useState(0);
  const steps = useMemo(() => {
    const base = [
      { id: 'identite', label: 'Identité', icon: User },
      { id: 'scolarite', label: 'Scolarité', icon: GraduationCap },
    ];
    if (showCentreSelect && centres.length > 1) {
      base.push({ id: 'centre', label: 'Centre', icon: Building2 });
    }
    return base;
  }, [showCentreSelect, centres.length]);

  const patch = (partial: Partial<EleveFicheValues>) => onChange({ ...values, ...partial });

  const ageFromDate = computeAgeFromDate(values.dateNaissance);
  const ageNum = ageFromDate ?? Number(values.age);
  const ageOk = values.dateNaissance !== '' && ageFromDate !== null && ageFromDate >= AGE_MIN && ageFromDate <= AGE_MAX;
  const step0Ok = values.nom.trim().length >= 2 && values.prenom.trim().length >= 2;
  const step1Ok = ageOk && values.classe.trim().length >= 1;
  const step2Ok = !showCentreSelect || centres.length <= 1 || Boolean(values.centreId);

  const canNext = step === 0 ? step0Ok : step === 1 ? step1Ok : step2Ok;
  const isLastStep = step >= steps.length - 1;

  const trySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!step0Ok || !step1Ok || !step2Ok) {
      if (!step0Ok) setStep(0);
      else if (!step1Ok) setStep(1);
      else setStep(steps.length - 1);
      return;
    }
    onSubmit(e);
  };

  return (
    <form id={formId} onSubmit={trySubmit} className="space-y-5">
      <div className="flex items-center gap-2">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const done = idx < step || (idx === 0 && step0Ok && step > 0) || (idx === 1 && step1Ok && step > 1);
          const active = idx === step;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(idx)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                active
                  ? 'border-primary-500 bg-primary-500/15 text-primary-300'
                  : done
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-dark-600 text-dark-500 hover:border-dark-500'
              }`}
            >
              {done && !active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>

      {step === 0 && (
        <div className="space-y-4 rounded-2xl border border-dark-700 bg-dark-900/40 p-4">
          <p className="text-sm text-dark-400">
            {mode === 'create'
              ? 'Saisissez le nom et le prénom tels qu’ils figurent sur les documents officiels.'
              : 'Corrigez l’identité de l’enfant si besoin.'}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Nom *</label>
              <input
                type="text"
                required
                autoFocus
                placeholder={`Ex: ${NAME_EXAMPLE}`}
                className="input-field"
                value={values.nom}
                onChange={(e) => patch({ nom: cleanNameInput(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Prénom *</label>
              <input
                type="text"
                required
                placeholder={`Ex: ${FIRSTNAME_EXAMPLE}`}
                className="input-field"
                value={values.prenom}
                onChange={(e) => patch({ prenom: cleanNameInput(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <label className="label">Sexe *</label>
            <div className="grid grid-cols-2 gap-2">
              {(['M', 'F'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => patch({ sexe: s })}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                    values.sexe === s
                      ? 'border-primary-500 bg-primary-500/20 text-primary-200'
                      : 'border-dark-600 text-dark-400 hover:border-dark-500'
                  }`}
                >
                  {s === 'M' ? 'Garçon' : 'Fille'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4 rounded-2xl border border-dark-700 bg-dark-900/40 p-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Date de naissance *</label>
              <input
                type="date"
                required
                max={new Date().toISOString().split('T')[0]}
                className="input-field"
                value={values.dateNaissance}
                onChange={(e) => {
                  const dn = e.target.value;
                  const age = computeAgeFromDate(dn);
                  patch({ dateNaissance: dn, age: age !== null ? String(age) : '' });
                }}
              />
              {values.dateNaissance !== '' && (
                <p className={`mt-1 text-xs font-semibold ${ageOk ? 'text-primary-300' : 'text-red-400'}`}>
                  {ageFromDate !== null
                    ? `Âge : ${ageFromDate} an${ageFromDate > 1 ? 's' : ''}${ageOk ? '' : ` (doit être entre ${AGE_MIN} et ${AGE_MAX} ans)`}`
                    : 'Date invalide'}
                </p>
              )}
            </div>
            <div>
              <label className="label">Date début formation *</label>
              <input
                type="date"
                required
                className="input-field"
                value={values.dateDebutFormation}
                onChange={(e) => patch({ dateDebutFormation: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Classe *</label>
            <input
              type="text"
              required
              placeholder="Ex: CM2, 3ème, Terminale D…"
              className="input-field mb-2"
              value={values.classe}
              onChange={(e) => patch({ classe: e.target.value })}
            />
            <div className="flex flex-wrap gap-1.5">
              {CLASSE_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => patch({ classe: c })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    values.classe === c
                      ? 'border-primary-500 bg-primary-500/20 text-primary-200'
                      : 'border-dark-600 text-dark-500 hover:border-dark-500'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && showCentreSelect && centres.length > 1 && (
        <div className="space-y-4 rounded-2xl border border-dark-700 bg-dark-900/40 p-4">
          <div>
            <label className="label">Centre de formation *</label>
            <select
              required
              className="input-field"
              value={values.centreId}
              onChange={(e) => patch({ centreId: e.target.value })}
            >
              <option value="">Choisir un centre…</option>
              {centres.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="flex justify-between gap-2 pt-1">
        {step > 0 ? (
          <button type="button" className="btn-ghost text-sm" onClick={() => setStep((s) => s - 1)}>
            Retour
          </button>
        ) : (
          <span />
        )}
        {!isLastStep ? (
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={!canNext}
            onClick={() => setStep((s) => Math.min(s + 1, steps.length - 1))}
          >
            Continuer
          </button>
        ) : (
          <p className="text-xs text-dark-500 self-center">
            Cliquez sur {mode === 'create' ? 'Inscrire' : 'Enregistrer'} pour valider.
          </p>
        )}
      </div>
    </form>
  );
}
