# Goal-Weighted Elite Prescription — closing the last philosophy gaps

## Where we actually stand

Verified in the engine code, not assumed:

- **Full-body is already enforced per lift session.** Every lift template (`full_body_strength`, `power`, `force_production`, `elastic`, `in_season_maintenance`) requires compound lower + upper push + upper pull + core + rotation, and the certifier fails the plan with `lift_not_full_body` if any is missing. So "upper with no lower" cannot ship today.
- **Dosage is single-authority and drift-free.** `dosage/doctrine.ts` owns every set/rep number, scaled by quarter, dose group, training age, week-in-block wave, CNS clamp and safety cap.
- **Two real gaps exist.**
  1. **Athlete goals are collected but never consumed.** `athleteContext.ts` builds a `goals[]` list (body goals + the five ranked onboarding categories: speed, power, throwing, hitting, fielding) and the personalization stack lists a `goals` layer — but no engine reads it. Nothing in movement selection, emphasis or weekly frequency changes when an athlete ranks power first and fielding last.
  2. **Selection is first-eligible, not best-fit.** `pickFirst` walks a fixed slug pool and takes the first legal movement. There is no scoring, so the "best exercise for this athlete" is really "the first one in the list that isn't blocked" — and there is no weekly ledger, so upper/lower/posterior balance and movement variety are only checked inside a single day, never across the 6-day week.

## What we build

### 1. Goal Emphasis Authority (new)
A single deterministic module that turns the athlete's ranked goals into emphasis weights per training domain (lift, speed, bat speed, throwing, conditioning, defense). Ranked #1 gets the highest weight, unranked gets baseline. Weights are **bounded**: they can shift which movement is chosen and how often a domain appears in the week, but never override safety, season legality, injury, training-age or the dosage doctrine. Baseline coverage is guaranteed — a goal cannot delete a required category.

### 2. Best-fit selection instead of first-eligible
Replace `pickFirst` for the discretionary slots with a scored picker: goal emphasis + position demand + training-age fit + recent-exposure penalty (variety) + equipment fit. Deterministic tie-breaks so a replay reproduces the identical session. Required template categories still fill first; scoring only decides *which* legal movement fills them.

### 3. Weekly Balance Ledger
A rolling 7-day view of what the athlete has actually been prescribed, by category. It enforces the philosophy across the week, not just the day:
- push:pull ratio stays inside a healthy band (pull-biased for throwers),
- lower-body and posterior-chain exposure meets a weekly floor,
- single-leg, carry, rotation and anti-rotation each hit a weekly minimum,
- no compound repeats inside its non-repeat window.
Shortfalls steer the next day's discretionary slots; violations surface as validator warnings.

### 4. Emphasis-aware, still-bounded volume
Goal emphasis adjusts *frequency and slot allocation* (e.g. a power-first athlete sees the power template and jump/landing slots more often), never raw sets and reps. Set/rep numbers keep coming exclusively from the dosage doctrine.

### 5. Athlete-visible "why"
Each card's existing why payload gains one line tying the pick to the athlete's own ranked goals — e.g. "Chosen because you ranked power first and your week is short on posterior-chain work." No new UI surface, no clutter.

### 6. CI audit
Extend the preflight audits with a goal-and-balance audit that simulates a full 6-day week across goal orderings, positions, quarters and training ages, and asserts: every required category still covered, weekly push/pull and upper/lower bands respected, goal ordering measurably changes the plan, and no dose escapes the doctrine envelope.

## Technical notes

- New: `supabase/functions/_shared/wic/goals/emphasis.ts` (weights + rationale), `_shared/wic/balance/weeklyLedger.ts`, mirrored client types where the UI reads them.
- Modified: `wk-generate-daily/index.ts` (scored picker, ledger read/write, emphasis into template resolution), `_shared/wic/lift/sessionBuilder.ts` (balance warnings), `_shared/wic/validator.ts` (new warn codes), `_shared/wic/personalizationContext.ts` (goals layer flips from `stored` to `consumed`).
- New audit script wired into `scripts/preflight.sh`.
- Additive only: no dosage numbers move, no existing invariant relaxes, all new gates are additional constraints.
