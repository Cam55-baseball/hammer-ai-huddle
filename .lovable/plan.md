## Root cause

The Quick Check-In sheet emits 8 ASB events, but every emit fails with FK constraint `asb_events_topic_id_fkey` (see console logs at 20:39:58). The topic IDs the sheet emits are not registered in `asb_topic_registry`, so the database rejects every insert. The UI shows a success toast because the existing `emitAsbEvent` helper swallows the error, but nothing persists and Hammer never sees new signals.

Missing topic IDs:
- `behavioral.readiness`
- `behavioral.fatigue`
- `behavioral.soreness`
- `behavioral.sleep`
- `behavioral.stress`
- `behavioral.hydration`
- `athlete.plan.today`
- `behavioral.checkin`

## Fix

Single schema migration that inserts these 8 rows into `asb_topic_registry`, classified consistently with existing rows:

```text
behavioral.readiness  → readiness          / athlete / snapshot / deterministic_with_inputs
behavioral.fatigue    → readiness          / athlete / snapshot / deterministic_with_inputs
behavioral.soreness   → readiness          / athlete / snapshot / deterministic_with_inputs
behavioral.sleep      → recovery_state     / athlete / snapshot / deterministic_with_inputs
behavioral.stress     → readiness          / athlete / snapshot / deterministic_with_inputs
behavioral.hydration  → recovery_state     / athlete / snapshot / deterministic_with_inputs
athlete.plan.today    → athlete_intent     / athlete / snapshot / deterministic_with_inputs
behavioral.checkin    → session_feedback   / athlete / snapshot / deterministic
```

Idempotent via `ON CONFLICT (topic_id) DO NOTHING`. `introduced_in_engine_version` set to the current engine version.

## Verification

1. Run the migration.
2. Open Hammer → Do Check-In → complete all steps → Save.
3. Confirm no `[asb] emit_failed` errors in console.
4. Query `asb_events` for the user and confirm 8 rows sharing one `causality_refs` group ID.
5. Confirm Hammer's next-step card updates (query invalidation already wired).

## Out of scope

No changes to the sheet UI, `emitAsbEvent` helper, edge function, or any other surface. Pure additive registry inserts.
