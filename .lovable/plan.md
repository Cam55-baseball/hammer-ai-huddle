

# Practice Hub, Heat Map, and Rep Logging Engine -- Structural Overhaul

## Scope Summary

This plan rebuilds the Practice Hub rep logging system from a "shell" into a precision, category-aware logging engine with proper 5x5 strike zone grids, handedness orientation, mandatory rep source tagging, category-locked field visibility, and explicit rep confirmation flow.

---

## Phase 1: Strike Zone Grid Overhaul (5x5 Mandatory)

### Current State
- `PitchLocationGrid.tsx` defaults to 3x3 with an optional 5x5 toggle (`allow5x5` prop)
- No inner strike zone highlighting
- No handedness-based mirroring
- `heatMapConfig.ts` has many heat maps set to `rows: 3, cols: 3`

### Changes

**File: `src/components/micro-layer/PitchLocationGrid.tsx`** -- Full rewrite
- Remove 3x3/5x5 toggle -- grid is always 5x5
- Inner 3x3 cells (rows 1-3, cols 1-3) render with green background (`bg-green-500/20 border-green-400`) before selection to indicate the strike zone
- Outer 16 cells render neutral (`bg-muted/30`)
- Selected cell highlights with `bg-primary ring-2 ring-primary`
- Add hover tooltips showing zone labels: "Up-In", "Up-Middle", "Up-Away", "Middle-In", "Middle-Middle", "Middle-Away", "Down-In", "Down-Middle", "Down-Away" for inner zone; "High-Inside", "High-Outside", "Low-Inside", "Low-Outside" etc. for outer
- Accept `batterSide: 'L' | 'R'` prop -- when `L`, mirror the grid horizontally so "inside" and "outside" labels flip
- Accept `sport: 'baseball' | 'softball'` prop for proportional zone labels (softball zone is shorter/wider)

**File: `src/data/heatMapConfig.ts`**
- Update `pitch_location` from 3x3 to 5x5
- Update `barrel_zone` from 3x3 to 5x5
- Update `throw_accuracy` from 3x3 to 5x5
- Update `pitch_command` from 3x3 to 5x5
- Update all velocity/intent/exit/bp_distance maps from 3x3 to 5x5
- This ensures all heat map rendering matches the 5x5 input grid

**File: `src/components/heatmaps/HeatMapGrid.tsx`**
- Add optional `zoneHighlight` prop to highlight inner 3x3 of a 5x5 grid
- Add legend component showing color scale min/max
- Add sample size count display below each grid
- Show blind zone indicator (dashed border + "< threshold" label)

---

## Phase 2: Handedness Orientation (Mandatory Pre-Session Selection)

### Current State
- `BattingSideSelector.tsx` exists but is not integrated into the RepScorer flow
- No pitcher hand selector used in rep logging
- Heat maps do not respect handedness

### Changes

**File: `src/components/practice/RepScorer.tsx`**
- Before any rep input is shown, render a mandatory handedness selection card:
  - For hitting module: "Batter Stance: Left / Right" (required, no default)
  - For pitching module: "Pitcher Arm: Left / Right" (required, no default)
  - For fielding/catching/throwing: "Throwing Hand: Left / Right"
- Until handedness is selected, the rep input area shows a prompt: "Select handedness to begin logging"
- Pass `batterSide` to `PitchLocationGrid` for horizontal mirroring
- Store handedness on each `ScoredRep` object as `batter_side` or `pitcher_hand`

**File: `src/components/practice/GameScorecard.tsx`**
- Same mandatory handedness gate before pitch logging begins
- Pass to `PitchLocationGrid`

---

## Phase 3: Rep Source Tagging (Mandatory)

### Current State
- No "rep source" / "rep type" selection exists in `RepScorer.tsx`
- `drillType` is optionally passed but never collected in the current flow

### Changes

**File: `src/components/practice/RepSourceSelector.tsx`** -- New component
- Renders a grid of rep source options based on active module:
  - **Hitting sources**: Machine BP, Flip, Live BP, Regular BP, Game, Tee, Front Toss, Coach Pitch, Soft Toss, Other
  - **Pitching sources**: Bullpen, Flat Ground, Game, Live BP, Other
  - **Fielding sources**: Fungo, Live, Drill, Game, Other
  - **Catching sources**: Bullpen Receive, Game, Drill, Other
  - **Baserunning sources**: Drill, Live, Game, Other
- When "Machine BP" selected: show sub-fields for velocity band, pitch type, angle
- When "Flip" / "Live BP" / "Regular BP" / "Coach Pitch": show "Thrower Handedness: L / R" sub-selector
- Rep source is REQUIRED -- rep cannot be committed without it
- Stored as `rep_source` on `ScoredRep`

**File: `src/components/practice/RepScorer.tsx`**
- Add `RepSourceSelector` as the first input (after handedness)
- Block commit if `rep_source` is not set
- When `rep_source === 'machine_bp'`: show velocity band selector
- When `rep_source === 'tee'`: hide velocity band
- When `rep_source === 'live_bp' || 'game'`: velocity band optional, pitch type required

---

