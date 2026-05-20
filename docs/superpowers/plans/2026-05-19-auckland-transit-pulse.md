# Auckland Transit Pulse — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a live dark-theme web dashboard showing Auckland public transport network health — a map of live vehicle positions coloured by delay severity, a per-mode scorecard, a worst-routes league table, and active service alerts.

**Architecture:** A Poller Lambda runs every 60s (EventBridge minimum rate), fetches the AT Realtime API, aggregates a health snapshot, and writes it to DynamoDB. An API Lambda reads that snapshot and serves it to a React SPA via API Gateway. The browser polls `/snapshot` every 30s. Amplify Hosting serves the React SPA with CI/CD from git. All backend infra is defined in TypeScript CDK.

**Tech Stack:** TypeScript throughout — Node.js 22 Lambdas, React 18, AWS CDK v2, Vite, Tailwind CSS 3, Leaflet.js + react-leaflet 4, AWS (Amplify Hosting, API Gateway, Lambda, DynamoDB, EventBridge, SSM Parameter Store)

> **Note on polling interval:** EventBridge scheduled rules have a hard minimum of 60 seconds. The spec says 30s, but the poller runs every 60s. The browser still fetches every 30s — data is just up to 60s old. This is imperceptible for a personal dashboard.

> **Note on route overlays:** `shapes.txt` is 28MB/565k lines — impractical to bundle into Lambda. The map shows VehicleMarkers only. Route overlays are a post-MVP enhancement.

---

## File Map

```
auckland-transit-pulse/
├── package.json                              # npm workspaces root
├── amplify.yml                               # Amplify Hosting build config
├── shared/
│   └── types.ts                              # Shared TS types used by Lambda + React
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.ts
│   ├── scripts/
│   │   └── generateGtfsData.ts               # Reads routes.txt → generates gtfsData.ts
│   ├── src/
│   │   ├── poller/
│   │   │   ├── index.ts                      # Poller Lambda handler
│   │   │   ├── atTypes.ts                    # AT Realtime API response types
│   │   │   ├── atClient.ts                   # HTTP client — fetches AT combined feed
│   │   │   ├── gtfsData.ts                   # GENERATED: routeId → {shortName, routeType}
│   │   │   ├── aggregator.ts                 # Pure aggregation functions (unit-tested)
│   │   │   └── dynamoWriter.ts               # DynamoDB PutItem
│   │   └── api/
│   │       ├── index.ts                      # API Lambda handler
│   │       └── dynamoReader.ts               # DynamoDB GetItem
│   └── tests/
│       └── aggregator.test.ts                # Unit tests for aggregator
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css                         # Tailwind directives + html/body height
│       ├── context/
│       │   ├── SnapshotContext.tsx           # useSnapshot hook + React Context
│       │   └── mockSnapshot.ts              # Hardcoded snapshot for VITE_MOCK=true local preview
│       └── components/
│           ├── Header.tsx
│           ├── MapPanel.tsx
│           ├── ScorecardPanel.tsx
│           ├── LeagueTablePanel.tsx
│           └── AlertsPanel.tsx
└── infra/
    ├── package.json
    ├── tsconfig.json
    ├── cdk.json
    ├── bin/
    │   └── app.ts                            # CDK entry point
    └── lib/
        └── AucklandTransitPulseStack.ts      # Full CDK stack definition
```

---

## Task 1: Monorepo Scaffold + Shared Types

**Files:**
- Create: `package.json`
- Create: `shared/types.ts`
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/jest.config.ts`
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `infra/package.json`
- Create: `infra/tsconfig.json`
- Create: `infra/cdk.json`

- [ ] **Step 1: Create root package.json with workspaces**

```json
{
  "name": "auckland-transit-pulse",
  "private": true,
  "workspaces": ["shared", "backend", "frontend", "infra"]
}
```

- [ ] **Step 2: Create shared/types.ts**

```typescript
export type DelaySeverity = "green" | "amber" | "red" | "none";
export type TransitMode = "bus" | "train" | "ferry";

export interface VehicleSnapshot {
  id: string;
  lat: number;
  lng: number;
  delaySeverity: DelaySeverity;
  mode: TransitMode;
}

export interface ModeStats {
  active: number;
  percentOnTime: number;
}

export interface Scorecard {
  bus: ModeStats;
  train: ModeStats;
  ferry: ModeStats;
}

export interface WorstRoute {
  routeId: string;
  name: string;
  avgDelayMinutes: number;
}

export interface ServiceAlert {
  id: string;
  header: string;
  description: string;
}

export interface Snapshot {
  updatedAt: string;
  scorecard: Scorecard;
  worstRoutes: WorstRoute[];
  alerts: ServiceAlert[];
  vehicles: VehicleSnapshot[];
}
```

- [ ] **Step 3: Create shared/package.json**

```json
{
  "name": "shared",
  "version": "1.0.0",
  "private": true
}
```

- [ ] **Step 4: Create backend/package.json**

```json
{
  "name": "backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "jest",
    "generate-gtfs": "ts-node scripts/generateGtfsData.ts"
  },
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.0.0",
    "@aws-sdk/client-ssm": "^3.0.0",
    "@aws-sdk/util-dynamodb": "^3.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "ts-node": "^10.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 5: Create backend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["src", "scripts", "tests"]
}
```

- [ ] **Step 6: Create backend/jest.config.ts**

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
};

export default config;
```

- [ ] **Step 7: Create frontend/package.json**

```json
{
  "name": "frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "leaflet": "^1.9.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-leaflet": "^4.0.0"
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.0.0",
    "postcss": "^8.0.0",
    "tailwindcss": "^3.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

- [ ] **Step 8: Create frontend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 9: Create infra/package.json**

```json
{
  "name": "infra",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "deploy": "cdk deploy",
    "destroy": "cdk destroy",
    "synth": "cdk synth",
    "diff": "cdk diff"
  },
  "dependencies": {
    "aws-cdk-lib": "^2.0.0",
    "constructs": "^10.0.0",
    "source-map-support": "^0.5.0"
  },
  "devDependencies": {
    "aws-cdk": "^2.0.0",
    "ts-node": "^10.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 10: Create infra/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "declaration": true
  },
  "include": ["bin", "lib"]
}
```

- [ ] **Step 11: Create infra/cdk.json**

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/app.ts",
  "context": {
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true,
    "@aws-cdk/core:checkSecretUsage": true,
    "@aws-cdk/core:target-partitions": ["aws"]
  }
}
```

- [ ] **Step 12: Install all workspace dependencies**

```bash
cd E:/Coding/Auckland-Transit-Pulse
npm install
```

Expected: `node_modules` created at root, each workspace's deps installed.

- [ ] **Step 13: Commit**

