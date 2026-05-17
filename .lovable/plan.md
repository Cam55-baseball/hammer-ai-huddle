# Phase 2 — Event Runtime & Propagation Engine Spec

Strict continuation of Phase 1 (append-only ledger, lineage, confidence, override audit, snapshots, org propagation, immutability, RLS, topic/engine registries). This is production runtime specification, not new doctrine.

## Scope

Exactly two file touches. No other files modified.

1. **Create** `mem://implementation/asb-phase-2-event-runtime-propagation-engine-spec.md`
2. **Update** `mem://index.md`

## File 1 — Phase 2 spec

Memory leaf with frontmatter (`type: implementation`) and sections A–P verbatim from the user brief:

- A. Event runtime philosophy (event-driven, no direct mutation, replay-deterministic)
- B. Event ingestion engine (validation, immutability, ordering, write-ahead)
- C. Propagation engine (athlete→cohort→org, dependency ordering, loop prevention)
- D. Deterministic sequencing rules (timestamp vs causal, survivability-first)
- E. State reconstruction runtime (replay engine, deterministic rebuild)
- F. Snapshot system integration (triggers, validity, merge, recovery)
- G. Confidence propagation engine (flow, decay, conflict, sparse data)
- H. Override event handling (precedence, lineage, safety, authority)
- I. Async runtime (batching, real-time vs delayed, backpressure)
- J. Multi-entity propagation (athlete/cohort/org, cross-athlete interference)
- K. Replay execution engine (full replay, determinism, audit, time-windowed)
- L. Drift prevention (non-event-driven detection, lineage break, mismatch)
- M. Observability integration (event logs, propagation/override/confidence traces)
- N. Performance constraints (throughput, scaling, batching, latency)
- O. Implementation constraints (MAY / MAY NOT)
- P. Realization gates (invalid conditions)

## File 2 — Index update

- Append two new Core lines:
  - Event runtime propagation: state derives only from event sequence; no direct mutation.
  - Deterministic state reconstruction: full organism state replayable from event log + snapshots.
- Prepend one Memories entry pointing at the new Phase 2 spec.
- All prior content preserved verbatim.

## Constraints

- No project source files touched.
- No doctrine expansion — runtime specification only.
- Index preserved verbatim outside the additive lines.
