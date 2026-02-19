
# Hammer's Concrete Physio™ — Full E2E Implementation Plan

## Pre-Build Audit Confirmed

**Confirmed existing (no duplication):**
- `vault_focus_quizzes` table: 36 columns confirmed — `appetite`, `stress_sources`, `movement_restriction`, `resting_hr` do NOT exist yet
- `athlete_load_tracking` exists with CNS, fascial, volume load columns
- `athlete_events`, `calendar_events` tables exist for forward event weighting
- `profiles` table has `date_of_birth` (for 18+ gate), `sex` (for adult module routing)
- `vault_focus_quizzes` has all existing morning/pre-lift/night fields
- `useTDEE()`, `useLoadTracking()`, `useUnifiedDataSync()`, `useRecoveryStatus()` all exist
- `VaultFocusQuizDialog.tsx` is 1,504 lines — has morning quiz, pre-lift quiz, night quiz, full state machinery
- `Vault.tsx` "Today" tab layout confirmed — left column has check-in section
- `NutritionHubContent.tsx` renders `MacroTargetDisplay` → PhysioNutritionSuggestions goes right after it
- `LOVABLE_API_KEY` secret already configured — Gemini calls work without additional secrets

**Confirmed NOT existing yet (build new):**
- `physio_health_profiles` table
- `physio_daily_reports` table
- `physio_adult_tracking` table
- `calculate-regulation` edge function
- Any physio components or hooks

---

## Step 1 — Database Migration (3 Tables + 4 Columns)

### SQL to run:

```sql
-- Add new columns to vault_focus_quizzes
ALTER TABLE public.vault_focus_quizzes 
  ADD COLUMN IF NOT EXISTS appetite text NULL,
  ADD COLUMN IF NOT EXISTS stress_sources text[] NULL,
  ADD COLUMN IF NOT EXISTS movement_restriction jsonb NULL,
  ADD COLUMN IF NOT EXISTS resting_hr integer NULL;

-- Table 1: physio_health_profiles
CREATE TABLE public.physio_health_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  blood_type text NULL,
  dietary_style text NULL,
  allergies text[] DEFAULT '{}',
  food_intolerances text[] DEFAULT '{}',
  current_medications text[] DEFAULT '{}',
  current_supplements text[] DEFAULT '{}',
  known_conditions text[] DEFAULT '{}',
  injury_history text NULL,
  active_illness text[] DEFAULT '{}',
  illness_started_at date NULL,
  typical_stress_sources text[] DEFAULT '{}',
  setup_completed boolean DEFAULT false,
  adult_features_enabled boolean DEFAULT false,
  adult_features_agreed_at timestamptz NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.physio_health_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own health profile"
  ON public.physio_health_profiles FOR ALL
  USING (auth.uid() = user_id);

-- Table 2: physio_daily_reports
CREATE TABLE public.physio_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  report_date date NOT NULL,
  regulation_score numeric(5,2) NULL,
  regulation_color text NULL,
  hrv_deviation_pct numeric(5,2) NULL,
  sleep_component numeric(5,2) NULL,
  resting_hr_component numeric(5,2) NULL,
  muscle_restriction_component numeric(5,2) NULL,
  training_load_component numeric(5,2) NULL,
  stress_component numeric(5,2) NULL,
  fuel_component numeric(5,2) NULL,
  summary_text text NULL,
  summary_headline text NULL,
  detail_nervous_system text NULL,
  detail_muscle_load text NULL,
  detail_fuel_status text NULL,
  detail_stress_impact text NULL,
  detail_upcoming_events text NULL,
  suggested_adjustments jsonb DEFAULT '[]',
  long_term_trend_note text NULL,
  next_game_days_out integer NULL,
  next_game_event_type text NULL,
  generated_at timestamptz DEFAULT now(),
  user_accepted_suggestion boolean NULL,
  user_modified_suggestion boolean NULL,
  user_declined_suggestion boolean NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, report_date)
);
ALTER TABLE public.physio_daily_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own physio reports"
  ON public.physio_daily_reports FOR ALL
  USING (auth.uid() = user_id);

-- Table 3: physio_adult_tracking
CREATE TABLE public.physio_adult_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entry_date date NOT NULL DEFAULT current_date,
  cycle_phase text NULL,
  cycle_day integer NULL,
  period_active boolean DEFAULT false,
  morning_wellness_consistent boolean NULL,
  libido_level integer NULL,
  notes text NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, entry_date)
);
ALTER TABLE public.physio_adult_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own adult tracking"
  ON public.physio_adult_tracking FOR ALL
  USING (auth.uid() = user_id);
```

