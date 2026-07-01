## Phase 8 — Elite Lift Intelligence & Exercise Governance

Scope-locked to the **Lift engine only**. Speed, Bat Speed, Conditioning, Cross-Sport, Recovery engines, all cards, and all UI are frozen and will not be touched. This is additive on top of Phases 1–7 (Training / Athlete / Personalization / Training Age contexts).

### 1. Exercise Governance Registry (`wk_movement_catalog` extension)

Add constitutional metadata columns via a single migration (nullable, backfilled, then validator-enforced):

- `movement_category` (enum-like text): `compound_lower | compound_upper_push | compound_upper_pull | single_leg | rotation | anti_rotation | carry | core | arm_care | mobility | jump_landing | posterior_chain | hip | shoulder | foot_ankle`
- `primary_adaptation`, `secondary_adaptation`
- `season_legality jsonb` — `{ os_q1..q4, preseason, in_season, post_season, rtp: bool }`
- `training_age_legality jsonb` — `{ beginner, developing, intermediate, advanced, elite, pro }`
- `equipment_requirements text[]`
- `recovery_demand int` (1–5)
- `unilateral bool`, `rotational bool`
- `eccentric_profile`, `concentric_profile`, `elastic_profile` (`low|moderate|high`)
- `pap_compatible bool`
- `substitution_family text` (movements sharing a family are interchangeable)
- `aliases text[]`
- `governance_version text` (stamped `"gov_v1"` when normalized)

Normalization pass (data migration, not manual rewrite): derive each field from existing columns (`category`, `pattern`, `intensity_class`, `phase_allow`, `contraindications`, `regression_slug`, `source_philosophy`). Any row that cannot be normalized is flagged `governance_version = null` and surfaced in diagnostics as `missing_governance_fields`.

### 2. Canonical Lift Templates (`supabase/functions/_shared/wic/lift/templates.ts`)

Deterministic registry — every lift session resolves **exactly one** template ID before selection:

- `full_body_strength`
- `full_body_power`
- `full_body_force_production`
- `full_body_elastic_strength`
- `full_body_in_season_maintenance`
- `full_body_recovery`
- `full_body_return_to_play` (structure only, not activated)

Each template declares required movement-category slots, dose envelopes (sets/reps ranges), CNS budget share, and category-order. **No lower-body-only default.** Template resolution is a pure function of `(TrainingContext.phase, AthleteContext.schedule, PersonalizationContext.priority_stack, TrainingAgeContext.classification)`.

### 3. Session Builder Pipeline (`supabase/functions/_shared/wic/lift/sessionBuilder.ts`)

Replaces free-form lift construction inside `wk-generate-daily/index.ts`. Fixed non-skippable chain:

```text
AthleteCtx → TrainingCtx → PersonalizationCtx → TrainingAge
  → SessionObjective → Template → CategorySlots
  → ExerciseSelection → Validation → Publication
```

Selection rule per category slot: filter catalog by `movement_category` + `season_legality[phase]` + `training_age_legality[classification]` + `equipment_requirements ⊆ AthleteCtx.environment.equipment` + not-in `injury.modified_movements`, then rank by (goal alignment → recovery demand fit → PAP compatibility → 72h freshness → deterministic tiebreak by slug hash of `planDate`).

### 4. Movement Category Engine (`supabase/functions/_shared/wic/lift/movementCategories.ts`)

Exclusive category assignment + coverage checker. Utilities: `categoryOf(slug)`, `coverageOf(prescriptions)`, `missingCategories(template, prescriptions)`, `duplicateCategories(prescriptions)`.

### 5. Substitution Pathways (`supabase/functions/_shared/wic/lift/substitutions.ts`)

Every prescribed exercise resolves a **substitution ladder** (persisted into `why_payload.substitutions`):
- `equipment_unavailable` → next member of `substitution_family` whose equipment set fits
- `facility_unavailable` → indoor/outdoor alternate in family
- `injury_restriction` → existing `regression_slug` (already wired)
- `time_restriction` → shorter dose variant in family
- `coach_override` → any family member (already wired via `wk_movement_overrides`)

Fatal validator error if a prescribed movement has an empty ladder for a category with known alternates.

### 6. Validator Extensions (`supabase/functions/_shared/wic/validator.ts`)

Add fatal codes: `lift_not_full_body`, `lift_missing_compound_lower`, `lift_missing_upper_push`, `lift_missing_upper_pull`, `lift_missing_core`, `lift_missing_rotational_demand`, `lift_duplicate_category`, `lift_illegal_season`, `lift_illegal_training_age`, `lift_illegal_equipment`, `lift_unresolved_substitution`, `lift_template_unresolved`, `lift_governance_missing`. Existing `duplicate_slug` / `duplicate_name` remain fatal.

### 7. Diagnostics (`wk_generation_diagnostics`)

Add columns: `lift_template_id`, `lift_category_coverage jsonb`, `lift_full_body_ok bool`, `lift_duplicate_check_ok bool`, `lift_substitution_completeness numeric`, `exercise_governance_version text`. Update `wk_persist_prescriptions_atomic` RPC to accept and persist them.

### 8. Explainability

Extend existing `why_v2` (no UI change) with `why_category`, `why_template`, `why_substitution_ladder`. Copy sourced from existing rationale strings — no redesign.

### 9. Regression Evidence (`scripts/audits/lift-governance-audit.ts`)

Deterministic script proving, across a matrix of `(phase × training_age × equipment × injury × goal_stack)`:
- 0 duplicate slugs, 0 duplicate categories
- every session hits full-body coverage
- 100% of prescribed movements carry `governance_version = "gov_v1"`
- every prescription traces to Athlete/Training/Personalization/TrainingAge context IDs
- output CSV `docs/audits/lift-governance-matrix.csv` + PASS/FAIL summary

### 10. Guardrails

Touched files (Lift only):
- `supabase/functions/wk-generate-daily/index.ts` — lift section only (lines ~421 onward); game-day cross-sport primer, warm-up, speed, bat-speed, conditioning, recovery, arm-care-outside-lift blocks untouched
- `supabase/functions/_shared/wic/engines/strength.ts` — deprecated in favor of `lift/sessionBuilder.ts` (kept as thin re-export for backward compat)
- `supabase/functions/_shared/wic/validator.ts`
- New: `_shared/wic/lift/{templates,sessionBuilder,movementCategories,substitutions}.ts` + client mirror in `src/lib/wic/lift/`
- Migrations: catalog columns + diagnostics columns + RPC signature bump

Untouched: `WkSpeedCard`, `WkBatSpeedCard`, `WkConditioningCard`, `WkSportBlockCard`, `WkRecoveryCard`, `HammersTodayProvider`, `cardRegistry`, adaptation selector, all UI.

### Deliverables

Lift engine architecture, exercise governance registry, movement category engine, validator additions, diagnostics additions, updated dependency graph (`docs/wic/lift-engine-v1.md`), before/after generated-lift examples, regression evidence CSV, and an explicit deferred-work log for Speed / Bat Speed / Conditioning / Cross-Sport engines.

Phase 8 is complete only when every generated lift is deterministic, full-body, season-legal, training-age-legal, equipment-legal, duplicate-free, template-resolved, substitution-complete, governance-stamped, and fully traceable through Phases 1–7 contexts.