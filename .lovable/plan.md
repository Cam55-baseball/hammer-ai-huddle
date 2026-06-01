# Relational System Validation Pass — Phases 152–154

Verification-only. No new primitives, no scope expansion. Proves the relational substrate is coherent, replay-safe, lineage-complete, and presentation-ready.

## Section 1 — Test Suite Execution

Run via `lovable-exec test`:
- `src/lib/runtime/relational/__tests__/relational-conversation.replay.test.ts`
- `src/lib/runtime/relational/__tests__/relational-psych.replay.test.ts`
- `src/lib/runtime/relational/__tests__/relational-developmental.replay.test.ts`
- `src/lib/runtime/relational/__tests__/relational-visibility.matrix.test.ts`
- `src/lib/runtime/relational/__tests__/promote-relational-demo.test.ts`
- Any sibling projection tests touched by `projections/types.ts` Scope widening
- TypeScript check across `src/lib/runtime/relational/**` and `src/components/relational/**`

Report per-file: pass/fail, failing assertions, replay divergence, visibility leakage, deterministic-state mismatches.

## Section 2 — Canonical Demo Seeding

Add `scripts/seed-relational-demo.ts` (one-shot Node/Bun, no UI, no direct table writes). Routes a single demo athlete `demo-athlete-001` through `relational/emit.ts` wrappers only:

- developmental_stage_event → `youth_intro` → `developmental_foundation` → `competitive_entry`
- conversation_event turns (coach_hammer + self) with `recalled_event_ids` citations
- psychological_state_event (self_report + bounded inferred ≤ 0.7)
- trust_delta events (parent ↑, coach ↑, recruiter blocked)
- growth_spurt + deload window
- slump → reload cycle
- relationship events (parent, coach, recruiter)
- recruiting exposure events (gated by stage)
- injury_event lifecycle (read-only seed)
- narrative_event journey markers

All events: `visibility_scope: "demo"`, deterministic timestamps from a fixed epoch + offset table, lineage edges via `asb_event_lineage`, idempotent on re-run.

## Section 3 — Replay Reconstruction Audit

Add `src/lib/runtime/relational/__tests__/relational-replay-reconstruction.test.ts`:
- Load seeded raw `asb_events` for `demo-athlete-001`
- Rebuild all five projections (`conversationMemoryState`, `psychState`, `developmentalState`, `trustState`, + any narrative projection consumed by surfaces)
- Compare to live `useRelationalProjections` snapshot via deep equality (byte-stable JSON.stringify with sorted keys)
- Shuffle event order within same-timestamp bucket → assert stable output
- Cold-start replay (empty cache) → assert identical to warm replay

Report: replay integrity, projection divergence, lineage completeness.

## Section 4 — Visibility Boundary Audit

Extend `relational-visibility.matrix.test.ts` with intentional violation attempts:
- parent reading coach-only psych → rejected
- coach reading parent-only consent → rejected
- demo event surfacing in `self`/`parent`/`coach` projection without `demo_promotion` lineage → rejected
- conversation redaction on safeguarding-flagged turn
- developmental gate: recruiter topic at `youth_intro` → rejected, containment event emitted
- minor-athlete recruiter contact → blocked
- presence-only downgrade when confidence < threshold
- revoked relationship → subsequent reads return empty

Report: rejection correctness, emitted containment events, any leakage.

## Section 5 — Surface Wiring Audit

Static audit of `src/components/relational/*.tsx` + `src/pages/Relational.tsx`:
- grep for `useState` holding relational truth (allowed only for ephemeral UI: open/closed, focus)
- grep for direct `supabase.from('asb_events')` or table reads
- grep for hardcoded psych/developmental literals
- verify every read flows through `useRelationalProjections`
- verify every write flows through `relational/emit.ts` wrappers

Report exact `file:line` violations.

## Section 6 — Narrative Walkthrough Audit

Drive `/relational` at viewport 440x782 through the approved narrative (Start Here → Today → Developmental chip → Hammer conversation → Slump reload → Parent trust → Recruiting roadmap → Injury lifecycle → Journey map → Replay proof) using the seeded demo athlete. Validate continuity, lineage, transitions, no orphan events, no dead ends, no fabricated state. Capture screenshots per step for the readiness report.

## Section 7 — Failure Injection

Add `src/lib/runtime/relational/__tests__/relational-failure-injection.test.ts`:
- psych inference confidence 0.85 → clamped/rejected at 0.7
- psych emit missing parent consent on consent-required surface → rejected
- developmental regression `competitive_entry` → `youth_intro` → rejected, monotonicity invariant fires
- replay with scrambled cross-timestamp ordering → divergence detected
- relationship revocation → trust derivation excludes post-revocation deltas
- demo event tagged `self` scope → firewall rejects in `prepareRows`
- coach_hammer turn with empty `recalled_event_ids` → RR-1 rejection
- trust_delta burst (e.g., +0.9 in one event) → bounded/rejected

Assert each emits the canonical containment/rejection event.

## Section 8 — Final Readiness Report

Write `docs/asb/relational-validation-report.md`:
- constitutional integrity (RR-1, RR-2, RR-3 status)
- replay integrity (per-projection byte equality)
- visibility integrity (matrix results + containment counts)
- demo readiness (seed idempotency, narrative pass)
- unresolved risks
- presentation-risk areas
- exact remaining blockers before live presentation

## Technical Notes

- No DB migrations. Seed script writes via existing `emitAsbEvent` path through Supabase using `demo` scope only.
- No new ASB topics; no new files under `src/lib/runtime/relational/` except tests.
- Seed script is idempotent: keyed on deterministic `event_id = hash(athlete_id, topic, offset)`.
- All new tests use shared `_fixtures.ts`; deterministic clock = `2026-01-01T00:00:00Z` + offset table.
- Phases 155–160 remain frozen. No changes to `mem://` invariants — RR-4…RR-10 stay reserved.

## Deliverables

- `scripts/seed-relational-demo.ts`
- `src/lib/runtime/relational/__tests__/relational-replay-reconstruction.test.ts`
- `src/lib/runtime/relational/__tests__/relational-failure-injection.test.ts`
- expanded `relational-visibility.matrix.test.ts`
- `docs/asb/relational-validation-report.md`
- screenshots embedded in the report
