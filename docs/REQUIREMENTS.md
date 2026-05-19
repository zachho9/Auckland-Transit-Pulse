# Auckland Transit Pulse — Project Requirements

## What It Is

A personal live web dashboard showing real-time performance health of Auckland's public transport network. Not a trip planner — a network health monitor.

## The Problem

There is no tool that answers "how well is the Auckland network running right now?" AT Mobile and AnyTrip help plan individual trips but show no network-wide performance data.

## Data Source

Auckland Transport API (Realtime Compat API and GTFS API, not sure if any are helpful). Their OpenAPI specs at ./data

## MVP Scope

Three panels:

- **Network scorecard** — vehicles active, vehicles late, % delayed per mode (bus, train, ferry)
- **Route league table** — top 10 worst routes ranked by current average delay
- **Service alerts** — active disruptions flagged by AT

Auto-refreshes every 30 seconds. Desktop browser only. No user accounts. No historical data.
Use AWS stack for easy deploy and undeploy the live dashboard

## Desired Result

Data-rich, visually engaging dashboard. Health status immediately obvious at a glance through colour and layout — no need to read carefully to understand if the network is having a bad day.

## Future

Historical data storage and public deployment are planned but out of scope for MVP.
