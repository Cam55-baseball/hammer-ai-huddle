

# Stress Test #5: Elite Full-Sweep Overhaul

## Executive Summary

The Practice Intelligence system has strong backend bones but the **user-facing experience is confusing, disconnected, and incomplete**. Players without coaches are blocked from meaningful progression. Organizations have no invite/accept flow. Session logging feels like "filling out a database form" instead of an intuitive sports tool. Game scoring has no pitch-by-pitch sheet. The AI never analyzes anything for the MPI. Heat maps and roadmaps are permanently empty. This plan fixes every gap E2E.

---

## Current State Checklist

| Area | Status | Problem |
|------|--------|---------|
| Practice Hub session logging | Functional but clunky | Too many fields, feels like tech work, not a sports app |
| Recent sessions display | BROKEN | Always says "No sessions logged yet" |
| Coach tagging on sessions | MISSING | `coach_id` column exists but is never set by UI |
| Coach-less players in MPI pipeline | BLOCKED | 40% coach validation gate = impossible without a coach |
| Organization invite/accept flow | MISSING | Only owner can add members by raw user_id -- no invite codes, no accept UI |
| Organization member names | BROKEN | Shows raw UUID instead of player name |
| Per-rep scoring | MISSING | Micro-layer exists but is hidden behind density gates and disconnected from sessions |
| Game scoring sheet | MISSING | No pitch-by-pitch scorecard for games |
| Real-time heat map input | MISSING | PitchLocationGrid exists but data never flows to heat_map_snapshots |
| Notes/feelings prompt | MISSING | Generic textarea instead of targeted questions |
| AI analysis of sessions for MPI | MISSING | development_prompts never populated, no AI edge function for session analysis |
| Streak reset logic | BUG | Never resets on missed days |
| Heat map snapshot generation | MISSING | Table exists, 0 rows, no generator |
| Roadmap milestones | MISSING | Table exists, 0 rows, no seed data |
| Duplicate getGradeLabel | CODE SMELL | MPIScoreCard has local copy |
| Module not captured on save | BUG | activeModule never sent to createSession |

---

## Fix Plan (16 Fixes, Priority Order)

### PHASE 1: Core Pipeline Fixes (Make it Work)

**Fix 1 (P0): Coach-less athletes must participate in MPI**

The 40% coach validation gate currently blocks any athlete without a coach from ever becoming ranking-eligible. This is the biggest user-hostile design flaw.

Changes:
- In `nightly-mpi-process`, modify the `coach_validation_met` gate logic:
  - If athlete has `primary_coach_id` set: require 40% coach-validated sessions (current behavior)
  - If athlete has NO coach: auto-pass this gate (set `coach_validation_met = true`)
- In `DataBuildingGate.tsx`, update the label from "40%+ coach validation" to dynamically show "40%+ coach validation" or "Coach validation (auto-passed -- no coach assigned)" based on whether the user has a coach
- Athletes with an external/off-app coach can still self-grade; their grades count as player grades but the gate auto-passes

**Fix 2 (P0): Capture module on session save**

Add `module` to the createSession flow:
- In `PracticeHub.tsx`, pass `activeModule` to `createSession()`
- In `usePerformanceSession.ts`, add `module` to the insert payload
- Database: Add `module` column to `performance_sessions` via migration (text, nullable, no default -- existing rows stay null)

**Fix 3 (P0): Coach tagging on sessions**

The `performance_sessions` table already has a `coach_id` column. The UI never sets it.

Changes:
- Add a "Coach" field to the session builder (below session type selector):
  - If athlete has `primary_coach_id` in `athlete_mpi_settings`: auto-fill it
  - Dropdown also shows "External Coach (not on app)" and "No Coach / Self-Directed"
  - If "External Coach" selected: show a text input for coach name (stored in notes or a new field)
- Pass `coach_id` to `createSession()` when a coach is selected

**Fix 4 (P0): Streak reset logic**

In `calculate-session`, before incrementing streak:
- Query the user's most recent session date (excluding current session)
- If last session was NOT yesterday (or today for multiple same-day sessions): reset `streak_current` to 1
- If consecutive: increment normally

**Fix 5 (P0): Recent sessions display**

