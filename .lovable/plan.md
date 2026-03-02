

# E2E System Completion -- Session Config, BP Distance, Tee Depth, Coach Linking

## Overview

This overhaul introduces a **Session Configuration Layer** that captures session-level metadata (rep source, pitch distance, velocity band, coach, season, environment) BEFORE rep logging begins. It also adds a **Tee Depth Grid**, corrects BP Distance to mean pitch release distance (15-80 ft), and enhances coach linking with verified session badges.

---

## Phase 1: Session Configuration Panel

### Problem
Currently, rep source, season context, coach, and distance are scattered across per-rep fields and a hidden "More Options" drawer. There is no unified session config step.

### Solution
Create a new `SessionConfigPanel.tsx` component and insert a new flow step between session type selection and rep logging.

**New flow:**
```text
Step 1: Select Session Type (existing)
Step 2: Configure Session (NEW)
Step 3: Log Reps (existing RepScorer)
```

**File: `src/components/practice/SessionConfigPanel.tsx`** (NEW)

This component collects:
- Rep Source (from existing RepSourceSelector, moved here as session-level default)
- Pitch Distance: slider 15-80 ft (replaces old 30-450/250 range which was batted ball distance)
- Velocity Band (conditional, using existing sport bands)
- Coach selector (moved from "More Options" to here -- Solo / Coach-Led / Lesson)
- Season Type (In-Season / Offseason / Preseason -- moved from "More Options")
- Environment: Practice / Game / Lesson
- Indoor / Outdoor toggle

All values stored as `SessionConfig` interface and passed down to RepScorer.

**File: `src/pages/PracticeHub.tsx`** -- Modified
- Add new flow step: `'select_type' | 'configure_session' | 'build_session'`
- After session type selection, navigate to `configure_session` step
- After config confirmed, navigate to `build_session`
- Display session config summary bar at top of rep logging view (distance, velocity, rep source, coach, season)
- Move `CoachSelector` and `SeasonContextToggle` OUT of "More Options" into the config panel
- Remove redundant "More Options" section (voice notes remain as optional during rep logging)

**File: `src/hooks/useSportConfig.ts`** -- Modified
- Change `bpDistanceRange` to `{ min: 15, max: 80 }` for both sports (pitch release distance, not batted ball distance)

---

## Phase 2: Rep-Level Override Architecture

**File: `src/components/practice/RepScorer.tsx`** -- Modified

- Remove `RepSourceSelector` from per-rep input (it moves to session config)
- Pre-populate each rep with session-level values (rep_source, pitch distance, velocity band)
- Add optional per-rep override fields (collapsible "Override" section):
  - Distance override (15-80 ft slider)
  - Velocity band override
  - Pitch type override (if applicable)
- When override is used, store BOTH `session_distance` and `override_distance` on the ScoredRep
- If no override, rep inherits session values

**Updated `ScoredRep` interface additions:**
```text
session_distance_ft?: number;     // from session config
override_distance_ft?: number;    // per-rep override (nullable)
session_velocity_band?: string;   // from session config
override_velocity_band?: string;  // per-rep override (nullable)
session_rep_source?: string;      // from session config
environment?: string;             // indoor/outdoor
```

---

## Phase 3: Tee Depth Grid

**File: `src/components/practice/TeeDepthGrid.tsx`** (NEW)

When session rep source = `tee`:
- Render a 5-position vertical depth selector:
  - Position 1: "Front +2" (2 squares in front of plate)
  - Position 2: "Front +1" (1 square in front)
  - Position 3: "Plate" (center line)
  - Position 4: "Back -1" (1 square behind)
  - Position 5: "Back -2" (2 squares behind)
- Visually: vertical column of 5 tappable squares with "PLATE" line highlighted
- Selected square highlights with primary color
- Stored as `depth_zone: number` (1-5) on ScoredRep

**File: `src/components/practice/RepScorer.tsx`** -- Modified
- When session `rep_source === 'tee'` and module is hitting:
  - Show `TeeDepthGrid` alongside `PitchLocationGrid`
  - Layout: horizontal zone (5x5) on left, depth column (5x1) on right
  - Both are per-rep selections
  - `depth_zone` required for tee reps (validation added to `canConfirm`)

**ScoredRep addition:**
```text
depth_zone?: number;  // 1-5, required when rep_source === 'tee'
```

**Heat map integration:**
- `depth_zone` data feeds into existing `micro_layer_data` JSONB
- No schema change needed -- stored in JSONB

---

## Phase 4: Coach Linking Enhancement

### Current State
`CoachSelector` allows selecting: assigned coach, external coach, or self-directed. But there is no "Coach-Led Session" vs "Lesson" distinction, no coach verification badge, and no real-time coach visibility.

### Solution

**File: `src/components/practice/SessionConfigPanel.tsx`** -- Coach section
- Replace simple coach selector with session-aware options:
  - **Solo Session** (self-directed, no coach)
  - **Coach-Led Session** (attached coach supervises)
  - **Lesson with [Coach Name]** (if primary coach linked)
