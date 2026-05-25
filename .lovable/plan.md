# Canonical ASB Ingestion Substrate — Operationalization Plan

Goal: turn the sealed ASB ledger into a live, replay-certifiable runtime by producing real canonical events from existing ingest paths. Additive only. No schema rewrites, no parallel ledgers, no doctrine work.

---

## Pass 1 — Lock G1 lineage parity (determinism)

**File:** `src/hooks/useEventLineage.ts`
- Add `.order("parent_event_id", { ascending: true })` to the ancestors query (after `created_at`).
- Add `.order("child_event_id", { ascending: true })` to the descendants query (after `created_at`).
- No other changes; single-hop, 500-cap, dedupe preserved.

Result: total deterministic lineage ordering matches G2 contract platform-wide.

---

## Pass 2 — Canonical engine_version source

**New file:** `src/lib/asb/engineVersion.ts`
- Export `ENGINE_VERSION` constant (single source of truth, pinned string e.g. `"asb-1.0.0"`).
- Export `canonicalPayload(obj)` → stable-key-sorted JSON string (reuse logic from `replay.ts` canonicalization rule but local & pure).
- Export `computeIdempotencyKey({ athlete_id, topic_id, occurred_at, payload })` → `sha256` hex via `crypto.subtle.digest` (browser-safe, async) returning a deterministic string.

No retroactive mutation. Stamped at write-time only.

---

## Pass 3 — First canonical ASB producer: athlete events

**File:** `src/hooks/useAthleteEvents.ts`

In `createEvent`, after the existing legacy `setDayType` write succeeds and the row is re-fetched, fire an additive `asb_events` insert in parallel (non-blocking; failures logged but never break the legacy path).

Fields populated:
- `event_id`: `crypto.randomUUID()`
- `athlete_id`: `user.id`
- `topic_id`: `"athlete.schedule.day_type"`
- `actor_role`: `"athlete"`
- `actor_id`: `user.id`
- `occurred_at`: `input.eventDate + "T" + (eventTime || "00:00") + "Z"` (ISO, deterministic)
- `ingested_at`: `now()`
- `effective_at`: same as `occurred_at`
- `valid_from`: same as `occurred_at`
- `engine_version`: `ENGINE_VERSION`
- `payload`: `{ event_type, event_time, intensity_level, sport, notes, legacy_event_id }`
- `idempotency_key`: `await computeIdempotencyKey({...})` → on unique-conflict, swallow silently (replay-safe append-only).
- `lineage_refs`: `[]`
- `causality_refs`: `[]`

Identical contract added to `deleteEvent` (topic `athlete.schedule.day_type.deleted`, payload includes prior legacy id).

Constraints honored: no aggregation, no smoothing, no inferred certainty; legacy table remains canonical for legacy consumers; ASB row is the canonical replay source going forward.

---

## Pass 4 — Snapshot + lineage continuity (where ancestry exists)

For `useAthleteEvents` no parent ASB event exists yet → `lineage_refs: []`, no `asb_event_lineage` write.

For derived emitters added later (behavioral, foundation, analyzer) — when a parent `event_id` is in scope, additionally insert into `asb_event_lineage`:
- `parent_event_id`, `child_event_id`, `derivation_type` (string declared by the producer), `engine_version`.
- Single-hop only. No recursion. Deterministic ordering inherited from G1 fix.

Optional `asb_state_snapshots` write only when the producer already has a fully-materialized projection (defer until a producer needs it; not added blindly in pass 3).

---

## Pass 5 — Ingestion observability hardening

**New file:** `src/lib/asb/emit.ts`
- `emitAsbEvent(row)` — thin wrapper around `supabase.from("asb_events").insert(row)` that:
  - On success: `console.info("[asb] emit", { event_id, topic_id, engine_version })`.
  - On unique-conflict (`23505`): `console.info("[asb] dedupe", { idempotency_key, topic_id })` and resolve quietly.
  - On other errors: `console.error("[asb] emit_failed", { topic_id, code, message })` and resolve (never throw — additive emission must never break legacy path).
- `emitAsbLineage(edge)` — same shape for `asb_event_lineage`.

All future producers route through this. Preserves 204/fire-and-forget semantics where required (analytics-ingest edge fn unchanged for now).

---

## Pass 6 — Incremental idempotency + engine_version audit (sequenced, additive)

