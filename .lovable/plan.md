## Final E2E Verification & Gap-Closure Pass

Goal: prove the Elite Lifts + Speed system (and its dependencies) is 100% E2E with zero gaps, then close anything found.

### 1. Static verification sweep
- `tsgo` full typecheck.
- Grep for known risk patterns: raw `signOut(`, unguarded dynamic imports, `useAuth` without `useOptionalAuth` in error-prone leaves, missing `ErrorBoundary` around lazy sections.
- Confirm every table touched by the plan (`wk_prescriptions`, `wk_session_logs`, `wk_recovery_acks`, `wk_periodization_blocks`, `wk_cns_ledger`, `profiles` new cols) has SELECT/INSERT/UPDATE grants + RLS policies for `authenticated`.

### 2. Edge function contract audit (`wk-generate-daily`)
- Verify request schema (Zod) matches every client call site (`useWkDailyPrescriptions`, admin regenerate).
- Verify response shape is consumed correctly (CNS totals, prescriptions[], reason strings).
- Check CORS on all responses (including error paths), 45s timeout guard, structured logs, and recovery-ack + game-day inputs are read defensively.
- Run `supabase--curl_edge_functions` with a real preview session for: (a) normal day, (b) game-day suppression, (c) post-recovery-ack low-CNS mode. Capture logs.

### 3. Client E2E audit
- `useWkDailyPrescriptions`: single-fire ref, 30s timeout, backoff retry, manual regenerate, `effectiveCnsTotal` from actuals, `SideContext` threading, error state exposed to UI.
- `WkLiftsSpeedSection`: skeleton, error boundary, game-day primer, bat-vs-lift toggle persisted, recovery ack write path, mobile wrap at 402px.
- `HammerDailyPlan`: CNS clamp (≥7) applied to hitting/throwing/defense with badge, owner-only Tuning menu, error boundary wrap.
- `ReviewAnswersStep`: writes `training_age_years`, `is_pro_prospect`, `one_rm` to `profiles`; values round-trip.

### 4. Live Playwright smoke (headless, localhost:8080, injected session)
- Route: `/` Hammers Today.
  - Screenshot the Lifts + Speed card in loading → generated states.
  - Toggle bat-before-lifts, reload, confirm persistence.
  - Tap "Regenerate" and confirm new prescription arrives.
  - Log a completion on one prescription; confirm `wk_session_logs` row via a follow-up query.
- Simulate game-day: insert a `gp_games` row for today via edge or query, reload, confirm activation primer replaces prescriptions and CNS badge behavior.
- Submit a recovery ack (high soreness) and confirm the next generation drops the CNS cap for 48h.
- Owner path: open the header menu → "Tuning" → `/admin/periodization` loads and lists blocks.

### 5. Gap closure
For each defect found in steps 1–4, apply the smallest targeted fix (client, edge, or migration with proper GRANTs) and re-run the affected verification.

### 6. Final report
- Table of checks (pass/fail + evidence: screenshot path, log line, or query result).
- Explicit statement of any residual gaps or "won't fix" items with rationale.

### Technical notes
- No new features; verification + minimal fixes only.
- No schema changes unless a missing grant/policy is discovered.
- All edge function changes redeploy automatically; no manual deploy step surfaced to user.
