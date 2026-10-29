# Scheduling certification — October 29, 2026

**What was run:** the real shared daily-plan builder (the same one that writes every player's saved day) for 3 programs × 2 sports × 4 levels (youth 11, high school 16, college 20, pro 26) × 8 weeks (weeks 1–4 off-season, 5–8 in-season) = 1,344 days, plus a low-readiness copy of every day. Test file: `src/lib/hammer/prescription/schedulingCertification.sim.test.ts` (24/24 pass).

## Certified (every program, sport and level)
- 6 training days and Sunday rest every week; Sunday has no skill work.
- No thin days: every Monday–Saturday has skill work.
- Weekly floors for 5Tool and Golden 2Way: hitting ≥3, defense ≥4, baserunning ≥1 every week.
- Order of the day: warm-up first, nothing skill-based after recovery.
- Low readiness (check-in under 0.4) removes all full-speed defense and baserunning work.
- A Mind item every day (study items before you start, calm items last).
- 5Tool never gets a pitching card.
- Rest days on the live builder (fixed earlier today): Sunday saves only gentle recovery (verified on the owner and a TEST player).

## Not certified by this run (honest limits)
- **Physical side** (lifting, Power Primer numbers, conditioning base routes and pitcher conditioning, arm ledger and throw rules): these run only in the server builder. This run did not build 8 weeks there for these 24 personas — that needs 24 marked TEST accounts and ~1,300 server builds. Their rules are covered by the existing server tests and the owner/TEST 7-day builds (conditioning 5–6 per week, gentle Sunday).
- **Bunting** cards, **routine/fix-it rotation over 8 weeks**, and **block/season card + strip matching** were not part of this simulation; the fix-it rotation and card match were proved on the TEST player for single days only.
- **Defense needs a glove:** players who never confirmed a glove get a "Confirm my equipment" card instead of defense. The glove choice was added to sign-up today; existing players must confirm it.

- **Off-season vs in-season:** weekly card counts are the same in both (your six-day, no-ramp rule). This run did not certify the differences inside the cards (lifting phase, doses).

## Needs your decision
- **Complete Pitcher players get hitting, defense and baserunning cards every training day** (they did not buy hitting). Pitching work arrives inside the throwing card. Should Complete Pitcher days drop the hitting card? I did not change this because it changes every pitcher customer's day.

## Baseball — Complete Pitcher — youth
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 5/5, defense 4/4, baserunning 3/3, throwing 4/4; hitting cards on pitcher plan 5/wk

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense · Mind: breathing
- Wed: hitting, throwing, baserunning · Mind: film_study
- Thu: hitting, defense · Mind: focus_routine
- Fri: hitting, throwing · Mind: journaling
- Sat: defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense · Mind: breathing
- Wed: hitting, throwing, baserunning · Mind: film_study
- Thu: hitting, defense · Mind: focus_routine
- Fri: hitting, throwing · Mind: journaling
- Sat: defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Baseball — Complete Pitcher — high school
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 6/6, defense 6/6, baserunning 6/6, throwing 5/5; hitting cards on pitcher plan 6/wk

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Baseball — Complete Pitcher — college
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 6/6, defense 6/6, baserunning 6/6, throwing 5/5; hitting cards on pitcher plan 6/wk

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Baseball — Complete Pitcher — pro
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 6/6, defense 6/6, baserunning 6/6, throwing 5/5; hitting cards on pitcher plan 6/wk

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Baseball — 5Tool Player — youth
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 5/5, defense 4/4, baserunning 3/3, throwing 5/5

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense · Mind: breathing
- Wed: hitting, throwing, baserunning · Mind: film_study
- Thu: hitting, throwing, defense · Mind: focus_routine
- Fri: hitting, throwing · Mind: journaling
- Sat: defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense · Mind: breathing
- Wed: hitting, throwing, baserunning · Mind: film_study
- Thu: hitting, throwing, defense · Mind: focus_routine
- Fri: hitting, throwing · Mind: journaling
- Sat: defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Baseball — 5Tool Player — high school
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 6/6, defense 6/6, baserunning 6/6, throwing 6/6

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Baseball — 5Tool Player — college
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 6/6, defense 6/6, baserunning 6/6, throwing 6/6

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Baseball — 5Tool Player — pro
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 6/6, defense 6/6, baserunning 6/6, throwing 6/6

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Baseball — Golden 2Way — youth
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 5/5, defense 4/4, baserunning 3/3, throwing 5/5

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense · Mind: breathing
- Wed: hitting, throwing, baserunning · Mind: film_study
- Thu: hitting, throwing, defense · Mind: focus_routine
- Fri: hitting, throwing · Mind: journaling
- Sat: defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense · Mind: breathing
- Wed: hitting, throwing, baserunning · Mind: film_study
- Thu: hitting, throwing, defense · Mind: focus_routine
- Fri: hitting, throwing · Mind: journaling
- Sat: defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Baseball — Golden 2Way — high school
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 6/6, defense 6/6, baserunning 6/6, throwing 6/6

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Baseball — Golden 2Way — college
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 6/6, defense 6/6, baserunning 6/6, throwing 6/6

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Baseball — Golden 2Way — pro
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 6/6, defense 6/6, baserunning 6/6, throwing 6/6

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Softball — Complete Pitcher — youth
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 5/5, defense 4/4, baserunning 3/3, throwing 4/4; hitting cards on pitcher plan 5/wk

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense · Mind: breathing
- Wed: hitting, throwing, baserunning · Mind: film_study
- Thu: hitting, defense · Mind: focus_routine
- Fri: hitting, throwing · Mind: journaling
- Sat: defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense · Mind: breathing
- Wed: hitting, throwing, baserunning · Mind: film_study
- Thu: hitting, defense · Mind: focus_routine
- Fri: hitting, throwing · Mind: journaling
- Sat: defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Softball — Complete Pitcher — high school
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 6/6, defense 6/6, baserunning 6/6, throwing 5/5; hitting cards on pitcher plan 6/wk

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Softball — Complete Pitcher — college
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 6/6, defense 6/6, baserunning 6/6, throwing 5/5; hitting cards on pitcher plan 6/wk

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Softball — Complete Pitcher — pro
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 6/6, defense 6/6, baserunning 6/6, throwing 5/5; hitting cards on pitcher plan 6/wk

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Softball — 5Tool Player — youth
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 5/5, defense 4/4, baserunning 3/3, throwing 5/5

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense · Mind: breathing
- Wed: hitting, throwing, baserunning · Mind: film_study
- Thu: hitting, throwing, defense · Mind: focus_routine
- Fri: hitting, throwing · Mind: journaling
- Sat: defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense · Mind: breathing
- Wed: hitting, throwing, baserunning · Mind: film_study
- Thu: hitting, throwing, defense · Mind: focus_routine
- Fri: hitting, throwing · Mind: journaling
- Sat: defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Softball — 5Tool Player — high school
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 6/6, defense 6/6, baserunning 6/6, throwing 6/6

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Softball — 5Tool Player — college
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 6/6, defense 6/6, baserunning 6/6, throwing 6/6

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Softball — 5Tool Player — pro
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 6/6, defense 6/6, baserunning 6/6, throwing 6/6

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Softball — Golden 2Way — youth
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 5/5, defense 4/4, baserunning 3/3, throwing 5/5

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense · Mind: breathing
- Wed: hitting, throwing, baserunning · Mind: film_study
- Thu: hitting, throwing, defense · Mind: focus_routine
- Fri: hitting, throwing · Mind: journaling
- Sat: defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense · Mind: breathing
- Wed: hitting, throwing, baserunning · Mind: film_study
- Thu: hitting, throwing, defense · Mind: focus_routine
- Fri: hitting, throwing · Mind: journaling
- Sat: defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Softball — Golden 2Way — high school
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 6/6, defense 6/6, baserunning 6/6, throwing 6/6

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Softball — Golden 2Way — college
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 6/6, defense 6/6, baserunning 6/6, throwing 6/6

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

## Softball — Golden 2Way — pro
Weekly counts (off-season wk1 / in-season wk5): trainingDays 6/6, hitting 6/6, defense 6/6, baserunning 6/6, throwing 6/6

Sample off-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing

Sample in-season week:
- Mon: hitting, throwing, defense, baserunning · Mind: situations
- Tue: hitting, throwing, defense, baserunning · Mind: breathing
- Wed: hitting, throwing, defense, baserunning · Mind: film_study
- Thu: hitting, throwing, defense, baserunning · Mind: focus_routine
- Fri: hitting, throwing, defense, baserunning · Mind: journaling
- Sat: hitting, throwing, defense, baserunning · Mind: situations
- Sun: Rest — gentle recovery · Mind: breathing
