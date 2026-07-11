import React, { useEffect, useMemo, useState } from 'react';
import { Shield, Eye, Pencil, RotateCcw, Save, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { accessService } from '../../services/api';
import { useAccess } from '../../context/AccessContext';
import {
  CONFIGURABLE_ROLES,
  DEFAULT_FEATURES_BY_ROLE,
  FEATURE_CATALOG,
  LOCKED_FEATURES,
  ROLE_LABELS,
  type FeatureId,
} from '../../constants/roleAccess';
import type { Role } from '../../types';
import { PageLoadingSkeleton } from '../../components/ui/DashboardSkeletons';

type Matrix = Record<string, string[]>;

export default function PermissionsPage() {
  const { refresh } = useAccess();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>('COORDINATEUR');
  const [matrix, setMatrix] = useState<Matrix>({});
  const [locked, setLocked] = useState<Record<string, string[]>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await accessService.getMatrix();
        setMatrix(normalizeMatrix(data.matrix));
        setLocked(data.locked || LOCKED_FEATURES);
      } catch {
        const fallback: Matrix = {};
        (Object.keys(DEFAULT_FEATURES_BY_ROLE) as Role[]).forEach((r) => {
          fallback[r] = [...DEFAULT_FEATURES_BY_ROLE[r]];
        });
        setMatrix(fallback);
        setLocked(LOCKED_FEATURES);
        toast.error('Impossible de charger les permissions serveur — affichage des défauts.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const roleFeatures = useMemo(
    () => new Set(matrix[selectedRole] || []),
    [matrix, selectedRole],
  );

  const lockedForRole = useMemo(
    () => new Set(locked[selectedRole] || LOCKED_FEATURES[selectedRole] || []),
    [locked, selectedRole],
  );

  const toggle = (featureId: FeatureId) => {
    if (lockedForRole.has(featureId)) {
      toast('Cette option est obligatoire pour ce rôle.', { icon: '🔒' });
      return;
    }
    setMatrix((prev) => {
      const current = new Set(prev[selectedRole] || []);
      if (current.has(featureId)) current.delete(featureId);
      else current.add(featureId);
      // Toujours garder locked
      lockedForRole.forEach((f) => current.add(f));
      return { ...prev, [selectedRole]: Array.from(current) };
    });
  };

  const resetRole = () => {
    setMatrix((prev) => ({
      ...prev,
      [selectedRole]: [...(DEFAULT_FEATURES_BY_ROLE[selectedRole] || [])],
    }));
    toast.success(`Réinitialisé : ${ROLE_LABELS[selectedRole]}`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string[]> = {};
      Object.entries(matrix).forEach(([role, feats]) => {
        payload[role] = feats;
      });
      // Directeur toujours complet côté serveur
      payload.DIRECTEUR = [...DEFAULT_FEATURES_BY_ROLE.DIRECTEUR];
      const { data } = await accessService.saveMatrix(payload);
      setMatrix(normalizeMatrix(data.matrix));
      await refresh();
      toast.success(data.message || 'Permissions enregistrées.');
    } catch {
      toast.error('Erreur lors de l’enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoadingSkeleton cardCount={4} />;

  const voir = FEATURE_CATALOG.filter((f) => f.kind === 'voir' && f.id !== 'permissions' && f.id !== 'utilisateurs');
  const modifier = FEATURE_CATALOG.filter((f) => f.kind === 'modifier');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#004b57]" />
            Permissions des dashboards
          </h1>
          <p className="text-slate-500 mt-1 max-w-2xl">
            Activez ou désactivez ce que chaque rôle peut <strong>voir</strong> et{' '}
            <strong>modifier</strong>. Exemple : ajouter Sessions au Coordinateur, ou retirer
            Communauté à un rôle CEDJ.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button type="button" onClick={resetRole} className="btn-ghost">
            <RotateCcw className="w-4 h-4" />
            Réinitialiser ce rôle
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CONFIGURABLE_ROLES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setSelectedRole(r)}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              selectedRole === r
                ? 'bg-[#004b57] text-white border-[#004b57]'
                : 'bg-white text-slate-700 border-slate-200 hover:border-[#004b57]/40'
            }`}
          >
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      <div className="card border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{ROLE_LABELS[selectedRole]}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cochez les options visibles sur son dashboard. Les cadenas sont obligatoires.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            {roleFeatures.size} options actives
          </span>
        </div>

        <Section title="Ce qu’il peut voir" icon={<Eye className="w-4 h-4" />}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {voir.map((f) => (
              <FeatureToggle
                key={f.id}
                label={f.label}
                checked={roleFeatures.has(f.id)}
                locked={lockedForRole.has(f.id)}
                onToggle={() => toggle(f.id)}
              />
            ))}
          </div>
        </Section>

        <Section title="Ce qu’il peut modifier / faire" icon={<Pencil className="w-4 h-4" />} className="mt-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {modifier.map((f) => (
              <FeatureToggle
                key={f.id}
                label={f.label}
                checked={roleFeatures.has(f.id)}
                locked={lockedForRole.has(f.id)}
                onToggle={() => toggle(f.id)}
              />
            ))}
          </div>
        </Section>
      </div>

      <p className="text-xs text-slate-500">
        Les comptes concernés voient les changements au prochain chargement de page. Le Directeur
        et le Parent ont des droits de base non retirables.
      </p>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
  className = '',
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
        <span className="text-[#004b57]">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function FeatureToggle({
  label,
  checked,
  locked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  locked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-3 text-left rounded-xl border px-3 py-2.5 transition-colors ${
        checked
          ? 'border-emerald-200 bg-emerald-50/80'
          : 'border-slate-200 bg-slate-50/50 hover:bg-white'
      } ${locked ? 'opacity-90' : ''}`}
    >
      <span
        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 text-[11px] font-bold ${
          checked
            ? 'bg-emerald-600 border-emerald-600 text-white'
            : 'bg-white border-slate-300 text-transparent'
        }`}
      >
        ✓
      </span>
      <span className="text-sm text-slate-800 flex-1 min-w-0">{label}</span>
      {locked && <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
    </button>
  );
}

function normalizeMatrix(raw: Record<string, string[] | Set<string> | unknown>): Matrix {
  const out: Matrix = {};
  Object.entries(raw || {}).forEach(([role, feats]) => {
    if (Array.isArray(feats)) out[role] = feats.map(String);
    else if (feats && typeof feats === 'object') out[role] = Object.values(feats as object).map(String);
    else out[role] = [];
  });
  return out;
}
