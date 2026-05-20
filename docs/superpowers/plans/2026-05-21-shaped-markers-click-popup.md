# Shaped Markers + Click Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give bus/train/ferry map markers distinct shapes (circle/rounded-square/triangle) and show route short name + delay status in a popup when a marker is clicked.

**Architecture:** One new field (`routeShortName`) threads from `shared/types.ts` → `backend/src/poller/aggregator.ts` → `frontend/src/context/mockSnapshot.ts`. The visual changes are isolated to `frontend/src/components/MapPanel.tsx`: `CircleMarker` is replaced by `Marker` + `divIcon` (inline SVG per mode), and a Leaflet `<Popup>` is added alongside the existing `<Tooltip>`.

**Tech Stack:** TypeScript, React-Leaflet (`Marker`, `Tooltip`, `Popup`), Leaflet `divIcon`, Jest/ts-jest.

---

## File Map

| File | Change |
|------|--------|
| `shared/types.ts` | Add `routeShortName: string` to `VehicleSnapshot` |
| `backend/src/poller/aggregator.ts` | Populate `routeShortName` in `parseVehicles` |
| `backend/tests/aggregator.test.ts` | Update expectations + fixture objects for new field |
| `frontend/src/context/mockSnapshot.ts` | Add `routeShortName` to all 16 mock vehicles |
| `frontend/src/components/MapPanel.tsx` | `makeIcon()` helper, DivIcon Marker, `<Popup>` |

---

## Task 1: Thread `routeShortName` through type + aggregator

**Files:**
- Modify: `shared/types.ts`
- Modify: `backend/src/poller/aggregator.ts`
- Modify: `backend/tests/aggregator.test.ts`

- [ ] **Step 1: Add `routeShortName` to `VehicleSnapshot` in `shared/types.ts`**

```ts
export interface VehicleSnapshot {
  id: string;
  lat: number;
  lng: number;
  delaySeverity: DelaySeverity;
  mode: TransitMode;
  routeShortName: string;
}
```

- [ ] **Step 2: Update `backend/tests/aggregator.test.ts` to require the new field**

Two changes in this file:

**2a.** The `parseVehicles` full-equality assertion (line ~80) — add `routeShortName`:
```ts
// was:
expect(result[0]).toEqual({ id: 'v1', lat: -36.8, lng: 174.7, delaySeverity: 'amber', mode: 'bus' });
// becomes:
expect(result[0]).toEqual({ id: 'v1', lat: -36.8, lng: 174.7, delaySeverity: 'amber', mode: 'bus', routeShortName: '274' });
```

**2b.** All inline `VehicleSnapshot` literals in the `aggregateScorecard` suite (lines ~177–199, three `it` blocks) — TypeScript now requires the field. Add `routeShortName: 'TEST'` to every one:
```ts
// was:
{ id: '1', lat: 0, lng: 0, delaySeverity: 'green' as const, mode: 'bus' as const },
// becomes:
{ id: '1', lat: 0, lng: 0, delaySeverity: 'green' as const, mode: 'bus' as const, routeShortName: 'TEST' },
```
Apply this to **all** inline vehicle objects in the three `aggregateScorecard` tests (there are 6 objects total across lines ~177–199).

- [ ] **Step 3: Run the tests — expect FAIL on `parseVehicles`**

```bash
cd backend && npm test -- --testPathPattern=aggregator 2>&1 | tail -20
```

Expected: the `parseVehicles` "returns vehicle snapshot with correct mode and severity" test FAILS because the aggregator doesn't populate `routeShortName` yet. All other suites pass.

- [ ] **Step 4: Populate `routeShortName` in `parseVehicles` in `backend/src/poller/aggregator.ts`**

The `routeInfo` lookup is already there — `routeInfo.shortName` is the value to store. Update the `result.push(...)` block:

```ts
result.push({
  id: e.id,
  lat: v.position.latitude,
  lng: v.position.longitude,
  delaySeverity: classifyDelay(delay),
  mode,
  routeShortName: routeInfo.shortName,
});
```

- [ ] **Step 5: Run the tests — expect all PASS**

```bash
cd backend && npm test -- --testPathPattern=aggregator 2>&1 | tail -20
```

Expected output (all suites green):
```
PASS tests/aggregator.test.ts
  classifyDelay         8 passed
  modeFromRouteType     4 passed
  buildTripDelayMap     3 passed
  parseVehicles         7 passed
  parseAlerts           3 passed
  aggregateScorecard    3 passed
  aggregateLeagueTable  4 passed
```

- [ ] **Step 6: Commit**

```bash
git add shared/types.ts backend/src/poller/aggregator.ts backend/tests/aggregator.test.ts
git commit -m "feat: add routeShortName to VehicleSnapshot type and aggregator"
```

---

## Task 2: Add `routeShortName` to mock snapshot

**Files:**
- Modify: `frontend/src/context/mockSnapshot.ts`

- [ ] **Step 1: Add `routeShortName` to all 16 mock vehicles**

Use realistic Auckland route identifiers. Replace the entire `vehicles` array in `frontend/src/context/mockSnapshot.ts`:

