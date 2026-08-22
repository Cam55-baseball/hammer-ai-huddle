# Fast-Twitch Warm-Up Primer v1

Baseball and softball are games of short, maximal bursts. The warm-up should
already be waking that system — single-leg dominant, ground-force biased,
ladder-style quick feet — without spending the athlete before the real work.

## What gets added

**A new fast-twitch primer layer inside the existing warm-up engine** (not a new
card, not new storage). Three new drill roles seeded into the warm-up library:

- `ladder_quickness` — ladder-style footwork (Marinovich reflex/quick-feet
  canon, Zone28 / Pow3R Plus repeat-burst style). Chalk lines, tape, or shoes
  work when no ladder exists, so the drill never disappears for lack of gear.
- `single_leg_twitch` — the majority of the twitch work. Single-leg pogos,
  single-leg line hops, SL snap hops, split-stance switch bursts, SL altitude
  drops, SL bounds. This is where twitch and ground force actually transfer.
- `ground_force` — short maximal ground contacts: falling starts, wall-drive
  bursts, seated-to-sprint starts, resisted first-step, sled/band push starts.

Roughly 24 new drills, each written with a **full setup paragraph and a full
execution cue** in the same voice as the existing wicket and scarf entries —
distance, count, posture, what a good rep looks like, what ends the drill. No
athlete should have to guess what a rep is.

## The single-leg majority rule

Any day that gets twitch work gets **at least 60% single-leg** across its twitch
picks. The template resolver enforces this: if a bilateral pick would break the
ratio, it swaps to the single-leg pool. Deterministic — same day, same seed,
same drills.

## Equipment honesty

Today a warm-up drill can be prescribed for gear the athlete does not have.
That gets fixed system-wide for the warm-up:

- Each drill declares what it needs (`ladder`, `hurdles`, `box`, `bands`,
  `med_ball`, `wall`, `partner`, `open_space`, or nothing).
- The athlete's effective equipment (session > temporary > persistent >
  inferred, already resolved in `athlete_equipment_context`) is read into the
  plan projection as a list.
- A drill needing gear the athlete lacks is **replaced, never dropped**: every
  gear-dependent drill declares a no-equipment sibling (ladder → chalk/tape
  line pattern, box drop → curb/step drop, med ball → dry-swing burst).
- The warm-up card shows a short "You need: …" line so nobody starts a drill
  they can't run.

## Placement and safety

| Day | Twitch layer |
| --- | --- |
| Speed | Full — ladder + SL twitch + ground force |
| Lift | Ladder + SL twitch, short |
| Hitting / practice | Ladder + SL twitch, low contacts |
| Throwing | Ladder only (legs stay fresh for the arm) |
| Off-season | Full, extended |
| Game day | Only game-day-legal quick feet, no maximal ground force |
| Recovery / travel / low readiness | None |

Existing vetoes still rule: injury regions, youth lifecycle gates, game-day
legality, and low readiness all trim or remove the layer before it ships. The
twitch layer never adds CNS cost to the session budget beyond the warm-up's
existing share, and it never replaces the speed or lift card's own work.

## Technical notes

- `src/lib/hammer/prescription/warmupLibrary.ts` — new roles, ~24 drills with
  full descriptions, an `equipment` requirement array plus `fallbackSlug`, a
  `bilateral | single_leg` axis flag, and equipment/ratio filtering inside
  `pickForRole` / `buildWarmup`.
- `src/lib/hammer/prescription/dailyPlan.ts` — pass the effective equipment
  list and injury regions into `buildWarmup`; extend the warm-up block copy so
  the "why" names the twitch intent.
- `src/lib/hammer/context/decisionFilters.ts` — expose `equipmentList` on the
  projection alongside the existing canonical venue token.
- Warm-up UI (`HammerWarmupDialog` / warm-up block renderer) — render setup,
  cue, stop-rule and the equipment line for each drill.
- `src/lib/hammer/prescription/__tests__/` — new vitest suite: single-leg
  majority holds across every context and lifecycle, no drill ever ships
  requiring absent equipment, fallbacks resolve, output is deterministic, and
  game-day / recovery days never receive maximal ground-force work.
- `docs/wic/fast-twitch-warmup-v1.md` — doctrine, sources, placement table,
  equipment fallback contract.
