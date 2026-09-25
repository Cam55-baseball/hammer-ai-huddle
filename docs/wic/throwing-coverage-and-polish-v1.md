> **Live status (E2E WP6, 2026-09-25 17:45 UTC):** Arm ledger LIVE: one shared ledger fed by one-tap throw entry on Hammer's Today and the pitching card; budget stop lines shown on both throwing panels. Staff View and demo also read it.

# Throwing Coverage & Polish v1

**Owner-directed amendment v1.4, 2026-09-24.** Applies before anything ships. Presented to MLB's youth development program, the 30 MLB club presidents and AUSL representatives.

## 1. Throwing is for everyone who throws
Position players throw the most total volume in the sport, and two-way athletes carry the heaviest arm load of anyone. Every rule below applies to baseball and softball.

### Baseball position player (5Tool)
- Arm load counts every throw: warm-up catch play, practice throws by drill, pre-game routine, in-game throws by position, and long toss.
- If throws are not logged, estimate from the practice type and position, and mark the number as an estimate.
- Ramp ladder: distance, then volume, then intent, then position work — infield quick release and short hops, outfield crow-hop and carry, catcher throw-downs and pop times.
- Catchers get their own budget: throw-downs are high-intent throws and count as such.

### Softball position player
- Same ladder with softball distances and the shorter base paths. Distances scale by age and by the athlete's level.
- Catcher throw-downs to second (84 feet) count as high-intent.

### Baseball pitcher
- Unchanged: Pitch Smart daily maximums and required rest, start anchors, bullpen spacing, the build rules in Ramp Law v1 §2.

### Softball windmill pitcher — new, and important
There is no universal pitch limit in softball, so the app sets one. Defaults, all owner-tunable:
- No more than 100 pitches in a game and 140 in a day.
- No more than three consecutive days of pitching, with two days of rest between outings whenever the calendar allows.
- Youth default: at most 12 innings in a day, and a mandatory rest day after a day of 7 or more innings.
- **Tournament mode:** softball pitchers commonly throw several games a day across a 2 to 3 day tournament, which can reach many hundreds of pitches. When the schedule shows a tournament, the app sets a weekend budget, warns as it is approached, and prescribes a recovery block afterwards sized to what was actually thrown.
- Never convert baseball pitch counts to windmill. The windmill stress profile is different: anterior shoulder, biceps and forearm carry more of it.
- Whole chain first: hips, pelvis and trunk drive the windmill, and weak hip and pelvic control shows up as shoulder and elbow problems. Capacity work for those areas runs year-round.

### Two-way athletes, both sports
- ONE arm ledger. Pitching and position throwing add into the same arm tank and the same daily and weekly budgets.
- Where pitcher rules and position rules disagree, the stricter one wins.
- No high-intent position throwing on a start day, the day before, or the day after a start.
- A pitcher who also catches is the highest arm load in the app: flag it, budget it tightly, and surface it to the athlete and staff in plain words.
- The two-way athlete's ramp follows the pitcher timeline, never the position-player timeline.

## 2. Rules must be consistent across sport and prescription
- Every throwing athlete has: a season state, a phase, a ramp state, a daily arm budget, a weekly arm budget and a recovery rule.
- No prescription type may be missing any of them. Add a test that samples one athlete of each type — baseball position player, baseball pitcher, baseball two-way, catcher, softball position player, softball windmill pitcher, softball two-way — and proves all six values exist and are consistent with each other.

## 3. Presentation-grade polish
The owner is presenting this. Every screen must hold up in front of professional staff.
- **No clutter:** one decision per screen, no internal labels, no block numbers, no debug text, no empty headings, no placeholder copy anywhere.
- **Consistent card anatomy** everywhere: title, dose, cue, why, actions, in that order.
- **Phone first:** no horizontal overflow at 390px, tap targets at least 44px, readable contrast.
- **Every state designed:** loading, empty, error, offline. Errors speak plainly and never show codes.
- **Fast:** cards open instantly from what is already built; nothing waits on a calculation.
- **Demo mode for the presentation:** a ready set of demo athletes that shows the system across the room — a 13-year-old, a 16-year-old high schooler, a college player, an MLB professional on a 162-game schedule, an AUSL softball pitcher, a softball position player, a two-way athlete, and a catcher. Each demo athlete shows: today's plan, the phase strip, the why, a ramp in progress, and a schedule change re-planning the week live.

## 4. Acceptance before this ships
- Full test suite and a simulated-season sweep green.
- Zero critical watchdog notes across a forced generation for every athlete and every demo athlete.
- Card matrix 1,296 of 1,296, zero empty.
- Zero card build errors; generation speed at baseline.
- Every screen checked at phone width: no overflow, no placeholder, no empty section.
- With the switches off, behaviour is identical to today.
- Screenshots: the phase strip, a throwing ramp day, a softball tournament day with the budget shown, a two-way athlete's day, and the demo picker.

---
## Implementation notes (not part of the owner text)
- Engine: `supabase/functions/_shared/wic/phases/armLedger.ts` (`ARM_LEDGER_VERSION`). Pure; labels and budgets only, never a dose.
- Numbers the owner did NOT give and the app had to choose (owner-tunable in `ARM_DEFAULTS`, flagged for review): position-player and catcher daily/weekly budgets, throw-estimate tables, intent weights, softball tournament weekend budget, recovery block sizing.
