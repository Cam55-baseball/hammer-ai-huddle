
# Phase A — Relational Infrastructure Activation (Backlog 1–4)

Strict scope: activate the already-constitutionalized relational substrate (Phases 151–154) for live use. Additive-only. Canonical `emitAsbEvent` path only. No new primitives, no RR-4…RR-10 sealing, no recruiter/injury/career_arc/narrative work.

---

## Section 1 — Relational topic registry activation

Additive idempotent migration registering the 16 relational topics into `public.asb_topic_registry`. Existing rows are never mutated; re-runs are no-ops via `ON CONFLICT (topic_id) DO NOTHING`.

Topic-class mapping (constrained by the existing `asb_topic_class` enum, which has no `interpretive` member — relational primitives are interpretive overlays per Phase 151, so they map to the closest legal class without authoring organism truth):

| Topic | topic_class | authority_pathway | replay_policy | materialization |
|---|---|---|---|---|
| `relational.conversation.turn` | `observability` | `athlete` | `deterministic_with_inputs` | `on_demand` |
| `relational.conversation.shared` | `observability` | `coach_parent_org` | `deterministic_with_inputs` | `on_demand` |
| `relational.conversation.redacted` | `observability` | `athlete` | `deterministic_with_inputs` | `on_demand` |
| `relational.psych.self_report` | `confidence_signal` | `athlete` | `deterministic_with_inputs` | `on_demand` |
| `relational.psych.inferred` | `confidence_signal` | `ai` | `deterministic_with_inputs` | `on_demand` |
| `relational.psych.transition` | `confidence_signal` | `system` | `deterministic_with_inputs` | `on_demand` |
| `relational.developmental.age_observed` | `constraint_signal` | `athlete` | `deterministic_with_inputs` | `snapshot` |
| `relational.developmental.growth_attestation` | `constraint_signal` | `coach_parent_org` | `deterministic_with_inputs` | `snapshot` |
| `relational.developmental.puberty_marker` | `constraint_signal` | `coach_parent_org` | `deterministic_with_inputs` | `snapshot` |
| `relational.developmental.deload_window` | `constraint_signal` | `system` | `deterministic_with_inputs` | `on_demand` |
| `relational.developmental.transition` | `constraint_signal` | `system` | `deterministic_with_inputs` | `snapshot` |
| `relational.developmental.gate_decision` | `constraint_signal` | `system` | `deterministic_with_inputs` | `on_demand` |
| `relational.relationship.created` | `org_propagation` | `coach_parent_org` | `deterministic_with_inputs` | `snapshot` |
| `relational.relationship.confirmed` | `org_propagation` | `coach_parent_org` | `deterministic_with_inputs` | `snapshot` |
| `relational.relationship.revoked` | `org_propagation` | `coach_parent_org` | `deterministic` | `snapshot` |
| `relational.relationship.paused` | `org_propagation` | `coach_parent_org` | `deterministic` | `snapshot` |

`introduced_in_engine_version` = `asb-1.0.0` (matches `ENGINE_VERSION`).

The migration is a single `INSERT … ON CONFLICT DO NOTHING` per row, additive-only, replay-safe on re-run, no existing rows touched.

---

## Section 2 — Live relational seeder activation

Augment `scripts/seed-relational-demo-node.ts` (do not duplicate it):

1. **Lineage edge emission.** After each successful row insert, walk `payload.lineage_parent_ids`, and for each parent emit a row into `asb_event_lineage` via `INSERT … ON CONFLICT DO NOTHING` with `derivation_type = "relational_seed"`, `engine_version = "asb-1.0.0"`. Idempotent on re-run.
2. **Post-seed replay reconstruction verification.** After all inserts, fetch the seeded rows back via the same client, feed them through `conversationMemoryState`, `psychState`, `developmentalState`, `trustState` (scope `"demo"`), and assert byte-stable equality (via `stableStringify`) against the in-memory `buildDemoSeed()` projections. Exit non-zero on divergence.
3. **Verification report.** On completion, print a structured block: `inserted`, `deduped`, `total_rows`, `lineage_edges_inserted`, `lineage_edges_deduped`, `projection_parity: ok|FAIL`, `duplicate_run_proof` (counts from the verification SELECT). Also writes `/mnt/documents/relational-live-seed-report.json` for the operator.
4. **Service-role + canonical emit semantics** are already correct; preserved as-is.

No payload mutation, no parallel storage, no new topics — relies entirely on Section 1.

---

## Section 3 — Authenticated relational persistence

Relational emitters (`emitConversationTurn`, `emitPsychSelfReport`, …) already route through canonical `emitAsbEvent`. With Section 1 in place, FK failures stop and authenticated writes persist under existing RLS (`Athletes insert own events` / `Athletes read own events`).

Two surface changes:

