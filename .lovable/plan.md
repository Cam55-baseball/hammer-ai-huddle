# Phase 2E — Topic Registry & Authority Matrix Doctrine (Plan)

**Status:** doctrine-only under IIP. No code, schemas, SQL, edge functions, runtime routing, queue/pub-sub, RLS, APIs, UI, or infrastructure execution. Output is one memory artifact + index update.

**Laws check:** 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
**Canonical owner:** ASB Topic Registry / Authority Routing / Replay & Materialization Governance
**Longitudinal impact:** Locks the canonical routing law for all organism transport. Prevents rogue subsystem mutation, illegal producer behavior, authority leakage, silent replay corruption, topic sprawl, and shadow-state emergence. Defines the permanent nervous-system topology for every future organism signal.
**Behavioral impact:** Indirect, system-wide. Governs routing/authority for AINL proposals, MAAL escalation, DGL hard-stops, IRCL rehab state, OEAL onboarding events, SIL simulations, MPI scoring, readiness, nutrition, recovery, movement, cognitive/emotional state, and future modalities. No UI/voice changes.
**Envelope impact:** Defines per-topic constraints on every envelope category from 2D — event-class allowlists, producer/consumer allowlists, authority requirements, confidence/missingness policies, replay/materialization routing, safety classification, observability lineage minimums, engine-version pinning, and migration constraints. This artifact is the routing layer that makes the 2D envelope contract enforceable.

---

## Deliverables (on approval)

1. **Create** `mem://architecture/asb-g2-topic-registry-authority-matrix.md` — full Phase 2E doctrine artifact (Sections A–N below, mandatory invariants, out-of-scope, decision request). Each section ends with IIP §11 reporting (Implementation state / Verification status / Remaining uncertainty / Drift risks).
2. **Update** `mem://index.md`:
   - Add **Core line**: *"No envelope may enter organism state without a registered topic, declared authority pathway, replay policy, materialization policy, and observability lineage."*
   - Add **Core line**: *"Topic proliferation is organism corruption; new topics require constitutional justification (no feature-level topic invention)."*
   - Add **Memories entry**: `[ASB Topic Registry & Authority Matrix (Phase 2E)](mem://architecture/asb-g2-topic-registry-authority-matrix) — Canonical topic classes (29), per-topic registry contract (24 fields), producer/consumer matrices, authority matrix per topic class, replay/materialization routing, safety/hard-stop transport, offline/conflict routing, cross-topic interaction law, evolution & governance, observability minimums, L1–L8 deferred register, G2 entry gates`.
3. **No diagrams** unless an authority-precedence ladder or topic-class-by-actor matrix becomes unavoidable; if added, maximum two, doctrine-only, no implementation topology.
4. No other files touched. No code, SQL, or runtime artifacts.

---

## Artifact structure (Sections A–N)

### A — Topic Registry Philosophy
Topics as nervous-system channels. Why topic governance exists. Prevention of rogue mutation. Athlete-root routing. Topics as simultaneous boundary of replay, authority, and observability. Distinct concepts (must never be conflated):
- **transport topic** (envelope channel)
- **materialization projection** (rebuilt view of state)
- **UI surface** (presentation)
- **AI proposal lane** (advisory channel)
- **authority lane** (who may apply)
- **replay lane** (rebuild scope)

Constitutional line: *"No organism signal exists outside a registered topic."*

### B — Canonical Topic Classes (29, closed)
`organism_truth` · `performance` · `readiness` · `fatigue` · `recovery` · `movement` · `nutrition` · `hydration` · `sleep` · `cognitive` · `emotional` · `injury` · `rehabilitation` · `medical` · `training_execution` · `athlete_intent` · `coach_instruction` · `ai_proposal` · `authority_override` · `hard_stop` · `observability` · `replay` · `migration` · `tenant_scope` · `calibration` · `degradation` · `simulation` · `communication` · `audit`.

For each class: purpose · replay eligibility · materialization eligibility · confidence requirements · missingness behavior · authority requirements · offline eligibility · safety classification · projection eligibility · retention expectations · lineage requirements · cross-topic interaction rules.

Doctrine: topic classes are **constitutional categories**, not feature labels. New classes require Section K governance.

