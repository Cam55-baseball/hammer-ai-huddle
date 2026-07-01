## Status

The core E2E plumbing is in place:
- `wk-generate-daily` edge function deployed
- `WkLiftsSpeedSection` reads `gameToday` from `useGpSignal` and suppresses lifts
- `HammerDailyPlan` clamps skill blocks to "maintain" when Σ CNS ≥ 7 and shows a "CNS heavy" badge
- `WkPrescriptionCard` writes completions to `wk_session_logs`
- `ReviewAnswersStep` captures training age / pro-prospect / 1RMs
- Owner-only Tuning link to `/admin/periodization`

What is still rough enough to break "seamless and elite":

## Gaps to close

1. **Error containment** — `WkLiftsSpeedSection` and `WkPrescriptionCard` are not wrapped in an error boundary. A single edge-function or render error currently blanks the Hammer Today plan. Wrap both in a localized `ElitePlanBoundary` that falls back to a compact "Plan unavailable — retry" card so the rest of Hammer Today keeps working.

2. **Auto-generate resiliency** — `useWkDailyPrescriptions` currently retries once per mount. If the first attempt fails (timeout, cold start), the user sees an empty section until tomorrow. Add: a) 30s timeout on the invoke, b) one automatic retry with backoff, c) a visible "Regenerate plan" button when both attempts fail.

3. **Recovery acknowledgment loop** — `wk_recovery_acks` is written but never read back into the next-day prescription. Thread the most recent ack (soreness / sleep / readiness) into the `wk-generate-daily` request body so the next plan actually adapts. Without this, "personalization" is a one-way street.

4. **Session log → CNS ledger** — Completions land in `wk_session_logs` but the CNS clamp only reads today's *prescribed* `cns_cost`. After a user finishes a block, recompute Σ CNS from actuals so the clamp reflects what was really done (e.g., skipped sets reduce the clamp, bonus sets increase it).

5. **Game-day suppression UX** — Today the suppression notice replaces the whole section. Replace with a collapsible "Game day — lifts paused, here's your activation primer" card containing a 10-minute CNS-priming routine so users still get value on game days.

6. **Mobile polish** — At 402px the bat-vs-lift toggle, "Why" disclosure, and set/rep tracker overflow the card. Apply `flex-wrap`, stack the toggle vertically under `sm`, and clamp the prescription headline to 2 lines.

7. **Owner Tuning link visibility** — The Tuning button currently renders inline in the header and pushes other controls off-screen on mobile. Move it into the existing overflow menu (kebab) so the header stays clean for athletes.

8. **Telemetry sanity** — Add a single `console.debug` → `engine_function_logs` row on each plan generation with `{ generated_ms, cns_total, blocks_n, suppressed: gameToday }` so we can verify quality in production without guessing.

## Out of scope

No schema migrations beyond reading existing `wk_recovery_acks` rows. No changes to dailyPlan business logic beyond the CNS-from-actuals recompute. Onboarding, dossiers, and General untouched.

## Verification

- `tsgo` clean
- Manual: force the edge function to 500 → confirm boundary + retry button render and the rest of Hammer Today stays interactive
- Manual: mark a game today → confirm activation-primer card appears instead of blank suppression
- Manual: complete one block → confirm "CNS heavy" badge updates to reflect actuals
- Manual: 402px viewport → no horizontal overflow in Lifts + Speed section