```bash
git init
git add shared/types.ts shared/package.json backend/package.json backend/tsconfig.json backend/jest.config.ts frontend/package.json frontend/tsconfig.json infra/package.json infra/tsconfig.json infra/cdk.json package.json package-lock.json
git commit -m "feat: monorepo scaffold with shared types"
```

---

## Task 2: Generate GTFS Route Data Module

**Files:**
- Create: `backend/scripts/generateGtfsData.ts`
- Create (generated): `backend/src/poller/gtfsData.ts`

- [ ] **Step 1: Create backend/scripts/generateGtfsData.ts**

```typescript
import * as fs from 'fs';
import * as path from 'path';

const routesCsv = fs.readFileSync(
  path.join(__dirname, '../../../data/gtfs/routes.txt'),
  'utf-8'
);

function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? '').trim()]));
  });
}

const routes = parseCsv(routesCsv);
const SUPPORTED_TYPES = new Set(['2', '3', '4']);

const entries = routes
  .filter(r => SUPPORTED_TYPES.has(r.route_type))
  .map(r => `  '${r.route_id}': { shortName: '${r.route_short_name.replace(/'/g, "\\'")}', routeType: ${r.route_type} }`)
  .join(',\n');

const output = `// AUTO-GENERATED by scripts/generateGtfsData.ts — do not edit manually
export interface RouteInfo {
  shortName: string;
  routeType: number;
}

export const routeMap: Record<string, RouteInfo> = {
${entries}
};
`;

const outDir = path.join(__dirname, '../src/poller');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'gtfsData.ts');
fs.writeFileSync(outPath, output, 'utf-8');
console.log(`Written ${routes.filter(r => SUPPORTED_TYPES.has(r.route_type)).length} routes to ${outPath}`);
```

- [ ] **Step 2: Run the generator**

```bash
cd backend
npm run generate-gtfs
```

Expected output: `Written NNN routes to .../backend/src/poller/gtfsData.ts`

- [ ] **Step 3: Verify the generated file looks correct**

Open `backend/src/poller/gtfsData.ts`. It should start with the `// AUTO-GENERATED` comment and contain a `routeMap` object with entries like:
```typescript
'101-202': { shortName: '101', routeType: 3 },
```

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/generateGtfsData.ts backend/src/poller/gtfsData.ts
git commit -m "feat: generate GTFS route lookup module from routes.txt"
```

---

## Task 3: AT API Types + Client

**Files:**
- Create: `backend/src/poller/atTypes.ts`
- Create: `backend/src/poller/atClient.ts`

- [ ] **Step 1: Create backend/src/poller/atTypes.ts**

```typescript
export interface AtTranslation {
  text: string;
  language?: string;
}

export interface AtTripDescriptor {
  trip_id?: string;
  route_id?: string;
  direction_id?: number;
  start_time?: string;
  start_date?: string;
}

export interface AtPosition {
  latitude: number;
  longitude: number;
  bearing?: number;
}

export interface AtTripUpdate {
  trip: AtTripDescriptor;
  delay?: number;
  timestamp?: number;
  stop_time_update?: Array<{
    stop_sequence?: number;
    stop_id?: string;
    arrival?: { delay?: number; time?: number };
    departure?: { delay?: number; time?: number };
  }>;
}

export interface AtVehiclePosition {
  trip?: AtTripDescriptor;
  vehicle?: { id?: string; label?: string; license_plate?: string };
  position?: AtPosition;
  timestamp?: number;
}

export interface AtAlert {
  header_text?: { translation: AtTranslation[] };
  description_text?: { translation: AtTranslation[] };
  informed_entity?: Array<{ route_id?: string; stop_id?: string }>;
  cause?: number;
  effect?: number;
}

export interface AtEntity {
  id: string;
  is_deleted?: boolean;
  trip_update?: AtTripUpdate;
  vehicle?: AtVehiclePosition;
  alert?: AtAlert;
}

export interface AtFeedResponse {
  status: string;
  response: {
    header: {
      gtfs_realtime_version: string;
      incrementality?: number;
      timestamp: number;
    };
    entity: AtEntity[];
  };
  error?: unknown;
}
```

- [ ] **Step 2: Create backend/src/poller/atClient.ts**

```typescript
import type { AtFeedResponse } from './atTypes';

const AT_REALTIME_URL = 'https://api.at.govt.nz/realtime/legacy';

