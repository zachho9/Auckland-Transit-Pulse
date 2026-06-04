import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, useMapEvents, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { useSnapshot } from '../context/SnapshotContext';
import { useRouteSelection } from '../context/RouteSelectionContext';
import { RouteSearchOverlay } from './RouteSearchOverlay';
import { ModeFilterBar } from './ModeFilterBar';
import type { DelaySeverity, TransitMode, RouteShape } from 'shared/types';
import type { Theme } from '../App';
import 'leaflet/dist/leaflet.css';

const SEVERITY_COLOUR: Record<DelaySeverity, string> = {
  green: '#22c55e',
  amber: '#f59e0b',
  red:   '#ef4444',
  none:  '#94a3b8',
};

const MODE_LABEL: Record<TransitMode, string> = {
  bus: 'Bus', train: 'Train', ferry: 'Ferry',
};

const SEVERITY_LABEL: Record<DelaySeverity, string> = {
  green: 'on time', amber: 'delayed', red: 'delayed', none: 'no data',
};

const TILE_URLS: Record<Theme, string> = {
  dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
};

const AUCKLAND_CENTRE: [number, number] = [-36.86, 174.76];
const SHAPES_URL = `${((import.meta.env.VITE_API_URL as string) ?? '').replace(/\/$/, '')}/shapes`;

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

function RouteFitter({ allPoints }: { allPoints: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (allPoints.length > 0) {
      map.fitBounds(allPoints, { padding: [30, 30] });
    }
  }, [allPoints, map]);
  return null;
}

function delayMinutesToColour(avgDelayMinutes: number): string {
  if (avgDelayMinutes <= 2) return '#22c55e';
  if (avgDelayMinutes <= 5) return '#f59e0b';
  return '#ef4444';
}

interface Props {
  theme: Theme;
}

export function MapPanel({ theme }: Props) {
  const { snapshot } = useSnapshot();
  const { selectedRouteId, selectRoute } = useRouteSelection();
  const vehicles = snapshot?.vehicles ?? [];

  const [routeFilter, setRouteFilter] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [activeModes, setActiveModes] = useState<Set<TransitMode>>(
    new Set(['bus', 'train', 'ferry'])
  );
  const [routeShape, setRouteShape] = useState<RouteShape | null>(null);

  const routeOptions = useMemo(
    () => [...new Set(vehicles.map(v => v.routeShortName))].sort(),
    [vehicles]
  );

  // Fetch shape when a route is selected
  useEffect(() => {
    if (!selectedRouteId) {
      setRouteShape(null);
      return;
    }
    if (import.meta.env.VITE_MOCK === 'true') return;
    const controller = new AbortController();
    fetch(`${SHAPES_URL}/${encodeURIComponent(selectedRouteId)}`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then((data: RouteShape | null) => setRouteShape(data))
      .catch(e => { if ((e as Error).name !== 'AbortError') setRouteShape(null); });
    return () => controller.abort();
  }, [selectedRouteId]);

  // Clear pinned tooltip when route is selected
  useEffect(() => {
    if (selectedRouteId) setPinnedId(null);
  }, [selectedRouteId]);

  const routeAvgDelay = snapshot?.worstRoutes.find(r => r.routeId === selectedRouteId)?.avgDelayMinutes ?? 0;
  const polylineColour = delayMinutesToColour(routeAvgDelay);

  const allShapePoints = useMemo<[number, number][]>(
    () => routeShape ? routeShape.directions.flatMap(d => d.points) : [],
    [routeShape],
  );

  function handleMapClick() {
    if (selectedRouteId) {
      selectRoute(null);
    } else {
      setPinnedId(null);
    }
  }

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
          key={theme}
          url={TILE_URLS[theme]}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={20}
          className={theme === 'dark' ? 'brightness-map' : undefined}
        />

        <MapClickHandler onMapClick={handleMapClick} />

        {routeShape && <RouteFitter allPoints={allShapePoints} />}

        {routeShape?.directions.map(d => (
          <Polyline
            key={d.directionId}
            positions={d.points}
            pathOptions={{ color: polylineColour, weight: 4, opacity: 0.85 }}
          />
        ))}

        {vehicles.map(v => {
          const isFiltered = selectedRouteId
            ? v.routeId !== selectedRouteId
            : (routeFilter ? v.routeShortName !== routeFilter : false) || !activeModes.has(v.mode);
          const isPinned = pinnedId === v.id && !isFiltered;

          return (
            <Marker
              key={v.id}
              position={[v.lat, v.lng]}
              icon={makeIcon(v.mode, v.delaySeverity)}
              opacity={isFiltered ? 0 : 1}
              ref={(marker) => {
                const el = marker?.getElement();
                if (el) el.style.pointerEvents = isFiltered ? 'none' : '';
              }}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent.stopPropagation();
                  if (!selectedRouteId) {
                    setPinnedId(prev => prev === v.id ? null : v.id);
                  } else {
                    selectRoute(v.routeId === selectedRouteId ? null : v.routeId);
                  }
                },
              }}
            >
              <Tooltip key={isPinned ? 'pinned' : 'hover'} permanent={isPinned}>
                <div style={{ minWidth: 90 }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: SEVERITY_COLOUR[v.delaySeverity] }}>
                    {v.routeShortName}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--text-secondary)' }}>
                    {MODE_LABEL[v.mode]} · {SEVERITY_LABEL[v.delaySeverity]}
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
        <RouteSearchOverlay options={routeOptions} onSelect={setRouteFilter} />
        <ModeFilterBar activeModes={activeModes} onToggle={toggleMode} />
      </div>
    </div>
  );
}
