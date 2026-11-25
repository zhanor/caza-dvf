'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';

// Capture la carte Leaflet en image pour l'export PDF — uniquement à la demande.
// html2canvas redessine tout le conteneur (tuiles + marqueurs) : le lancer à chaque
// déplacement de carte gelait la page dès quelques centaines de marqueurs.
// captureRef.current() renvoie une data URL JPEG, ou null en cas d'échec (le PDF
// retombe alors sur son plan vectoriel).
function CaptureMap({ captureRef }) {
  const map = useMap();

  useEffect(() => {
    captureRef.current = async () => {
      try {
        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(map.getContainer(), {
          useCORS: false,
          allowTaint: false,
          logging: false,
          imageTimeout: 10000,
        });
        return canvas.toDataURL('image/jpeg', 0.85);
      } catch (e) {
        return null;
      }
    };
    return () => { captureRef.current = null; };
  }, [map, captureRef]);

  return null;
}

const TYPE_COLORS = {
  Maison:       '#10B981',
  Appartement:  '#3B82F6',
  Local:        '#8B5CF6',
  Terrain:      '#F59E0B',
};

function getTypeColor(type) {
  if (!type) return '#6B7280';
  for (const [key, color] of Object.entries(TYPE_COLORS)) {
    if (type.includes(key)) return color;
  }
  return '#6B7280';
}

function createNumberedIcon(num, type, selected) {
  const bg = selected ? getTypeColor(type) : '#9CA3AF';
  const size = selected ? 32 : 26;
  const fontSize = selected ? 12 : 11;
  const border = selected ? '2.5px solid white' : '2px solid rgba(255,255,255,0.7)';
  const shadow = selected
    ? `0 2px 8px rgba(0,0,0,0.35), 0 0 0 3px ${bg}55`
    : '0 1px 4px rgba(0,0,0,0.2)';
  const opacity = selected ? 1 : 0.55;
  const popClass = selected ? 'dvf-marker-pop' : '';

  return L.divIcon({
    className: '',
    html: `<div class="${popClass}" style="
      background:${bg};
      color:white;
      border-radius:50%;
      width:${size}px;height:${size}px;
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:${fontSize}px;font-family:sans-serif;
      border:${border};
      box-shadow:${shadow};
      opacity:${opacity};
      cursor:pointer;
      will-change:transform;
    ">${num}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [0, -(size / 2 + 4)],
  });
}

// Une icône par combinaison (numéro, couleur, état) : la même instance est réutilisée d'un
// rendu à l'autre, donc Leaflet ne reconstruit le DOM d'un marqueur que s'il change vraiment.
const iconCache = new Map();
function getNumberedIcon(num, type, selected) {
  const key = `${num}|${getTypeColor(type)}|${selected ? 1 : 0}`;
  let icon = iconCache.get(key);
  if (!icon) {
    icon = createNumberedIcon(num, type, selected);
    iconCache.set(key, icon);
  }
  return icon;
}

let centerIcon = null;
function getCenterIcon() {
  if (!centerIcon) centerIcon = createCenterIcon();
  return centerIcon;
}

function createCenterIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:48px;height:56px;display:flex;align-items:flex-end;justify-content:center;pointer-events:none;">
      <div class="dvf-pin-pulse"></div>
      <div class="dvf-pin-pulse-2"></div>
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36" fill="none" style="position:relative;z-index:1;filter:drop-shadow(0 3px 5px rgba(0,0,0,0.3))">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 9.9 14 22 14 22s14-12.1 14-22C28 6.27 21.73 0 14 0z" fill="#DC2626"/>
        <circle cx="14" cy="13" r="5.5" fill="white"/>
        <circle cx="14" cy="13" r="3" fill="#DC2626"/>
      </svg>
    </div>`,
    iconSize: [48, 56],
    iconAnchor: [24, 54],
    tooltipAnchor: [0, -54],
  });
}

