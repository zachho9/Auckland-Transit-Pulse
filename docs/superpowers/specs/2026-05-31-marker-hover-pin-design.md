# Marker Hover & Pin Interaction Design

## Overview

Replace the current two-component (Tooltip + Popup) marker interaction with a unified tooltip-based system that supports both ephemeral hover cards and a sticky pinned card.

## Current Behaviour

- **Hover (Tooltip):** Shows `mode · severity` only. Disappears on mouse leave.
- **Click (Popup):** Shows route short name (coloured by severity) + `mode · severity`. Stays open until dismissed via Leaflet's built-in close button or clicking the map.

## Target Behaviour

- **Hover:** A card appears at the hovered marker showing route name + mode + severity. Disappears when the mouse leaves.
- **Click:** Pins that marker's card so it stays visible after the mouse leaves.
- **Two cards visible simultaneously:** The pinned card and a hover card on a different marker can both be visible at once, each positioned at their respective marker.
- **Dismissing the pinned card:**
  - Click the pinned marker again → unpins (toggle)
  - Click a different marker → that marker becomes pinned, previous is unpinned
  - Click the map background → unpins
- **Visual styling:** Pinned and hover cards are identical in appearance — same dark background, same text layout.

## Card Content

Both hover and pinned cards display:
1. Route short name — coloured by delay severity (green / amber / red / slate for none)
2. `mode · severity` label below in muted text

This matches the content previously shown only in the Popup.

## Architecture

### State

One new state variable in `MapPanel`:

```
pinnedId: string | null
```

Tracks the `id` of the pinned vehicle, or `null` if nothing is pinned.

### Marker changes

- Remove `<Popup>` from every marker.
- Replace current minimal `<Tooltip>` content with full card content (route name + mode · severity).
- Conditionally set `permanent={true}` on the tooltip of the pinned marker only.
- Add `eventHandlers.click` to each marker:
  - If clicked marker is already pinned → set `pinnedId` to `null`
  - Otherwise → set `pinnedId` to this marker's vehicle id
  - Stop event propagation so the map click handler does not also fire

### Map click handler

A small helper component using `useMapEvents` listens for clicks on the map background and sets `pinnedId` to `null`.

## Files Affected

- `frontend/src/components/MapPanel.tsx` — only file that needs changes
