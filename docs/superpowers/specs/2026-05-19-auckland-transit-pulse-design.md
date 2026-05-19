# Auckland Transit Pulse — Design Spec

**Date:** 2026-05-19
**Status:** Approved

---

## What It Is

A personal live web dashboard showing real-time performance health of Auckland's public transport network. Not a trip planner — a network health monitor. Answers "how well is the Auckland network running right now?" at a glance through colour and layout.

---

## AWS Architecture

```
Amplify Hosting (React SPA)
        │  fetches every 30s
        ▼
API Gateway → Lambda (API)  ──reads──▶ DynamoDB
                                           ▲
EventBridge Scheduler (every 30s)          │
        │                                  │
        ▼                                 writes
Lambda (Poller) ──calls──▶ AT Realtime API + GTFS API
```

### Services

| Service | Role |
|---|---|
| Amplify Hosting | Serves React SPA + CI/CD from git (replaces S3 + CloudFront) |
| EventBridge Scheduler | Triggers Poller Lambda every 30s |
| Lambda (Poller) | Fetches AT API, aggregates data, writes snapshot to DynamoDB |
| Lambda (API) | Reads latest snapshot from DynamoDB, returns to frontend |
| API Gateway | HTTP interface exposing the API Lambda |
| DynamoDB | Stores latest snapshot; becomes historical store post-MVP |
| SSM Parameter Store | Stores AT API key (SecureString, free tier, encrypted via KMS) |
| CDK (TypeScript) | IaC for all backend services — one command deploy/destroy |

### Key CDK settings

- DynamoDB `removalPolicy: RemovalPolicy.DESTROY` — table destroyed on `cdk destroy` for clean undeploy. Change to `RETAIN` when historical data matters post-MVP.
- AT API key stored in SSM manually (`aws ssm put-parameter`); CDK grants Poller Lambda IAM read permission for that specific parameter only. SSM parameter is not managed by CDK and survives `cdk destroy`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript |
| Backend | Node.js Lambda + TypeScript |
| IaC | AWS CDK (TypeScript) |
| Map | Leaflet.js + react-leaflet, CartoDB Dark Matter tiles |
| Styling | Dark theme throughout |

---

## Dashboard Layout

Single page, desktop-optimised (1280px+ width), no navigation.

```
┌─────────────────────────────────────────────────────────────────┐
│  Auckland Transit Pulse                    Last updated: 14:32:01│
├──────────────────────────────────────┬──────────────────────────┤
│                                      │  NETWORK SCORECARD       │
│                                      │  Bus  Train  Ferry       │
│                                      │  🟢 94% 🟡 81% 🟢 97%   │
│                                      │  312 active vehicles     │
│         LIVE MAP                     ├──────────────────────────┤
│   (vehicle dots, route overlays,     │  WORST ROUTES            │
│    coloured by delay severity)       │  1. 274 – avg +8 min     │
│                                      │  2. 380 – avg +6 min     │
│                                      │  3. NX1 – avg +5 min     │
│                                      │  ...                     │
│                                      ├──────────────────────────┤
│                                      │  SERVICE ALERTS          │
│                                      │  ⚠ Northern busway –     │
│                                      │    signal fault          │
└──────────────────────────────────────┴──────────────────────────┘
```

- Map: ~62% width, primary at-a-glance health view
- Sidebar: ~38% width, three panels stacked vertically, alerts section scrollable
- Header: title left, last-updated timestamp right, stale/error banners below header

---

## Colour Scale

Applied consistently across map vehicle dots, scorecard indicators, and league table entries:

| Delay | Colour | Hex |
|---|---|---|
| ≤ 2 min late | Green | `#22c55e` |
| 2–5 min late | Amber | `#f59e0b` |
| > 5 min late | Red | `#ef4444` |
| No data | Grey | `#6b7280` |

---

## Data Flow

### GTFS Static Data

