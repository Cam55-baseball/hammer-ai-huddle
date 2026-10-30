# Pitcher outings and arm-ledger safety proof

## Build
- Connect finalized, sport-matching game pitch totals to the existing arm ledger with exact game lineage and idempotent corrections.
- Share aggregate-versus-pitch-detail counting between app and server; count each game once, retaining separate practice and position work.
- Feed actual game outings into next-day recovery without inventing starter status or innings.
- Keep existing pitch/rest limits, shared two-way budget, Sunday recovery and protected saved-work rules unchanged.

## Verify
- As certhsp, certsbp and certsb2 at 390×844, save explicitly labeled TEST outing facts on their existing scheduled in-season dates.
- Rebuild subsequent dates sequentially through wk-generate-daily with IO-safe pacing; read back every saved day and the arm ledger.
- Check next-day recovery, next legal bullpen and all weekly arm limits using the canonical rules.
- Run focused regressions and document exact saved days; report five lines with any unresolved failures.

## Technical details
- Use an additive migration on existing public application tables and a shared pure game-load projection.
- Deploy only wk-generate-daily under the owner's standing authorization; no publishing, cron or iOS changes.
- TEST outing numbers are test inputs, not claims of actual athlete performance; previously saved 40 pitches / 10 batters remain the intended proof values.