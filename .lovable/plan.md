
# Demo System Finalization Plan

Transform the existing demo into a hardened, conversion-engineered system. Every simulation becomes a **Cause → Diagnosis → Insight → Prescribed Videos → Lock** loop.

---

## PHASE 1 — Critical Fixes

### 1. Fix DemoModeProvider (real context propagation)
`src/contexts/DemoModeContext.tsx` already wraps `Context.Provider` correctly, but `value` defaults to `true` (boolean). Tighten:
- Remove boolean shortcut. Require explicit `{ isDemo, isPreview, tier?, submodule? }`.
- Add `useDemoModeStrict()` that throws if used outside a provider (guards real routes).
- Memoize value object to prevent re-render storms.

### 2. Global Demo Firewall
**Server** — `supabase/functions/_shared/demoFirewall.ts`:
- Add `withDemoProtection(handler, { allowReads?: boolean })` HOF wrapping every edge function.
- On `x-demo-session: 1`: short-circuit with 403 + log to `demo_events` (action=`blocked_write`, function name, path).
- Wrap all mutating edge functions (audit list — anything that writes). Reads pass-through when `allowReads`.

**Client** — `src/demo/guard.ts`:
- Export `demoSafeSupabase` proxy that wraps `from(table).insert/update/upsert/delete/rpc` and throws via `assertNotDemo` when the surrounding `useDemoMode().isDemo === true`.
- All demo shells must use `demoSafeSupabase` (lint rule via comment + README).
- Auto-inject `x-demo-session: 1` header on `supabase.functions.invoke` when in demo (via wrapper hook `useDemoFunctions()`).

### 3. Harden Completion Engine
Update `src/demo/completionRules.ts` + `demo_progress` schema:
- Add columns: `interaction_counts jsonb` (`{ submodule_slug: count }`), `dwell_ms jsonb` (`{ submodule_slug: ms }`).
- New rule: complete iff `tiers≥2 AND categories≥2 AND submodules≥4 AND ≥2 submodules have (count≥3 OR dwell≥20000ms)`.
- `useDemoDwell(slug)` hook: tracks visibility-aware time on submodule, flushes to server on unmount/visibilitychange (debounced, capped at 5 min/slug).

### 4. Anti-spam / Event Protection
`src/hooks/useDemoProgress.ts`:
- Debounce `markViewed` (500ms trailing) per slug.
- Dedup: skip server write if `(slug, action)` was logged in last 2s (in-memory `Map<string, ts>`).
- Per-session token-bucket rate limit: 30 events/min; excess → drop + single warn event.
- Server-side `demo_events` insert RPC enforces same cap via `count() over last 60s` check.

### 5. Failure + Fallback System
- Bundle a **static fallback registry** at `src/demo/fallbackRegistry.ts` (compiled from seed). `useDemoRegistry` falls back if Supabase fetch fails AND localStorage cache empty.
- Retry with exponential backoff (250/500/1000ms, max 3) on registry + progress fetches.
- `useDemoProgress`: if write fails, queue to `localStorage` and replay on reconnect (BroadcastChannel + `online` listener).
- Top-level `<DemoErrorBoundary>` in `DemoLayout` and `StartHereRunner` showing safe "Continue Tour" UI; never blank screen.

---

## PHASE 2 — Conversion Engine

### 6. Core Loop Restructure (every shell)
Every shell renders 5 stacked sections (shared `<DemoLoopShell>` component in `src/components/demo/DemoLoopShell.tsx`):

```text
[1 INPUT]      user controls (existing)
[2 DIAGNOSIS]  raw metrics block (existing)
[3 INSIGHT]    what's wrong / why / elite standard
[4 PRESCRIBED] 3 locked video cards (thumbnail + title + purpose + expected gain)
[5 LOCK CTA]   personalized headline + Unlock button → /demo/upgrade?from=<slug>&reason=<diag>
```

