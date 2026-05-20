# Shaped Markers + Click Popup Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each transport mode a distinct marker shape on the map, and show the route short name + delay status when a marker is clicked.

**Architecture:** Pure frontend change for shapes/popup; one small backend-and-shared-types change to thread `routeShortName` through the data pipeline. No API or DynamoDB schema migration needed — the vehicles array in the Snapshot just gains one extra string field per vehicle.

**Tech Stack:** React-Leaflet (`Marker`, `Tooltip`, `Popup`), Leaflet `divIcon` with inline SVG, TypeScript.

---

## Feature 1: Shaped Markers

### Shapes

| Mode  | Shape         | Size     | Notes |
|-------|---------------|----------|-------|
| Bus   | Circle        | 14 px diameter | same visual as today |
| Train | Rounded square | 18 × 18 px (rx 3) | slightly larger |
| Ferry | Triangle      | 18 px base | slightly larger |

Colour is unchanged — still driven by `DelaySeverity` via `SEVERITY_COLOUR`.

### Implementation

Replace `CircleMarker` (SVG circle only) with Leaflet `Marker` + `DivIcon` (arbitrary HTML/SVG).

A `makeIcon(mode: TransitMode, severity: DelaySeverity): L.DivIcon` helper function in `MapPanel.tsx`:
- Builds an inline SVG string matched to the mode
- Wraps it in `L.divIcon({ html, className: '', iconSize, iconAnchor })`
- `iconAnchor` centres the shape over the vehicle's coordinates

No new dependencies — `divIcon` is already part of the `leaflet` package that react-leaflet depends on.

---

## Feature 2: Click Popup

### Interaction model

- **Hover** → existing `<Tooltip>` stays as-is (`"Bus · green"`)
- **Click** → Leaflet `<Popup>` opens above the marker

### Popup content

```
<route short name>        ← bold, coloured by severity
<Mode> · <severity label>  ← muted subtitle
```

Severity label mapping:
- `green` → "on time"
- `amber` → "delayed"
- `red` → "delayed"
- `none` → "no data"

Examples: `"WEST / Train · on time"`, `"25B / Bus · delayed"`, `"DEVONPORT / Ferry · no data"`

### Route short name data

`routeShortName` is already available in `routeInfo.shortName` inside `parseVehicles` — it is used today for the league table. It just needs to be stored in `VehicleSnapshot` and passed through.

---

## Data Changes

### `shared/types.ts`

Add `routeShortName: string` to `VehicleSnapshot`:

```ts
export interface VehicleSnapshot {
  id: string;
  lat: number;
  lng: number;
  delaySeverity: DelaySeverity;
  mode: TransitMode;
  routeShortName: string;   // ← new
}
```

### `backend/src/poller/aggregator.ts`

In `parseVehicles`, add to the pushed object:

```ts
routeShortName: routeInfo.shortName,
```

### `frontend/src/context/mockSnapshot.ts`

Add `routeShortName` to all 16 mock `VehicleSnapshot` objects. Use realistic-looking values: bus routes like `"25B"`, `"70"`, `"NX1"`; train lines like `"WEST"`, `"SOUTH"`; ferry routes like `"DEVONPORT"`, `"WAIHEKE"`.

---

## Files Changed

| File | Change |
|------|--------|
| `shared/types.ts` | Add `routeShortName: string` to `VehicleSnapshot` |
| `backend/src/poller/aggregator.ts` | Populate `routeShortName` in `parseVehicles` |
| `frontend/src/context/mockSnapshot.ts` | Add `routeShortName` to all mock vehicles |
| `frontend/src/components/MapPanel.tsx` | `makeIcon()` helper, `Marker`+`DivIcon` replace `CircleMarker`, add `<Popup>` |

No other files touched. Scorecard, league table, alerts panels are unaffected.

---

## Testing

- `backend/tests/aggregator.test.ts` — update `VehicleSnapshot` expectations to include `routeShortName`
- Manual: run `VITE_MOCK=true npm run dev` in `frontend/`, verify shapes render correctly and click popup shows route name