`routes.txt` and `trips.txt` from `/data/gtfs/` are bundled directly into the Poller Lambda deployment package at build time. They are small files and change infrequently. When AT publishes a new GTFS static feed, the Lambda is redeployed. No S3 or DynamoDB lookup table needed for MVP.

### Poller Lambda (every 30s)

1. Fetch AT Realtime combined feed → vehicle positions + trip updates + service alerts
2. Cross-reference bundled GTFS static data (routes.txt, trips.txt) to resolve route names and mode from `route_type`:
   - `2` = Rail (train)
   - `3` = Bus
   - `4` = Ferry
3. Aggregate into snapshot:
   - **Scorecard:** per-mode active vehicle count + % on time
   - **League table:** top 10 routes by average delay, worst first
   - **Alerts:** active service disruptions from AT
   - **Vehicles:** each vehicle's lat/lng + delay severity + mode (for map)
4. Write snapshot to DynamoDB as single item (`pk: "snapshot"`, `sk: "latest"`)

### API Lambda

- Single endpoint: `GET /snapshot`
- Reads latest DynamoDB item, returns shaped JSON
- One round-trip from browser; all panels and map update together

### DynamoDB Item Structure

```ts
{
  pk: "snapshot",
  sk: "latest",
  updatedAt: "2026-05-19T14:32:01Z",
  scorecard: {
    bus:   { active: number, percentOnTime: number },
    train: { active: number, percentOnTime: number },
    ferry: { active: number, percentOnTime: number }
  },
  worstRoutes: [
    { routeId: string, name: string, avgDelayMinutes: number }
    // top 10
  ],
  alerts: [
    { id: string, header: string, description: string }
  ],
  vehicles: [
    { id: string, lat: number, lng: number, delaySeverity: "green" | "amber" | "red" | "none", mode: "bus" | "train" | "ferry" }
  ]
}
```

---

## Frontend Components

```
App
├── Header — title + last updated timestamp + stale/error banners
├── MapPanel (62% width)
│   ├── VehicleMarker × N — coloured dot per active vehicle
│   └── RouteOverlay × N — route lines coloured by avg delay
└── Sidebar (38% width)
    ├── ScorecardPanel — per mode: active count + % on time + colour indicator
    ├── LeagueTablePanel — ranked list, route name + avg delay in minutes
    └── AlertsPanel — scrollable list of active disruptions
```

**Data fetching:**
- Single `useSnapshot()` hook — fetches `GET /snapshot` every 30s via `setInterval`
- Returns `{ scorecard, worstRoutes, alerts, vehicles, updatedAt, isStale }`
- Shared via React Context — no prop drilling

**Shared TypeScript types** defined once and imported by both Lambda functions and React components, enforcing the API contract at compile time.

---

## Error Handling

### Poller Lambda
- AT API call fails → log error, skip DynamoDB write. Previous snapshot remains valid; frontend shows stale banner.
- Partial AT API data → write succeeded fields, set failed fields to `null`. Frontend renders available panels, shows partial data indicator on affected panels.

### API Lambda
- DynamoDB read fails → HTTP 503. Frontend retains last successful snapshot, shows connection error banner.
- No snapshot exists yet → HTTP 204. Frontend shows "warming up" loading state.

### Frontend
- Fetch fails → retain last good data, show "Connection lost — retrying" banner
- `updatedAt` > 60s ago → show "Data may be stale" warning
- Map tiles fail → Leaflet degrades gracefully; panels continue to function

---

## Testing

- **Unit tests:** Poller aggregation logic only — pure TypeScript functions (AT API response → shaped snapshot). Most complex logic in the system; worth thorough coverage.
- **TypeScript types:** Shared types between Poller Lambda, API Lambda, and React as the first correctness layer.
- **No E2E tests for MVP:** overhead not justified for a personal project at this stage.
- **Manual smoke test** against live AT API after each deploy.

---

## Out of Scope (MVP)

- Historical data storage (DynamoDB `removalPolicy` change enables this post-MVP with no rework)
- Public deployment (Amplify supports this with no architecture change)
- Mobile / responsive layout
- User accounts or authentication
- Trip planning