## Phase 4: Category-Based Field Locking

### Current State
- `RepScorer.tsx` shows hitting or pitching fields based on `module` prop
- `AdvancedRepFields.tsx` shows different fields per module but ALL are under a collapsible "Advanced" toggle
- No fielding/catching/baserunning-specific rep scoring UI -- these modules get a generic "Log Rep" button with zero fields
- Pitching-specific fields (command grade, spin efficiency) leak into the hitting view via AdvancedRepFields when module isn't checked properly

### Changes

**File: `src/components/practice/RepScorer.tsx`** -- Major restructure
- Replace the current monolithic component with category-routed sub-components:

  **Hitting flow** (when `module === 'hitting'`):
  - Pitch zone (5x5, mirrored by batter side)
  - Rep source (mandatory)
  - Contact quality
  - Exit direction
  - Advanced (collapsible): Swing intent, Batted ball type, BP distance, Execution score, Goal of rep, Actual outcome

  **Pitching flow** (when `module === 'pitching'`):
  - Pitch type (mandatory)
  - Pitch zone (5x5, mirrored by pitcher hand)
  - Rep source (mandatory)
  - Pitch result (strike/ball/hit/out)
  - Advanced (collapsible): Velocity band, Pitch command grade, Whiff result, Chase result, In-zone contact, Spin direction, Execution score, Goal of rep, Actual outcome

  **Fielding flow** (when `module === 'fielding'`):
  - Rep source (mandatory)
  - Play type (ground ball, fly ball, line drive, bunt, pop up)
  - Fielding result (clean, error, assist)
  - Throw accuracy grade (20-80 slider)
  - Footwork grade (20-80 slider)
  - Exchange time band (fast/avg/slow)
  - Throw spin quality
  - Clean field % toggle
  - Execution score
  - NO pitch zone shown

  **Catching flow** (when `module === 'catching'` -- NEW module tab):
  - Rep source (mandatory)
  - Pop time band (fast/avg/slow)
  - Transfer grade (20-80)
  - Block success (yes/no)
  - Throw accuracy (20-80)
  - Execution score
  - Goal / Outcome

  **Baserunning flow** (when `module === 'baserunning'`):
  - Rep source (mandatory)
  - Jump grade (20-80)
  - Read grade (20-80)
  - Time to base band (fast/avg/slow)
  - Execution score
  - Goal / Outcome

**File: `src/pages/PracticeHub.tsx`**
- Add "Catching" module tab to the modules array (between Fielding and Baserunning)
- Icon: use a catcher-related icon

**File: `src/components/practice/AdvancedRepFields.tsx`**
- Remove pitching fields from hitting view and vice versa (already partially done but needs hardening)
- Add catching-specific and baserunning-specific advanced fields

---

## Phase 5: Rep Confirmation Flow

### Current State
- Hitting: auto-commits rep after exit direction selection (3-tap auto-record)
- Pitching: auto-commits after pitch result
- Fielding/baserunning/mental: single "Log Rep" button with no fields

### Changes

**File: `src/components/practice/RepScorer.tsx`**
- Add two logging modes with a toggle at the top:

  **Quick Log Mode (Tier 1)** -- Default for new users:
  - Execution score (1-10 slider)
  - Rep source (required)
  - Optional zone tap
  - Explicit "Confirm Rep" button -- NO auto-recording
  - Max 3 taps to log

  **Advanced Mode (Tier 2)**:
  - Full category-specific fields as described in Phase 4
  - All required fields marked with red asterisk
  - "Confirm Rep" button disabled until all required fields are filled
  - Show validation message: "Complete required fields to confirm rep"
  - NO auto-recording -- user must press Confirm

- Store user's mode preference in localStorage
- Show clear banner at top of rep card: "Quick Mode" or "Advanced Mode" with toggle

---

## Phase 6: Rep Source Conditional Logic

**Within RepScorer and AdvancedRepFields:**

| Rep Source | Velocity Band | Pitch Type | Thrower Hand | BP Distance |
|-----------|--------------|------------|--------------|-------------|
| Machine BP | Required | Optional | N/A | Show (sport-relative slider) |
| Tee | Hidden | Hidden | N/A | Hidden |
| Live BP | Optional | Required | Required (L/R) | Hidden |
| Game | Optional | Required | Required (L/R) | Hidden |
| Front Toss | Hidden | Hidden | Required (L/R) | Hidden |
| Coach Pitch | Hidden | Optional | Required (L/R) | Hidden |
| Soft Toss | Hidden | Hidden | Required (L/R) | Hidden |
| Flip | Hidden | Hidden | Required (L/R) | Hidden |
| Regular BP | Optional | Optional | Required (L/R) | Optional |
| Bullpen | Optional | Required | N/A | N/A |
| Flat Ground | Optional | Required | N/A | N/A |

BP distance sliders: Baseball 30-450 ft, Softball 30-250 ft (already configured in `useSportConfig`).

---

## Phase 7: ScoredRep Data Model Update

**File: `src/components/practice/RepScorer.tsx`** -- Update `ScoredRep` interface:

