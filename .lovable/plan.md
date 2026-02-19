
# Hammer's Concrete Physio™ — Full E2E Implementation

## What Was Stopping the Build

Each implementation attempt stalled at Step 1 (database migration) because the migration requires a separate in-chat approval after the plan approval. When a new message was sent instead of approving the migration prompt, the system reset to plan mode.

**This time:** Approve this plan, then immediately approve the database migration prompt that appears next. After that, all 17 files will be built without interruption.

---

## Step 1 — Database Migration (Run First, Approve When Prompted)

Four columns added to `vault_focus_quizzes`:
- `appetite` (text) — Low / Normal / High
- `stress_sources` (text[]) — multi-select chips
- `movement_restriction` (jsonb) — toe touch / overhead / squat results
- `resting_hr` (integer) — optional morning input

Three new tables created:
- `physio_health_profiles` — one-time health intake per user (blood type, allergies, medications, conditions, dietary style, illness tracking, adult features gate)
- `physio_daily_reports` — one row per user per day (regulation score 0-100, color, 6 component scores, AI-generated nightly report text)
- `physio_adult_tracking` — 18+-gated cycle phase + wellness tracking

All three tables have RLS enabled with "users can manage own data only" policies.

---

## Step 2 — Edge Function: `calculate-regulation`

File: `supabase/functions/calculate-regulation/index.ts`

Uses existing `LOVABLE_API_KEY` secret — no new secrets needed.

**Logic flow:**
1. Auth from Bearer token
2. Pull today's morning + pre-lift quizzes from `vault_focus_quizzes`
3. Pull 72h + 7-day CNS load from `athlete_load_tracking`
4. Pull today's calories from `vault_nutrition_logs`
5. Pull TDEE target from `athlete_body_goals` + `profiles`
6. Pull 3-day calendar look-ahead from `athlete_events` + `calendar_events`
7. Calculate Regulation Index (weighted formula below)
8. Call Gemini Flash for nightly report text generation
9. Upsert to `physio_daily_reports`

**Regulation Index Formula (0–100):**

| Component | Weight | Source |
|---|---|---|
| Sleep quality | 15% | Morning quiz `sleep_quality` 1-5 → 0-100 |
| Stress inverted | 10% | Night quiz `stress_level` (1=100, 5=0) |
| Physical readiness | 10% | Pre-lift `physical_readiness` 1-5 → 0-100 |
| Muscle restriction | 15% | `movement_restriction` JSONB (Full=100, Limited=60, Pain=20) |
| Training load 72h | 15% | CNS load vs 7-day avg deviation |
| Fuel adequacy | 10% | Calories logged / TDEE × 100, capped at 100 |
| Calendar buffer | 25% | Game in 1 day=40, 2 days=60, 3 days=80, none=100 |

**Color thresholds:** Green ≥72 / Yellow 50-71 / Red <50

---

## Step 3 — New Hooks (4 files)

### `src/hooks/usePhysioProfile.ts`
- Fetches/upserts `physio_health_profiles`
- Exposes: `profile`, `setupCompleted`, `adultFeaturesEnabled`, `saveProfile()`, `updateIllness()`, `enableAdultFeatures()`
- Age gate: checks `profiles.date_of_birth` — under 18 = `enableAdultFeatures()` is a no-op

### `src/hooks/usePhysioDailyReport.ts`
- Fetches today's `physio_daily_reports` row
- Exposes: `report`, `regulationScore`, `regulationColor`, `triggerReportGeneration()`, `logSuggestionResponse()`
- `triggerReportGeneration()` calls the edge function then invalidates query

### `src/hooks/usePhysioGamePlanBadges.ts`
- Combines `usePhysioDailyReport` + `useDailyNutritionTargets` + `usePhysioProfile`
- Returns `PhysioBadge[]` keyed to task IDs
- Red regulation → workout task gets recovery badge
- Calories <80% of goal → nutrition task gets fuel badge
- Active illness → workout task gets load reduction badge

### `src/hooks/usePhysioAdultTracking.ts`
- Fetches/upserts `physio_adult_tracking` for today
- Only active when `adultFeaturesEnabled === true`

---

## Step 4 — New Components (6 files)

### `src/components/physio/PhysioRegulationBadge.tsx`
- Small circular colored dot + score number
- Props: `score`, `color`, `size`
- Shows "—" when no report exists yet

### `src/components/physio/PhysioHealthIntakeDialog.tsx`
- Multi-step dialog (3 steps)
- Step 1: Blood type (optional), dietary style chips, allergies, food intolerances
- Step 2: Medications, conditions, injury history, supplements
- Step 3: Adult features opt-in (18+ gate, mandatory disclaimer + "I Agree" before enabling)
- Auto-opens on first Vault visit if `setup_completed === false`