- When Coach-Led or Lesson selected:
  - `coach_id` attached to session
  - Session metadata includes `coach_session_type: 'coached' | 'lesson'`

**File: `src/hooks/usePerformanceSession.ts`** -- Modified
- Accept new session config fields: `pitch_distance_ft`, `velocity_band`, `environment`, `indoor_outdoor`, `coach_session_type`
- Store these in the `performance_sessions` insert (using existing JSONB columns where needed)
- `pitch_distance_ft` and `velocity_band` stored in `fatigue_state_at_session` JSONB alongside existing fields (no schema migration needed)

**Coach Verified Badge:**
- When a session has `coach_id` AND `coach_override_applied === true`, display a "Coach Verified" badge on session cards
- This uses existing `coach_override_applied` column -- no new column needed

---

## Phase 5: MPI Integration for Distance + Season + Coach

**File: `src/data/ENGINE_CONTRACT.ts`** -- Modified (add new constants)
```text
// Pitch distance difficulty modeling
PITCH_DISTANCE_REFERENCE_FT: 60,  // standard pitching distance
PITCH_DISTANCE_MODIFIER_PER_FT: 0.005,  // +/- per ft from reference

// Season weighting
SEASON_WEIGHTS: { in_season: 1.0, preseason: 0.85, off_season: 0.70 },

// Coach verification bonus
COACH_VERIFIED_INTEGRITY_BONUS: 3,
COACH_VERIFIED_WEIGHT_BONUS: 1.05,
```

These constants are consumed by the `calculate-session` and `nightly-mpi-process` edge functions. The edge functions already read session metadata from `fatigue_state_at_session` JSONB -- no additional schema changes needed.

---

## Phase 6: Data Integrity Validations

**File: `src/components/practice/RepScorer.tsx`** -- Validation updates
- Cannot commit rep without execution score (already enforced)
- Session rep source applied to all reps by default
- Tee reps require `depth_zone` selection
- No rep saved without session config completed
- No universal fallback values -- undefined stored when not provided

**File: `src/pages/PracticeHub.tsx`** -- Flow enforcement
- Cannot reach rep logging step without completing session config
- Session config panel validates: rep source selected, distance set (defaults to 60ft)
- Game sessions still require opponent name/level

---

## Phase 7: UX -- Session Config Summary Bar

**File: `src/components/practice/SessionConfigBar.tsx`** (NEW)

A compact, always-visible bar at the top of the rep logging view showing:
- Coach name (or "Solo")
- Distance (e.g., "55 ft")
- Velocity band (if set)
- Rep source (e.g., "Machine BP")
- Season type badge
- Indoor/Outdoor badge
- "Edit Config" button to go back to config step

---

## Database Changes

**No schema migration required.** All new fields are stored in existing JSONB columns:
- `fatigue_state_at_session` JSONB: stores `pitch_distance_ft`, `velocity_band`, `environment`, `indoor_outdoor`, `coach_session_type`
- `micro_layer_data` JSONB: stores per-rep data including `depth_zone`, `override_distance_ft`, `override_velocity_band`
- `drill_blocks` JSONB: stores `rep_source` from session config

The `performance_sessions` table already has `coach_id`, `season_context`, `module`, `batting_side_used`, `throwing_hand_used` columns.

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `src/components/practice/SessionConfigPanel.tsx` | Session-level config (distance, velocity, coach, season, environment) |
| `src/components/practice/TeeDepthGrid.tsx` | 5-position vertical depth selector for tee reps |
| `src/components/practice/SessionConfigBar.tsx` | Always-visible session config summary during rep logging |

### Modified Files
| File | Change |
|------|--------|
| `src/pages/PracticeHub.tsx` | 3-step flow, move coach/season to config step, session config state |
| `src/components/practice/RepScorer.tsx` | Remove session-level fields, add per-rep overrides, tee depth integration |
| `src/hooks/useSportConfig.ts` | Change bpDistanceRange to 15-80 ft (pitch release distance) |
| `src/hooks/usePerformanceSession.ts` | Accept and persist session config fields in JSONB |
| `src/data/ENGINE_CONTRACT.ts` | Add distance modifier, season weights, coach verification constants |
| `src/components/practice/GameScorecard.tsx` | Accept session config for handedness/distance context |

### No Database Migration Needed
All data fits in existing JSONB columns on `performance_sessions`.

---

## Execution Order

1. Create `SessionConfigPanel.tsx` + `SessionConfigBar.tsx` + `TeeDepthGrid.tsx` (independent, parallel)
2. Modify `PracticeHub.tsx` to add 3-step flow and wire config state (depends on step 1)
3. Modify `RepScorer.tsx` to accept session config, remove session-level fields, add overrides + tee depth (depends on step 1)
4. Update `useSportConfig.ts` distance range (independent)
5. Update `usePerformanceSession.ts` to persist config (independent)
6. Update `ENGINE_CONTRACT.ts` with new constants (independent)