export async function fetchFeed(apiKey: string): Promise<AtFeedResponse> {
  const response = await fetch(AT_REALTIME_URL, {
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`AT API responded with ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as AtFeedResponse;

  if (data.status !== 'OK') {
    throw new Error(`AT API returned non-OK status: ${data.status}`);
  }

  return data;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd backend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/poller/atTypes.ts backend/src/poller/atClient.ts
git commit -m "feat: AT Realtime API types and HTTP client"
```

---

## Task 4: Aggregator — Tests First, Then Implementation

**Files:**
- Create: `backend/tests/aggregator.test.ts`
- Create: `backend/src/poller/aggregator.ts`

- [ ] **Step 1: Create backend/tests/aggregator.test.ts with all tests**

```typescript
import {
  aggregateLeagueTable,
  aggregateScorecard,
  buildTripDelayMap,
  classifyDelay,
  modeFromRouteType,
  parseAlerts,
  parseVehicles,
} from '../src/poller/aggregator';
import type { AtEntity } from '../src/poller/atTypes';

jest.mock('../src/poller/gtfsData', () => ({
  routeMap: {
    'route-bus': { shortName: '274', routeType: 3 },
    'route-train': { shortName: 'EAST', routeType: 2 },
    'route-ferry': { shortName: 'FERRY1', routeType: 4 },
    'route-unknown-type': { shortName: 'X', routeType: 9 },
  },
}));

describe('classifyDelay', () => {
  it('returns green for 0 seconds', () => expect(classifyDelay(0)).toBe('green'));
  it('returns green for exactly 120 seconds', () => expect(classifyDelay(120)).toBe('green'));
  it('returns green for negative delay (vehicle is early)', () => expect(classifyDelay(-60)).toBe('green'));
  it('returns amber for 121 seconds', () => expect(classifyDelay(121)).toBe('amber'));
  it('returns amber for exactly 300 seconds', () => expect(classifyDelay(300)).toBe('amber'));
  it('returns red for 301 seconds', () => expect(classifyDelay(301)).toBe('red'));
  it('returns none for null', () => expect(classifyDelay(null)).toBe('none'));
  it('returns none for undefined', () => expect(classifyDelay(undefined)).toBe('none'));
});

describe('modeFromRouteType', () => {
  it('returns train for route type 2', () => expect(modeFromRouteType(2)).toBe('train'));
  it('returns bus for route type 3', () => expect(modeFromRouteType(3)).toBe('bus'));
  it('returns ferry for route type 4', () => expect(modeFromRouteType(4)).toBe('ferry'));
  it('returns null for unsupported route type', () => expect(modeFromRouteType(9)).toBeNull());
});

describe('buildTripDelayMap', () => {
  it('maps trip_id to delay from trip_update entities', () => {
    const entities: AtEntity[] = [
      { id: '1', trip_update: { trip: { trip_id: 'trip-1', route_id: 'route-bus' }, delay: 180 } },
      { id: '2', trip_update: { trip: { trip_id: 'trip-2', route_id: 'route-bus' }, delay: 60 } },
      { id: '3', vehicle: { trip: { trip_id: 'trip-1' }, position: { latitude: -36.8, longitude: 174.7 } } },
    ];
    const map = buildTripDelayMap(entities);
    expect(map.get('trip-1')).toBe(180);
    expect(map.get('trip-2')).toBe(60);
    expect(map.size).toBe(2);
  });

  it('skips trip_update entities without trip_id', () => {
    const entities: AtEntity[] = [
      { id: '1', trip_update: { trip: { route_id: 'route-bus' }, delay: 60 } },
    ];
    expect(buildTripDelayMap(entities).size).toBe(0);
  });

  it('skips trip_update entities without delay', () => {
    const entities: AtEntity[] = [
      { id: '1', trip_update: { trip: { trip_id: 'trip-1' } } },
    ];
    expect(buildTripDelayMap(entities).size).toBe(0);
  });
});

describe('parseVehicles', () => {
  const tripDelayMap = new Map([['trip-1', 180], ['trip-2', 600]]);

  it('returns vehicle snapshot with correct mode and severity', () => {
    const entities: AtEntity[] = [{
      id: 'v1',
      vehicle: {
        trip: { trip_id: 'trip-1', route_id: 'route-bus' },
        position: { latitude: -36.8, longitude: 174.7 },
      },
    }];
    const result = parseVehicles(entities, tripDelayMap);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: 'v1', lat: -36.8, lng: 174.7, delaySeverity: 'amber', mode: 'bus' });
  });

  it('assigns red severity for delay > 300 seconds', () => {
    const entities: AtEntity[] = [{
      id: 'v2',
      vehicle: {
        trip: { trip_id: 'trip-2', route_id: 'route-train' },
        position: { latitude: -36.9, longitude: 174.8 },
      },
    }];
    expect(parseVehicles(entities, tripDelayMap)[0].delaySeverity).toBe('red');
  });

  it('assigns none severity when no trip delay data exists for the vehicle', () => {
    const entities: AtEntity[] = [{
      id: 'v3',
      vehicle: {
        trip: { trip_id: 'trip-no-update', route_id: 'route-ferry' },
        position: { latitude: -36.9, longitude: 174.8 },
      },
    }];
    expect(parseVehicles(entities, tripDelayMap)[0].delaySeverity).toBe('none');
    expect(parseVehicles(entities, tripDelayMap)[0].mode).toBe('ferry');
  });

  it('skips vehicles with no position', () => {
    const entities: AtEntity[] = [{ id: 'v4', vehicle: { trip: { route_id: 'route-bus' } } }];
    expect(parseVehicles(entities, tripDelayMap)).toHaveLength(0);
  });

  it('skips vehicles with no route_id', () => {
    const entities: AtEntity[] = [{
      id: 'v5',
      vehicle: { position: { latitude: -36.8, longitude: 174.7 } },
    }];
    expect(parseVehicles(entities, tripDelayMap)).toHaveLength(0);
  });

  it('skips vehicles whose route_id is not in routeMap', () => {
    const entities: AtEntity[] = [{
      id: 'v6',
      vehicle: {
        trip: { route_id: 'route-nonexistent' },
        position: { latitude: -36.8, longitude: 174.7 },
      },
    }];
    expect(parseVehicles(entities, tripDelayMap)).toHaveLength(0);
  });

  it('skips vehicles whose route type is unsupported', () => {
    const entities: AtEntity[] = [{
      id: 'v7',
      vehicle: {
        trip: { route_id: 'route-unknown-type' },
        position: { latitude: -36.8, longitude: 174.7 },
      },
    }];
    expect(parseVehicles(entities, tripDelayMap)).toHaveLength(0);
  });
});

describe('parseAlerts', () => {
  it('extracts header and description from alert entities', () => {
    const entities: AtEntity[] = [{
      id: 'a1',
      alert: {
        header_text: { translation: [{ text: 'Northern busway disruption', language: 'en' }] },
        description_text: { translation: [{ text: 'Signal fault on Northern busway', language: 'en' }] },
      },
    }];
    expect(parseAlerts(entities)).toEqual([{
      id: 'a1',
      header: 'Northern busway disruption',
      description: 'Signal fault on Northern busway',
    }]);
  });

  it('returns empty strings when text fields are missing', () => {
    const entities: AtEntity[] = [{ id: 'a2', alert: {} }];
    const result = parseAlerts(entities);
    expect(result[0].header).toBe('');
    expect(result[0].description).toBe('');
  });

  it('ignores non-alert entities', () => {
    const entities: AtEntity[] = [
      { id: '1', trip_update: { trip: { route_id: 'route-bus' }, delay: 60 } },
      { id: '2', vehicle: { position: { latitude: -36.8, longitude: 174.7 } } },
    ];
    expect(parseAlerts(entities)).toHaveLength(0);
  });
});

describe('aggregateScorecard', () => {
  it('calculates per-mode active count and on-time percentage', () => {
    const vehicles = [
      { id: '1', lat: 0, lng: 0, delaySeverity: 'green' as const, mode: 'bus' as const },
      { id: '2', lat: 0, lng: 0, delaySeverity: 'red' as const, mode: 'bus' as const },
      { id: '3', lat: 0, lng: 0, delaySeverity: 'green' as const, mode: 'train' as const },
    ];
    const result = aggregateScorecard(vehicles);
    expect(result.bus).toEqual({ active: 2, percentOnTime: 50 });
    expect(result.train).toEqual({ active: 1, percentOnTime: 100 });
    expect(result.ferry).toEqual({ active: 0, percentOnTime: 0 });
  });

  it('excludes none-severity vehicles from percentage (they count as active but not in pct)', () => {
    const vehicles = [
      { id: '1', lat: 0, lng: 0, delaySeverity: 'green' as const, mode: 'bus' as const },
      { id: '2', lat: 0, lng: 0, delaySeverity: 'none' as const, mode: 'bus' as const },
    ];
    const result = aggregateScorecard(vehicles);
    expect(result.bus.active).toBe(2);
    expect(result.bus.percentOnTime).toBe(100); // only 1 has delay data, it's green
  });

  it('returns 0% on time when all vehicles have none severity', () => {
    const vehicles = [
      { id: '1', lat: 0, lng: 0, delaySeverity: 'none' as const, mode: 'bus' as const },
    ];
    expect(aggregateScorecard(vehicles).bus.percentOnTime).toBe(0);
  });
});

describe('aggregateLeagueTable', () => {
  it('returns routes sorted by descending average delay in minutes', () => {
    const entities: AtEntity[] = [
      { id: '1', trip_update: { trip: { route_id: 'route-bus' }, delay: 600 } },   // 10 min
      { id: '2', trip_update: { trip: { route_id: 'route-bus' }, delay: 300 } },   // 5 min → avg 7.5 → 8 min
      { id: '3', trip_update: { trip: { route_id: 'route-train' }, delay: 360 } }, // 6 min
    ];
    const result = aggregateLeagueTable(entities);
    expect(result[0]).toEqual({ routeId: 'route-bus', name: '274', avgDelayMinutes: 8 });
    expect(result[1]).toEqual({ routeId: 'route-train', name: 'EAST', avgDelayMinutes: 6 });
  });

  it('excludes routes with zero or negative average delay', () => {
    const entities: AtEntity[] = [
      { id: '1', trip_update: { trip: { route_id: 'route-bus' }, delay: -60 } },
    ];
    expect(aggregateLeagueTable(entities)).toHaveLength(0);
  });

  it('uses route_id as name fallback when route not in routeMap', () => {
    const entities: AtEntity[] = [
      { id: '1', trip_update: { trip: { route_id: 'unknown-route-999' }, delay: 400 } },
    ];
    const result = aggregateLeagueTable(entities);
    expect(result[0].name).toBe('unknown-route-999');
  });

  it('limits results to 10', () => {
    const entities: AtEntity[] = Array.from({ length: 15 }, (_, i) => ({
      id: `${i}`,
      trip_update: { trip: { route_id: `route-${i}` }, delay: (i + 1) * 200 },
    }));
    expect(aggregateLeagueTable(entities).length).toBeLessThanOrEqual(10);
  });
});
```

- [ ] **Step 2: Run tests — confirm all fail (aggregator.ts doesn't exist yet)**

```bash
cd backend
npm test
```

Expected: all tests fail with `Cannot find module '../src/poller/aggregator'`.

- [ ] **Step 3: Create backend/src/poller/aggregator.ts**

```typescript
import type { DelaySeverity, Scorecard, ServiceAlert, TransitMode, VehicleSnapshot, WorstRoute } from '../../../shared/types';
import type { AtEntity } from './atTypes';
import { routeMap } from './gtfsData';

export function classifyDelay(delaySeconds: number | null | undefined): DelaySeverity {
  if (delaySeconds == null) return 'none';
  if (delaySeconds <= 120) return 'green';
  if (delaySeconds <= 300) return 'amber';
  return 'red';
}

export function modeFromRouteType(routeType: number): TransitMode | null {
  if (routeType === 2) return 'train';
  if (routeType === 3) return 'bus';
  if (routeType === 4) return 'ferry';
  return null;
}

export function buildTripDelayMap(entities: AtEntity[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of entities) {
    if (e.trip_update?.trip.trip_id != null && e.trip_update.delay != null) {
      map.set(e.trip_update.trip.trip_id, e.trip_update.delay);
    }
  }
  return map;
}

export function parseVehicles(
  entities: AtEntity[],
  tripDelayMap: Map<string, number>,
): VehicleSnapshot[] {
  const result: VehicleSnapshot[] = [];
  for (const e of entities) {
    const v = e.vehicle;
    if (!v?.position || !v.trip?.route_id) continue;
    const routeInfo = routeMap[v.trip.route_id];
    if (!routeInfo) continue;
    const mode = modeFromRouteType(routeInfo.routeType);
    if (!mode) continue;
    const delay = v.trip.trip_id != null ? tripDelayMap.get(v.trip.trip_id) : undefined;
    result.push({
      id: e.id,
      lat: v.position.latitude,
      lng: v.position.longitude,
      delaySeverity: classifyDelay(delay),
      mode,
    });
  }
  return result;
}

export function parseAlerts(entities: AtEntity[]): ServiceAlert[] {
  return entities
    .filter(e => e.alert)
    .map(e => ({
      id: e.id,
      header: e.alert!.header_text?.translation[0]?.text ?? '',
      description: e.alert!.description_text?.translation[0]?.text ?? '',
    }));
}

export function aggregateScorecard(vehicles: VehicleSnapshot[]): Scorecard {
  const modes: TransitMode[] = ['bus', 'train', 'ferry'];
  const scorecard = {} as Scorecard;
  for (const mode of modes) {
    const group = vehicles.filter(v => v.mode === mode);
    const withDelay = group.filter(v => v.delaySeverity !== 'none');
    const onTime = withDelay.filter(v => v.delaySeverity === 'green').length;
    scorecard[mode] = {
      active: group.length,
      percentOnTime: withDelay.length === 0 ? 0 : Math.round((onTime / withDelay.length) * 100),
    };
  }
  return scorecard;
}

export function aggregateLeagueTable(entities: AtEntity[]): WorstRoute[] {
  const routeDelays = new Map<string, number[]>();
  for (const e of entities) {
    if (!e.trip_update?.trip.route_id || e.trip_update.delay == null) continue;
    const routeId = e.trip_update.trip.route_id;
    if (!routeDelays.has(routeId)) routeDelays.set(routeId, []);
    routeDelays.get(routeId)!.push(e.trip_update.delay);
  }
  return Array.from(routeDelays.entries())
    .map(([routeId, delays]) => {
      const avgSeconds = delays.reduce((a, b) => a + b, 0) / delays.length;
      return {
        routeId,
        name: routeMap[routeId]?.shortName ?? routeId,
        avgDelayMinutes: Math.round(avgSeconds / 60),
      };
    })
    .filter(r => r.avgDelayMinutes > 0)
    .sort((a, b) => b.avgDelayMinutes - a.avgDelayMinutes)
    .slice(0, 10);
}
```

- [ ] **Step 4: Run tests — all must pass**

```bash
cd backend
npm test
```

Expected: all test suites pass. Fix any failures before continuing.

- [ ] **Step 5: Commit**

```bash
git add backend/tests/aggregator.test.ts backend/src/poller/aggregator.ts
git commit -m "feat: aggregator with full unit test coverage (TDD)"
```

---

## Task 5: Poller Lambda Handler

**Files:**
- Create: `backend/src/poller/dynamoWriter.ts`
- Create: `backend/src/poller/index.ts`

- [ ] **Step 1: Create backend/src/poller/dynamoWriter.ts**

```typescript
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import type { Snapshot } from '../../../shared/types';

const dynamo = new DynamoDBClient({});

export async function writeSnapshot(snapshot: Snapshot): Promise<void> {
  await dynamo.send(new PutItemCommand({
    TableName: process.env.TABLE_NAME!,
    Item: marshall({ pk: 'snapshot', sk: 'latest', ...snapshot }),
  }));
}
```

- [ ] **Step 2: Create backend/src/poller/index.ts**

```typescript
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { fetchFeed } from './atClient';
import {
  buildTripDelayMap,
  parseVehicles,
  parseAlerts,
  aggregateScorecard,
  aggregateLeagueTable,
} from './aggregator';
import { writeSnapshot } from './dynamoWriter';
import type { Snapshot } from '../../../shared/types';

const ssm = new SSMClient({});
let cachedApiKey: string | null = null;

async function getApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;
  const response = await ssm.send(new GetParameterCommand({
    Name: process.env.SSM_PARAM_NAME!,
    WithDecryption: true,
  }));
  cachedApiKey = response.Parameter!.Value!;
  return cachedApiKey;
}

export const handler = async (): Promise<void> => {
  const apiKey = await getApiKey();
  const feed = await fetchFeed(apiKey);
  const entities = feed.response.entity;

  const tripDelayMap = buildTripDelayMap(entities);
  const vehicles = parseVehicles(entities, tripDelayMap);
  const alerts = parseAlerts(entities);
  const scorecard = aggregateScorecard(vehicles);
  const worstRoutes = aggregateLeagueTable(entities);

  const snapshot: Snapshot = {
    updatedAt: new Date().toISOString(),
    scorecard,
    worstRoutes,
    alerts,
    vehicles,
  };

  await writeSnapshot(snapshot);
  console.log(`Snapshot written: ${vehicles.length} vehicles, ${worstRoutes.length} delayed routes, ${alerts.length} alerts`);
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd backend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/poller/dynamoWriter.ts backend/src/poller/index.ts
git commit -m "feat: Poller Lambda handler — aggregates AT feed and writes DynamoDB snapshot"
```

---

## Task 6: API Lambda Handler

**Files:**
- Create: `backend/src/api/dynamoReader.ts`
- Create: `backend/src/api/index.ts`

- [ ] **Step 1: Create backend/src/api/dynamoReader.ts**

```typescript
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { Snapshot } from '../../../shared/types';

const dynamo = new DynamoDBClient({});

export async function readSnapshot(): Promise<Snapshot | null> {
  const response = await dynamo.send(new GetItemCommand({
    TableName: process.env.TABLE_NAME!,
    Key: { pk: { S: 'snapshot' }, sk: { S: 'latest' } },
  }));
  if (!response.Item) return null;
  const { pk: _pk, sk: _sk, ...snapshot } = unmarshall(response.Item);
  return snapshot as Snapshot;
}
```

- [ ] **Step 2: Create backend/src/api/index.ts**

```typescript
import type { APIGatewayProxyHandler } from 'aws-lambda';
import { readSnapshot } from './dynamoReader';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const snapshot = await readSnapshot();
    if (!snapshot) {
      return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(snapshot),
    };
  } catch (err) {
    console.error('Failed to read snapshot:', err);
    return {
      statusCode: 503,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Service temporarily unavailable' }),
    };
  }
};
```

- [ ] **Step 3: Add @types/aws-lambda to backend devDependencies**

Add to `backend/package.json` devDependencies:
```json
"@types/aws-lambda": "^8.10.0"
```

Then run:
```bash
npm install
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd backend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/dynamoReader.ts backend/src/api/index.ts backend/package.json package-lock.json
git commit -m "feat: API Lambda handler — reads DynamoDB snapshot and serves JSON"
```

---

## Task 7: CDK Infrastructure Stack

**Files:**
- Create: `infra/bin/app.ts`
- Create: `infra/lib/AucklandTransitPulseStack.ts`

- [ ] **Step 1: Create infra/bin/app.ts**

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AucklandTransitPulseStack } from '../lib/AucklandTransitPulseStack';

const app = new cdk.App();
new AucklandTransitPulseStack(app, 'AucklandTransitPulseStack', {
  env: { region: 'ap-southeast-2' },
});
```

- [ ] **Step 2: Create infra/lib/AucklandTransitPulseStack.ts**

```typescript
import * as path from 'path';
import { Stack, StackProps, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';

const SSM_PARAM_NAME = '/auckland-transit-pulse/at-api-key';

export class AucklandTransitPulseStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // DynamoDB — single table, pay-per-request, destroyed on cdk destroy
    const table = new dynamodb.Table(this, 'SnapshotTable', {
      tableName: 'auckland-transit-pulse-snapshot',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Poller Lambda — fetches AT API every 60s and writes snapshot
    const pollerLambda = new NodejsFunction(this, 'PollerLambda', {
      functionName: 'atp-poller',
      entry: path.join(__dirname, '../../backend/src/poller/index.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_22_X,
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        TABLE_NAME: table.tableName,
        SSM_PARAM_NAME,
      },
      bundling: {
        externalModules: ['@aws-sdk/*'],
      },
    });

    table.grantWriteData(pollerLambda);
    pollerLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [
        `arn:aws:ssm:${this.region}:${this.account}:parameter${SSM_PARAM_NAME}`,
      ],
    }));

    // EventBridge — minimum rate is 1 minute
    new events.Rule(this, 'PollerSchedule', {
      schedule: events.Schedule.rate(Duration.minutes(1)),
      targets: [new targets.LambdaFunction(pollerLambda)],
    });

    // API Lambda — reads snapshot from DynamoDB
    const apiLambda = new NodejsFunction(this, 'ApiLambda', {
      functionName: 'atp-api',
      entry: path.join(__dirname, '../../backend/src/api/index.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_22_X,
      timeout: Duration.seconds(10),
      memorySize: 128,
      environment: { TABLE_NAME: table.tableName },
      bundling: {
        externalModules: ['@aws-sdk/*'],
      },
    });

    table.grantReadData(apiLambda);

    // API Gateway — exposes /snapshot GET endpoint
    const api = new apigateway.RestApi(this, 'TransitApi', {
      restApiName: 'auckland-transit-pulse-api',
      deployOptions: { stageName: 'prod' },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'OPTIONS'],
      },
    });

    api.root
      .addResource('snapshot')
      .addMethod('GET', new apigateway.LambdaIntegration(apiLambda));

    new CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway base URL — set as VITE_API_URL in Amplify environment variables',
    });
  }
}
```

- [ ] **Step 3: Verify CDK synthesises without errors**

```bash
cd infra
npm run synth
```

Expected: CloudFormation template printed to stdout, no errors.

- [ ] **Step 4: Commit**

```bash
git add infra/bin/app.ts infra/lib/AucklandTransitPulseStack.ts
git commit -m "feat: CDK stack — DynamoDB, Poller Lambda, API Lambda, EventBridge, API Gateway"
```

---

## Task 8: Frontend Scaffold + SnapshotContext

**Files:**
- Create: `frontend/index.html`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.ts`
- Create: `frontend/src/index.css`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/context/SnapshotContext.tsx`
- Create: `frontend/src/context/mockSnapshot.ts`
- Create: `amplify.yml`

- [ ] **Step 1: Create frontend/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Auckland Transit Pulse</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create frontend/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

- [ ] **Step 3: Create frontend/tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 4: Create frontend/postcss.config.ts**

```typescript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 5: Create frontend/src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body,
#root {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
```

- [ ] **Step 6: Create frontend/src/main.tsx**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 7: Create frontend/src/context/SnapshotContext.tsx**

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Snapshot } from '../../../shared/types';
import { MOCK_SNAPSHOT } from './mockSnapshot';

interface SnapshotState {
  snapshot: Snapshot | null;
  isStale: boolean;
  isLoading: boolean;
  hasError: boolean;
}

const SnapshotContext = createContext<SnapshotState>({
  snapshot: null,
  isStale: false,
  isLoading: true,
  hasError: false,
});

const isMock = import.meta.env.VITE_MOCK === 'true';
const API_URL = `${((import.meta.env.VITE_API_URL as string) ?? '').replace(/\/$/, '')}/snapshot`;
const POLL_INTERVAL_MS = 30_000;
const STALE_THRESHOLD_MS = 60_000;

export function SnapshotProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(isMock ? MOCK_SNAPSHOT : null);
  const [isLoading, setIsLoading] = useState(!isMock);
  const [hasError, setHasError] = useState(false);
  const [isStale, setIsStale] = useState(false);

  async function fetchSnapshot() {
    try {
      const res = await fetch(API_URL);
      if (res.status === 204) return; // poller hasn't run yet, keep existing state
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Snapshot = await res.json();
      setSnapshot(data);
      setHasError(false);
      setIsStale(Date.now() - new Date(data.updatedAt).getTime() > STALE_THRESHOLD_MS);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isMock) return; // skip network calls entirely in mock mode
    void fetchSnapshot();
    const id = setInterval(() => void fetchSnapshot(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <SnapshotContext.Provider value={{ snapshot, isStale, isLoading, hasError }}>
      {children}
    </SnapshotContext.Provider>
  );
}

export function useSnapshot(): SnapshotState {
  return useContext(SnapshotContext);
}
```

