
# Demo System Hardening — 6 Critical Fixes

Addresses every issue raised. Surgical, no scope creep.

---

## 1. DB: Replace slug-based hierarchy with `parent_id` + native UNIQUE INDEX

**Migration** (`supabase/migrations/<ts>_demo_registry_relational.sql`):

- Add `parent_id uuid REFERENCES public.demo_registry(id) ON DELETE CASCADE` (nullable for tiers).
- Backfill: `UPDATE demo_registry c SET parent_id = p.id FROM demo_registry p WHERE c.parent_slug = p.slug AND ((c.node_type='category' AND p.node_type='tier') OR (c.node_type='submodule' AND p.node_type='category'));`
- `CREATE UNIQUE INDEX demo_registry_unique_slug_type ON public.demo_registry (slug, node_type);`
- `CREATE INDEX demo_registry_parent_id_idx ON public.demo_registry (parent_id);`
- Rewrite `validate_demo_registry_node()`: drop the slug-uniqueness branch (now handled by index); validate hierarchy via `parent_id` + `node_type` of parent row. Keep `parent_slug` in sync as a denormalized convenience column (trigger fills it from parent).
- Keep `parent_slug` column for backward compat but mark it derived.

**Code**: `src/hooks/useDemoRegistry.ts` — extend `DemoNode` with `parent_id`. Filtering helpers (`categoriesOf`, `submodulesOf`) keep slug-based public API (no UI churn) but internally use `parent_id` when available, fallback to `parent_slug`.

---

## 2. Fix broken `DemoModeProvider` + decouple demo vs preview

`src/contexts/DemoModeContext.tsx`:

```tsx
return (
  <DemoModeContext.Provider value={shape}>
    {children}
  </DemoModeContext.Provider>
);
```

Update boolean coercion:
```ts
if (typeof value === 'boolean') return { isDemo: value, isPreview: false };
```

Add explicit `isPreview` plumbing where any caller currently passes `true` expecting preview semantics — audit `DemoLayout`, `DemoSubmodule`, `StartHereRunner` callers and pass `{ isDemo: true, isPreview: false }` (preview is a distinct future concept).

---

## 3. Harden Supabase READ isolation in demo

`src/demo/guard.ts` — extend `makeDemoSafeClient`:

- Add `BLOCKED_TABLES` set (sensitive real-data tables): `profiles`, `subscriptions`, `athlete_daily_log`, `custom_activity_logs`, `performance_sessions`, `library_videos` (writes), `user_roles`, `payments`, `hie_*`, `engine_*`, `vault_*`, `nutrition_*`, plus a configurable allowlist for demo-safe tables (`demo_registry`, `demo_progress`, `demo_events`, `demo_video_prescriptions`).
- Wrap `.from(table)`: if `isDemo()` and table not in `DEMO_SAFE_TABLES` → return a synthetic builder whose terminal awaits resolve to `{ data: [], error: null }` and which logs a `demo_events` row (`event_type: 'sim_read_blocked'`).
- Fully wrap `.rpc()` already done — confirm same blocklist semantics.
- Keep existing write blocker.

This makes accidental `supabase.from('profiles').select('*')` in a demo subtree return empty + telemetry, never real data.

---

## 4. Weighted completion scoring

`src/demo/completionRules.ts`:

```ts
export const COMPLETION_WEIGHTS = {
  tiers: 0.15,
  categories: 0.20,
  submodules: 0.35,
  deep: 0.30,
} as const;
```

Replace mean with weighted sum in `computeCompletion`:
```ts
const pct = Math.round(
  (axes.tiers * W.tiers + axes.categories * W.categories +
   axes.submodules * W.submodules + axes.deep * W.deep) * 100
);
```
Hard `isComplete` thresholds unchanged (still gated on minimums). Only the displayed % becomes psychologically accurate.

---

## 5. Prescription state continuity

**Migration**: extend `demo_progress`:
```sql
ALTER TABLE public.demo_progress
  ADD COLUMN IF NOT EXISTS prescribed_history jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sim_signatures jsonb NOT NULL DEFAULT '{}'::jsonb;
```
Shape:
- `prescribed_history`: `{ [simId]: { shown: string[], skipped: string[], accepted: string[] } }`
- `sim_signatures`: `{ [simId]: { firstRun: { severity, gap, ts }, lastRun: {...}, runs: number } }` — for future before/after comparison.

**Code**:
- New `src/demo/prescriptions/prescriptionContinuity.ts`:
  - `nextPrescription(simId, severity, history)` — filters `CATALOG[simId][severity]` to remove already-shown ids; if pool exhausted, escalates to next severity tier; always returns 3.
  - `recordPrescriptionShown`, `recordSimRun(simId, output)` helpers.
- `DemoLoopShell.tsx`: call `recordSimRun` + `recordPrescriptionShown` on mount (debounced via existing useDemoInteract pipeline; goes through `useDemoProgress` writes which already have firewall + retry).
- `videoPrescription.ts.prescribe()` accepts optional `history` arg and delegates to continuity layer.

---

## 6. Stale-state safety in `useDemoProgress`

`src/hooks/useDemoProgress.ts`:

- Audit every `setProgress(...)` call site. Convert ALL mutators to functional form:
  ```ts
  setProgress(prev => {
    if (!prev) return prev;
    const subs = new Set(prev.viewed_submodules);
    subs.add(slug);
    return { ...prev, viewed_submodules: [...subs] };
  });
  ```
- Add a `progressRef = useRef(progress)` synced via `useEffect`, used as the read source inside async retry/queue flushes (never closes over stale `progress`).
- Persist queue (`localStorage`) reads from `progressRef.current`, not closure.
- BroadcastChannel inbound messages also reduce via `setProgress(prev => merge(prev, incoming))` with a `last_write_ts` tiebreaker (LWW per field), preventing tab-A overwriting tab-B's newer increment.

---

## Files Touched

**Migration (1)**: relational `parent_id` + unique index + trigger rewrite + `prescribed_history`/`sim_signatures` columns.

**Edited**:
- `src/contexts/DemoModeContext.tsx` (Provider render fix + decouple)
- `src/demo/guard.ts` (read isolation)
- `src/demo/completionRules.ts` (weights)
- `src/hooks/useDemoRegistry.ts` (parent_id support)
- `src/hooks/useDemoProgress.ts` (functional setState + refs + LWW merge)
- `src/demo/prescriptions/videoPrescription.ts` (continuity hook-in)
- `src/components/demo/DemoLoopShell.tsx` (record sim runs + prescriptions; CTA already personalized via existing `conversionCopy`)
- `src/integrations/supabase/types.ts` (auto-regen after migration)

**New**:
- `src/demo/prescriptions/prescriptionContinuity.ts`

---

## Failure Modes Closed

| Risk | Closed by |
|---|---|
| Slug rename breaks hierarchy | `parent_id` FK |
| Trigger logic drift on uniqueness | Native UNIQUE INDEX |
| Demo provider renders nothing | Provider JSX fix |
| Real PII leaks via `.select()` in demo | Read blocklist + safe-table allowlist |
| Inflated/deflated completion % | Weighted axes |
| Repeat prescriptions = trust loss | History-aware filter + escalation |
| Stale closures wipe progress | Functional setState + ref + LWW merge |
| Cross-tab overwrite | LWW tiebreaker on BroadcastChannel merge |

No new dependencies. Zero impact on non-demo routes (all changes guarded by `isDemo`).