### C — Topic Registry Structure (24-field contract)
Doctrine-only fields per topic entry (no schema/DDL):
`topic_id` · `topic_class` · `topic_purpose` · `allowed_event_classes` · `prohibited_event_classes` · `producer_allowlist` · `consumer_allowlist` · `authority_requirements` · `replay_policy` · `materialization_policy` · `retention_policy` · `projection_priority` · `offline_policy` · `confidence_policy` · `missingness_policy` · `conflict_policy` · `escalation_policy` · `observability_requirements` · `engine_version_requirements` · `migration_requirements` · `safety_classification` · `tenant_visibility` · `replay_rebuild_priority` · `schema_evolution_constraints`.

For each field: invariants · replay implications · authority implications · offline implications · observability implications · mutation rules · additive-only constraints.

### D — Producer Registry Doctrine
Trust tiers T0–T7 (from G1). Producer kinds: athlete · coach · physician · parent · organizational · AI advisory · wearable sensor · validated medical device · system daemon · replay engine · migration engine · observability subsystem.

Per producer kind: legal topics · prohibited topics · confidence ceilings · authority ceilings · offline rights · replay rights · materialization rights · escalation pathways · signature requirements (K3 deferral honored) · verification requirements · quarantine behavior · degradation behavior.

Constitutional line: *"No producer may emit outside its declared organism scope."*

### E — Consumer Registry Doctrine
Consumer kinds: athlete UI · coach UI · medical UI · organizational dashboards · AI advisory systems · replay engines · observability systems · analytics pipelines · notification systems · safety systems · simulation systems.

Per consumer kind: readable topics · prohibited topics · materialization permissions · replay permissions · authority visibility · confidence visibility · missingness visibility · stale-state handling · offline behavior · caching restrictions · export restrictions · lineage visibility requirements.

Constitutional line: *"No consumer may observe organism state without lineage visibility."*

### F — Authority Matrix Doctrine
Verb matrix: **propose · apply · override · revoke · acknowledge · confirm · escalate · suppress · hard-stop** × 29 topic classes × actor types (athlete, coach, parent, physician, organizational, AI advisory, DGL, MAAL, system).

Explicit boundaries:
- athlete supremacy (autonomy on personal-autonomy decisions; supreme over `athlete_intent`)
- physician supremacy (`medical`, `rehabilitation`; AI never supersedes — MAAL)
- DGL escalation pathways (8-state machine, no green/yellow/red collapse)
- MAAL conflict pathways (canonical hierarchy: Medical → Organism Safety → Longitudinal Survivability → Athlete → Coach/Parent/Org → AI → Population priors)
- AI advisory limits (proposal-only on advisory topics; never on `organism_truth`/`athlete_intent`/`authority_override`/`hard_stop`/`rehabilitation` per 2D §G)
- organizational constraints (overlay, never root)
- parent/youth pathways (youth-protection scoped, subordinate to physician)

Constitutional line: *"Authority scope is topic-bound, never global."*

### G — Replay & Materialization Routing
Per-topic: replay eligibility · snapshot eligibility · rebuild cadence · stale tolerance · projection priority · rebuild triggers · replay ordering (using 2D §F tuple) · conflict insertion behavior · replay lineage requirements · historical correction behavior (additive only) · migration rebuild behavior (per 2C K4 N/N-1 fence + 2D §J).

Constitutional line: *"Replay behavior is topic-defined, never consumer-defined."*

### H — Safety & Hard-Stop Routing
Privileged topics: `hard_stop` · `medical` · `rehabilitation` · safety-critical `degradation`. Doctrine for: server-push transport (FCM/APNs per K11) · Realtime mirror (best-effort UX, never authority) · escalation fan-out · delivery guarantees · stale protection · offline restrictions (no offline-authoritative hard-stop per K6) · acknowledgement requirements · replay priority · audit permanence. Explicit K6/K11 continuity from 2C.

### I — Offline & Conflict Routing
Per-topic offline doctrine: queue eligibility · stale-write tolerance · authority restrictions · replay insertion rules · delayed-ingestion behavior · conflict escalation · visibility rules · reconciliation policy · offline confidence decay · offline hard-stop prohibition.

Topic-specific examples worked through: `rehabilitation` · `readiness` · `athlete_intent` · `ai_proposal` · `training_execution` · `medical`.