### 7. Upgrade Simulation Outputs
Extend each sim's output type to include `benchmark` block:
- `yourResult`, `eliteBenchmark`, `gap`, `projectedImprovement` (string + numeric delta), `severity: 'minor'|'moderate'|'critical'`.
- `hittingSim`: elite EV by age cohort (use existing `data/baseball/velocityBands`); compute gap vs 95th percentile.
- `programSim`: elite weekly volume vs prescribed; project "X% strength gain in 8 wks".
- `vault`-style demos: gap = "missing data layers".

### 8. Primary Conversion Moment
New file `src/demo/prescriptions/conversionCopy.ts` mapping `(simId, severity) → headline`:
- Hitting critical: "You're leaving **{gap} mph** on the table. 3 drills fix this — already mapped for you."
- Iron Bambino: "Your plan misses **{gap}%** of elite weekly load. Unlock the full 7-day build."
- Vault: "{gap} performance layers hidden. Unlock to see your real ceiling."

Rendered in `[5 LOCK CTA]` band, large, with destination `/demo/upgrade?from=<slug>&reason=<severity>&gap=<n>`.

### 9. Video Prescription Engine
New module `src/demo/prescriptions/videoPrescription.ts`:
```ts
prescribe(simId, output): PrescribedVideo[]  // exactly 3, deterministic
```
- Backed by static map keyed by `(simId, severity, primaryAxis)` → array of `library_video.id` references.
- Each `PrescribedVideo`: `{ id, title, purpose, expectedImprovement, thumbnailUrl }`.
- Shells call `prescribe()` and pass to `<PrescribedVideoStrip locked />`.
- Map lives in DB later via `demo_video_prescriptions` table (slug, severity_band, video_ids[], display_order) — for now seed in code, structured for trivial DB migration.

### 10. Locked Content UI
New `src/components/demo/PrescribedVideoCard.tsx`:
- Shows real thumbnail (or generated gradient placeholder), title, 1-line purpose, "Expected: +Xmph" badge.
- Visual lock: blurred lower half + lock icon + "Unlock" button (no autoplay, no video element mounted).
- Click → `/demo/upgrade?from=<slug>&video=<id>`.

---

## PHASE 3 — System Hardening

### 11. Registry Validation
New `src/demo/registryValidator.ts` runs on `useDemoRegistry` load:
- Unique slugs (per node_type).
- Every `category.parent_slug` exists as tier; every `submodule.parent_slug` exists as category.
- Required fields: `slug, title, node_type, display_order`.
- Orphan submodules excluded from sequence + reported via `console.error` + `demo_events` (`registry_invalid`).
- Server-side: SQL CHECK + new validation trigger on `demo_registry` insert/update enforcing same.

### 12. Start Here Hardening
`StartHereRunner.tsx`:
- Snapshot `recommendedSequence` into local state on mount (immune to mid-session registry reloads).
- If a node's `component_key` is missing/unregistered, skip with toast "Preview unavailable, advancing".
- Validate `step` param is in `[0, sequence.length)`; clamp + replace URL.
- Persist current step to `demo_progress.resume_path = '/start-here?step=N'` on each advance.

### 13. Routing Protection
- `DemoGate.tsx`: extend to **block** any `/dashboard|/training|/nutrition|/vault|/select-modules|/pricing|/checkout` access for `demo_state IN ('pending','in_progress')` users → redirect to `/start-here`.
- `RealRouteGuard` (new): assert `useDemoMode().isDemo === false` on real routes (mounted in `App.tsx` for non-demo subtrees).
- `/demo/upgrade` is the single upgrade entry; `/pricing` direct hits redirect through it for demo-incomplete users.

### 14. Expansion Guarantee
- New submodule = insert into `demo_registry` only. No code change required *unless* a custom shell desired.
- New shell = drop file in `src/components/demo/shells/` + add key to `DemoComponentRegistry.ts`. Missing key falls back to generic `<GenericSimShell>` driven by registry-defined `default_metrics`.
- New prescription = insert into `demo_video_prescriptions` table (when migrated) — zero code.
- `ab_variant` already on registry; future personalization reads `useUser()` traits and filters sequence.

---

## Database Migration