// Filtre dynamique : met à jour la sélection selon le viewport
// N'appelle le callback que si les IDs visibles ont réellement changé
// pour éviter de déclencher un re-render complet à chaque déplacement
function ViewportFilter({ transactions, onViewportChange }) {
  const map = useMap();
  const txRef = useRef(transactions);
  const cbRef = useRef(onViewportChange);
  const prevIdsRef = useRef(null);
  txRef.current = transactions;
  cbRef.current = onViewportChange;

  useEffect(() => {
    const update = () => {
      try {
        const bounds = map.getBounds();
        if (!bounds) return;
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const visibleIds = new Set(
          txRef.current
            .filter(t => {
              const lat = parseFloat(t.lat);
              const lng = parseFloat(t.lng);
              return !isNaN(lat) && !isNaN(lng)
                && lat >= sw.lat && lat <= ne.lat
                && lng >= sw.lng && lng <= ne.lng;
            })
            .map(t => t.id)
        );
        // Skip si les IDs visibles n'ont pas changé → évite re-render inutile
        const prev = prevIdsRef.current;
        if (prev && prev.size === visibleIds.size && [...visibleIds].every(id => prev.has(id))) return;
        prevIdsRef.current = visibleIds;
        cbRef.current(visibleIds);
      } catch (_) {}
    };

    // moveend couvre aussi dragend — pas besoin d'écouter les deux
    map.on('moveend', update);
    map.on('zoomend', update);

    const timer = setTimeout(update, 300);

    return () => {
      clearTimeout(timer);
      map.off('moveend', update);
      map.off('zoomend', update);
    };
  }, [map]);

  return null;
}

// Déclenche une nouvelle recherche quand l'utilisateur navigue manuellement
// Ignoré pendant les 1.5s après le montage (FitBounds s'occupe du repositionnement initial)
function AutoSearch({ onAutoSearch }) {
  const map = useMap();
  const cbRef = useRef(onAutoSearch);
  const timerRef = useRef(null);
  const readyRef = useRef(false);
  cbRef.current = onAutoSearch;

  useEffect(() => {
    const readyTimer = setTimeout(() => { readyRef.current = true; }, 1500);

    const trigger = () => {
      if (!readyRef.current) return;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const center = map.getCenter();
        const bounds = map.getBounds();
        const ne = bounds.getNorthEast();
        // Haversine center → coin NE pour estimer le rayon visible
        const toRad = d => d * Math.PI / 180;
        const R = 6371000;
        const φ1 = toRad(center.lat), φ2 = toRad(ne.lat);
        const dφ = toRad(ne.lat - center.lat);
        const dλ = toRad(ne.lng - center.lng);
        const a = Math.sin(dφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(dλ/2)**2;
        const radius = Math.max(50, Math.min(5000, Math.round(2*R*Math.asin(Math.sqrt(a)))));
        cbRef.current({ lat: center.lat, lon: center.lng }, radius);
      }, 800);
    };

    map.on('moveend', trigger);
    map.on('zoomend', trigger);

    return () => {
      clearTimeout(readyTimer);
      clearTimeout(timerRef.current);
      map.off('moveend', trigger);
      map.off('zoomend', trigger);
    };
  }, [map]);

  return null;
}