Create `useRecentSessions` hook:
- Query `performance_sessions` filtered by `user_id`, `sport`, `is deleted_at null`, ordered by `session_date DESC`, limit 10
- In `PracticeHub.tsx`, replace static "No sessions" text with a list showing: date, session type, module, effective grade, and a grade label badge
- Each session card is tappable to view details

**Fix 6 (P0): AI-powered development prompts**

The `development_prompts` column in `mpi_scores` exists but is never populated. Add AI analysis to the nightly process:
- After calculating scores for each athlete, generate 2-4 personalized prompts using Lovable AI (Gemini Flash):
  - Send composite scores, trend direction, integrity score, session count, weakest composite, and strongest composite
  - AI returns structured prompts like "Your BQI is your weakest area -- focus on bat quality drills" or "Your trend is rising! Maintain consistency to lock in your gains"
- Store prompts as JSONB array in the upsert payload
- Create a new edge function `generate-dev-prompts` that the nightly process calls internally (or inline the AI call)
- This feeds the existing `AIPromptCard` component which is already wired up but always empty

### PHASE 2: Organization System (Make Teams Work)

**Fix 7 (P0): Organization invite/accept flow**

Current state: Owner can only add members by raw UUID. No invite mechanism. No player acceptance.

Changes:
- Database migration:
  - Add `invite_code` (text, unique, nullable) and `invite_expires_at` (timestamptz, nullable) columns to `organizations`
  - Add `invited_email` (text, nullable) and `invitation_status` (text, default 'pending') columns to `organization_members`
  - New RLS policy: players can INSERT into `organization_members` WHERE `user_id = auth.uid()` AND `invitation_status = 'pending'` (for accepting invites)

- Coach/Owner side:
  - Generate a 6-character invite code when org is created (or on-demand "Generate Invite Code" button)
  - Show the code prominently: "Share this code with your players: **ABC123**"
  - Also allow adding players by email (creates a pending row)

- Player side:
  - New "Join Organization" card on Dashboard or Settings
  - Enter invite code --> looks up org by code --> shows org name + sport --> "Join" button
  - Inserts into `organization_members` with status 'active'
  - After joining, the coach appears as their `primary_coach_id` in `athlete_mpi_settings`

- Fix member list: join to `profiles_public` to show `full_name` instead of raw UUID

**Fix 8 (P1): Organization member names display**

`OrganizationMemberList.tsx` displays `m.user_id` (raw UUID) for each member. Fix:
- Query `organization_members` joined with `profiles_public` on `user_id = profiles_public.id`
- Display `full_name` and `avatar_url` instead of UUID

### PHASE 3: UX Overhaul -- Make Sessions Joyful

**Fix 9 (P0): Redesign session logging for simplicity and delight**

The current DrillBlockBuilder is overwhelming: dropdown selects, number inputs, sliders, and badge pickers all at once. Per the UX mandate: "3 taps to begin, max 5 inputs per screen."

