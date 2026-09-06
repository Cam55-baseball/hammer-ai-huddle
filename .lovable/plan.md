# Close out Lifting Stage 1

Stage 1 code work is done (spec committed, name-collision fix, Safe Plan ladder, ordering gaps, safety flags + flag-driven guard, feature flag, data report). Four items are still open — three are evidence, one is a legacy data row.

## What's still missing

1. **Generation matrix** — 6 season phases x 5 training-age bands x 3 equipment levels x 3 ages x 4 day types (1,080 cells), confirming a card is produced in every cell.
2. **Dose diff** — one athlete, one date, generated before vs after Stage 1; the `sets`/`reps` diff must be empty (proof no dose moved).
3. **Phone-width screenshot** of the reduced/Safe Session card as an athlete actually sees it.
4. **One legacy violation** flagged by the new guard: a deep-flexion movement sitting in a speed slot on an in-season date (Aug 12). Pre-existing, not caused by Stage 1.

## How each gets closed

- Matrix and dose diff run as a headless harness against the generator with synthetic athlete contexts, writing a CSV of every cell plus a pass/fail summary. No writes to real athlete plans.
- Screenshot captured from the running preview at phone width with the reduced-session state forced on.
- The legacy row is reported, not silently deleted — you decide whether to purge it or leave it as history.

## Technical notes

- Harness lives under `scripts/audits/`, invoked with a service-role key; it calls the generator's session builder directly rather than the deployed function, so no prescriptions are persisted.
- The dose diff compares the pre-Stage-1 `wk_prescriptions` snapshot for the chosen athlete/date against a fresh dry-run generation, diffing only `movement_slug`, `sets`, `reps`, `duration_seconds`.
- The five audit scripts still cannot run here without a service-role key; the harness surfaces the same fatal/warn counts once the key is available.
- Nothing in `dosage/doctrine.ts`, `wk_persist_prescriptions_atomic`, slots, movement categories, or the constitution priority order is touched.

## Blocker

The matrix, dose diff and screenshot all need a service-role key or an authorized owner session in this environment. Without one, they cannot be produced — confirm you can supply access, or these stay open.
