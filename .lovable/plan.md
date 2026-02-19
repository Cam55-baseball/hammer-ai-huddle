
# Hammer's Concrete Physio™ — Full Implementation Plan

## Executive Audit: What Already Exists vs. What's New

Before building, here is an honest audit of the codebase to avoid duplication and ensure clean integration:

### Already Built (Extend, Don't Duplicate)
- Morning Check-In (`quiz_type: 'morning'`): sleep quality 1-5, hours slept, mood, stress, discipline, weight, perceived recovery, daily motivation/intentions
- Pre-Workout Check-In (`quiz_type: 'pre_lift'`): reaction time test, balance test, 60+ zone body map with per-area pain scales 1-10, tissue type selector, training intent selector, mental energy
- Night Check-In (`quiz_type: 'night'`): mood, stress, reflections, sleep goal, weight, night success screen
- `useRecoveryStatus()`: aggregates quiz data to suggest recovery
- `useLoadTracking()`: CNS load, fascial load, volume load, 7-day rolling averages
- `useUnifiedDataSync()`: cross-module React Query invalidation via Supabase Realtime
- `athlete_load_tracking` table: CNS load, fascial bias, volume load, overlap warnings
- `suggest-adaptation` edge function: readiness-based training modification suggestions
- `useWorkoutRecommendations()`: recovery-aware workout recommendations with lighter alternatives
- TDEE engine: `useTDEE()` + `useDailyNutritionTargets()` — biometric-driven macro/calorie targets
- Calendar with game/event weighting via `athlete_events` table
- Pain Heat Map Card in Vault
- Correlation Analysis Card (mood/stress/discipline trends)
- Body Connection education system
- Age-gating exists in subscription layer

### Does NOT Exist Yet (Build New)
- Master Regulation Index (weighted formula producing Green/Yellow/Red score)
- Nightly Physio Report card (auto-generated after night check-in, color summary + expandable breakdown)
- Real-time post-workout feedback banner (appears after completing workout)
- Health Intake profile (blood type, allergies, medications, injury history, dietary style, illnesses, adult fields)
- Stress source selector (School / Work / Family / Travel / Competition Nerves / Illness) in morning check-in
- Appetite tracking (Low/Normal/High) in morning check-in
- Movement restriction tests (Toe Touch / Overhead Reach / Squat — Full/Limited/Pain)
- 3-point body tap map (Warm/Tight/Sore/0-3 per zone, simplified version of existing 60-zone map)
- Illness toggle (Cold/Flu/Fever/GI Distress) reducing load suggestions when active
- Calendar forward-event weighting (2–3 day look-ahead in the Regulation Index)
- Game Plan Physio badge overlay (suggestion chips on tasks)
- Nutrition suggestion engine (physio-aware hydration, carb, electrolyte, supplement guidance)
- Adult modules (18+ gate for libido tracking, female cycle phase tracking)
- `physio_health_profiles` table
- `physio_daily_reports` table
- `physio_adult_tracking` table
- `concrete_physio` edge function (Regulation Index calculator)

---

## Architecture Overview

```text
DATA INPUTS
  Morning Check-In (existing + new fields)
  Pre-Workout Check-In (existing)
  Night Check-In (existing)
  Training Load (existing athlete_load_tracking)
  Calendar Events (existing)
  Health Intake (new physio_health_profiles)
  Adult Tracking (new physio_adult_tracking)
          |
          v
REGULATION ENGINE (new edge fn: calculate-regulation)
  Weighted formula → score 0-100
  Produces: Green / Yellow / Red + tier breakdown
          |
          v
OUTPUTS
  Nightly Physio Report (new component in Vault)
  Post-Workout Feedback Banner (new component)
  Game Plan Physio Badges (overlay on existing GamePlanCard)
  Nutrition Physio Suggestions (new section in NutritionHub)
  Calendar Forward-Event Weighting (fed into engine)
```

---

## Database Changes (3 New Tables + Column Additions)

### Table 1: `physio_health_profiles`
One row per user. Stores health intake data from the one-time setup form.