Redesigned flow:
1. **Tap session type** (existing cards -- keep these, they're good) -- 1 tap
2. **Tap primary drill** from a visual grid of 4-6 large icons with labels for the active module -- 1 tap
3. **Score your reps** using the new Rep Scorer (Fix 10) -- this is the main interaction
4. **Swipe to finish** -- save button is prominent, notes are optional expandable

Remove the concept of "Drill Blocks" from the user's vocabulary. Internally, each scored rep or group of reps IS a drill block, but the user just sees "Score your reps."

The "Add Drill Block" button becomes "+ Add Another Drill" with a simpler card that auto-selects the module.

**Fix 10 (P0): Per-rep scoring with real-time heat map input**

This is the core innovation. Each rep is scored individually with a tap-tap-done flow:

For **Hitting**:
1. Tap pitch location on the 3x3 grid (already built as PitchLocationGrid)
2. Tap contact quality: Miss / Foul / Weak / Hard / Barrel (5 large colored buttons)
3. Tap exit direction: Pull / Middle / Oppo (3 buttons)
4. Optional: tap intent badge
5. Auto-commits rep, animates it into a scrolling rep feed

For **Pitching**:
1. Tap pitch type (4-Seam, Curve, Change, etc. -- sport-specific)
2. Tap location on 3x3 grid
3. Tap result: Strike / Ball / Hit / Out (4 buttons)
4. Auto-commits

For **Game Mode** (pitch-by-pitch scorecard):
1. Same flow as hitting/pitching above, but in a dedicated "Game Scorecard" view
2. Shows running at-bat context: count (0-0), inning, score
3. Each pitch is logged with: location, pitch type, result, swing decision
4. At-bat summary auto-generates after strikeout/walk/hit/out
5. Running game stats displayed: AVG, OBP, K%, BB%

This leverages the existing `useMicroLayerInput` hook and `MicroLayerData` interface. The key change is:
- Remove the density gate -- rep scoring should be available to ALL users, not just "enhanced" or "advanced"
- Make it the DEFAULT input method instead of the summary-level DrillBlockBuilder
- Each committed rep feeds into both the drill_blocks JSONB (for composite calculation) AND the micro_layer_data JSONB (for heat map generation)

**Fix 11 (P1): Feelings/notes prompt**

Replace the generic "Add session notes..." textarea with structured feeling prompts:

- "How is your body feeling right now?" -- 5-point emoji scale (Great / Good / OK / Tired / Hurting)
- "Mentally, where are you at?" -- 5-point emoji scale (Locked In / Focused / Neutral / Distracted / Struggling)
- "Anything specific to note?" -- short text field (optional)

These map to `fatigue_state_at_session` JSONB which already exists in `performance_sessions`. The voice note input stays as an alternative.

### PHASE 4: Data Pipeline Completion

**Fix 12 (P1): Heat map snapshot generation**

Add heat map calculation to the nightly process (after MPI scoring):
- For each athlete, aggregate `micro_layer_data` from the last 30/90 days
- Count pitch locations across the 3x3 grid
- Calculate hot zones and blind zones
- Write to `heat_map_snapshots` with map_type, time_window, grid_data, blind_zones
- This populates the existing `HeatMapDashboard` component

**Fix 13 (P1): Seed roadmap milestones**

Insert default milestone data via migration:
- "Log your first session" (1 session)
- "Build a 3-day streak" (3-day streak)
- "Complete 10 sessions" (10 sessions)
- "Reach 40 MPI score" (MPI >= 40)
- "Get coach validation on 5 sessions" (5 coach-graded sessions)
- "Achieve Rising trend" (trend = rising)
- "Complete 60 sessions (ranking eligible)" (60 sessions)

Add roadmap progress updates to the nightly process: check each milestone's criteria against the athlete's data and update `athlete_roadmap_progress`.

**Fix 14 (P2): Deduplicate getGradeLabel**

Replace local function in `MPIScoreCard.tsx` with `import { getGradeLabel } from '@/lib/gradeLabel'`.

### PHASE 5: Polish

**Fix 15 (P2): Season context selector**

Add a simple 3-button toggle (In-Season / Off-Season / Preseason) to the session builder, defaulting to "In-Season". Pass to `createSession()`.

**Fix 16 (P2): Rankings loading skeleton**

Show a skeleton/spinner during segment filter transitions instead of blank screen.

---

## Technical Implementation Details

### Database Migration

```sql
-- Fix 2: Add module column to performance_sessions
ALTER TABLE public.performance_sessions
ADD COLUMN IF NOT EXISTS module text;

-- Fix 7: Organization invite system
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS invite_code text UNIQUE,
ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz;

ALTER TABLE public.organization_members
ADD COLUMN IF NOT EXISTS invited_email text,
ADD COLUMN IF NOT EXISTS invitation_status text DEFAULT 'active';

-- RLS: Players can accept invitations (insert themselves)
CREATE POLICY "Players can join via invite"
ON public.organization_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix 13: Seed roadmap milestones
INSERT INTO public.roadmap_milestones (sport, module, milestone_name, milestone_order, requirements) VALUES
('baseball', 'general', 'Log your first session', 1, '{"min_sessions": 1}'),
('baseball', 'general', 'Build a 3-day streak', 2, '{"min_streak": 3}'),
('baseball', 'general', 'Complete 10 sessions', 3, '{"min_sessions": 10}'),
('baseball', 'general', 'Reach 40 MPI score', 4, '{"min_mpi": 40}'),
('baseball', 'general', 'Get coach validation on 5 sessions', 5, '{"min_coach_validated": 5}'),
('baseball', 'general', 'Achieve Rising trend', 6, '{"trend": "rising"}'),
('baseball', 'general', 'Complete 60 sessions (ranking eligible)', 7, '{"min_sessions": 60}'),
('softball', 'general', 'Log your first session', 1, '{"min_sessions": 1}'),
('softball', 'general', 'Build a 3-day streak', 2, '{"min_streak": 3}'),
('softball', 'general', 'Complete 10 sessions', 3, '{"min_sessions": 10}'),
('softball', 'general', 'Reach 40 MPI score', 4, '{"min_mpi": 40}'),
('softball', 'general', 'Get coach validation on 5 sessions', 5, '{"min_coach_validated": 5}'),
('softball', 'general', 'Achieve Rising trend', 6, '{"trend": "rising"}'),
('softball', 'general', 'Complete 60 sessions (ranking eligible)', 7, '{"min_sessions": 60}');
```

### Edge Function Changes

**`calculate-session/index.ts`** -- Fixes 3, 4, 11:
- Add streak reset logic (query last session date, compare to today-1)
- Store `fatigue_state_at_session` from the feelings prompt data
- Module is now stored on the session row

**`nightly-mpi-process/index.ts`** -- Fixes 1, 6, 12, 13:
- Coach validation gate: auto-pass if no `primary_coach_id`
- After MPI scoring: call Lovable AI to generate development prompts per athlete
- After MPI scoring: aggregate micro_layer_data into heat_map_snapshots
- After MPI scoring: evaluate roadmap milestones and update athlete_roadmap_progress

### Frontend File Changes

| File | Changes |
|------|---------|
| `src/pages/PracticeHub.tsx` | Complete redesign: rep-by-rep scoring flow, feelings prompts, recent sessions, coach tagging, module capture, season selector |
| `src/hooks/usePerformanceSession.ts` | Add `module`, `coach_id`, `fatigue_state_at_session` to createSession |
| `src/hooks/useRecentSessions.ts` | NEW: query recent sessions for Practice Hub |
| `src/components/practice/RepScorer.tsx` | NEW: tap-tap-done per-rep scoring (replaces DrillBlockBuilder as primary input) |
| `src/components/practice/GameScorecard.tsx` | NEW: pitch-by-pitch game scoring sheet |
| `src/components/practice/FeelingsPrompt.tsx` | NEW: structured body/mind check-in |
| `src/components/practice/CoachSelector.tsx` | NEW: coach picker with "external/no coach" options |
| `src/components/practice/SessionTypeSelector.tsx` | Keep existing (good UX) |
| `src/components/organization/JoinOrganization.tsx` | NEW: invite code entry for players |
| `src/components/organization/InviteCodeCard.tsx` | NEW: displays/generates invite code for coaches |
| `src/components/organization/OrganizationMemberList.tsx` | Fix: join profiles_public for names |
| `src/components/analytics/MPIScoreCard.tsx` | Import shared getGradeLabel |
| `src/components/analytics/DataBuildingGate.tsx` | Dynamic coach validation label |
| `src/components/micro-layer/MicroLayerInput.tsx` | Remove density gate, make default |
| `src/pages/Rankings.tsx` | Add loading skeleton on filter change |

### New Edge Function

**`generate-dev-prompts/index.ts`**:
- Called by nightly process with athlete composite scores + context
- Uses Lovable AI (Gemini Flash) to generate 2-4 personalized development prompts
- Returns structured JSON array of prompt strings

---

## Implementation Priority

```text
Phase   Fix    Description                                    Effort
------  -----  -------------------------------------------    ------
1       #1     Coach-less athletes can participate             Small
1       #2     Module captured on save                        Small
1       #3     Coach tagging on sessions                      Medium
1       #4     Streak reset logic                             Small
1       #5     Recent sessions display                        Small
1       #6     AI development prompts                         Medium
2       #7     Organization invite/accept flow                Large
2       #8     Organization member names                      Small
3       #9     Session logging UX redesign                    Large
3       #10    Per-rep scoring + game scorecard                Large
3       #11    Feelings/notes prompt                          Small
4       #12    Heat map snapshot generation                   Medium
4       #13    Seed roadmap milestones                        Medium
4       #14    Deduplicate getGradeLabel                      Tiny
5       #15    Season context selector                        Small
5       #16    Rankings loading skeleton                      Tiny
```

