# ASB Canonical Event System & Runtime Propagation Spec — Ratification

Second implementation-spec document. Continues the Phase 7 implementation layer started by the Canonical Data Architecture Spec. Not doctrine — execution-level system design.

## File touches (exactly two)

1. **Create** `mem://implementation/asb-canonical-event-system-runtime-propagation-spec.md`
   - Sections A–P verbatim per user spec
   - A: Event system philosophy (event-driven, immutable, no direct overwrite)
   - B: Canonical event model (event_id, timestamp, actor, entity_target, event_type, payload, confidence_value, lineage_reference, causality_reference)
   - C: Core event categories (athlete_state / recovery / fatigue / constraint / execution / prescription / adaptation / override / organizational / observability)
   - D: Event propagation engine (recalc triggers, ordering, cross-entity propagation, cascading, dependency resolution)
   - E: State reconstruction (replay mechanism, snapshot rules, temporal ordering)
   - F: Conflict resolution (simultaneous events, arbitration, survivability-first)
   - G: Confidence propagation (flow, decay, conflict adjustment, sparse data)
   - H: Real-time runtime (latency, batching vs immediate)
   - I: Override event governance (structure, precedence, lineage, safety)
   - J: Organizational event propagation (multi-athlete, cohort aggregation, org fatigue)
   - K: Replay engine integration (deterministic reconstruction, audit/debug)
   - L: Observability event system (first-class logging, audit completeness, transparency)
   - M: Anti-drift safeguards (no hidden mutation, event-only enforcement, unauthorized change detection)
   - N: Performance/scalability (throughput, batching, load handling)
   - O: Implementation constraints (MAY / MAY NOT)
   - P: Realization gates (invalidation conditions)

2. **Update** `mem://index.md`
   - Append two Core lines: event-driven architecture mandate + state-reconstruction-from-immutable-event-log mandate
   - Prepend one Memories entry pointing at the new spec
   - Preserve all prior Core and Memories content verbatim

## Alignment

Fully consistent with Canonical Data Architecture Spec: same append-only ledger, same 5-timestamp envelope, same confidence/missingness/authority transport, same survivability-first arbitration, same replay determinism, same DASE/CDK/APC/EMFAL/CHATE/CIFRE/LAOS runtime flow. Adds the runtime behavior of the event system (propagation, conflict, real-time, override, replay, anti-drift, scalability).

## Out of scope

No code, SQL, migrations, schemas, API endpoints, services, UI, or infra. No edits to other files. No new doctrine — implementation spec only.
