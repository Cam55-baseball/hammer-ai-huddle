# Performance Support Engine v1 (Phase 10)

Canonical Conditioning, Cross-Sport, Recovery, and Arm Care intelligence for
Hammers Today. Additive over Phases 1–9. Lift / Speed / Bat Speed and all UI
architecture are unchanged.

## Pipeline (per engine)

```
Athlete Context → Training Context → Personalization Context → Training Age
  → Session Objective → Template → Movement Categories → Exercise Selection
  → Validation → Publication
```

## Templates

### Conditioning
`cond.aerobic_base`, `cond.repeated_sprint`, `cond.baseball_game_day`,
`cond.pitcher_conditioning`, `cond.recovery_flush`, `cond.tournament_day`,
`cond.practice_day`, `cond.off_day`, `cond.return_to_conditioning`.

Each template carries: objective, CNS budget, metabolic budget, tissue budget,
interval profile, required categories.

### Cross-Sport
`xs.fascial_rotation`, `xs.footwork`, `xs.explosive_transfer`,
`xs.recovery_transfer`, `xs.balance_transfer`, `xs.visual_reaction`,
`xs.reflex`, `xs.coordination`, `xs.rotational_power`, `xs.low_impact`.
Resolver honors season legality, schedule legality, available time,
equipment, facilities.

### Recovery
`rec.cns`, `rec.tissue`, `rec.mobility`, `rec.regeneration`, `rec.deload`,
`rec.post_game`, `rec.travel`, `rec.sleep`. Deterministic from TrainingContext
+ readiness (`cnsFatigue`, `tissueFatigue`).

### Arm Care
`ac.throwing_day`, `ac.non_throwing_day`, `ac.bullpen`, `ac.starter`,
`ac.reliever`, `ac.position_player`, `ac.two_way`, `ac.recovery`,
`ac.return_to_throwing`. Consumes throwing schedule, training age, position,
workload, readiness, injury context.

## Governance metadata (`wk_movement_catalog`)

Additive columns (all nullable, backfilled per slot):

- `conditioning_category`, `cross_sport_category`, `recovery_category`, `arm_care_category`
- `energy_system` (`alactic` / `lactic` / `aerobic_base` / `aerobic_power` / `mixed`)
- `recovery_class` (`cns` / `tissue` / `mobility` / `regeneration` / `deload`)
- `throwing_phase` (`throwing_day` / `non_throwing_day` / `bullpen` / `long_toss` / `recovery` / `rtp`)
- `movement_transfer`, `sport_transfer`
- `travel_friendly`, `indoor_legal`, `outdoor_legal`

## Substitution ladders

Every prescribed movement exposes five rungs:

1. `equipment_unavailable`
2. `environment_unavailable`
3. `injury_restriction`
4. `time_restriction`
5. `coach_override`

## Validator fatal codes

- Conditioning: `cond_illegal_category`, `cond_duplicate_category`,
  `cond_unresolved_template`, `cond_unresolved_substitution`,
  `cond_governance_missing`
- Cross-Sport: `xs_illegal_transfer`, `xs_duplicate_category`,
  `xs_unresolved_template`, `xs_unresolved_substitution`, `xs_governance_missing`
- Recovery: `rec_conflicting_recovery`, `rec_illegal_recovery`,
  `rec_unresolved_template`, `rec_governance_missing`
- Arm Care: `ac_illegal_throwing_phase`, `ac_duplicate_category`,
  `ac_unresolved_template`, `ac_governance_missing`

## Diagnostics

Persisted onto `wk_generation_diagnostics` per engine: `<engine>_template_id`,
`<engine>_category_coverage`, `<engine>_validation_status`,
`<engine>_substitution_completeness`, `<engine>_governance_version`. Rollup:
`performance_support_governance_version = "performance_support_v1"`.

## Explainability (`why_v2` per movement)

- `why_template`
- `why_athlete`
- `why_season`
- `why_recovery`
- `why_readiness`
- `why_substitution`
- `why_category`

## Dependency graph

```
                       ┌─────────────────────┐
                       │  TrainingContext    │
                       │  AthleteContext     │
                       │  Personalization    │
                       │  TrainingAge        │
                       └──────────┬──────────┘
                                  │
   ┌─────────┬─────────┬──────────┼──────────┬──────────┬─────────┐
   ▼         ▼         ▼          ▼          ▼          ▼         ▼
 Lift      Speed    BatSpeed  Conditioning CrossSport Recovery ArmCare
 (P8)      (P9)      (P9)       (P10)        (P10)     (P10)    (P10)
   │         │         │          │           │          │        │
   └─────────┴─────────┴──────────┴───────────┴──────────┴────────┘
                          Shared Validator
                          Shared Diagnostics
                          Shared why_v2 surface
```
