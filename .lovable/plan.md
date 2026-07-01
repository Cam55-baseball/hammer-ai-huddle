# Phase 1 — Hammers Today Reality Audit

Read-only, evidence-only. No code, UI, or architecture changes. The single deliverable is a constitutional audit document that maps every workout-generation surface as it exists today.

## Deliverable

`docs/audits/hammers-today-reality-audit.md` — one long document with every section below. Every finding cites `path/file.ts:line` and quotes the relevant lines. Nothing is inferred.

Companion machine-readable index:
- `docs/audits/hammers-today/dependency-map.json` — nodes = files/functions/tables/edge functions; edges = calls/reads/writes.
- `docs/audits/hammers-today/variables-matrix.csv` — one row per athlete variable × (collected / stored / consumed / ignored).
- `docs/audits/hammers-today/fragments.csv` — dead, duplicate, disconnected surfaces.

## Investigation scope (verified starting set — will be expanded from evidence, not assumed)

Server / generation
- `supabase/functions/wk-generate-daily/index.ts` (783 lines) — primary generator
- `supabase/functions/_shared/wic/{constitution,adaptationSelector,dayStructure,rationale,validator}.ts`
- `supabase/functions/_shared/wic/engines/{strength,sprint,batSpeed,conditioning,crossSport,reserved}.ts`
- `supabase/functions/generate-warmup/index.ts`
- `supabase/functions/generate-block-workout`, `generate-elite-layer`, `generate-training-block`, `recommend-workout`, `generate-drills` — check whether they still feed Hammers Today or are legacy

Client / consumption
- `src/hooks/useWkDailyPrescriptions.ts`, `useWarmupGenerator.ts`, `useBlockedLiftMovements.ts`, `useReadinessState.ts`, `useEliteWorkout.ts`, `useHammerState.ts`, `useHammerNextStep.ts`, `useScheduledPracticeSessions.ts`, `useImportScheduleEvents.ts`, `useRescheduleEngine.ts`, `useWorkoutRecommendations.ts`, `useWorkoutPresets.ts`, `useBlockWorkoutGenerator.ts`
- `src/components/hammer/*` — `HammerDailyPlan.tsx` (824 lines), `WkLiftsCard`, `WkSpeedBatCard`, `WkConditioningCard`, `WkPrescriptionCard`, `HammerWarmupDialog`, `HammerScheduleStrip`, `ReadinessChip`, `HammerStateBadge`
- `src/lib/hammer/prescription/dailyPlan.ts` (1530 lines), `throwingSelector.ts`, `context/athleteContext.ts`, `goals/*`, `injury/reportInjury.ts`
- `src/lib/wic/constitution.ts`

Database
- `wk_movement_catalog`, `wk_prescriptions`, `wk_session_logs`, `wk_cns_ledger`, `wk_periodization_blocks`, `wk_recovery_acks`, `wk_movement_overrides`
- Reads against `training_preferences`, `athlete_context`, `profiles`, `calendar_events`, `gp_games`, `scheduled_practice_sessions`, `athlete_side_preferences`, `athlete_body_goals`, `athlete_daily_log`, `athlete_load_tracking`, `athlete_recruiting_consent`, plus `get_athlete_context_envelope` RPC

## Audit document structure

1. Workout Intelligence Architecture Map — annotated diagram of server → validator → DB → hook → card, per surface.
2. Dependency Map — file/function graph with call directions.
3. Canonical Data Flow — actual (not idealized) flow from user profile → rendered card, with the exact functions each hop passes through.
4. Personalization Audit — variable-by-variable matrix (age, biological stage, training age, position, pitcher/two-way, handedness, season phase, today's schedule, practice/game/tournament, recovery/soreness/readiness, CNS, fatigue, injuries, restrictions, equipment, facility, time, goals, experience, previous workouts, historical workload, anthropometrics, limb proportions, compliance). For each: collected where, stored where, consumed where, ignored where.
5. Exercise Selection Audit — how the generator + engines pick, filter, categorize, dedupe, progress/regress; season/goal/age/equipment gates; substitution + override paths.
6. Card Generation Audit — per card (Warm-Up, Speed, Bat Speed, Lift, Conditioning, Cross Sport, Recovery, Arm Care, Mobility, Mental, Nutrition): builder, location, trigger, inputs, outputs.
7. Ordering Audit — where order is set, determinism, drift risks, duplicate risk.
8. Season Intelligence Audit — how in-season/off/pre/transition are decided, quarter labels, drift vs athlete context.
9. Duplicate Detection Audit — root cause(s) for reported duplicate exercises/cards/prescriptions.
10. Formatting Audit — card/exercise/set/rep/title/description/season-label/spacing/rendering consistency.
11. Regression Audit — surfaces most likely to break under future edits.
12. Fragment Audit — dead/legacy/duplicate/disconnected generators, prompts, libraries, selectors, validators, seasonal logic, personalization logic.
13. User-Report Traceback — each recent user complaint (all-lower-body lift, duplicate exercises, in-season Nordic curls, ordering, kicked-out glitches, "spinning" analysis) mapped to file:line root cause or explicitly marked "requires further investigation."
14. Prioritized Implementation Plan — ranked by user impact × technical dependency, with regression risk per item.

## Evidence rules

Every finding row:
```
Finding: <one line>
File: path/file.ts:line-range
Function: name
Current behavior: <quote>
Dependencies: <list>
Regression risk: low/med/high + why
```

## Method

1. Trace `wk-generate-daily/index.ts` top-to-bottom; catalog every DB read/write, engine call, validator call, insert into `wk_prescriptions`, `wk_cns_ledger` write.
2. Trace `dailyPlan.ts` (1530 lines) — determine whether it still authors any prescriptions or is legacy alongside WIC.
3. Trace `useWkDailyPrescriptions` → `HammerDailyPlan` → the four Wk cards to record exact grouping + ordering rules.
4. Grep every table above for readers/writers to build the dependency map.
5. Run SQL against `wk_movement_catalog` and recent `wk_prescriptions` to record real seasonal eligibility distribution, duplicate incidence, `generator_version` mix, and whether `why_v2` is populated end-to-end.
6. Cross-check legacy generators (`generate-block-workout`, `generate-elite-layer`, `recommend-workout`, `generate-training-block`) for live callers vs dead code.
7. Compile fragments, regressions, and prioritized roadmap.

## Constraints

- No file edits, no schema changes, no UI changes.
- No guessing language ("likely", "should", "probably"). If unknown → labeled "requires further investigation" with the exact next probe.
- Document is self-contained: a future phase can be planned from it without re-reading the codebase.

## Out of scope (explicitly)

Workout rewrite, UI redesign, architectural change, catalog edits, WIC rule changes. Those are downstream phases informed by this audit.
