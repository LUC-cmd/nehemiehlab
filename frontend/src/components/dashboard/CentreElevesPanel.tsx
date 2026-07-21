import React, { useEffect, useMemo, useState } from 'react';
import { Users, GraduationCap, Search } from 'lucide-react';
import { eleveService } from '../../services/api';
import type { Centre, Eleve } from '../../types';
import { centreLabel } from '../../utils/centreLabel';
import { compareEleveNomPrenom } from '../../utils/eleveSort';
import { formatFullName } from '../../utils/displayName';

interface Props {
  /** Centres accessibles à l'utilisateur (mes centres pour un formateur, tous les centres pour un directeur/coordinateur) */
  centres: Centre[];
  title?: string;
  subtitle?: string;
}

/**
 * Panneau "Élèves par centre" : sélection d'un centre, affichage du nombre
 * total d'élèves inscrits, et liste complète classée de A à Z (Nom puis
 * Prénom), regroupée par lettre à la manière d'un carnet d'adresses.
 */
export default function CentreElevesPanel({
  centres,
  title = 'Élèves par centre',
  subtitle = 'Sélectionnez un centre pour voir l’effectif complet, classé de A à Z.',
}: Props) {
  const [centreId, setCentreId] = useState<string>('');
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (centres.length === 0) {
      setCentreId('');
      return;
    }
    setCentreId((prev) => (prev && centres.some((c) => String(c.id) === prev) ? prev : String(centres[0].id)));
  }, [centres]);

  useEffect(() => {
    if (!centreId) {
      setEleves([]);
      return;
    }
    setLoading(true);
    eleveService
      .getByCentre(Number(centreId))
      .then((r) => setEleves((r.data || []).slice().sort(compareEleveNomPrenom)))
      .catch(() => setEleves([]))
      .finally(() => setLoading(false));
  }, [centreId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eleves;
    return eleves.filter(
      (e) =>
        `${e.nom} ${e.prenom}`.toLowerCase().includes(q) ||
        (e.matricule || '').toLowerCase().includes(q) ||
        (e.classe || '').toLowerCase().includes(q),
    );
  }, [eleves, search]);

  const groups = useMemo(() => {
    const map = new Map<string, Eleve[]>();
    filtered.forEach((e) => {
      const letter = (e.nom || '?').trim().charAt(0).toUpperCase() || '?';
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(e);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'fr'));
  }, [filtered]);

  const selectedCentre = centres.find((c) => String(c.id) === centreId);

  return (
    <section className="card border border-dark-700">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#5ED9FF]" />
            {title}
          </h3>
          <p className="text-sm text-dark-400 mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-emerald-400 text-sm font-semibold whitespace-nowrap">
          <Users className="w-4 h-4" />
          {loading ? '…' : eleves.length} élève{eleves.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {centres.length > 1 ? (
          <select
            className="input-field text-sm sm:w-64"
            value={centreId}
            onChange={(e) => setCentreId(e.target.value)}
          >
            {centres.map((c) => (
              <option key={c.id} value={c.id}>
                {centreLabel(c)}
              </option>
            ))}
          </select>
        ) : selectedCentre ? (
          <span className="text-sm text-white font-medium py-2">{centreLabel(selectedCentre)}</span>
        ) : null}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-400" />
          <input
            type="text"
            placeholder="Rechercher un élève (nom, matricule, classe)..."
            className="input-field pl-9 text-sm w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-block h-10 rounded-lg" />
          ))}
        </div>
      ) : centres.length === 0 ? (
        <p className="text-sm text-dark-400">Aucun centre à afficher.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-dark-400">Aucun élève {search ? 'pour cette recherche.' : 'inscrit dans ce centre.'}</p>
      ) : (
        <div className="max-h-[420px] overflow-y-auto pr-1 -mr-1 space-y-4">
          {groups.map(([letter, group]) => (
            <div key={letter}>
              <div className="sticky top-0 z-10 -mx-1 px-1 py-1 bg-dark-900/90 backdrop-blur-sm text-xs font-bold text-[#5ED9FF] uppercase tracking-wide">
                {letter}
              </div>
              <div className="divide-y divide-dark-800">
                {group.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 py-2.5 px-1">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{formatFullName(e.prenom, e.nom)}</p>
                      <p className="text-xs text-dark-400 mt-0.5 truncate">
                        {e.classe}
                        {e.matricule ? ` · ${e.matricule}` : ''}
                        {e.sexe ? ` · ${e.sexe === 'F' ? 'Fille' : 'Garçon'}` : ''}
                      </p>
                    </div>
                    {e.age != null && <span className="text-xs text-dark-400 whitespace-nowrap">{e.age} ans</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
