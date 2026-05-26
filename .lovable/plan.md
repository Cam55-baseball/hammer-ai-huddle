## Root cause

The "Emit canonical event" button on `/onboarding/athlete` step 2 does fire its handler. `useAthleteEvents.createEvent` writes the legacy `athlete_events` row (toast "Event saved" confirms — visible in session replay) and then calls `emitAsbEvent(...)` to append to `asb_events`. That insert **fails** with Postgres `23503` foreign-key violation:

```
insert or update on table "asb_events" violates foreign key constraint
  "asb_events_topic_id_fkey"  (topic_id = athlete.schedule.day_type)
```

`asb_events.topic_id` references `asb_topic_registry(topic_id)`, but only the 16 Wave‑0 invariant topics are registered (`organism.truth.v1`, `readiness.daily.v1`, …). None of the realization-layer topics added by later waves are in the registry:

- `athlete.schedule.day_type` / `athlete.schedule.day_type.deleted`
- `onboarding.step_completed` / `onboarding.path_selected` / `onboarding.primer_acknowledged`
- the `runtime.*`, `session.*`, `prescription.*` topics emitted by `emitRuntimeEvent`

Because `emitAsbEvent` is intentionally non-throwing (additive emission contract) and `emitDayTypeAsbEvent` is fire-and-forget (`void` in `createEvent`), the failure only shows up as a console `[asb] emit_failed` line. The onboarding handler then queries `asb_events` for the row that was never inserted, gets `null`, skips `goNext()`, and the stepper appears frozen. `useAthleteOnboardingState.hasFirstEvent` also stays `false`, so the post-refresh skip path never triggers either.

So the chain breaks at **ledger insert** (topic not registered), and is **invisible at the UI** because emission errors are swallowed by design but never surfaced to the caller.

## Fix (additive, replay-safe, no architecture change)

### 1. Migration — register all realization-layer topics

Add one `INSERT … ON CONFLICT DO NOTHING` migration into `asb_topic_registry` covering every topic actually emitted by the current code paths. All classed against existing enums; no schema change, no policy change, no ledger mutation.

| topic_id | class | authority | replay | materialization |
|---|---|---|---|---|
| `athlete.schedule.day_type` | `athlete_intent` | `athlete` | `deterministic` | `on_demand` |
| `athlete.schedule.day_type.deleted` | `athlete_intent` | `athlete` | `deterministic` | `on_demand` |
| `onboarding.step_completed` | `observability` | `athlete` | `deterministic` | `transient` |
| `onboarding.path_selected` | `athlete_intent` | `athlete` | `deterministic` | `on_demand` |
| `onboarding.primer_acknowledged` | `observability` | `athlete` | `deterministic` | `transient` |
| `runtime.session.*`, `runtime.prescription.*`, `runtime.notification.*` (all `RuntimeTopic` literals from `src/lib/runtime/emitRuntimeEvent.ts`) | matched per topic (session_execution / training_prescription / observability) | `athlete` or `system` | `deterministic` | `on_demand` / `transient` |

`introduced_in_engine_version` = current `ENGINE_VERSION`. PK is `topic_id`, so `ON CONFLICT DO NOTHING` makes the migration idempotent and replay-safe (registry rows are metadata, not ledger events).

I will enumerate `RuntimeTopic` and any other `topic_id` literals via `rg` before writing the migration so nothing is missed.

### 2. Surface emit failures without weakening the additive contract

Change `emitAsbEvent` signature from `Promise<void>` to:

```ts
type EmitResult = { ok: true; deduped?: boolean } | { ok: false; code?: string; message: string };
export async function emitAsbEvent(row: AsbEmitRow): Promise<EmitResult>
```

Still never throws. Existing call sites that ignore the return value are unaffected (the `void` callers stay valid). `emitDayTypeAsbEvent` is updated to return the result and `useAthleteEvents.createEvent` is updated to `await` it and return the result up to the caller alongside the legacy event.

### 3. Gate onboarding advancement on canonical-event success only

`AthleteOnboarding.handleEmitSchedule` is updated to:

