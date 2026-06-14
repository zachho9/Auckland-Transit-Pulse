# Hourly On-Time Rate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "Hourly On-Time Rate" panel to the right sidebar (between "7-Day Trends" and "Service Alerts") showing today's NZ-local hourly on-time % for bus/train/ferry as a combined line chart with dot markers and hover tooltips.

**Architecture:** The poller (runs every minute) computes the current NZ date+hour via a new `Pacific/Auckland`-based time helper, and incrementally averages each minute's scorecard on-time % into a per-hour DynamoDB item (`pk='hourly-stats'`, `sk='<date>#<HH>'`). A new `/hourly` API endpoint reads today's completed-hour items and returns them sorted. The frontend fetches this and renders a Recharts `LineChart` with three lines (bus/train/ferry), dot markers, hidden axes, and a custom tooltip.

**Tech Stack:** TypeScript, AWS Lambda (Node 22), DynamoDB, API Gateway (CDK), React + Recharts (frontend), Jest + ts-jest (backend tests).

---

## File structure

- **Create** `backend/src/lib/time.ts` — `getNzDateAndHour()` helper, shared by poller and API.
- **Create** `backend/tests/time.test.ts` — tests for the helper.
- **Modify** `shared/types.ts` — add `HourlyStats` type.
- **Modify** `backend/src/poller/aggregator.ts` — add `buildHourlyStats()`.
- **Modify** `backend/tests/aggregator.test.ts` — tests for `buildHourlyStats()`.
- **Modify** `backend/src/poller/dynamoWriter.ts` — add `readHourlyStats()` / `writeHourlyStats()` (single-item, by date+hour).
- **Modify** `backend/src/poller/index.ts` — wire hourly read/build/write into the per-minute run.
- **Modify** `backend/src/api/dynamoReader.ts` — add `readHourlyHistory()` (today's completed hours, sorted).
- **Modify** `backend/src/api/index.ts` — add `/hourly` route.
- **Modify** `infra/lib/AucklandTransitPulseStack.ts` — add `/hourly` API Gateway resource.
- **Create** `frontend/src/components/HourlyPanel.tsx` — new chart component.
- **Modify** `frontend/src/App.tsx` — render the new panel in a `CollapsibleSection`.

---

### Task 1: NZ local date/hour helper

**Files:**
- Create: `backend/src/lib/time.ts`
- Test: `backend/tests/time.test.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/time.test.ts`:

```ts
import { getNzDateAndHour } from '../src/lib/time';

describe('getNzDateAndHour', () => {
  it('converts a UTC instant to NZ date and hour (winter, NZST = UTC+12)', () => {
    // 2026-06-14T12:00:00Z + 12h = 2026-06-15T00:00 NZST
    expect(getNzDateAndHour(new Date('2026-06-14T12:00:00.000Z'))).toEqual({
      date: '2026-06-15',
      hour: 0,
    });
  });

  it('converts a UTC instant to NZ date and hour (summer, NZDT = UTC+13)', () => {
    // 2026-01-14T12:00:00Z + 13h = 2026-01-15T01:00 NZDT
    expect(getNzDateAndHour(new Date('2026-01-14T12:00:00.000Z'))).toEqual({
      date: '2026-01-15',
      hour: 1,
    });
  });

  it('does not roll over to the next day for a late-evening NZ time', () => {
    // 2026-06-14T10:59:00Z + 12h = 2026-06-14T22:59 NZST
    expect(getNzDateAndHour(new Date('2026-06-14T10:59:00.000Z'))).toEqual({
      date: '2026-06-14',
      hour: 22,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest tests/time.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/time'`

- [ ] **Step 3: Write minimal implementation**

Create `backend/src/lib/time.ts`:

```ts
export function getNzDateAndHour(date: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Auckland',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const lookup: Record<string, string> = {};
  for (const part of parts) lookup[part.type] = part.value;

  return {
    date: `${lookup.year}-${lookup.month}-${lookup.day}`,
    hour: parseInt(lookup.hour, 10),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest tests/time.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/time.ts backend/tests/time.test.ts
git commit -m "feat: add NZ local date/hour time helper"
```

---

### Task 2: `HourlyStats` shared type

**Files:**
- Modify: `shared/types.ts`

- [ ] **Step 1: Add the type**

Add to `shared/types.ts`, after the `DailyStats` interface (after line 51):

```ts
export interface HourlyStats {
  hour: number;
  sampleCount: number;
  onTimePercent: { bus: number; train: number; ferry: number };
}
```

- [ ] **Step 2: Commit**

```bash
git add shared/types.ts
git commit -m "feat: add HourlyStats shared type"
```

---

### Task 3: `buildHourlyStats` aggregation function

**Files:**
- Modify: `backend/src/poller/aggregator.ts`
- Test: `backend/tests/aggregator.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `backend/tests/aggregator.test.ts`:

1. Add `HourlyStats` to the type import on line 13:

```ts
import type { Scorecard, DailyStats, HourlyStats, WorstRoute } from '../../shared/types';
```

2. Add `buildHourlyStats` to the function import on lines 1-11 (add it after `buildDailyStats,`):

```ts
import {
  aggregateLeagueTable,
  aggregateScorecard,
  buildTripDelayMap,
  classifyDelay,
  modeFromRouteType,
  parseAlerts,
  parseVehicles,
  calculateNetworkAvgDelaySeconds,
  buildDailyStats,
  buildHourlyStats,
} from '../src/poller/aggregator';
```

3. Add a new `describe` block at the end of the file (after the closing `});` of `describe('buildDailyStats', ...)`):

```ts
describe('buildHourlyStats', () => {
  const scorecard: Scorecard = {
    bus:   { active: 10, percentOnTime: 80 },
    train: { active: 5,  percentOnTime: 60 },
    ferry: { active: 2,  percentOnTime: 100 },
  };

  it('creates a first-run stats item with sampleCount 1', () => {
    const result = buildHourlyStats(scorecard, null, 8);
    expect(result).toEqual({
      hour: 8,
      sampleCount: 1,
      onTimePercent: { bus: 80, train: 60, ferry: 100 },
    });
  });

  it('applies incremental average on second run', () => {
    const existing: HourlyStats = {
      hour: 8,
      sampleCount: 1,
      onTimePercent: { bus: 80, train: 60, ferry: 100 },
    };
    // second run: bus is now 60% on time -> rolling avg = (80*1 + 60) / 2 = 70
    const scorecard2: Scorecard = {
      bus:   { active: 10, percentOnTime: 60 },
      train: { active: 5,  percentOnTime: 60 },
      ferry: { active: 2,  percentOnTime: 100 },
    };
    const result = buildHourlyStats(scorecard2, existing, 8);
    expect(result.sampleCount).toBe(2);
    expect(result.onTimePercent.bus).toBe(70);
    expect(result.onTimePercent.train).toBe(60);
    expect(result.onTimePercent.ferry).toBe(100);
    expect(result.hour).toBe(8);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest tests/aggregator.test.ts`
Expected: FAIL — `buildHourlyStats is not a function` (or TS compile error: no exported member `buildHourlyStats` / `HourlyStats`)

- [ ] **Step 3: Write minimal implementation**

In `backend/src/poller/aggregator.ts`:

1. Update the type import on line 1 to include `HourlyStats`:

```ts
import type { DelaySeverity, DailyStats, HourlyStats, Scorecard, ServiceAlert, TransitMode, VehicleSnapshot, WorstRoute } from '../../../shared/types';
```

2. Add a new function at the end of the file (after `buildDailyStats`):

```ts
export function buildHourlyStats(
  scorecard: Scorecard,
  existingStats: HourlyStats | null,
  hour: number,
): HourlyStats {
  const sampleCount = (existingStats?.sampleCount ?? 0) + 1;

  function incrementalAvg(oldVal: number, newVal: number): number {
    return (oldVal * (sampleCount - 1) + newVal) / sampleCount;
  }

  const onTimePercent = {
    bus:   Math.round(incrementalAvg(existingStats?.onTimePercent.bus   ?? 0, scorecard.bus.percentOnTime)),
    train: Math.round(incrementalAvg(existingStats?.onTimePercent.train ?? 0, scorecard.train.percentOnTime)),
    ferry: Math.round(incrementalAvg(existingStats?.onTimePercent.ferry ?? 0, scorecard.ferry.percentOnTime)),
  };

  return { hour, sampleCount, onTimePercent };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest tests/aggregator.test.ts`
Expected: PASS (all tests, including the 2 new ones)

- [ ] **Step 5: Commit**

```bash
git add backend/src/poller/aggregator.ts backend/tests/aggregator.test.ts
git commit -m "feat: add buildHourlyStats incremental aggregation"
```

---

### Task 4: DynamoDB read/write for per-hour stats

**Files:**
- Modify: `backend/src/poller/dynamoWriter.ts`

- [ ] **Step 1: Update the type import and add the two functions**

In `backend/src/poller/dynamoWriter.ts`, update line 3:

```ts
import type { Snapshot, DailyStats, HourlyStats } from '../../../shared/types';
```

Add at the end of the file (after `writeDailyStats`):

```ts
export async function readHourlyStats(date: string, hour: number): Promise<HourlyStats | null> {
  const sk = `${date}#${String(hour).padStart(2, '0')}`;
  const response = await dynamo.send(new GetItemCommand({
    TableName: process.env.TABLE_NAME!,
    Key: { pk: { S: 'hourly-stats' }, sk: { S: sk } },
  }));
  if (!response.Item) return null;
  const { pk: _pk, sk: _sk, ttl: _ttl, ...rest } = unmarshall(response.Item);
  return rest as HourlyStats;
}

export async function writeHourlyStats(date: string, stats: HourlyStats): Promise<void> {
  const sk = `${date}#${String(stats.hour).padStart(2, '0')}`;
  const dateMs = new Date(`${date}T00:00:00Z`).getTime();
  const ttl = Math.floor(dateMs / 1000) + 2 * 24 * 60 * 60;
  await dynamo.send(new PutItemCommand({
    TableName: process.env.TABLE_NAME!,
    Item: marshall({ pk: 'hourly-stats', sk, ttl, ...stats }),
  }));
}
```

No test for this step — it follows the same untested AWS SDK call pattern as the existing `readDailyStats`/`writeDailyStats` in this file.

- [ ] **Step 2: Verify the project still type-checks**

Run: `cd backend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/poller/dynamoWriter.ts
git commit -m "feat: add per-hour stats read/write to dynamoWriter"
```

---

### Task 5: Wire hourly aggregation into the poller

**Files:**
- Modify: `backend/src/poller/index.ts`

- [ ] **Step 1: Update imports**

In `backend/src/poller/index.ts`, update the aggregator import (lines 3-10) to add `buildHourlyStats`:

```ts
import {
  buildTripDelayMap,
  parseVehicles,
  parseAlerts,
  aggregateScorecard,
  aggregateLeagueTable,
  buildDailyStats,
  buildHourlyStats,
} from './aggregator';
```

Update the dynamoWriter import (line 11) to add the new functions:

```ts
import { writeSnapshot, readDailyStats, writeDailyStats, readHourlyStats, writeHourlyStats } from './dynamoWriter';
```

Add a new import for the time helper:

```ts
import { getNzDateAndHour } from '../lib/time';
```

- [ ] **Step 2: Compute and persist hourly stats**

Replace the block from `const today = ...` to the end of the function (lines 46-56):

```ts
  const today = new Date().toISOString().slice(0, 10);
  const { date: nzDate, hour: nzHour } = getNzDateAndHour(new Date());

  const [, existingDailyStats, existingHourlyStats] = await Promise.all([
    writeSnapshot(snapshot),
    readDailyStats(today),
    readHourlyStats(nzDate, nzHour),
  ]);

  const updatedDailyStats = buildDailyStats(scorecard, tripDelayMap, worstRoutes, existingDailyStats, today);
  const updatedHourlyStats = buildHourlyStats(scorecard, existingHourlyStats, nzHour);

  await Promise.all([
    writeDailyStats(updatedDailyStats),
    writeHourlyStats(nzDate, updatedHourlyStats),
  ]);

  console.log(`Snapshot written: ${vehicles.length} vehicles, ${worstRoutes.length} delayed routes, ${alerts.length} alerts`);
};
```

- [ ] **Step 3: Verify the project still type-checks**

Run: `cd backend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors

- [ ] **Step 4: Run the full backend test suite**

Run: `cd backend && npx jest`
Expected: PASS (all existing + new tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/poller/index.ts
git commit -m "feat: persist hourly on-time stats from poller"
```

---

### Task 6: `/hourly` history read for the API

**Files:**
- Modify: `backend/src/api/dynamoReader.ts`

- [ ] **Step 1: Update imports and add `readHourlyHistory`**

In `backend/src/api/dynamoReader.ts`:

Update line 3:

```ts
import type { Snapshot, DailyStats, HourlyStats } from '../../../shared/types';
```

Add a new import for the time helper (after line 3):

```ts
import { getNzDateAndHour } from '../lib/time';
```

Add at the end of the file (after `readHistory`):

```ts

export async function readHourlyHistory(): Promise<HourlyStats[]> {
  const { date, hour: currentHour } = getNzDateAndHour(new Date());

  const response = await dynamo.send(new QueryCommand({
    TableName: process.env.TABLE_NAME!,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
    ExpressionAttributeValues: {
      ':pk':     { S: 'hourly-stats' },
      ':prefix': { S: `${date}#` },
    },
  }));

  return (response.Items ?? [])
    .map(item => {
      const { pk: _pk, sk: _sk, ttl: _ttl, ...rest } = unmarshall(item);
      return rest as HourlyStats;
    })
    .filter(stats => stats.hour < currentHour)
    .sort((a, b) => a.hour - b.hour);
}
```

- [ ] **Step 2: Verify the project still type-checks**

Run: `cd backend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/dynamoReader.ts
git commit -m "feat: add readHourlyHistory for today's completed hours"
```

---

### Task 7: `/hourly` API route

**Files:**
- Modify: `backend/src/api/index.ts`

- [ ] **Step 1: Add the handler and route**

In `backend/src/api/index.ts`, update the import on line 2:

```ts
import { readSnapshot, readHistory, readHourlyHistory } from './dynamoReader';
```

Add a new handler function after `handleHistory` (after line 28):

```ts
async function handleHourlyHistory(): Promise<APIGatewayProxyResult> {
  const hourly = await readHourlyHistory();
  return ok(hourly);
}
```

Add the route in the `handler` function, after the `/history` line (line 41):

```ts
    if (resource === '/snapshot') return handleSnapshot();
    if (resource === '/history')  return handleHistory();
    if (resource === '/hourly')   return handleHourlyHistory();
```

- [ ] **Step 2: Verify the project still type-checks**

Run: `cd backend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/index.ts
git commit -m "feat: add /hourly API route"
```

---

### Task 8: API Gateway `/hourly` resource (infra)

**Files:**
- Modify: `infra/lib/AucklandTransitPulseStack.ts`

- [ ] **Step 1: Add the resource**

In `infra/lib/AucklandTransitPulseStack.ts`, after line 94 (`api.root.addResource('history').addMethod('GET', integration);`), add:

```ts
    api.root.addResource('hourly').addMethod('GET', integration);
```

- [ ] **Step 2: Verify the stack still synthesizes**

Run: `cd infra && npx cdk synth AucklandTransitPulseStack > /dev/null`
Expected: no errors (synth output suppressed)

- [ ] **Step 3: Commit**

```bash
git add infra/lib/AucklandTransitPulseStack.ts
git commit -m "feat: add /hourly API Gateway resource"
```

---

### Task 9: `HourlyPanel` frontend component

**Files:**
- Create: `frontend/src/components/HourlyPanel.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/HourlyPanel.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { HourlyStats, TransitMode } from 'shared/types';
import { ModeIcon, MODE_LABELS } from './ScorecardPanel';

const isMock = import.meta.env.VITE_MOCK === 'true';
const HOURLY_URL = `${((import.meta.env.VITE_API_URL as string) ?? '').replace(/\/$/, '')}/hourly`;

const MODE_COLOURS: Record<TransitMode, string> = {
  bus: '#3b82f6',
  train: '#a855f7',
  ferry: '#14b8a6',
};

const MOCK_HOURLY: HourlyStats[] = [
  { hour: 6,  sampleCount: 60, onTimePercent: { bus: 92, train: 88, ferry: 97 } },
  { hour: 7,  sampleCount: 60, onTimePercent: { bus: 85, train: 76, ferry: 96 } },
  { hour: 8,  sampleCount: 60, onTimePercent: { bus: 78, train: 65, ferry: 94 } },
  { hour: 9,  sampleCount: 60, onTimePercent: { bus: 83, train: 72, ferry: 95 } },
  { hour: 10, sampleCount: 60, onTimePercent: { bus: 88, train: 80, ferry: 98 } },
  { hour: 11, sampleCount: 60, onTimePercent: { bus: 89, train: 82, ferry: 97 } },
  { hour: 12, sampleCount: 60, onTimePercent: { bus: 84, train: 75, ferry: 96 } },
  { hour: 13, sampleCount: 60, onTimePercent: { bus: 80, train: 70, ferry: 95 } },
];

function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

function HourlyTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: number;
}) {
  if (!active || !payload || payload.length === 0 || label === undefined) return null;
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-col)',
      borderRadius: 4,
      padding: '0.4rem 0.6rem',
      fontSize: '0.7rem',
    }}>
      <div style={{ fontWeight: 600, marginBottom: '0.2rem', color: 'var(--text-primary)' }}>
        {formatHour(label)}
      </div>
      {payload.map(entry => (
        <div key={entry.dataKey} style={{ color: entry.color }}>
          {MODE_LABELS[entry.dataKey as TransitMode]}: {entry.value}%
        </div>
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
      {text}
    </div>
  );
}

export function HourlyPanel() {
  const [hourly, setHourly] = useState<HourlyStats[] | null>(isMock ? MOCK_HOURLY : null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (isMock) return;
    fetch(HOURLY_URL)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: HourlyStats[]) => setHourly(data))
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <Empty text="Hourly data unavailable" />;
  if (!hourly) return <Empty text="Loading…" />;
  if (hourly.length < 2) return <Empty text="Not enough data yet" />;

  const data = hourly.map(h => ({
    hour: h.hour,
    bus: h.onTimePercent.bus,
    train: h.onTimePercent.train,
    ferry: h.onTimePercent.ferry,
  }));

  const modes: TransitMode[] = ['bus', 'train', 'ferry'];

  return (
    <div style={{ padding: '0.5rem 0.75rem 0.85rem' }}>
      <div style={{ height: 130 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: 8 }}>
            <XAxis dataKey="hour" hide />
            <YAxis domain={[0, 100]} hide />
            <Tooltip content={<HourlyTooltip />} />
            {modes.map(mode => (
              <Line
                key={mode}
                type="monotone"
                dataKey={mode}
                stroke={MODE_COLOURS[mode]}
                strokeWidth={2}
                dot={{ r: 3, fill: MODE_COLOURS[mode] }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.4rem' }}>
        {modes.map(mode => (
          <div key={mode} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: MODE_COLOURS[mode], display: 'inline-block', flexShrink: 0 }} />
            <ModeIcon mode={mode} />
            <span>{MODE_LABELS[mode]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the frontend type-checks**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/HourlyPanel.tsx
git commit -m "feat: add HourlyPanel line chart component"
```

---

### Task 10: Render `HourlyPanel` in the sidebar

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add the import and section**

In `frontend/src/App.tsx`, add the import after line 7 (`import { HistoryPanel } from './components/HistoryPanel';`):

```ts
import { HourlyPanel } from './components/HourlyPanel';
```

Add a new `CollapsibleSection` after the "7-Day On-time" section (after line 41, before the "Service Alerts" section):

```tsx
                <CollapsibleSection title="7-Day On-time">
                  <HistoryPanel />
                </CollapsibleSection>
                <CollapsibleSection title="Hourly On-Time Rate">
                  <HourlyPanel />
                </CollapsibleSection>
                <CollapsibleSection title="Service Alerts">
                  <AlertsPanel />
                </CollapsibleSection>
```

- [ ] **Step 2: Run the frontend in mock mode and verify visually**

Run: `cd frontend && VITE_MOCK=true npx vite`

Open the printed local URL in a browser. Confirm:
- A new "Hourly On-Time Rate" section appears between "7-Day On-time" and "Service Alerts".
- It shows a line chart with 3 coloured lines and dot markers, no x-axis labels.
- Hovering over a dot shows a tooltip with the hour (e.g. "8am") and each mode's %.
- A legend below the chart shows bus/train/ferry icons and colours.

Stop the dev server afterwards (Ctrl+C).

- [ ] **Step 3: Verify the frontend builds**

Run: `cd frontend && npx tsc && npx vite build`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: render Hourly On-Time Rate panel in sidebar"
```

---

## Follow-up (out of scope for this plan)

- Align `daily-stats` keying and `/history` query range to NZ local time using `getNzDateAndHour` (currently UTC-based). See `docs/superpowers/specs/2026-06-14-hourly-on-time-rate-design.md` for details.
