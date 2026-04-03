

# Session Intent Layer — Side Mode Selection Per Session

## Problem
Currently, switch hitters always see the `SideToggle` and non-switch players never do. There's no way for a switch hitter to say "today I'm only hitting right" or for a right-handed hitter to say "I want to work both sides today." Session intent is missing.

## Architecture

```text
Athlete Identity (DB, set once)
  └── Session Intent (asked each session, stored in state)
       └── Rep Execution (per-rep side, stored with rep)
```

## Changes

### 1. `src/components/practice/SessionIntentGate.tsx` (NEW)
A compact one-tap mode selector shown at the top of the rep area before the first rep is logged.

**Hitting** (when `primaryBattingSide` is known):
- Three options: `Right Only` | `Left Only` | `Both`
- Default pre-selected based on identity: `'S'` → `Both`, `'R'` → `Right Only`, `'L'` → `Left Only`

**Pitching** (when `primaryThrowingHand` is known):
- Three options: `Right Arm` | `Left Arm` | `Both`
- Same default logic

**Design**: Horizontal segmented control (like the existing Quick/Advanced toggle style). One tap confirms — no modal, no extra button. Selecting a value immediately sets the mode and the gate disappears, replaced by the normal rep input.

### 2. `src/components/practice/RepScorer.tsx`
**A. New state:**
```ts
const [sideMode, setSideMode] = useState<'R' | 'L' | 'BOTH' | null>(null);
```

**B. Auto-default on mount** (via useEffect):
- Switch hitter → default `'BOTH'`
- Right-handed → default `'R'`
- Left-handed → default `'L'`
- But do NOT auto-confirm — show the `SessionIntentGate` so user can override

**C. Show `SessionIntentGate`** when `sideMode === null` and identity is known (after the identity gate). This replaces the current immediate jump to rep input.

**D. Toggle visibility update:**
- `SideToggle` shown ONLY when `sideMode === 'BOTH'`
- When `sideMode === 'R'` or `'L'`, lock `effectiveBatterSide` / `effectivePitcherHand` to that value — no toggle rendered

**E. Update `effectiveBatterSide` / `effectivePitcherHand`:**
```ts
const effectiveBatterSide = sideMode === 'BOTH' ? switchSide : (sideMode ?? handedness);
const effectivePitcherHand = sideMode === 'BOTH' ? switchThrowSide : (sideMode ?? handedness);
```

**F. Gate ordering** (the return-early chain):
1. Identity gate (existing — only if DB identity is null)
2. Session intent gate (NEW — only if `sideMode` is null and module is hitting/pitching)
3. Normal rep input

### 3. No changes needed to:
- `HandednessGate.tsx` — identity gate stays as-is
- `SideToggle.tsx` — component stays as-is, just conditionally rendered
- `SessionConfigPanel.tsx` — session config is unrelated to side intent
- `useSwitchHitterProfile.ts` — already exposes everything needed
- Database — no schema changes, `sideMode` is session-local state only

## Data Flow

```text
Identity (DB)           Session Intent (state)      Rep Execution
primary_batting_side    sideMode = 'R'|'L'|'BOTH'   batter_side per rep
├── 'R' → default 'R'  ├── 'R' → lock to R          └── always R
├── 'L' → default 'L'  ├── 'L' → lock to L          └── always L
└── 'S' → default BOTH └── 'BOTH' → show toggle     └── R or L per tap
```

## Files

| File | Change |
|------|--------|
| `src/components/practice/SessionIntentGate.tsx` | **NEW** — one-tap session mode selector |
| `src/components/practice/RepScorer.tsx` | Add `sideMode` state, show intent gate, conditional toggle |

