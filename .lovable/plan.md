

# Fix Pitch Movement Selector — 5 Critical Issues

## Summary
Address all 5 issues: session coverage, naming consistency, direction normalization, replace-oldest UX, and derived movement profile tagging.

## Changes

### 1. Session coverage — `MicroLayerInput.tsx`
Move `PitchMovementSelector` outside the `sessionType === 'hitting'` block so it renders for both hitting and pitching sessions. Place it before the session-type-specific sections.

### 2. Naming consistency — `GameAtBatLogger.tsx`
Rename `AtBat.pitchMovement` → `AtBat.pitch_movement` (snake_case) to match `MicroLayerData` and `PitchData`. Update all references in the component.

### 3. Direction normalization — `PitchMovementSelector.tsx`
Sort the directions array before calling `onChange` so `['down','right']` and `['right','down']` always store identically. Add a `normalizeDirections` helper that sorts alphabetically.

### 4. Replace-oldest UX — `PitchMovementSelector.tsx`
When 2 arrows are selected and user taps a 3rd, replace the oldest (index 0) instead of blocking. Remove the disabled/locked state entirely.

### 5. Derived movement profile — New utility + integration
Create `src/lib/pitchMovementProfile.ts` with:
- `normalizeDirections(dirs)` — sort helper
- `deriveMovementProfile(dirs)` — maps sorted direction combos to semantic tags (`arm_side_sink`, `vertical_drop`, `cut_ride`, etc.)

Integrate at save points:
- `MicroLayerInput.tsx` — store `pitch_movement_profile` field on commit
- `GameAtBatLogger.tsx` — store on add
- `PitchEntry.tsx` — store on submit
- `useMicroLayerInput.ts` — add `pitch_movement_profile?: string` to `MicroLayerData`

## Files

| File | Changes |
|------|--------|
| `src/lib/pitchMovementProfile.ts` | Create — normalize + derive helpers |
| `src/components/micro-layer/PitchMovementSelector.tsx` | Normalize on output, replace-oldest UX |
| `src/components/micro-layer/MicroLayerInput.tsx` | Move selector outside session-type gate |
| `src/components/splits/GameAtBatLogger.tsx` | Rename to snake_case, add derived profile |
| `src/components/game-scoring/PitchEntry.tsx` | Add derived profile on submit |
| `src/hooks/useMicroLayerInput.ts` | Add `pitch_movement_profile` to type |

