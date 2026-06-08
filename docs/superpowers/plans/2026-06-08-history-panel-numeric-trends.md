# HistoryPanel Numeric Trends Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two `LineChart`-based trend panels in `HistoryPanel.tsx` ("On-time % by mode" and "Network avg delay (min)") with compact numeric readouts showing the latest day's value plus a colour-coded trend vs. the previous day, and shorten all three panel subtitles.

**Architecture:** Single-file change to `frontend/src/components/HistoryPanel.tsx`. No backend changes — `/history` already returns the last 7 days of `DailyStats`, oldest→newest, which is all the new display needs (`latest = history[history.length - 1]`, `previousDay = history[history.length - 2]`). A small `getTrend` helper computes `{ symbol, label, colour }` for any metric, parameterised by whether higher values are "good" (on-time %) or "bad" (delay), reusing the file's existing `CHART_COLOURS.bus` (green) and `DELAY_COLOUR` (red) constants so no new colour values are introduced.

**Tech Stack:** React + TypeScript, inline styles using the project's existing CSS custom properties (`var(--text-muted)`, `var(--text-primary)`, etc.) and `'Barlow Condensed'` font convention for headline numeric values (matches `ScorecardPanel.tsx`).

---

## Reference: design spec

Full design rationale is in `docs/superpowers/specs/2026-06-08-history-panel-numeric-trends-design.md`. This plan implements that spec exactly.

## Reference: current file layout (before changes)

`frontend/src/components/HistoryPanel.tsx` currently has, in order:
1. `recharts` import (lines 1-4)
2. `MOCK_HISTORY` mock data (lines 10-18)
3. `CHART_COLOURS` / `DELAY_COLOUR` constants (lines 20-21)
4. `chartLabel` helper (lines 23-25) — formats a date as `MM-DD` for chart x-axes
5. `HistoryPanel` component:
   - loading/failed/empty states (lines 39-61)
   - `onTimeData` derivation (lines 63-68) — feeds the on-time `LineChart`
   - `delayData` derivation (lines 70-73) — feeds the delay `LineChart`
   - `offenderTotals`/`topOffenders` derivation (lines 75-86) — feeds the worst-routes list (**unchanged** by this plan)
   - `tooltipStyle` (lines 88-94) — shared style object for both `LineChart` tooltips
   - JSX: "On-time % by mode" subtitle + `LineChart` (lines 98-111), "Network avg delay (min)" subtitle + `LineChart` (lines 113-123), "Chronic worst routes (7-day)" subtitle + list (lines 125-140)

After this plan, `chartLabel`, `tooltipStyle`, and the `recharts` import are fully removed (nothing else in the file uses them once both charts are gone), `CHART_COLOURS` and `DELAY_COLOUR` are kept and reused by the new numeric display, and `onTimeData`/`delayData` are replaced by `latest`/`previousDay`/`delayValue`/`delayTrend`.

---

### Task 1: Add `getTrend` helper and replace the "On-time % by mode" chart

**Files:**
- Modify: `frontend/src/components/HistoryPanel.tsx`

- [ ] **Step 1: Add the `getTrend` helper function**

In `frontend/src/components/HistoryPanel.tsx`, immediately after the `chartLabel` function (after line 25, before the blank line preceding `export function HistoryPanel()`), add:

```tsx
type Trend = { symbol: string; label: string; colour: string };

function getTrend(current: number, previous: number | undefined, higherIsBetter: boolean): Trend {
  if (previous === undefined) {
    return { symbol: '▬', label: '', colour: 'var(--text-muted)' };
  }
  const delta = Math.round((current - previous) * 10) / 10;
  if (delta === 0) {
    return { symbol: '▬', label: '0', colour: 'var(--text-muted)' };
  }
  const isGood = higherIsBetter ? delta > 0 : delta < 0;
  return {
    symbol: delta > 0 ? '▲' : '▼',
    label: delta > 0 ? `+${delta}` : `${delta}`,
    colour: isGood ? CHART_COLOURS.bus : DELAY_COLOUR,
  };
}
```

