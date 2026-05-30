# Marker Hover & Pin Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Tooltip + Popup pattern on map markers with a unified tooltip that shows rich content on hover and stays pinned on click.

**Architecture:** Add `pinnedId` state to `MapPanel`. Each marker renders a single `<Tooltip>` with a `key` prop that forces remount when pin state changes, ensuring Leaflet picks up the `permanent` flag correctly. A `MapClickHandler` component uses `useMapEvents` to clear the pin when the map background is clicked.

**Tech Stack:** React, react-leaflet v4, Leaflet, Tailwind CSS

---

### Task 1: Add dark-theme Leaflet tooltip CSS

**Files:**
- Modify: `frontend/src/index.css`

No automated tests exist for CSS — verify visually in Task 2.

- [ ] **Step 1: Add tooltip overrides to `frontend/src/index.css`**

Append after the existing `.leaflet-popup-content-wrapper` block:

```css
/* Dark-theme overrides for Leaflet tooltips */
.leaflet-tooltip {
  background: #1f2937;
  color: #f3f4f6;
  border: 1px solid #374151;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
  padding: 6px 8px;
}

.leaflet-tooltip-top::before {
  border-top-color: #1f2937;
}
.leaflet-tooltip-bottom::before {
  border-bottom-color: #1f2937;
}
.leaflet-tooltip-left::before {
  border-left-color: #1f2937;
}
.leaflet-tooltip-right::before {
  border-right-color: #1f2937;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/index.css
git commit -m "style: add dark-theme overrides for Leaflet tooltips"
```

---

### Task 2: Update MapPanel — pin state, MapClickHandler, upgraded tooltips

**Files:**
- Modify: `frontend/src/components/MapPanel.tsx`

No frontend test suite exists — verify manually using the steps at the end of this task.

- [ ] **Step 1: Update imports**

Replace the top import block in `frontend/src/components/MapPanel.tsx`:

```tsx
import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents } from 'react-leaflet';
import { divIcon, DomEvent } from 'leaflet';
import { useSnapshot } from '../context/SnapshotContext';
import { RouteSearchOverlay } from './RouteSearchOverlay';
import type { DelaySeverity, TransitMode } from 'shared/types';
import 'leaflet/dist/leaflet.css';
```

Changes from current:
- `Popup` removed from the react-leaflet import
- `useMapEvents` added to the react-leaflet import
- `DomEvent` added to the leaflet import

- [ ] **Step 2: Add `MapClickHandler` component**

Add this function directly above the `MapPanel` function export (after the `_iconCache` block):

```tsx
function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({ click: onMapClick });
  return null;
}
```

- [ ] **Step 3: Add `pinnedId` state inside `MapPanel`**

Inside `MapPanel`, after the existing `const [routeFilter, setRouteFilter] = useState<string | null>(null);` line, add:

```tsx
const [pinnedId, setPinnedId] = useState<string | null>(null);
```

- [ ] **Step 4: Add `MapClickHandler` inside `MapContainer`**

Inside `<MapContainer>`, add `<MapClickHandler>` immediately after `<TileLayer>`:

```tsx
<MapClickHandler onMapClick={() => setPinnedId(null)} />
```

- [ ] **Step 5: Replace each marker's `<Tooltip>` and `<Popup>` with the upgraded tooltip**

Replace the entire `<Marker>` JSX block (currently lines 84–105) with:

```tsx
{vehicles.map(v => (
  <Marker
    key={v.id}
    position={[v.lat, v.lng]}
    icon={makeIcon(v.mode, v.delaySeverity)}
    opacity={routeFilter && v.routeShortName !== routeFilter ? 0.15 : 1}
    eventHandlers={{
      click: (e) => {
        DomEvent.stopPropagation(e);
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
```

Note: the `key` on `<Tooltip>` changes between `'pinned'` and `'hover'` when pin state toggles. This forces react-leaflet to unmount and remount the Leaflet Tooltip instance so the `permanent` option is applied at construction time (Leaflet does not update `permanent` dynamically after creation).

- [ ] **Step 6: Manual verification**

Start the dev server:
```bash
cd frontend && npm run dev
```

Check each behaviour:
1. Hover a marker → dark card appears with route name + mode · severity; disappears on mouse leave
2. Click a marker → card stays after mouse leaves (pinned)
3. Hover a different marker while one is pinned → second card appears ephemerally; pinned card stays
4. Click the pinned marker again → card disappears (toggle off)
5. Click a different marker while one is pinned → old card disappears, new one pins
6. Click the map background → pinned card disappears

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/MapPanel.tsx
git commit -m "feat: replace popup with hover/pin tooltip on map markers"
```
