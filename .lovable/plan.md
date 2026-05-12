# Phase 2F — Replay Determinism Specification (Doctrine-Only)

**Status:** IIP doctrine-only. No code, schemas, SQL, edge functions, runtime, queues, projections, APIs, UI, dashboards, or infrastructure. Output is exactly **one new memory file + one index update**.

**Laws check:** 1, 2, 3, 5, 6, 7, 8, 9, 10
**Canonical owner:** ASB Replay Engine / Determinism Substrate / Engine-Version Governance / Longitudinal Integrity Layer
**Longitudinal impact:** Locks mathematical reproducibility of the organism across years and engine generations; prevents replay drift, silent rescoring, wall-clock leakage, confidence inflation, non-deterministic evolution.
**Behavioral impact:** Foundational. Governs every inferred state, DGL safety decision, MAAL escalation, readiness score, capability classification, AI proposal lineage, rehab interpretation, onboarding adaptation, future scouting intelligence.
**Envelope impact:** Defines deterministic execution law for all 2D envelope processing and 2E topic routing/materialization. Every authoritative organism interpretation must be replay-equivalent under identical envelope history + engine version + snapshot lineage.

---

## Deliverables

**Create:** `mem://architecture/asb-g2-replay-determinism-spec.md`
**Update:** `mem://index.md`

### Index Core lines to add
1. "No authoritative organism interpretation may depend on runtime, execution order variance, floating-point behavior, wall-clock timing, hidden state, or non-replayable side effects."
2. "Replay equivalence is constitutional; engine evolution must be additive, explainable, and historically reconstructable."

### Index Memories entry to add
- `[ASB Replay Determinism Spec (Phase 2F)](mem://architecture/asb-g2-replay-determinism-spec)` — Deterministic replay law, fixed-point arithmetic doctrine, engine equivalence, replay vectors, snapshot lineage, migration semantics, replay ordering, runtime parity, side-effect isolation, deterministic materialization, replay observability, deferred replay questions, G2 replay gates.

No other files touched.

---

## Artifact Structure (Sections A–N)

