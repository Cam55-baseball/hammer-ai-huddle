

# Fix Multiple Bugs + Add New Practice Hub Fields

## 13 Issues to Address

### 1. Pick-Off Trainer: No back button to leave session
**File**: `src/components/pickoff-trainer/PickoffRepRunner.tsx`
- Add a "Back" button in the `idle` phase that navigates back to setup or dashboard
- Also add it to `PickoffSetup.tsx` to return to dashboard

### 2. Pick-Off Trainer: No DashboardLayout (missing menu/refresh/tutorial header)
**Files**: `src/pages/PickoffTrainer.tsx`
- Currently renders raw `<div className="min-h-screen bg-background">` without `<DashboardLayout>`
- Wrap all phases in `<DashboardLayout>` like `SoftballStealingTrainer.tsx` does

### 3. Pick-Off Trainer: Remove Pitcher from covering options
**File**: `src/components/pickoff-trainer/PickoffSetup.tsx`
- Remove `{ label: 'P (Self Cover)', value: 'P' }` from `COVERING_OPTIONS['1st']`
- Pitcher cannot cover a bag on a pick-off play

### 4. Pick-Off Trainer: Add "Did you balk?" and "Was the throw clean?" questions
**File**: `src/components/pickoff-trainer/PickoffRepRunner.tsx`
- Add two new questions after the "Correct/Incorrect" decision phase
- "Did you balk?" — Yes / No / Questionable
- "Was the throw clean?" — Yes / No / Elite
- Store in `PickoffRep` interface: `balk?: 'yes' | 'no' | 'questionable'`, `throwClean?: 'yes' | 'no' | 'elite'`
- Update decision phase to flow: decision → balk_question → throw_quality → idle
- Update `PickoffTrainer.tsx` to include these in `micro_layer_data`
- Update `PickoffAnalysis.tsx` to analyze balk rate and throw quality

### 5. Softball Stealing: Decision buttons don't work (stuck at post-rep question)
**File**: `src/components/softball-stealing/SoftballStealRepRunner.tsx`
- In `handleDecision(false)` for HOLD reps, `onRepComplete` is called but the component stays in `decision` phase because the parent increments `currentRepNum` which triggers a re-render but `phase` is local state that doesn't reset
- The issue: when `decisionCorrect` is false AND signal is 'go', `handleDecision(false)` goes to `data_entry` phase. But for HOLD reps with incorrect decision, `onRepComplete` fires and the parent bumps `currentRepNum` — the component re-renders but phase stays `decision`
- **Fix**: Add a `useEffect` that resets phase to `idle` when `repNumber` prop changes

### 6. Softball Stealing: Signal too small (just dots)
**File**: `src/components/softball-stealing/SoftballStealRepRunner.tsx`
- The `fake_signal` phase shows a 160px circle (`w-40 h-40`) — this is decent but may appear small on larger screens
- The `real_signal` phase shows a 192px circle (`w-48 h-48`)
- **Fix**: Make both phases full-screen like the pickoff trainer: `fixed inset-0` with full background color fill and large centered text, matching the baseball stealing trainer's visual impact

### 7. Softball Stealing: Not on 5Tool Player landing page
**File**: `src/pages/FiveToolPlayer.tsx`
- Add a softball-specific stealing tile:
  ```
  { key: 'softball-stealing', icon: Footprints, label: 'Softball Stealing', description: 'Signal reaction training for explosive steals', getRoute: () => '/softball-stealing', softballOnly: true }
  ```
- Update filter logic to handle `softballOnly` flag

### 8. Softball Stealing: Better signaling system description
**File**: `src/components/softball-stealing/SoftballStealSetup.tsx`
- Expand the signaling system descriptions:
  - Color: "Green = GO (steal the base), Red = HOLD (stay on base). Random blue, yellow, and purple flashes appear as distractions — ignore them and wait for the final signal."
  - Even/Odd: "Even numbers = GO, Odd numbers = HOLD. Random numbers flash as distractions — only the final number determines your action."

