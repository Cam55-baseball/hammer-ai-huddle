## Problem

`logTemplates.ts` picks a template from coarse `slot` + `dosage_unit` alone, so a tee-work bat-speed round shows exit-velo/bat-speed fields, a mobility drill shows "reps", and warmups/med-ball/sled/jump/bullpen work all fall through to generic LIFT or CONDITIONING. The log fields must match the actual movement 100%.

## Fix

Replace the current picker with a **movement-family resolver** that inspects `movement_slug` (regex) + `dosage_unit` + `sequence_role` + `slot`, mapping every prescription to one of ~15 purpose-built templates. Every template's fields correspond exactly to what that movement produces — nothing else.

### Template families (final set)

| Family | Trigger | Round fields | Meta chips |
|---|---|---|---|
| barbell_lift | slot=lift, unit=reps, slug matches squat/bench/dead/press/clean/snatch/row | weight (lb), reps | RPE, bar feel |
| accessory_lift | slot=lift/supplemental, unit=reps, not barbell | weight (lb), reps | RPE |
| unilateral_lift | slug contains split/lunge/single/pistol/bulgarian/rfe | side (L/R), weight, reps | RPE |
| isometric_hold | unit=seconds, slug has iso/hold/plank/carry | time (s), load (opt) | RPE |
| carry | slug has carry/farmer/suitcase | load (lb), distance (ft) or time (s) | RPE |
| jump_plyo | slot=speed or slug has jump/bound/hop/depth | reps, height (in, opt), contact quality 1–5 | intent |
| medball_throw | slug has med_ball/mb_ | reps, ball weight (lb), intent 1–5 | intent |
| sprint_timed | slot=speed, slug has sprint/dash/fly/accel | distance (ft), time (s) | RPE, surface |
| sled | slug has sled/prowler | load (lb), distance (ft), time (s, opt) | RPE, surface |
| agility | slug has shuffle/agility/change_of_direction/pro_agility | time (s), quality 1–5 | surface |
| long_toss | slug has long_toss/pulldown | throws, peak distance (ft), peak velo (mph, opt) | arm feel |
| bullpen_pitching | slug has bullpen/mound/pen | pitches, strikes, peak velo (opt) | arm feel |
| catch_play | slug has catch_play/warmup_throwing | throws, distance (ft) | arm feel |
| bat_speed_tee | slot=bat_speed, slug has tee/dry | contacts, bat speed (mph, opt) | intent |
| bat_speed_live | slot=bat_speed, slug has front_toss/live/machine | contacts, exit velo (mph, opt), bat speed (mph, opt) | intent |
| overload_bat | slug has overload/underload/heavy_bat | swings, implement weight (oz) | intent |
| conditioning_intervals | slot=conditioning, unit=seconds w/ sets>1 | work (s), rest (s, opt), avg HR (opt) | RPE |
| conditioning_steady | slot=conditioning, sets≤1 | duration (s or min), avg HR (opt) | RPE |
| mobility_frc | slug has frc/car/pails/rails/mobility | quality 1–5, notes only | none |
| breathwork | slug has breath/co2/o2 | rounds, hold time (s, opt) | none |
| warmup_activation | sequence_role has warmup/activation and none above match | quality 1–5 | none |

### Resolver algorithm

```text
resolveTemplate(rx):
  slug = rx.movement_slug.toLowerCase()
  1. Bat speed slot → tee vs live vs overload via slug regex
  2. Speed slot → sprint_timed | jump_plyo | sled | agility
  3. Throwing (unit=throws OR slug has toss/pen/throw) → long_toss | bullpen | catch_play
  4. Conditioning slot → intervals vs steady by sets
  5. Mobility/breath/warmup by slug + role
  6. Lift slot → unilateral > isometric > carry > barbell > accessory
  7. Fallback: quality-only mobility template (never show velo/distance)
```

### Persistence

Extend the `metrics` JSONB written by `useSaveExerciseLog` with `template_id` and a compact `field_schema` (key + unit + kind) so historical rounds stay renderable when templates evolve. Column derivation (`load_used`, `distance_feet_completed`, etc.) is left as-is — it already tolerates missing fields.

### Files touched

- `src/components/hammer/logging/logTemplates.ts` — new families + `resolveTemplate(rx)` replacing `pickTemplate`.
- `src/components/hammer/logging/ExerciseLogSheet.tsx` — call resolver, render side toggle when template requests it, render quality 1–5 chip control.
- `src/components/hammer/logging/RoundGrid.tsx` — support `kind: "quality"` (1–5 pill) and per-row `side` toggle; keep existing number/time inputs.
- `src/hooks/useExerciseLog.ts` — include `template_id` + `field_schema` in `metrics`.

### Non-goals

- No DB migration (metrics is JSONB already).
- No changes to card layouts, generator, or `loadPrescriber`.
- Meta chips (RPE, bar feel, arm feel) only appear when the template requests them — bat-speed/mobility/warmup will no longer show RPE.

## Verification

- Typecheck.
- Manually walk each card type in preview: warmup, mobility, barbell lift, unilateral accessory, jump, sprint, sled, long toss, bullpen, tee bat speed, live bat speed, conditioning interval, steady conditioning — confirm the sheet fields match the movement and no irrelevant velo/distance fields appear.