```sql
create table public.physio_health_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  -- General
  blood_type text null,                         -- optional, informational
  dietary_style text null,                       -- vegan, omnivore, etc.
  allergies text[] default '{}',
  food_intolerances text[] default '{}',
  current_medications text[] default '{}',
  current_supplements text[] default '{}',
  known_conditions text[] default '{}',
  injury_history text null,
  -- Illness tracking (daily-reset via app logic)
  active_illness text[] default '{}',            -- e.g. ['cold', 'fever']
  illness_started_at date null,
  -- Stress sources (selected in morning check-in)
  typical_stress_sources text[] default '{}',
  -- Setup completion
  setup_completed boolean default false,
  -- Adult gate (age-verified 18+)
  adult_features_enabled boolean default false,
  adult_features_agreed_at timestamptz null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.physio_health_profiles enable row level security;

create policy "Users can manage own health profile"
  on public.physio_health_profiles
  for all using (auth.uid() = user_id);
```

### Table 2: `physio_daily_reports`
One row per user per day. Stores the Regulation Index result and nightly report content generated after the night check-in.

```sql
create table public.physio_daily_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  report_date date not null,
  -- Regulation Index
  regulation_score numeric(5,2) null,           -- 0-100
  regulation_color text null,                    -- 'green' | 'yellow' | 'red'
  -- Component scores (weighted inputs)
  hrv_deviation_pct numeric(5,2) null,
  sleep_component numeric(5,2) null,
  resting_hr_component numeric(5,2) null,
  muscle_restriction_component numeric(5,2) null,
  training_load_component numeric(5,2) null,
  stress_component numeric(5,2) null,
  fuel_component numeric(5,2) null,
  -- Nightly report fields
  summary_text text null,
  summary_headline text null,
  detail_nervous_system text null,
  detail_muscle_load text null,
  detail_fuel_status text null,
  detail_stress_impact text null,
  detail_upcoming_events text null,
  suggested_adjustments jsonb default '[]',
  long_term_trend_note text null,
  -- Upcoming event weighting input
  next_game_days_out integer null,
  next_game_event_type text null,
  -- Report metadata
  generated_at timestamptz default now(),
  user_accepted_suggestion boolean null,
  user_modified_suggestion boolean null,
  user_declined_suggestion boolean null,
  created_at timestamptz default now(),
  unique(user_id, report_date)
);

alter table public.physio_daily_reports enable row level security;

create policy "Users can manage own physio reports"
  on public.physio_daily_reports
  for all using (auth.uid() = user_id);
```

### Table 3: `physio_adult_tracking`
18+-gated. Female cycle phase and libido/wellness tracking.

```sql
create table public.physio_adult_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  entry_date date not null default current_date,
  -- Female cycle
  cycle_phase text null,                         -- 'menstrual'|'follicular'|'ovulatory'|'luteal'
  cycle_day integer null,
  period_active boolean default false,
  -- Male wellness (framed positively, no clinical language)
  morning_wellness_consistent boolean null,       -- replaces clinical phrasing
  -- Shared
  libido_level integer null,                     -- 1-5, optional
  notes text null,
  created_at timestamptz default now(),
  unique(user_id, entry_date)
);

alter table public.physio_adult_tracking enable row level security;

create policy "Users can manage own adult tracking"
  on public.physio_adult_tracking
  for all using (auth.uid() = user_id);
```

### Column Additions to `vault_focus_quizzes`
Add three missing fields to the existing check-in table:

```sql
-- Appetite (morning check-in)
alter table public.vault_focus_quizzes 
  add column if not exists appetite text null;              -- 'low' | 'normal' | 'high'

-- Stress sources (morning check-in)
alter table public.vault_focus_quizzes 
  add column if not exists stress_sources text[] null;      -- ['school','travel','illness',...]

-- Movement restriction test (pre-workout check-in)
alter table public.vault_focus_quizzes 
  add column if not exists movement_restriction jsonb null; -- {toe_touch: 'full'|'limited'|'pain', ...}

-- Resting heart rate (morning check-in)
alter table public.vault_focus_quizzes 
  add column if not exists resting_hr integer null;
```

---

## New Edge Function: `calculate-regulation`

**File:** `supabase/functions/calculate-regulation/index.ts`

This function is the brain of the system. It:
1. Pulls today's check-in data, 72-hour training load, upcoming calendar events
2. Applies the weighted Regulation Index formula
3. Generates the nightly report text via Lovable AI (Gemini Flash)
4. Upserts to `physio_daily_reports`

**Trigger:** Called automatically from the frontend after the night check-in submits successfully.

**Regulation Index Formula (0–100 scale, higher = better regulated):**

