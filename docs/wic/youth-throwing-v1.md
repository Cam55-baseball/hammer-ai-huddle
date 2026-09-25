> **Live status (E2E WP6, 2026-09-25 17:45 UTC):** LIVE on the pitching card (baseball): youth caps, growth-adjusted age from height checks, fatigue stop, pitcher-catcher line (youthPitchingToday.ts). Shows only for youth athletes with an age on file. offseasonBreakDays still used via rampLaw.ts.

# Youth throwing v1 — Steps 26 and 27 (owner-directed)
Code: `supabase/functions/_shared/wic/phases/youthThrowing.ts`. Baseball only; softball windmill limits stay in `armLedger.ts`.

## Kept from Step 26
- **Weekly / season / annual pitch caps** (owner-tunable): 11–12 → 100 / 1,000 / 2,000–3,000 (warns from 2,000); 13–14 → 125 / 1,000 / 3,000. Warn at 80%; a full cap blocks further pitching.
- **Innings cap:** 100 competitive innings a calendar year, high school and younger.
- **Pitched while fatigued:** check-in "arm tired", a velocity drop of 5%+ or a command drop of 15+ points flags it; the flag stops the outing and feeds the governors.
- **Pitcher who also catches:** combined budget = stricter of the two × 0.70 (was 0.85). Athlete line (no statistics): "Pitching and catching together is one of the heaviest arm workloads in the game, so we budget it tightly." The research note (about 2.7× serious arm-injury rate, Fleisig et al. 2011, correlation not prediction) shows in the staff view only.
- **Overlapping teams:** all teams' pitches count against one set of limits, with a warning.
- **Growth-adjusted pitching age (Hammers rule, E3):** ≥1 in in ~30 days → 8 weeks one Pitch Smart band younger (daily max and rest), high-intent capped, volume held at maintain; each extra inch adds 8 weeks and can drop one more band; floor = youngest band. The 8-week figure is our rule, not published science.

## Step 27 replacements
- **Offseason break — Hammers ratio (E3):** 4 no-throw days per month of downtime. Under 18, 5–8 a month, chosen from the athlete's signals (age/maturity, growth, pain in 90 days, last season's load, arm tank, prior break/ramp tolerance). Unknowns never lower it. Weekly non-throw days unchanged. The ramp is mandatory and never compressed (Ramp Law v1 §2); if break plus ramp won't fit, the break shortens.
- **Pitch progression by readiness, not age:** command at intent, clean mechanics markers, capacity markers, no pain in 30 days, inside budget, not in a growth window. New pitch share builds 10 → 15 → 20 → 25% of an outing; any pain or fatigue flag steps back one.
- **Velocity work at every age, readiness-gated:** full ramp complete, capacity markers, no pain flag, inside daily and weekly budgets, no growth window. Mechanics work always runs alongside it.

## Removed by owner order (Step 27 A) — do not re-add
1. The fixed annual rest rule (2–3 / 4 months off, longer-of-the-two).
2. The pitch-type age-unlock table.
3. The under-14 block on velocity targets and leaderboards.
