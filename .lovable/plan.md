
## Phase 9 — Explosive Performance Engine

Speed and Bat Speed are upgraded in one phase because they share the Phase 8 constitutional architecture but resolve independently. No prescription crossover, no shared template, no shared exercise. Additive-only over sealed Phases 1–8.

## Architecture (mirrors Phase 8 Lift)

```text
wk-generate-daily/index.ts
  ├── _shared/wic/speed/sessionBuilder.ts     (certifySpeed)
  │     ├── _shared/wic/speed/templates.ts    (SPEED_TEMPLATES, resolveSpeedTemplate)
  │     ├── _shared/wic/speed/movementCategories.ts
  │     └── _shared/wic/speed/substitutions.ts
  └── _shared/wic/batSpeed/sessionBuilder.ts  (certifyBatSpeed)
        ├── _shared/wic/batSpeed/templates.ts
        ├── _shared/wic/batSpeed/movementCategories.ts
        └── _shared/wic/batSpeed/substitutions.ts
```

Each pipeline runs: AthleteCtx → TrainingCtx → PersonalizationCtx → TrainingAge → SessionObjective → Template → CategorySlots → ExerciseSelection → Validation → Publication.

## Speed Template Registry

`SPEED_TEMPLATES` (deterministic, resolved from `season_phase × day_type × primary_adaptation × isGameDay × isRecoveryDay`):

- `speed.acceleration` — 10–20yd starts, sled drives; CNS budget: high, PAP: heavy, top-speed emphasis: low
- `speed.top_speed` — fly-ins, wickets, max-velocity runs; CNS: high, PAP: moderate, top-speed emphasis: max
- `speed.mixed` — accel + top-speed contrast; CNS: high, PAP: moderate
- `speed.elastic` — bounds, pogo, reactive plyos; CNS: moderate, PAP: light
- `speed.game_day_primer` — 3–4 crisp reps, sub-95%; CNS: low
- `speed.practice_day` — technical, short volume; CNS: low-moderate
- `speed.recovery` — tempo runs, mobility flow; CNS: minimal, recovery budget: high
- `speed.return_to_run` — progression skeleton only (no exercise selection this phase)

Each declares: `slots`, `requiredCategories`, `cnsBudget`, `papBudget`, `accelerationEmphasis`, `topSpeedEmphasis`, `recoveryBudget`, `categoryOrdering`.

## Bat Speed Template Registry

`BAT_SPEED_TEMPLATES`:

- `bs.max` — max bat speed, competition implement
- `bs.elastic` — reactive rotational, band-assisted turns
- `bs.overload` — heavy-bat / heavy-ball rotations
- `bs.underload` — light-bat / underweight overspeed
- `bs.mixed_pap` — over/under contrast with PAP pairing
- `bs.game_day_primer` — 6–10 primer swings, sub-max
- `bs.recovery` — PVC/mobility rotational reset
- `bs.return_to_swing` — progression skeleton only

Each declares: `slots`, `requiredCategories`, `overloadBudget`, `underloadBudget`, `papBudget`, `rotationalDemand`, `recoveryBudget`.

## Movement Categories

Speed: `acceleration`, `top_speed`, `elastic`, `overspeed`, `resisted`, `reactive`, `deceleration`, `change_of_direction`, `plyometric`, `pap`, `mobility`.

Bat Speed: `overload`, `underload`, `elastic_rotation`, `rotational_strength`, `pap`, `med_ball`, `band`, `pvc`, `heavy_implement`, `light_implement`, `recovery_swing`.

Exclusive per session — no duplicate category inside one session.

## Governance Metadata (additive to `wk_movement_catalog`)

New columns (nullable, default NULL, backfilled by migration):

`speed_category`, `bat_speed_category`, `speed_adaptation`, `bat_speed_adaptation`, `game_day_legal`, `practice_day_legal`, `pap_classification`, `movement_velocity`, `transfer_group`. `season_legality` and `training_age_legality` already exist from Phase 8 and are reused.

Backfill covers only rows where `category IN ('speed','bat_speed')` plus any plyo/med-ball/rotational supplementals already in catalog. Lift rows untouched.

## Substitutions

