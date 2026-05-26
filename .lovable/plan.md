# Wave 2 — Production Hardening & Operational Survivability

Additive overlay on the Wave 1 runtime. Zero schema rewrites, zero parallel runtimes, zero direct-table mutation. Every new surface stays event-derived, lineage-linked, replay-safe, and CI-gated.

## Scope guardrails (non-negotiable)

- Reuse the existing `asb_events` ledger and `emitRuntimeEvent` / `emitAsbEvent` wrappers. No new write paths.
- No new doctrine, no autonomous AI authority, no gamification, no notifications loops.
- All new state is **derived** from events (memoized projections, never mutable truth).
- Every new module must pass `scripts/check-invariants.sh` and the parity matrix.

## Architecture overview

```text
                ┌──────────────────────────────────────┐
                │  asb_events (append-only, sealed)    │
                └──────────────┬───────────────────────┘
                               │ replay
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
   projections/*         ops-telemetry/*         recovery/*
  (memoized, pure)     (derived counters,       (checkpoints,
                        latency, drift)          retry orchestrator)
        │                      │                      │
        ▼                      ▼                      ▼
  athlete/coach UI     /ops/* health surfaces    offline queue
                              │                       │
                              ▼                       ▼
                       CI invariant gate       reconnect reconciler
```

## Deliverables (10 modules, compressed)

### 1. Operational observability (`src/lib/ops/`)
- `telemetry.ts` — pure reducers over recent events: throughput, replay timing, projection latency, override frequency, missingness escalation, confidence degradation. No writes.
- `parityMonitor.ts` — periodic in-browser sampler running `runInvariantSuite` against a rolling window; emits `ops.parity.drift.detected` events when violations appear.
- `queueHealth.ts` — derived view of the offline queue (size, oldest age, retry count).

### 2. Operational UI (`src/pages/ops/` + `src/components/ops/`)
- `/ops/health` — runtime health console (throughput, latency, queue, parity status).
- `/ops/replay` — replay audit explorer (pick event range, replay to projection, diff).
- `/ops/drift` — projection drift monitor (live parity check results + lineage drilldown).
- `/ops/deployment` — deployment integrity screen (invariant suite results, engine version, schema hash).
- Calm, single-column, dense-but-quiet. Owner/admin only.

### 3. Replay recovery (`src/lib/runtime/recovery/`)
- `checkpoints.ts` — deterministic projection checkpoints keyed by `(athlete_id, last_event_id, engine_version)`. Stored in IndexedDB, **invalidated** never mutated.
- `replayOrchestrator.ts` — resumable replay: detect interruption → invalidate stale checkpoint → replay from prior checkpoint → re-verify lineage hash.
- `corruptionGuard.ts` — projection self-check (hash of inputs vs stored hash); on mismatch, drop the projection and recompute. No silent repair.

### 4. Org-scale hardening (`src/lib/asb/scope/`)
- `orgScope.ts` — single chokepoint for `org_id` / `athlete_id` filters on every event query. All projection builders must consume scoped iterators only.
- RLS audit pass on `asb_events` (read-only review via supabase tools); add missing policies via one additive migration if gaps found. No table changes.
- Roster virtualization in coach console (`react-virtual`) for large rosters.

### 5. Authorization & governance (`src/lib/auth/governance/`)
- `roleMatrix.ts` — declarative matrix: `{owner, admin, coach, athlete} × {read_event, replay, override, ops_view, deployment_gate}`.
- `requireRole.tsx` — route + component guard reading `user_roles` (existing table). No role storage on profiles.
- `overrideAuthority.ts` — wraps `emitRuntimeEvent` for override-class topics; rejects emission if caller lacks authority; emission carries `actor_role` in payload for lineage.

### 6. Deployment & environment survivability (`scripts/` + `src/lib/bootstrap/`)
- `scripts/preflight.sh` — runs `check-invariants.sh` + `vitest run --reporter=dot` + parity matrix sweep. Wired into CI as gate.
- `src/lib/bootstrap/bootValidation.ts` — on app boot, verifies engine version + invariant hash + projection schema; on mismatch, blocks runtime surfaces and routes user to `/ops/deployment`.
- Rollback survivability: checkpoints tagged with `engine_version`; mismatched checkpoints are invalidated, not migrated.

### 7. Offline + low-bandwidth continuity (`src/lib/runtime/offline/`)
- `eventQueue.ts` — IndexedDB-backed append-only outbox. `emitRuntimeEvent` enqueues locally first, then flushes.
- `reconciler.ts` — on reconnect: dedupe by client-generated `event_uuid` (already in payload schema), flush in order, drop only on server-confirmed duplicate.
- `degradedMode.tsx` — UI banner + reduced polling cadence when offline; PrescriptionCard renders last-known projection with `state="unknown"` badge if stale.

### 8. Security & abuse safeguards (`src/lib/security/`)
- `eventValidator.ts` — Zod schemas per topic; malformed events rejected at emission and at ingestion edge function (additive update to existing function only).
- `tamperGuard.ts` — payload signature (HMAC with anon key salt) for spoof rejection on the server side.
- `rateLimit.ts` — client-side soft throttle for override emission; server enforces hard cap. (Note: per directive, no new backend rate limiting infra — this is ad-hoc client throttle + existing edge function bounds.)
- `abusePatterns.ts` — derived detector for suspicious override bursts; raises `ops.security.suspicious.detected` event.