```text
ScoredRep {
  // Mandatory
  rep_source: string;           // NEW - required
  execution_score: number;      // 1-10 - required
  batter_side?: 'L' | 'R';     // Required for hitting
  pitcher_hand?: 'L' | 'R';    // Required for pitching
  throwing_hand?: 'L' | 'R';   // Required for fielding/catching

  // Existing (category-dependent)
  pitch_location?: { row: number; col: number };
  contact_quality?: string;
  exit_direction?: string;
  pitch_type?: string;
  pitch_result?: string;
  swing_decision?: string;
  intent?: string;

  // Advanced micro fields (existing)
  in_zone?: boolean;
  batted_ball_type?: string;
  spin_direction?: string;
  swing_intent?: string;
  machine_velocity_band?: string;
  bp_distance_ft?: number;
  velocity_band?: string;
  spin_efficiency_pct?: number;
  pitch_command_grade?: number;
  throw_included?: boolean;
  footwork_grade?: number;
  exchange_time_band?: string;
  throw_accuracy?: number;
  throw_spin_quality?: string;

  // NEW fields for catching + baserunning
  pop_time_band?: string;
  transfer_grade?: number;
  block_success?: boolean;
  jump_grade?: number;
  read_grade?: number;
  time_to_base_band?: string;

  // NEW rep context
  thrower_hand?: 'L' | 'R';    // For flip/live BP/etc
  goal_of_rep?: string;
  actual_outcome?: string;
}
```

---

## Phase 8: Heat Map Visual Enhancements

**File: `src/components/heatmaps/HeatMapGrid.tsx`**
- Add color legend bar below each grid (min color to max color with labels)
- Add total sample size count ("N = 47 reps")
- Blind zones: show "Low Data" text overlay on cells below threshold
- Inner 3x3 zone highlight (subtle green border) on 5x5 pitch-related maps

**File: `src/components/heatmaps/HeatMapDashboard.tsx`**
- Add handedness filter to `HeatMapFilterBar` (show L/R toggle)
- When L selected, mirror display horizontally

---

## Phase 9: Retroactive Logic Alignment

### Current State
- `usePerformanceSession.ts` L74: checks `daysDiff > 7` (7-day limit)
- Database trigger `validate_retroactive_session`: checks `session_date` within 7 days of `created_at`
- These match (both 7 days) -- confirmed aligned

No change needed here. Both hook and trigger enforce 7-day max.

---

## Phase 10: Data Integrity Validations

**File: `src/components/practice/RepScorer.tsx`**
- Cannot commit rep without: category (module), rep source, execution score
- Heat map data stores `batter_side`/`pitcher_hand` alongside `pitch_location`
- No duplicate calculations: each rep committed exactly once
- No universal fallback values: if a field is not filled, it stores `undefined` (not a default)

**File: `src/hooks/usePerformanceSession.ts`**
- When building drill blocks from reps, include `rep_source` as part of drill block metadata
- Store handedness in `micro_layer_data`

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `src/components/practice/RepSourceSelector.tsx` | Mandatory rep source picker with conditional sub-fields |
| `src/components/practice/HandednessGate.tsx` | Mandatory L/R selection before rep logging |
| `src/components/practice/CatchingRepFields.tsx` | Catching-specific rep input fields |
| `src/components/practice/BaserunningRepFields.tsx` | Baserunning-specific rep input fields |

### Modified Files
| File | Change |
|------|--------|
| `src/components/micro-layer/PitchLocationGrid.tsx` | 5x5 mandatory, green inner zone, handedness mirror, tooltips |
| `src/components/practice/RepScorer.tsx` | Category routing, Quick/Advanced mode toggle, rep confirmation, handedness gate, rep source requirement |
| `src/components/practice/AdvancedRepFields.tsx` | Strict category field isolation, add catching/baserunning fields |
| `src/components/practice/GameScorecard.tsx` | Handedness gate, 5x5 grid |
| `src/components/heatmaps/HeatMapGrid.tsx` | Legend, sample count, blind zone labels, inner zone highlight |
| `src/components/heatmaps/HeatMapDashboard.tsx` | Handedness filter |
| `src/data/heatMapConfig.ts` | All grid sizes updated to 5x5 |
| `src/pages/PracticeHub.tsx` | Add Catching module tab |
| `src/hooks/useMicroLayerInput.ts` | Add new fields (pop_time_band, transfer_grade, etc.) |

### No Database Migration Needed
All new fields are stored in existing JSONB columns (`drill_blocks`, `micro_layer_data`) on `performance_sessions`. The `ScoredRep` model changes are client-side TypeScript only.

---

## Execution Order

1. Phase 1 (Strike Zone Grid) + Phase 8 (Heat Map Visuals) -- independent
2. Phase 2 (Handedness) -- depends on Phase 1
3. Phase 3 (Rep Source) -- independent
4. Phase 4 (Category Fields) -- depends on Phase 3
5. Phase 5 (Confirmation Flow) -- depends on Phase 4
6. Phase 6 (Conditional Logic) -- depends on Phase 3 + Phase 4
7. Phase 7 (Data Model) -- integrates all above
8. Phase 10 (Validation) -- final pass

