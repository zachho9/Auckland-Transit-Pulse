# Scorecard Font Fill Design

**Goal:** Make the Network Scorecard percentage numbers genuinely scale with viewport height on large monitors, and vertically centre the content block so blank space is distributed evenly above and below.

**Architecture:** Two CSS changes in `ScorecardPanel.tsx`. No layout ratio, data, or backend changes.

**Tech Stack:** Tailwind CSS arbitrary values, CSS `clamp()`, `vh` units.

---

## Changes

**File:** `frontend/src/components/ScorecardPanel.tsx`

### 1. Raise the clamp ceiling

Replace `text-[clamp(1.5rem,2.2vh,2rem)]` with `text-[clamp(1.5rem,5vh,5rem)]`:

| Screen height | Computed font size |
|--------------|-------------------|
| 600 px | 30 px |
| 900 px | 45 px |
| 1080 px | 54 px |
| 1440 px | 72 px |
| ≥ 1600 px | 80 px (5rem cap) |

### 2. Add vertical centering

Add `flex flex-col justify-center` to the `<section>` element so the heading + stats block sits in the middle of the panel rather than at the top. Remove `overflow-y-auto` — the content will never overflow with vertically centred layout.

Before:
```tsx
<section className="flex-[3] overflow-y-auto p-4 border-b border-gray-700">
```

After:
```tsx
<section className="flex-[3] flex flex-col justify-center p-4 border-b border-gray-700">
```

---

## What does NOT change

- Panel flex ratio: scorecard `flex-[3]`, worst routes `flex-[4]`, alerts `flex-[3]` — unchanged
- Map, backend, shared types, tests: unchanged
- All other text in `ScorecardPanel.tsx` (heading, mode labels, active counts): unchanged

---

## Testing

Manual only (visual change):

1. Run `VITE_MOCK=true npm run dev` in `frontend/`
2. Open `http://localhost:5173`
3. Resize browser vertically — percentage numbers should grow/shrink proportionally
4. On a large monitor or DevTools device emulation at 2560×1440: numbers should be ~72 px, content block vertically centred in the panel
5. Confirm no layout breakage in other panels
