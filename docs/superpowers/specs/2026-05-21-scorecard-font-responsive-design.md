# Scorecard Responsive Font Size Design

**Goal:** Make the Network Scorecard percentage numbers scale with screen height instead of using a fixed `text-2xl` size, so the scorecard fills its `flex-[3]` panel height more naturally across monitor sizes.

**Architecture:** One CSS value change in `ScorecardPanel.tsx`. No layout, data, or backend changes. The `clamp()` CSS function expresses a minimum, a viewport-relative preferred value, and a maximum — all natively supported in modern browsers and Tailwind's arbitrary-value syntax.

**Tech Stack:** Tailwind CSS arbitrary values, CSS `clamp()`, `vh` units.

---

## Change

**File:** `frontend/src/components/ScorecardPanel.tsx`

Replace the `text-2xl` class on the percentage `<div>` with `text-[clamp(1.5rem,2.2vh,2rem)]`:

```tsx
// Before
<div className={`text-2xl font-bold ${stats ? pctColour(pct) : 'text-gray-600'}`}>

// After
<div className={`text-[clamp(1.5rem,2.2vh,2rem)] font-bold ${stats ? pctColour(pct) : 'text-gray-600'}`}>
```

### Clamp values

| Value | Meaning |
|-------|---------|
| `1.5rem` (24 px) | Floor — never smaller than this |
| `2.2vh` | Preferred — 2.2% of viewport height |
| `2rem` (32 px) | Ceiling — never larger than this |

At a typical 900 px tall monitor: `2.2 × 9 = 19.8 px` → clamped up to 24 px floor.
At a 1080 px tall monitor: `2.2 × 10.8 = 23.76 px` → still at floor (~24 px).
At a 1440 px tall monitor: `2.2 × 14.4 = 31.68 px` → near ceiling (32 px).

The numbers grow meaningfully on tall/large monitors and stay readable at minimum on laptop screens.

---

## What does NOT change

- Panel flex ratio: scorecard `flex-[3]`, worst routes `flex-[4]`, alerts `flex-[3]` — unchanged
- Map: no changes
- Backend, shared types, tests: no changes
- All other text in `ScorecardPanel.tsx` (heading, mode label, active count): unchanged

---

## Testing

Manual only (visual change):

1. Run `VITE_MOCK=true npm run dev` in `frontend/`
2. Open `http://localhost:5173`
3. Verify scorecard percentage numbers are visible and appropriately sized
4. Resize the browser window vertically — numbers should subtly grow/shrink
5. Confirm no layout breakage at minimum 1280 px width
