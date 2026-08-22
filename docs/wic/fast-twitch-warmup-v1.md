# Fast-Twitch Warm-Up Primer v1

Baseball and softball are burst sports. The warm-up wakes that system before
anything else touches it — single-leg dominant, ground-force biased, ladder
quick feet — without spending the athlete.

## Roles

| Role | Intent | Source lineage |
| --- | --- | --- |
| `ladder_quickness` | Foot speed, rhythm, reflex turnover | Marv Marinovich footwork, Zone28 / Pow3R Plus |
| `single_leg_twitch` | The majority of twitch work — stiffness + ground force one leg at a time | Verkhoshansky, Bosch, Marinovich, Pow3R Plus |
| `ground_force` | Short maximal contacts — starts, wall drives, repeat bursts | ALTIS, Zone28 repeat-effort |
| `fast_twitch` | Legacy bilateral primer layer (pogos, snap jumps, med ball) | Verkhoshansky, Dietz, Cressey |

Every twitch drill carries a full setup paragraph and a full execution cue —
distance, count, posture, what a good rep looks like, and what ends the set.

## Single-leg majority law

At least **60%** (`SINGLE_LEG_MIN_SHARE`) of the twitch layer must be
single-leg. `buildWarmup` counts the twitch picks and deterministically swaps
bilateral picks from the back of the list for single-leg replacements until the
share holds. `BuiltWarmup.singleLegShare` reports the realized share.

## Placement

```text
speed_day     ladder + 2x single-leg twitch + ground force + fast twitch
lift_day      ladder + single-leg twitch + fast twitch
hitting_day   ladder + single-leg twitch + fast twitch
practice      ladder + single-leg twitch
in_season     ladder + single-leg twitch
throwing_day  ladder only — legs stay fresh for the arm
offseason     2x ladder + 2x single-leg twitch + ground force + fast twitch
game_day      game-day-legal quick feet only, no ground force
recovery / travel / low readiness   no twitch layer (suppressTwitch)
```

## Equipment law

- A drill declares what it needs — inline `equipment`, or via
  `EQUIPMENT_OVERRIDES` for pre-existing rows.
- The athlete's effective equipment (session > temporary > persistent >
  inferred, from `athlete_equipment_context`) is projected as
  `equipmentList` + `equipmentVenue` and expanded through `expandEquipment`
  (venue tokens imply a kit; synonyms are normalized).
- Baseline always available: floor, wall, open space, towel.
- Gear the athlete lacks → the drill's `fallbackSlug` equipment-free sibling
  ships instead (ladder → chalk/tape line pattern, box drop → curb drop,
  med ball → dry-swing burst). No sibling and no gear → the role is skipped,
  never half-shipped.
- Each drill renders a `You need: …` line on the card.

## Vetoes

Injury regions (`regions` on the drill vs. reported injury regions), game-day
legality, lifecycle gates (`minLifecycle`), and `suppressTwitch` on
low-readiness / travel days. Selection stays deterministic — same day seed,
same drills.

## Tests

`src/lib/hammer/prescription/__tests__/warmupTwitch.test.ts` — catalog
completeness, fallback reachability, equipment honesty across every context ×
lifecycle, ladder-without-a-ladder, single-leg majority, game-day legality,
twitch suppression, injury vetoes, determinism, no repeats.
