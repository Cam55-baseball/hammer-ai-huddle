# Roadmap

## In progress
- [ ] Today-plan input integrity: equipment saves now force the live context envelope to refresh; Today's Plan also refetches that envelope whenever it mounts or regains focus; the defense off-day override is visible without expanding the card. Owner-screen verification remains blocked because an owner session could not be authorized.
- [x] DelayCam v1 for release: own tier-gated sidebar entries (Hitting: 5tool+golden2way, Pitching: pitcher+golden2way), remove "Save & Analyze", full-session record + playback, drawing/angle tools, no metrics.
- [x] FPS threshold bug: negotiated `track.getSettings().frameRate` is primary; measured frames only a ±10% sanity check; 60fps is a pass, not degraded.
- [ ] Lockdown verification as a non-staff account: HighFpsCapture record, recruiting standards, combine (athlete + evaluator), defense entry/athlete views, baserunning entry, pitcher Tell Report, /pitch-velocity harness.

## Deferred (per product reframe)
- Record Now → multi-rep session metrics surface (per-pitch / per-swing), separate from Upload's mechanics report card.

## Lifting Stage 1 — outstanding evidence (owner-required)
- [ ] Generation matrix: 6 phases × 5 training-age bands × 3 equipment levels × 3 ages × 4 day types, card produced in 100% of cells.
- [ ] Dose diff: one athlete, one date, before/after — `sets`/`reps` diff must be empty.
- [ ] Phone-width screenshot of the Safe Session card.
- [ ] Legacy violation to clear: `sp_atg_split_squat`, 2026-08-12, in_season, `speed` slot (deep_flexion) — pre-existing row, caught by the new flag-driven guard.

## Lifting Pass C — status
- [x] Section 1 — execution layer: 12 display-only columns, defensive derivation, RPC pure passthrough (proved live), phone screenshot at `scripts/audits/evidence/execution-layer-phone.png`.
- [x] Section 2 — standards: 265 lb bodyweight cap, per-implement med-ball marks (4/6/10 lb), target disclaimer on every surface.
- [x] Section 3 — quality tracks: emphasis ordering, never filters, weak-track weekly exposure floor.
- [x] Section 4 — reload detector: hard/soft signals, guardrails, cold-start wave, plain-English reason.
- [ ] Section 5 — wave: built but NOT wired, `lifting_v2_enabled` false. Full diff by group in `scripts/audits/evidence/wave-diff.json` — sets never move, only reps in main_compound / unilateral / upper. Awaiting owner sign-off before wiring.
