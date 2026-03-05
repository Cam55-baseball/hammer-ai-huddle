

# Fielding & Throwing Data Architecture Upgrade

## Overview

Add position-aware throw tracking, infield rep type classification, play direction, and catcher-specific metrics as quick-tap button systems across fielding, catching, and throwing modules.

---

## 1. New ScoredRep Fields

Add to the `ScoredRep` interface in `RepScorer.tsx`:

```typescript
// Throw tracking (fielding, catching, throwing)
throw_accuracy_direction?: 'wide_left' | 'on_target' | 'dot' | 'wide_right';
throw_arrival_quality?: 'long_hop' | 'short_hop' | 'perfect' | 'high';
throw_strength?: 'strong' | 'good' | 'weak';

// Catcher-specific (only when position = C)
catcher_pop_time_sec?: number;
catcher_transfer_time_sec?: number;
catcher_throw_base?: '2B' | '3B' | '1B';

// Infield rep type (P, 1B, 2B, 3B, SS)
infield_rep_type?: string; // double_play, backhand, slow_roller, clean_pick
infield_rep_execution?: 'incomplete' | 'complete' | 'elite';

// Play direction (all fielders)
play_direction?: 'right' | 'left' | 'back' | 'in' | 'straight_up';
```

---

## 2. New Component: `FieldingThrowFields.tsx`

Shared throw-tracking component used by fielding, catching, and throwing modules. Contains three quick-tap SelectGrid sections:

- **Accuracy Direction**: Wide Left / On Target / Dot / Wide Right (4 cols)
- **Ball Arrival Quality**: Long Hop / Short Hop / Perfect / High (4 cols)
- **Throw Strength**: Strong / Good / Weak (3 cols)

No dropdowns. All quick-select buttons matching existing SelectGrid pattern.

---

## 3. New Component: `InfieldRepTypeFields.tsx`

Shown when `fielding_position` is P, 1B, 2B, 3B, or SS:

- **Rep Type buttons**: Double Play? / Backhand? / Slow Roller? / Clean Pick on Receive? (4 cols)
- **Execution**: Incomplete / Complete / Elite (3 cols)

These are a separate analytics layer — do not overwrite error %.

---

## 4. New Component: `PlayDirectionSelector.tsx`

Quick-tap for all fielding reps:

- **Direction**: Right / Left / Back / In / Straight Up (5 cols)

Feeds range analytics and positional heat mapping.

---

## 5. Catcher Position Detection & Fields

In `RepScorer.tsx` fielding section, when `repFieldingPosition === 'C'`:

- Show **Pop Time** (numeric input, seconds)
- Show **Transfer Time** (numeric input, seconds)
- Show **Throw Base** selector: 2B / 3B / 1B Pickoff (3 cols)
- Show `FieldingThrowFields` (accuracy direction, arrival, strength)

These fields are hidden for all other positions.

---

## 6. Integration Points in RepScorer.tsx

### Fielding Section (lines 1160-1283)
After existing fielding quality fields, add:
1. `PlayDirectionSelector` — all positions
2. `InfieldRepTypeFields` — only when position is P/1B/2B/3B/SS
3. Catcher-specific fields — only when position is C
4. `FieldingThrowFields` — all fielding reps (replaces the advanced-only throw accuracy slider)

### Catching Section (lines 1287-1305)
- Replace the slider-based `throw_accuracy` with `FieldingThrowFields`
- Add `catcher_pop_time_sec` and `catcher_transfer_time_sec` numeric inputs
- Add `catcher_throw_base` selector

### Throwing Section
- Add `FieldingThrowFields` to `ThrowingRepFields.tsx` (replaces the 3-option accuracy selector with the new 4-direction + arrival + strength system)

---

## 7. Existing Throw Accuracy Cleanup

- **Fielding**: Remove the advanced-only `throw_accuracy` slider (lines 1232-1241). Replace with `FieldingThrowFields` in the always-visible section.
- **Catching**: Remove slider `throw_accuracy` (line 73-79 of `CatchingRepFields.tsx`). Replace with the new fields.
- **Throwing**: Replace `accuracyOptions` (on_target/off_target/wild) with the new 4-direction system. Keep arm feel and other fields.

---

## 8. "Analyze Throw Mechanics" Button

In `VideoRepReview.tsx`, extend the `isAnalyzableModule` function in `RepVideoAnalysis.tsx`:

- Currently: `['hitting', 'pitching', 'throwing']`
- Add: `'fielding'` and `'catching'`
- Label the button "Analyze Throw Mechanics" for fielding/catching (vs generic "Analyze" for hitting/pitching/throwing)

Analysis tools already support arm slot, footwork, transfer, release point, and route overlay.

---

## 9. Sport Separation

No new data files needed — all fields are UI-level quick-tap inputs stored on the rep. The analytics layer (not in scope here) will use separate baseball/softball benchmarks already established in `src/data/baseball/` and `src/data/softball/` directories for pop time grading, transfer expectations, and double-play timing.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/practice/FieldingThrowFields.tsx` | Shared throw accuracy/arrival/strength quick-tap |
| `src/components/practice/InfieldRepTypeFields.tsx` | Infield rep classification + execution |
| `src/components/practice/PlayDirectionSelector.tsx` | 5-direction play direction selector |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/practice/RepScorer.tsx` | Add new ScoredRep fields; integrate new components into fielding/catching sections; remove old throw accuracy slider |
| `src/components/practice/CatchingRepFields.tsx` | Replace throw_accuracy slider with new fields; add pop time, transfer time, throw base inputs |
| `src/components/practice/ThrowingRepFields.tsx` | Replace 3-option accuracy with 4-direction system + arrival quality + throw strength |
| `src/components/practice/RepVideoAnalysis.tsx` | Add fielding/catching to analyzable modules with "Analyze Throw Mechanics" label |