### J — Topic Interaction Doctrine
Cross-topic influence rules:
- `readiness` may influence `training_execution` (advisory; DGL state-bound).
- `injury` may suppress `movement`/`training_execution` recommendations.
- `medical` may override `rehabilitation`.
- `athlete_intent` may NOT directly mutate `organism_truth` (Law 5: intent ≠ completion).
- `ai_proposal` may NEVER mutate applied state (2D §G).
- `observability`/`audit` may NEVER mutate organism state.
- `simulation` is reasoning-only; never enters organism log (2D §F temporal-branching prohibition).

Per interaction: legal influence · prohibited influence · escalation requirements · replay implications · confidence inheritance (per 2D §D — no silent upgrade) · authority inheritance · materialization restrictions.

Constitutional line: *"No topic may silently mutate another topic's authoritative state."*

### K — Topic Evolution & Governance
New-topic introduction requires: constitutional justification · replay implications · authority implications · materialization implications · observability implications · migration implications · lineage implications · confidence/missingness implications · safety implications · deprecation pathway.

Explicit prohibition: feature-level topic invention. Renames are deprecation + new-topic, never in-place edits. Deprecation: read-only window, then archival; never silent removal.

Constitutional line: *"Topic proliferation is organism corruption."*

### L — Observability & Drift Detection
Per-topic minimums: ingest rate · replay lag · projection lag · confidence drift · missingness anomalies · unauthorized producer attempts · unauthorized consumer attempts · stale projections · replay corruption · authority corruption · lineage gaps · transport failures.

Definitions (P0-alertable): topic corruption · rogue producer · rogue consumer · replay drift · projection corruption · lineage loss · authority leakage. (Hooks into 2G observability/SLO doctrine.)

### M — Deferred Questions Register
Each item: severity · doctrine risk · temporary containment · future review gate.
- **L1 Topic granularity boundaries** — when to split vs subtype within a class.
- **L2 Topic inheritance hierarchy** — whether subclasses inherit policies or restate them.
- **L3 Projection retention tiers** — hot/warm/cold per topic class.
- **L4 Replay rebuild cadence under scale** — interaction with K2 partitioning.
- **L5 Multi-tenant topic isolation** — org overlays vs cross-org analytics.
- **L6 Cross-topic confidence propagation** — combinator selection per influence edge.
- **L7 Topic deprecation migration behavior** — envelope routing during read-only window.
- **L8 Simulation-topic containment boundaries** — preventing SIL leakage into organism log.

### N — G2 Realization Entry Requirements
Schema realization may NOT begin until ratified:
1. Topic registry (B + C)
2. Producer matrix (D)
3. Consumer matrix (E)
4. Authority matrix (F)
5. Replay/materialization routing (G)
6. Safety/hard-stop routing (H)
7. Observability minimums (L)

Plus prerequisites: **Phase 2F (Replay Determinism Specification)** and **Phase 2G (Observability/SLO Doctrine)** must land before any topic implementation, queue/pub-sub setup, RLS, projections, edge functions, or APIs begin.

Explicit prohibition: no topic implementation, no routing code, no realtime channels, no RLS, no projections, no edge functions, no APIs before ratification AND 2F/2G completion.

---

## Mandatory invariants (restated in artifact)

athlete-as-root tenancy · append-only event sourcing · replay determinism · authority travels with state · confidence first-class · missingness first-class · closed-loop intelligence · AI advisory-only mutation · long-season durability · no silent rescoring · no rogue producers · no rogue consumers · no shadow state · no topic mutation without lineage · additive-only evolution.

## Out of scope for 2E

SQL · DDL · Supabase execution · edge functions · pub/sub implementation · realtime channels · queue infrastructure · RLS · TypeScript · UI · API routes · push integrations · concrete topic schemas · runtime code · infrastructure topology · diagrams beyond the optional two doctrine ladders.

## Decision request

Ratify Phase 2E as the locked organism routing and authority doctrine governing all topic transport, producer/consumer behavior, replay/materialization routing, authority boundaries, safety routing, and longitudinal organism topology. On ratification, the next phase is **Phase 2F — Replay Determinism Specification**. No implementation begins on approval.
