import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { centreService, userService } from '../../services/api';
import type { Centre, User } from '../../types';
import {
  Plus, X, Building2, UserPlus, Trash2, MapPin, Navigation, ExternalLink, Pencil,
  Download, Upload, Phone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageLoadingSkeleton } from '../../components/ui/DashboardSkeletons';
import { useMinDelayLoading } from '../../hooks/useMinDelayLoading';
import GeoMapPanel from '../../components/ui/GeoMapPanel';
import UserAvatar from '../../components/ui/UserAvatar';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import {
  CentreLocationFields,
  EditCentreLocationModal,
} from '../../components/ui/CentreLocationFields';
import CentreLocationGuide from '../../components/ui/CentreLocationGuide';
import { locationSetButtonLabel } from '../../utils/centreGeo';
import {
  LocationReminderModal,
  MissingLocationBanner,
} from '../../components/ui/LocationReminder';
import {
  formatCoords,
  getCurrentPositionAsync,
  googleMapsDirectionsUrl,
  googleMapsViewUrl,
  type LatLng,
} from '../../utils/geo';
import { cleanPhoneInput } from '../../utils/formInputs';

const emptyLocation = { latitude: '', longitude: '', mapsLink: '' };
const emptyCentreForm = {
  nom: '',
  adresse: '',
  ville: '',
  region: '',
  cluster: '',
  telephoneResponsable: '',
  telephoneCoordinateur: '',
  telephoneFormateur: '',
  ...emptyLocation,
};

function hasCentreGps(centre: Centre) {
  return (
    typeof centre.latitude === 'number' &&
    typeof centre.longitude === 'number' &&
    Number.isFinite(centre.latitude) &&
    Number.isFinite(centre.longitude)
  );
}

