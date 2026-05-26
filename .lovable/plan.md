## Wave 3 closure — finish onboarding emit fix

Two small additive changes to complete the previously-approved onboarding deadlock fix. No new architecture.

### 1. Wire `_asbError` into `AthleteOnboarding.handleEmitSchedule`

In `src/pages/AthleteOnboarding.tsx`:
- Capture the return value of `createEvent(...)` and read `_asbError`.
- On canonical-emit failure: render a calm inline error block (RuntimeCard-style: topic_id, PG code, message) with a "Try again" button. Do NOT advance.
- On success: keep existing ledger read-back + `goNext()`. Also surface non-fatal `deduped` as a quiet note.
- Keep `setEmitting` finally block. No local mutable onboarding truth; advancement still gated on the ledger read.

### 2. Add CI rule 19 — topic-registry parity

In `scripts/check-invariants.sh`:
- Scan `src/lib/runtime/`, `src/lib/asb/`, `src/hooks/`, `src/pages/` for `topic_id` string literals matching the realization namespaces (`athlete.schedule.*`, `onboarding.*`, `prescription.*`, `session.*`, `runtime.feedback.*`).
- Cross-check each against the seed list in `supabase/migrations/20260526172412_*.sql`.
- Fail CI if a code literal is absent from the registry seed.

### Out of scope
- No migrations, no schema changes, no new tables.
- No changes to `emit.ts` or `useAthleteEvents.ts` (already done).
- No new routes, no auth changes.

### Files touched
- `src/pages/AthleteOnboarding.tsx` (edit handler + step 2 error surface)
- `scripts/check-invariants.sh` (append rule 19)

### Verification
- E2E: cold onboarding → click Emit → row in `asb_events` → step 3.
- Force failure (e.g. unknown topic) → inline error visible, retry works, no advance.
- `bash scripts/check-invariants.sh` → PASSED with rule 19 green.
