import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, Circle, useMap } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import type { Centre, SessionCours } from '../../types';
import { centreLabel } from '../../utils/centreLabel';

const DEFAULT_CENTER: LatLngExpression = [8.6, 1.0]; // centre approximatif du Togo
const DEFAULT_ZOOM = 7;

type Props = {
  centres: Centre[];
  sessions?: SessionCours[];
  currentPosition?: { latitude: number; longitude: number } | null;
  /** Centre mis en avant (filtre actif) */
  focusCentre?: Centre | null;
  /** Session en cours = formateur sur le terrain */
  liveSession?: SessionCours | null;
  title?: string;
  subtitle?: string;
  heightClassName?: string;
  /** Clé pour forcer un re-zoom quand les filtres changent */
  focusKey?: string;
  /** Afficher la légende sessions (début/fin/terrain) — false sur page Centres */
  showSessionLegend?: boolean;
  /** Tracer une ligne entre ma position et le centre sélectionné */
  showRouteToFocus?: boolean;
};

const centreIcon = L.divIcon({
  className: 'geo-pin-centre',
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:#004b57;border:2px solid #fff;box-shadow:0 0 0 4px rgba(0,75,87,.25)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const focusCentreIcon = L.divIcon({
  className: 'geo-pin-focus',
  html: '<div style="width:18px;height:18px;border-radius:9999px;background:#F44F00;border:3px solid #fff;box-shadow:0 0 0 6px rgba(244,79,0,.28)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const sessionStartIcon = L.divIcon({
  className: 'geo-pin-start',
  html: '<div style="width:12px;height:12px;border-radius:9999px;background:#41c885;border:2px solid #fff;box-shadow:0 0 0 4px rgba(65,200,133,.2)"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const sessionEndIcon = L.divIcon({
  className: 'geo-pin-end',
  html: '<div style="width:12px;height:12px;border-radius:9999px;background:#5ED9FF;border:2px solid #fff;box-shadow:0 0 0 4px rgba(94,217,255,.2)"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const liveTeacherIcon = L.divIcon({
  className: 'geo-pin-live',
  html: '<div style="width:16px;height:16px;border-radius:9999px;background:#16a34a;border:3px solid #fff;box-shadow:0 0 0 6px rgba(22,163,74,.35);animation:pulse 1.5s ease infinite"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FitBounds({
  points,
  focusKey,
  singleZoom = 15,
}: {
  points: LatLngExpression[];
  focusKey?: string;
  singleZoom?: number;
}) {
  const map = useMap();
  React.useEffect(() => {
    if (points.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: true });
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], singleZoom, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(points as L.LatLngExpression[]);
    map.fitBounds(bounds.pad(0.35), { animate: true, maxZoom: 14 });
  }, [map, points, focusKey, singleZoom]);
  return null;
}

