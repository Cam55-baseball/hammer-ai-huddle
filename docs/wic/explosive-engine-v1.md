# Explosive Performance Engine v1 (Phase 9)

Canonical Speed + Bat Speed intelligence for Hammers Today. Both engines share
architecture but never share prescriptions.

## Pipeline (per engine)

```
Athlete Context → Training Context → Personalization Context → Training Age
  → Session Objective → Template → Movement Categories → Exercise Selection
  → Validation → Publication
```

## Templates

### Speed
- `sp.acceleration` — Acceleration
- `sp.top_speed` — Top Speed
- `sp.mixed` — Mixed Speed
- `sp.elastic` — Elastic Speed
- `sp.game_day_primer` — Game-Day Primer
- `sp.practice_day` — Practice-Day Speed
- `sp.recovery` — Recovery Speed
- `sp.return_to_run` — Return-to-Run (structure only)

### Bat Speed
- `bs.max` — Maximum Bat Speed
- `bs.elastic` — Elastic Bat Speed
- `bs.overload` — Overload Rotational
- `bs.underload` — Underload Overspeed
- `bs.mixed_pap` — Mixed PAP
- `bs.game_day_primer` — Game-Day Swing Primer
- `bs.recovery` — Rotational Recovery
- `bs.return_to_swing` — Return-to-Swing (structure only)

## Governance metadata (added to `wk_movement_catalog`)

Additive to Phase 8 Lift governance:

- `speed_category` / `bat_speed_category`
- `speed_adaptation` / `bat_speed_adaptation`
- `pap_classification` (`heavy` / `moderate` / `light`)
- `movement_velocity` (`max` / `submax` / `elastic` / `technique`)
- `game_day_legal`, `practice_day_legal`
- `season_legality` (per-phase boolean map)
- `training_age_legality` (per-class boolean map)
- `transfer_group`, `substitution_family`

## Substitution ladders

Every prescribed movement exposes five rungs:

1. `equipment_unavailable`
2. `environment_unavailable` (indoor/outdoor, cage/tee/field)
3. `injury_restriction`
4. `time_restriction`
5. `coach_override`

Validator rejects unresolved substitutions when a family has ≥1 alternate but
fewer than two rungs are populated.

## Validator fatal codes (Phase 9)

Speed:
- `sp_duplicate_category`
- `sp_illegal_season`
- `sp_illegal_equipment`
- `sp_illegal_training_age`
- `sp_missing_acceleration`
- `sp_missing_recovery_balance`
- `sp_unresolved_template`
- `sp_unresolved_substitution`
- `sp_governance_missing`

Bat Speed:
- `bs_duplicate_category`
- `bs_illegal_season`
- `bs_illegal_equipment`
- `bs_illegal_training_age`
- `bs_missing_rotational_demand`
- `bs_missing_pap_balance`
- `bs_unresolved_template`
- `bs_unresolved_substitution`
- `bs_governance_missing`

## Diagnostics

Persisted onto `wk_generation_diagnostics`:

- Speed: `speed_template_id`, `speed_category_coverage`, `speed_pap_score`,
  `speed_substitution_completeness`, `speed_validation_status`
- Bat Speed: `bat_speed_template_id`, `bat_speed_category_coverage`,
  `bat_speed_pap_score`, `bat_speed_substitution_completeness`,
  `bat_speed_validation_status`
- `explosive_governance_version` (`explosive_v1`)

## Explainability (per movement `why_v2`)

- `why_template`
- `why_category`
- `why_athlete`
- `why_season`
- `why_pap`
- `why_substitution_ladder`

## Deferred (out of Phase 9 scope)

- Conditioning Engine
- Cross-Sport Engine
- Recovery Engine
- Arm Care Engine
