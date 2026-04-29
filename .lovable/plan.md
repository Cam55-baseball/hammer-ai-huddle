## Goal
Improve set logging in custom activities so users can capture sprint times to the hundredth of a second, see clearly that distance is in feet, and record pounds of force produced for concentric/isometric exercises.

## Changes

### 1. Sprint time precision (hundredth of a second)
File: `src/components/folders/FolderItemPerformanceLogger.tsx`

- Change the time `Input` from integer minutes to a decimal seconds field:
  - `type="number"`, `step="0.01"`, `min="0"`, `inputMode="decimal"`
  - Placeholder: `Sec`
  - Unit label next to it changes from `min` to `sec`
- Update `SetRow.time` semantics to seconds (still a `number`, now decimal). Parse with `parseFloat` instead of `Number(...)` and preserve 2-decimal precision on display (`set.time?.toFixed(2)` only when not focused — simplest: just bind raw value).
- Add `mode === 'sprint'` (or reuse `flexible`) — simplest path: keep current `duration`/`flexible` modes but always allow hundredth-second precision since this also benefits any timed activity.

### 2. Distance measured in feet
File: `src/components/folders/FolderItemPerformanceLogger.tsx`

- Replace the bare `Dist` placeholder with `Dist (ft)`.
- Add a small `ft` suffix label to the right of the distance input, matching the `min`/`sec` pattern.
- Document in `SetRow` that `distance` is stored in feet.

### 3. Pounds of force for concentric / isometric exercises
Files: `src/components/folders/FolderItemPerformanceLogger.tsx`, `src/types/activityFolder.ts` (extend `SetRow`-equivalent / performance shape if typed there).

- Extend `SetRow` with `force_lbs?: number`.
- Render a new input `Force (lbs)` in the set row whenever:
  - `mode === 'weight_reps'` (covers strength/skill_work where isometrics live), OR
  - the item name / `item_type` indicates an isometric or concentric movement.
- Simpler rule for v1: always show the `Force (lbs)` input in `weight_reps` and `flexible` modes (small, optional field). It stays optional and only saves if filled.
- Include `force_lbs` in the `hasSomeData` check so a force-only entry can be saved.
- Persist as part of the existing `sets` array in `performance_data` — no DB schema change required (JSONB).

### 4. Downstream readers
- `customActivityLoadCalculation.ts` and any analytics that read `sets[].time` currently treat it as minutes. Quick scan needed; if minutes are assumed, multiply seconds→minutes when feeding load calc, OR add a `time_unit: 'sec' | 'min'` discriminator on the set and default new entries to `'sec'`. Plan to add `time_unit` so historical rows (minutes) keep working.

## Technical notes
- All changes are JSONB-only; no migration.
- `SetRow.time` becomes `{ time?: number; time_unit?: 'sec' | 'min' }`. New rows write `time_unit: 'sec'`; legacy rows without the field continue to be interpreted as minutes by readers.
- Inputs use `step="0.01"` and `inputMode="decimal"` for clean mobile keypads.
- No new dependencies.

## Files to edit
- `src/components/folders/FolderItemPerformanceLogger.tsx`
- `src/types/activityFolder.ts` (extend performance/set typing if defined there)
- `src/utils/customActivityLoadCalculation.ts` (respect `time_unit` when reading)