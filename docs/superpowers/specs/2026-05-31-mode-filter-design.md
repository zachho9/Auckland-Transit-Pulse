# Mode Filter Design

## Overview

Add independent toggle buttons to the map so users can show or hide buses, trains, and ferries.

## Behaviour

- Three toggles: **Bus**, **Train**, **Ferry** — each independently on or off
- Default state: all three on (all vehicles visible)
- When a mode is toggled off, its vehicles fade to 0.15 opacity (same mechanic as the existing route filter)
- When all three are off, all vehicles are hidden (no "show all" fallback)
- Mode filter and route filter are additive — a vehicle fades out if either filter excludes it

## Components

### `ModeFilterBar` (new — `frontend/src/components/ModeFilterBar.tsx`)

**Props:**
- `activeModes: Set<TransitMode>`
- `onToggle: (mode: TransitMode) => void`

**Renders:** Three buttons — Bus, Train, Ferry — in the existing dark gray pill style matching `RouteSearchOverlay`. Active buttons are fully opaque; inactive buttons are dimmed/muted. Clicking a button calls `onToggle` with that mode.

### `MapPanel` (modified — `frontend/src/components/MapPanel.tsx`)

**New state:**
```tsx
const [activeModes, setActiveModes] = useState<Set<TransitMode>>(
  new Set(['bus', 'train', 'ferry'])
);
```

**Toggle handler:**
```tsx
function toggleMode(mode: TransitMode) {
  setActiveModes(prev => {
    const next = new Set(prev);
    next.has(mode) ? next.delete(mode) : next.add(mode);
    return next;
  });
}
```

**Updated opacity expression** — vehicle fades out if route filter excludes it OR its mode is inactive:
```tsx
opacity={
  (routeFilter && v.routeShortName !== routeFilter) || !activeModes.has(v.mode)
    ? 0.15
    : 1
}
```

**Layout update** — top-right overlay becomes a flex column:
```tsx
<div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
  <RouteSearchOverlay options={routeOptions} onSelect={setRouteFilter} />
  <ModeFilterBar activeModes={activeModes} onToggle={toggleMode} />
</div>
```

## Files Affected

- Create: `frontend/src/components/ModeFilterBar.tsx`
- Modify: `frontend/src/components/MapPanel.tsx`
