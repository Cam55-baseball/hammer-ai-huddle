
# Phase 10 — Performance Support Engine

Additive-only implementation of the four remaining daily-performance engines using the constitutional architecture already sealed in Phases 8 and 9. No changes to Lift, Speed, Bat Speed, UI, Card Registry, HammersTodayProvider, or the snapshot architecture.

## 1. Database Migration (one migration, additive-only)

Extend `wk_movement_catalog` (governance metadata, all nullable, backfilled per slot):
- `conditioning_category`, `cross_sport_category`, `recovery_category`, `arm_care_category`
- `energy_system` (`alactic` / `lactic` / `aerobic_base` / `aerobic_power` / `mixed`)
- `recovery_class` (`cns` / `tissue` / `mobility` / `regeneration` / `deload`)
- `throwing_phase` (`throwing_day` / `non_throwing_day` / `bullpen` / `long_toss` / `recovery` / `rtp`)
- `movement_transfer` (`fascial` / `footwork` / `explosive` / `balance` / `visual` / `reflex` / `coordination` / `rotational` / `low_impact` / `recovery`)
- `sport_transfer` (jsonb array of contributing sports)
- `travel_friendly`, `indoor_legal`, `outdoor_legal` (booleans)

Extend `wk_generation_diagnostics` with, per engine:
- `<engine>_template_id`
- `<engine>_category_coverage` (jsonb)
- `<engine>_validation_status`
- `<engine>_substitution_completeness`
- `<engine>_governance_version`

Update `wk_persist_prescriptions_atomic` RPC to persist the new diagnostic columns. Data backfill for catalog governance runs via the `supabase--insert` tool after the migration lands.

## 2. Shared engine modules

Mirror Phase 8/9 shape for each engine:

```
supabase/functions/_shared/wic/conditioning/{movementCategories,templates,substitutions,sessionBuilder}.ts
supabase/functions/_shared/wic/crossSport/{movementCategories,templates,substitutions,sessionBuilder}.ts
supabase/functions/_shared/wic/recovery/{movementCategories,templates,substitutions,sessionBuilder}.ts
supabase/functions/_shared/wic/armCare/{movementCategories,templates,substitutions,sessionBuilder}.ts
```

Each `sessionBuilder` exports a `certify<Engine>` function that returns the same result shape used by Lift/Speed/BatSpeed (templateId, categoryCoverage, substitutionCompleteness, validationStatus, governanceVersion, stamps map, fatal[], warn[]).

### Templates per engine

- **Conditioning:** `aerobic_base`, `repeated_sprint`, `baseball_game_day`, `pitcher_conditioning`, `recovery_flush`, `tournament_day`, `practice_day`, `off_day`, `return_to_conditioning`. Each carries objective, CNS budget, metabolic budget, tissue budget, interval profile, required categories.
- **Cross-Sport:** `fascial_rotation`, `footwork`, `explosive_transfer`, `recovery_transfer`, `balance_transfer`, `visual_reaction`, `reflex`, `coordination`, `rotational_power`, `low_impact`. Resolver honors season legality, schedule legality, available time, equipment, facilities.
- **Recovery:** `cns_recovery`, `tissue_recovery`, `mobility`, `regeneration`, `deload`, `post_game`, `travel`, `sleep_optimization`. Fully deterministic from TrainingContext + readiness.
- **Arm Care:** `throwing_day`, `non_throwing_day`, `bullpen`, `starter`, `reliever`, `position_player`, `two_way`, `recovery`, `return_to_throwing`. Consumes throwing schedule, training age, position, workload, readiness, injury context.

Substitution ladders on all four engines use the same five rungs: equipment / environment / injury / time / coach-override.

## 3. Generator integration

`supabase/functions/wk-generate-daily/index.ts`:
1. Import the four `certify*` functions.
2. After the existing Lift → Speed → BatSpeed certification block, run them in fixed order: Conditioning → Cross-Sport → Recovery → Arm Care.
3. Each certifier receives the same constitutional inputs already resolved for the request (TrainingContext, AthleteContext, PersonalizationContext, TrainingAgeContext, availableEquipment, environment, isGameDay/isPracticeDay/isRecoveryDay, throwing schedule).
4. Stamp `why_payload.<engine>_governance` and `why_v2.{why_category, why_template, why_athlete, why_season, why_recovery, why_readiness, why_substitution}` on matching rows by `slot`.
5. Promote each engine's `fatal[]` into the existing `validatorReport` (same all-or-nothing publication gate). Promote `warn[]` as warnings.
6. Add all Phase 10 diagnostics fields to both diagnostics-write sites (async catch site and RPC-payload site).

## 4. Validator fatal codes (added inline via certifier fatals)

- Conditioning: `cond_illegal_category`, `cond_duplicate_category`, `cond_unresolved_template`, `cond_unresolved_substitution`, `cond_governance_missing`
- Cross-Sport: `xs_illegal_transfer`, `xs_duplicate_category`, `xs_unresolved_template`, `xs_unresolved_substitution`, `xs_governance_missing`
- Recovery: `rec_conflicting_recovery`, `rec_illegal_recovery`, `rec_unresolved_template`, `rec_governance_missing`
- Arm Care: `ac_illegal_throwing_phase`, `ac_duplicate_category`, `ac_unresolved_template`, `ac_governance_missing`

## 5. Regression audit

`scripts/audits/performance-support-audit.ts` — Deno script exercising the matrix (12 season phases × training-age classes × equipment × indoor/outdoor × practice/game/tournament/travel/recovery × position/pitcher/two-way). Verifies deterministic generation, legal substitutions, governance completeness, validator clean, explainability populated, diagnostics populated. Fail-fast summary suitable for CI.

## 6. Documentation

`docs/wic/performance-support-v1.md` — templates, categories, validator codes, diagnostics, `why_v2` fields, dependency graph, before/after prescription examples.

## Guardrails

- No edits to Lift, Speed, Bat Speed shared modules.
- No edits to card registry, provider, snapshots, or any UI.
- No new tables; only additive columns on `wk_movement_catalog` and `wk_generation_diagnostics`.
- No changes to RLS beyond persisting new diagnostic columns via the existing RPC.
- Additive columns are nullable and backfilled — existing prescriptions remain valid.

## Acceptance gate

Complete when every performance-support engine is deterministic, consumes the same immutable constitutional contexts, is explainable, governance-stamped, substitution-complete, validator-clean, diagnostics-complete, and the regression audit passes across every supported seasonal context.

## Order of execution once approved

1. Run one `supabase--migration` (schema + RPC update).
2. Backfill governance metadata via `supabase--insert` UPDATEs (grouped by slot).
3. Write the 16 shared engine module files in parallel.
4. Wire `wk-generate-daily/index.ts`.
5. Write audit script + docs.
