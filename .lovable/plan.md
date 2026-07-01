## Final 100% Completion Verification

Goal: give a binary "100% complete" or "not" answer for the Elite Lifts + Speed E2E plan, backed by fresh evidence rather than prior claims.

### Checks
1. **Static guards** — `tsgo` typecheck + `scripts/preflight.sh` (eternity guards, side-context lint, no-legacy-games, invariants).
2. **DB surface** — confirm RLS + GRANTs present on `wk_prescriptions`, `wk_session_logs`, `wk_recovery_acks`, `wk_periodization_blocks`, `wk_cns_ledger`, and new `profiles` columns (`training_age_years`, `is_pro_prospect`, `one_rm`) via `supabase--read_query` on `pg_policies` and `information_schema.role_table_grants`.
3. **Edge function** — `supabase--curl_edge_functions` against `wk-generate-daily` with (a) normal, (b) game-day, (c) post-recovery-ack payloads; capture status, CNS totals, reason strings.
4. **Client wiring audit** — re-read `useWkDailyPrescriptions.ts`, `WkLiftsSpeedSection.tsx`, `HammerDailyPlan.tsx`, `ReviewAnswersStep.tsx` and confirm: single-fire ref, 30s timeout + retry, manual regenerate, `effectiveCnsTotal` clamp ≥7, game-day primer, bat-vs-lift persistence, owner Tuning menu, ErrorBoundary wrap, profile round-trip.
5. **Live smoke** — headless Playwright at `localhost:8080` with injected session: land Hammers Today, screenshot loading→generated, toggle persistence, regenerate, log a completion, verify `wk_session_logs` row.

### Output
A pass/fail table with evidence (query result, curl status, screenshot path, file+line). Final line: **"100% complete"** or **"NOT 100% — gaps: …"** with the smallest fixes needed.

### Notes
- Verification only. Any gap found gets the smallest targeted fix (client, edge, or migration with GRANTs) then re-verified.
- No new features, no schema changes unless a missing grant/policy is discovered.
