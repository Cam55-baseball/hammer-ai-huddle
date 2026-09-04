# Unknown is not "none" — missing-answer audit (Hammers Today generation)

Trigger: `Template bs.game_day_primer requires categories: elastic_rotation.`

## What actually caused this failure

The reported cause (an empty `athlete_equipment_context` starving the pool) is
**not** what happened in the generator. Verified in code:

- `wk-generate-daily` never filtered candidates on `equipment_requirements`.
  Equipment appears only in the certifiers as a **warn** (`bs_illegal_equipment`
  warn branch, guarded by `availableEquipment.length > 0`) and in substitution
  ladders. It could not empty `elastic_rotation`.
- The two game-day-legal `elastic_rotation` movements were removed by two other
  gates:
  1. **Fabricated chronological age.** `eligibleWith` compared
     `min_age_years` against `training age + 6`. A beginner with 1 training year
     was treated as 7 years old, so `bs_plyo_ball_wall_rebounds` (min age 8) and
     `bs_mb_rebounder_rapid_fire` (min age 12) were both excluded.
  2. **Day-adaptation compatibility.** On a game day the day adaptation is
     `game_readiness`, whose allow-list is
     `speed_development, bat_speed_development, movement_literacy,
     in_season_maintenance, conditioning_repeat_explosive`.
     `elastic_rotation` canonicalizes to `power_transfer`, which is not on it.
- With the category empty, the selector warned
  (`bat_speed_missing_required:elastic_rotation`) and the block published thin —
  correct — but the certifier still raised the **fatal** `bs_unresolved_template`,
  which killed the whole plan. That is the bug in "a template that cannot be
  filled must degrade, not fail".

## Item 4 — is there an equipment-free, game-day-appropriate rotational option?

**The catalog has equipment-free rotational movements, but none of them is
currently game-day-legal.** Nothing was retagged.

| slug | name | needs | `game_day_legal` |
|---|---|---|---|
| `bs_half_turn_iso` | Half-Turn Iso Hold | bodyweight | false |
| `bs_deep_hip_load` | Deep-Hip Load Rotational Drill | floor | false |
| `bs_rear_hip_shift_drill` | Rear-Hip Shift Load Drill | floor | false |
| `bs_stride_drive_wall` | Stride-Drive Wall Drill | wall | false |

All four are low-intensity positional/isometric work — exactly the shape a
game-day primer wants — and all four were caught in the conservative merge
reversal that set 63 movements to `game_day_legal = false`. **Owner decision
required:** if these four should be legal before a game, set
`game_day_legal = true` on those four slugs and the generator honours it
immediately. No movement was invented or retagged here.

## Item 5 — every "absent means excluded" filter found

| Filter | Old behaviour when the answer is missing | Now |
|---|---|---|
| `min_age_years` (`wk-generate-daily`) | Compared against a fabricated `training age + 6` proxy | Applies only when chronological age is actually known |
| `min_training_age_years` | Unknown training age defaulted to `0`, excluding every movement with any minimum | Applies only when the athlete has a training-age answer |
| `position_scope` (`domainGate.checkAthleteScope`) | An athlete with no declared position lost every position-scoped movement | Unknown position passes the gate (relevance is a preference, not safety) |
| Equipment (certifiers, substitution ladders) | Empty list read as "owns nothing" in some call sites | Unknown is passed as `undefined`; `[]` is reserved for a declared "bodyweight only" |
| Training-age **class** legality | Already failed open on unknown | Unchanged |
| Season legality | Phase is always resolved; no missing-data path | Unchanged |
| Sport scope | Fails open when sport is unknown | Unchanged |

Safety gates that intentionally stay strict: injury contraindications,
categorical `training_age_legality = false`, `game_day_legal = false`,
`season_legality = false`, `wic_metadata_complete = false`.

## Unknown-equipment behaviour

- Generation records the answer as **unknown**, keeps the whole catalog
  eligible, and sorts gear-free / universal-gear movements to the front so a
  runnable plan is preferred without assuming anything.
- The plan carries a plain note: "We don't know what equipment you have yet…".
- Onboarding now asks (new **Equipment** step), and the failure card's button
  deep-links to `/onboarding/athlete?edit=equipment`. Nothing blocks the plan.

## Degradation instead of failure

`certifyBatSpeed` / `certifySpeed` now accept `unfillableRequiredCategories`.
A required category the selector *proved* it could not legally fill becomes a
**warn** (`bs_template_gap` / `speed_template_gap`) and the block publishes what
is legal. A missing category that still had a legal candidate remains **fatal** —
that would be a generator bug, not an athlete constraint.
