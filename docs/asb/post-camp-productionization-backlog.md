# Post-Camp Productionization Backlog

**Status:** Reference-only. Subordinate to `docs/asb/presentation-mode-lock.md`
and Megaphase 151–160. Nothing in this document is in scope until the
presentation lock is formally lifted in the post-camp review.

**Authority:** All work below must remain additive-only, replay-safe,
lineage-complete, and constitutionally subordinate to Eternal Laws,
RR-1…RR-3 (sealed), Phase 151 visibility firewall, and all prior immutable
invariants across Phases 1–150.

---

## 1. Relational topic registry registration

- **Objective:** Insert the 13 `relational.*` topics into `asb_topic_registry`
  so live writes pass the existing topic FK without falling back to fixture.
- **Dependency chain:** none (root unblocker).
- **Risk level:** Low.
- **Constitutional constraints:** Phase 151 namespace reservation; topic
  metadata must declare `visibility_scope` defaults compatible with the
  firewall in `src/lib/runtime/projections/types.ts::prepareRows`.
- **Estimated order:** 1.

## 2. Live relational seeding enablement

- **Objective:** Run `scripts/seed-relational-demo-node.ts` against the live
  DB end-to-end without FK or RLS failures; verify replay reconstruction
  against the seeded athlete.
- **Dependency chain:** 1.
- **Risk level:** Low.
- **Constitutional constraints:** Idempotency keys preserved; lineage edges
  emitted via canonical `emitAsbEvent` / `emitAsbLineage`; no parallel storage.
- **Estimated order:** 2.

## 3. Production relational onboarding

- **Objective:** Surface the relational substrate inside the real onboarding
  flow for newly created athletes (not the guided demo route).
- **Dependency chain:** 1, 2.
- **Risk level:** Medium.
- **Constitutional constraints:** Demo↔production firewall preserved; no
  fixture rows reachable from `"self"` scope; auth-gated.
- **Estimated order:** 3.

## 4. Authenticated relational persistence

- **Objective:** Wire authenticated user writes (conversation turns, psych
  signals, developmental transitions) through canonical emit wrappers with
  RLS-bound `athlete_id` resolution.
- **Dependency chain:** 1, 2, 3.
- **Risk level:** Medium.
- **Constitutional constraints:** Interpretive-only — never authors
  `organism_truth`, `athlete_intent`, `authority_override`, `hard_stop`,
  `rehabilitation_state`. RLS enforced server-side.
- **Estimated order:** 4.

## 5. Live parent account linkage

- **Objective:** Replace fixture parent relationship with real parent account
  invite + acceptance flow; bind `relationship` rows to two authenticated user
  ids.
- **Dependency chain:** 1, 2, 4.
- **Risk level:** High.
- **Constitutional constraints:** Minor-athlete supremacy (Phase 151) —
  parent relationship holds constitutional precedence over coach / recruiter /
  commercial for minors. Trust accrual remains projection-derived only.
- **Estimated order:** 5.

## 6. Recruiter workflow activation

- **Objective:** Enable recruiter-side surfaces (visibility scope `"recruiter"`)
  for live athletes; wire safeguarding orchestration sub-route.
- **Dependency chain:** 1, 2, 4.
- **Risk level:** High.
- **Constitutional constraints:** Phase 151 safeguarding sub-route mandatory
  (signal → classify → contain → notify_safeguarding_role → survivability_lockdown
  → Phase 31 arbitrate). Recruiter never authors athlete truth.
- **Estimated order:** 6.

## 7. Injury lifecycle production wiring

- **Objective:** Connect `injury_event` (RR-6) emissions to real intake (athlete
  self-report, coach report, sensor signal); replay-safe restoration on rollback.
- **Dependency chain:** 1, 2, 4.
- **Risk level:** High.
- **Constitutional constraints:** Survivability-first; rehabilitation_state
  never authored by relational primitives — only flagged for Phase 31 arbitration.