Apply the same `emitAsbEvent` pattern progressively:

1. `useAthleteEvents` (pass 3 above) — `athlete.schedule.day_type`.
2. `useBehavioralEvents` writer side (where the row is inserted, not the read hook) — topic `athlete.behavior.<event_type>`, with lineage_refs to the triggering source event when known. Locate insert sites in a follow-up pass.
3. Foundation trigger emitters (`src/lib/foundation*`) — topic `athlete.foundation.<trigger_kind>`, lineage to upstream event.
4. `supabase/functions/analytics-ingest/index.ts` — additive ASB insert alongside `launch_events`, topic `athlete.analytics.<event>`; keep 204 contract; failures logged only.
5. Calendar / nutrition / video / realtime — each treated as one additive emit pass per file, deferred until pass 1–4 verified live in `/asb/timeline` and `/asb/replay/:id`.

Each step: add idempotency key, stamp `ENGINE_VERSION`, no schema change unless a unique index on `idempotency_key` is missing (verify in pass 6.0 via read_query; if missing, single additive migration adding the unique index — no destructive change).

---

## Pass 7 — Stripe webhook race fix

**File:** `supabase/functions/stripe-webhook/index.ts` (locate in build mode)
- Replace `select → insert` dedupe on `processed_webhook_events` with a single `insert ... on conflict do nothing` against the existing unique index on `stripe_event_id` (verify index exists; if not, add it in a tiny additive migration).
- Treat zero-rows-affected as "already processed" and short-circuit.
- No behavior change beyond atomicity.

---

## Pass 8 — AI / sensor / analyzer lineage prep

For each existing analyzer edge function output written to DB (video AI analyzer, etc., enumerated in build mode), ensure the persisted row includes:
- `engine_version` (from `ENGINE_VERSION` shared constant, or a function-local pin if the function is sealed)
- `model_id`, `model_version`, `prompt_hash` (sha256 of the canonical prompt string)

No new tables. If existing target tables lack these columns, add them as nullable additive columns in one consolidated migration. Lineage emission deferred until a downstream consumer needs it; the metadata stamping is the prep work.

---

## Verification (after pass 3)

1. Create an athlete event in the UI → confirm a new row appears in `asb_events` via `read_query`.
2. Open `/asb/timeline` → row visible with correct `engine_version`, `topic_id`, `idempotency_key`.
3. Open `/asb/replay/:eventId` → certification verdict `uncertifiable` (no snapshot yet) with engine_version pinned; re-derivation deterministic across reloads.
4. Re-trigger same event with same inputs → no duplicate row (idempotency holds); console shows `[asb] dedupe`.

After verification, proceed iteratively through passes 4–8.

---

## Technical notes

- All new code in `src/lib/asb/*` is pure & side-effect-free except `emit.ts` (one I/O surface).
- `crypto.subtle.digest` is available in browser + Deno; same helper usable client-side and in edge functions (or duplicate locally to avoid sharing across runtimes).
- No changes to `src/integrations/supabase/client.ts` or `types.ts`.
- No constitutional/doctrine files touched.
- Only one schema migration may be needed (unique indices on `idempotency_key` / `stripe_event_id` if absent, plus optional nullable analyzer metadata columns) — verified before any migration is written.

## Out of scope

- New phases, doctrine, megaphases.
- Backfilling historical legacy rows into ASB.
- Parallel ledger systems or derived-truth replacements.
- Removing legacy writes.

---

## Execution log

- Pass 1: applied — `useEventLineage.ts` ancestors+descendants now total-ordered.
- Pass 2: applied — `src/lib/asb/engineVersion.ts` (ENGINE_VERSION="asb-1.0.0", canonicalPayload, computeIdempotencyKey/sha256).
- Pass 3: applied — `useAthleteEvents.createEvent`/`deleteEvent` emit canonical ASB rows additively.
- Pass 5: applied — `src/lib/asb/emit.ts` centralizes ASB I/O with replay-safe dedupe logging.
- Migration: added INSERT RLS policies on `asb_events` (athlete owns row) and `asb_event_lineage` (child belongs to athlete).
- Deferred to next iteration after live verification: Pass 4 (lineage when ancestry exists), Pass 6.2–6.5 (behavioral/foundation/analytics-ingest/calendar emitters), Pass 7 (stripe webhook atomic dedupe), Pass 8 (analyzer metadata stamping).