- [ ] **Step 8: Create frontend/src/context/mockSnapshot.ts**

```typescript
import type { Snapshot } from '../../../shared/types';

export const MOCK_SNAPSHOT: Snapshot = {
  updatedAt: new Date().toISOString(),
  scorecard: {
    bus:   { active: 312, percentOnTime: 87 },
    train: { active: 24,  percentOnTime: 79 },
    ferry: { active: 8,   percentOnTime: 97 },
  },
  worstRoutes: [
    { routeId: 'route-274', name: '274',  avgDelayMinutes: 8 },
    { routeId: 'route-380', name: '380',  avgDelayMinutes: 6 },
    { routeId: 'route-NX1', name: 'NX1',  avgDelayMinutes: 5 },
    { routeId: 'route-NEX', name: 'NEX',  avgDelayMinutes: 4 },
    { routeId: 'route-321', name: '321',  avgDelayMinutes: 3 },
  ],
  alerts: [
    {
      id: 'alert-1',
      header: 'Northern Busway — signal fault',
      description: 'Buses on Northern Busway experiencing delays due to signal fault at Albany. Expect 15–20 min delays.',
    },
  ],
  vehicles: [
    // Buses scattered across greater Auckland
    { id: 'v1',  lat: -36.850, lng: 174.765, delaySeverity: 'green', mode: 'bus' },
    { id: 'v2',  lat: -36.862, lng: 174.771, delaySeverity: 'amber', mode: 'bus' },
    { id: 'v3',  lat: -36.870, lng: 174.760, delaySeverity: 'red',   mode: 'bus' },
    { id: 'v4',  lat: -36.855, lng: 174.755, delaySeverity: 'green', mode: 'bus' },
    { id: 'v5',  lat: -36.878, lng: 174.778, delaySeverity: 'none',  mode: 'bus' },
    { id: 'v6',  lat: -36.840, lng: 174.740, delaySeverity: 'green', mode: 'bus' },
    { id: 'v7',  lat: -36.900, lng: 174.790, delaySeverity: 'amber', mode: 'bus' },
    { id: 'v8',  lat: -36.820, lng: 174.730, delaySeverity: 'green', mode: 'bus' },
    { id: 'v14', lat: -36.935, lng: 174.856, delaySeverity: 'green', mode: 'bus' },
    { id: 'v15', lat: -36.915, lng: 174.832, delaySeverity: 'red',   mode: 'bus' },
    // Trains on Western and Eastern lines
    { id: 'v9',  lat: -36.880, lng: 174.752, delaySeverity: 'amber', mode: 'train' },
    { id: 'v10', lat: -36.895, lng: 174.769, delaySeverity: 'green', mode: 'train' },
    { id: 'v11', lat: -36.860, lng: 174.735, delaySeverity: 'red',   mode: 'train' },
    { id: 'v16', lat: -36.872, lng: 174.800, delaySeverity: 'green', mode: 'train' },
    // Ferries in the Waitemata Harbour
    { id: 'v12', lat: -36.843, lng: 174.769, delaySeverity: 'green', mode: 'ferry' },
    { id: 'v13', lat: -36.830, lng: 174.785, delaySeverity: 'none',  mode: 'ferry' },
  ],
};
```