- **Estimated order:** 7.

## 8. `narrative_event` implementation (RR-5)

- **Objective:** Implement narrative_event primitive end-to-end (emit, projection,
  UI consumer) under reserved RR-5 slot.
- **Dependency chain:** 1.
- **Risk level:** Medium.
- **Constitutional constraints:** Interpretive-only; no organism truth authoring;
  lineage to source signals mandatory.
- **Estimated order:** 8.

## 9. `life_context_event` implementation (RR-8)

- **Objective:** Implement life_context_event primitive (school, family, life
  disruption signals) under reserved RR-8 slot.
- **Dependency chain:** 1.
- **Risk level:** Medium.
- **Constitutional constraints:** Privacy-bounded; safeguarding sub-route
  applies when signal severity crosses threshold.
- **Estimated order:** 9.

## 10. `exposure_event` implementation (RR-9)

- **Objective:** Implement exposure_event primitive (showcases, broadcasts,
  competitive visibility events) under reserved RR-9 slot.
- **Dependency chain:** 1.
- **Risk level:** Medium.
- **Constitutional constraints:** Anti-showcase-distortion; exposure never
  authors recruiting truth or athlete projection envelope.
- **Estimated order:** 10.

## 11. `recruiter_contact_event` implementation (RR-10)

- **Objective:** Implement recruiter_contact_event primitive under reserved
  RR-10 slot; bind to relationship + safeguarding sub-route.
- **Dependency chain:** 1, 6.
- **Risk level:** High.
- **Constitutional constraints:** Minor-athlete supremacy applies; parent
  relationship visibility mandatory for minors.
- **Estimated order:** 11.

## 12. `career_arc` implementation (RR-7)

- **Objective:** Implement career_arc projection (multi-year developmental
  trajectory) under reserved RR-7 slot; pure projection over canonical events.
- **Dependency chain:** 1, 8, 9, 10.
- **Risk level:** Medium.
- **Constitutional constraints:** Replay-equivalent across `engine_version` +
  `reasoning_version`; no parallel storage.
- **Estimated order:** 12.

## 13. RR-4…RR-10 invariant sealing

- **Objective:** Seal RR-4 through RR-10 as immutable invariants per Phase 160
  closure; promote from reserved to enforced.
- **Dependency chain:** 8, 9, 10, 11, 12, 7.
- **Risk level:** Critical.
- **Constitutional constraints:** Sealing is one-way; subordinate to all prior
  invariant families. Requires invariant-lattice test coverage.
- **Estimated order:** 13.

## 14. Live replay observability dashboards

- **Objective:** Surface replay equivalence certification status, lineage depth,
  contradiction routing, and survivability arbitration events in an ops dashboard
  for live relational traffic.
- **Dependency chain:** 2.
- **Risk level:** Medium.
- **Constitutional constraints:** Observability schema frozen per Phase 61;
  additions are dimension-additive only.
- **Estimated order:** 14.

## 15. Production projection performance profiling

- **Objective:** Profile `useRelationalProjections` under realistic ledger
  cardinality (10k+ events / athlete); identify memoization opportunities
  without breaking projection purity.
- **Dependency chain:** 2.
- **Risk level:** Low.
- **Constitutional constraints:** Projections remain pure functions of ledger
  rows; no caching that breaks replay equivalence.
- **Estimated order:** 15.

## 16. Full relational orchestration completion audit

- **Objective:** Phase-31-aligned audit confirming all 10 relational primitives
  ride canonical orchestration end-to-end; produce sealing evidence for Phase 160.
- **Dependency chain:** 1–15.
- **Risk level:** Critical.
- **Constitutional constraints:** Final-coherence audit per Phase 60 doctrine;
  no subsystem-as-truth claims; complete lineage decomposition required.
- **Estimated order:** 16.

---

**Reference only.** Do not begin any item until presentation-mode lock is lifted.
