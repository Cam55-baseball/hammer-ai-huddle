

# Night Check-in Midnight Reset, Per-Area Movement Question, and Tibia/Fibula Zones

## Problem Summary

Three issues to fix:

1. The Night Check-in shows as "completed" the next morning because the Game Plan does not re-fetch data when the date rolls over at midnight
2. The "Does pain increase with movement?" question is asked once globally, not per selected pain area
3. The Left Side and Right Side body maps are missing tibia and fibula bone zones

---

## 1. Midnight Reset for Game Plan

**Root cause**: `useGamePlan` fetches task status on mount and when dependencies change, but has no timer to detect when the calendar date changes at midnight. If a user completes the night check-in at 10 PM and opens the app the next morning without a full page reload, the stale completion state persists.

**Fix**: Add a midnight-detection interval inside `useGamePlan.ts` that:
- Tracks the current date string in a ref
- Checks every 30 seconds if `getTodayDate()` has changed
- When a date change is detected, triggers `fetchTaskStatus()` to re-query with the new date
- This ensures ALL Game Plan tasks (not just night check-in) reset cleanly at midnight

### File: `src/hooks/useGamePlan.ts`
- Add a `useEffect` with a 30-second `setInterval`
- Compare `getTodayDate()` against a stored ref value
- On mismatch, update the ref and call `fetchTaskStatus()`

---

## 2. Per-Area "Does Pain Increase with Movement?"

**Current behavior**: A single Yes/No toggle applies to all selected pain areas collectively.

**New behavior**: Each selected pain area gets its own Yes/No toggle, displayed inline within that area's section (after the tissue type selector and pain scale).

### Database Change
- Add a new JSONB column `pain_movement_per_area` to `vault_focus_quizzes` (maps area_id to boolean, e.g., `{"left_knee_front": true, "right_shin": false}`)
- Keep the existing `pain_increases_with_movement` boolean column populated with `true` if ANY area has movement pain (backward compatibility)

### File: `src/components/vault/VaultFocusQuizDialog.tsx`
- Replace `painIncreasesWithMovement` (single boolean state) with `painMovementPerArea` (Record of string to boolean)
- Move the Yes/No toggle from the bottom of the pain section into each area's block (inside the `painLocations.map()` loop), after the TenPointScale and tissue type chips
- On submit, populate `pain_movement_per_area` JSONB and set legacy `pain_increases_with_movement` to `Object.values(painMovementPerArea).some(v => v === true)`

### File: `src/hooks/useVault.ts`
- Add `pain_movement_per_area` to the quiz data interface and upsert logic

---

## 3. Add Tibia and Fibula Zones to Left and Right Side Body Maps

The front view has "L Shin" and "R Shin" zones, but the side views (Left Side, Right Side) have no lower-leg bone zones between the knee and foot. Tibia and fibula are distinct bones visible from the side.

### File: `src/components/vault/quiz/body-maps/bodyAreaDefinitions.ts`
- Add to `LEFT_SIDE_BODY_AREAS`:
  - `{ id: 'left_tibia', label: 'L Tibia' }`
  - `{ id: 'left_fibula', label: 'L Fibula' }`
- Add to `RIGHT_SIDE_BODY_AREAS`:
  - `{ id: 'right_tibia', label: 'R Tibia' }`
  - `{ id: 'right_fibula', label: 'R Fibula' }`

### File: `src/components/vault/quiz/body-maps/BodyMapLeftSide.tsx`
- Add two new clickable SVG zones between the knee side and foot arch:
  - **L Tibia**: Front-facing bone zone (inner/front of lower leg)
  - **L Fibula**: Outer bone zone (outer side of lower leg)

### File: `src/components/vault/quiz/body-maps/BodyMapRightSide.tsx`
- Add matching R Tibia and R Fibula SVG zones

### File: `src/components/vault/quiz/body-maps/fasciaConnectionMappings.ts`
- Add fascia connection entries for all 4 new zones (left/right tibia, left/right fibula) with appropriate connected areas, kid insights, and pro tips

---

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useGamePlan.ts` | Add midnight detection interval to auto-refetch on date change |
| `src/components/vault/VaultFocusQuizDialog.tsx` | Convert movement question from global to per-area; add new JSONB field to submit data |
| `src/hooks/useVault.ts` | Add `pain_movement_per_area` to quiz interface and upsert |
| `src/components/vault/quiz/body-maps/bodyAreaDefinitions.ts` | Add 4 new area IDs (L/R Tibia, L/R Fibula) |
| `src/components/vault/quiz/body-maps/BodyMapLeftSide.tsx` | Add 2 SVG clickable zones for tibia and fibula |
| `src/components/vault/quiz/body-maps/BodyMapRightSide.tsx` | Add 2 SVG clickable zones for tibia and fibula |
| `src/components/vault/quiz/body-maps/fasciaConnectionMappings.ts` | Add 4 fascia connection entries |

**Database migration**: 1 migration adding `pain_movement_per_area JSONB` column to `vault_focus_quizzes`

**Total**: 7 files modified, 1 DB migration, 0 new files

---

## What Does NOT Change

- Existing `pain_increases_with_movement` column (kept for backward compat)
- Pain scale logic and per-area pain scales
- Tissue type tracking
- Streak tracking
- Night check-in submit flow (same endpoint)
- Front and Back body map views (unchanged)
- All other Game Plan task completion logic

