import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { useSnapshot } from '../context/SnapshotContext';
import type { DelaySeverity, TransitMode } from 'shared/types';
import 'leaflet/dist/leaflet.css';

const SEVERITY_COLOUR: Record<DelaySeverity, string> = {
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  none: '#6b7280',
};

const MODE_LABEL: Record<TransitMode, string> = {
  bus: 'Bus',
  train: 'Train',
  ferry: 'Ferry',
};

const AUCKLAND_CENTRE: [number, number] = [-36.86, 174.76];

export function MapPanel() {
  const { snapshot } = useSnapshot();
  const vehicles = snapshot?.vehicles ?? [];

  return (
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
      />
      {vehicles.map(v => (
        <CircleMarker
          key={v.id}
          center={[v.lat, v.lng]}
          radius={5}
          pathOptions={{
            fillColor: SEVERITY_COLOUR[v.delaySeverity],
            fillOpacity: 0.85,
            color: SEVERITY_COLOUR[v.delaySeverity],
            weight: 1,
          }}
        >
          <Tooltip>
            {MODE_LABEL[v.mode]} · {v.delaySeverity === 'none' ? 'no delay data' : v.delaySeverity}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
