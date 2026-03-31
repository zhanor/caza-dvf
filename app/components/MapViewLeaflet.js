'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';

// Capture la carte Leaflet en image pour l'export PDF
function CaptureMap({ onCapture, txCount, centerKey }) {
  const map = useMap();

  useEffect(() => {
    let cancelled = false;
    let fallbackTimer = null;
    let debounceTimer = null;

    const doCapture = async () => {
      if (cancelled) return;
      try {
        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(map.getContainer(), {
          useCORS: false,
          allowTaint: false,
          logging: false,
          imageTimeout: 10000,
        });
        if (!cancelled) onCapture(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) {
        // silently ignore — vector fallback used in PDF
      }
    };

    const onTilesLoaded = () => {
      clearTimeout(fallbackTimer);
      setTimeout(doCapture, 500);
    };

    const onMapMoved = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(doCapture, 900);
    };

    map.once('tilesloaded', onTilesLoaded);
    map.on('moveend', onMapMoved);
    map.on('zoomend', onMapMoved);
    fallbackTimer = setTimeout(doCapture, 5000);

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
      clearTimeout(debounceTimer);
      map.off('tilesloaded', onTilesLoaded);
      map.off('moveend', onMapMoved);
      map.off('zoomend', onMapMoved);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txCount, centerKey]);

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

function createCenterIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:48px;height:56px;display:flex;align-items:flex-end;justify-content:center;pointer-events:none;">
      <div class="dvf-pin-pulse"></div>
      <div class="dvf-pin-pulse-2"></div>
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36" fill="none" style="position:relative;z-index:1;filter:drop-shadow(0 3px 5px rgba(0,0,0,0.3))">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 9.9 14 22 14 22s14-12.1 14-22C28 6.27 21.73 0 14 0z" fill="#2563EB"/>
        <circle cx="14" cy="13" r="5.5" fill="white"/>
        <circle cx="14" cy="13" r="3" fill="#2563EB"/>
      </svg>
    </div>`,
    iconSize: [48, 56],
    iconAnchor: [24, 54],
    tooltipAnchor: [0, -54],
  });
}

// Filtre dynamique : met à jour la sélection selon le viewport
function ViewportFilter({ transactions, onViewportChange }) {
  const map = useMap();
  const txRef = useRef(transactions);
  const cbRef = useRef(onViewportChange);
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
        cbRef.current(visibleIds);
      } catch (_) {}
    };

    map.on('moveend', update);
    map.on('zoomend', update);
    map.on('dragend', update);

    const timer = setTimeout(update, 300);

    return () => {
      clearTimeout(timer);
      map.off('moveend', update);
      map.off('zoomend', update);
      map.off('dragend', update);
    };
  }, [map]);

  return null;
}

// Recadre la carte quand les transactions changent
function FitBounds({ transactions, center }) {
  const map = useMap();
  useEffect(() => {
    const points = transactions
      .filter(t => t.lat && t.lng)
      .map(t => [t.lat, t.lng]);
    if (center) points.push([center.lat, center.lon]);
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(points, { padding: [40, 40] });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions.length, center?.lat, center?.lon]);
  return null;
}

const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export default function MapViewLeaflet({ transactions, searchCenter, selectedIds, onToggleSelect, onCapture, onViewportChange, refNumMap }) {
  const hasCoords = transactions.some(t => t.lat && t.lng);
  if (!hasCoords || !searchCenter) return null;

  const defaultCenter = [searchCenter.lat, searchCenter.lon];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={15}
      style={{ height: '360px', width: '100%' }}
      className="rounded-xl z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="/api/tiles/{z}/{x}/{y}.png"
      />

      <FitBounds transactions={transactions} center={searchCenter} />
      {onViewportChange && (
        <ViewportFilter transactions={transactions} onViewportChange={onViewportChange} />
      )}
      {onCapture && (
        <CaptureMap
          onCapture={onCapture}
          txCount={transactions.length}
          centerKey={`${searchCenter?.lat},${searchCenter?.lon}`}
        />
      )}

      {/* Centre de recherche */}
      <Marker position={defaultCenter} icon={createCenterIcon()} interactive={false}>
        <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
          <span style={{ fontWeight: 600, fontSize: 12 }}>📍 Point de recherche</span>
        </Tooltip>
      </Marker>

      {/* Transactions — clic direct toggle, tooltip au survol (pas de popup = pas de repositionnement carte) */}
      {transactions
        .filter(t => t.lat && t.lng)
        .map(t => {
          const selected = selectedIds.has(t.id);
          const displayNum = refNumMap?.get(t.id) ?? t.refNum;
          const surfaceStr = t.surface > 0 ? ` · ${t.surface} m²` : '';
          return (
            <Marker
              key={t.id}
              position={[t.lat, t.lng]}
              icon={createNumberedIcon(displayNum, t.type, selected)}
              eventHandlers={{
                click(e) {
                  e.originalEvent.stopPropagation();
                  onToggleSelect(t.id);
                },
              }}
            >
              <Tooltip direction="top" offset={[0, 0]} opacity={0.97} sticky={false}>
                <div style={{ minWidth: 160, maxWidth: 220 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3, color: '#0f172a' }}>
                    #{displayNum} — {t.type || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{t.address}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                    {fmt.format(t.price)}
                    <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 4 }}>{surfaceStr}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{t.date}</div>
                  <div style={{ marginTop: 5, fontSize: 11, fontWeight: 600, color: selected ? '#2563eb' : '#9ca3af' }}>
                    {selected ? '✓ Sélectionnée — cliquer pour retirer' : '+ Cliquer pour sélectionner'}
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
    </MapContainer>
  );
}
