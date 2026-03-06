

# Logging System Optimization — Hitting, Fielding, and Speed Modules

## Summary

Three changes needed: remove Backhand from infield rep types, fix a broken data pipeline for steps in speed sessions, and improve the Steps label.

## 1. Remove "Backhand" from Rep Type

**File: `src/components/practice/InfieldRepTypeFields.tsx`** (line 36)

Remove `{ value: 'backhand', label: '🤚 Backhand' }` from `repTypeOptions`.

Note: `backhand` remains valid as a **catch_type** in RepScorer.tsx (backhand catch is a legitimate fielding mechanic). Only the rep_type classification is incorrect.

**File: `src/data/contextAppropriatenessEngine.ts`** (line 67)

Update the comment to remove "backhand" from the description: change to `// Infield rep type (double play, clean pick)`.

## 2. Fix Steps Data Pipeline (Critical Bug)

The `SpeedSessionFlow` sends `steps` in its `onComplete` payload, but `saveSession` in `useSpeedProgress.ts` expects `stepsPerRep`. Both `SpeedLab.tsx` and `ExplosiveConditioning.tsx` pass `data` directly without mapping, so **steps are currently never saved to the database**.

**File: `src/pages/SpeedLab.tsx`** (~line 106) and **`src/pages/ExplosiveConditioning.tsx`** (~line 106)

Map the field in the `onComplete` handler before calling `saveSession`:

```typescript
const session = await saveSession({
  ...data,
  stepsPerRep: data.steps,
});
```

This connects the UI state (`steps`) to the database column (`steps_per_rep`) via the hook parameter (`stepsPerRep`).

## 3. Improve Steps Label

**File: `src/components/speed-lab/SpeedTimeEntry.tsx`** (line 143)

Change placeholder from `'Steps'` to `'Steps Taken'` and update the i18n key accordingly.

## Files Modified

| File | Change |
|------|--------|
| `InfieldRepTypeFields.tsx` | Remove backhand from rep type options |
| `contextAppropriatenessEngine.ts` | Update comment |
| `SpeedLab.tsx` | Map `steps` → `stepsPerRep` in onComplete |
| `ExplosiveConditioning.tsx` | Map `steps` → `stepsPerRep` in onComplete |
| `SpeedTimeEntry.tsx` | Update placeholder label to "Steps Taken" |

## What Already Works (No Changes Needed)

- `steps_per_rep` JSONB column already exists in `speed_sessions` table
- `SpeedTimeEntry` already has Steps input field with stride analytics
- `SpeedSessionFlow` already manages `distanceSteps` state
- `saveSession` in `useSpeedProgress.ts` already writes `stepsPerRep` to DB
- Existing sessions with `steps_per_rep = NULL` are safe — column is nullable
- Data is queryable for future dashboards via the existing JSONB column
- Works for both Baseball and Softball (no sport-specific logic)

