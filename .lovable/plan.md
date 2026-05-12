# Phase 2D — Canonical Envelope Contract Doctrine (Plan)

**Status:** doctrine-only under IIP. No code, migrations, schemas, edge functions, UI, or runtime artifacts. Output is a single memory artifact + index update.

**Laws check:** 1 (One Organism), 2 (No Unused Data), 3 (Missingness Is a Signal), 6 (Self-Correct), 7 (Engine Becomes More Elite), 8 (No Fake AI), 9 (Closed Loop or Don't Ship), 10 (Long-Season Durability)
**Canonical owner:** ASB envelope substrate / Replay & Authority subsystems / IIP governance
**Longitudinal impact:** Locks the transport primitive that protects decade-scale replay determinism, engine-version pinning, confidence/missingness propagation, and athlete-root continuity.
**Behavioral impact:** Indirect — defines the transport law for AINL proposals, MAAL authority assertions, DGL hard-stops, IRCL rehab state, OEAL entry events, and SIL scenario envelopes. No UI/voice changes.

---

## Deliverables (on approval)

1. **Create** `mem://architecture/asb-g2-canonical-envelope-contract.md` — full Phase 2D doctrine (Sections A–M, mandatory invariants, out-of-scope, decision request).
2. **Update** `mem://index.md`:
   - Add Memories entry: `[ASB Canonical Envelope Contract](mem://architecture/asb-g2-canonical-envelope-contract.md) — Phase 2D envelope shape, event taxonomy, confidence/missingness/authority transport, replay determinism, AI proposal separation, materialization, offline/conflict, engine-version, observability, G2 entry gates`.
   - Add a Core line locking the substrate: "All organism mutation must be explainable through ordered envelopes + engine versions + snapshots; no subsystem-to-subsystem mutation outside the envelope."
   - Add a Core line: "Plans must additionally declare Envelope impact (transport/authority/confidence/missingness/replay/AI-separation/materialization/engine-version touchpoints, or `none (justified)`)." — extends the existing 4-line plan gate.
3. No diagrams in 2D (topology/replay diagrams already live in G1; envelope-flow diagrams belong to 2E/2F if needed).
4. No other files touched.

---

## Artifact structure (Sections A–M)

The artifact uses the exact section headings the user specified. Each section follows IIP §11 reporting (Implementation state / Verification status / Remaining uncertainty / Drift risks) at the section tail.

### A — Canonical Envelope Philosophy
Envelope as organism-state transport primitive; append-only; athlete-root identity; no direct subsystem-to-subsystem mutation; envelopes as replay-complete history; the four-state distinction (event truth → interpreted state → proposed adaptation → authoritative applied state); decade-scale rationale; explicit constitutional sentence: *"Every organism mutation must be explainable entirely through ordered envelopes + engine versions + snapshots."*

### B — Canonical Envelope Shape
Doctrine-only field categories (no schema):
identity · athlete_root · topic · event_type · producer · authority · confidence · missingness · engine_version · temporal · replay · conflict · ai_lifecycle · audit · tenant_scope · safety_classification.
For each: purpose · invariants · mutation rules · replay implications · offline implications · authority implications · observability implications · mutable/immutable · client-supplied/server-derived · authoritative/advisory.

### C — Event Taxonomy Doctrine
Permanent classes: `organism_truth`, `athlete_intent`, `observed_behavior`, `inferred_state`, `ai_proposal`, `authority_override`, `hard_stop`, `rehabilitation_state`, `replay_control`, `migration_event`, `tenant_scope_event`, `observability_event`, `calibration_event`, `degradation_event`. Per class: replay eligibility · authority requirements · confidence ceilings · missingness handling · offline eligibility · stale-write handling · engine-version pinning · materialization eligibility · audit retention. Explicit `intent ≠ completion` doctrine.

### D — Confidence + Missingness Propagation Law
Confidence + missingness as first-class primitives. Propagation, decay, stale-amplification prevention, conflict suppression, longitudinal accumulation, floors, producer-tier ceilings (T0–T7 from G1), replay recomputation, inheritance, bounded-certainty doctrine. Constitutional line: *"No downstream engine may silently upgrade confidence."* Behaviors under collision, partial sync, offline replay, delayed ingestion, engine migration.

### E — Authority Transport Semantics
Per actor (athlete, coach, parent, physician, organizational, AI advisory, DGL hard, MAAL escalation): assertion · revocation · expiration · replay reconstruction · lineage · scope inheritance · emergency handling · conflicts · offline behavior · precedence · audit permanence. Constitutional line: *"Authority is transported WITH organism state, never inferred afterward."*

### F — Temporal & Replay Determinism Doctrine
Five canonical timestamps (`occurred_at`, `client_recorded_at`, `server_received_at`, `materialized_at`, `replayed_at`); ordering guarantees; deterministic-replay law; snapshot pinning; replay equivalence/drift; engine-version isolation; migration envelopes; temporal-branching prohibition; immutable replay history; historical correction via additive envelopes only; stale-event ingestion; replay under partial data. Constitutional line: *"No organism state may depend on wall-clock execution timing."*

### G — AI Proposal vs Applied-State Separation
Strict envelope-level separation: AI proposal → athlete acknowledgement → negotiated adaptation → authoritative applied state → completed execution → observed result. Explicit prohibition: AI may not mutate organism truth. Envelope kinds: proposal · negotiation · acceptance/rejection · override · execution-confirmation · rollback. Closed-loop enforcement (Law 9).

### H — Materialized State Doctrine
Event log canonical; materialized state disposable. Latest-state projections, snapshot materializations, stale projections, partial-sync projections, replay rebuilds, invalidation, confidence-aware projections, tenant-scoped projections, safety-critical projections, rebuild priority. Constitutional line: *"Materialized state is disposable; event history is canonical."*

### I — Offline & Conflict Doctrine
Offline queue envelope requirements; delayed-ingestion behavior; stale-write audit; conflict envelopes; resolution ordering; reconciliation visibility; athlete-visible conflicts; replay after reconciliation; offline hard-stop behavior (per K6/K11 from 2C); offline authority restrictions; offline confidence decay. Explicit behaviors for: athlete vs coach disagreement, AI vs physician disagreement, stale queue reconnect after hard-stop, offline events crossing engine-version boundaries.

### J — Engine Version Doctrine
`engine_version` as immutable replay dimension; N/N-1 coexistence (per K4); migration envelopes; historical preservation; no silent rescoring; replay equivalence; migration rollback; shadow replay; dual-write migration; version audit permanence. Constitutional line: *"No historical organism interpretation may silently change."*

### K — Observability & Audit Transport
Required lineages per envelope: replay · authority · confidence · producer · engine-version · conflict · materialization · override. Minimum observability guarantees. Definitions of: unverifiable state · replay corruption · authority corruption · silent mutation · confidence fraud.

### L — Deferred Questions Register (envelope-doctrine scope only)
Seeded items (each with severity / doctrine risk / temporary containment / future review gate):
- L1 Confidence arithmetic family (per metric domain) — fixed-point precision selection.
- L2 Missingness taxonomy completeness (sensor vs semantic vs authority-withheld).
- L3 Authority revocation retroactivity bounds.
- L4 Migration envelope shape for cross-version semantic shifts.
- L5 Replay equivalence tolerance under floating-UI rendering.
- L6 AI proposal expiration semantics (TTL vs explicit withdrawal).
- L7 Conflict envelope ordering when wall-clock is untrusted.
No infrastructure questions (those remain in G1 §K / 2C registry).

### M — G2 Realization Entry Requirements
Schema realization may not begin until ALL of the following are ratified:
1. Canonical envelope shape (B)
2. Event taxonomy (C)
3. Confidence/missingness propagation law (D)
4. Authority transport semantics (E)
5. Temporal/replay determinism doctrine (F)
6. AI proposal separation (G)
7. Materialization doctrine (H)
8. Engine-version doctrine (J)
9. Observability lineage minimums (K)
Explicit prohibition on schema/DDL/runtime work before ratification + completion of 2E (topic registry), 2F (replay determinism spec), 2G (observability/SLO).

---

## Mandatory invariants (restated in artifact)

athlete-as-root tenancy · append-only event sourcing · replay determinism · confidence first-class · missingness first-class · authority travels with state · no fake AI autonomy · closed-loop intelligence · long-season durability · additive-only evolution · shadow migration · no silent rescoring · no wall-clock dependence · no client authority for organism safety.

## Out of scope for 2D

SQL · DDL · Supabase execution · edge functions · TypeScript · UI · API routes · queue implementation · concrete schemas · runtime code · migrations · infrastructure deployment · diagrams (deferred to 2E/2F if needed).

## Decision request

Ratify Phase 2D as the locked canonical envelope doctrine governing all future organism transport, replay, authority, confidence, AI orchestration, and longitudinal continuity. On ratification, the next phase is **Phase 2E — Topic Registry & Organism State Materialization Doctrine**. No implementation begins.