### 9. Performance optimization
- Memoize all projection builders with `useMemo` keyed on `(scope, last_event_id)`.
- Batch event queries with `in()` filters per org/athlete window.
- Mobile: defer non-critical panels with `React.lazy`; lock LCP to `PulseStrip`.
- Cache survivability: caches keyed by `last_event_id` → immutable; cache miss recomputes, never patches.

### 10. Production testing suite (`tests/` + `src/lib/asb/invariants/__tests__/`)
- `scale.test.ts` — 10k-event replay sweep, asserts deterministic projection hash.
- `concurrency.test.ts` — interleaved emissions across athletes, asserts no cross-scope leakage.
- `offline.test.ts` — queue → disconnect → reconnect → dedupe assertions.
- `authz.test.ts` — role matrix boundary tests.
- `drift.test.ts` — malformed-event injection, asserts rejection + parity preservation.
- `replay-stress.test.ts` — repeated full replay, asserts byte-identical projections.
- CI fails on: parity drift, replay divergence, authority leakage, hidden mutation (grep guard extended).

## CI enforcement expansion (`scripts/check-invariants.sh`)
Add forbids:
- direct writes to `asb_events` outside `emitRuntimeEvent` / `emitAsbEvent`
- `localStorage`/`sessionStorage` writes carrying runtime truth (allowlist: queue, checkpoints)
- role checks against `profiles` table
- imports from `src/pages/ops/*` outside `src/pages/ops/*` and `src/App.tsx`

## Authorization matrix (summary)

```text
                read_event  replay  override  ops_view  deploy_gate
owner               ✓         ✓        ✓         ✓          ✓
admin               ✓         ✓        ✓         ✓          ·
coach (scoped)      ✓         ✓        ✓         ·          ·
athlete (self)      ✓         ·        ✓(self)   ·          ·
```

## Rollout sequencing
1. Observability reducers + `/ops/health` (read-only, zero risk).
2. Checkpoints + replay orchestrator (behind feature flag).
3. Offline queue + reconciler (behind feature flag).
4. Role matrix + governance guards.
5. Boot validation + preflight CI gate.
6. Security validators + tamper guard.
7. Performance memoization pass.
8. Full test suite expansion + CI gate flip to required.

## Operational risk map
- **Checkpoint staleness** → mitigated by engine-version tagging + hash verify.
- **Offline dedupe race** → mitigated by client UUID + server unique constraint check (read-only verify, no new constraint added unless gap confirmed).
- **Parity false positives** → drift monitor emits events, never auto-mutates; humans triage in `/ops/drift`.
- **Role escalation** → `requireRole` server-revalidates via `getUser()` + `has_role()` RPC (existing).

## Files to be created (compressed list)
`src/lib/ops/{telemetry,parityMonitor,queueHealth}.ts`
`src/pages/ops/{Health,Replay,Drift,Deployment}.tsx` + `src/components/ops/*`
`src/lib/runtime/recovery/{checkpoints,replayOrchestrator,corruptionGuard}.ts`
`src/lib/asb/scope/orgScope.ts`
`src/lib/auth/governance/{roleMatrix,requireRole,overrideAuthority}.ts`
`src/lib/bootstrap/bootValidation.ts`
`src/lib/runtime/offline/{eventQueue,reconciler,degradedMode}.tsx`
`src/lib/security/{eventValidator,tamperGuard,rateLimit,abusePatterns}.ts`
`scripts/preflight.sh` + extended `check-invariants.sh`
`tests/{scale,concurrency,offline,authz,drift,replay-stress}.test.ts`
Additive route wiring in `src/App.tsx`. Optional one additive RLS migration only if audit finds a gap.

## Out of scope (rejected)
New doctrine, autonomous AI, notifications, gamification, schema rewrites, parallel runtimes, mutable projections, server-side rate-limit infra (per directive).

---

## Wave 2 — Implementation log

Shipped additive overlay (no schema changes, no parallel runtimes):

- **Ops observability**: `src/lib/ops/{telemetry,parityMonitor,queueHealth}.ts` — pure reducers, no writes.
- **Recovery**: `src/lib/runtime/recovery/{checkpoints,corruptionGuard,replayOrchestrator}.ts` — IndexedDB checkpoints keyed by `(athleteId, lastEventId, engineVersion)`, invalidated on mismatch (never mutated).
- **Offline continuity**: `src/lib/runtime/offline/{eventQueue,reconciler}.ts` — IndexedDB outbox, dedupe via server unique key.
- **Scope chokepoint**: `src/lib/asb/scope/orgScope.ts` — all event queries route through scoped filter.
- **Authorization**: `src/lib/auth/governance/{roleMatrix,requireRole,overrideAuthority}.ts` — declarative matrix over existing `user_roles`.
- **Security**: `src/lib/security/{eventValidator,rateLimit}.ts` — structural validation + client-side soft throttle.
- **Bootstrap**: `src/lib/bootstrap/bootValidation.ts` — engine_version + runtime capability checks.
- **Ops UI**: `/ops/health`, `/ops/replay`, `/ops/drift`, `/ops/deployment` wired in `App.tsx` behind `RequireCapability`.
- **CI gates**: `scripts/check-invariants.sh` extended (rules 6–8), `scripts/preflight.sh` added.
- **Tests**: `src/lib/ops/__tests__/wave2.test.ts` — 8 deterministic tests covering telemetry, queue health, corruption guard, role matrix, rate limit, validator. All pass; full invariant suite passes.
