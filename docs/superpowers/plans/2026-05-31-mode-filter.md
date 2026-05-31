# Mode Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add independent Bus / Train / Ferry toggle buttons to the map so users can show or hide each vehicle mode.

**Architecture:** A new `ModeFilterBar` component renders three toggle buttons and is owned by `MapPanel`, which holds `activeModes: Set<TransitMode>` state. Vehicle opacity is determined by both the existing route filter and the new mode filter — a vehicle fades out if either excludes it.

**Tech Stack:** React, TypeScript, Tailwind CSS, react-leaflet

---

### Task 1: Create ModeFilterBar component

**Files:**
- Create: `frontend/src/components/ModeFilterBar.tsx`

No frontend test suite exists — verify visually in Task 2.

- [ ] **Step 1: Create `frontend/src/components/ModeFilterBar.tsx` with this exact content**

```tsx
import type { TransitMode } from 'shared/types';

const MODES: TransitMode[] = ['bus', 'train', 'ferry'];

const MODE_LABELS: Record<TransitMode, string> = {
  bus: 'Bus',
  train: 'Train',
  ferry: 'Ferry',
};

interface Props {
  activeModes: Set<TransitMode>;
  onToggle: (mode: TransitMode) => void;
}

export function ModeFilterBar({ activeModes, onToggle }: Props) {
  return (
    <div className="flex gap-1.5 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 shadow-lg">
      {MODES.map(mode => (
        <button
          key={mode}
          onClick={() => onToggle(mode)}
          className={`text-xs px-2 py-0.5 rounded transition-opacity ${
            activeModes.has(mode)
              ? 'text-white opacity-100'
              : 'text-gray-500 opacity-40'
          }`}
        >
          {MODE_LABELS[mode]}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd E:\Coding\Auckland-Transit-Pulse\frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ModeFilterBar.tsx
git commit -m "feat: add ModeFilterBar component"
```

---

### Task 2: Wire ModeFilterBar into MapPanel

**Files:**
- Modify: `frontend/src/components/MapPanel.tsx`

- [ ] **Step 1: Add the ModeFilterBar import**

After line 5 (`import { RouteSearchOverlay } from './RouteSearchOverlay';`), add:

```tsx
import { ModeFilterBar } from './ModeFilterBar';
```

- [ ] **Step 2: Add `activeModes` state inside `MapPanel`**

After line 68 (`const [pinnedId, setPinnedId] = useState<string | null>(null);`), add:

```tsx
const [activeModes, setActiveModes] = useState<Set<TransitMode>>(
  new Set(['bus', 'train', 'ferry'])
);
```

- [ ] **Step 3: Add `toggleMode` handler inside `MapPanel`**

After the `routeOptions` useMemo block (after line 73), add:

```tsx
function toggleMode(mode: TransitMode) {
  setActiveModes(prev => {
    const next = new Set(prev);
    next.has(mode) ? next.delete(mode) : next.add(mode);
    return next;
  });
}
```

- [ ] **Step 4: Update the vehicle opacity expression**

Replace line 96:
```tsx
opacity={routeFilter && v.routeShortName !== routeFilter ? 0.15 : 1}
```
with:
```tsx
opacity={
  (routeFilter && v.routeShortName !== routeFilter) || !activeModes.has(v.mode)
    ? 0.15
    : 1
}
```

- [ ] **Step 5: Update the overlay div and add ModeFilterBar**

Replace lines 120–122:
```tsx
<div className="absolute top-4 right-4 z-[1000]">
  <RouteSearchOverlay options={routeOptions} onSelect={setRouteFilter} />
</div>
```
with:
```tsx
<div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
  <RouteSearchOverlay options={routeOptions} onSelect={setRouteFilter} />
  <ModeFilterBar activeModes={activeModes} onToggle={toggleMode} />
</div>
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd E:\Coding\Auckland-Transit-Pulse\frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Manual verification**

Start the dev server:
```bash
cd E:\Coding\Auckland-Transit-Pulse\frontend && npm run dev
```

Check each behaviour:
1. On load — all three buttons (Bus, Train, Ferry) appear below the search box, all fully bright
2. Click "Bus" → bus markers fade to 0.15 opacity; train and ferry remain fully visible; Bus button dims
3. Click "Bus" again → bus markers restore to full opacity; button re-brightens
4. Toggle off all three → all markers faded; map appears empty
5. Toggle one back on → only that mode's markers are visible
6. With a mode filtered off, use the route search to filter a route — both filters apply simultaneously (a vehicle must pass both to be fully visible)

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/MapPanel.tsx
git commit -m "feat: wire mode filter into MapPanel"
```
