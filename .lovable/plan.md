## Root cause

The client constant `ENGINE_VERSION = "asb-1.0.0"` (in `src/lib/asb/engineVersion.ts`) is used as the `engine_version` value on every `asb_events` insert (onboarding, runtime, recovery, offline reconciler, etc.).

The `asb_engine_versions` registry only contains `v1.0.0`. The FK `asb_events_engine_version_fkey` therefore rejects every insert with PG `23503`, which surfaces in onboarding as the calm error block you just saw.

No events exist under either version, so this is a pure registry gap — not a data-migration problem.

## Fix (single additive migration)

Register the canonical client engine_version in `asb_engine_versions`:

```sql
INSERT INTO public.asb_engine_versions (engine_version, schema_version, notes)
VALUES ('asb-1.0.0', 1, 'Wave 3 runtime canonical engine version')
ON CONFLICT (engine_version) DO NOTHING;
```

That's it. Nothing else changes:
- No code change (client constant remains source of truth)
- No schema change
- No data backfill (zero existing rows)
- No parallel runtime path
- Append-only / replay determinism / lineage continuity all preserved
- Three dependent FKs (`asb_events`, `asb_event_lineage`, `asb_state_snapshots`) all become satisfiable atomically

## Verification

1. Retry "Emit canonical event" on `/onboarding/athlete` → row appears in `asb_events` with `engine_version='asb-1.0.0'`, stepper advances.
2. `psql -c "SELECT engine_version FROM asb_engine_versions"` shows both `v1.0.0` and `asb-1.0.0`.
3. `bash scripts/check-invariants.sh` still passes (no rule touches engine_version registry parity, so no CI changes required; can add as a follow-up if you want rule 20).

## Out of scope

- Renaming the client constant to `v1.0.0` (would orphan future planned snapshots already keyed on `asb-1.0.0` and require touching 6+ modules)
- Adding a CI parity rule for engine_version (separable, low-priority)
