# ASB Canonical API & System Interface Spec — Ratification

Final core implementation-spec document. Closes the Phase 7 implementation stack: data architecture (§1) → event system (§2) → API/interface contract (§3). Not doctrine — production interface specification.

## File touches (exactly two)

1. **Create** `mem://implementation/asb-canonical-api-system-interface-spec.md`
   - Sections A–P verbatim per user spec
   - A: API system philosophy (event-driven + state-reconstructed, no bypass, uncertainty/lineage preserved)
   - B: Core API object model (AthleteStateResponse, ReadinessResponse, RecoveryResponse, ExecutionPlanResponse, SessionExecutionResponse, ConstraintResponse, OrganizationalStateResponse, OverrideResponse, ConfidenceResponse — each with current state, lineage refs, confidence, uncertainty flags, derivation source timestamp)
   - C: Read APIs (athlete state, readiness dashboard, recovery profile, organizational state, historical replay — all reconstructed from event system, never mutable-state queries)
   - D: Write APIs (session execution submission, coach override, prescription application, constraint update triggers, organizational adjustments — events only, no direct state mutation)
   - E: Execution API (athlete daily output, coach daily planning, session execution input, post-session feedback ingestion)
   - F: Override API (structure, validation, lineage, safety enforcement, survivability constraints)
   - G: Confidence & uncertainty API layer (exposure shape, uncertainty flags, sparse-data indicators, conflicting-signal representation)
   - H: Organizational API (cohort queries, multi-athlete scheduling views, resource constraints, organizational fatigue visibility)
   - I: Replay & audit API (full system replay, historical reconstruction, event lineage tracing, override audit)
   - J: UI consumption contract (frontend consumption, uncertainty display, athlete vs coach views, cognitive load minimization)
   - K: Anti-drift API rules (no hidden bypass endpoints, no silent mutation, no untracked overrides, reproducible from event log)
   - L: Performance constraints (real-time updates, batching, read vs write latency)
   - M: Security + authority model (athlete/coach/org permissions, override authority hierarchy, system vs human boundaries)
   - N: System integration contract (API ↔ event system, data architecture, runtime propagation engine)
   - O: Implementation constraints (MAY / MAY NOT)
   - P: Realization gates (invalidation conditions)

2. **Update** `mem://index.md`
   - Append two Core lines: API layer = system interface boundary; API outputs must be event/state derived and reconstructable
   - Prepend one Memories entry marking completion of Phase 7 implementation stack (data → events → API interface)
   - Preserve all prior Core and Memories content verbatim

## Alignment

Strict consistency with Implementation §1 (Canonical Data Architecture) and §2 (Event System & Runtime Propagation): append-only ledger as source of truth, 5-timestamp envelope, survivability-first arbitration, confidence/missingness/authority transport, replay determinism, athlete-as-root tenancy, DASE/CDK/APC/EMFAL/CHATE/CIFRE/LAOS runtime flow. Adds the external interface boundary by which all consumers (UI, coach tools, organizational dashboards, replay/audit) read reconstructed state and submit events.

## Out of scope

No code, SQL, migrations, route files, OpenAPI schemas, edge function implementations, UI components, or infra. No edits to any other file. No new doctrine — implementation spec only.
