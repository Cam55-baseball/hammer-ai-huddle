
# Final Pre-Publish Lock Pass

Scope-bound to presentation lock (docs/asb/presentation-mode-lock.md): no architecture, no new primitives, no schema, no doctrine. Only audit, docs, and contained bug fixes if a real violation is found.

## Section 1 — Publish Safety Static Audit

Run targeted ripgrep sweeps across the relational surface and report exact `file:line` violations. No edits unless a hard violation surfaces.

Paths:
- `src/components/relational/**`
- `src/pages/RelationalDemo.tsx`, `src/pages/Relational.tsx`
- `src/lib/runtime/**` (projections + relational fixture)
- `src/lib/relational/**`
- `src/hooks/useAsbTimeline.ts`, `src/hooks/useRelationalProjections.ts`

Checks (each = one `rg` pass):
1. `TODO|FIXME|XXX|HACK` in those paths
2. `console\.(log|debug|info|warn|error)` (warn/error allowed only in genuine error branches — flag for review)
3. Mock/debug labels rendered without a query-param gate (`debug`, `presenter`, `mock`, `fixture` literals in JSX without surrounding `?debug=1`/`?presenter=1` guard)
4. Direct `supabase.from(` in `src/components/relational/**` or relational hooks other than `useAsbTimeline` (which is the single canonical reader)
5. Hardcoded `localhost`, `127.0.0.1`, `http://`, or dev-only URLs
6. `PresenterOverlay` import sites — confirm every render site is gated by `?presenter=1`
7. Potential null-render: `.map(` / `.[0]` on projection outputs without a guard in the relational components

Deliverable: a violations table in the chat reply (file, line, snippet, severity). If severity = blocker, switch to fix-mode for that single item only.

## Section 2 — Post-Camp Productionization Backlog

Create `docs/asb/post-camp-productionization-backlog.md`. Pure documentation, no code.

Structure: brief preamble (subordinate to presentation lock and Megaphase 151–160; nothing here may execute until lock lifts), then 16 numbered entries in this fixed order:

1. Relational topic registry registration (the 13 `relational.*` topics into `asb_topic_registry`)
2. Live relational seeding enablement (Node seeder + topic FKs)
3. Production relational onboarding
4. Authenticated relational persistence
5. Live parent account linkage
6. Recruiter workflow activation
7. Injury lifecycle production wiring
8. `narrative_event` implementation (RR-5)
9. `life_context_event` implementation (RR-8)
10. `exposure_event` implementation (RR-9)
11. `recruiter_contact_event` implementation (RR-10)
12. `career_arc` implementation (RR-7)
13. RR-4…RR-10 invariant sealing
14. Live replay observability dashboards
15. Production projection performance profiling
16. Full relational orchestration completion audit

Each entry uses identical fields:
- **Objective** — one sentence
- **Dependency chain** — ordered list of prerequisite items by number
- **Risk level** — Low / Medium / High / Critical
- **Constitutional constraints** — invariant families it must honor (Eternal Laws, RR-1…RR-3 sealed, Phase 151 firewall, Megaphase 151–160, etc.)
- **Estimated order** — integer 1–16

Closes with explicit statement: backlog is reference-only; nothing here is in-scope until presentation lock is lifted.

## Section 3 — Presentation Route Verification

Verify `/relational/demo?fallback=fixture` against five conditions. Read-only investigation first; report findings; only fix if a hard blocker is confirmed.

Verification steps:
1. Trace fixture path: `RelationalDemo.tsx` → `useRelationalProjections` → `useAsbTimeline` (fixture branch) → `demoFixture.buildDemoSeed()`. Confirm zero Supabase calls when `fallback=fixture`.
2. Grep every relational component for `supabase.` / `useQuery` outside `useAsbTimeline` to confirm no parallel DB reads.
3. Hard-refresh / cold-start: confirm state machine (`stepIdx`) initializes deterministically; `requestAnimationFrame` warm already in place.
4. Mobile (440×782 — current viewport): visually walk all 9 steps via browser tools, capture screenshots to `/mnt/documents/launch-smoke/route-lock/`.
5. Without `?presenter=1`: confirm `PresenterOverlay` is not in the DOM.
6. Offline: DevTools-equivalent — confirm no network requests to `/rest/v1/asb_events` on the fixture route by inspecting the timeline hook branch logic.

Deliverable: 6-row pass/fail table. If any row fails with a code root cause, list the file paths blocking and request scope expansion.

## Section 4 — Final Publish Checklist

Create `docs/asb/final-publish-checklist.md` with checkbox sections:

- **Environment** — `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` present; no dev URLs in bundle; `import.meta.env.DEV` guards intact.
- **Mobile viewport** — 390×844 and 440×782 walkthrough pass.
- **Fallback** — `?fallback=fixture` returns non-empty projections; no `asb_events` POST/GET during walk.
- **Routes** — `/relational/demo`, `/relational/demo?fallback=fixture`, `/relational/demo?fallback=fixture&presenter=1` all reachable; 404 unaffected.
- **Auth safety** — unauthenticated visit to fixture route does not trigger redirects or auth modals.
- **Production build** — `vite build` clean, no type errors, no warnings beyond known baseline.
- **Demo route** — choreography Begin → 9 steps → End completes without crash; back navigation stable.
- **Rollback** — published URL revert path documented (use Lovable version history; identify last known-good publish hash and the fixture URL as canonical fallback). Include "if demo is unstable mid-camp, narrate from screenshots in `/mnt/documents/launch-smoke/`" as last-resort.

## Section 5 — Final Readiness Verdict

Single verdict line (READY TO PUBLISH / READY WITH CONDITIONS / NOT READY), justified strictly from Sections 1, 3, 4 evidence. Expected outcome based on prior passes: **READY WITH CONDITIONS** (fixture route only; live DB seeding remains blocked by missing topic registry rows — documented in Section 2 item 1).

## Files Touched

Create only:
- `docs/asb/post-camp-productionization-backlog.md`
- `docs/asb/final-publish-checklist.md`
- `/mnt/documents/launch-smoke/route-lock/*.png` (screenshots)

No source edits unless Section 1 or 3 surfaces a hard blocker; in that case scope is limited to the single null-guard or gating fix required.

## Out of Scope

No new ASB topics, primitives, schema, doctrine, megaphases, routes, or components. Presentation-mode lock honored end-to-end.
