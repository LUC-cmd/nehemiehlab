import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight, ExternalLink, Loader2, MapPin, Navigation, Route,
  Building2, CheckCircle2, AlertCircle, Play,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Centre, SessionCours } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { centreService } from '../../services/api';
import GeoMapPanel from '../ui/GeoMapPanel';
import { EditCentreLocationModal } from '../ui/CentreLocationFields';
import { MissingLocationBanner } from '../ui/LocationReminder';
import {
  canEditCentreLocation,
  centresGeoSummary,
  hasCentreGps,
  locationSetButtonLabel,
} from '../../utils/centreGeo';
import CentreLocationGuide from '../ui/CentreLocationGuide';
import {
  formatDistanceKm,
  getCurrentPositionAsync,
  googleMapsDirectionsUrl,
  googleMapsViewUrl,
  haversineDistanceKm,
  readStoredPosition,
  storePosition,
  type LatLng,
} from '../../utils/geo';

export interface LocalisationDashboardSectionProps {
  centres: Centre[];
  centresHref: string;
  title?: string;
  subtitle?: string;
  sessions?: SessionCours[];
  showSessionsOnMap?: boolean;
  mapHeightClassName?: string;
  loading?: boolean;
  onCentresRefresh?: () => void;
  /** Bouton « Démarrer une séance » sur chaque centre (formateur connecté) */
  enableSessionStart?: boolean;
}

