## Canonical ASB Operationalization — Passes 4, 6.2–6.5, 7, 8

Sequential, additive-only execution on top of locked G1/G2 substrate. No schema rewrites, no doctrine, no legacy replacement.

### Pass 4 — Lineage Continuity (single-hop, explicit causality only)

Wire `emitAsbLineage` from `src/lib/asb/emit.ts` wherever a parent ASB `event_id` is already in scope:

- `useAthleteEvents.deleteEvent` — when deletion produces a new canonical `event_deleted` ASB row, emit lineage `parent = original event_id`, `derivation_type = "deletion"`.
- Behavioral / foundation derived emitters — when a derived event is produced from a known source `event_id`, emit `derivation_type = "derived"` lineage row.
- Skip emission anywhere ancestry is not explicit. No inference.

Deterministic ordering preserved: every lineage read already uses `created_at` + `parent_event_id`/`child_event_id` tiebreak (G1 parity fix).

### Pass 6.2–6.5 — Canonical Producer Expansion

Add additive `emitAsbEvent` calls to each producer below. Legacy writes untouched. Each producer stamps `ENGINE_VERSION`, computes `idempotency_key` via `computeIdempotencyKey()`, preserves raw payload verbatim, preserves missingness, no smoothing/imputation/aggregation.

1. **Behavioral event writers** (`useBehavioralEvents` / nearest hook): emit on each behavioral row insert. `topic_id = "behavioral.<kind>"`, `actor_role = "system"` or `"athlete"` per source.
2. **Foundation trigger emitters** (foundation-related hooks/edge functions): emit on trigger fire with `topic_id = "foundation.<trigger_name>"`.
3. **analytics-ingest** edge function: wrap each accepted event with additive `asb_events` insert using service-role client.
4. **Calendar** (event/schedule writers): emit `topic_id = "calendar.<kind>"`.
5. **Nutrition** writers: emit `topic_id = "nutrition.<kind>"`.
6. **Video / realtime ingest** paths: emit `topic_id = "media.<kind>"` / `"realtime.<kind>"`, preserve asset refs in `lineage_refs`.

For edge functions, port the small `engineVersion.ts` helpers inline (Deno) — no shared bundling change.

### Pass 7 — Stripe Atomicity

In Stripe webhook function: replace `select existing → insert` dedupe with single `insert ... on conflict (stripe_event_id) do nothing` and branch on returned row count. Verify unique index on `stripe_event_id` exists first via `supabase--read_query`; if missing, surface as the only schema blocker requiring approval. No behavior change beyond race elimination.

### Pass 8 — AI / Analyzer Provenance

For every analyzer edge function path:
- Stamp `engine_version` (ASB engine constant).
- Stamp `model_id`, `model_version` from the gateway call site (already known at call time).
- Stamp `prompt_hash = sha256(canonical(prompt))`.
- Preserve raw analyzer output verbatim in payload.

Verify nullable columns `model_id`, `model_version`, `prompt_hash`, `engine_version` exist on analyzer output tables; if missing, one additive migration adds them as nullable. No backfill.

### Verification (after each producer pass)

- `select count(*) from asb_events where topic_id like '<prefix>%'` returns > 0 after triggering action.
- Row appears in `/asb/timeline`.
- `/replay/:eventId` resolves deterministically with pinned `engine_version`.
- Re-trigger same input → no duplicate (idempotency_key dedupe).
- Lineage row present when parent was in scope.

### Global Constraints (enforced throughout)

No schema rewrites beyond a single additive nullable-columns migration if Pass 8 requires it. No destructive migrations. No replay authoring. No aggregation. No hidden retries. No parallel truth systems. No legacy consumer replacement. No UI flow changes.

### Execution Order

1. Pass 4 lineage emits.
2. Pass 6.2 behavioral → verify.
3. Pass 6.3 foundation → verify.
4. Pass 6.4 analytics-ingest → verify.
5. Pass 6.5 calendar / nutrition / video / realtime → verify each.
6. Pass 7 Stripe atomicity → verify.
7. Pass 8 analyzer provenance → verify.

Stop only on a concrete schema/index blocker requiring approval.