| Input | Weight | Source |
|-------|--------|--------|
| Sleep quality (1-5 → mapped to 0-100) | 15% | vault_focus_quizzes morning |
| Stress level (inverted 1-5 → 0-100) | 10% | vault_focus_quizzes |
| Physical readiness (1-5 → 0-100) | 10% | vault_focus_quizzes pre_lift |
| Muscle restriction (movement tests → 0-100) | 15% | vault_focus_quizzes pre_lift |
| Training load 72h (CNS load vs. weekly avg → deviation score) | 15% | athlete_load_tracking |
| Fuel adequacy (calories logged vs. TDEE goal → 0-100) | 10% | vault_nutrition_logs |
| Upcoming event weighting (game within 3 days = bonus buffer) | 25% | calendar_events + athlete_events |

**Color thresholds:**
- Green: score >= 72
- Yellow: score 50-71
- Red: score < 50

**Report text generation:** Uses Gemini Flash with the regulation score + each component as context. System prompt enforces forward-only framing, never negative language, never failure prediction.

---

## New Frontend Components

### Component 1: `PhysioHealthIntakeDialog.tsx`
**Location:** `src/components/physio/PhysioHealthIntakeDialog.tsx`

A multi-step setup dialog (appears once after Vault unlock, re-accessible from profile). Steps:
1. Basic health (blood type optional, dietary style, allergies, food intolerances)
2. Medical history (medications, conditions, injury history, current supplements)
3. Adult features opt-in (18+ gate with mandatory agreement — reads DOB from profile to verify age >= 18; if under 18, this step is skipped silently)

Uses existing `profiles.date_of_birth` field to determine age gate. No separate auth layer needed — just a client-side check that also gets server-validated when the adult tracking table's RLS is applied via the age stored in the profile.

### Component 2: `PhysioRegulationBadge.tsx`
**Location:** `src/components/physio/PhysioRegulationBadge.tsx`

A small colored circle badge showing today's regulation color (Green/Yellow/Red) with score. Appears in:
- Vault page header (next to streak count)
- Dashboard Game Plan header
- Pre-workout check-in confirmation screen

Props: `score: number | null`, `color: 'green' | 'yellow' | 'red' | null`, `size: 'sm' | 'md' | 'lg'`

### Component 3: `PhysioNightlyReportCard.tsx`
**Location:** `src/components/physio/PhysioNightlyReportCard.tsx`

Renders in the Vault "Today" tab after night check-in completion (when `physio_daily_reports` has a row for today). Layout:

- Top: Colored header bar (Green/Yellow/Red gradient) + 2-3 sentence summary
- Bottom: Collapsible "Full Report" section with 6 expandable detail rows (Nervous System, Muscle Load, Fuel Status, Stress Impact, Upcoming Events, Long-Term Trend)
- Each detail row: `WHY` / `WHAT TO DO` / `HOW IT HELPS` in plain language
- Suggestion action row: `Apply Suggestion` / `Modify` / `Decline` buttons (logged to `physio_daily_reports`)
- Disclaimer text at bottom (non-medical, educational)

### Component 4: `PhysioPostWorkoutBanner.tsx`
**Location:** `src/components/physio/PhysioPostWorkoutBanner.tsx`

A dismissable banner/card that appears in the Game Plan and Vault after a workout custom activity or program session is marked complete. It reads from the latest `physio_daily_reports` and `athlete_load_tracking` to produce a 1-2 sentence real-time message.

Examples:
- "Today's load was high. You have a game in 2 days. Recovery tonight is your best move."
- "Nice session. Your system is in the green. You're set up well for tomorrow."

Offers: `Accept Suggestion` / `Dismiss`

### Component 5: `PhysioGamePlanOverlay.tsx`
**Location:** `src/components/physio/PhysioGamePlanOverlay.tsx`

Not a standalone page — it provides a `usePhysioGamePlanBadges()` hook that `GamePlanCard.tsx` imports. Returns an array of badge configs keyed to task IDs:

```ts
interface PhysioBadge {
  taskId: string;
  type: 'fuel' | 'recovery' | 'mobility' | 'load';
  label: string;
  color: 'amber' | 'blue' | 'green' | 'red';
  message: string;
}
```

When `regulation_color === 'red'`, the workout task gets a `recovery` badge. When calories are under goal by >20%, the nutrition task gets a `fuel` badge. These render as small colored chip badges inline within each Game Plan task row — tappable to see the full message.

### Component 6: `PhysioNutritionSuggestions.tsx`
**Location:** `src/components/physio/PhysioNutritionSuggestions.tsx`

A card that appears in the Nutrition Hub below the daily macro ring. Reads from today's `physio_daily_reports` and the athlete's `physio_health_profiles` to generate contextual, non-prescriptive nudges:

