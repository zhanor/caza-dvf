'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Capture la carte Leaflet en image pour l'export PDF
// Les tuiles passent par /api/tiles (même origine) → pas de problème CORS html2canvas
function CaptureMap({ onCapture, txCount, centerKey }) {
  const map = useMap();

  useEffect(() => {
    let cancelled = false;
    let fallbackTimer = null;

    const doCapture = async () => {
      if (cancelled) return;
      try {
        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(map.getContainer(), {
          useCORS: false,      // same-origin → pas besoin de CORS
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
      setTimeout(doCapture, 500); // petit délai pour que les tuiles s'affichent
    };

    map.once('tilesloaded', onTilesLoaded);
    // Fallback : capturer après 5s même si tilesloaded n'a pas encore tiré
    fallbackTimer = setTimeout(doCapture, 5000);

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
      map.off('tilesloaded', onTilesLoaded);
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
  const opacity = selected ? 1 : 0.55;
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${bg};
      color:white;
      border-radius:50%;
      width:26px;height:26px;
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:11px;font-family:sans-serif;
      border:2px solid white;
      box-shadow:0 2px 5px rgba(0,0,0,0.35);
      opacity:${opacity};
      cursor:pointer;
    ">${num}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -16],
  });
}

function createCenterIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:#1D4ED8;
      border-radius:50%;
      width:14px;height:14px;
      border:3px solid white;
      box-shadow:0 0 0 2px #1D4ED8,0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

// Filtre dynamique : met à jour la sélection selon le viewport
function ViewportFilter({ transactions, onViewportChange }) {
  // Refs pour toujours avoir les valeurs fraîches sans recréer les listeners
  const txRef = useRef(transactions);
  const cbRef = useRef(onViewportChange);
  txRef.current = transactions;
  cbRef.current = onViewportChange;

  const computeVisible = (map) => {
    const bounds = map.getBounds();
    const visibleIds = new Set(
      txRef.current
        .filter(t => t.lat && t.lng && bounds.contains([t.lat, t.lng]))
        .map(t => t.id)
    );
    cbRef.current(visibleIds);
  };

  const map = useMapEvents({
    moveend: (e) => computeVisible(e.target),
    zoomend: (e) => computeVisible(e.target),
  });

  // Déclencher une première fois après le montage
  useEffect(() => {
    if (map) computeVisible(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

// Recadre la carte quand les transactions changent
function FitBounds({ transactions, center }) {
  const map = useMap();
  // Ne refaire le fitBounds que si le nombre de transactions ou le centre change (nouvelle recherche)
  // Pas sur chaque re-render dû à la sélection
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

export default function MapViewLeaflet({ transactions, searchCenter, selectedIds, onToggleSelect, onCapture, onViewportChange }) {
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
      <Marker position={defaultCenter} icon={createCenterIcon()}>
        <Popup>
          <div className="text-sm font-semibold">Point de recherche</div>
        </Popup>
      </Marker>

      {/* Transactions */}
      {transactions
        .filter(t => t.lat && t.lng)
        .map(t => {
          const selected = selectedIds.has(t.id);
          return (
            <Marker
              key={t.id}
              position={[t.lat, t.lng]}
              icon={createNumberedIcon(t.refNum, t.type, selected)}
              eventHandlers={{ click: () => onToggleSelect(t.id) }}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div className="font-bold text-sm mb-1">#{t.refNum} — {t.type}</div>
                  <div className="text-xs text-gray-600 mb-1">{t.address}</div>
                  <div className="text-xs">
                    <span className="font-semibold">
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(t.price)}
                    </span>
                    {t.surface > 0 && <span className="text-gray-500 ml-1">— {t.surface} m²</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{t.date}</div>
                  <button
                    onClick={() => onToggleSelect(t.id)}
                    className={`mt-2 w-full text-xs px-2 py-1 rounded font-medium transition-colors ${
                      selected
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {selected ? '✓ Sélectionnée' : '○ Désélectionnée'}
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
    </MapContainer>
  );
}
