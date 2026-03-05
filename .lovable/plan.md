

# Fielding Architecture Restructure & Multi-System Fixes

## Overview

14 changes spanning fielding rep taxonomy, catcher expansion, video uploads, spin direction restoration, competition weighting, and UI fixes.

---

## 1. Infield Rep Type / Play Type Restructure

### `InfieldRepTypeFields.tsx`
- Remove `slow_roller` from `repTypeOptions`
- Keep: Double Play, Backhand, Clean Pick

### `PlayDirectionSelector.tsx` → rename to `PlayTypeAndDirectionSelector.tsx`
- Split into two sections:
  - **Play Type** (new, all infielders): Play at 1B, Play at 2B, Play at 3B, Play at Home, Slow Roller, Chopper (6 options, grid-cols-3)
  - **Play Direction** (existing): Right, Left, Back, In, Straight Up

### `ScoredRep` changes
- Add `fielding_play_type?: string` — stores the play type selection
- Rename existing `play_type` usage (currently ground_ball/fly_ball/line_drive/bunt/pop_up) to `batted_ball_category` to avoid collision, OR keep `play_type` for the batted ball and use `fielding_play_type` for the new field

Decision: Add `fielding_play_type` as a new field. Keep existing `play_type` (ground_ball, fly_ball etc.) as-is since it represents the batted ball type, not the fielding play type.

---

## 2. Catch Type Field

### New ScoredRep field
```typescript
catch_type?: 'backhand' | 'forehand' | 'underhand' | 'overhand';
```

### In `RepScorer.tsx` fielding section
Add a 4-button SelectGrid "Catch Type" after Receiving Quality for all fielding positions (infield + outfield).

---

## 3. Hit Type / Batted Ball Hardness (Fielding)

### New ScoredRep field
```typescript
hit_type_hardness?: 'soft' | 'average' | 'hard';
```

### In `RepScorer.tsx` fielding section
Add 3-button SelectGrid "Hit Type" before Play Type — feeds difficulty weighting.

---

## 4. Catcher Rep Source Expansion

### `RepSourceSelector.tsx` — `FLAT_SOURCES.catching`
Expand from `['bullpen_receive', 'game', 'drill', 'other']` to include:
```typescript
catching: [
  { value: 'bullpen_receive', label: 'Bullpen Receive' },
  { value: 'back_pick_1b', label: 'Back Pick → 1B' },
  { value: 'back_pick_3b', label: 'Back Pick → 3B' },
  { value: 'throw_down_2b', label: 'Throw Down → 2B' },
  { value: 'throw_down_3b', label: 'Throw Down → 3B' },
  { value: 'pop_fly_right', label: 'Pop Fly Right' },
  { value: 'pop_fly_left', label: 'Pop Fly Left' },
  { value: 'pop_fly_back', label: 'Pop Fly Back' },
  { value: 'pop_fly_pitcher', label: 'Pop Fly → Pitcher' },
  { value: 'bunt_1b', label: 'Bunt → 1B' },
  { value: 'bunt_3b', label: 'Bunt → 3B' },
  { value: 'bunt_pitcher', label: 'Bunt → Pitcher' },
  { value: 'tag_play_home', label: 'Tag Play at Home' },
  { value: 'game', label: 'Game' },
  { value: 'drill', label: 'Drill' },
  { value: 'other', label: 'Other' },
]
```

---

## 5. Tag Play Quality (All Infielders)

### New ScoredRep field
```typescript
tag_play_quality?: 'elite' | 'complete' | 'incomplete';
```

### In `RepScorer.tsx` fielding section
Show "Tag Play Quality" SelectGrid for all infield positions (separate from play completion / error %).

---

## 6. Goal of Rep & Actual Outcome → Per Rep Only

### `ScoredRep` already has `goal_of_rep` and `actual_outcome`
These are already per-rep fields. Verify they are NOT required for rep confirmation (they are not in the `canConfirm` logic). No code changes needed here — already optional per-rep.

---

## 7. Video Upload — Remove Camera-Only Restriction

### `SessionVideoUploader.tsx`
- Remove `capture="environment"` from the `<input>` element (line 128) — this forces camera-only on mobile
- This allows device library selection on all platforms

### `VideoRepLogger.tsx`
- Same fix: remove `capture="environment"` (line 96)

---

## 8. Baserunning Drill Addition

### `BaserunningRepFields.tsx`
- Add `{ value: '1st_to_home', label: '1st→Home' }` to both `baseballDrills` and `softballDrills` arrays

---