```ts
vehicles: [
  // Buses
  { id: 'v1',  lat: -36.850, lng: 174.765, delaySeverity: 'green', mode: 'bus',   routeShortName: '25B' },
  { id: 'v2',  lat: -36.862, lng: 174.771, delaySeverity: 'amber', mode: 'bus',   routeShortName: '70' },
  { id: 'v3',  lat: -36.870, lng: 174.760, delaySeverity: 'red',   mode: 'bus',   routeShortName: '274' },
  { id: 'v4',  lat: -36.855, lng: 174.755, delaySeverity: 'green', mode: 'bus',   routeShortName: 'NX1' },
  { id: 'v5',  lat: -36.878, lng: 174.778, delaySeverity: 'none',  mode: 'bus',   routeShortName: '321' },
  { id: 'v6',  lat: -36.840, lng: 174.740, delaySeverity: 'green', mode: 'bus',   routeShortName: '33' },
  { id: 'v7',  lat: -36.900, lng: 174.790, delaySeverity: 'amber', mode: 'bus',   routeShortName: '380' },
  { id: 'v8',  lat: -36.820, lng: 174.730, delaySeverity: 'green', mode: 'bus',   routeShortName: 'NEX' },
  { id: 'v14', lat: -36.935, lng: 174.856, delaySeverity: 'green', mode: 'bus',   routeShortName: '75' },
  { id: 'v15', lat: -36.915, lng: 174.832, delaySeverity: 'red',   mode: 'bus',   routeShortName: '50' },
  // Trains
  { id: 'v9',  lat: -36.880, lng: 174.752, delaySeverity: 'amber', mode: 'train', routeShortName: 'WEST' },
  { id: 'v10', lat: -36.895, lng: 174.769, delaySeverity: 'green', mode: 'train', routeShortName: 'EAST' },
  { id: 'v11', lat: -36.860, lng: 174.735, delaySeverity: 'red',   mode: 'train', routeShortName: 'SOUTH' },
  { id: 'v16', lat: -36.872, lng: 174.800, delaySeverity: 'green', mode: 'train', routeShortName: 'ONE' },
  // Ferries
  { id: 'v12', lat: -36.843, lng: 174.769, delaySeverity: 'green', mode: 'ferry', routeShortName: 'DEVONPORT' },
  { id: 'v13', lat: -36.830, lng: 174.785, delaySeverity: 'none',  mode: 'ferry', routeShortName: 'WAIHEKE' },
],
```

- [ ] **Step 2: Verify the frontend compiles**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/context/mockSnapshot.ts
git commit -m "feat: add routeShortName to mock snapshot vehicles"
```

---

## Task 3: Shaped markers + click popup in MapPanel

**Files:**
- Modify: `frontend/src/components/MapPanel.tsx`

### Context

The current `MapPanel.tsx` uses `CircleMarker` from react-leaflet — a SVG circle element that cannot be shaped. This task replaces it with `Marker` + `divIcon` (Leaflet's arbitrary-HTML marker system), using inline SVG strings to draw mode-specific shapes. A `<Popup>` component is added alongside the existing `<Tooltip>`.

Key Leaflet APIs:
- `divIcon({ html, className, iconSize, iconAnchor })` — creates an icon from an HTML string. `className: ''` strips Leaflet's default white-background styling. `iconAnchor` is `[x, y]` pixels from the top-left of the icon image to the geographic coordinate — set to `[width/2, height/2]` to centre the shape over the vehicle's position.
- `<Marker position icon>` — react-leaflet component, replaces `<CircleMarker>`.
- `<Popup>` — react-leaflet component, opens on marker click, closes when user clicks elsewhere.

There are only 12 possible `(mode, severity)` combinations. The `makeIcon` helper caches icons in a module-level `Map` so Leaflet doesn't create a new DOM node per vehicle per render.

- [ ] **Step 1: Rewrite `MapPanel.tsx`**

Replace the entire file content:

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

  const icon = divIcon({ html, className: '', iconSize: size, iconAnchor: [size[0] / 2, size[1] / 2] });
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
      />
      {vehicles.map(v => (
        <Marker
          key={v.id}
          position={[v.lat, v.lng]}
          icon={makeIcon(v.mode, v.delaySeverity)}
        >
          <Tooltip>
            {MODE_LABEL[v.mode]} · {v.delaySeverity === 'none' ? 'no delay data' : v.delaySeverity}
          </Tooltip>
          <Popup>
            <div style={{ minWidth: 90 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: SEVERITY_COLOUR[v.delaySeverity] }}>
                {v.routeShortName}
              </div>
              <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
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

- [ ] **Step 2: Verify the frontend compiles**

```bash
cd frontend && npm run build 2>&1 | tail -15
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 3: Run mock preview and verify visually**

```bash
cd frontend && VITE_MOCK=true npm run dev
```

Open `http://localhost:5173` and check:
- Buses appear as small **circles** (14px, coloured by severity)
- Trains appear as slightly larger **rounded squares** (18×18px)
- Ferries appear as slightly larger **triangles** (18px base)
- **Hovering** any marker shows the existing tooltip: e.g. `"Bus · green"`
- **Clicking** any marker opens a popup showing the route short name in bold (coloured by severity) and the mode + status below it, e.g.:
  ```
  25B
  Bus · on time
  ```
  or
  ```
  WEST
  Train · delayed
  ```
- Clicking elsewhere on the map closes the popup

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/MapPanel.tsx
git commit -m "feat: shaped markers (circle/square/triangle) and click popup with route name"
```