---

## Step 2 — Edge Function: `calculate-regulation`

**File:** `supabase/functions/calculate-regulation/index.ts`

Uses the existing `LOVABLE_API_KEY` secret (no new secrets needed). Called from the frontend after night check-in submits.

**Logic:**
1. Auth via `getClaims()` from the Bearer token
2. Pull today's morning + pre-lift quizzes from `vault_focus_quizzes`
3. Pull 72h training load from `athlete_load_tracking` (last 3 days)
4. Pull 7-day weekly CNS average from `athlete_load_tracking`
5. Pull calories logged today from `vault_nutrition_logs`
6. Pull TDEE calorie target from `athlete_body_goals` + `profiles` (same logic as `useTDEE`)
7. Pull upcoming calendar events (next 3 days) from `athlete_events` + `calendar_events`
8. Calculate Regulation Index using the weighted formula
9. Generate nightly report text via Gemini Flash using `LOVABLE_API_KEY`
10. Upsert to `physio_daily_reports`

**Regulation Index Formula (0–100, higher = better regulated):**

| Component | Weight | Derivation |
|---|---|---|
| Sleep quality | 15% | Morning quiz `sleep_quality` (1-5 → mapped 0-100) |
| Stress (inverted) | 10% | Night quiz `stress_level` (inverted: 1=100, 5=0) |
| Physical readiness | 10% | Pre-lift `physical_readiness` (1-5 → 0-100) |
| Muscle restriction | 15% | Pre-lift `movement_restriction` JSONB (Full=100, Limited=60, Pain=20, absent=70 default) |
| Training load 72h | 15% | Current 72h CNS load vs. 7-day weekly avg → deviation score |
| Fuel adequacy | 10% | Calories logged / TDEE target × 100, capped at 100 |
| Calendar event buffer | 25% | Game within 1 day = 40, 2 days = 60, 3 days = 80, none = 100 |

**Color thresholds:**
- Green: score ≥ 72
- Yellow: score 50–71
- Red: score < 50

**AI report generation:** System prompt: "You are a sports physiology assistant. Generate forward-looking, positive-framing daily readiness reports for athletes. NEVER use negative predictions, NEVER say 'bad' or 'failure'. Always frame forward. Respond with a JSON object."

Gemini returns: `{ summary_headline, summary_text, detail_nervous_system, detail_muscle_load, detail_fuel_status, detail_stress_impact, detail_upcoming_events, long_term_trend_note, suggested_adjustments }`

---

## Step 3 — New Hooks

### `src/hooks/usePhysioProfile.ts`
- Fetches/upserts `physio_health_profiles` for current user
- Uses React Query with `queryKey: ['physioProfile', user?.id]`
- Exposes: `profile`, `loading`, `setupCompleted`, `adultFeaturesEnabled`, `saveProfile(data)`, `updateIllness(illnesses)`, `enableAdultFeatures()`
- Age gate: checks `profiles.date_of_birth` — if under 18, `enableAdultFeatures()` is a no-op

### `src/hooks/usePhysioDailyReport.ts`
- Fetches today's row from `physio_daily_reports`
- Uses React Query with `queryKey: ['physioDailyReport', today, user?.id]`
- Exposes: `report`, `regulationScore`, `regulationColor`, `loading`, `triggerReportGeneration()`, `logSuggestionResponse(response)`
- `triggerReportGeneration()` calls `supabase.functions.invoke('calculate-regulation')`, then invalidates the query key