export default function CentresPage() {
  const { hasRole, user, role } = useAuth();
  const { hasFeature } = useAccess();
  const [centres, setCentres] = useState<Centre[]>([]);
  const [formateurs, setFormateurs] = useState<User[]>([]);
  const [coordinateurs, setCoordinateurs] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCentre, setNewCentre] = useState(emptyCentreForm);
  const [currentPos, setCurrentPos] = useState<LatLng | null>(() => {
    try {
      const raw = sessionStorage.getItem('ska_my_position');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LatLng;
      if (Number.isFinite(parsed?.latitude) && Number.isFinite(parsed?.longitude)) return parsed;
    } catch {
      /* ignore */
    }
    return null;
  });
  const [locating, setLocating] = useState(false);
  const [regionFilter, setRegionFilter] = useState('');
  const [clusterFilter, setClusterFilter] = useState('');
  const [formateurFilter, setFormateurFilter] = useState('');
  const [centreFilter, setCentreFilter] = useState('');
  const [sortBy, setSortBy] = useState<'nom' | 'region' | 'cluster' | 'formateur'>('nom');
  const [mapFocusCentre, setMapFocusCentre] = useState<Centre | null>(null);

  const [selectedCentre, setSelectedCentre] = useState<Centre | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignFormateurId, setAssignFormateurId] = useState('');
  const [assignCoordinateurId, setAssignCoordinateurId] = useState('');
  const [contactsCentre, setContactsCentre] = useState<Centre | null>(null);
  const [contactsForm, setContactsForm] = useState({
    telephoneResponsable: '',
    coordinateurNom: '',
    coordinateurPrenom: '',
    telephoneCoordinateur: '',
    telephoneFormateur: '',
  });
  const [savingContacts, setSavingContacts] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const [locationCentre, setLocationCentre] = useState<Centre | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);
  const [showLocationReminder, setShowLocationReminder] = useState(false);
  const [reminderShownForLoad, setReminderShownForLoad] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<
    | { type: 'delete-centre'; centreId: number; centreName: string }
    | {
        type: 'remove-formateur';
        centreId: number;
        formateurId: number;
        formateurName: string;
      }
    | null
  >(null);
  const skeletonLoading = useMinDelayLoading(loading, 220);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const isDirecteur = hasRole('DIRECTEUR');
      const centresRes = isDirecteur
        ? await centreService.getAll()
        : await centreService.getMesCentres();
      setCentres(centresRes.data);

      if (isDirecteur) {
        const [formateursRes, coordRes] = await Promise.all([
          userService.getFormateurs(),
          userService.getCoordinateurs(),
        ]);
        setFormateurs(formateursRes.data);
        setCoordinateurs(coordRes.data);
      }
    } catch {
      toast.error('Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  };

  const canEditCentreLocation = (centre: Centre) => {
    if (!hasFeature('edit_centre_location')) return false;
    if (hasRole('DIRECTEUR')) return true;
    if (!user) return false;
    if (hasRole('COORDINATEUR') && centre.coordinateur?.id === user.id) {
      return true;
    }
    if (hasRole('RESPONSABLE_CLUSTER') && centre.cluster && centre.cluster === user.assignedCluster) {
      return true;
    }
    if (hasRole('FORMATEUR') && centre.formateurs?.some((f) => f.id === user.id)) {
      return true;
    }
    return false;
  };

  const centresWithoutGps = useMemo(
    () => centres.filter((c) => !hasCentreGps(c) && canEditCentreLocation(c)),
    // canEdit depends on user/role stable for the session
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [centres, user?.id],
  );

  // À chaque visite de la page : rappel si un centre touchable n'a pas de GPS
  useEffect(() => {
    if (loading || reminderShownForLoad) return;
    if (centresWithoutGps.length === 0) return;
    setShowLocationReminder(true);
    setReminderShownForLoad(true);
  }, [loading, centresWithoutGps, reminderShownForLoad]);

  const handleAddCentre = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const lat = newCentre.latitude ? Number(newCentre.latitude) : undefined;
      const lng = newCentre.longitude ? Number(newCentre.longitude) : undefined;
      const hasGps = Number.isFinite(lat) && Number.isFinite(lng);
      await centreService.create({
        nom: newCentre.nom,
        adresse: newCentre.adresse,
        ville: newCentre.ville,
        region: newCentre.region,
        cluster: newCentre.cluster || undefined,
        telephoneResponsable: cleanPhoneInput(newCentre.telephoneResponsable) || undefined,
        telephoneCoordinateur: cleanPhoneInput(newCentre.telephoneCoordinateur) || undefined,
        telephoneFormateur: cleanPhoneInput(newCentre.telephoneFormateur) || undefined,
        latitude: hasGps ? lat : undefined,
        longitude: hasGps ? lng : undefined,
      });
      if (hasGps) {
        toast.success('Centre créé — localisation partagée avec l’équipe.');
      } else {
        toast.success(
          'Centre créé. La localisation GPS pourra être ajoutée plus tard (rappel à chaque visite).',
          { duration: 6000 },
        );
      }
      setShowAddModal(false);
      setNewCentre(emptyCentreForm);
      setReminderShownForLoad(false);
      fetchData();
    } catch {
      toast.error('Erreur lors de la création du centre.');
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const response = await centreService.exportExcel();
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ska_centres_eleves.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Export Excel téléchargé.');
    } catch {
      toast.error('Impossible d’exporter les centres.');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportingExcel(true);
    try {
      const response = await centreService.importExcel(file);
      const data = response.data as { message?: string; warnings?: string[] };
      toast.success(data.message || 'Import Excel terminé.');
      if (data.warnings?.length) {
        toast(`${data.warnings.length} avertissement(s) — détails dans la console.`, {
          icon: '⚠️',
        });
        console.warn('Import Excel warnings:', data.warnings);
      }
      await fetchData();
    } catch {
      toast.error('Impossible d’importer ce fichier Excel.');
    } finally {
      setImportingExcel(false);
      event.target.value = '';
    }
  };

  const openContactsModal = (centre: Centre) => {
    setContactsCentre(centre);
    setContactsForm({
      telephoneResponsable: centre.telephoneResponsable || '',
      coordinateurNom: centre.coordinateurNom || centre.coordinateur?.nom || '',
      coordinateurPrenom: centre.coordinateurPrenom || centre.coordinateur?.prenom || '',
      telephoneCoordinateur: centre.telephoneCoordinateur || centre.coordinateur?.telephone || '',
      telephoneFormateur: centre.telephoneFormateur || centre.formateurs?.[0]?.telephone || '',
    });
  };

  const handleSaveContacts = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!contactsCentre) return;
    setSavingContacts(true);
    try {
      await centreService.update(contactsCentre.id, {
        nom: contactsCentre.nom,
        adresse: contactsCentre.adresse,
        ville: contactsCentre.ville,
        region: contactsCentre.region,
        cluster: contactsCentre.cluster,
        latitude: contactsCentre.latitude,
        longitude: contactsCentre.longitude,
        telephoneResponsable: cleanPhoneInput(contactsForm.telephoneResponsable),
        coordinateurNom: contactsForm.coordinateurNom.trim(),
        coordinateurPrenom: contactsForm.coordinateurPrenom.trim(),
        telephoneCoordinateur: cleanPhoneInput(contactsForm.telephoneCoordinateur),
        telephoneFormateur: cleanPhoneInput(contactsForm.telephoneFormateur),
      });
      toast.success('Contacts du centre enregistrés.');
      setContactsCentre(null);
      await fetchData();
    } catch {
      toast.error('Impossible d’enregistrer les contacts.');
    } finally {
      setSavingContacts(false);
    }
  };

  const coordinateurLabel = (centre: Centre) => {
    const prenom = centre.coordinateurPrenom || centre.coordinateur?.prenom || '';
    const nom = centre.coordinateurNom || centre.coordinateur?.nom || '';
    const full = `${prenom} ${nom}`.trim();
    return full || null;
  };

  const detectMyLocation = async (silent = false) => {
    setLocating(true);
    try {
      const pos = await getCurrentPositionAsync();
      setCurrentPos(pos);
      try {
        sessionStorage.setItem('ska_my_position', JSON.stringify(pos));
      } catch {
        /* ignore */
      }
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

  // Formateur / Directeur : proposer la position dès l’arrivée sur la page
  useEffect(() => {
    if (currentPos) return;
    let cancelled = false;
    (async () => {
      const pos = await getCurrentPositionAsync().catch(() => null);
      if (!cancelled && pos) {
        setCurrentPos(pos);
        try {
          sessionStorage.setItem('ska_my_position', JSON.stringify(pos));
        } catch {
          /* ignore */
        }
      }
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
      toast.success(
        'Localisation enregistrée — l’équipe peut maintenant s’y rendre via Google Maps.',
        { duration: 5000 },
      );
      setLocationCentre(null);
      setShowLocationReminder(false);
      setMapFocusCentre((prev) => (prev?.id === locationCentre.id ? { ...locationCentre, ...coords } : prev));
      fetchData();
    } catch {
      toast.error('Impossible d’enregistrer la localisation.');
    } finally {
      setSavingLocation(false);
    }
  };

  const toRad = (n: number) => (n * Math.PI) / 180;
  const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
    const R = 6371;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const aa =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return R * c;
  };

  const openRoute = async (centre: Centre, mode: 'walking' | 'driving') => {
    if (!hasCentreGps(centre)) {
      toast.error('Ce centre n’a pas encore de localisation GPS.');
      if (canEditCentreLocation(centre)) setLocationCentre(centre);
      return;
    }
    setMapFocusCentre(centre);
    let origin = currentPos;
    if (!origin) {
      toast('Récupération de votre position pour l’itinéraire…', { icon: '📍' });
      origin = await detectMyLocation(true);
    }
    const url = googleMapsDirectionsUrl(
      { latitude: centre.latitude!, longitude: centre.longitude! },
      origin,
      mode,
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openOnMaps = (centre: Centre) => {
    if (!hasCentreGps(centre)) return;
    setMapFocusCentre(centre);
    window.open(
      googleMapsViewUrl(centre.latitude!, centre.longitude!, centre.nom),
      '_blank',
      'noopener,noreferrer',
    );
  };

  const handleDeleteCentre = async (id: number) => {
    try {
      await centreService.delete(id);
      toast.success('Centre supprimé.');
      fetchData();
    } catch {
      toast.error('Erreur lors de la suppression.');
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCentre) return;
    try {
      if (assignFormateurId) {
        await centreService.assignerFormateur(selectedCentre.id, Number(assignFormateurId));
        toast.success('Formateur assigné.');
      }
      if (assignCoordinateurId) {
        await centreService.assignerCoordinateur(selectedCentre.id, Number(assignCoordinateurId));
        toast.success('Coordinateur assigné.');
      }
      setShowAssignModal(false);
      setAssignFormateurId('');
      setAssignCoordinateurId('');
      fetchData();
    } catch {
      toast.error('Erreur lors des affectations.');
    }
  };

  const handleRemoveFormateur = async (centreId: number, formateurId: number) => {
    try {
      await centreService.retirerFormateur(centreId, formateurId);
      toast.success('Formateur retiré.');
      fetchData();
    } catch {
      toast.error('Erreur lors du retrait.');
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingConfirmation) return;
    const confirmation = pendingConfirmation;
    setPendingConfirmation(null);
    if (confirmation.type === 'delete-centre') {
      await handleDeleteCentre(confirmation.centreId);
      return;
    }
    await handleRemoveFormateur(confirmation.centreId, confirmation.formateurId);
  };

  const isDir = hasRole('DIRECTEUR');

  const regionOptions = useMemo(() => {
    const fromData = centres.map((c) => c.region).filter(Boolean) as string[];
    return Array.from(new Set([...fromData, 'Maritime', 'Plateaux', 'Centrale', 'Kara', 'Savanes']))
      .sort((a, b) => a.localeCompare(b, 'fr'));
  }, [centres]);

  const clusterOptions = useMemo(() => {
    const values = centres.map((c) => c.cluster).filter(Boolean) as string[];
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [centres]);

  const formateurOptions = useMemo(() => {
    const map = new Map<number, User>();
    centres.forEach((c) => c.formateurs?.forEach((f) => map.set(f.id, f)));
    formateurs.forEach((f) => map.set(f.id, f));
    return Array.from(map.values()).sort((a, b) =>
      `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`, 'fr'),
    );
  }, [centres, formateurs]);

  const centreOptions = useMemo(
    () => [...centres].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
    [centres],
  );

  const filteredCentres = useMemo(() => {
    const list = centres.filter((c) => {
      if (regionFilter && c.region !== regionFilter) return false;
      if (clusterFilter && (c.cluster || '') !== clusterFilter) return false;
      if (centreFilter && String(c.id) !== centreFilter) return false;
      if (formateurFilter) {
        const fid = Number(formateurFilter);
        if (!c.formateurs?.some((f) => f.id === fid)) return false;
      }
      return true;
    });

    const formateurLabel = (c: Centre) => {
      const f = c.formateurs?.[0];
      return f ? `${f.prenom} ${f.nom}` : '';
    };

    return [...list].sort((a, b) => {
      if (sortBy === 'region') {
        return (a.region || '').localeCompare(b.region || '', 'fr') || a.nom.localeCompare(b.nom, 'fr');
      }
      if (sortBy === 'cluster') {
        return (a.cluster || '').localeCompare(b.cluster || '', 'fr') || a.nom.localeCompare(b.nom, 'fr');
      }
      if (sortBy === 'formateur') {
        return formateurLabel(a).localeCompare(formateurLabel(b), 'fr') || a.nom.localeCompare(b.nom, 'fr');
      }
      return a.nom.localeCompare(b.nom, 'fr');
    });
  }, [centres, regionFilter, clusterFilter, centreFilter, formateurFilter, sortBy]);

  const hasActiveFilters = Boolean(regionFilter || clusterFilter || centreFilter || formateurFilter);

  const clearFilters = () => {
    setRegionFilter('');
    setClusterFilter('');
    setCentreFilter('');
    setFormateurFilter('');
  };

  if (skeletonLoading) {
    return <PageLoadingSkeleton cardCount={6} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isDir ? 'Centres de formation' : 'Mes Centres'}
          </h1>
          <p className="text-slate-500 mt-1">
            {isDir
              ? 'Filtrez et triez par région, cluster, formateur ou centre. Fixez le GPS pour l’équipe.'
              : 'Votre centre, votre position, et l’itinéraire Google Maps pour vous y rendre.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => detectMyLocation(false)}
            className="btn-ghost py-2 text-sm"
            disabled={locating}
          >
            <Navigation className="w-4 h-4" />
            {locating ? 'Localisation…' : 'Ma position'}
          </button>
          {isDir && (
            <>
              <button
                type="button"
                onClick={handleExportExcel}
                className="btn-ghost py-2 text-sm border border-slate-200"
                disabled={exportingExcel}
              >
                <Download className="w-4 h-4" />
                {exportingExcel ? 'Export…' : 'Exporter Excel'}
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportExcel}
              />
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="btn-ghost py-2 text-sm border border-slate-200"
                disabled={importingExcel}
              >
                <Upload className="w-4 h-4" />
                {importingExcel ? 'Import…' : 'Importer Excel'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="py-2 px-4 rounded-xl text-sm font-semibold bg-white text-slate-900 border-2 border-white hover:bg-slate-50 shadow-md inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nouveau centre
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">
            Filtres & tri
            <span className="ml-2 font-normal text-slate-500">
              ({filteredCentres.length}/{centres.length})
            </span>
          </p>
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters} className="text-xs font-semibold text-primary-700 hover:underline">
              Réinitialiser
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="label">Région</label>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="input-field py-2"
            >
              <option value="">Toutes</option>
              {regionOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Cluster</label>
            <select
              value={clusterFilter}
              onChange={(e) => setClusterFilter(e.target.value)}
              className="input-field py-2"
            >
              <option value="">Tous</option>
              {clusterOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Formateur</label>
            <select
              value={formateurFilter}
              onChange={(e) => {
                const fid = e.target.value;
                setFormateurFilter(fid);
                if (!fid) {
                  setCentreFilter('');
                  return;
                }
                const matching = centres.filter((c) =>
                  c.formateurs?.some((f) => f.id === Number(fid)),
                );
                setCentreFilter(matching.length === 1 ? String(matching[0].id) : '');
              }}
              className="input-field py-2"
            >
              <option value="">Tous</option>
              {formateurOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.prenom} {f.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Centre</label>
            <select
              value={centreFilter}
              onChange={(e) => setCentreFilter(e.target.value)}
              className="input-field py-2"
            >
              <option value="">Tous</option>
              {centreOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Trier par</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="input-field py-2"
            >
              <option value="nom">Centre (A→Z)</option>
              <option value="region">Région</option>
              <option value="cluster">Cluster</option>
              <option value="formateur">Formateur</option>
            </select>
          </div>
        </div>
      </div>

      <MissingLocationBanner
        count={centresWithoutGps.length}
        onOpenFirst={() => {
          if (centresWithoutGps[0]) setLocationCentre(centresWithoutGps[0]);
        }}
      />

      <CentreLocationGuide role={role} />

      {isDir ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1580px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Nom</th>
                <th className="px-4 py-3 font-semibold">Région</th>
                <th className="px-4 py-3 font-semibold">Cluster</th>
                <th className="px-4 py-3 font-semibold">Ville</th>
                <th className="px-4 py-3 font-semibold">Coordinateur</th>
                <th className="px-4 py-3 font-semibold">Formateur</th>
                <th className="px-4 py-3 font-semibold">Tel responsable</th>
                <th className="px-4 py-3 font-semibold">Tel coordinateur</th>
                <th className="px-4 py-3 font-semibold">Tel formateur</th>
                <th className="px-4 py-3 font-semibold">GPS</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCentres.map((centre) => {
                const hasGps = hasCentreGps(centre);
                const formateur = centre.formateurs?.[0];
                return (
                  <tr
                    key={centre.id}
                    className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                      mapFocusCentre?.id === centre.id ? 'bg-primary-50/60' : ''
                    }`}
                    onClick={() => setMapFocusCentre(centre)}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">{centre.nom}</td>
                    <td className="px-4 py-3 text-slate-600">{centre.region || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{centre.cluster || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{centre.ville || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {coordinateurLabel(centre) || (
                        <span className="italic text-slate-400">Non renseigné</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formateur ? (
                        <span className="inline-flex items-center gap-2">
                          <span>{formateur.prenom} {formateur.nom}</span>
                          <button
                            type="button"
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            aria-label={`Retirer ${formateur.prenom} ${formateur.nom}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingConfirmation({
                                type: 'remove-formateur',
                                centreId: centre.id,
                                formateurId: formateur.id,
                                formateurName: `${formateur.prenom} ${formateur.nom}`,
                              });
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ) : (
                        <span className="italic text-slate-400">Aucun</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {centre.telephoneResponsable || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {centre.telephoneCoordinateur || centre.coordinateur?.telephone || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {centre.telephoneFormateur || formateur?.telephone || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          hasGps
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                        title={
                          hasGps
                            ? formatCoords(centre.latitude!, centre.longitude!)
                            : 'Localisation manquante'
                        }
                      >
                        {hasGps ? 'Défini' : 'Manquant'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="btn-ghost px-2.5 py-1.5 text-xs"
                          onClick={() => openContactsModal(centre)}
                        >
                          <Phone className="h-3.5 w-3.5" />
                          Contacts
                        </button>
                        <button
                          type="button"
                          className="btn-ghost px-2.5 py-1.5 text-xs"
                          onClick={() => {
                            setSelectedCentre(centre);
                            setAssignFormateurId('');
                            setAssignCoordinateurId('');
                            setShowAssignModal(true);
                          }}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Assigner
                        </button>
                        <button
                          type="button"
                          className="btn-ghost px-2.5 py-1.5 text-xs text-primary-800"
                          onClick={() => setLocationCentre(centre)}
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          {hasGps ? 'Modifier le GPS' : 'Définir le GPS'}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label={`Supprimer ${centre.nom}`}
                          onClick={() =>
                            setPendingConfirmation({
                              type: 'delete-centre',
                              centreId: centre.id,
                              centreName: centre.nom,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCentres.map((centre) => {
          const hasGps = hasCentreGps(centre);
          const canEdit = canEditCentreLocation(centre);

          return (
            <div
              key={centre.id}
              role="button"
              tabIndex={0}
              onClick={() => setMapFocusCentre(centre)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setMapFocusCentre(centre);
                }
              }}
              className={`card border bg-white hover:border-slate-300 transition-all flex flex-col justify-between cursor-pointer ${
                mapFocusCentre?.id === centre.id
                  ? 'border-[#F44F00] ring-2 ring-[#F44F00]/20'
                  : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-primary-50 border border-primary-200 text-primary-700">
                    <Building2 className="w-6 h-6" />
                  </div>
                  {isDir && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingConfirmation({
                          type: 'delete-centre',
                          centreId: centre.id,
                          centreName: centre.nom,
                        });
                      }}
                      className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-1">{centre.nom}</h3>
                {centre.region && (
                  <span className="inline-block px-2 py-0.5 mb-2 text-xs font-medium bg-slate-100 border border-slate-200 rounded-lg text-primary-700">
                    Région {centre.region}
                  </span>
                )}
                <p className="text-slate-500 text-sm flex items-center gap-1 mb-3">
                  <MapPin className="w-3.5 h-3.5" />
                  {centre.adresse}, {centre.ville}
                </p>

                {hasGps ? (
                  <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
                    <p className="text-xs font-semibold text-emerald-800">Point GPS partagé</p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      {formatCoords(centre.latitude!, centre.longitude!)}
                    </p>
                    <p className="text-[11px] text-emerald-600/90 mt-1">
                      Ouvrez l’itinéraire pour vous y rendre depuis votre position.
                    </p>
                    {currentPos && (
                      <p className="text-xs text-primary-700 mt-1">
                        À{' '}
                        {distanceKm(
                          currentPos.latitude,
                          currentPos.longitude,
                          centre.latitude!,
                          centre.longitude!,
                        ).toFixed(2)}{' '}
                        km de vous
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => canEdit && setLocationCentre(centre)}
                    className="w-full text-left text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-3 hover:bg-amber-100/80 transition-colors"
                  >
                    <span className="font-semibold">Localisation manquante</span>
                    <span className="block mt-0.5 text-amber-700 leading-relaxed">
                      {canEdit
                        ? 'Cliquez pour coller un lien Maps ou prendre la position sur place — ensuite toute l’équipe pourra y aller.'
                        : 'En attente qu’un Directeur, Coordinateur ou Formateur fixe le point GPS.'}
                    </span>
                  </button>
                )}

                <div className="flex flex-wrap gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
                  {hasGps && (
                    <>
                      <button
                        type="button"
                        onClick={() => openOnMaps(centre)}
                        className="btn-ghost text-xs py-1.5 px-2.5 border border-slate-200"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Voir sur Maps
                      </button>
                      <button
                        type="button"
                        onClick={() => openRoute(centre, 'walking')}
                        className="btn-ghost text-xs py-1.5 px-2.5 border border-emerald-200 bg-emerald-50 text-emerald-800"
                      >
                        Y aller à pied
                      </button>
                      <button
                        type="button"
                        onClick={() => openRoute(centre, 'driving')}
                        className="btn-ghost text-xs py-1.5 px-2.5 border border-emerald-200 bg-emerald-50 text-emerald-800"
                      >
                        Y aller (voiture / moto)
                      </button>
                    </>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      className="btn-ghost text-xs py-1.5 px-2.5 border border-primary-200 bg-primary-50 text-primary-800"
                      onClick={() => setLocationCentre(centre)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {locationSetButtonLabel(role, hasGps)}
                    </button>
                  )}
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Coordinateur
                    </span>
                    {coordinateurLabel(centre) ? (
                      <div className="mt-1">
                        <div className="flex items-center gap-2">
                          {centre.coordinateur ? (
                            <UserAvatar user={centre.coordinateur} size="xs" />
                          ) : null}
                          <p className="text-sm text-slate-800">{coordinateurLabel(centre)}</p>
                        </div>
                        {centre.telephoneCoordinateur && (
                          <a
                            href={`tel:${centre.telephoneCoordinateur}`}
                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone className="h-3 w-3" />
                            {centre.telephoneCoordinateur}
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 mt-0.5">Non renseigné</p>
                    )}
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Formateur
                    </span>
                    {centre.formateurs && centre.formateurs.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {centre.formateurs.slice(0, 1).map((f) => (
                          <span
                            key={f.id}
                            className="inline-flex flex-wrap items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700"
                          >
                            <UserAvatar user={f} size="xs" className="!w-5 !h-5 !text-[8px]" />
                            {f.prenom} {f.nom}
                            {(centre.telephoneFormateur || f.telephone) && (
                              <a
                                href={`tel:${centre.telephoneFormateur || f.telephone}`}
                                className="inline-flex items-center gap-1 font-medium text-primary-700 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone className="h-3 w-3" />
                                {centre.telephoneFormateur || f.telephone}
                              </a>
                            )}
                            {isDir && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveFormateur(centre.id, f.id);
                                }}
                                className="text-slate-400 hover:text-red-500 ml-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 mt-0.5 italic">Aucun formateur (max. 1)</p>
                    )}
                  </div>
                  {centre.telephoneResponsable && (
                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Contact centre
                      </span>
                      <a
                        href={`tel:${centre.telephoneResponsable}`}
                        className="mt-1 flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {centre.telephoneResponsable}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {isDir && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCentre(centre);
                    setShowAssignModal(true);
                  }}
                  className="btn-ghost w-full justify-center mt-4 border border-slate-200"
                >
                  <UserPlus className="w-4 h-4" />
                  Assigner
                </button>
              )}
            </div>
          );
        })}
      </div>
      )}

      <GeoMapPanel
        centres={filteredCentres}
        currentPosition={currentPos}
        focusCentre={mapFocusCentre}
        focusKey={`centre-${mapFocusCentre?.id ?? 'all'}-${regionFilter}-${currentPos ? 'pos' : 'nopos'}`}
        showSessionLegend={false}
        showRouteToFocus
        title="Carte des centres"
        subtitle={
          currentPos
            ? 'Votre position (bleu) et le centre sélectionné — utilisez « Y aller » pour l’itinéraire.'
            : 'Sélectionnez un centre, activez « Ma position », puis « Y aller » pour l’itinéraire.'
        }
      />

      <Modal
        open={showAddModal}
        title="Nouveau centre"
        size="lg"
        onClose={() => setShowAddModal(false)}
        footer={
          <>
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-ghost w-full sm:w-auto justify-center">
              Annuler
            </button>
            <button type="submit" form="create-centre-form" className="btn-primary w-full sm:w-auto justify-center">
              Créer le centre
            </button>
          </>
        }
      >
        <form id="create-centre-form" onSubmit={handleAddCentre} className="space-y-3 sm:space-y-4">
          <div>
            <label className="label">Nom du centre</label>
            <input
              type="text"
              required
              placeholder="Ex: Centre de Lomé"
              className="input-field"
              value={newCentre.nom}
              onChange={(e) => setNewCentre({ ...newCentre, nom: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Adresse</label>
            <input
              type="text"
              required
              placeholder="Ex: Quartier Adidogomé"
              className="input-field"
              value={newCentre.adresse}
              onChange={(e) => setNewCentre({ ...newCentre, adresse: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="label">Ville</label>
              <input
                type="text"
                required
                placeholder="Ex: Lomé"
                className="input-field"
                value={newCentre.ville}
                onChange={(e) => setNewCentre({ ...newCentre, ville: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Région du Togo</label>
              <select
                className="input-field"
                required
                value={newCentre.region}
                onChange={(e) => setNewCentre({ ...newCentre, region: e.target.value })}
              >
                <option value="">Sélectionner une région...</option>
                <option value="Maritime">Maritime</option>
                <option value="Plateaux">Plateaux</option>
                <option value="Centrale">Centrale</option>
                <option value="Kara">Kara</option>
                <option value="Savanes">Savanes</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Cluster (optionnel)</label>
            <input
              type="text"
              placeholder="Ex: Cluster Lomé Ouest"
              className="input-field"
              value={newCentre.cluster}
              onChange={(e) => setNewCentre({ ...newCentre, cluster: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Numéro du centre *</label>
            <input
              type="tel"
              inputMode="numeric"
              required
              placeholder="Ex: 99099509"
              className="input-field"
              value={newCentre.telephoneResponsable}
              onChange={(e) => setNewCentre({
                ...newCentre,
                telephoneResponsable: cleanPhoneInput(e.target.value),
              })}
            />
            <p className="mt-1 text-xs text-slate-400">
              Le numéro du formateur n'est pas demandé ici : il est renseigné à la création de son compte et suit
              automatiquement le formateur affecté au centre.
            </p>
          </div>

          <CentreLocationFields
            value={{
              latitude: newCentre.latitude,
              longitude: newCentre.longitude,
              mapsLink: newCentre.mapsLink,
            }}
            onChange={(loc) => setNewCentre({ ...newCentre, ...loc })}
            centreName={newCentre.nom || 'Nouveau centre'}
            compact
            optional
            userRole={role}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(showAssignModal && selectedCentre)}
        title={selectedCentre ? `Assigner à ${selectedCentre.nom}` : 'Assigner'}
        size="md"
        onClose={() => setShowAssignModal(false)}
        footer={
          <>
            <button type="button" onClick={() => setShowAssignModal(false)} className="btn-ghost w-full sm:w-auto justify-center">
              Annuler
            </button>
            <button type="submit" form="assign-centre-form" className="btn-primary w-full sm:w-auto justify-center">
              Enregistrer
            </button>
          </>
        }
      >
        <form id="assign-centre-form" onSubmit={handleAssign} className="space-y-3 sm:space-y-4">
          <div>
            <label className="label">Coordinateur du centre</label>
            <select
              className="input-field"
              value={assignCoordinateurId}
              onChange={(e) => setAssignCoordinateurId(e.target.value)}
            >
              <option value="">Sélectionner un coordinateur...</option>
              {coordinateurs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.prenom} {c.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Formateur du centre (1 par centre, plusieurs centres possibles)</label>
            {selectedCentre?.formateurs?.length ? (
              <p className="mb-2 text-xs text-amber-700">
                Ce centre a déjà un formateur. Retirez-le avant d’en assigner un autre.
              </p>
            ) : null}
            <select
              className="input-field"
              value={assignFormateurId}
              onChange={(e) => setAssignFormateurId(e.target.value)}
              disabled={Boolean(selectedCentre?.formateurs?.length)}
            >
              <option value="">Sélectionner un formateur...</option>
              {formateurs.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.prenom} {f.nom}
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(contactsCentre)}
        title={contactsCentre ? `Contacts — ${contactsCentre.nom}` : 'Contacts du centre'}
        size="md"
        onClose={() => setContactsCentre(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setContactsCentre(null)}
              className="btn-ghost w-full sm:w-auto justify-center"
              disabled={savingContacts}
            >
              Annuler
            </button>
            <button
              type="submit"
              form="centre-contacts-form"
              className="btn-primary w-full sm:w-auto justify-center"
              disabled={savingContacts}
            >
              {savingContacts ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </>
        }
      >
        <form id="centre-contacts-form" onSubmit={handleSaveContacts} className="space-y-4">
          <p className="text-xs text-slate-500 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
            Le coordinateur est enregistré comme contact du centre (nom + téléphone), sans créer de compte.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Prénom coordinateur</label>
              <input
                className="input-field"
                value={contactsForm.coordinateurPrenom}
                onChange={(e) => setContactsForm({ ...contactsForm, coordinateurPrenom: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Nom coordinateur</label>
              <input
                className="input-field"
                value={contactsForm.coordinateurNom}
                onChange={(e) => setContactsForm({ ...contactsForm, coordinateurNom: e.target.value })}
              />
            </div>
          </div>
          {([
            ['telephoneResponsable', 'Téléphone du responsable'],
            ['telephoneCoordinateur', 'Téléphone du coordinateur'],
            ['telephoneFormateur', 'Téléphone du formateur'],
          ] as const).map(([field, label]) => (
            <div key={field}>
              <label className="label">{label}</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  inputMode="numeric"
                  className="input-field pl-10"
                  placeholder="Numéro de téléphone"
                  value={contactsForm[field]}
                  onChange={(e) => setContactsForm({
                    ...contactsForm,
                    [field]: cleanPhoneInput(e.target.value),
                  })}
                />
              </div>
            </div>
          ))}
        </form>
      </Modal>

      <LocationReminderModal
        open={showLocationReminder && !locationCentre}
        centres={centresWithoutGps}
        onClose={() => setShowLocationReminder(false)}
        onDefine={(c) => {
          setShowLocationReminder(false);
          setLocationCentre(c);
        }}
      />

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

      <ConfirmDialog
        open={Boolean(pendingConfirmation)}
        title={
          pendingConfirmation?.type === 'delete-centre'
            ? 'Supprimer le centre'
            : 'Retirer le formateur'
        }
        message={
          pendingConfirmation?.type === 'delete-centre'
            ? `Voulez-vous vraiment supprimer le centre « ${pendingConfirmation.centreName} » ?`
            : pendingConfirmation?.type === 'remove-formateur'
              ? `Voulez-vous retirer ${pendingConfirmation.formateurName} de ce centre ?`
              : ''
        }
        confirmLabel={
          pendingConfirmation?.type === 'delete-centre' ? 'Supprimer' : 'Retirer'
        }
        danger
        onConfirm={handleConfirmAction}
        onCancel={() => setPendingConfirmation(null)}
      />
    </div>
  );
}
