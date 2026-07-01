
# Phases 5–7 — Athlete Context, Personalization, Training Age Engines

Additive constitutional overlay on Phase 4's `TrainingContext`. No workout philosophy, catalog, or UI rewrites — only immutable inputs every future engine will consume.

## Scope Boundaries (Do Not Touch)

- Lift/Speed/Bat Speed/Conditioning/Cross Sport/Recovery generators
- Movement catalog / exercise selection
- Coaching philosophy
- Card UI, ordering, or CardMeta layout

## Phase 5 — Athlete Context Engine

**New:** `src/lib/wic/athleteContext.ts` + server mirror `supabase/functions/_shared/wic/athleteContext.ts`

Immutable `AthleteContext` object with 8 sub-domains, each *wire existing data only* — no new calculations:

1. **Identity** — athlete_id, sport (baseball/softball), throwing_side, hitting_side, primary_position, secondary_position, two_way (from `profiles`, `athlete_side_preferences`)
2. **Development** — chronological_age, training_age (Phase 7), biological_stage (nullable), competitive_level, organizational_level (Youth/MS/HS/College/Pro) — from `profiles`, `league_classifications`, `athlete_professional_status`
3. **Anthropometrics** — height, weight, body_composition, limb_proportions, dominant_side — from `profiles`, `weight_entries` (nullable when absent; never invented)
4. **Environment** — equipment[], facility, indoor_outdoor, available_time_min, weather_dependency, substitution_capability — from `athlete_equipment_context`, `training_preferences`
5. **Schedule** — game_today, practice_today, tournament, travel, bullpen, throwing_day, off_day, recovery_day — from existing `scheduleContext.ts` + `calendar_events`
6. **Goals** — unified list from `athlete_body_goals` + category goals (speed/power/throwing/hitting/fielding) with ranks — read-only unifier
7. **Readiness** — cns_load, soreness, fatigue, sleep, workload, compliance — from `wk_cns_ledger`, `wk_recovery_acks`, `athlete_daily_log`
8. **Injury Status** — active_restrictions[], modified_movements[], return_to_play — from `user_injury_progress`, `athlete_context`

**Resolver:** `resolveAthleteContext(userId, date, supabase)` returns frozen object + `completeness_score` + `missing_fields[]`. Runs once per generation.

## Phase 6 — Personalization Engine

**New:** `src/lib/wic/personalizationContext.ts` + server mirror

Immutable `PersonalizationContext` capturing the *deterministic priority stack*:

```
Safety → Season → Schedule → Readiness → Injury → Training Age →
Goals → Position → Equipment → Preferences → Variation
```

Fields:
- `priorityStack: PersonalizationLayer[]` (ordered, frozen)
- `variableRegistry: Record<VarName, { source, status: 'collected'|'stored'|'consumed'|'unused'|'unknown' }>` — eliminates hidden personalization
- `substitutionFramework: { equipment, environment, injury, time, coach_override }` — **structure only**, populated by later phases
- `version: string` (semver-pinned)

## Phase 7 — Training Age Engine

**New:** `src/lib/wic/trainingAge.ts` + server mirror

- `TrainingAge` enum: Beginner | Developing | Intermediate | Advanced | Elite | Professional
- `resolveTrainingAge(profile, history)` — deterministic classifier (uses existing signals: months_training, session_count, competitive_level; no new philosophy)
- `RecoveryWindowLookup: Record<TrainingAge, { minHours, deloadFreq }>` — placeholder table, values wired but not authoritative yet
- `LoadTolerance` placeholder: `{ volume, intensity, frequency, eccentric, elastic, power }` — all `null` until later phases populate

## Snapshot Extension

`HammersTodayProvider.tsx` snapshot gains three immutable fields:
```ts
{
  trainingContext,      // Phase 4 (existing)
  athleteContext,       // Phase 5 (new)
  personalizationContext, // Phase 6 (new)
  trainingAgeContext,   // Phase 7 (new)
}
```
Every card reads from the same snapshot — no card resolves independently.

## Generator Integration

`supabase/functions/wk-generate-daily/index.ts`:
1. Resolve `TrainingContext` (existing)
2. Resolve `AthleteContext` (new)
3. Resolve `PersonalizationContext` (new)
4. Resolve `TrainingAgeContext` (new)
5. Stamp all four into every prescription's `why_payload.contexts`
6. Existing engines continue unchanged — they now *receive* the objects but don't yet consume new fields

## Validator Extensions

`supabase/functions/_shared/wic/validator.ts` — new fatal codes:
- `athlete_context_missing`
- `multiple_athlete_contexts`
- `multiple_personalization_contexts`
- `training_age_unresolved`
- `goal_resolution_inconsistent`
- `handedness_inconsistent`
- `position_inconsistent`

## Diagnostics Extensions

Migration to add columns on `wk_generation_diagnostics`:
- `athlete_context_version text`
- `personalization_version text`
- `training_age_version text`
- `missing_context_fields text[]`
- `context_completeness_score numeric`

Update `wk_persist_prescriptions_atomic` RPC to persist them.

## Client Surface

`useWkDailyPrescriptions.ts` exposes:
```ts
{ ...existing, athleteContext, personalizationContext, trainingAgeContext }
```
Cards may read these but need not consume yet (deferred to next wave).

## Regression Evidence

- Server log: single resolution per generation, versions stamped on every row
- Client assert (dev-only): all cards receive referentially identical context objects (`Object.is` check via provider ref)
- Diagnostics row shows completeness score + missing_fields for every generation

## Files Touched

**New (6):**
- `src/lib/wic/athleteContext.ts`
- `src/lib/wic/personalizationContext.ts`
- `src/lib/wic/trainingAge.ts`
- `supabase/functions/_shared/wic/athleteContext.ts`
- `supabase/functions/_shared/wic/personalizationContext.ts`
- `supabase/functions/_shared/wic/trainingAge.ts`

**Modified (5):**
- `supabase/functions/wk-generate-daily/index.ts` — resolve + stamp
- `supabase/functions/_shared/wic/validator.ts` — 7 new fatal codes
- `src/components/hammer/HammersTodayProvider.tsx` — snapshot extension
- `src/hooks/useWkDailyPrescriptions.ts` — expose new contexts
- Migration — diagnostics columns + RPC update

## Explicitly Deferred

Lifts, Speed, Bat Speed, Conditioning, Cross Sport, Recovery programming, movement catalog, coaching philosophy — all consume these contexts in the next wave.