This is the shared trend calculation used by both the on-time-by-mode columns (Task 1) and the avg-delay readout (Task 2): `higherIsBetter: true` for on-time % (up = green), `higherIsBetter: false` for delay (down = green). `current`/`previous` come straight from `DailyStats` fields; `previous === undefined` covers the single-day-of-history edge case (renders a flat dash with no delta).

- [ ] **Step 2: Replace the `onTimeData` derivation with `latest`/`previousDay`**

Find this block (`HistoryPanel.tsx:63-68`):

```tsx
  const onTimeData = history.map(d => ({
    date: chartLabel(d.date),
    bus:   d.onTimePercent.bus,
    train: d.onTimePercent.train,
    ferry: d.onTimePercent.ferry,
  }));
```

Replace it with:

```tsx
  const latest = history[history.length - 1];
  const previousDay = history.length > 1 ? history[history.length - 2] : undefined;
```

(`history` is ordered oldest→newest per `readHistory` in `backend/src/api/dynamoReader.ts:17-36`, and `HistoryPanel` already guards against an empty array via the `history.length === 0` early return above this line, so `latest` is always defined here.)

- [ ] **Step 3: Replace the "On-time % by mode" chart JSX with the numeric 3-column layout**

Find this block (`HistoryPanel.tsx:98-111`):

```tsx
      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
        On-time % by mode
      </p>
      <ResponsiveContainer width="100%" height={90}>
        <LineChart data={onTimeData} margin={{ top: 2, right: 8, left: -28, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '0.65rem', paddingTop: 2 }} />
          <Line type="monotone" dataKey="bus"   stroke={CHART_COLOURS.bus}   dot={false} strokeWidth={1.5} />
          <Line type="monotone" dataKey="train" stroke={CHART_COLOURS.train} dot={false} strokeWidth={1.5} />
          <Line type="monotone" dataKey="ferry" stroke={CHART_COLOURS.ferry} dot={false} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
```

Replace it with:

```tsx
      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
        On-time by mode
      </p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {(['bus', 'train', 'ferry'] as const).map(mode => {
          const trend = getTrend(latest.onTimePercent[mode], previousDay?.onTimePercent[mode], true);
          return (
            <div key={mode} style={{ flex: 1, textAlign: 'center' }}>
              <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'capitalize', margin: '0 0 0.2rem' }}>
                {mode}
              </p>
              <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, color: CHART_COLOURS[mode], margin: 0, lineHeight: 1 }}>
                {latest.onTimePercent[mode]}%
              </p>
              <p style={{ fontSize: '0.66rem', color: trend.colour, margin: '0.2rem 0 0' }}>
                {trend.symbol} {trend.label}
              </p>
            </div>
          );
        })}
      </div>
```

- [ ] **Step 4: Type-check the file**

Run from `frontend/`:
```bash
npx tsc --noEmit
```

Expected: **no errors**. At this point `onTimeData` has been fully removed and replaced (nothing references it anymore), while `delayData`, `chartLabel`, `tooltipStyle`, and the `recharts` import are all still actively used by the still-present "Network avg delay" `LineChart` — so nothing should be flagged as unused yet. If you see any error, it will name the problem identifier (most likely a typo in `latest`, `previousDay`, `getTrend`, or a `mode`/`CHART_COLOURS[mode]` type mismatch) — fix it before proceeding. (The `delayData`/`chartLabel`/`tooltipStyle`/`recharts` cleanup happens in Task 2, once the second chart is also removed and they genuinely become unused.)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/HistoryPanel.tsx
git commit -m "$(cat <<'EOF'
refactor: replace on-time-by-mode trend chart with numeric readout

Shows the latest day's on-time % per mode plus a colour-coded trend
arrow vs. the previous day, instead of a 7-day line chart — easier to
scan at a glance in the sidebar.
EOF
)"
```

---

### Task 2: Replace the "Network avg delay (min)" chart, remove now-unused chart infrastructure, and shorten remaining subtitles

**Files:**
- Modify: `frontend/src/components/HistoryPanel.tsx`

- [ ] **Step 1: Replace the `delayData` derivation with `delayValue`/`delayTrend`**

Find this block (`HistoryPanel.tsx:70-73`):

```tsx
  const delayData = history.map(d => ({
    date:  chartLabel(d.date),
    delay: Math.round(d.avgDelayMinutes * 10) / 10,
  }));