### 9. Practice Hub: Recent sessions not filtered by module
**File**: `src/components/practice/RecentSessionsList.tsx` + `src/hooks/useRecentSessions.ts`
- Currently `useRecentSessions` only filters by `sport`, not by `module`
- Add `module` parameter to the hook and filter by it
- Update `RecentSessionsList` to accept and pass `module` (the active tab id)
- Update `PracticeHub.tsx` to pass `mod.id` as module to `RecentSessionsList`

### 10. Game Video Player: Add frame-by-frame controls
**File**: `src/components/game-scoring/GameVideoPlayer.tsx`
- Add "Frame Back" and "Frame Forward" buttons (step ±1/30th second = ~0.033s)
- These call `video.currentTime += 0.033` or `-= 0.033`

### 11. Swing Decision: Replace "Barreled" with "Best A-Swing" + add "Swung"
**File**: `src/components/practice/RepScorer.tsx` (line ~869)
- Change `{ value: 'barreled', label: '🔥 Barreled' }` to `{ value: 'best_a_swing', label: '🔥 Best A-Swing' }`
- Add `{ value: 'swung', label: '🏏 Swung' }` as a new option
- Also update `ContactQualitySelector.tsx` and the `contactOptions` array in RepScorer:
  - Replace `{ value: 'weak', label: '🔸 Weak' }` with `{ value: 'jammed', label: '🔸 Jammed' }`
  - Add `{ value: 'end_cap', label: '🔹 End Cap' }` for weak/end-of-bat contact

### 12. Practice Hub: Bat speed, exit velocity, distance inputs for hitting
**File**: `src/components/practice/RepScorer.tsx`
- Add three new numeric input fields for hitting module (in build_session step):
  - `bat_speed_mph` — "Bat Speed (mph)"
  - `exit_velo_mph` — "Exit Velocity (mph)"  
  - `hit_distance_ft` — "Distance (ft)"
- Add these to `ScoredRep` interface
- Show in the hitting section near contact quality

### 13. Practice Hub: Glove-to-Glove time + Throwing Velo for fielding
**File**: `src/components/practice/RepScorer.tsx`
- Add for fielding/infield reps:
  - `glove_to_glove_sec` — "From Glove to Glove (seconds)" with helper text showing optimal benchmarks (baseball: <2.0s standard, <1.5s for DP turns; softball: sport-appropriate)
- Add for all fielding/throwing reps:
  - `throwing_velo_mph` — "Throwing Velocity (mph)"
- Add these to `ScoredRep` interface

## Files Summary

| File | Action |
|------|--------|
| `src/pages/PickoffTrainer.tsx` | Wrap in DashboardLayout, add back navigation |
| `src/components/pickoff-trainer/PickoffSetup.tsx` | Remove P from covering, add back button |
| `src/components/pickoff-trainer/PickoffRepRunner.tsx` | Add back button, balk + throw quality questions, expand PickoffRep interface |
| `src/components/pickoff-trainer/PickoffAnalysis.tsx` | Analyze balk rate + throw quality |
| `src/pages/PickoffTrainer.tsx` | Pass new rep fields to micro_layer_data |
| `src/components/softball-stealing/SoftballStealRepRunner.tsx` | Fix stuck buttons (reset phase on repNumber change), make signals full-screen |
| `src/components/softball-stealing/SoftballStealSetup.tsx` | Better signaling descriptions |
| `src/pages/FiveToolPlayer.tsx` | Add softball stealing tile |
| `src/hooks/useRecentSessions.ts` | Add module filter parameter |
| `src/components/practice/RecentSessionsList.tsx` | Accept + pass module prop |
| `src/pages/PracticeHub.tsx` | Pass `mod.id` to RecentSessionsList |
| `src/components/game-scoring/GameVideoPlayer.tsx` | Add frame-by-frame ±1 frame buttons |
| `src/components/practice/RepScorer.tsx` | Update swing decision options, contact quality options, add bat speed/exit velo/distance/glove-to-glove/throwing velo inputs |
| `src/components/micro-layer/ContactQualitySelector.tsx` | Update weak→jammed, add end_cap |
| `src/components/micro-layer/SwingDecisionTag.tsx` | No change needed (this is for micro layer, separate from RepScorer) |