### `src/hooks/usePhysioGamePlanBadges.ts`
- Derived hook combining `usePhysioDailyReport` + `useDailyNutritionTargets` + `usePhysioProfile`
- Returns `PhysioBadge[]` array keyed to task IDs
- Badge types: `fuel | recovery | mobility | load`
- When `regulationColor === 'red'` → workout task gets recovery badge
- When calories < goal by >20% → nutrition task gets fuel badge
- When `profile.active_illness.length > 0` → load reduction badge on workout task

### `src/hooks/usePhysioAdultTracking.ts`
- Fetches/upserts `physio_adult_tracking` for current user and today
- Only exposed when `adultFeaturesEnabled === true`
- Exposes today's entry, `saveEntry(data)` function

---

## Step 4 — New Components

### `src/components/physio/PhysioHealthIntakeDialog.tsx`
Multi-step dialog. 3 steps:
1. **Basic Health**: blood type (optional, 8-choice selector), dietary style (chips: Omnivore/Vegan/Vegetarian/Paleo/Keto/Other), allergies (multi-tag input), food intolerances (multi-tag input)
2. **Medical History**: current medications (multi-tag), known conditions (multi-tag), injury history (free text), supplements (multi-tag)
3. **Adult Features** (conditionally rendered if age ≥ 18 based on profile DOB): disclaimer text + "I Agree" toggle before `enableAdultFeatures()` fires

Triggered on first open. Re-accessible from profile. Uses `usePhysioProfile()`.

### `src/components/physio/PhysioRegulationBadge.tsx`
Small colored indicator component.
- Props: `score: number | null`, `color: 'green' | 'yellow' | 'red' | null`, `size: 'sm' | 'md' | 'lg'`
- Visual: circular dot with color (green/yellow/red), score number next to it (or "—" if null)
- Labeled "Regulation" below it

### `src/components/physio/PhysioNightlyReportCard.tsx`
Renders in Vault when `physio_daily_reports` row exists for today. Full layout:
- Header bar with gradient matching regulation color
- Headline + 2-3 sentence summary
- "Full Report" collapsible toggle
- 6 expandable rows (Nervous System / Muscle Load / Fuel Status / Stress Impact / Upcoming Events / Long-Term Trend)
- Each row has WHY / WHAT TO DO / HOW IT HELPS sections
- Action row: `Apply Suggestion` / `Modify` / `Decline` — each calls `logSuggestionResponse()`
- Disclaimer text at bottom (always visible)

### `src/components/physio/PhysioPostWorkoutBanner.tsx`
Dismissable card. Reads `usePhysioDailyReport` + `useLoadTracking`.
- Shows when regulation report exists for today
- 1-2 sentence contextual message based on color + upcoming events
- `Accept Suggestion` / `Dismiss` buttons
- Stores dismissed state in sessionStorage so it doesn't re-appear in the same session

### `src/components/physio/PhysioNutritionSuggestions.tsx`
Card for Nutrition Hub "Today" tab. Reads `usePhysioDailyReport` + `usePhysioProfile` + `useLoadTracking`.
- Hydration suggestion: adjusted for training load tier
- Carb timing tip: if game within 48 hours
- Electrolyte note: if high CNS load
- Supplement education: tart cherry (if red regulation), magnesium (high stress + low sleep)
- Every suggestion has a small disclaimer chip
- Hidden if no `physio_daily_reports` row exists for today (graceful fallback)

### `src/components/physio/PhysioAdultTrackingSection.tsx`
Visible in Vault only when `adultFeaturesEnabled === true`.
- **Female section** (shown when profile `sex === 'female'` or sex not set): Phase selector (Menstrual/Follicular/Ovulatory/Luteal) + cycle day number input + period toggle
- **Male section** (shown when profile `sex === 'male'`): Single yes/no question: "Has your morning energy/wellness been consistent this week?" — plain language, no clinical phrasing
- **Shared**: Libido level 1-5 optional tap selector
- Auto-saves on any change via `usePhysioAdultTracking()`
- When luteal phase + training_load_component > 70 → adds fuel badge to nutrition task in Game Plan

---

## Step 5 — Modify `VaultFocusQuizDialog.tsx`