```

Replace it with:

```tsx
  const delayValue = Math.round(latest.avgDelayMinutes * 10) / 10;
  const delayTrend = getTrend(latest.avgDelayMinutes, previousDay?.avgDelayMinutes, false);
```

(`higherIsBetter: false` here — a falling delay is the "good" direction, so `getTrend` colours a negative delta green and a positive delta red, the opposite of the on-time-% case.)

- [ ] **Step 2: Replace the "Network avg delay (min)" chart JSX with the numeric readout**

Find this block (`HistoryPanel.tsx:113-123`):

```tsx
      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: '0.6rem 0 0.4rem' }}>
        Network avg delay (min)
      </p>
      <ResponsiveContainer width="100%" height={70}>
        <LineChart data={delayData} margin={{ top: 2, right: 8, left: -28, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} />
          <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="delay" stroke={DELAY_COLOUR} dot={false} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
```

Replace it with:

```tsx
      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: '0.6rem 0 0.4rem' }}>
        Avg delay
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
          {delayValue} min
        </span>
        <span style={{ fontSize: '0.66rem', color: delayTrend.colour }}>
          {delayTrend.symbol} {delayTrend.label}
        </span>
      </div>
```

- [ ] **Step 3: Shorten the "Chronic worst routes (7-day)" subtitle**

Find (`HistoryPanel.tsx:128`, inside the worst-routes block — the list rendering itself is unchanged):

```tsx
            Chronic worst routes (7-day)
```

Replace with:

```tsx
            Worst routes
```

- [ ] **Step 4: Remove `tooltipStyle` (now unused — both charts that referenced it are gone)**

Find and delete this block (originally `HistoryPanel.tsx:88-94`, now shifted up by the Task 1 edits — locate it by content, it sits between the `offenderTotals`/`topOffenders` block and the `return` statement):

```tsx
  const tooltipStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-col)',
    borderRadius: 4,
    fontSize: '0.7rem',
    color: 'var(--text-primary)',
  };

```

- [ ] **Step 5: Remove the now-unused `chartLabel` helper**

Find and delete this block (originally `HistoryPanel.tsx:23-25`):

```tsx
function chartLabel(date: string): string {
  return date.slice(5); // "MM-DD"
}

```

(`chartLabel` was only ever called from `onTimeData`/`delayData`, both now gone.)

- [ ] **Step 6: Remove the now-unused `recharts` import**

Find and delete this block (`HistoryPanel.tsx:1-4`):

```tsx
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
```

(Nothing in the file references `LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`, or `Legend` anymore — both charts are gone.)

- [ ] **Step 7: Type-check the file**

Run from `frontend/`:
```bash
npx tsc --noEmit
```

Expected: **no errors**. This confirms `chartLabel`, `tooltipStyle`, `delayData`, and the `recharts` import are fully gone with nothing left referencing them, and that `delayValue`/`delayTrend`/`latest`/`previousDay`/`getTrend` all type-check correctly. If anything still references a removed identifier, the compiler will name it — fix and re-run.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/HistoryPanel.tsx
git commit -m "$(cat <<'EOF'
refactor: replace avg-delay trend chart with numeric readout, trim subtitles

Shows the latest day's avg network delay plus a colour-coded trend vs.
the previous day instead of a 7-day line chart, drops the now-unused
recharts import and chart helpers, and shortens all three panel
subtitles ("On-time by mode", "Avg delay", "Worst routes") since the
parent section is already titled "7-Day Trends" and the values now
carry their own units.
EOF
)"
```

---

### Task 3: Manual verification in the browser

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server in mock mode**

From `frontend/`:
```bash
npm run dev -- --mode mock
```

