
## Phase 12.2 Safeguard — Silent Telemetry for Dropped NNs

When `buildNNContext` returns `null`, we currently lose visibility into which templates are being silently dropped. This adds lightweight, fire-and-forget telemetry so we can observe the rate and shape of invalid NNs in production — with zero UX impact.

### Scope (strictly limited)
- **No** UI changes
- **No** retries, queues, or blocking behavior
- **No** schema/migration changes
- **No** scoring/evaluator changes

### Changes

**1. New file — `src/lib/nnTelemetry.ts`**

Exports `trackNNInvalidDropped({ templateId, completion_type, missing_fields })`:
- Tries `window.analytics.track('NN_INVALID_DROPPED', payload)` first (forward-compatible if an analytics provider is added later).
- Falls back to a `fetch` POST to `/api/telemetry/nn-invalid` with `keepalive: true`. Since this is a Vite SPA with no API routes, the request will 404 — that's fine because:
  - `.catch(() => {})` swallows the network error
  - Wrapped in `try/catch` so nothing throws
  - `keepalive: true` means it won't block navigation
- The endpoint can be wired later (edge function or analytics provider) without touching callers.

**2. Update `src/lib/nnContract.ts`**

In `buildNNContext`, when validation fails:
- Collect `missing_fields` from `validateNNFields` errors (keys whose value is truthy).
- Call `trackNNInvalidDropped({ templateId, completion_type, missing_fields })`.
- In dev (`process.env.NODE_ENV !== 'production'`), `console.warn('[HM-NN-INVALID]', { id, errors })` for fast local debugging.
- Return `null` as before — render guard behavior unchanged.

Refactor note: the existing code calls `validateNNFields` then destructures only `{ ok }`. We'll keep the full `result` so we can read `result.errors` for the missing-fields list.

### Guarantees
- Telemetry can never throw (outer `try/catch` + inner `.catch`).
- `buildNNContext` return value is unchanged — still `null` on failure, still `NNContext` on success.
- No new dependencies.
- Production console stays clean (warn is dev-only).

### Verification (manual, post-deploy)
- Load Game Plan with a known-invalid legacy NN → in dev, see `[HM-NN-INVALID]` warn with the field list; card still hidden.
- Production build → no console noise; `NN_INVALID_DROPPED` fires (visible in network tab as a failed POST until an endpoint exists).