- [ ] **Step 9: Create amplify.yml at repo root**

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build --workspace=frontend
  artifacts:
    baseDirectory: frontend/dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

- [ ] **Step 10: Verify the frontend builds locally**

```bash
cd frontend
VITE_MOCK=true npm run build
```

Expected: `frontend/dist/` created, no TypeScript or Vite errors.

- [ ] **Step 11: Commit**

```bash
git add frontend/ amplify.yml
git commit -m "feat: frontend scaffold with Vite, Tailwind dark theme, SnapshotContext, and mock data"
```

---

## Task 9: Header Component

**Files:**
- Create: `frontend/src/App.tsx` (stub)
- Create: `frontend/src/components/Header.tsx`

- [ ] **Step 1: Create frontend/src/App.tsx stub to enable dev server**

```tsx
import { SnapshotProvider } from './context/SnapshotContext';
import { Header } from './components/Header';

export function App() {
  return (
    <SnapshotProvider>
      <div className="flex flex-col h-screen bg-gray-900 text-white min-w-[1280px]">
        <Header />
        <div className="flex-1 flex items-center justify-center text-gray-600">
          Components loading…
        </div>
      </div>
    </SnapshotProvider>
  );
}
```

- [ ] **Step 2: Create frontend/src/components/Header.tsx**

