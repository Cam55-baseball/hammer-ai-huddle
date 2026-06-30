## Status: Elite Lifts + Speed — E2E Closure Verification

The core system and polish pass shipped, but three plan items from `.lovable/plan.md` were **not fully completed** last turn. Here's the honest gap list and the plan to close them.

### What is DONE
- Edge function `wk-generate-daily` deployed with phase resolution, injury swaps, CNS clamp, idempotency.
- `wk_*` tables exist with GRANTs.
- Frontend: `WkLiftsSpeedSection` (sequence toggle persisted to localStorage, skeleton loader, one-shot auto-generate), `WkPrescriptionCard` (logs to `wk_session_logs` on complete), `useWkDailyPrescriptions` (side-context threaded).
- `AdminPeriodization` page wired to real `wk_periodization_blocks` schema with owner gate.
- Typecheck + eternity guards green.

### What is NOT done (gaps to close)
1. **Cross-system correlation — Hammer skill blocks ignore CNS load.** `dailyPlan.ts` does not yet read today's `wk_prescriptions` CNS sum to clamp hitting/throwing intensity to "moderate" when Σ CNS ≥ 7.
2. **Cross-system correlation — Game-day auto-suppression.** `useGpSignal` does not mark today's pending lift prescriptions as `skipped` with reason "Game day — auto-suppressed" when a game is logged.
3. **Onboarding seam — personalization inputs missing.** `profiles` columns `training_age_years`, `is_pro_prospect`, `one_rm` are not added, and `ReviewAnswersStep` does not collect them. Edge function falls back to defaults for every user.
4. **Admin entry point.** No link to `/admin/periodization` from the Hammer Today header overflow menu (admins must type the URL).
5. **Smoke verification.** No curl against `wk-generate-daily` + Playwright screenshot of Hammer Today with the new section visible.

### Closure plan

**A. CNS-aware Hammer skill clamp** (`src/lib/hammer/dailyPlan.ts`)
- Add a lightweight selector that sums today's `wk_prescriptions.cns_cost` for the user.
- When Σ ≥ 7, clamp skill-block `intensity` to "moderate" and append a transparency chip `"Reduced — heavy lift CNS load today"` to the block's `why` payload.

**B. Game-day lift suppression** (`src/hooks/useGpSignal.ts`)
- On detection of a logged game today, update `wk_prescriptions` rows with `slot in ('lift','supplemental')` and `status='planned'` to `status='skipped'`, `substitution_reason='Game day — auto-suppressed'`.
- Idempotent: only flips rows still planned.

**C. Profiles personalization migration + onboarding capture**
- Migration: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS training_age_years int DEFAULT 0, ADD COLUMN IF NOT EXISTS is_pro_prospect boolean DEFAULT false, ADD COLUMN IF NOT EXISTS one_rm jsonb DEFAULT '{}'::jsonb;` (no GRANT change — profiles already granted).
- Update `src/components/onboarding/ReviewAnswersStep.tsx` with a small "Training profile" block: slider for training age (0–15), toggle for Pro/Prospect, optional 1RM quick inputs (squat / bench / deadlift / trap-bar).
- Persist on save through the existing profile upsert path.
- Edge function already reads these defensively — once columns exist, real values flow.

**D. Admin link in Hammer Today header**
- In the Hammer Today header overflow menu, add a "Periodization tuning" item gated by `useOwnerAccess().isOwner` (matches existing owner gate pattern) routing to `/admin/periodization`.

**E. Smoke verification**
- Curl `wk-generate-daily` with the preview session and confirm 200 + prescriptions array; tail logs for errors.
- Playwright headless: load `/` (Hammer Today), screenshot the new section showing phase chip, "Why today" line, CNS transparency, and sequence toggle.
- Run `bunx tsgo --noEmit` + `scripts/check-eternity-guards.sh` after edits.

### Out of scope (already constitutionalized for later)
- Coach-side prescription overrides.
- Wearable HRV → `cns_readiness`.

### Release-readiness answer
**Not yet 100% E2E.** Items A–E above are the remaining gap between "core system shipped" and "every signal influences every signal as planned." Approve and I'll close them in one build pass.
