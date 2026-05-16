# ASB Canonical Data Architecture Spec — Ratification

First implementation-specification document translating constitutional/runtime doctrine into canonical engineering structures. Not doctrine expansion.

## File touches (exactly two)

1. **Create** `mem://implementation/asb-canonical-data-architecture-spec.md`
   - Sections A–M verbatim per user spec
   - A: Data architecture philosophy (state-first, append-only, replay-safe, anti-destructive, survivability-first)
   - B: Canonical entity map (athletes, orgs, cohorts, 16 state entities, override_log, confidence_lineage, observability_event, organizational_state)
   - C: Canonical state relationships (propagation ownership, dependency hierarchy, recalc ordering, temporal continuity, replay lineage)
   - D: Event ledger architecture (append-only, immutable lineage, replay sequencing, causality, confidence attribution, override traceability)
   - E: State snapshot doctrine (cadence, replay reconstruction, historical continuity, recalibration persistence, uncertainty preservation)
   - F: Runtime propagation rules (triggers, cross-system, organizational, fatigue/recovery carryover, adaptation drift)
   - G: Confidence architecture (sparse-data, decay, conflict, visibility, lineage persistence)
   - H: Constraint architecture (fascia vs contractile, tissue, rotational, locomotion, scheduling, developmental gating, survivability escalation)
   - I: Organizational architecture (cohort mapping, staff relationships, org fatigue, scheduling/resource constraints, multi-athlete propagation integrity)
   - J: API/data boundary preparation (canonical IDs, immutable references, audit-safe relationships, replay-safe querying, uncertainty exposure)
   - K: Observability architecture (event auditability, replay visibility, recommendation lineage, override lineage, drift detection, historical reconstruction)
   - L: Implementation constraints (MAY / MAY NOT)
   - M: Realization gates (invalidation conditions)

2. **Update** `mem://index.md`
   - Append two Core lines: canonical data architecture mandate + replay-safe persistence mandate
   - Prepend one Memories entry pointing at the new spec
   - Preserve all prior Core and Memories content verbatim

## Out of scope

No code, SQL, migrations, schemas, API endpoints, services, UI, or infra. No edits to other files. No new doctrine — implementation spec only, fully consistent with all prior phases (DASE/CDK/APC/EMFAL/CHATE/CIFRE/LAOS, fascia vs contractile, survivability arbitration, observability, uncertainty visibility, organizational scaling).
