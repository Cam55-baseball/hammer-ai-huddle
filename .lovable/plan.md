# Final Operational Truth Audit — Execution Plan

I'm in plan mode and cannot execute commands or edit files until you approve. Once approved, I will execute this audit literally — no summaries without execution, no invented results.

## Section 1 — Live Operational Execution
Run, in order, capturing real output:
1. `bunx tsc --noEmit` — full type-check
2. `bunx vitest run` (scoped to `src/lib/relational/**` + `src/components/relational/**` + projection tests) — report pass/fail counts and failing files
3. `bun run build` — production bundle, capture warnings + errors
4. `bunx vite preview` (background) — production preview server
5. Live seed: `bun scripts/seed-relational-demo.ts` against live DB — capture row counts in `asb_events` + `asb_event_lineage`
6. Browser walkthrough of `/relational/demo` in production preview at **440×782** and **1280×720** — screenshot every step, capture console + network
7. Fallback walkthrough: block Supabase via network throttling/offline + `?fallback=fixture` — verify all 9 steps render
8. Hard refresh on each step (1–9) — verify cold-start resilience

Return real numbers: test pass/fail, build warnings, console errors, network failures, hydration warnings.

## Section 2 — Canonical Data Path Verification
For every file in `src/components/relational/*` + `src/pages/RelationalDemo.tsx`:
- Grep for direct `supabase.from(` usage
- Grep for hardcoded psych/stage/recruiter/trust literals
- Verify all reads go through `useRelationalProjections` / canonical projection selectors
- Verify all writes go through `emitAsbEvent` / `buildAsbRow`

Output as table: `File | Projection Source | Canonical? | Violations`. Fix any violation, rerun Section 1 tests, report remediation.

## Section 3 — Stress & Failure Testing
Via browser automation against production preview:
- Rapid route switches across all 9 steps (10 cycles)
- Refresh mid-projection-load
- Empty projection state (`?fallback=empty` if available, else clear seed)
- Missing relationship edges / psych rows / dev transitions (DB-targeted deletes on a scratch namespace, not prod data)
- Broken lineage parent refs (verify projection guards)
- Throttled network (Slow 3G profile)
- Duplicate seed execution (idempotency check)
- Offline fallback

Verify: no crashes, no white screens, no `undefined` flashes, no infinite spinners, no error boundaries tripped, no projection divergence between refreshes.

## Section 4 — Longevity Audit
Static scan (ripgrep) across `src/lib/relational/**`, `src/lib/runtime/**`, `src/components/relational/**`:
- `Math.random` usage
- `Date.now()` / `new Date()` inside replay/projection paths
- Mutable module-level state in projections
- Implicit event-order assumptions
- Render-timing coupling (`setTimeout` driving truth)
- Local caches outside canonical projection layer

Output: `Risk Level | File:Line | Reason | Fix Status`.

## Section 5 — Demo Confidence Verification
Real-time walkthrough using browser automation with stopwatch per step. For each of 9 steps:
- Measure dwell + transition time vs `DEMO_CHOREO` targets
- Score emotional clarity / technical clarity / trust perception (1–5) based on rendered output
- Identify strongest moment, weakest moment, highest live-demo risk, exact mitigation

## Section 6 — Final Verdict
Issue exactly one of: **GO**, **CONDITIONAL GO** (with explicit blockers), or **NO GO** — justified solely by Section 1–5 execution evidence.

## Section 7 — Completion Gate
Verify all 11 completion conditions literally. Only if all pass, state the canonical readiness sentence.

## Scope Guarantees
- **Zero** new ASB topics, primitives, doctrine, schemas, or routes.
- Only allowed edits: bug fixes surfaced by Section 1–3, copy refinement in `src/lib/relational/copy.ts`, null-guards, skeleton fallbacks.
- Presentation mode lock honored throughout.

## Deliverables
- Inline audit report in chat with real numbers and tables
- Updated `docs/asb/relational-final-readiness.md` with verdict + evidence
- New `docs/asb/relational-operational-truth-audit.md` capturing raw execution output

Approve to begin execution.