### `src/components/physio/PhysioNightlyReportCard.tsx`
- Renders in Vault after night check-in when today's report exists
- Color-coded header bar (green/yellow/red gradient)
- 2-3 sentence summary headline
- Collapsible "Full Report" with 6 expandable sections
- Each section: WHY / WHAT TO DO / HOW IT HELPS
- Apply / Modify / Decline buttons (all logged to DB)
- Disclaimer always visible at bottom

### `src/components/physio/PhysioPostWorkoutBanner.tsx`
- Dismissable card above Game Plan task list
- 1-2 sentence contextual message from regulation color + upcoming events
- Dismissed state stored in sessionStorage (won't re-appear same session)

### `src/components/physio/PhysioNutritionSuggestions.tsx`
- Card in Nutrition Hub below macro ring
- Hydration adjusted for training load tier
- Carb timing if game within 48h
- Electrolyte note if high CNS load
- Supplement education (tart cherry for red, magnesium for high stress)
- Every suggestion has "Educational only. Consult a professional." disclaimer chip
- Returns null if no today's report → graceful fallback

### `src/components/physio/PhysioAdultTrackingSection.tsx`
- Only renders when `adultFeaturesEnabled === true`
- Female: cycle phase selector (Menstrual/Follicular/Ovulatory/Luteal), cycle day input, period toggle
- Male: single wellness consistency yes/no (plain language, no clinical terms)
- Shared: libido level 1-5 optional tap selector
- Auto-saves on any change

---

## Step 5 — Modify `VaultFocusQuizDialog.tsx`

### Morning quiz additions (after sleep section):
1. Resting HR — number input with "Skip" option → saves to `resting_hr`
2. Appetite — 3-tap: 🥗 Low / 🍽️ Normal / 🍔 High → saves to `appetite`
3. Stress sources — multi-select chips (School / Work / Family / Travel / Competition Nerves / Illness) → saves to `stress_sources[]`
4. Illness sub-selector — appears when "Illness" selected: Cold / Flu / Fever / GI Distress → calls `updateIllness()` to update health profile

### Pre-lift quiz additions (new step after body map):
- Movement restriction screen — 3 tap selectors:
  - Toe Touch: Full ✅ / Limited ⚠️ / Pain ❌
  - Overhead Reach: Full ✅ / Limited ⚠️ / Pain ❌
  - Bodyweight Squat: Full ✅ / Limited ⚠️ / Pain ❌
- Saves as JSONB to `movement_restriction`

### Night quiz modification:
- After successful submit, fire `triggerReportGeneration()` non-blocking (doesn't delay success screen)

---

## Step 6 — Modify `useVault.ts`

Add 4 new fields to the `saveFocusQuiz` upsert:
```ts
appetite: data.appetite,
stress_sources: data.stress_sources,
movement_restriction: data.movement_restriction,
resting_hr: data.resting_hr,
```

---

## Step 7 — Modify `Vault.tsx`

- Add `PhysioRegulationBadge` next to streak count in header
- Add `PhysioHealthIntakeDialog` — auto-opens when `!setupCompleted`
- Add `PhysioNightlyReportCard` — shows after night check-in completion
- Add `PhysioAdultTrackingSection` — at bottom of left column (self-hides if not enabled)
- Wire `triggerReportGeneration()` to night quiz submit callback

---

## Step 8 — Modify `GamePlanCard.tsx`

- Import `usePhysioGamePlanBadges()`
- Render `PhysioBadge` chips inline in each task row (tappable, shows message in Popover)
- Render `PhysioPostWorkoutBanner` above task list when regulation report exists

---

## Step 9 — Modify `NutritionHubContent.tsx`

- Insert `<PhysioNutritionSuggestions />` after `<MacroTargetDisplay>`

---

## Step 10 — Modify `useUnifiedDataSync.ts`

Register 3 new tables in `TABLE_QUERY_MAPPINGS`:
- `physio_daily_reports` → invalidates `physioDailyReport`, `physioGamePlanBadges`
- `physio_health_profiles` → invalidates `physioProfile`, `physioGamePlanBadges`
- `physio_adult_tracking` → invalidates `physioAdultTracking`, `physioGamePlanBadges`

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

**11 new files. 6 modified files.**

---

## IMPORTANT — After Approving This Plan

When implementation starts, a **database migration prompt** will appear in the chat asking you to confirm running the SQL for the 3 new tables and 4 new columns. **Approve that prompt immediately** and the entire build will proceed uninterrupted from there.
