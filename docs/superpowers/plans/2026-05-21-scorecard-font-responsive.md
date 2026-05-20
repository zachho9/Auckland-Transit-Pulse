# Scorecard Responsive Font Size Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed `text-2xl` size on scorecard percentage numbers with `text-[clamp(1.5rem,2.2vh,2rem)]` so they scale with viewport height.

**Architecture:** One class change in one file. No tests exist for visual output — verification is a build check plus visual inspection in mock mode.

**Tech Stack:** Tailwind CSS arbitrary values, CSS `clamp()`.

---

## File Map

| File | Change |
|------|--------|
| `frontend/src/components/ScorecardPanel.tsx` | `text-2xl` → `text-[clamp(1.5rem,2.2vh,2rem)]` on the percentage `<div>` |

---

## Task 1: Update scorecard font size

**Files:**
- Modify: `frontend/src/components/ScorecardPanel.tsx`

- [ ] **Step 1: Open the file and locate the percentage `<div>`**

The target line is inside the `.map(mode => ...)` block, around line 32:

```tsx
<div className={`text-2xl font-bold ${stats ? pctColour(pct) : 'text-gray-600'}`}>
```

- [ ] **Step 2: Replace `text-2xl` with the clamp value**

Change that line to:

```tsx
<div className={`text-[clamp(1.5rem,2.2vh,2rem)] font-bold ${stats ? pctColour(pct) : 'text-gray-600'}`}>
```

No other lines change. The full updated `return` block for reference:

```tsx
return (
  <div key={mode} className="flex-1 text-center">
    <div className={`text-[clamp(1.5rem,2.2vh,2rem)] font-bold ${stats ? pctColour(pct) : 'text-gray-600'}`}>
      {stats ? `${pct}%` : '—'}
    </div>
    <div className="text-xs text-gray-400 mt-1">{MODE_LABELS[mode]}</div>
    {stats && (
      <div className="text-xs text-gray-500">{stats.active} active</div>
    )}
  </div>
);
```

- [ ] **Step 3: Verify the build is clean**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: `✓ built in X.XXs` with no errors. Tailwind's arbitrary-value syntax supports `clamp()` — if it errors, check there are no spaces inside the brackets (use `clamp(1.5rem,2.2vh,2rem)` not `clamp(1.5rem, 2.2vh, 2rem)`).

- [ ] **Step 4: Verify visually in mock mode**

```bash
cd frontend && $env:VITE_MOCK="true"; npm run dev
```

On Windows Git Bash:
```bash
cd frontend && VITE_MOCK=true npm run dev
```

Open `http://localhost:5173`. Check the right panel:
- The three percentage numbers (Bus / Train / Ferry) should be visible and appropriately sized — larger than the surrounding text but not dominating
- Resize the browser window vertically: numbers should grow slightly on a tall window, shrink slightly on a short one
- All other text in the scorecard (heading, mode labels, active counts) should be unchanged

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ScorecardPanel.tsx
git commit -m "feat: responsive scorecard font size with clamp(1.5rem,2.2vh,2rem)"
```
