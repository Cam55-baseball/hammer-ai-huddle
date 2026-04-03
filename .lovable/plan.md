

# Fix Session Identity — Persistent Athlete Handedness

## Problem
Every session, `HandednessGate` asks R/L via localStorage. This should be set once from the athlete's DB profile (`primary_batting_side` / `primary_throwing_hand`) and never asked again.

## Current Flow
1. `RepScorer` checks `handedness` state (starts `undefined`)
2. If undefined + not switch player → shows `HandednessGate`
3. `HandednessGate` checks localStorage for saved value, auto-selects if found
4. User selects → saves to localStorage → sets `handedness` state

**Problems**: localStorage is device-specific, not athlete-specific. Prompt appears on new devices. Identity should come from DB.

## New Flow
1. `useSwitchHitterProfile` already fetches `primary_batting_side` and `primary_throwing_hand` from `athlete_mpi_settings`
2. `RepScorer` reads these values on mount
3. If DB value exists (R or L) → auto-set `handedness`, no gate shown
4. If DB value is null (legacy user) → show a **one-time identity prompt** (not the old HandednessGate) → save to DB → never ask again
5. If DB value is 'S' → skip gate (existing switch toggle handles it)

## Changes

### 1. `src/hooks/useSwitchHitterProfile.ts`
- Expose `primaryBattingSide` and `primaryThrowingHand` raw values from settings
- Add a `saveIdentity(field, value)` mutation function that updates `athlete_mpi_settings` in DB
- Uses `useMutation` + invalidates the query cache on success

### 2. `src/components/practice/HandednessGate.tsx` → **Redesign as Identity Gate**
- Rename concept: this is now an **identity setup**, not a session prompt
- For **hitting**: show 3 options — Right-Handed, Left-Handed, Switch Hitter
- For **pitching/throwing/fielding**: show 3 options — Right-Handed, Left-Handed, Ambidextrous
- On selection: call `saveIdentity()` to persist to DB (sets `primary_batting_side` or `primary_throwing_hand`)
- For Switch/Ambidextrous: also sets `is_switch_hitter` or `is_ambidextrous_thrower` flag
- Header text: "Set Your [Batting Stance / Throwing Hand]" with subtitle "This is saved to your profile — you won't be asked again"
- Remove localStorage dependency entirely

### 3. `src/components/practice/RepScorer.tsx`
- Pull `primaryBattingSide`, `primaryThrowingHand`, `saveIdentity` from `useSwitchHitterProfile`
- On mount: if hitting and `primaryBattingSide` is 'R' or 'L' → `setHandedness(primaryBattingSide)`
- On mount: if pitching and `primaryThrowingHand` is 'R' or 'L' → `setHandedness(primaryThrowingHand)`
- Gate logic becomes: show identity gate **only** if DB value is null (first time ever)
- Remove localStorage-based handedness logic from `useSessionDefaults`
- Switch hitter default: initialize `switchSide` from `primaryBattingSide` if it's 'S', defaulting to 'R'

### 4. `src/hooks/useSessionDefaults.ts`
- Remove `getHandedness` / `saveHandedness` functions (no longer needed)
- Keep `getDefaults` / `saveDefaults` for other session config

## Data Flow

```text
athlete_mpi_settings.primary_batting_side
├── null → Show Identity Gate (one-time) → save to DB
├── 'R' or 'L' → Auto-set handedness, no prompt
└── 'S' → Skip gate, show SideToggle (existing)
```

## Files Modified

| File | Change |
|------|--------|
| `useSwitchHitterProfile.ts` | Expose raw values + `saveIdentity` mutation |
| `HandednessGate.tsx` | Redesign as 3-option identity prompt, save to DB |
| `RepScorer.tsx` | Auto-load from DB, only show gate if null |
| `useSessionDefaults.ts` | Remove handedness localStorage functions |

## What This Does NOT Touch
- Base stealing trainers
- Session-level fields
- Switch toggle (already works)
- No DB schema changes (columns already exist)

