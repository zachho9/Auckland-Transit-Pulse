# Scorecard Font Fill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the scorecard percentage numbers scale with viewport height and centre them vertically in the panel so large monitors no longer show blank space below the metrics.

**Architecture:** Two targeted edits to `ScorecardPanel.tsx` — replace the `clamp()` ceiling and swap the section's `overflow-y-auto` for flex centering. No other files change.

**Tech Stack:** Tailwind CSS arbitrary values, CSS `clamp()`, `vh` units.

---

## File Map

| File | Change |
|------|--------|
| `frontend/src/components/ScorecardPanel.tsx` | Raise clamp ceiling; add vertical centering to section |

---

## Task 1: Update ScorecardPanel layout and font size

**Files:**
- Modify: `frontend/src/components/ScorecardPanel.tsx`

> No automated tests exist for visual frontend components. Verification is a TypeScript build check followed by visual inspection in mock mode.

- [ ] **Step 1: Open the file**

Full current content of `frontend/src/components/ScorecardPanel.tsx` for reference:

```tsx
import { useSnapshot } from '../context/SnapshotContext';
import type { TransitMode } from 'shared/types';

const MODE_LABELS: Record<TransitMode, string> = {
  bus: 'Bus',
  train: 'Train',
  ferry: 'Ferry',
};

function pctColour(pct: number): string {
  if (pct >= 90) return 'text-green-400';
  if (pct >= 75) return 'text-amber-400';
  return 'text-red-400';
}

export function ScorecardPanel() {
  const { snapshot } = useSnapshot();
  const modes: TransitMode[] = ['bus', 'train', 'ferry'];

  return (
    <section className="flex-[3] overflow-y-auto p-4 border-b border-gray-700">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
        Network Scorecard
      </h2>
      <div className="flex justify-between gap-2">
        {modes.map(mode => {
          const stats = snapshot?.scorecard[mode];
          const pct = stats?.percentOnTime ?? 0;
          return (
            <div key={mode} className="flex-1 text-center">
              <div className={`text-[clamp(1.5rem,2.2vh,2rem)] font-bold ${stats ? pctColour(pct) : 'text-gray-600'}`}>
                {stats ? `${pct}%` : '—'}
              </div>
              <div className="text-xs text-gray-400 mt-1">{MODE_LABELS[mode]}</div>
              {stats && (
                <div className="text-xs text-gray-500">{stats.active} active</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Apply both changes**

Replace the entire file with:

```tsx
import { useSnapshot } from '../context/SnapshotContext';
import type { TransitMode } from 'shared/types';

const MODE_LABELS: Record<TransitMode, string> = {
  bus: 'Bus',
  train: 'Train',
  ferry: 'Ferry',
};

function pctColour(pct: number): string {
  if (pct >= 90) return 'text-green-400';
  if (pct >= 75) return 'text-amber-400';
  return 'text-red-400';
}

export function ScorecardPanel() {
  const { snapshot } = useSnapshot();
  const modes: TransitMode[] = ['bus', 'train', 'ferry'];

  return (
    <section className="flex-[3] flex flex-col justify-center p-4 border-b border-gray-700">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
        Network Scorecard
      </h2>
      <div className="flex justify-between gap-2">
        {modes.map(mode => {
          const stats = snapshot?.scorecard[mode];
          const pct = stats?.percentOnTime ?? 0;
          return (
            <div key={mode} className="flex-1 text-center">
              <div className={`text-[clamp(1.5rem,5vh,5rem)] font-bold ${stats ? pctColour(pct) : 'text-gray-600'}`}>
                {stats ? `${pct}%` : '—'}
              </div>
              <div className="text-xs text-gray-400 mt-1">{MODE_LABELS[mode]}</div>
              {stats && (
                <div className="text-xs text-gray-500">{stats.active} active</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

Diff summary:
- Line 21: `overflow-y-auto` removed, `flex flex-col justify-center` added
- Line 31: `clamp(1.5rem,2.2vh,2rem)` → `clamp(1.5rem,5vh,5rem)`

- [ ] **Step 3: Verify the build is clean**

```bash
cd /e/Coding/Auckland-Transit-Pulse/frontend && npm run build 2>&1 | tail -8
```

Expected: `✓ built in X.XXs` with no errors. If Tailwind errors on the clamp value, confirm there are no spaces inside the brackets.

- [ ] **Step 4: Verify visually in mock mode**

```bash
cd /e/Coding/Auckland-Transit-Pulse/frontend && VITE_MOCK=true npm run dev
```

Open `http://localhost:5173`. Check:
- The three percentage numbers (Bus / Train / Ferry) are noticeably larger than before
- Resize the browser window taller — numbers grow; shorter — numbers shrink
- The heading + numbers block is vertically centred in the scorecard panel (blank space above and below, not just below)
- Other panels (Worst Routes, Alerts) are unaffected

- [ ] **Step 5: Commit**

```bash
cd /e/Coding/Auckland-Transit-Pulse && git add frontend/src/components/ScorecardPanel.tsx && git commit -m "feat: fill scorecard panel with responsive font and vertical centering"
```
