# Goal Emphasis + Weekly Balance v1

Two additive authorities sit on top of the sealed WIC engine.

## Goal Emphasis Authority
`supabase/functions/_shared/wic/goals/emphasis.ts`

Turns the athlete's ranked goals (`athlete_body_goals` + the five onboarding
categories: speed, power, throwing, hitting, fielding) into bounded weights per
training domain. Rank 1 gets the largest bonus, decaying to near-zero by rank 5.
Weights are clamped to `[0.85, 1.6]`.

Emphasis may only bias **which already-legal movement** fills a discretionary
slot. It may never:

- author a set or rep — the Zero-Drift Dosage Doctrine remains the only dosing
  authority,
- relax safety, season legality, injury, training-age or scope gates,
- delete a template-required category.

Pure and deterministic — a replay reproduces the identical session.

## Weekly Balance Ledger
`supabase/functions/_shared/wic/balance/weeklyLedger.ts`

A rolling 7-day view of prescribed categories. Enforces the philosophy across
the week, not just the day:

- weekly floors per category (compound lower/push/pull, single leg, posterior
  chain, rotation, anti-rotation, carry, core),
- push:pull band (pull-biased for throwers),
- upper:lower band — an all-upper week is always a violation.

Shortfalls become a bounded steering bonus (max `0.45`) on tomorrow's
discretionary picks; already-used slugs take a `0.25` variety penalty.
Violations surface as validator **warnings** (`weekly_push_pull_imbalance`,
`weekly_upper_lower_imbalance`, `weekly_category_shortfall`) — never fatals, so
balance history can never block a plan from publishing.

## Selection
`wk-generate-daily` now uses `pickBest` for discretionary lift slots:

```text
score = goal emphasis + weekly shortfall bonus - variety penalty - pool-order tiebreak
```

Only movements that already passed every legality gate are scored, and
`pickFirst` remains the fallback so template completion is never at risk. Each
affected card's rationale gains one athlete-legible line ("Chosen because you
ranked power first and your week is short on posterior chain").

## Enforcement
`scripts/audits/goal-balance-audit.ts`, wired into `scripts/preflight.sh`,
asserts weight bounds, goal-ordering sensitivity, baseline survival,
determinism, clean weeks staying clean, imbalanced weeks being caught, and
steering staying bounded.
