# HistoryPanel: Numeric Trend Display Design

## Context

`HistoryPanel.tsx` (rendered inside the "7-Day Trends" sidebar section, `App.tsx:39`) currently shows three sub-panels fed by `/history` (last 7 days of `DailyStats`):

1. "On-time % by mode" — a 3-line `LineChart` (bus/train/ferry over 7 days)
2. "Network avg delay (min)" — a single-line `LineChart`
3. "Chronic worst routes (7-day)" — a ranked list of routes by cumulative top-10 appearances

The line charts are too detailed for a narrow sidebar at a glance. The goal is to replace the two chart panels with compact numeric readouts: latest day's value plus a trend indicator versus the previous day. The worst-routes list is unchanged. Subtitles across all three panels are shortened.

## Data & Calculations

`history` is an array of `DailyStats`, ordered oldest→newest (as returned by `readHistory`, `dynamoReader.ts:17-36`). No backend changes are needed.

```ts
const latest = history[history.length - 1];
const previous = history.length > 1 ? history[history.length - 2] : null;
```

For each metric, compute a delta when `previous` exists:

```ts
delta = latest.<metric> - previous.<metric>
```

- **Direction**: arrow reflects the raw sign of `delta` — `▲` for increase, `▼` for decrease, `▬` (flat dash, neutral) for zero delta or when `previous` is `null` (e.g. only one day of history exists, such as right after deployment).
- **Colour**: direction-aware per metric, since "up" isn't universally good. Reuse existing colour constants already defined in the file rather than introducing new ones:
  - **Good** (on-time % went up, or delay went down) → `CHART_COLOURS.bus` (`#22c55e`, the green already used for the bus line/on-time-good convention elsewhere, e.g. `MapPanel.tsx:79`)
  - **Bad** (on-time % went down, or delay went up) → `DELAY_COLOUR` (`#ef4444`, already used for the delay line)
  - **Neutral** (zero delta, or no `previous` to compare against) → `var(--text-muted)`, matching the muted-text convention used throughout this file for secondary text

These rules apply identically to each mode's on-time % (bus/train/ferry) and to the single network avg-delay value.

## Layout

### "On-time by mode"
Three columns side by side, one per mode, coloured to match the existing chart legend (`CHART_COLOURS` in `HistoryPanel.tsx:20`: bus `#22c55e`, train `#f59e0b`, ferry `#60a5fa`):

```
  Bus            Train          Ferry
  84%  ▲ +2      71%  ▼ -1      97%  ▬ 0
```

Each column: small muted mode label → large numeric value (coloured per mode) → arrow + delta line (coloured per the direction-aware rule above).

### "Avg delay"
Single value + trend, same label→value→trend visual rhythm:

```
  4.0 min   ▼ -0.9
```

### "Worst routes"
Unchanged — same ranked-list rendering and aggregation logic (`offenderTotals` map summing `count` across the 7 days, `HistoryPanel.tsx:75-86`).

## Subtitle changes

The parent `CollapsibleSection` is already titled "7-Day Trends" (`App.tsx:39`), and the new numeric values display their own units, so subtitles drop redundant qualifiers:

| Current | New |
|---|---|
| "On-time % by mode" | "On-time by mode" |
| "Network avg delay (min)" | "Avg delay" |
| "Chronic worst routes (7-day)" | "Worst routes" |

## Component changes

- Remove `onTimeData` / `delayData` derivations and both `<LineChart>` blocks.
- Remove the `recharts` import entirely — once both charts are gone, nothing else in the file uses it.
- Add `latest` / `previous` derivation and a small helper to compute `{ direction, delta, colour }` per metric (shared by the on-time-by-mode columns and the avg-delay readout, parameterised by "higher is better" vs. "lower is better").
- `MOCK_HISTORY` stays as-is — it already provides enough days to exercise the latest/previous comparison in `VITE_MOCK=true` mode.
- Existing loading/failed/empty states (`HistoryPanel.tsx:39-61`) are unchanged.

## Edge cases

- **Single day of history** (`history.length === 1`): render the value with a flat/neutral indicator and no delta number (nothing to compare against).
- **Zero delta**: neutral grey flat dash, no green/red judgement — a metric holding steady isn't "bad".
- **Empty history**: already handled by the existing "No historical data yet" state — no change needed.

## Testing approach

No existing frontend test suite for components (`frontend/**/*.test.{ts,tsx}` returns nothing) — verification is manual: run the dev server with `VITE_MOCK=true`, confirm the new numeric layout renders correctly against `MOCK_HISTORY`, check colour-coding for both increase/decrease/flat cases (the mock data's day-to-day deltas exercise multiple directions across bus/train/ferry and delay), and confirm dark-theme contrast (recent commit `3c07f6f` touched `text-muted` contrast in this exact panel, so check against that).
