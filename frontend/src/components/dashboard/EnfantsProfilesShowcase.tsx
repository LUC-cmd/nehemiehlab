import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Filter, Sparkles, UserCircle2 } from 'lucide-react';
import { centreService, contentManagementService } from '../../services/api';
import type { Centre, EnfantProfilePublic } from '../../types';
import { mediaUrl } from '../../utils/media';
import { useAuth } from '../../context/AuthContext';

interface Props {
  /** Nombre max de cartes affichées */
  limit?: number;
  /** Afficher les filtres région/cluster/centre */
  showFilters?: boolean;
  title?: string;
  subtitle?: string;
  /** Variante visuelle pour dashboards sombres */
  variant?: 'dark' | 'light';
}

export default function EnfantsProfilesShowcase({
  limit = 8,
  showFilters = true,
  title = 'Profils des enfants',
  subtitle = 'Photos, centres et projets réalisés',
  variant = 'dark',
}: Props) {
  const { hasRole } = useAuth();
  const isDirecteur = hasRole('DIRECTEUR');
  const [profiles, setProfiles] = useState<EnfantProfilePublic[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [region, setRegion] = useState('');
  const [cluster, setCluster] = useState('');
  const [centreId, setCentreId] = useState('');

  useEffect(() => {
    contentManagementService.getEnfants()
      .then((r) => setProfiles(r.data || []))
      .catch(() => setProfiles([]));
    const loadCentres = isDirecteur ? centreService.getAll() : centreService.getMesCentres();
    loadCentres.then((r) => setCentres(r.data || [])).catch(() => setCentres([]));
  }, [isDirecteur]);

  const regions = useMemo(
    () => Array.from(new Set(centres.map((c) => c.region).filter(Boolean))) as string[],
    [centres],
  );
  const clusters = useMemo(() => {
    const source = region ? centres.filter((c) => c.region === region) : centres;
    return Array.from(new Set(source.map((c) => c.cluster).filter(Boolean))) as string[];
  }, [centres, region]);
  const filteredCentres = useMemo(
    () =>
      centres.filter((c) => {
        if (region && c.region !== region) return false;
        if (cluster && c.cluster !== cluster) return false;
        return true;
      }),
    [centres, region, cluster],
  );

  const filtered = useMemo(() => {
    return profiles
      .filter((p) => p.actif !== false)
      .filter((p) => {
        if (region) {
          const matchRegion =
            p.region === region ||
            centres.some((c) => c.id === p.centreId && c.region === region) ||
            centres.some((c) => c.nom === p.centre && c.region === region);
          if (!matchRegion) return false;
        }
        if (cluster) {
          const matchCluster =
            p.cluster === cluster ||
            centres.some((c) => c.id === p.centreId && c.cluster === cluster) ||
            centres.some((c) => c.nom === p.centre && c.cluster === cluster);
          if (!matchCluster) return false;
        }
        if (centreId) {
          const id = Number(centreId);
          if (p.centreId !== id && !centres.some((c) => c.id === id && c.nom === p.centre)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''))
      .slice(0, limit);
  }, [profiles, region, cluster, centreId, centres, limit]);

  const dark = variant === 'dark';

  return (
    <section className={dark ? 'card border border-dark-700' : 'card border border-slate-200 bg-white'}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h3 className={`font-semibold flex items-center gap-2 ${dark ? 'text-white' : 'text-slate-900'}`}>
            <Sparkles className="w-4 h-4 text-[#5ED9FF]" />
            {title}
          </h3>
          <p className={`text-sm mt-1 ${dark ? 'text-dark-400' : 'text-slate-500'}`}>{subtitle}</p>
        </div>
        <Link
          to="/dashboard/profils-enfants"
          className={`inline-flex items-center gap-1 text-sm font-medium ${
            dark ? 'text-[#5ED9FF] hover:text-white' : 'text-[#004b57] hover:underline'
          }`}
        >
          Voir tout <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {showFilters && (
        <div className="grid sm:grid-cols-3 gap-2 mb-5">
          <label className="relative">
            <Filter className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${dark ? 'text-dark-400' : 'text-slate-400'}`} />
            <select
              className={`input-field pl-9 text-sm ${dark ? '' : 'bg-white'}`}
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setCluster('');
                setCentreId('');
              }}
            >
              <option value="">Toutes les régions</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <select
            className={`input-field text-sm ${dark ? '' : 'bg-white'}`}
            value={cluster}
            onChange={(e) => {
              setCluster(e.target.value);
              setCentreId('');
            }}
          >
            <option value="">Tous les clusters</option>
            {clusters.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            className={`input-field text-sm ${dark ? '' : 'bg-white'}`}
            value={centreId}
            onChange={(e) => setCentreId(e.target.value)}
          >
            <option value="">Tous les centres</option>
            {filteredCentres.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className={`text-sm ${dark ? 'text-dark-400' : 'text-slate-500'}`}>
          Aucun profil enfant pour ces filtres.{' '}
          <Link to="/dashboard/profils-enfants" className={dark ? 'text-[#5ED9FF]' : 'text-[#004b57]'}>
            Ajouter un profil
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to="/dashboard/profils-enfants"
                state={{ focusEnfantId: p.id }}
                className={`block rounded-2xl overflow-hidden border transition-all hover:-translate-y-0.5 ${
                  dark
                    ? 'border-dark-700 bg-dark-800/70 hover:border-[#5ED9FF]/40'
                    : 'border-slate-200 bg-slate-50 hover:border-[#004b57]/30 hover:shadow-md'
                }`}
              >
                <div className="aspect-square relative bg-gradient-to-br from-[#004b57]/30 to-[#004b57]/5">
                  {p.photoUrl ? (
                    <img src={mediaUrl(p.photoUrl)} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[#5ED9FF]/70">
                      <UserCircle2 className="w-12 h-12" />
                    </div>
                  )}
                  {(p.projets?.length || 0) > 0 && (
                    <span className="absolute bottom-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/55 text-white">
                      {p.projets.length} projet{p.projets.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className={`text-sm font-semibold truncate ${dark ? 'text-white' : 'text-slate-900'}`}>
                    {p.prenom} {p.nom}
                  </p>
                  <p className={`text-[11px] truncate ${dark ? 'text-dark-400' : 'text-slate-500'}`}>
                    {[p.age ? `${p.age} ans` : null, p.centre].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