- Hydration target adjusted for training load (e.g., "Your workload today was high — aim for 110oz")
- Carb timing suggestion if game within 48 hours
- Electrolyte note if high sweat exposure (tagged training + high soreness)
- Educational supplement notes (tart cherry for recovery, magnesium for stress + low HRV proxy)

Every suggestion includes the disclaimer badge: "Educational only. Consult a professional."

### Component 7: `PhysioAdultTrackingSection.tsx`
**Location:** `src/components/physio/PhysioAdultTrackingSection.tsx`

Locked section inside Vault (only shown if `physio_health_profiles.adult_features_enabled === true`). Contains:
- Female cycle: Phase selector (Menstrual / Follicular / Ovulatory / Luteal) + cycle day input + period toggle
- Male wellness: Single yes/no morning wellness consistency question (direct, clinical-free phrasing)
- Shared: Libido level 1-5 optional

When luteal phase + high load detected: automatically adds a `fuel` badge to the Nutrition task in Game Plan with message "Luteal phase + high load — consider a carb bump today."

### Component 8: `PhysioMovementScreen.tsx` (addition to existing Pre-Workout quiz)
**Location:** Added as a new step inside `VaultFocusQuizDialog.tsx` for `quiz_type: 'pre_lift'`

Three quick tests replacing the current "overall tightness" subjective field:
- Toe Touch: Full / Limited / Pain (tap selector)
- Overhead Reach: Full / Limited / Pain (tap selector)
- Bodyweight Squat: Full / Limited / Pain (tap selector)

Result stored in `movement_restriction` JSONB column.

### Component 9: `PhysioMorningAdditions.tsx` (additions to morning quiz)
New fields injected into the morning check-in step flow:
- Appetite: Low / Normal / High (3-tap selector with food emoji icons)
- Stress sources: Multi-select chips (School / Work / Family / Travel / Competition Nerves / Illness)
- Resting HR: Optional number input with "skip" option
- Illness toggle: Cold / Flu / Fever / GI Distress (updates `physio_health_profiles.active_illness`)

---

## New Hooks

### `usePhysioProfile.ts`
Fetches and manages `physio_health_profiles` for the current user. Exposes:
- `profile`, `loading`, `setupCompleted`, `adultFeaturesEnabled`
- `saveProfile(data)`, `updateIllness(illnesses)`, `enableAdultFeatures()`

### `usePhysioDailyReport.ts`
Fetches today's row from `physio_daily_reports`. Exposes:
- `report`, `regulationScore`, `regulationColor`, `loading`
- `triggerReportGeneration()` — calls the `calculate-regulation` edge function
- `logSuggestionResponse(response: 'accepted' | 'modified' | 'declined')`

### `usePhysioGamePlanBadges.ts`
Derived hook that combines `usePhysioDailyReport` + `useDailyNutritionTargets` + `useCalendar` to return the badge array for `GamePlanCard`.

### `usePhysioAdultTracking.ts`
Manages `physio_adult_tracking` entries. Exposed only when `adultFeaturesEnabled === true`.

---

## Integration Points (Existing Files Modified)

### `VaultFocusQuizDialog.tsx`
- Morning quiz: Add Appetite selector, Stress Sources multi-chip, Resting HR input, Illness toggle
- Pre-lift quiz: Add Movement Restriction screen (Toe Touch / Overhead / Squat) as new step
- Night quiz: After successful submit, call `triggerReportGeneration()` from `usePhysioDailyReport`

### `GamePlanCard.tsx`
- Import `usePhysioGamePlanBadges()`
- Render `PhysioBadge` chips next to each applicable task row
- Render `PhysioPostWorkoutBanner` when regulation data is available and workout was just completed

### `Vault.tsx` (Today Tab)
- Render `PhysioRegulationBadge` next to streak in page header
- Render `PhysioNightlyReportCard` if today's `physio_daily_reports` row exists
- Render `PhysioAdultTrackingSection` (conditionally, 18+ only)

### `Dashboard.tsx`
- Import `PhysioRegulationBadge` — small badge in top header area

### `NutritionHub.tsx`
- Render `PhysioNutritionSuggestions` card below the macro ring when regulation data exists

### `useUnifiedDataSync.ts`
- Add `physio_daily_reports` and `physio_health_profiles` to `TABLE_QUERY_MAPPINGS`

---

## File Creation Summary