// Recadre la carte uniquement lors d'une vraie nouvelle recherche (searchKey change) —
// pas quand une référence est supprimée/restaurée à la main dans la liste, pour ne pas
// écraser le zoom/pan manuel de l'utilisateur (voir searchNonce dans page.js)
//
// Les ventes situées nettement hors du rayon sont ignorées pour le cadrage : une mutation
// multi-sites peut être rattachée à un point très éloigné, et une seule suffisait à
// dézoomer la carte sur toute la région.
function FitBounds({ transactions, center, searchKey, radius }) {
  const map = useMap();
  useEffect(() => {
    const points = transactions
      .filter(t => t.lat && t.lng)
      .filter(t => !radius || !(t.distance > radius * 1.5))
      .map(t => [t.lat, t.lng]);
    if (center) points.push([center.lat, center.lon]);
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(points, { padding: [40, 40] });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);
  return null;
}

const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

// Un marqueur de vente. Mémoïsé sur des valeurs simples : un rendu de la page ne touche
// que les marqueurs dont le numéro ou la sélection a changé. L'infobulle n'est montée
// qu'au survol, pour ne pas entretenir une infobulle par vente.
const TxMarker = memo(function TxMarker({ id, lat, lng, type, address, price, surface, date, displayNum, selected, onToggle }) {
  const [hover, setHover] = useState(false);
  const position = useMemo(() => [lat, lng], [lat, lng]);
  const handlers = useMemo(() => ({
    click(e) {
      e.originalEvent.stopPropagation();
      onToggle(id);
    },
    mouseover() { setHover(true); },
    mouseout() { setHover(false); },
  }), [id, onToggle]);
  const surfaceStr = surface > 0 ? ` · ${surface} m²` : '';

  return (
    <Marker position={position} icon={getNumberedIcon(displayNum, type, selected)} eventHandlers={handlers}>
      {hover && (
        <Tooltip permanent direction="top" offset={[0, 0]} opacity={0.97}>
          <div style={{ minWidth: 160, maxWidth: 220 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3, color: '#0f172a' }}>
              #{displayNum} — {type || '—'}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{address}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
              {fmt.format(price)}
              <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 4 }}>{surfaceStr}</span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{date}</div>
            <div style={{ marginTop: 5, fontSize: 11, fontWeight: 600, color: selected ? '#2563eb' : '#9ca3af' }}>
              {selected ? '✓ Sélectionnée — cliquer pour retirer' : '+ Cliquer pour sélectionner'}
            </div>
          </div>
        </Tooltip>
      )}
    </Marker>
  );
});

export default function MapViewLeaflet({ transactions, searchCenter, searchKey, radius, selectedIds, onToggleSelect, captureRef, onViewportChange, onAutoSearch, refNumMap }) {
  // Callback stable : onToggleSelect est recréé à chaque rendu de la page, ce qui
  // invaliderait la mémoïsation de tous les marqueurs.
  const toggleRef = useRef(onToggleSelect);
  toggleRef.current = onToggleSelect;
  const handleToggle = useCallback((id) => toggleRef.current(id), []);
  const defaultCenter = useMemo(
    () => (searchCenter ? [searchCenter.lat, searchCenter.lon] : null),
    [searchCenter?.lat, searchCenter?.lon] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const hasCoords = transactions.some(t => t.lat && t.lng);
  if (!hasCoords || !searchCenter) return null;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={15}
      style={{ height: '360px', width: '100%' }}
      className="rounded-xl z-0"
      zoomSnap={0.25}
      zoomDelta={0.5}
      wheelPxPerZoomLevel={80}
      markerZoomAnimation
      zoomAnimation
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="/api/tiles/{z}/{x}/{y}.png"
      />

      <FitBounds transactions={transactions} center={searchCenter} searchKey={searchKey} radius={radius} />
      {onViewportChange && (
        <ViewportFilter transactions={transactions} onViewportChange={onViewportChange} />
      )}
      {captureRef && <CaptureMap captureRef={captureRef} />}

      {/* Centre de recherche */}
      <Marker position={defaultCenter} icon={getCenterIcon()} interactive={false}>
        <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
          <span style={{ fontWeight: 600, fontSize: 12 }}>📍 Point de recherche</span>
        </Tooltip>
      </Marker>

      {/* Transactions — clic direct toggle, infobulle au survol (pas de popup = pas de repositionnement carte) */}
      {transactions
        .filter(t => t.lat && t.lng)
        .map(t => (
          <TxMarker
            key={t.id}
            id={t.id}
            lat={t.lat}
            lng={t.lng}
            type={t.type}
            address={t.address}
            price={t.price}
            surface={t.surface}
            date={t.date}
            displayNum={refNumMap?.get(t.id) ?? t.refNum}
            selected={selectedIds.has(t.id)}
            onToggle={handleToggle}
          />
        ))}
    </MapContainer>
  );
}