1. **`useAsbTimeline` scope coupling.** The hook today auto-switches to fixture mode when `?fallback=fixture` is present. Add: if no fallback param AND `user` is authenticated, always read live (current behavior). When `?fallback=fixture` is present AND the user is authenticated, still read fixture for that page — but log one `console.info("[relational] fixture-mode-with-auth")` so we can audit any unintended bleed. No new state; no projection mutation.
2. **`Relational.tsx` scope.** Already chooses `"demo" | "self"` based on `useDemoMode`. Confirm `isDemo` is only true for the explicit demo route — verify in code, no change unless a leak is found.

**New test:** `relational-live-persistence.test.ts` — round-trips a `psych.self_report` and a `conversation.turn` against an in-memory event array (no DB), asserts projections after persistence equal projections built from the source rows directly. Mixed demo/live coexistence test: feed a mix of `visibility_scope: "demo"` and `"self"` rows; assert `prepareRows("self", …)` strips demo, `prepareRows("demo", …)` strips self.

Refresh survivability is structurally guaranteed: writes hit `asb_events`, reads hit `useAsbTimeline`, projections rebuild on mount — no client cache to lose.

---

## Section 4 — Production relational onboarding

Constitutional onboarding bootstrap: a newly-authenticated athlete emits a minimal, constitutionally legal set of relational events the first time they reach the onboarding flow. No fabricated psych state, no AI inference at onboarding, all missingness explicit.

Trigger location: `src/pages/OnboardingFlow.tsx`, gated by the existing `onboarding.step_completed` ledger check — emit only if no `relational.relationship.created` event exists for `user.id` (idempotency via deterministic `idempotency_key`).

Bootstrap emission set (all via canonical emitters):

1. **`relational.relationship.created`** — `{ subject_role: "self", subject_user_id: user.id, visibility_scope: "self", confidence: 1.0, source: "onboarding_bootstrap" }`. Establishes the athlete↔self relationship anchor.
2. **`relational.developmental.age_observed`** — only when the onboarding form captures DOB/age. If unknown at this point: emit nothing for developmental, leaving `developmentalState.current_stage` as `null` (explicit missingness, per Phase 151). Do NOT impute.
3. **No psych emission.** Confidence/motivation/etc. remain `source: "none"` until the athlete files a self-report. This is constitutional — Phase 151 forbids hidden inferred psych state at onboarding.

Determinism: `idempotency_key = sha256("onboarding-bootstrap::" + user.id + "::" + topic_id)`, so repeated visits are no-ops.

**Deliverables (committed alongside code):**
- `docs/asb/relational-onboarding-flow.md` — flow map, emission map, visibility audit, replay reconstruction proof (drawn from the new test).
- `relational-onboarding.test.ts` — replays a bootstrap event sequence and asserts projections equal the expected baseline (relationship present, developmental null, psych `source: "none"`).

---

## Section 5 — Verification pass

Executed at the end of the build phase; no summaries without execution:

1. `bunx tsc --noEmit` — type-check.
2. `bunx vitest run src/lib/runtime/relational/__tests__/` — full relational suite incl. new persistence + onboarding tests.
3. `bun scripts/seed-relational-demo-node.ts --dry-run` — verify seed builds against the live registry without writes.
4. `bun scripts/seed-relational-demo-node.ts` — live seed against the dev DB; assert verification report shows `projection_parity: ok` and `inserted + deduped == total_rows`.
5. Re-run #4 — assert `inserted == 0`, `deduped == total_rows` (idempotency proof).

Return: exact files changed, exact migrations added, exact test counts (pass/fail), and a single explicit statement of remaining blockers before backlog items 5–6 (expected: parent account invite flow + recruiter visibility scope + safeguarding sub-route — all out of scope here).

---

## Files touched

- **Migration (new):** `INSERT … ON CONFLICT DO NOTHING` for 16 relational topic rows.
- `scripts/seed-relational-demo-node.ts` — add lineage edge writes + post-seed projection parity check + report file.
- `src/hooks/useAsbTimeline.ts` — auth-aware fixture-mode audit log (single `console.info`, no behavior change).
- `src/pages/OnboardingFlow.tsx` — bootstrap emission gated on user + idempotency.
- `src/lib/runtime/relational/__tests__/relational-live-persistence.test.ts` *(new)*.
- `src/lib/runtime/relational/__tests__/relational-onboarding.test.ts` *(new)*.
- `docs/asb/relational-onboarding-flow.md` *(new)*.
- `mem://constraints/presentation-mode-lock` — append: lock partially lifted for backlog items 1–4 only; RR-4…RR-10 remain sealed.
- `.lovable/plan.md` — log Phase A entry.

## Out of scope (explicit)

Recruiter visibility, injury lifecycle wiring, parent invite flow, `narrative_event`, `life_context_event`, `exposure_event`, `recruiter_contact_event`, `career_arc`, RR-4…RR-10 sealing, replay observability dashboards, projection perf profiling. Execution halts at backlog item 4.
