# Route Search Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating search box to the map's top-right corner that lets users type a route number, pick from a partial-match dropdown, and dim all non-matching vehicles to 15% opacity.

**Architecture:** New `RouteSearchOverlay` component handles input and dropdown UI. `MapPanel` holds `routeFilter` state and passes it down; the map container is wrapped in a `relative` div so the overlay can be absolutely positioned above the tiles. No new context, no backend changes.

**Tech Stack:** React `useState`, Tailwind CSS, react-leaflet Marker `opacity` prop.

---

## File Map

| File | Change |
|------|--------|
| `frontend/src/components/RouteSearchOverlay.tsx` | Create — search input + dropdown component |
| `frontend/src/components/MapPanel.tsx` | Add state, options, overlay mount point, per-marker opacity |

---

## Task 1: Create RouteSearchOverlay component

**Files:**
- Create: `frontend/src/components/RouteSearchOverlay.tsx`

> No automated tests exist for visual frontend components. Verification is a TypeScript build check.

- [ ] **Step 1: Create the file**

Create `frontend/src/components/RouteSearchOverlay.tsx` with this content:

```tsx
import { useState } from 'react';

interface Props {
  options: string[];
  onSelect: (route: string | null) => void;
}

export function RouteSearchOverlay({ options, onSelect }: Props) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = text
    ? options.filter(o => o.toLowerCase().startsWith(text.toLowerCase())).slice(0, 8)
    : [];

  function handleSelect(route: string) {
    setText(route);
    setOpen(false);
    onSelect(route);
  }

  function handleClear() {
    setText('');
    setOpen(false);
    onSelect(null);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setText(val);
    onSelect(null);
    setOpen(val.length > 0);
  }

  return (
    <div className="relative w-44">
      <div className="flex items-center bg-gray-800 border border-gray-700 rounded px-2 py-1.5 gap-1.5 shadow-lg">
        <svg className="text-gray-400 shrink-0" width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.656a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/>
        </svg>
        <input
          type="text"
          value={text}
          onChange={handleChange}
          onFocus={() => text.length > 0 && setOpen(true)}
          placeholder="Search route…"
          className="bg-transparent text-white text-xs outline-none flex-1 min-w-0 placeholder-gray-500"
        />
        {text && (
          <button
            onClick={handleClear}
            className="text-gray-400 hover:text-white text-sm leading-none shrink-0"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded overflow-hidden shadow-lg">
          {filtered.map(route => (
            <li
              key={route}
              onClick={() => handleSelect(route)}
              className="px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700 cursor-pointer"
            >
              {route}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /e/Coding/Auckland-Transit-Pulse/frontend && npm run build 2>&1 | tail -8
```

Expected: `✓ built in X.XXs` with no errors.

---

## Task 2: Integrate RouteSearchOverlay into MapPanel

**Files:**
- Modify: `frontend/src/components/MapPanel.tsx`

Current full content of `frontend/src/components/MapPanel.tsx` for reference:

```tsx
import { MapContainer, TileLayer, Marker, Tooltip, Popup } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { useSnapshot } from '../context/SnapshotContext';
import type { DelaySeverity, TransitMode } from 'shared/types';
import 'leaflet/dist/leaflet.css';

const SEVERITY_COLOUR: Record<DelaySeverity, string> = {
  green: '#22c55e',
  amber: '#f59e0b',
  red:   '#ef4444',
  none:  '#6b7280',
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
        className="brightness-map"
      />
      {vehicles.map(v => (
        <Marker
          key={v.id}
          position={[v.lat, v.lng]}
          icon={makeIcon(v.mode, v.delaySeverity)}
        >
          <Tooltip>
            {MODE_LABEL[v.mode]} · {SEVERITY_LABEL[v.delaySeverity]}
          </Tooltip>
          <Popup>
            <div style={{ minWidth: 90 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: SEVERITY_COLOUR[v.delaySeverity] }}>
                {v.routeShortName}
              </div>
              <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>
                {MODE_LABEL[v.mode]} · {SEVERITY_LABEL[v.delaySeverity]}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
```

- [ ] **Step 1: Replace the file with the integrated version**

```tsx
import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Popup } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { useSnapshot } from '../context/SnapshotContext';
import { RouteSearchOverlay } from './RouteSearchOverlay';
import type { DelaySeverity, TransitMode } from 'shared/types';
import 'leaflet/dist/leaflet.css';

const SEVERITY_COLOUR: Record<DelaySeverity, string> = {
  green: '#22c55e',
  amber: '#f59e0b',
  red:   '#ef4444',
  none:  '#6b7280',
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

export function MapPanel() {
  const { snapshot } = useSnapshot();
  const vehicles = snapshot?.vehicles ?? [];
  const [routeFilter, setRouteFilter] = useState<string | null>(null);

  const routeOptions = [...new Set(vehicles.map(v => v.routeShortName))].sort();

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
        {vehicles.map(v => (
          <Marker
            key={v.id}
            position={[v.lat, v.lng]}
            icon={makeIcon(v.mode, v.delaySeverity)}
            opacity={routeFilter && v.routeShortName !== routeFilter ? 0.15 : 1}
          >
            <Tooltip>
              {MODE_LABEL[v.mode]} · {SEVERITY_LABEL[v.delaySeverity]}
            </Tooltip>
            <Popup>
              <div style={{ minWidth: 90 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: SEVERITY_COLOUR[v.delaySeverity] }}>
                  {v.routeShortName}
                </div>
                <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>
                  {MODE_LABEL[v.mode]} · {SEVERITY_LABEL[v.delaySeverity]}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="absolute top-4 right-4 z-[1000]">
        <RouteSearchOverlay options={routeOptions} onSelect={setRouteFilter} />
      </div>
    </div>
  );
}
```

Diff summary:
- Added `import { useState } from 'react'`
- Added `import { RouteSearchOverlay } from './RouteSearchOverlay'`
- Added `routeFilter` state and `routeOptions` derivation in `MapPanel`
- Wrapped `MapContainer` in `<div className="h-full w-full relative">`
- Added `opacity` prop to each `<Marker>`
- Added `<RouteSearchOverlay>` overlay div after `</MapContainer>`

- [ ] **Step 2: Verify the build is clean**

```bash
cd /e/Coding/Auckland-Transit-Pulse/frontend && npm run build 2>&1 | tail -8
```

Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 3: Verify visually in mock mode**

```bash
cd /e/Coding/Auckland-Transit-Pulse/frontend && VITE_MOCK=true npm run dev
```

Open `http://localhost:5173`. Check:
- A small dark search box appears in the top-right corner of the map
- Map zoom controls (top-left) are unaffected
- Type "2" — a dropdown appears listing matching route short names (e.g. "274")
- Click "274" — vehicles not on route 274 dim to ~15% opacity; route 274 vehicles remain bright
- Click the × button — all vehicles return to full opacity, input clears
- Typing then clearing mid-word (before selecting) also resets opacity

- [ ] **Step 4: Commit**

```bash
cd /e/Coding/Auckland-Transit-Pulse && git add frontend/src/components/RouteSearchOverlay.tsx frontend/src/components/MapPanel.tsx && git commit -m "feat: route search overlay with partial-match dropdown and marker dimming"
```
