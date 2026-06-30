## Elite Lifts + Speed — Final Polish Pass

The core system shipped last turn (edge function, hook, cards, section in Hammer Today, admin page). This pass closes the remaining seams so it runs E2E with zero hiccups.

### 1. Edge function correctness & resilience
- Deploy `wk-generate-daily` and smoke-test via curl with an authed session. Confirm:
  - Returns prescriptions for first-time users (auto-seeded phase block).
  - Phase resolves correctly for users with and without `athlete_context` season dates (graceful fallback to `off_q2`).
  - Injury swap fires when `user_injury_progress` has an acute row.
  - CNS cap clamps and emits `reductions[]` payload visible to UI.
- Verify GRANTs on `wk_prescriptions`, `wk_cns_ledger`, `wk_session_logs`, `wk_recovery_acks`, `wk_phase_blocks`, `wk_movement_catalog` (authenticated + service_role).
- Confirm idempotency: re-invoking same `plan_date` replaces (not duplicates) rows.

### 2. Frontend wiring polish
- `WkLiftsSpeedSection`: gate auto-generate to one attempt per mount to avoid loop if the function returns empty.
- `WkPrescriptionCard`: when `status === "completed"`, persist a row in `wk_session_logs` (sets/reps actually performed defaulting to prescribed) so the Learning Loop has data — not just a status flip on `wk_prescriptions`.
- Sequence toggle: persist preference per user (localStorage key `wk:batBeforeLifts`) so it sticks across days.
- Skeleton shimmer while `isLoading || generating` (replace spinner-only state).

### 3. Cross-system correlation (the "everything influences everything" requirement)
- `dailyPlan.ts` (Hammer skill blocks): read today's `wk_prescriptions` CNS sum via a lightweight selector and reduce hitting/throwing intensity tags when CNS ≥ 7 — so hammer skill work respects lift load.
- `gp_signal` (Game Performance): when a game is logged today via `useGpSignal`, mark today's lift prescriptions as `status: skipped` with `substitution_reason: "Game day — auto-suppressed"` if not yet completed.
- Side-context (L/R) flows into bat-speed movement selection by passing `side` from `useSideContext` into the edge function body.

### 4. Onboarding seam
- Add three fields to onboarding `ReviewAnswersStep` (or a new tiny step) so the engine has real personalization inputs:
  - `training_age_years` (slider 0–15)
  - `is_pro_prospect` (toggle)
  - One-RM quick-entry for back squat / bench / deadlift / trap-bar (optional)
- Persist to `profiles` via a single migration adding those columns (with sane defaults so existing users aren't broken).

### 5. Admin page entry point
- Add a "Periodization tuning" link inside the Hammer Today header overflow menu (visible only when `useUserRole().isAdmin === true` or owner check), routing to `/admin/periodization`.

### 6. Eternity guards + final verification
- Run `scripts/check-eternity-guards.sh` and `bunx tsgo --noEmit` after all edits.
- Curl-test `wk-generate-daily` returning 200 with prescriptions array; tail edge function logs to confirm no errors.
- Capture a Playwright screenshot of Hammer Today with the new section rendered and the "Why today" / Cue / CNS transparency visible.

### Technical notes
- Migration: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS training_age_years int DEFAULT 0, ADD COLUMN IF NOT EXISTS is_pro_prospect boolean DEFAULT false, ADD COLUMN IF NOT EXISTS one_rm jsonb DEFAULT '{}'::jsonb;` — no GRANT change needed (existing).
- `wk_session_logs` insert on completion: `{user_id, prescription_id, sets_done, reps_done, rpe: null, completed_at: now()}`.
- CNS-aware skill reduction: clamp `intensity` field in `PrescribedBlock` to "moderate" when `Σ cns_cost ≥ 7`, surfacing a chip "Reduced — heavy lift CNS load today".

### Out of scope
- Coach-side prescription overrides (post-launch).
- Wearable HRV ingestion driving `cns_readiness` (slated for the sensor-fusion megaphase already constitutionalized).