- **A — Replay Philosophy.** Replay as constitutional organism reconstruction; decade-scale continuity; distinguish raw event truth / interpreted state / replayed interpretation / migrated interpretation / speculative reasoning. Constitutional line: *"The organism must be reconstructable exactly from envelopes + engine versions + snapshots."*
- **B — Deterministic Replay Law.** Formal equivalence: same envelopes + same engine version + same snapshot lineage = same interpretation. Prohibit randomness, unordered iteration, FP dependence, wall-clock timing, hidden state, network-time mutation, consumer-side divergence. Define determinism, equivalence, corruption, divergence, lineage. Line: *"Replay is authoritative reconstruction, not approximate simulation."*
- **C — Replay Ordering Specification.** Canonical tuple `(occurred_at, server_received_at, envelope_id)` from 2D. Tie-breaking, stale insertion, delayed ingestion, out-of-order delivery, partition-local ordering, cross-athlete partial ordering, replay insertion invariants, immutable ordering. Prohibit consumer-defined ordering.
- **D — Fixed-Point Arithmetic Doctrine.** Authoritative computation = fixed-point only. Canonical precision, per-domain families, scaling invariants, rounding law, overflow/underflow, deterministic division/aggregation, replay-safe combinators. FP prohibited in authoritative replay; permitted only in non-authoritative UI. Cross-ref 2C K13 + 2D §D/§F. Line: *"No authoritative organism interpretation may depend on floating-point runtime behavior."*
- **E — Engine Execution Isolation.** No hidden globals, mutable singletons, runtime clocks, nondeterministic iteration, unseeded randomness, network during replay, replay-time side effects. Define replay-safe engines, deterministic transitions, dependency rules, side-effect quarantine.
- **F — Snapshot & Materialization Determinism.** Snapshot lineage immutable, engine-pinned, hash-addressable, replay-verifiable. Snapshot equivalence, projection rebuild equivalence, replay rebuild lineage, stale handling, migration rebuild, deterministic rebuilds. Line: *"Materialized state must always be reproducible from canonical history."*
- **G — Engine-Version Coexistence & Migration.** Extends 2C K4 + 2D §J. N/N-1 write fence, replay under historical engines, migration envelopes, shadow replay, replay comparison doctrine, migration rollback, dual-version coexistence, historical interpretation preservation. Prohibit silent historical rescoring.
- **H — Replay Vector & Parity Doctrine.** Golden replay vectors as constitutional truth: confidence / missingness / authority / conflict / migration / offline / delayed-ingestion / hard-stop / degradation. Cross-runtime parity required (browser, Deno, Postgres, future). Replay equivalence gates engine promotion.
- **I — Conflict & Correction Determinism.** Deterministic replay under conflicts, stale writes, delayed ingestion, authority disputes, offline reconciliation, migration overlap, replay-of-replay. Historical corrections additive only, never overwrite, deterministic reinsertion.
- **J — Replay Safety & Hard-Stop Integrity.** Hard-stop / medical / rehab replay priority, DGL escalation guarantees, authority preservation, stale hard-stop handling, replay under missing safety signals. Continuity with 2C K6/K11, 2D §E/§I, 2E §H.
- **K — Replay Observability & Drift Detection.** Replay drift, parity failure, silent mutation, nondeterministic execution, snapshot corruption, vector mismatch, authority/confidence replay corruption. Per-replay minimums: duration, parity status, drift count, rebuild count, migration lineage, vector pass/fail, reproducibility hash. Hooks into 2G.
- **L — Replay Failure & Containment Doctrine.** Containment classes: recoverable divergence / unrecoverable corruption / vector mismatch / migration incompatibility / snapshot invalidation / engine regression. Per class: organism protection, rebuild, rollback, escalation, observability severity. Line: *"When replay integrity is uncertain, organism authority degrades conservatively."*
- **M — Deferred Questions Register.** Each item: severity · doctrine risk · temporary containment · future review gate. Seed: precision selection per metric family; deterministic aggregation boundaries; replay scaling under partition compaction; replay rebuild batching; deterministic async constraints; replay hash canonicalization; future runtime parity expansion; deterministic ML inference boundaries; replay-safe probabilistic modeling limits.
- **N — G2 Realization Entry Requirements.** Replay implementation blocked until: replay law, arithmetic doctrine, ordering, snapshot doctrine, migration doctrine, parity doctrine, observability minimums all ratified. Phase 2G must also land before replay infra begins. No replay engine, queues, materialization workers, snapshot infra, pipelines, projection rebuilds, migration runners, or deterministic scoring execution before ratification.

---

## Mandatory Invariants (recorded in artifact)

athlete-as-root tenancy · append-only event sourcing · replay determinism · additive-only correction · no silent rescoring · fixed-point authority · no wall-clock dependence · deterministic replay ordering · deterministic engine evolution · replay-safe authority lineage · confidence first-class · missingness first-class · no hidden mutation · long-season durability.

---

## Out of Scope for 2F

Implementation code, SQL, schemas, runtime engines, worker infra, projections, edge functions, observability dashboards, fixed-point library selection, queue infra, APIs, UI, deployment topology.

---

## Future Doctrine Candidate (register only; do NOT author in 2F)

Append a single short note at the bottom of the 2F artifact reserving a future phase:
**"Adaptive Academy & Capability Classification Doctrine"** — AI-directed onboarding entry, subscription-aware progression orchestration, capability-based academy routing, position-aware pathways, age-normalized grading, AI scouting/capability classification, longitudinal developmental identity, playability-first prioritization, adaptive guidance, progression confidence, standardized capability grading. Core principle: *"Playability precedes weaponization; organism survivability precedes star optimization."* Deferred until replay + observability foundations are constitutionally locked (post-2G / post-G2 planning).

---

## Decision Request

Ratify Phase 2F as the locked replay determinism constitution governing all organism reconstruction, engine evolution, migration lineage, arithmetic correctness, replay equivalence, and longitudinal continuity. On approval: write the memory artifact + index update only. Next phase: **Phase 2G — Observability / SLO Doctrine.** No implementation begins.