export default function GeoMapPanel({
  centres,
  sessions = [],
  currentPosition = null,
  focusCentre = null,
  liveSession = null,
  title = 'Carte de suivi',
  subtitle = 'Centres, positions de début/fin de sessions et présence sur le terrain.',
  heightClassName = 'h-[460px]',
  focusKey,
  showSessionLegend = true,
  showRouteToFocus = false,
}: Props) {
  const centresWithCoords = useMemo(
    () =>
      centres.filter(
        (c) =>
          typeof c.latitude === 'number' &&
          typeof c.longitude === 'number' &&
          Number.isFinite(c.latitude) &&
          Number.isFinite(c.longitude),
      ),
    [centres],
  );

  const points = useMemo(() => {
    const pts: LatLngExpression[] = [];
    if (focusCentre && typeof focusCentre.latitude === 'number' && typeof focusCentre.longitude === 'number') {
      pts.push([focusCentre.latitude, focusCentre.longitude]);
    } else {
      centresWithCoords.forEach((c) => pts.push([c.latitude as number, c.longitude as number]));
    }
    if (showSessionLegend) {
      sessions.forEach((s) => {
        if (typeof s.latitudeDebut === 'number' && typeof s.longitudeDebut === 'number') {
          pts.push([s.latitudeDebut, s.longitudeDebut]);
        }
        if (typeof s.latitudeFin === 'number' && typeof s.longitudeFin === 'number') {
          pts.push([s.latitudeFin, s.longitudeFin]);
        }
      });
      if (liveSession?.latitudeDebut != null && liveSession?.longitudeDebut != null) {
        pts.push([liveSession.latitudeDebut, liveSession.longitudeDebut]);
      }
    }
    if (currentPosition) {
      pts.push([currentPosition.latitude, currentPosition.longitude]);
    }
    return pts;
  }, [centresWithCoords, sessions, liveSession, currentPosition, focusCentre, showSessionLegend]);

  const singleZoom = focusCentre ? 15 : centresWithCoords.length <= 3 ? 12 : 9;

  const routeLine =
    showRouteToFocus &&
    currentPosition &&
    focusCentre &&
    typeof focusCentre.latitude === 'number' &&
    typeof focusCentre.longitude === 'number'
      ? ([
          [currentPosition.latitude, currentPosition.longitude],
          [focusCentre.latitude, focusCentre.longitude],
        ] as LatLngExpression[])
      : null;

  return (
    <div className="card border border-slate-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-[#004b57]/08 via-white to-[#F44F00]/05">
        <h3 className="text-slate-900 font-semibold">{title}</h3>
        <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>
      </div>
      <div className={`relative ${heightClassName}`}>
        <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="w-full h-full z-0">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={points} focusKey={focusKey} singleZoom={singleZoom} />

          {centresWithCoords.map((c) => {
            const isFocus = focusCentre?.id === c.id;
            return (
              <React.Fragment key={`centre-${c.id}`}>
                {isFocus && (
                  <Circle
                    center={[c.latitude as number, c.longitude as number]}
                    radius={180}
                    pathOptions={{ color: '#F44F00', fillColor: '#F44F00', fillOpacity: 0.08, weight: 1.5 }}
                  />
                )}
                <Marker
                  position={[c.latitude as number, c.longitude as number]}
                  icon={isFocus ? focusCentreIcon : centreIcon}
                >
                  <Popup>
                    <strong>{centreLabel(c)}</strong>
                    <br />
                    {c.adresse}, {c.ville}
                    {c.region ? (
                      <>
                        <br />
                        {c.region}
                      </>
                    ) : null}
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}

          {showSessionLegend &&
            sessions.map((s) => (
              <React.Fragment key={`sess-${s.id}`}>
                {typeof s.latitudeDebut === 'number' && typeof s.longitudeDebut === 'number' && (
                  <Marker position={[s.latitudeDebut, s.longitudeDebut]} icon={sessionStartIcon}>
                    <Popup>
                      <strong>{s.titre}</strong>
                      <br />
                      Début session — {s.formateur?.prenom} {s.formateur?.nom}
                    </Popup>
                  </Marker>
                )}
                {typeof s.latitudeFin === 'number' && typeof s.longitudeFin === 'number' && (
                  <Marker position={[s.latitudeFin, s.longitudeFin]} icon={sessionEndIcon}>
                    <Popup>
                      <strong>{s.titre}</strong>
                      <br />
                      Fin session
                    </Popup>
                  </Marker>
                )}
                {typeof s.latitudeDebut === 'number' &&
                  typeof s.longitudeDebut === 'number' &&
                  typeof s.latitudeFin === 'number' &&
                  typeof s.longitudeFin === 'number' && (
                    <Polyline
                      positions={[
                        [s.latitudeDebut, s.longitudeDebut],
                        [s.latitudeFin, s.longitudeFin],
                      ]}
                      pathOptions={{ color: '#5ED9FF', weight: 2, dashArray: '6 6' }}
                    />
                  )}
              </React.Fragment>
            ))}

          {showSessionLegend && liveSession?.latitudeDebut != null && liveSession?.longitudeDebut != null && (
            <Marker
              position={[liveSession.latitudeDebut, liveSession.longitudeDebut]}
              icon={liveTeacherIcon}
            >
              <Popup>
                <strong>Sur le terrain</strong>
                <br />
                {liveSession.formateur?.prenom} {liveSession.formateur?.nom}
                <br />
                Session en cours : {liveSession.titre}
              </Popup>
            </Marker>
          )}

          {routeLine && (
            <Polyline positions={routeLine} pathOptions={{ color: '#004b57', weight: 2.5, dashArray: '8 6' }} />
          )}

          {currentPosition && (
            <CircleMarker
              center={[currentPosition.latitude, currentPosition.longitude]}
              radius={9}
              pathOptions={{ color: '#004b57', fillColor: '#004b57', fillOpacity: 0.35 }}
            >
              <Popup>Votre position actuelle</Popup>
            </CircleMarker>
          )}
        </MapContainer>

        <div className="absolute left-3 bottom-3 z-[400] bg-white/95 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 flex flex-wrap gap-3 shadow-sm max-w-[calc(100%-1.5rem)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#004b57]" /> Centre
          </span>
          {focusCentre && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F44F00]" /> Centre sélectionné
            </span>
          )}
          {currentPosition && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#004b57] opacity-60" /> Votre position
            </span>
          )}
          {showSessionLegend && (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a]" /> Sur le terrain
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#41c885]" /> Début
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5ED9FF]" /> Fin
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