| New File | Type | Purpose |
|---|---|---|
| `supabase/functions/calculate-regulation/index.ts` | Edge Function | Regulation Index + AI report generation |
| `src/components/physio/PhysioHealthIntakeDialog.tsx` | Component | One-time health profile setup |
| `src/components/physio/PhysioRegulationBadge.tsx` | Component | Color badge, shown everywhere |
| `src/components/physio/PhysioNightlyReportCard.tsx` | Component | Post-night nightly report with full breakdown |
| `src/components/physio/PhysioPostWorkoutBanner.tsx` | Component | Real-time post-workout feedback |
| `src/components/physio/PhysioNutritionSuggestions.tsx` | Component | Physio-aware nutrition nudges in hub |
| `src/components/physio/PhysioAdultTrackingSection.tsx` | Component | 18+-gated cycle + wellness tracking |
| `src/hooks/usePhysioProfile.ts` | Hook | Health intake CRUD |
| `src/hooks/usePhysioDailyReport.ts` | Hook | Regulation report fetch + trigger |
| `src/hooks/usePhysioGamePlanBadges.ts` | Hook | Badge configs for Game Plan |
| `src/hooks/usePhysioAdultTracking.ts` | Hook | Adult tracking CRUD |

---

## Modified File Summary

| Modified File | Change |
|---|---|
| `VaultFocusQuizDialog.tsx` | Add appetite, stress sources, resting HR, illness (morning); movement restriction screen (pre-lift); trigger report generation (night) |
| `GamePlanCard.tsx` | Add physio badge overlay, post-workout banner |
| `Vault.tsx` | Add regulation badge to header, nightly report card, adult section |
| `Dashboard.tsx` | Add regulation badge to header |
| `NutritionHub.tsx` | Add physio nutrition suggestions card |
| `useUnifiedDataSync.ts` | Register new tables in sync map |

---

## Zero Loose Ends Policy Compliance

| Requirement | Implementation |
|---|---|
| All custom cards feed load engine | Already handled by `athlete_load_tracking` + `calculate-regulation` reads it |
| All manual entries feed readiness index | `calculate-regulation` reads `vault_focus_quizzes` for all quiz types |
| Calendar feeds forward weighting | `calculate-regulation` queries `calendar_events` + `athlete_events` for 3-day look-ahead |
| Youth gating is locked | `adult_features_enabled` defaults to `false`; DOB check gates the opt-in |
| No adult metrics leak to parent dashboards | `PhysioAdultTrackingSection` only renders if `adult_features_enabled === true` in the user's own profile; no coach/scout dashboard reads this table |
| Nightly report auto-generates after check-in | Night check-in submit triggers `triggerReportGeneration()` automatically |
| Real-time analysis runs post-workout | `PhysioPostWorkoutBanner` fires when workout task completion triggers and loads today's regulation data |
| Disclaimer on every suggestion | Every physio suggestion block includes the standard disclaimer text |

---

## Implementation Sequence

1. Database migration (3 tables + 4 column additions)
2. `calculate-regulation` edge function
3. `usePhysioProfile.ts` + `usePhysioDailyReport.ts` hooks
4. `PhysioHealthIntakeDialog.tsx` (one-time setup)
5. Morning check-in additions (appetite, stress sources, resting HR, illness)
6. Pre-workout movement restriction screen
7. Night check-in auto-trigger for report generation
8. `PhysioNightlyReportCard.tsx` (core output)
9. `PhysioRegulationBadge.tsx` + integrate into Vault/Dashboard headers
10. `usePhysioGamePlanBadges.ts` + `GamePlanCard.tsx` badge overlay
11. `PhysioPostWorkoutBanner.tsx`
12. `PhysioNutritionSuggestions.tsx` in Nutrition Hub
13. `PhysioAdultTrackingSection.tsx` (18+ gated, in Vault)
14. `useUnifiedDataSync.ts` sync map update
15. `App.tsx` route registered (no new page needed — all components embed into existing pages)

---

## Disclaimer Architecture

Every component that surfaces a physio suggestion will include this exact text rendered as a small muted chip/footer:

> "This guidance is educational and not medical advice. Consult a licensed professional before changing health practices."

For adult feature opt-in, users must tap "I agree" on a modal that reads the full disclaimer before `adult_features_enabled` is set to `true`.

---

## What This System Is Not

- It does NOT override workouts, cancel games, or block any action
- It does NOT diagnose conditions
- It does NOT predict failure or use negative framing
- It does NOT expose any user's data to coaches, scouts, or parent dashboards
- It does NOT require a separate app section — it overlays intelligently onto existing modules

The entire system operates as an invisible intelligence layer that makes the existing app smarter, not louder.
