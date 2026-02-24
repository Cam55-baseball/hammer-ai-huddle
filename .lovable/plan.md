

# Fix: Add Start/Pause/Resume Flow to Speed Lab and Explosive Conditioning

## Root Cause

The `speed_goals` table has a `program_status` column (default: `'not_started'`). Both pages render the pause button only when `programStatus === 'active'`. However, unlike Iron Bambino and Heat Factory, the speed pages skip directly to the main view when a goals record exists (`initialized === true`) without checking `programStatus`. Existing users' records were created before the status feature, so their status is stuck at `'not_started'` -- the pause button never appears.

## Solution

Add the same Start/Pause/Resume pattern used by Iron Bambino, Heat Factory, and The Unicorn:

### 1. `src/hooks/useSpeedProgress.ts` -- Add `startProgram` function

Add a new `startProgram` callback that updates an existing `speed_goals` record from `'not_started'` to `'active'`. This is distinct from `initializeJourney` (which creates a new record). Return it alongside `pauseProgram` and `resumeProgram`.

### 2. `src/pages/SpeedLab.tsx` -- Add "not started" gate

After the `!initialized` check (line 128), add a new condition:

```
if (programStatus === 'not_started') {
  return <ProgramStartCard ... onStart={startProgram} />;
}
```

This shows the same "Start Program" landing card used by other programs. Once the user clicks "Start Program", the status updates to `'active'`, the main view renders, and the pause button appears in the header.

### 3. `src/pages/ExplosiveConditioning.tsx` -- Same change

Identical gate added after the `!initialized` check, with "Explosive Conditioning" branding.

## User Flow After Fix

1. **First visit (no record)**: Onboarding card appears, clicking "Start My Speed Journey" creates the record with `active` status
2. **Existing user (record exists, status `not_started`)**: "Start Program" card appears, clicking it updates status to `active`
3. **Active**: Main view with pause button visible in header
4. **Paused**: Main view with resume banner at top, pause button hidden

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useSpeedProgress.ts` | Add `startProgram` function that updates existing goals to `active` |
| `src/pages/SpeedLab.tsx` | Add `ProgramStartCard` gate when `programStatus === 'not_started'` |
| `src/pages/ExplosiveConditioning.tsx` | Same `ProgramStartCard` gate with "Explosive Conditioning" branding |

No database migrations needed -- the `program_status` column already exists.
