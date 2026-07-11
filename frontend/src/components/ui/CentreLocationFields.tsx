import React, { useEffect, useState } from 'react';
import { ExternalLink, Link2, Loader2, MapPin, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import {
  formatCoords,
  getCurrentPositionAsync,
  googleMapsViewUrl,
  parseLocationInput,
  type LatLng,
} from '../../utils/geo';
import type { Role } from '../../types';
import { requiresOnSiteGpsCapture } from '../../utils/centreGeo';
import CentreLocationGuide from './CentreLocationGuide';

interface CentreLocationFieldsProps {
  /** Mode création (état local) ou édition */
  value: { latitude: string; longitude: string; mapsLink: string };
  onChange: (next: { latitude: string; longitude: string; mapsLink: string }) => void;
  centreName?: string;
  compact?: boolean;
  /** À la création : GPS non obligatoire */
  optional?: boolean;
  /** Rôle de la personne qui fixe le point (message sur place) */
  userRole?: Role | null;
}

/**
 * Bloc localisation : optionnel à la création.
 * Lien Google Maps OU position sur place — une fois fixé, toute l’équipe s’y rend.
 */
export function CentreLocationFields({
  value,
  onChange,
  centreName,
  compact = false,
  optional = false,
  userRole = null,
}: CentreLocationFieldsProps) {
  const [detecting, setDetecting] = useState(false);
  const onSiteRequired = requiresOnSiteGpsCapture(userRole);
  const lat = value.latitude ? Number(value.latitude) : NaN;
  const lng = value.longitude ? Number(value.longitude) : NaN;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  const applyParsed = (raw: string) => {
    const parsed = parseLocationInput(raw);
    if (!parsed) {
      toast.error(
        'Lien non reconnu. Collez un lien Google Maps avec des coordonnées, ou le format 6.13, 1.22',
      );
      return false;
    }
    onChange({
      latitude: String(parsed.latitude),
      longitude: String(parsed.longitude),
      mapsLink: raw.trim(),
    });
    toast.success('Localisation extraite du lien.');
    return true;
  };

  const handleTakeMyLocation = async () => {
    setDetecting(true);
    try {
      const pos = await getCurrentPositionAsync();
      onChange({
        latitude: String(pos.latitude),
        longitude: String(pos.longitude),
        mapsLink: googleMapsViewUrl(pos.latitude, pos.longitude, centreName),
      });
      toast.success(
        onSiteRequired
          ? 'Position du centre enregistrée — partagée avec toute l’équipe.'
          : 'Position prise — le centre sera repérable sur Maps.',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Position indisponible.');
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50/80 ${compact ? 'p-3 space-y-3' : 'p-4 space-y-4'}`}>
      <div>
        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#004b57]" />
          Localisation du centre
          {optional && (
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
              Optionnel
            </span>
          )}
        </p>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          {optional
            ? 'Vous pouvez créer le centre sans GPS. Sur le terrain, le Coordinateur, le Formateur ou le Directeur fixera le point partagé.'
            : onSiteRequired
              ? 'Vous devez être au centre pour enregistrer la position. Elle sera partagée avec Directeur, Coordinateur, Formateurs et toute l’équipe liée.'
              : 'Collez un lien Google Maps ou prenez la position sur place. Une fois enregistrée, toute l’équipe pourra s’y rendre.'}
        </p>
      </div>

      {onSiteRequired && !optional && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 leading-relaxed">
          <strong>Important :</strong> placez-vous au centre avant d’utiliser le bouton ci-dessous.
          Cette position sera la référence pour tout le monde.
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={handleTakeMyLocation}
          disabled={detecting}
          className={`flex-1 justify-center text-sm py-2.5 inline-flex items-center gap-2 ${
            onSiteRequired && !optional
              ? 'btn-primary'
              : 'btn-ghost border border-slate-200 bg-white'
          }`}
        >
          {detecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
          {detecting
            ? 'Détection…'
            : onSiteRequired && !optional
              ? 'Je suis au centre — prendre la position'
              : 'Prendre ma localisation'}
        </button>

        {hasCoords && (
          <a
            href={googleMapsViewUrl(lat, lng, centreName)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost flex-1 justify-center border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm py-2.5 hover:bg-emerald-100 inline-flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Voir sur Google Maps
          </a>
        )}
      </div>

      {(!onSiteRequired || optional) && (
        <div>
          <label className="label">Ou coller un lien Google Maps</label>
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="url"
              inputMode="url"
              placeholder="https://maps.google.com/... ou 6.1319, 1.2228"
              className="input-field pl-10"
              value={value.mapsLink}
              onChange={(e) => onChange({ ...value, mapsLink: e.target.value })}
              onBlur={() => {
                if (value.mapsLink.trim()) applyParsed(value.mapsLink);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (value.mapsLink.trim()) applyParsed(value.mapsLink);
                }
              }}
            />
          </div>
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-[#004b57] hover:underline"
            onClick={() => value.mapsLink.trim() && applyParsed(value.mapsLink)}
          >
            Extraire la position du lien
          </button>
        </div>
      )}

      {hasCoords ? (
        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          Position prête : <strong>{formatCoords(lat, lng)}</strong> — partagée avec toute l’équipe liée au centre.
        </p>
      ) : (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          {optional
            ? 'Pas de GPS pour l’instant — un rappel apparaîtra sur le terrain.'
            : onSiteRequired
              ? 'Rendez-vous au centre, puis utilisez le bouton « Je suis au centre ».'
              : 'Ajoutez un lien Maps ou prenez la position sur place.'}
        </p>
      )}
    </div>
  );
}

interface EditLocationModalProps {
  open: boolean;
  centreName: string;
  initial?: LatLng | null;
  saving?: boolean;
  userRole?: Role | null;
  onClose: () => void;
  onSave: (coords: LatLng) => Promise<void> | void;
}

/** Modale : fixer la localisation partagée d’un centre */
export function EditCentreLocationModal({
  open,
  centreName,
  initial,
  saving = false,
  userRole = null,
  onClose,
  onSave,
}: EditLocationModalProps) {
  const [fields, setFields] = useState({
    latitude: '',
    longitude: '',
    mapsLink: '',
  });

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setFields({
        latitude: String(initial.latitude),
        longitude: String(initial.longitude),
        mapsLink: googleMapsViewUrl(initial.latitude, initial.longitude, centreName),
      });
    } else {
      setFields({ latitude: '', longitude: '', mapsLink: '' });
    }
  }, [open, initial, centreName]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = Number(fields.latitude);
    const lng = Number(fields.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.error('Définissez d’abord une localisation (lien ou position).');
      return;
    }
    await onSave({ latitude: lat, longitude: lng });
  };

  return (
    <Modal
      open={open}
      title={initial ? 'Mettre à jour la localisation' : 'Localisation du centre'}
      subtitle={`${centreName} — point GPS partagé`}
      size="md"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost w-full sm:w-auto justify-center">
            Annuler
          </button>
          <button type="submit" form="edit-centre-location-form" disabled={saving} className="btn-primary w-full sm:w-auto justify-center">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Partager avec toute l’équipe
          </button>
        </>
      }
    >
      <form id="edit-centre-location-form" onSubmit={handleSubmit} className="space-y-3">
        <CentreLocationGuide role={userRole} compact />
        <CentreLocationFields
          value={fields}
          onChange={setFields}
          centreName={centreName}
          compact
          userRole={userRole}
        />
      </form>
    </Modal>
  );
}
