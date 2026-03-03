

# Optimize Session Tracking to Elite Standard

## Current Problems

1. **Too many steps before logging starts** -- Athletes must go through 3 screens (Type > Config > Log) with 7+ fields before a single rep is recorded. Friction kills consistency.
2. **Redundant/overlapping questions** -- "Environment" (Practice/Game/Lesson) overlaps with "Session Type" (Personal Practice, Game, etc.) and "Coach Session Type" (Solo/Coached/Lesson). Three fields asking essentially the same thing.
3. **Wellness check is buried** -- Body/Mind ratings appear AFTER config, mixed into the logging step. Pre-session readiness should be captured first to contextualize the entire session.
4. **No smart defaults** -- Every session starts from scratch. No memory of last session's settings (distance, velocity band, rep source, handedness).
5. **Session Types are bloated** -- 8 types is too many. "Post-Game Analysis" isn't a training session. "Bullpen" is a rep source, not a session type. "Coach Lesson" overlaps with the coach session type selector.
6. **Feelings labels lack precision** -- "OK" and "Neutral" are throwaway options that produce zero-signal data. Elite readiness assessment needs physiological anchors.
7. **Indoor/Outdoor toggle is low-value noise** -- Rarely changes analysis and adds a decision point for no gain.

## Plan

### 1. Collapse Session Types from 8 to 5

**File: `src/components/practice/SessionTypeSelector.tsx`**

Remove redundant types. New set:
- **Solo Work** (replaces Personal Practice) -- Self-directed skill work
- **Team Session** (replaces Team Practice) -- Organized team training
- **Lesson** (replaces Coach Lesson) -- 1-on-1 or small group instruction
- **Game** (unchanged) -- Competition
- **Live At-Bats** (replaces Live Scrimmage) -- Intra-squad or simulated game reps

Remove: "Post-Game Analysis" (not a training session -- belongs in a film/review feature), "Bullpen" (it's a rep source, not a session type), "Rehab Session" (can be tagged via a recovery flag instead).

### 2. Upgrade Wellness to a Pre-Session Readiness Screen

**File: `src/components/practice/FeelingsPrompt.tsx`**

Move wellness to appear BEFORE the config panel (Step 1.5, between type selection and config). Rename to "Pre-Session Readiness."

Replace vague labels with physiologically-anchored descriptors:
- **Body**: 1 = "Pain/Limited ROM" | 2 = "Heavy/Fatigued" | 3 = "Functional" | 4 = "Fresh/Responsive" | 5 = "Peak Readiness"
- **Mental**: 1 = "Overwhelmed/Anxious" | 2 = "Low Focus/Foggy" | 3 = "Baseline" | 4 = "Engaged/Present" | 5 = "Flow State"

Add a third dimension:
- **Sleep Quality** (1-5): 1 = "<5 hrs / broken" | 2 = "5-6 hrs" | 3 = "6-7 hrs" | 4 = "7-8 hrs" | 5 = "8+ hrs / deep"

This creates a 3-axis readiness fingerprint that feeds directly into CNS load modeling.

### 3. Consolidate Config Panel -- Remove Redundancy

**File: `src/components/practice/SessionConfigPanel.tsx`**

Changes:
- **Remove "Environment" toggle** -- It's already determined by session type (Game = game, Lesson = lesson, everything else = practice). Auto-derive it.
- **Remove "Indoor/Outdoor" toggle** -- Low-signal noise. Remove entirely.
- **Remove "Session Type" (Solo/Coached/Lesson) toggle** -- Already captured by top-level session type. If type is "Lesson," auto-set coach mode. If "Solo Work," auto-set self-directed. Only show coach selector when relevant.
- **Keep**: Rep Source (mandatory), Pitch Distance, Velocity Band, Season Context, Coach Selector (only when session type is Team Session or Solo Work where it's ambiguous).

This cuts the config panel from 7 fields to 4-5 contextual fields.

### 4. Add Smart Defaults (Remember Last Session)

**File: New `src/hooks/useSessionDefaults.ts`**

Create a hook that:
- On session save, persists key settings to localStorage: `{ rep_source, pitch_distance_ft, velocity_band, season_context, handedness }`
- On session start, pre-fills config panel with last-used values per module
- Handedness is remembered globally (eliminates the gate after first use, with a small "switch" button instead)

**File: `src/components/practice/HandednessGate.tsx`**
- Check localStorage for saved handedness. If found, skip the gate and show a small toggle in the config bar instead.

### 5. Enhance Per-Rep Questions

**File: `src/components/practice/RepScorer.tsx`**

Quick Mode improvements:
- Add "Swing Decision" to Quick Mode for hitting (currently Advanced-only). This is the single most valuable self-assessment metric and should not be hidden. Options: "Good Take" | "Should've Swung" | "Chased" | "Barreled"
- For pitching Quick Mode, add "Hit Spot?" (Yes/No) -- a single binary that captures command intent vs. result

Advanced Mode improvements:
- Replace free-text "Goal of Rep" with structured presets: "Drive ball to opposite field" | "Pull-side power" | "Up-the-middle line drive" | "Adjust to off-speed" | "Battle with 2 strikes" -- plus a custom text option
- Replace free-text "Actual Outcome" with the same structured format, so Goal vs. Outcome comparison becomes machine-readable instead of requiring NLP

### 6. Smarter Rep Source Definitions

**File: `src/components/practice/RepSourceSelector.tsx`**

Add short descriptions to rep sources so younger athletes understand the difference:
- "Machine BP" -> "Machine BP -- Pitching machine at set speed"
- "Front Toss" -> "Front Toss -- Underhand from short distance"
- "Live BP" -> "Live BP -- Pitcher throwing from mound/circle"

Group rep sources into visual categories instead of a flat list:
- **Machine**: Machine BP, Tee
- **Thrown**: Front Toss, Soft Toss, Flip, Coach Pitch
- **Live**: Live BP, Regular BP, Game
- This makes selection faster and more intuitive

## Files to Create
- `src/hooks/useSessionDefaults.ts`

## Files to Modify
- `src/components/practice/SessionTypeSelector.tsx` (collapse to 5 types)
- `src/components/practice/FeelingsPrompt.tsx` (upgrade labels, add sleep, reorder)
- `src/components/practice/SessionConfigPanel.tsx` (remove redundant fields, auto-derive)
- `src/components/practice/RepScorer.tsx` (add swing decision to quick mode, structured goals)
- `src/components/practice/RepSourceSelector.tsx` (grouped layout, descriptions)
- `src/components/practice/HandednessGate.tsx` (smart default from localStorage)
- `src/pages/PracticeHub.tsx` (reorder flow: Type > Readiness > Config > Log)

## No Database Changes Required
All new data points (sleep quality, structured goals) fit into existing JSONB columns (`fatigue_state_at_session`, `micro_layer_data`).