## 9. Coach Selector UI Fix

### `CoachSelector.tsx`
- Remove `max-h-36` constraint on ScrollArea (line 80)
- Use a taller `max-h-64` or remove max-height entirely
- Ensure vertical scroll with full visibility, no truncation

---

## 10. Spin Direction — Available in ALL Hitting Cases

### `contextAppropriatenessEngine.ts`
- Change `showSpinDirection` from `isPitching` only to: `isPitching || isHitting`
- This restores spin direction for hitters (was removed in prior cleanup)

### `RepScorer.tsx`
- Re-add Spin Direction SelectGrid in the hitting section (after Swing Decision or in advanced mode)
- Options: Topspin, Backspin, Knuckle, Backspin Tail
- Already exists in pitching section — just re-enable for hitting

---

## 11. MLB Competition Weight Fix

### `src/data/baseball/competitionLevels.ts`
- Current: AAA = 1.35, MLB = 1.50 (diff = 0.15)
- Required: MLB = AAA + 0.75 = 2.10
- Update MLB: `competition_weight_multiplier: 2.10`
- Keep `league_difficulty_index: 1.00`
- Add comment: `// HARD-CODED: MLB = AAA + 0.75 (founder mandate)`

---

## 12. Pitch Release Distance → Pitch Mound Distance

### `SessionConfigPanel.tsx` (line 228)
- Change label from "Pitch Release Distance" to "Pitch Mound Distance"

### `SessionConfigBar.tsx` (line 54)
- Update display badge if it shows the label

No field name changes in data model — `pitch_distance_ft` remains the same internally.

---

## 13. Pitcher Rep Source Always Available

### `RepSourceSelector.tsx`
- Ensure all `VALID_PITCHING_SOURCES` entries include `bullpen`, `flat_ground`, `flat_ground_vs_hitter`, and `live_bp`
- Current `solo_work` only has `['flat_ground', 'flat_ground_vs_hitter']` — add `bullpen` and `live_bp`
- Current `lesson` only has `['bullpen', 'flat_ground']` — add `flat_ground_vs_hitter` and `live_bp`
- `live_abs` already has `['live_bp', 'bullpen']` — add `flat_ground` and `flat_ground_vs_hitter`

Updated:
```typescript
const VALID_PITCHING_SOURCES = {
  solo_work: ['bullpen', 'flat_ground', 'flat_ground_vs_hitter', 'live_bp'],
  team_session: ['bullpen', 'flat_ground', 'flat_ground_vs_hitter', 'live_bp'],
  lesson: ['bullpen', 'flat_ground', 'flat_ground_vs_hitter', 'live_bp'],
  game: ['game'],
  live_abs: ['bullpen', 'flat_ground', 'flat_ground_vs_hitter', 'live_bp'],
};
```

---

## 14. Sport Separation

All new fields are sport-agnostic UI inputs stored on `ScoredRep`. Analytics benchmarks (pop time grading, transfer expectations, play timing) use separate baseball/softball data files already in `src/data/baseball/` and `src/data/softball/`. No cross-contamination.

---

## Files to Create

| File | Purpose |
|------|---------|
| None | All changes are modifications to existing files |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/practice/RepScorer.tsx` | Add `fielding_play_type`, `catch_type`, `hit_type_hardness`, `tag_play_quality` to ScoredRep; add corresponding UI sections in fielding; re-add spin direction for hitting |
| `src/components/practice/InfieldRepTypeFields.tsx` | Remove `slow_roller` from rep type options |
| `src/components/practice/PlayDirectionSelector.tsx` | Add Play Type section (Play at 1B/2B/3B/Home, Slow Roller, Chopper) above existing direction buttons |
| `src/components/practice/RepSourceSelector.tsx` | Expand catcher sources; ensure all pitcher sessions include all 4 core sources |
| `src/components/practice/BaserunningRepFields.tsx` | Add `1st_to_home` drill type |
| `src/components/practice/CoachSelector.tsx` | Increase ScrollArea max-height for large coach lists |
| `src/components/practice/SessionVideoUploader.tsx` | Remove `capture="environment"` to allow library uploads |
| `src/components/practice/VideoRepLogger.tsx` | Remove `capture="environment"` |
| `src/components/practice/SessionConfigPanel.tsx` | Rename "Pitch Release Distance" → "Pitch Mound Distance" |
| `src/data/contextAppropriatenessEngine.ts` | Enable spin direction for hitting module |
| `src/data/baseball/competitionLevels.ts` | Set MLB weight to 2.10 (AAA + 0.75) |

