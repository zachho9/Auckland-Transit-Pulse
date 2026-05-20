# Route Search Overlay Design

**Goal:** Let users type a route number into a floating search box on the map, pick an exact match from a dropdown, and dim all non-matching vehicles to reveal only the selected route.

**Architecture:** New `RouteSearchOverlay` component sits as an absolute-positioned element in the top-right corner of the map. `routeFilter` state lives in `MapPanel` — no new context needed since both the overlay and marker rendering are in the same component tree.

**Tech Stack:** React `useState`, Tailwind CSS, Leaflet Marker `opacity` prop.

---

## Components

### New: `frontend/src/components/RouteSearchOverlay.tsx`

Props:
```ts
interface Props {
  options: string[];                       // unique routeShortNames from live vehicles
  onSelect: (route: string | null) => void;
}
```

Behaviour:
- Text input. As the user types, filters `options` by case-insensitive prefix match.
- Dropdown shows up to 8 matching route short names below the input.
- Clicking a dropdown option calls `onSelect(route)` and closes the dropdown.
- A clear (×) button appears in the input whenever there is any text (before or after selection); clicking it calls `onSelect(null)` and clears the text.
- Dark-themed (bg-gray-800, border-gray-700, text-white) to match the app.

### Modified: `frontend/src/components/MapPanel.tsx`

Changes:
1. Add state: `const [routeFilter, setRouteFilter] = useState<string | null>(null);`
2. Derive sorted unique route options: `const routeOptions = [...new Set(vehicles.map(v => v.routeShortName))].sort();`
3. Wrap `MapContainer` in a `relative` div and place `RouteSearchOverlay` as an absolute-positioned child in the top-right corner (above the map layer, `z-[1000]`).
4. Apply `opacity` to each Marker:
   ```tsx
   opacity={routeFilter && v.routeShortName !== routeFilter ? 0.15 : 1}
   ```

---

## Layout

```
┌─────────────────────────────────────┐
│  Map (dark tiles)      [ 🔍 274  × ]│  ← RouteSearchOverlay, top-right
│                           ┌────────┐│
│                           │ 274    ││
│                           │ 274X   ││  ← dropdown (while typing)
│                           └────────┘│
│  ○ ○ ■ △  (vehicles, non-274 dimmed)│
└─────────────────────────────────────┘
```

Zoom controls remain in the top-left (Leaflet default). Search sits top-right to avoid conflict.

---

## State Flow

```
RouteSearchOverlay
  onSelect(route) ──→ MapPanel.routeFilter
                               │
                               ↓
               vehicles: opacity 1 (match) or 0.15 (no match)
```

---

## What does NOT change

- Sidebar panels (scorecard, worst routes, alerts): unchanged — they show global network stats regardless of the map filter
- Backend, `shared/types.ts`, `SnapshotContext`: unchanged
- Marker shapes and colours (severity colouring): unchanged — only opacity is affected

---

## Testing

Manual only:

1. Run `VITE_MOCK=true npm run dev` in `frontend/`
2. Open `http://localhost:5173`
3. Click the search box (top-right of map) — verify it appears above the map tiles
4. Type "27" — dropdown shows matching routes (e.g. "274")
5. Click "274" — non-274 vehicles dim to 15% opacity, 274 vehicles remain bright
6. Click × — all vehicles return to full opacity, input clears
7. Verify zoom controls (top-left) are unaffected