- `await` the ASB emission result (no more fire-and-forget for this gating step).
- On `ok: true` → query `asb_events` for the just-appended row, set `emittedEventId`, `goNext()`.
- On `ok: false` → set a local `emitError` string and render a calm inline error block (RuntimeCard-style) with the topic_id, the Postgres code/message, and a "Try again" button. No toast spam.
- Loading state already exists (`emitting`).
- Idempotency: `computeIdempotencyKey` is already deterministic on `(athlete_id, topic_id, occurred_at, payload)`, so duplicate clicks dedupe at the DB (`23505` → `ok: true, deduped: true`). Stepper still advances on dedupe.

No local mutable onboarding truth is introduced — stepper advancement is conditioned on the **read-back** of the canonical event from `asb_events`, not on local state. `useAthleteOnboardingState.hasFirstEvent` is invalidated via the existing react-query key so the projection-derived skip path recomputes on next mount.

### 4. Temporary structured logs (removable after verification)

Add `console.info("[onboarding] emit", { topic_id, athlete_id, ok, code })` at the handler boundary and in `emitDayTypeAsbEvent`. The existing `[asb] emit` / `[asb] emit_failed` lines stay.

### 5. CI invariant unchanged

No new topic class, no new emitter, no replay-graph change, no new mutable store. Existing `scripts/check-invariants.sh` rules continue to pass (no `supabase` import added to projections/modulators; no `Date.now()` in deterministic paths). I will add one assertion to preflight: every `topic_id` literal under `src/lib/runtime/`, `src/lib/asb/`, `src/hooks/`, `src/pages/` must exist in the migration registry seed — prevents this class of bug recurring.

## Files touched

- **New migration**: `supabase/migrations/<ts>_register_realization_topics.sql` — additive INSERTs into `asb_topic_registry`.
- `src/lib/asb/emit.ts` — `EmitResult` return; no behavior change for void callers.
- `src/hooks/useAthleteEvents.ts` — `emitDayTypeAsbEvent` returns result; `createEvent` awaits the ASB emission.
- `src/pages/AthleteOnboarding.tsx` — await ASB emit; inline error surface + retry; invalidate onboarding-state query on success.
- `scripts/check-invariants.sh` — add rule 19: topic-registry parity check.
- (Optional, only if found unregistered during the topic sweep) one-line update in `src/lib/runtime/emitRuntimeEvent.ts` topic list comment.

## E2E verification

1. Run migration → `SELECT topic_id FROM asb_topic_registry WHERE topic_id LIKE 'athlete.%' OR topic_id LIKE 'onboarding.%' OR topic_id LIKE 'runtime.%';` returns the new rows.
2. Cold onboarding: log in as fresh athlete → step 2 → click "Emit canonical event" → row appears in `asb_events` with `topic_id='athlete.schedule.day_type'`; stepper advances to step 3 showing the real `event_id`.
3. Refresh `/onboarding/athlete` → `hasFirstEvent === true` → redirect to `/command`.
4. Duplicate click: same payload re-emits → `23505` dedupe → handler still advances; only one row in ledger.
5. Offline: existing `eventQueue` path unaffected (it calls `emitAsbEvent` the same way; once registry knows the topic, queued emits succeed on flush).
6. Replay: `onboardingState` projection consumes the new `asb_events` row; `ProgressiveDisclosureStepper` derived state advances from replay only (no local mutation).
7. Force-failure test: temporarily emit an unregistered topic → handler shows inline error with code `23503` and "Try again"; no silent freeze.

## Replay integrity

- No event mutation, no event deletion, no event back-dating.
- Registry rows are metadata, not ledger entries — adding them does not change any prior replay.
- `emitAsbEvent` remains append-only with idempotency-key dedupe.
- Stepper advancement is derived from a ledger read, not from local state.

## Out of scope

No new wave, no new doctrine, no schema changes to `asb_events`, no auth/RLS changes, no edge function (insert goes through existing client + RLS that already permits authenticated athletes to insert their own rows).
