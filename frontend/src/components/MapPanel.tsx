import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { useSnapshot } from '../context/SnapshotContext';
import { RouteSearchOverlay } from './RouteSearchOverlay';
import { ModeFilterBar } from './ModeFilterBar';
import type { DelaySeverity, TransitMode } from 'shared/types';
import 'leaflet/dist/leaflet.css';

const SEVERITY_COLOUR: Record<DelaySeverity, string> = {
  green: '#22c55e',
  amber: '#f59e0b',
  red:   '#ef4444',
  none:  '#94a3b8',
};

const MODE_LABEL: Record<TransitMode, string> = {
  bus:   'Bus',
  train: 'Train',
  ferry: 'Ferry',
};

const SEVERITY_LABEL: Record<DelaySeverity, string> = {
  green: 'on time',
  amber: 'delayed',
  red:   'delayed',
  none:  'no data',
};

const AUCKLAND_CENTRE: [number, number] = [-36.86, 174.76];

const _iconCache = new Map<string, ReturnType<typeof divIcon>>();

function makeIcon(mode: TransitMode, severity: DelaySeverity): ReturnType<typeof divIcon> {
  const key = `${mode}:${severity}`;
  const cached = _iconCache.get(key);
  if (cached) return cached;

  const colour = SEVERITY_COLOUR[severity];
  let html: string;
  let size: [number, number];

  if (mode === 'bus') {
    html = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><circle cx="7" cy="7" r="6" fill="${colour}" fill-opacity="0.85" stroke="${colour}" stroke-width="1.5"/></svg>`;
    size = [14, 14];
  } else if (mode === 'train') {
    html = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"><rect x="1" y="1" width="16" height="16" rx="3" fill="${colour}" fill-opacity="0.85" stroke="${colour}" stroke-width="1.5"/></svg>`;
    size = [18, 18];
  } else {
    html = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="16"><polygon points="9,1 17,15 1,15" fill="${colour}" fill-opacity="0.85" stroke="${colour}" stroke-width="1.5"/></svg>`;
    size = [18, 16];
  }

  const iconAnchor: [number, number] = mode === 'ferry' ? [9, 10] : [size[0] / 2, size[1] / 2];
  const icon = divIcon({ html, className: '', iconSize: size, iconAnchor });
  _iconCache.set(key, icon);
  return icon;
}

function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({ click: onMapClick });
  return null;
}

export function MapPanel() {
  const { snapshot } = useSnapshot();
  const vehicles = snapshot?.vehicles ?? [];
  const [routeFilter, setRouteFilter] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [activeModes, setActiveModes] = useState<Set<TransitMode>>(
    new Set(['bus', 'train', 'ferry'])
  );

  const routeOptions = useMemo(
    () => [...new Set(vehicles.map(v => v.routeShortName))].sort(),
    [vehicles]
  );

  function toggleMode(mode: TransitMode) {
    setActiveModes(prev => {
      const next = new Set(prev);
      next.has(mode) ? next.delete(mode) : next.add(mode);
      return next;
    });
  }

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={AUCKLAND_CENTRE}
        zoom={11}
        className="h-full w-full"
        zoomControl
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={20}
          className="brightness-map"
        />
        <MapClickHandler onMapClick={() => setPinnedId(null)} />
        {vehicles.map(v => (
          <Marker
            key={v.id}
            position={[v.lat, v.lng]}
            icon={makeIcon(v.mode, v.delaySeverity)}
            opacity={
              (routeFilter && v.routeShortName !== routeFilter) || !activeModes.has(v.mode)
                ? 0.15
                : 1
            }
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                setPinnedId(prev => prev === v.id ? null : v.id);
              },
            }}
          >
            <Tooltip
              key={pinnedId === v.id ? 'pinned' : 'hover'}
              permanent={pinnedId === v.id}
            >
              <div style={{ minWidth: 90 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: SEVERITY_COLOUR[v.delaySeverity] }}>
                  {v.routeShortName}
                </div>
                <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>
                  {MODE_LABEL[v.mode]} · {SEVERITY_LABEL[v.delaySeverity]}
                </div>
              </div>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
      <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
        <RouteSearchOverlay options={routeOptions} onSelect={setRouteFilter} />
        <ModeFilterBar activeModes={activeModes} onToggle={toggleMode} />
      </div>
    </div>
  );
}
