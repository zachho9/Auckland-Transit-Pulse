# Auckland Transit Pulse

<img width="1682" height="1040" alt="atpulse" src="https://github.com/user-attachments/assets/f8bf8f45-a3c5-49a4-b5db-46c317bd89f8" />

A real-time network health monitor for Auckland public transport. Not a trip planner — it answers "how well is the network running *right now*?"

**Live demo:** https://main.d7yvveey6muxf.amplifyapp.com

---

## Features

- **Network scorecard** — vehicles active, vehicles late, and % delayed broken down by bus, train, and ferry
- **Worst routes** — live league table of the 10 most delayed routes, ranked by average delay
- **Vehicle map** — real-time positions of all active vehicles with delay severity colour-coding
- **Mode filter** — toggle between bus, train, and ferry views
- **Route search** — search by route number to highlight a route and overlay its shape on the map
- **Hourly on-time rate** — line chart of punctuality over the past 24 hours
- **Service alerts** — active disruptions published by Auckland Transport

Auto-refreshes every 30 seconds. Desktop browser only.

---

## Architecture

```
Auckland Transport GTFS-RT API
        │
        ▼ (every 60 s)
  Lambda — poller        aggregates delay/on-time data
        │
        ▼
   DynamoDB              stores latest network snapshot
        │
        ▼
  Lambda — API           serves snapshot + route shapes
        │
  API Gateway
        │
        ▼
  React frontend         polls every 30 s
  (AWS Amplify)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, react-leaflet |
| Backend | AWS Lambda (TypeScript), API Gateway, DynamoDB |
| Infrastructure | AWS CDK, Amplify, EventBridge |
| Data | Auckland Transport GTFS-RT Realtime API |

---

## Local Development

No AWS account needed — run against hardcoded mock data:

```bash
cd frontend
npm install
VITE_MOCK=true npm run dev
```

Open http://localhost:5173.

To run against a live deployed backend:

```bash
cd frontend
VITE_API_URL=https://<your-api-gateway-url>/prod npm run dev
```

---

## Deployment

See [deploy-guides.md](deploy-guides.md) for full deploy and undeploy instructions, including CDK stack setup, DynamoDB, S3 shapes bucket, SSM secrets, and Amplify configuration.

---

## Project Structure

```
frontend/          React app (Vite + Tailwind)
backend/           Lambda functions (poller + API)
infra/             AWS CDK stack definition
shared/            Shared TypeScript types
deploy-guides.md   Deploy and undeploy instructions
```

---

## Data Source

Vehicle positions, delays, and alerts come from the [Auckland Transport Developer Portal](https://dev-portal.at.govt.nz) GTFS-RT feed.