### Morning Quiz additions (injected after existing sleep section):
1. **Resting HR** — optional number input (`<Input type="number" placeholder="e.g. 58">`) with a "Skip" tap. Saves to new `resting_hr` column.
2. **Appetite** — 3-tap selector: 🥗 Low / 🍽️ Normal / 🍔 High. Saves to `appetite` column.
3. **Stress Sources** — Multi-select chips: School / Work / Family / Travel / Competition Nerves / Illness. Saves to `stress_sources[]` column.
4. **Illness toggle** — If "Illness" selected in stress sources, expand a sub-selector: Cold / Flu / Fever / GI Distress. Updates `physio_health_profiles.active_illness` via `updateIllness()`.

### Pre-Lift Quiz additions (new step, after existing body map):
1. **Movement Restriction Screen** — 3 test selectors in a clean tap UI:
   - Toe Touch: Full ✅ / Limited ⚠️ / Pain ❌
   - Overhead Reach: Full ✅ / Limited ⚠️ / Pain ❌
   - Bodyweight Squat: Full ✅ / Limited ⚠️ / Pain ❌
   
   Saves as: `movement_restriction: { toe_touch: 'full'|'limited'|'pain', overhead_reach: ..., squat: ... }`

### Night Quiz modification:
- After successful submit (inside existing `handleSubmit` where `result.success` is true), before showing `NightCheckInSuccess`, call:
  ```ts
  // Non-blocking — fire and don't wait
  triggerReportGeneration();
  ```
  This calls the edge function asynchronously so it doesn't block the success screen.

### `handleSubmit` additions — save new fields:
```ts
// morning quiz
data.appetite = appetite || undefined;
data.stress_sources = stressSources.length > 0 ? stressSources : undefined;
data.resting_hr = restingHr ? parseInt(restingHr) : undefined;

// pre-lift quiz
data.movement_restriction = movementRestriction; // { toe_touch, overhead_reach, squat }
```

### `saveFocusQuiz` in `useVault.ts`:
Add the 4 new fields to the upsert object:
```ts
appetite: data.appetite,
stress_sources: data.stress_sources,
movement_restriction: data.movement_restriction,
resting_hr: data.resting_hr,
```

---

## Step 6 — Modify `Vault.tsx`

### In the "Today" tab left column:

1. **Regulation Badge in header** — add `<PhysioRegulationBadge>` next to the streak count inside the `VaultStreakRecapCard` section header (pass `score` and `color` from `usePhysioDailyReport`)

2. **Nightly Report Card** — rendered directly after the Quiz completion status grid in the "Daily Check-In" container:
   ```tsx
   {hasCompletedQuiz('night') && <PhysioNightlyReportCard />}
   ```

3. **Adult Tracking Section** — at the bottom of the left column, after all other cards:
   ```tsx
   <PhysioAdultTrackingSection />
   ```
   (internally renders nothing if `adultFeaturesEnabled === false`)

4. **Health Intake Dialog** — add `PhysioHealthIntakeDialog` state and trigger. Open automatically when `!setupCompleted` and user has vault access. Also accessible via a small "⚕️ Health Profile" button in the section header.

### `handleQuizSubmit` in `Vault.tsx`:
When `selectedQuizType === 'night'` and `result.success`, call `triggerReportGeneration()` from `usePhysioDailyReport`:
```ts
if (selectedQuizType === 'night' && result.success) {
  triggerReportGeneration(); // fire-and-forget
}
```

---

## Step 7 — Modify `GamePlanCard.tsx`

1. **Import and use `usePhysioGamePlanBadges()`** near the top of the component
2. **Render physio badges** inline inside each task row — after the task title, before the completion checkbox:
   ```tsx
   {physioBadges.filter(b => b.taskId === task.id).map(badge => (
     <button key={badge.type} onClick={() => setActiveBadgeMessage(badge.message)}
       className={`text-xs px-2 py-0.5 rounded-full ${badgeColorClass(badge.color)}`}>
       {badge.label}
     </button>
   ))}
   ```
3. **Badge message popover** — a simple `<Popover>` that shows when a badge is tapped

4. **Post-Workout Banner** — render `<PhysioPostWorkoutBanner />` just above the task list when `regulationReport` exists for today

---

## Step 8 — Modify `NutritionHubContent.tsx`

