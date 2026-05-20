# Map Brightness + Panel Rebalancing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lighten the map tile brightness and rebalance the right-panel height proportions so the scorecard is taller and service alerts shorter.

**Architecture:** Two independent CSS-only changes — no data logic, no component restructuring. Map brightness uses a Leaflet TileLayer className + CSS filter rule; panel proportions replace fixed/shrink sizing with Tailwind flex weights.

**Tech Stack:** Tailwind CSS arbitrary values (`flex-[N]`), Leaflet CSS, React.

---

## File Map

| File | Change |
|------|--------|
| `frontend/src/components/MapPanel.tsx` | Add `className="brightness-map"` to `<TileLayer>` |
| `frontend/src/index.css` | Add `.brightness-map img { filter: brightness(2.5); }` |
| `frontend/src/components/ScorecardPanel.tsx` | `shrink-0` → `flex-[3] overflow-y-auto` on `<section>` |
| `frontend/src/components/LeagueTablePanel.tsx` | Remove `style={{ maxHeight: '260px' }}`, add `flex-[4]` to `<section>` |
| `frontend/src/components/AlertsPanel.tsx` | `flex-1` → `flex-[3]` on `<section>` |

---

## Task 1: Map tile brightness

**Files:**
- Modify: `frontend/src/components/MapPanel.tsx`
- Modify: `frontend/src/index.css`

No automated tests exist for visual changes. Verify by building and running mock preview.

- [ ] **Step 1: Add `className="brightness-map"` to `<TileLayer>` in `MapPanel.tsx`**

The `<TileLayer>` currently looks like this:
```tsx
<TileLayer
  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  subdomains="abcd"
  maxZoom={20}
/>
```

Add `className="brightness-map"`:
```tsx
<TileLayer
  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  subdomains="abcd"
  maxZoom={20}
  className="brightness-map"
/>
```

- [ ] **Step 2: Add the CSS filter rule to `frontend/src/index.css`**

Append to the end of `frontend/src/index.css`:
```css
.brightness-map img {
  filter: brightness(2.5);
}
```

Leaflet renders each tile as an `<img>` inside the TileLayer container div. The class is on the container; `img` targets the tile images specifically. This keeps the filter off markers, popups, and other overlays.

- [ ] **Step 3: Verify build is clean**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 4: Run mock preview and verify visually**

```bash
cd frontend && VITE_MOCK=true npm run dev
```

Open `http://localhost:5173`. The map tiles should be noticeably lighter than before — roads and districts visible — while still being clearly a dark map. Markers and the popup should be unaffected by the brightness filter.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/MapPanel.tsx frontend/src/index.css
git commit -m "feat: lighten map tiles with brightness(2.5) filter"
```

---

## Task 2: Right panel proportions

**Files:**
- Modify: `frontend/src/components/ScorecardPanel.tsx`
- Modify: `frontend/src/components/LeagueTablePanel.tsx`
- Modify: `frontend/src/components/AlertsPanel.tsx`

Target: Scorecard ~30%, Worst Routes ~40%, Alerts ~30% of the sidebar height (flex weights 3:4:3).

- [ ] **Step 1: Update `ScorecardPanel.tsx`**

Current `<section>` opening tag:
```tsx
<section className="shrink-0 p-4 border-b border-gray-700">
```

Replace with:
```tsx
<section className="flex-[3] overflow-y-auto p-4 border-b border-gray-700">
```

`shrink-0` is removed (no longer needed — flex weight controls height). `overflow-y-auto` is added for safety in case content ever exceeds the allotted space.

- [ ] **Step 2: Update `LeagueTablePanel.tsx`**

Current `<section>` opening tag:
```tsx
<section className="p-4 border-b border-gray-700 overflow-y-auto" style={{ maxHeight: '260px' }}>
```

Replace with:
```tsx
<section className="flex-[4] p-4 border-b border-gray-700 overflow-y-auto">
```

The `style={{ maxHeight: '260px' }}` prop is removed entirely. The flex weight now controls height; `overflow-y-auto` keeps scrolling when the 10-route list is taller than the allotted space.

- [ ] **Step 3: Update `AlertsPanel.tsx`**

Current `<section>` opening tag:
```tsx
<section className="p-4 flex-1 overflow-y-auto">
```

Replace with:
```tsx
<section className="flex-[3] p-4 overflow-y-auto">
```

`flex-1` is equivalent to `flex-[1]` — replacing it with `flex-[3]` gives alerts the same weight as scorecard (3:4:3 total).

- [ ] **Step 4: Verify build is clean**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 5: Run mock preview and verify visually**

```bash
cd frontend && VITE_MOCK=true npm run dev
```

Open `http://localhost:5173`. Check the right panel:
- Scorecard section is taller than before (was a compact ~60px strip, now ~30% of sidebar)
- Worst Routes section is the tallest of the three (~40%)
- Alerts section is shorter than before (was filling all remaining space)
- All three sections scroll independently if their content overflows

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ScorecardPanel.tsx frontend/src/components/LeagueTablePanel.tsx frontend/src/components/AlertsPanel.tsx
git commit -m "feat: rebalance right panel proportions (scorecard 3, routes 4, alerts 3)"
```