export default function LocalisationDashboardSection({
  centres,
  centresHref,
  title = 'Carte & localisation',
  subtitle = 'Visualisez vos centres, fixez le GPS et lancez un itinéraire.',
  sessions = [],
  showSessionsOnMap = false,
  mapHeightClassName = 'h-[360px]',
  loading = false,
  onCentresRefresh,
  enableSessionStart = false,
}: LocalisationDashboardSectionProps) {
  const { role, user } = useAuth();
  const { hasFeature } = useAccess();
  const navigate = useNavigate();

  const [regionFilter, setRegionFilter] = useState('');
  const [focusCentre, setFocusCentre] = useState<Centre | null>(null);
  const [currentPos, setCurrentPos] = useState<LatLng | null>(() => readStoredPosition());
  const [locating, setLocating] = useState(false);
  const [locationCentre, setLocationCentre] = useState<Centre | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);
  const [localCentres, setLocalCentres] = useState<Centre[]>(centres);

  useEffect(() => {
    setLocalCentres(centres);
  }, [centres]);

  const summary = useMemo(() => centresGeoSummary(localCentres), [localCentres]);

  const editableWithoutGps = useMemo(
    () =>
      localCentres.filter(
        (c) =>
          !hasCentreGps(c) &&
          canEditCentreLocation(c, {
            role,
            userId: user?.id,
            assignedCluster: user?.assignedCluster,
            hasFeature: hasFeature('edit_centre_location'),
          }),
      ),
    [localCentres, role, user?.id, hasFeature],
  );

  const filteredCentres = useMemo(() => {
    let list = [...localCentres];
    if (regionFilter) {
      list = list.filter((c) => c.region === regionFilter);
    }
    return list.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }, [localCentres, regionFilter]);

  const mapCentres = regionFilter ? filteredCentres : localCentres;

  const liveSession = useMemo(
    () => sessions.find((s) => s.statut === 'EN_COURS') ?? null,
    [sessions],
  );

  const detectMyLocation = async (silent = false) => {
    setLocating(true);
    try {
      const pos = await getCurrentPositionAsync();
      setCurrentPos(pos);
      storePosition(pos);
      if (!silent) toast.success('Votre position est affichée sur la carte.');
      return pos;
    } catch (err) {
      if (!silent) {
        toast.error(err instanceof Error ? err.message : 'Position indisponible.');
      }
      return null;
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    if (currentPos) return;
    let cancelled = false;
    (async () => {
      const pos = await detectMyLocation(true);
      if (!cancelled && pos) setCurrentPos(pos);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveCentreLocation = async (coords: LatLng) => {
    if (!locationCentre) return;
    setSavingLocation(true);
    try {
      await centreService.updateLocalisationCourante(locationCentre.id, coords);
      const updated = { ...locationCentre, latitude: coords.latitude, longitude: coords.longitude };
      setLocalCentres((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setFocusCentre((prev) => (prev?.id === updated.id ? updated : prev));
      toast.success('Localisation partagée — toute l’équipe peut maintenant s’y rendre.');
      setLocationCentre(null);
      onCentresRefresh?.();
    } catch {
      toast.error('Impossible d’enregistrer la localisation.');
    } finally {
      setSavingLocation(false);
    }
  };

  const openRoute = async (centre: Centre, mode: 'walking' | 'driving') => {
    if (!hasCentreGps(centre)) {
      toast.error('Ce centre n’a pas encore de point GPS.');
      if (
        canEditCentreLocation(centre, {
          role,
          userId: user?.id,
          assignedCluster: user?.assignedCluster,
          hasFeature: hasFeature('edit_centre_location'),
        })
      ) {
        setLocationCentre(centre);
      }
      return;
    }
    let origin = currentPos;
    if (!origin) {
      origin = await detectMyLocation(true);
    }
    const url = googleMapsDirectionsUrl(
      { latitude: centre.latitude!, longitude: centre.longitude! },
      origin,
      mode,
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const centreDistance = (centre: Centre): string | null => {
    if (!currentPos || !hasCentreGps(centre)) return null;
    const km = haversineDistanceKm(
      currentPos.latitude,
      currentPos.longitude,
      centre.latitude!,
      centre.longitude!,
    );
    return formatDistanceKm(km);
  };

  if (loading) {
    return (
      <section className="card border border-dark-700 animate-pulse">
        <div className="h-6 w-48 bg-dark-700 rounded mb-4" />
        <div className="h-[360px] bg-dark-800 rounded-xl" />
      </section>
    );
  }

  if (localCentres.length === 0) {
    return (
      <section className="card border border-dark-700">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-400">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-semibold">{title}</h3>
            <p className="text-sm text-dark-400 mt-1">Aucun centre associé pour le moment.</p>
            <Link to={centresHref} className="inline-flex items-center gap-1 text-sm text-[#5ED9FF] mt-3">
              Gérer les centres <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-white font-semibold inline-flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#5ED9FF]" />
            {title}
          </h3>
          <p className="text-sm text-dark-400 mt-1">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => detectMyLocation(false)}
            disabled={locating}
            className="btn-ghost text-sm py-2 border border-dark-600"
          >
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            Ma position
          </button>
          <Link to={centresHref} className="btn-secondary text-sm py-2">
            Voir tout <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Centres', value: summary.total, icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Avec GPS', value: summary.withGps, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Sans GPS', value: summary.withoutGps, icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Régions', value: summary.regions, icon: MapPin, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-xl border px-3 py-3 ${kpi.bg}`}>
            <kpi.icon className={`w-4 h-4 ${kpi.color} mb-2`} />
            <p className="text-xl font-bold text-white">{kpi.value}</p>
            <p className="text-[11px] text-dark-400">{kpi.label}</p>
          </div>
        ))}
      </div>

      {editableWithoutGps.length > 0 && (
        <MissingLocationBanner
          count={editableWithoutGps.length}
          onOpenFirst={() => setLocationCentre(editableWithoutGps[0])}
        />
      )}

      <CentreLocationGuide role={role} compact variant="dark" />

      {summary.regionList.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setRegionFilter('');
              setFocusCentre(null);
            }}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              !regionFilter
                ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                : 'border-dark-600 text-dark-400 hover:border-dark-500'
            }`}
          >
            Toutes les régions
          </button>
          {summary.regionList.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRegionFilter(r);
                setFocusCentre(null);
              }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                regionFilter === r
                  ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                  : 'border-dark-600 text-dark-400 hover:border-dark-500'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      <div className="grid xl:grid-cols-[minmax(0,1fr),minmax(280px,340px)] gap-4 items-start">
        <GeoMapPanel
          centres={mapCentres}
          sessions={showSessionsOnMap ? sessions : []}
          currentPosition={currentPos}
          focusCentre={focusCentre}
          liveSession={showSessionsOnMap ? liveSession : null}
          title="Carte interactive"
          subtitle={
            focusCentre
              ? `${focusCentre.nom} — itinéraire et repère GPS`
              : regionFilter
                ? `Centres de la région ${regionFilter}`
                : 'Cliquez un centre dans la liste pour le mettre en avant.'
          }
          heightClassName={mapHeightClassName}
          focusKey={`${regionFilter}-${focusCentre?.id ?? 'all'}`}
          showSessionLegend={showSessionsOnMap}
          showRouteToFocus={Boolean(focusCentre && currentPos)}
        />

        <div className="card border border-dark-700 p-0 overflow-hidden flex flex-col max-h-[460px]">
          <div className="px-4 py-3 border-b border-dark-700 bg-dark-800/40">
            <p className="text-sm font-semibold text-white">Centres</p>
            <p className="text-xs text-dark-400 mt-0.5">
              {filteredCentres.length} centre{filteredCentres.length > 1 ? 's' : ''}
              {regionFilter ? ` · ${regionFilter}` : ''}
            </p>
          </div>
          <ul className="overflow-y-auto flex-1 divide-y divide-dark-700/80">
            {filteredCentres.map((centre) => {
              const hasGps = hasCentreGps(centre);
              const canEdit = canEditCentreLocation(centre, {
                role,
                userId: user?.id,
                assignedCluster: user?.assignedCluster,
                hasFeature: hasFeature('edit_centre_location'),
              });
              const isFocused = focusCentre?.id === centre.id;
              const distance = centreDistance(centre);

              return (
                <li
                  key={centre.id}
                  className={`px-4 py-3 transition-colors ${
                    isFocused ? 'bg-primary-500/10' : 'hover:bg-dark-800/50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setFocusCentre(isFocused ? null : centre)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{centre.nom}</p>
                        <p className="text-xs text-dark-400 truncate mt-0.5">
                          {[centre.ville, centre.region].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      {hasGps ? (
                        <span className="shrink-0 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                          GPS
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                          À fixer
                        </span>
                      )}
                    </div>
                    {distance && (
                      <p className="text-[11px] text-[#5ED9FF] mt-1 inline-flex items-center gap-1">
                        <Route className="w-3 h-3" /> {distance}
                      </p>
                    )}
                  </button>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {hasGps && (
                      <>
                        <button
                          type="button"
                          onClick={() => openRoute(centre, 'driving')}
                          className="text-[11px] font-medium text-[#5ED9FF] hover:underline inline-flex items-center gap-1"
                        >
                          <Navigation className="w-3 h-3" /> Y aller
                        </button>
                        <a
                          href={googleMapsViewUrl(centre.latitude!, centre.longitude!, centre.nom)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-medium text-dark-300 hover:text-white inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> Maps
                        </a>
                      </>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setLocationCentre(centre)}
                        className="text-[11px] font-medium text-amber-400 hover:underline inline-flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3" />
                        {locationSetButtonLabel(role, hasGps)}
                      </button>
                    )}
                    {enableSessionStart && role === 'FORMATEUR' && (
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/sessions?centreId=${centre.id}&action=new`)}
                        className="text-[11px] font-medium text-emerald-400 hover:underline inline-flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        Démarrer séance
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <EditCentreLocationModal
        open={Boolean(locationCentre)}
        centreName={locationCentre?.nom || ''}
        userRole={role}
        initial={
          locationCentre && hasCentreGps(locationCentre)
            ? { latitude: locationCentre.latitude!, longitude: locationCentre.longitude! }
            : null
        }
        saving={savingLocation}
        onClose={() => setLocationCentre(null)}
        onSave={saveCentreLocation}
      />
    </motion.section>
  );
}