```tsx
import { useSnapshot } from '../context/SnapshotContext';

export function Header() {
  const { snapshot, isStale, hasError, isLoading } = useSnapshot();

  const lastUpdated = snapshot
    ? new Date(snapshot.updatedAt).toLocaleTimeString('en-NZ')
    : isLoading
    ? 'Loading…'
    : '—';

  return (
    <header className="shrink-0 border-b border-gray-700">
      <div className="flex items-center justify-between px-6 py-3">
        <h1 className="text-lg font-semibold text-white tracking-wide">
          Auckland Transit Pulse
        </h1>
        <span className="text-sm text-gray-400">Last updated: {lastUpdated}</span>
      </div>
      {hasError && (
        <div className="bg-red-900/50 text-red-300 text-sm px-6 py-1">
          Connection lost — retrying
        </div>
      )}
      {!hasError && isStale && (
        <div className="bg-amber-900/50 text-amber-300 text-sm px-6 py-1">
          Data may be stale
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 3: Start the dev server and verify the header renders**

```bash
cd frontend
VITE_MOCK=true npm run dev
```

Open `http://localhost:5173`. Expect: dark background, "Auckland Transit Pulse" header, "Last updated" showing today's time (from mock data), no errors in console.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/Header.tsx
git commit -m "feat: Header component with title, timestamp, and stale/error banners"
```

---

## Task 10: Sidebar Panels — Scorecard, League Table, Alerts

**Files:**
- Create: `frontend/src/components/ScorecardPanel.tsx`
- Create: `frontend/src/components/LeagueTablePanel.tsx`
- Create: `frontend/src/components/AlertsPanel.tsx`

- [ ] **Step 1: Create frontend/src/components/ScorecardPanel.tsx**

```tsx
import { useSnapshot } from '../context/SnapshotContext';
import type { TransitMode } from '../../../shared/types';

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
    <section className="shrink-0 p-4 border-b border-gray-700">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
        Network Scorecard
      </h2>
      <div className="flex justify-between gap-2">
        {modes.map(mode => {
          const stats = snapshot?.scorecard[mode];
          const pct = stats?.percentOnTime ?? 0;
          return (
            <div key={mode} className="flex-1 text-center">
              <div className={`text-2xl font-bold ${stats ? pctColour(pct) : 'text-gray-600'}`}>
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

- [ ] **Step 2: Create frontend/src/components/LeagueTablePanel.tsx**

```tsx
import { useSnapshot } from '../context/SnapshotContext';

function delayColour(mins: number): string {
  return mins > 5 ? 'text-red-400' : 'text-amber-400';
}

export function LeagueTablePanel() {
  const { snapshot } = useSnapshot();
  const routes = snapshot?.worstRoutes ?? [];

  return (
    <section className="p-4 border-b border-gray-700 overflow-y-auto" style={{ maxHeight: '260px' }}>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
        Worst Routes
      </h2>
      {routes.length === 0 ? (
        <p className="text-sm text-gray-600">
          {snapshot ? 'All routes running on time' : 'Loading…'}
        </p>
      ) : (
        <ol className="space-y-1.5">
          {routes.map((r, i) => (
            <li key={r.routeId} className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 w-4 text-right shrink-0">{i + 1}.</span>
              <span className="text-gray-200 flex-1 truncate">{r.name}</span>
              <span className={`font-mono shrink-0 ${delayColour(r.avgDelayMinutes)}`}>
                +{r.avgDelayMinutes} min
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Create frontend/src/components/AlertsPanel.tsx**

```tsx
import { useSnapshot } from '../context/SnapshotContext';

export function AlertsPanel() {
  const { snapshot } = useSnapshot();
  const alerts = snapshot?.alerts ?? [];

  return (
    <section className="p-4 flex-1 overflow-y-auto">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
        Service Alerts
      </h2>
      {alerts.length === 0 ? (
        <p className="text-sm text-gray-600">
          {snapshot ? 'No active alerts' : 'Loading…'}
        </p>
      ) : (
        <ul className="space-y-3">
          {alerts.map(a => (
            <li key={a.id} className="flex items-start gap-2 text-sm">
              <span className="text-amber-400 mt-0.5 shrink-0">⚠</span>
              <div>
                <div className="text-gray-200 font-medium leading-snug">{a.header}</div>
                {a.description && (
                  <div className="text-gray-400 text-xs mt-0.5 leading-snug">{a.description}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ScorecardPanel.tsx frontend/src/components/LeagueTablePanel.tsx frontend/src/components/AlertsPanel.tsx
git commit -m "feat: Scorecard, LeagueTable, and Alerts sidebar panels"
```

---

## Task 11: Map Panel with Vehicle Markers

**Files:**
- Create: `frontend/src/components/MapPanel.tsx`

- [ ] **Step 1: Create frontend/src/components/MapPanel.tsx**

```tsx
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { useSnapshot } from '../context/SnapshotContext';
import type { DelaySeverity, TransitMode } from '../../../shared/types';
import 'leaflet/dist/leaflet.css';

const SEVERITY_COLOUR: Record<DelaySeverity, string> = {
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  none: '#6b7280',
};

const MODE_LABEL: Record<TransitMode, string> = {
  bus: 'Bus',
  train: 'Train',
  ferry: 'Ferry',
};

const AUCKLAND_CENTRE: [number, number] = [-36.86, 174.76];

export function MapPanel() {
  const { snapshot } = useSnapshot();
  const vehicles = snapshot?.vehicles ?? [];

  return (
    <MapContainer
      center={AUCKLAND_CENTRE}
      zoom={11}
      className="h-full w-full"
      zoomControl
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />
      {vehicles.map(v => (
        <CircleMarker
          key={v.id}
          center={[v.lat, v.lng]}
          radius={5}
          pathOptions={{
            fillColor: SEVERITY_COLOUR[v.delaySeverity],
            fillOpacity: 0.85,
            color: SEVERITY_COLOUR[v.delaySeverity],
            weight: 1,
          }}
        >
          <Tooltip>
            {MODE_LABEL[v.mode]} · {v.delaySeverity === 'none' ? 'no delay data' : v.delaySeverity}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/MapPanel.tsx
git commit -m "feat: MapPanel with live vehicle markers coloured by delay severity"
```

---

## Task 12: App Layout — Wire All Components

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Replace App.tsx stub with the full layout**

```tsx
import { SnapshotProvider } from './context/SnapshotContext';
import { Header } from './components/Header';
import { MapPanel } from './components/MapPanel';
import { ScorecardPanel } from './components/ScorecardPanel';
import { LeagueTablePanel } from './components/LeagueTablePanel';
import { AlertsPanel } from './components/AlertsPanel';

export function App() {
  return (
    <SnapshotProvider>
      <div className="flex flex-col h-screen bg-gray-900 text-white min-w-[1280px] overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-[62] overflow-hidden">
            <MapPanel />
          </main>
          <aside className="flex-[38] border-l border-gray-700 flex flex-col overflow-hidden">
            <ScorecardPanel />
            <LeagueTablePanel />
            <AlertsPanel />
          </aside>
        </div>
      </div>
    </SnapshotProvider>
  );
}
```

- [ ] **Step 2: Verify the frontend builds cleanly**

```bash
cd frontend
npm run build
```

Expected: no TypeScript errors, `frontend/dist/` produced.

- [ ] **Step 3: Run dev server and visually verify layout**

```bash
cd frontend
VITE_MOCK=true npm run dev
```

Open `http://localhost:5173`. Verify:
- Header across the top with a live timestamp
- Map fills the left 62% (dark CartoDB tiles, centred on Auckland) with 16 coloured vehicle dots
- Scorecard shows Bus 87%, Train 79%, Ferry 97% in green/amber
- Worst Routes shows 5 routes (274 +8 min, 380 +6 min, …)
- Service Alerts shows the Northern Busway signal fault alert
- No console errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: wire full 62/38 dashboard layout with map and sidebar panels"
```

---

## Task 13: AWS Setup + CDK Deploy + Amplify + Smoke Test

- [ ] **Step 1: Create a non-root IAM user for CLI access (one-time)**

Never use root credentials for CLI work. In the AWS Console (logged in as root):

1. Go to **IAM → Users → Create user**
2. Username: `Auckland-Transit-Pulse-Dev`
3. **Provide user access to the AWS Management Console** — No (CLI only)
4. Attach policy: `AdministratorAccess`
5. After creation, go to the user → **Security credentials** → **Create access key**
6. Use case: **Command Line Interface (CLI)**, dismiss the IAM Identity Center warning
7. Download the CSV or copy the Access Key ID and Secret Access Key

- [ ] **Step 2: Configure AWS CLI with the new IAM user credentials**

```bash
aws configure --profile atpulse-dev
```

Enter when prompted:
```
AWS Access Key ID:     <from Step 1>
AWS Secret Access Key: <from Step 1>
Default region name:   ap-southeast-2
Default output format: json
```

Verify it works and confirms you are NOT using root:
```bash
aws sts get-caller-identity --profile atpulse-dev
```

Expected: `"Arn": "arn:aws:iam::ACCOUNT_ID:user/Auckland-Transit-Pulse-Dev"`

Set the profile for the rest of this session:
```bash
export AWS_PROFILE=atpulse-dev
```

- [ ] **Step 3: Store the AT API key in SSM Parameter Store**

```bash
aws ssm put-parameter \
  --name "/auckland-transit-pulse/at-api-key" \
  --value "YOUR_AT_API_KEY_HERE" \
  --type SecureString \
  --region ap-southeast-2
```

Expected: `{ "Version": 1, "Tier": "Standard" }`

- [ ] **Step 4: Bootstrap CDK for your account (one-time, skip if done)**

```bash
aws sts get-caller-identity   # note your account ID
cdk bootstrap aws://YOUR_ACCOUNT_ID/ap-southeast-2
```

Expected: `✅ Environment aws://ACCOUNT_ID/ap-southeast-2 bootstrapped.`

- [ ] **Step 5: Deploy the CDK stack**

```bash
cd infra
npm run deploy
```

When prompted `Do you wish to deploy these changes (y/n)?` enter `y`.

Expected output includes:
```
✅  AucklandTransitPulseStack
Outputs:
AucklandTransitPulseStack.ApiUrl = https://XXXXXXXXXX.execute-api.ap-southeast-2.amazonaws.com/prod/
```

Copy the `ApiUrl` value — you'll need it for Amplify.

- [ ] **Step 6: Test the API Lambda manually (snapshot will be empty until poller runs)**

```bash
curl https://XXXXXXXXXX.execute-api.ap-southeast-2.amazonaws.com/prod/snapshot
```

Expected: HTTP 204 (no content yet — poller hasn't run). Wait ~60 seconds then retry.

After ~60s:
```bash
curl https://XXXXXXXXXX.execute-api.ap-southeast-2.amazonaws.com/prod/snapshot | head -c 200
```

Expected: JSON starting with `{"updatedAt":"...","scorecard":{...}` — confirms the full pipeline is working.

- [ ] **Step 7: Create a GitHub repository and push the code**

> **STOP — provide the following before continuing:**
> 1. Create a new repository on GitHub (e.g. `auckland-transit-pulse`) — public or private, your choice
> 2. Tell me the repository URL (e.g. `https://github.com/YOUR_USERNAME/auckland-transit-pulse`)
> I will then run the push commands for you.

Once you have provided the URL, run:
```bash
git remote add origin https://github.com/YOUR_USERNAME/auckland-transit-pulse.git
git push -u origin main
```

Expected: all commits from Tasks 1–12 pushed to GitHub.

- [ ] **Step 8: Connect Amplify Hosting to the git repository**

In the AWS Console:
1. Open **AWS Amplify** → **Create new app** → **Host web app**
2. Choose **GitHub**, authorise, and select the `auckland-transit-pulse` repository and `main` branch
3. Build settings: Amplify will detect `amplify.yml` automatically
4. Add environment variable: `VITE_API_URL` = `https://XXXXXXXXXX.execute-api.ap-southeast-2.amazonaws.com/prod`
5. Click **Save and deploy**

Expected: Amplify builds and deploys. The app URL appears (e.g. `https://main.XXXX.amplifyapp.com`).

- [ ] **Step 9: Open the Amplify URL and smoke test**

Open the Amplify URL in a desktop browser (1280px+ width). Verify:
- Dark dashboard loads
- Map shows Auckland with coloured vehicle dots
- Scorecard shows % values for Bus, Train, Ferry
- Worst Routes shows up to 10 routes with delay minutes
- Service Alerts shows any active disruptions (may be empty if network is running well)
- "Last updated" timestamp advances every ~30s
- Browser console shows no errors

- [ ] **Step 10: Commit any remaining files and tag the MVP release**

```bash
git add .
git status   # confirm nothing unexpected is staged
git commit -m "chore: MVP complete"
git tag v0.1.0
```

---

## Teardown (when done)

```bash
# Remove backend infrastructure
cd infra && npm run destroy

# Remove SSM parameter (not managed by CDK)
aws ssm delete-parameter --name "/auckland-transit-pulse/at-api-key" --region ap-southeast-2

# In Amplify console: Actions → Delete app
```
