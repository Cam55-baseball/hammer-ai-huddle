# Phase 8 — Elite Lift Intelligence & Exercise Governance

## Dependency Graph

```text
wk-generate-daily/index.ts
  └── _shared/wic/lift/sessionBuilder.ts   (certifyLift)
        ├── _shared/wic/lift/templates.ts        (LIFT_TEMPLATES, resolveLiftTemplate)
        ├── _shared/wic/lift/movementCategories.ts (coverageOf, missingCategories)
        └── _shared/wic/lift/substitutions.ts    (resolveSubstitutionLadder, ladderCompleteness)

Database
  wk_movement_catalog   — extended with movement_category, season_legality,
                          training_age_legality, equipment_requirements,
                          recovery_demand, unilateral, rotational,
                          eccentric/concentric/elastic_profile, pap_compatible,
                          substitution_family, aliases, governance_version.
  wk_generation_diagnostics — extended with lift_template_id,
                          lift_category_coverage, lift_full_body_ok,
                          lift_duplicate_check_ok, lift_substitution_completeness,
                          exercise_governance_version.
  wk_persist_prescriptions_atomic — RPC updated to persist new diagnostics.
```

## Session Builder Pipeline

```text
AthleteCtx → TrainingCtx → PersonalizationCtx → TrainingAge
  → SessionObjective → Template → CategorySlots
  → ExerciseSelection → Validation → Publication
```

The certifier runs **after** existing lift rows are built and:

1. Resolves exactly one `LIFT_TEMPLATES[id]` from `(season_phase, day_type, training_age, primary_adaptation, isGameDay, isRecoveryDay, isReturnToPlay)`.
2. Verifies every lift row's catalog entry carries `movement_category` and `governance_version = "gov_v1"`.
3. Verifies `season_legality[phase] !== false` and `training_age_legality[class] !== false`.
4. Computes category coverage; requires the template's `requiredCategories`.
5. Rejects duplicate compound categories (`compound_lower`, `compound_upper_push`, `compound_upper_pull` may appear at most once).
6. Resolves a substitution ladder per movement (`equipment_unavailable`, `facility_unavailable`, `injury_restriction`, `time_restriction`, `coach_override`).
7. Stamps each lift row's `why_v2` (`why_category`, `why_template`, `why_substitution_ladder`) and `why_payload.lift_governance`.
8. Stamps diagnostics: `lift_template_id`, `lift_category_coverage`, `lift_full_body_ok`, `lift_duplicate_check_ok`, `lift_substitution_completeness`, `exercise_governance_version`.

## Fatal Codes Added

`lift_governance_missing`, `lift_illegal_season`, `lift_illegal_training_age`, `lift_not_full_body`, `lift_missing_compound_lower`, `lift_missing_upper_push`, `lift_missing_upper_pull`, `lift_missing_core`, `lift_missing_rotational_demand`, `lift_duplicate_category`, `lift_unresolved_substitution`. Warn: `lift_illegal_equipment`.

## Before / After

**Before** — lift construction relied on `StrengthEngine` slug lists (`compoundSlugsFor`, `unilateralSlugs`, `upperPushSlugs`, …). Full-body was enforced via a validator role bucket only. No canonical template, no substitution ladder, no explicit season/training-age legality columns.

**After** — the same lift rows are still produced by the existing selector, but every published set must pass `certifyLift`. Rows carry a template ID, movement-category coverage report, complete substitution ladder, and governance version. Publication is all-or-nothing under the existing validator gate.

## Regression Evidence

`scripts/audits/lift-governance-audit.ts` — deterministic CSV audit of catalog governance coverage, published-prescription duplicate/full-body/context-traceability rates. Writes `docs/audits/lift-governance-matrix.csv`. Exits non-zero if catalog < 95% governance-stamped or if any published lift set fails duplicate or full-body checks.

## Deferred Work (Explicit)

The following engines are **not** touched by Phase 8 and remain scheduled for their own dedicated phases:

- Speed engine (`_shared/wic/engines/sprint.ts`)
- Bat Speed engine (`_shared/wic/engines/batSpeed.ts`)
- Conditioning engine (`_shared/wic/engines/conditioning.ts`)
- Cross-Sport engine (`_shared/wic/engines/crossSport.ts`)
- Recovery engine (embedded in `wk-generate-daily`)
- All Wk* cards, `HammersTodayProvider`, `cardRegistry`, adaptation selector, UI surfaces.

## Guardrails Enforced

Phase 8 is additive only. `_shared/wic/engines/strength.ts` remains in place; no card, no client hook, and no non-lift engine was modified.