After the `<MacroTargetDisplay>` component (line ~443), insert:
```tsx
<PhysioNutritionSuggestions />
```
Component self-manages its visibility (returns null if no report data).

---

## Step 9 — Modify `useUnifiedDataSync.ts`

Add to `TABLE_QUERY_MAPPINGS`:
```ts
'physio_daily_reports': [
  ['physioDailyReport'],
  ['physioGamePlanBadges'],
],
'physio_health_profiles': [
  ['physioProfile'],
  ['physioGamePlanBadges'],
],
'physio_adult_tracking': [
  ['physioAdultTracking'],
  ['physioGamePlanBadges'],
],
```

---

## File Summary

| Action | File |
|---|---|
| CREATE | `supabase/functions/calculate-regulation/index.ts` |
| CREATE | `src/hooks/usePhysioProfile.ts` |
| CREATE | `src/hooks/usePhysioDailyReport.ts` |
| CREATE | `src/hooks/usePhysioGamePlanBadges.ts` |
| CREATE | `src/hooks/usePhysioAdultTracking.ts` |
| CREATE | `src/components/physio/PhysioHealthIntakeDialog.tsx` |
| CREATE | `src/components/physio/PhysioRegulationBadge.tsx` |
| CREATE | `src/components/physio/PhysioNightlyReportCard.tsx` |
| CREATE | `src/components/physio/PhysioPostWorkoutBanner.tsx` |
| CREATE | `src/components/physio/PhysioNutritionSuggestions.tsx` |
| CREATE | `src/components/physio/PhysioAdultTrackingSection.tsx` |
| MODIFY | `src/components/vault/VaultFocusQuizDialog.tsx` |
| MODIFY | `src/hooks/useVault.ts` |
| MODIFY | `src/pages/Vault.tsx` |
| MODIFY | `src/components/GamePlanCard.tsx` |
| MODIFY | `src/components/nutrition-hub/NutritionHubContent.tsx` |
| MODIFY | `src/hooks/useUnifiedDataSync.ts` |

**Total: 11 new files, 6 modified files.**

---

## Implementation Order

1. Database migration (tables + columns) — FIRST, required for everything
2. `calculate-regulation` edge function
3. `usePhysioProfile.ts` + `usePhysioDailyReport.ts` (core hooks)
4. `usePhysioAdultTracking.ts` + `usePhysioGamePlanBadges.ts` (derived hooks)
5. `PhysioRegulationBadge.tsx` (simplest component, used everywhere)
6. `PhysioHealthIntakeDialog.tsx`
7. `PhysioNightlyReportCard.tsx`
8. `PhysioPostWorkoutBanner.tsx`
9. `PhysioNutritionSuggestions.tsx`
10. `PhysioAdultTrackingSection.tsx`
11. Modify `VaultFocusQuizDialog.tsx` — add morning/pre-lift fields + night trigger
12. Modify `useVault.ts` — add new fields to save function
13. Modify `Vault.tsx` — integrate all physio components
14. Modify `GamePlanCard.tsx` — badge overlay + post-workout banner
15. Modify `NutritionHubContent.tsx` — add nutrition suggestions card
16. Modify `useUnifiedDataSync.ts` — register new tables

---

## Zero Loose Ends Compliance

| Requirement | Implementation |
|---|---|
| Youth gating locked | `adult_features_enabled` defaults `false`; DOB check in `enableAdultFeatures()` — under 18 = no-op |
| No adult data in coach/scout dashboards | `PhysioAdultTrackingSection` only renders when `adultFeaturesEnabled === true`; RLS prevents cross-user reads |
| Nightly report auto-generates | Night check-in submit fires `triggerReportGeneration()` non-blocking |
| Disclaimer on every suggestion | All physio components include the mandatory disclaimer text |
| Calendar feeds forward weighting | Edge function queries `athlete_events` + `calendar_events` for 3-day look-ahead |
| All check-ins feed regulation engine | Edge function reads all three quiz types from `vault_focus_quizzes` |
| Training load feeds engine | Edge function queries `athlete_load_tracking` for 72h CNS load |
| Illness reduces load suggestions | `active_illness` detected in `usePhysioGamePlanBadges` → load reduction badge on workout task |
