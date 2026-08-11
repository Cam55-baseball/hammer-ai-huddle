# Closing the Last Gaps in Universal Progression

The progression spine is live and stamping every prescription, but three verified gaps stop it from being truly E2E. Each one below was confirmed by reading the code, not assumed.

## Gap 1 — Personal-best targets can never fire (highest priority)

The progression engine looks for top-level metric keys in each session log: `bat_speed_mph`, `exit_velo_mph`, `sprint_time_s`, `throw_velo_mph` (`progressionState.ts:232-259`).

The logging path never writes them. `useSaveExerciseLog` stores `metrics: { rounds, template_id, field_schema }` (`useExerciseLog.ts:105-109`), and the round fields are named `bat_speed`, `peak_velo`, `time` — nested one level down inside `rounds`.

Result: the only bests that ever populate are `load_lb` and `sprint_distance_ft`, which come from real columns. Bat speed, sprint time and throwing velo — the three headline numbers — are silently dead, so "beat your best" targets never appear on the cards that matter most.

Fix:
- Add a shared metric-normalizer that derives canonical top-level metrics from the logged rounds at save time (best round, direction-aware: fastest sprint, highest velo/bat speed), and writes them alongside `rounds` in `metrics`.
- Make the reader tolerant too: `metricsFromLog` also scans `metrics.rounds[]` so historical logs already in the database start producing bests immediately, with no backfill required.
- Map every log template field to its canonical key once (`time` → `sprint_time_s` only for sprint/agility templates, `peak_velo` → `throw_velo_mph`, `bat_speed` → `bat_speed_mph`, `exit_velo` → `exit_velo_mph`, `height` → `jump_height_in`), so a new template can't quietly drop a metric.

## Gap 2 — Half the daily plan is on the other track

Cards sourced from `wk_prescriptions` (speed, bat speed, lifts, conditioning, cross-sport, pitching) carry domain, block wave, career horizon and day orchestration. Warm-up, recovery, mobility, defense, nutrition and mental still render through the legacy `BlockCard` path from `dailyPlan.ts`, which never sees the progression state — so those cards show no lineage, no cadence, no career line.

Fix:
- Expose the day's progression state to the client through the existing snapshot, and have `BlockCard` render the same `WkProgressionNote` / `WkSessionShapeLine` for its domain (`domainForSlotRole` already resolves warmup, recovery, mobility, arm care).
- Give each block domain a cadence line derived from real history ("Mobility ran 5x in the last 4 weeks") instead of leaving the card silent.
- No block-generation logic changes — this is lineage display parity, so the day reads as one program.

## Gap 3 — Test days are incidental, not scheduled

Bests only update when an athlete happens to log a number. Nothing schedules a re-test, so a block can complete with no measurement and the next block has nothing to progress from.

Fix:
- Deload week (week 4) marks one re-test movement per measurable domain — speed, bat speed, lift, throwing — flagged in `why_payload` as `test_day: true` with the metric to capture.
- The card shows a clear "Test day — log this number" state, and the log sheet opens pre-focused on the metric field.
- When a block ends with no logged test for a domain, the next block's card says so plainly ("no measured number since <date>") instead of showing a fabricated target.

## Also tightened

- Deload currently only drops a working set. Extend it to reduce total sprint distance and throwing volume on the same rule, so the deload is real in every domain rather than strength-only.
- Validator: promote `progression_lineage_missing` from a warning to a publish block once Gaps 1 and 2 land, and add a `test_cadence_stale` warning.
- Extend the universal progression audit to assert bests actually populate from simulated logs, that deload weeks reduce measured volume in every domain, and that re-tests land once per block per domain.

## Technical notes

- Files: `src/hooks/useExerciseLog.ts`, a new `src/lib/hammer/logging/metricNormalizer.ts` mirrored into `supabase/functions/_shared/wic/progression/`, `progressionState.ts`, `wk-generate-daily/index.ts` (test-day flagging + deload extension), `validator.ts`, `HammerDailyPlan.tsx` (`BlockCard`), `WkProgressionNote.tsx`, `ExerciseLogSheet.tsx`, `scripts/audits/universal-progression-audit.ts`.
- No schema change: canonical metrics live in the existing `wk_session_logs.metrics` jsonb.
- Determinism preserved — normalization and test scheduling are pure functions of logged history and the block wave; no AI call is added.
