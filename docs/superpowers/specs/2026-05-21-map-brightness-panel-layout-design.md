# Map Brightness + Panel Rebalancing Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lighten the map tile brightness and rebalance the right-panel height proportions so the scorecard gets more space and service alerts less.

**Architecture:** Two pure CSS/Tailwind changes — no data logic, no component restructuring. Map brightness is a CSS filter scoped to tile images; panel proportions are a flex weight adjustment.

**Tech Stack:** Tailwind CSS, Leaflet CSS, React inline styles.

---

## Change 1: Map Tile Brightness

### Problem
The current CARTO Dark All tile (`dark_all`) is near-black, making it hard to distinguish districts and roads.

### Solution
Apply `filter: brightness(2.5)` to the tile images via a CSS class on the `TileLayer`.

### Implementation

**`frontend/src/components/MapPanel.tsx`** — add `className="brightness-map"` to `<TileLayer>`:

```tsx
<TileLayer
  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
  attribution='...'
  subdomains="abcd"
  maxZoom={20}
  className="brightness-map"
/>
```

**`frontend/src/index.css`** — add rule targeting tile `<img>` children:

```css
.brightness-map img {
  filter: brightness(2.5);
}
```

Leaflet renders each tile as an `<img>` tag inside the TileLayer container div. The class is applied to the container; `img` children inherit the filter. Scoping to `.brightness-map img` prevents the filter from affecting markers, popups, or other map overlays.

---

## Change 2: Right Panel Proportions

### Problem
The current layout gives `ScorecardPanel` only its natural height (~60px, `shrink-0`), `LeagueTablePanel` a fixed cap of 260px, and `AlertsPanel` all remaining space (`flex-1`). This under-represents the scorecard and over-allocates space to alerts.

### Target proportions (Option B)
- Scorecard: ~28% of panel height
- Worst Routes: ~42% of panel height
- Alerts: ~30% of panel height

### Implementation

**`frontend/src/components/ScorecardPanel.tsx`** — replace `shrink-0` with `flex-[3]` and add `overflow-y-auto` on the `<section>`:

```tsx
<section className="flex-[3] overflow-y-auto p-4 border-b border-gray-700">
```

**`frontend/src/components/LeagueTablePanel.tsx`** — replace the fixed `maxHeight: 260px` inline style with `flex-[4]` on the `<section>`. Keep `overflow-y-auto`:

```tsx
<section className="flex-[4] p-4 border-b border-gray-700 overflow-y-auto">
```

(Remove the `style={{ maxHeight: '260px' }}` prop entirely.)

**`frontend/src/components/AlertsPanel.tsx`** — replace `flex-1` with `flex-[3]`. Keep `overflow-y-auto`:

```tsx
<section className="flex-[3] p-4 overflow-y-auto">
```

**`frontend/src/App.tsx`** — no change needed. The `<aside>` is already `flex flex-col overflow-hidden`.

### Flex weight rationale
`flex-[3]` / `flex-[4]` / `flex-[3]` = 3:4:3 = 30% / 40% / 30% — matches the visually selected Option B proportions.

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/components/MapPanel.tsx` | Add `className="brightness-map"` to `TileLayer` |
| `frontend/src/index.css` | Add `.brightness-map img { filter: brightness(2.5); }` |
| `frontend/src/components/ScorecardPanel.tsx` | `shrink-0` → `flex-[3] overflow-y-auto` |
| `frontend/src/components/LeagueTablePanel.tsx` | Remove `style={{ maxHeight: '260px' }}`, add `flex-[4]` |
| `frontend/src/components/AlertsPanel.tsx` | `flex-1` → `flex-[3]` |

No backend changes. No shared type changes. No new dependencies.

---

## Testing

Manual only (visual changes):
- Run `VITE_MOCK=true npm run dev` in `frontend/`
- Verify map tiles are visibly lighter (not near-black)
- Verify scorecard panel is taller than before
- Verify alerts panel is shorter than before
- Verify all three panels still scroll if content overflows their allotted height
- Verify no layout breakage at 1280px minimum width