`resolveSpeedSubstitutionLadder` / `resolveBatSpeedSubstitutionLadder` mirror Phase 8. Ladders per movement: `equipment_unavailable`, `environment_unavailable` (indoor/outdoor swap), `injury_restriction`, `time_restriction`, `coach_override`. Validators reject any unresolved ladder.

## Explainability

Stamped onto each Speed / Bat Speed prescription:

- `why_v2.why_template`, `why_category`, `why_athlete`, `why_season`, `why_pap`, `why_substitution_ladder`
- `why_payload.speed_governance` / `why_payload.bat_speed_governance`

No UI change — reuses existing `why_payload` reader.

## Validator (fatal additions)

Speed: `speed_duplicate_category`, `speed_illegal_season`, `speed_illegal_equipment`, `speed_illegal_training_age`, `speed_missing_acceleration`, `speed_missing_recovery_balance`, `speed_unresolved_template`, `speed_unresolved_substitution`.

Bat Speed: `bs_duplicate_category`, `bs_illegal_season`, `bs_illegal_equipment`, `bs_illegal_training_age`, `bs_missing_rotational_demand`, `bs_missing_pap_balance`, `bs_unresolved_template`, `bs_unresolved_substitution`.

Non-fatal: illegal equipment when a valid substitution resolves it → warn.

## Diagnostics (columns added to `wk_generation_diagnostics`)

Speed: `speed_template_id`, `speed_category_coverage`, `speed_pap_score`, `speed_substitution_completeness`, `speed_validation_status`.
Bat Speed: `bat_speed_template_id`, `bat_speed_category_coverage`, `bat_speed_pap_score`, `bat_speed_substitution_completeness`, `bat_speed_validation_status`.
Shared: `explosive_governance_version = "explosive_v1"`.

`wk_persist_prescriptions_atomic` RPC extended to persist these fields.

## Generator Integration (`wk-generate-daily/index.ts`)

After existing speed / bat-speed selection blocks (~lines 614–650), certify:

```typescript
const speedCert = certifySpeed({ prescriptions, catalog, template, availableEquipment, environment, trainingAgeClass });
const batCert   = certifyBatSpeed({ prescriptions, catalog, template, availableEquipment, trainingAgeClass });
```

Fatal issues merge into existing `validatorReport` and block publication under the current all-or-nothing gate. Both diag payloads (lines 939, 1017) receive the new fields.

## Regression Harness

`scripts/audits/explosive-governance-audit.ts`:

Matrix dimensions: Season (12 phases) × TrainingAge (5 classes) × Equipment (indoor, outdoor, gym-only, field-only, none) × DayType (practice, game, tournament, off, recovery) × Injury flag × Goal priority (speed-first vs power-first vs hitting-first).

Verifies per generated day:
1. Deterministic re-run yields identical prescriptions
2. No duplicate exercise slugs within session
3. No duplicate categories within session
4. Template resolved (not null)
5. Substitution ladders 100% resolved
6. All `why_v2` fields present
7. Governance version stamped
8. Fatal validator count = 0 for legal contexts

Emits `docs/audits/explosive-governance-matrix.csv`. Exits non-zero on any failure.

## Deliverables Checklist

- Speed + Bat Speed engine architecture (modules above)
- Template registries (SPEED_TEMPLATES, BAT_SPEED_TEMPLATES)
- Governance metadata columns + backfill migration
- Validator fatal codes wired into `_shared/wic/validator.ts` fatal list
- Diagnostics columns + RPC update
- Updated dependency graph in `docs/wic/explosive-engine-v1.md`
- Regression audit script + CSV
- Before/after examples captured in the docs page

## Explicit Deferred Work

Conditioning, Cross-Sport, Recovery, Arm Care remain untouched and are scheduled for their own future phases. Lift Engine, Card Architecture, UI, and existing exercise catalog rows outside speed/bat-speed metadata are frozen.

## Guardrails

Additive-only. No modification to `_shared/wic/lift/**`, `_shared/wic/engines/conditioning.ts`, `_shared/wic/engines/crossSport.ts`, recovery paths, `_shared/wic/cardRegistry.ts`, or any `Wk*Card.tsx`. Phase 8's `certifyLift` continues to run unchanged.
