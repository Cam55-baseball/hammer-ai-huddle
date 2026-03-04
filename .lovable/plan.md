

# Implementation Plan: Subscription Data Freeze, Baserunning Cleanup, Fielding Position, and Hitter Side Auto-Flip

## 1. Subscription Data Freeze Logic

### Problem
No mechanism currently exists to freeze/archive module data when a subscription is canceled. The `subscriptions` table has `status` but no per-module freeze state, and the UI has no read-only mode for expired modules.

### Database Migration
Add a `module_data_status` JSONB column to the `subscriptions` table to track per-module freeze state:
```sql
ALTER TABLE public.subscriptions 
  ADD COLUMN module_data_status jsonb DEFAULT '{}'::jsonb;

-- Example stored value: {"baseball_hitting": "active", "baseball_pitching": "frozen"}
```

### New Hook: `useModuleAccessState.ts`
Centralizes access logic combining subscription status with freeze state:
- `getModuleState(module, sport)` returns `'active' | 'frozen' | 'archived' | 'none'`
- `isFrozen(module, sport)` — true if module data exists but subscription lapsed
- `isReadOnly(module, sport)` — true for frozen/archived states

### Edge Function: `check-subscription` Update
When a module is found in `subscribed_modules` but Stripe shows it canceled:
- Set that module's `module_data_status` entry to `'frozen'`
- On re-subscribe, automatically set back to `'active'`
- Never delete performance data

### UI Changes
- **Practice Hub**: When module is frozen, show a banner "This module is in read-only mode. Re-subscribe to resume logging." and disable the rep logging flow.
- **Dashboard module cards**: Show a "frozen" badge with last-active date; clicking navigates to read-only analytics.
- **Analytics pages**: Remain fully viewable (read-only) — no data gating on historical trends.
- **Coach dashboards / Org data**: Unaffected by player subscription status.

### Data Integrity Rules
- `performance_sessions` rows are NEVER hard-deleted on unsubscribe
- Position history preserved in `athlete_mpi_settings` (already has position fields)
- Re-subscription reconnects to existing data via `user_id` — no duplication

---

## 2. Remove Target Reps + Dominant Side from Baserunning

### Files Changed

| File | Change |
|------|--------|
| `SessionConfigPanel.tsx` | Remove the "Target Reps" section (lines 310-334) and `target_reps` from `handleConfirm` |
| `SessionConfig` interface | Remove `target_reps` field |
| `PracticeHub.tsx` | Remove the baserunning target reps progress bar (lines 297-309) |
| `HandednessGate.tsx` | Remove the `baserunning` entry from `labels` map (line 18) |
| `RepScorer.tsx` | Remove `isBaserunning && { throwing_hand: handedness }` from `commitRep` (line 234) |

No database changes needed — `target_reps` is only in the UI config, not persisted. The `throwing_hand` field on baserunning reps simply stops being set.

---

## 3. Add Position Selection to Fielding Sessions

### ScoredRep Interface Update (`RepScorer.tsx`)
Add `fielding_position?: string` to the `ScoredRep` interface.

### New Component: `FieldingPositionSelector.tsx`
A grid selector with positions: P, C, 1B, 2B, 3B, SS, LF, CF, RF. Uses the same `SelectGrid` pattern as other rep fields. Displayed at the top of the fielding fields section (before Play Type).

### RepScorer Changes
- Add `fielding_position` to the fielding section, required before confirming a rep
- Include `fielding_position` in `commitRep` so it tags every rep
- Add validation: `canConfirm` requires `fielding_position` when `isFielding`

### SessionConfigPanel Changes
Add a session-level default position selector for fielding sessions so athletes can set their primary position once and override per-rep if needed.

---

## 4. Hitter Side Auto-Flip Pitch Location Chart

### Current State
`PitchLocationGrid` already accepts `batterSide` and mirrors zone labels for LHH. `RepScorer` already passes `handedness` as `batterSide`. This is **already implemented correctly**.

### What Needs Adding: Switch Hitter Support
- Check `athlete_mpi_settings.is_switch_hitter` via `useSwitchHitterProfile`
- When `is_switch_hitter` is true AND module is hitting, show a per-rep toggle (L/R) in `RepScorer` instead of using the gate-locked value
- Each rep records the actual `batter_side` used for that at-bat
- `PitchLocationGrid`, `TeeDepthGrid`, and spray chart overlays already respond to `batterSide` prop — just need the toggle wired up

### RepScorer Changes
- Import `useSwitchHitterProfile`
- When `isSwitchHitter && isHitting`: render a compact L/R toggle above the pitch location grid
- Override `handedness` for the current rep with the selected side
- Store absolute coordinates in DB (already the case); UI rendering mirrors based on side

### Data Storage
Pitch location is already stored as absolute `{row, col}` coordinates. The `batter_side` field on each rep ensures analytics can segment L vs R at-bats. No DB schema change needed.

---

## Summary of All File Changes

| File | Changes |
|------|---------|
| DB Migration | Add `module_data_status jsonb` to `subscriptions` |
| `check-subscription` edge function | Set frozen/active status on module transitions |
| `src/hooks/useModuleAccessState.ts` (new) | Centralized freeze/read-only logic |
| `src/pages/PracticeHub.tsx` | Remove baserunning progress bar; add frozen module banner |
| `src/components/practice/SessionConfigPanel.tsx` | Remove target reps; add fielding position default |
| `src/components/practice/HandednessGate.tsx` | Remove baserunning entry |
| `src/components/practice/RepScorer.tsx` | Remove baserunning handedness; add fielding position field + validation; add switch hitter toggle |
| `src/components/practice/FieldingPositionSelector.tsx` (new) | Position grid component |
| `src/hooks/useSwitchHitterProfile.ts` | Already exists; will be imported into RepScorer |
| Dashboard / Analytics pages | Add frozen badge + read-only mode checks |

