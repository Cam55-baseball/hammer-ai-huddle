# Zero-Drift Dosage Doctrine v1

Every set and rep number in Hammers Today comes from exactly one module:
`supabase/functions/_shared/wic/dosage/doctrine.ts`. Nothing else is allowed to
produce a dose.

## What it replaced

Before v1, four authorities competed and drifted against each other:

1. `wk_periodization_blocks` — read by exactly one movement (the compound).
2. Hardcoded literals scattered through `wk-generate-daily` (`{ sets: 1, reps: 10 }`).
3. `wk_movement_catalog.default_sets / default_reps` — placeholder-polluted
   (nine philosophy categories were flat 2x8; one arm-care row said 999 reps).
4. `LIFT_TEMPLATES` compound envelopes — dead code, imported nowhere.

That is why users saw advanced athletes on beginner volume in one card and
inflated volume in the next. The quarters were labels, not doses.

## The resolution order

`resolveDose()` is pure and deterministic — identical inputs always produce an
identical dose, so a replay reproduces the exact numbers.

```text
canonical envelope (quarter x dose group)
  -> training-age position inside the envelope (beginner 0% ... elite 100%)
  -> week-in-block wave (wk1 -15%, wk2 0%, wk3 +15%, wk4 deload = floor)
  -> CNS / readiness clamp (one set off, never below the envelope floor)
  -> hard safety cap (season / injury doctrine, applied last, can only reduce)
  -> minimum effective dose (never below 1x1)
```

## The matrix

Six phases (`os_q1`, `os_q2`, `os_q3`, `os_q4`, `in_season`, `post_season`) x
seven dose groups (`main_compound`, `unilateral`, `upper`, `trunk`, `carry`,
`arm_care`, `accessory`). Volume falls and intensity rises across
Q1 -> Q4, then in-season holds a maintenance dose and post-season decompresses.
No two phases share a main-compound envelope — the CI audit fails if they ever do.

## Unit awareness

Only `reps`-dosed movements go through the matrix. Movements measured in
seconds, feet, innings, runs, or "each" keep their total dose and are never
subjected to set/rep math.

## Enforcement

- **Validator** (`_shared/wic/validator.ts`): a lift row outside its envelope
  ceiling is a `dose_outside_envelope` **fatal** — the plan does not publish.
- **CI audit** (`scripts/audits/dosage-doctrine-audit.ts`, wired into
  `scripts/preflight.sh`) simulates the full grid of phase x group x
  training-age x week x CNS state and asserts:
  1. every quarter is distinguishable,
  2. every resolvable dose sits inside its envelope,
  3. no dose falls below the minimum effective dose,
  4. week 4 is genuinely lighter than week 3,
  5. training age actually changes the dose,
  6. no hardcoded set/rep literal survives in the generator or the engines.

## Safety caps

Engines no longer prescribe volume. The only surviving engine-side number is
`IN_SEASON_DEEP_FLEXION_CAP` (2x5) in `engines/strength.ts`, passed to the
doctrine as `capSets` / `capReps`. A cap can pull a dose down. It can never
push one up.
