# Final Pre-Launch Operations Pass

Strictly operational. No new primitives, no doctrine, no megaphases. Presentation-mode lock honored.

## Section 1 — Node-safe seed runner

Create `scripts/seed-relational-demo-node.ts`:

- Uses `@supabase/supabase-js` directly with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from `process.env`, configured with `auth: { persistSession: false, autoRefreshToken: false, storage: undefined }` so no `localStorage` dependency.
- Reuses canonical `buildDemoSeed()` from `src/lib/runtime/relational/__tests__/_seed.ts` (already the single source of truth shared with the fixture fallback).
- Routes every row through canonical emit path: imports `emitAsbEvent` + `emitAsbLineage` helpers (server-safe variant — uses `src/lib/asb/emit.ts` if Node-safe, otherwise inlines the same canonical insert with idempotency_key derivation matching `supabase/functions/_shared/asbEmit.ts`). No raw `.insert()` shortcuts; no parallel schema.
- Same UUIDs, same lineage edges, same `engine_version`, same idempotency keys → re-run is a no-op (23505 dedupe).
- Run: `bun run scripts/seed-relational-demo-node.ts` (bun executes Node-compatible TS; falls back to `tsx` if needed).

Verification:
- `SELECT count(*) FROM asb_events WHERE athlete_id = '00000000-0000-4000-8000-000000000001'` — expect == `buildDemoSeed().length`.
- `SELECT count(*) FROM asb_event_lineage WHERE child_event_id IN (...)` — expect == lineage edge count emitted by seed.
- Re-run existing replay reconstruction test against live-seeded athlete by fetching rows via `supabase--read_query` and feeding them through the four projection functions, asserting `stableStringify` parity with fixture output.

## Section 2 — Live device smoke test

Use the browser tool against `/relational/demo?fallback=fixture` (and once against live-seeded `/relational/demo`):

- Viewports: 390×844 (iPhone) and 1280×720 (desktop).
- Scenarios: cold refresh per step, slow-3G network throttle, offline fallback (`?fallback=fixture` with Supabase blocked).
- Walk all 9 steps: Start Here → Today → Journey → Developmental → Slump Reload → Hammer Conversation → Parent Trust → Recruiting → Injury → Replay Proof.
- Capture screenshot per step per viewport. Check console logs and network for errors, undefined flashes, hydration mismatches, stuck spinners.

Deliverable: pass/fail per step + screenshot bundle written to `/mnt/documents/launch-smoke/`.

## Section 3 — Purchase / onboarding flow audit

Trace the path from "I want this" → first usable surface:
- Read `src/pages/Pricing.tsx`, `src/pages/Success.tsx`, `src/contexts/AuthContext.tsx`, `src/pages/OnboardingFlow.tsx`, auth/signup routes registered in `src/App.tsx`, `src/pages/SelectUserRole.tsx`, `src/pages/SelectSport.tsx`, `src/pages/start-here/StartHereRunner.tsx`.
- Confirm: signup → email verification → role select → sport select → onboarding steps → first today surface, with no dead ends on mobile (440px).
- Check `redirectTo` URLs, post-success routing, refresh-mid-flow resilience, presence of `/reset-password`.

Deliverable: numbered onboarding path table with risk points (severity + mitigation). Only doc edits; no flow code changes unless a hard bug is found, in which case it's a contained null-guard / redirect fix.

## Section 4 — Demo mode isolation proofs

Explicit violation attempts:
1. Load `/relational/demo?fallback=fixture` with DevTools network tab — confirm zero `asb_events` POST requests.
2. Confirm fixture rows have `visibility_scope: "demo"` and Phase 151 firewall in `src/lib/runtime/projections/types.ts::prepareRows` strips them under `"self"` scope (covered by test `(4) demo firewall`; re-run).
3. Load `/relational/demo` without `?fallback=fixture` and without `?presenter=1` — confirm `PresenterOverlay` not rendered and `debug` chips not shown.
4. Visit a production route (`/today`, `/relational`) with a real user and confirm projections return no demo rows.

Deliverable: 4-row pass/fail report appended to `docs/asb/relational-operational-truth-audit.md`.

## Section 5 — Final launch risk table

Single markdown table covering: onboarding confusion, auth instability, mobile layout, network dependency, projection cold-start, emotional clarity, support burden, live seed failure, device/browser variance. Columns: Risk | Severity | Likelihood | Mitigation | Status.

## Section 6 — Final verdict

One of READY / READY WITH CONDITIONS / NOT READY, justified strictly by Sections 1–5 evidence. If READY: explicit stable-surface list, explicit future-work list, explicit "do/don't promise tomorrow" guidance.

## Deliverables

- `scripts/seed-relational-demo-node.ts` (new)
- `/mnt/documents/launch-smoke/` screenshot bundle
- `docs/asb/relational-launch-readiness.md` (new — Sections 2–6 report)
- Append isolation proof to `docs/asb/relational-operational-truth-audit.md`

## Scope guardrails

- No new ASB topics, primitives, doctrine, schemas, or routes.
- Only allowed code edits: the new Node seed script, plus contained null-guards / copy fixes if smoke test surfaces a real bug.
- Presentation-mode lock honored throughout.
