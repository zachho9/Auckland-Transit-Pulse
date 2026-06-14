# Hourly On-Time Rate — Design

## Goal

Add a new right-panel section showing today's hourly on-time rate for bus/train/ferry,
placed between "7-Day Trends" and "Service Alerts".

## Scope

- Today's NZ-local hours only (00:00 → now), excluding the current in-progress hour.
- One combined line chart with bus/train/ferry as three lines, dot markers per hour.
- No x-axis labels; hover tooltip shows the hour + each mode's % for that point.

## 1. Data model & storage

New shared type in `shared/types.ts`:

```ts
export interface HourlyStats {
  hour: number; // 0-23, NZ local time
  onTimePercent: { bus: number; train: number; ferry: number };
  sampleCount: number;
}
```

DynamoDB: new items with `pk = 'hourly-stats'`, `sk = '<NZ-date>#<HH>'`
(e.g. `2026-06-14#08`), updated incrementally each minute using the same
incremental-average pattern as `daily-stats`. TTL ~2 days.

A small new helper (e.g. `backend/src/poller/time.ts`) computes the current
`{ date, hour }` in `Pacific/Auckland` from `Date.now()` via
`Intl.DateTimeFormat`, since no date library is currently a dependency.

## 2. Backend aggregation (poller)

- `aggregator.ts`: new `buildHourlyStats(scorecard, existingStats, hour)` —
  mirrors `buildDailyStats`'s incremental-average logic but only tracks
  `onTimePercent` per mode + `sampleCount` (no delay/offenders needed).
- `dynamoWriter.ts`: add `readHourlyStats(date, hour)` and
  `writeHourlyStats(date, stats)`.
- `poller/index.ts`: after computing `scorecard`, also compute the NZ
  `{ date, hour }`, read/update/write the hourly bucket alongside the
  existing daily-stats write.

## 3. API endpoint

- `dynamoReader.ts`: add `readHourlyStats(): Promise<HourlyStats[]>` — queries
  `pk = 'hourly-stats' AND sk begins_with <today's NZ date>#`, then filters
  out the current (in-progress) hour based on the current NZ hour. Returns
  results sorted by hour ascending.
- `api/index.ts`: new `/hourly` resource → `handleHourly()` returning the
  array.
- `infra`: add the `/hourly` resource + GET method to API Gateway, mirroring
  the existing `/history` resource.

## 4. Frontend

New `HourlyPanel.tsx`, added to `App.tsx` as a new `CollapsibleSection` title
"Hourly On-Time Rate", placed between the "7-Day Trends" and "Service Alerts"
sections.

- Fetches `/hourly` (with a `MOCK_HOURLY` fallback array for `VITE_MOCK`,
  following `HistoryPanel`'s existing fetch/mock pattern).
- One combined Recharts `LineChart`, ~120-140px tall, with three lines
  (bus/train/ferry), each a fixed colour with dot markers per hour. Y-axis is
  0-100% (hidden/minimal). X-axis is hidden entirely.
- Custom `Tooltip` on hover shows the hour (formatted e.g. "8am") plus each
  mode's on-time % for that hour.
- A small legend (icon + label, matching `ModeIcon` / `MODE_LABELS`)
  identifies which line is which mode.
- If fewer than ~2 completed hours of data exist (e.g. just after midnight),
  show "Not enough data yet" instead of an empty chart.

## Out of scope

- Rolling 24h window spanning into yesterday (deferred — today-only for now).
- Per-dot severity colouring (lines use fixed mode colours, not pctColour).
- Avg delay or worst-offenders breakdown by hour (only on-time % per mode).