If there's no `mock` Vite mode configured, instead set the env var directly so `HistoryPanel` uses `MOCK_HISTORY` (check `frontend/.env*` for the existing convention — `VITE_MOCK=true` is read at `HistoryPanel.tsx:7`):
```bash
VITE_MOCK=true npm run dev
```

- [ ] **Step 2: Open the app and expand "7-Day Trends"**

Navigate to the printed local URL (typically `http://localhost:5173`), open the sidebar section titled **"7-Day Trends"**, and confirm `HistoryPanel` renders.

- [ ] **Step 3: Verify the "On-time by mode" panel**

Using `MOCK_HISTORY` (`HistoryPanel.tsx:10-18`), the latest entry is `2026-06-04` (`bus: 84, train: 71, ferry: 97`) and the previous is `2026-06-03` (`bus: 86, train: 73, ferry: 99`). Confirm:
- Subtitle reads "On-time by mode"
- Three columns (Bus, Train, Ferry), each showing the mode's percentage in its chart-legend colour (bus green `#22c55e`, train amber `#f59e0b`, ferry blue `#60a5fa`)
- Bus shows `84%` with `▼ -2` in red (`#ef4444` — on-time % fell, which is bad)
- Train shows `71%` with `▼ -2` in red
- Ferry shows `97%` with `▼ -2` in red
- All three exercise the "down = bad = red" branch; to see the "up = good = green" branch, temporarily edit the last `MOCK_HISTORY` entry's `onTimePercent` values to be higher than the second-to-last entry's, reload, confirm `▲ +N` renders in green (`#22c55e`), then revert the edit

- [ ] **Step 4: Verify the "Avg delay" panel**

Latest `avgDelayMinutes` is `4.0`, previous is `3.5`. Confirm:
- Subtitle reads "Avg delay"
- Value shows `4 min` (whole-number minutes render without a trailing `.0` — same `Math.round(x * 10) / 10` expression the original chart used, so this matches prior behaviour)
- Trend shows `▲ +0.5` in red (`#ef4444` — delay rose, which is bad)
- To see the "down = good = green" branch, temporarily edit the last entry's `avgDelayMinutes` to be lower than the second-to-last entry's, reload, confirm `▼ -N` renders in green, then revert

- [ ] **Step 5: Verify the "Worst routes" panel is unchanged apart from its subtitle**

Confirm the subtitle reads "Worst routes" and the ranked list of routes with "`{total}× in top 10`" still renders exactly as before (this panel's logic was not touched).

- [ ] **Step 6: Verify dark-theme contrast**

Confirm the muted labels (mode names, "▬" neutral trends if any appear) remain legible against the dark background — commit `3c07f6f` specifically tuned `text-muted` contrast in this panel, so check the new elements using `var(--text-muted)` look consistent with the existing "Worst routes" list text.

- [ ] **Step 7: Stop the dev server**

Press `Ctrl+C` in the terminal running `npm run dev`.

---

## Self-review notes

- **Spec coverage:** Every section of the design spec maps to a task — calculations (`getTrend`, `latest`/`previousDay`) in Task 1 Steps 1-2, on-time-by-mode layout in Task 1 Step 3, avg-delay layout + colour reuse in Task 2 Steps 1-2, subtitle changes in Task 1 Step 3 / Task 2 Steps 2-3, component cleanup (`recharts`, `tooltipStyle`, `chartLabel`) in Task 2 Steps 4-6, edge cases (`previous === undefined`, zero delta) in the `getTrend` implementation itself, and the manual testing approach in Task 3.
- **Type consistency:** `getTrend`'s `Trend` return type (`{ symbol, label, colour }`) is used identically in both the on-time-by-mode JSX (Task 1 Step 3: `trend.symbol`, `trend.label`, `trend.colour`) and the avg-delay JSX (Task 2 Step 2: `delayTrend.symbol`, `delayTrend.label`, `delayTrend.colour`) — no naming drift. `latest`/`previousDay` are declared once (Task 1 Step 2) and consumed by both panels.
- **Placeholder scan:** No "TBD"/"TODO"/"handle edge cases" placeholders — every step shows exact code, exact find/replace targets, and exact commands with expected output.
