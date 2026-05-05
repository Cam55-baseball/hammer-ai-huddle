# Phase X.3 — Demo Integrity Verification, Telemetry & Weight Tuning

Locks the demo system with provable isolation, live observability, and runtime-tunable scoring — no logic redeploys needed.

---

## 1. Structured Telemetry in `src/demo/guard.ts`

Add a non-blocking event emitter:

```ts
function logDemoEvent(type: string, payload: Record<string, unknown>) {
  try {
    const ch = new BroadcastChannel('demo-events');
    ch.postMessage({ type, payload, ts: Date.now() });
    ch.close();
  } catch {}
}
```

Replace existing `console.warn` calls:
- Blocked read → `logDemoEvent('sim_read_blocked', { table })`
- Blocked rpc → `logDemoEvent('sim_rpc_blocked', { fn: String(args[0]) })`
- Blocked write → `logDemoEvent('sim_write_blocked', { method: String(prop) })`

Keep `console.warn` in DEV alongside the emit for local debugging.

---

## 2. Persist Telemetry → DB

**New** `src/demo/useDemoTelemetry.ts` — subscribes to `BroadcastChannel('demo-events')` and inserts rows into `demo_events` (`event_type`, `metadata`, `created_at`). Wrapped in try/catch; fully fire-and-forget.

The existing `demo_events` table uses column `metadata` (jsonb) — the hook will map `payload → metadata` to match the current schema. No migration needed.

Mount once in `src/components/demo/DemoLayout.tsx` (single global mount point for all demo routes) via `useDemoTelemetry()`.

---

## 3. Runtime-Tunable Completion Weights

Update `src/demo/completionRules.ts`:

- Rename `COMPLETION_WEIGHTS` → `DEFAULT_WEIGHTS` (keep export for back-compat).
- Add `getWeights()` reading `localStorage.demo_completion_weights` with strict numeric validation; fallback to defaults on any parse/shape failure.
- Add `assertWeights(w)` — warns when `|sum - 1| > 0.01`.
- `computeCompletion()` calls `getWeights()` + `assertWeights()` instead of using the static const.

Behavior unchanged in production (no localStorage key set).

---

## 4. Dev Console Helper

**New** `src/demo/devtools.ts` exporting `setDemoWeights(w)` which writes to localStorage and reloads. Imported once in `DemoLayout` via side-effect to attach to `window` for console access:

```ts
if (import.meta.env.DEV) (window as any).setDemoWeights = setDemoWeights;
```

---

## 5. Optional Debug Overlay

**New** `src/components/demo/DemoDebugPanel.tsx` — fixed bottom-right `<pre>` showing `progress` JSON. Renders only when `localStorage.demo_debug === '1'`. Mounted in `DemoLayout` next to header, receives `progress` from `useDemoProgress()`.

---

## 6. E2E Isolation Tests

**New** `tests/demo/isolation.spec.ts` (Playwright — config already exists at `playwright.config.ts`):

- Blocks non-demo tables: `supabase.from('profiles').select('*')` → `data: []`, `error: null`.
- Allows demo-safe tables: `supabase.from('demo_registry').select('*')` → no error, array.
- Blocks rpc: `supabase.rpc('some_sensitive_fn')` → `data: null`.

Requires exposing `supabase` on `window` in DEV only — add to `src/integrations/supabase/client.ts`? **No** (client.ts is auto-generated, off-limits). Instead expose in `DemoLayout` mount under `import.meta.env.DEV` so tests running against the dev server can access it without polluting prod.

---

## 7. Unit Test for Completion Math

**New** `src/demo/completionRules.test.ts` (vitest, matches existing `*.test.ts` pattern):

- `computeCompletion({ tiers:1, categories:1, submodules:1, interactionCounts:{}, dwellMs:{} })` returns `pct > 0`.
- Custom weights via mocked localStorage produce expected weighted sum.
- `assertWeights` warns when sum drifts (spy on `console.warn`).

Note: existing field is named `pct`, not `percent` — test will use `pct`.

---

## Files

**New (6)**:
- `src/demo/useDemoTelemetry.ts`
- `src/demo/devtools.ts`
- `src/components/demo/DemoDebugPanel.tsx`
- `tests/demo/isolation.spec.ts`
- `src/demo/completionRules.test.ts`

**Edited (3)**:
- `src/demo/guard.ts` — emitter + 3 swap-ins
- `src/demo/completionRules.ts` — runtime weights + assertion
- `src/components/demo/DemoLayout.tsx` — mount telemetry hook, debug panel, dev `window.setDemoWeights`

**No migration. No new dependencies. Zero impact on non-demo routes.**

---

## Outcomes

| Capability | Mechanism |
|---|---|
| Proof of isolation | Playwright spec |
| Live observability | BroadcastChannel → `demo_events` insert |
| Runtime tuning | localStorage-backed weights |
| Math drift safety | `assertWeights` warning |
| State introspection | Toggleable debug overlay |