```sql
ALTER TABLE demo_progress
  ADD COLUMN interaction_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN dwell_ms jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE demo_video_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sim_id text NOT NULL,
  severity_band text NOT NULL CHECK (severity_band IN ('minor','moderate','critical')),
  primary_axis text,
  video_refs jsonb NOT NULL,  -- [{id,title,purpose,expected,thumb}]
  display_order int NOT NULL DEFAULT 0,
  is_active bool NOT NULL DEFAULT true,
  UNIQUE(sim_id, severity_band, primary_axis)
);
ALTER TABLE demo_video_prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read prescriptions" ON demo_video_prescriptions
  FOR SELECT USING (is_active);

-- Validation trigger on demo_registry
CREATE OR REPLACE FUNCTION validate_demo_registry_node() RETURNS trigger ...
  -- enforces parent existence + slug uniqueness per node_type
```

Plus `demo_events` rate-limit RPC + index on `(session_id, created_at)`.

---

## Files

**New**
- `src/components/demo/DemoLoopShell.tsx`
- `src/components/demo/PrescribedVideoCard.tsx`
- `src/components/demo/GenericSimShell.tsx`
- `src/components/demo/DemoErrorBoundary.tsx`
- `src/demo/prescriptions/videoPrescription.ts`
- `src/demo/prescriptions/conversionCopy.ts`
- `src/demo/fallbackRegistry.ts`
- `src/demo/registryValidator.ts`
- `src/hooks/useDemoDwell.ts`
- `src/hooks/useDemoFunctions.ts`
- `src/components/demo/RealRouteGuard.tsx`
- `supabase/migrations/<ts>_demo_hardening.sql`

**Edited**
- `src/contexts/DemoModeContext.tsx` (strict shape + memo)
- `src/demo/guard.ts` (add `demoSafeSupabase` proxy)
- `src/demo/completionRules.ts` (interaction + dwell rules)
- `src/demo/sims/hittingSim.ts`, `programSim.ts` (add benchmark/gap/severity)
- `src/components/demo/shells/HittingAnalysisDemo.tsx`, `IronBambinoDemo.tsx`, `VaultDemo.tsx` (rebuild on `DemoLoopShell`)
- `src/hooks/useDemoProgress.ts` (debounce, dedup, rate-limit, retry queue, dwell/interaction writes)
- `src/hooks/useDemoRegistry.ts` (retry + fallback + validator)
- `src/components/demo/DemoGate.tsx` (extend gated paths)
- `src/pages/start-here/StartHereRunner.tsx` (snapshot sequence, clamp step, resume)
- `src/pages/demo/DemoUpgrade.tsx` (read `from/reason/gap` to personalize headline)
- `supabase/functions/_shared/demoFirewall.ts` (`withDemoProtection` HOF)
- All write edge functions: wrap export with `withDemoProtection`

---

## Weaknesses Fixed (audit)

1. Provider could be invoked with boolean → strict shape now required.
2. Firewall not enforced per-function → mandatory `withDemoProtection` HOF.
3. No client-side write blocker → `demoSafeSupabase` proxy + assertions.
4. Completion based only on view counts → adds interaction depth + dwell.
5. `markViewed` could spam DB → debounce + dedup + rate-limit + RPC cap.
6. Registry fetch single point of failure → retry + cache + bundled fallback.
7. Shells delivered insight-free results → mandatory 5-step loop with prescribed videos.
8. No conversion specificity → personalized gap-based copy + deterministic prescriptions.
9. Locked content was vague → real thumbnails, expected gains, blurred lock UI.
10. Registry could carry orphans → validator + DB trigger.
11. Start Here vulnerable to mid-session registry change → snapshot + clamp + resume_path.
12. Real routes could leak demo state / vice versa → `RealRouteGuard` + extended `DemoGate`.
13. Adding features required code edits → registry-driven `GenericSimShell` + DB-driven prescriptions table.
14. No graceful degradation on Supabase outage → retry queue + ErrorBoundary + offline replay.

After approval, I will implement in the order listed (DB migration → firewall → provider/guard → completion/anti-spam → fallbacks → conversion loop → prescription engine → routing/validation → expansion plumbing).
