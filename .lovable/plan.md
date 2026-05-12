# Phase 2B — Athlete State Bus (ASB) Realization Plan (IIP-Governed)

**Mode:** Implementation-planning only. No code, migrations, UI, prompts, or tables. All claims tagged with IIP §4 implementation states. No simulated completion.

## IIP §11 Header
- **Laws check:** 1, 2, 3, 5, 6, 7, 8, 9, 10
- **Canonical owner:** ASB (Athlete State Bus) — transport/state-infrastructure peer to LCE/BCE/TPE; governed by IIP, OEAL, IRCL, AINL, DGL, MAAL, SIL.
- **Longitudinal impact:** Establishes the substrate that carries organism truth, confidence, missingness, freshness, authority, and rehab/RTP state across multi-season operation. Every longitudinal subsystem (LCE, recovery capacity, elastic economy, career resilience) reads/writes through ASB; without it, longitudinal coherence cannot be guaranteed.
- **Behavioral impact:** AIP/ANE/APM/CIL/BAS, override pathways, authority hierarchy, uncertainty surfacing, youth protection, scenario bounds — all transit ASB. Pressure-environment, authority conflict, and override-escalation signals are first-class topics.
- **Scope touched (this artifact):** memory/doctrine planning only.
- **Implementation state (ASB overall):** `specified` → graduating to `implementation-planned` upon ratification of this document. All subsystems below carry their own state.
- **Verification status:** N/A — no implementation claimed.
- **Remaining uncertainty:** Section 13 enumerates known unknowns.
- **Drift risks:** Pre-implementation drift risk = doctrine fragmentation between owners; mitigated by single ASB doctrine file + Integration Audit gate.
- **Observable proof:** None yet; observability surfaces specified in §7.
- **Next dependency gates:** §11 sequencing gates G0–G7.

---

## 1. ASB Canonical Definition

**Role.** ASB is the organism-state transport substrate. It carries typed, versioned, timestamped, confidence-bound, missingness-aware state envelopes between canonical owners. It is **NOT** business logic, recommendation logic, UI state, scoring, prescription, or decision authority.

**Transport responsibilities:** publish/subscribe of typed envelopes; ordering guarantees per (user_id, topic); idempotent delivery via producer-supplied keys; envelope validation against contract registry; routing to persistence + downstream consumers.

**ASB does NOT own:** organism truth (owned by canonical feature owners), decision states (DGL), authority resolution (MAAL), scenario reasoning (SIL), recommendation generation (downstream engines), UI rendering, or ML inference.

**Canonical guarantees:**
1. Every published envelope is typed, versioned, signed by producer, and carries `confidence`, `missingness_reason?`, `freshness_at`, `engine_version`, `schema_version`, `idempotency_key`.
2. Exactly-one canonical producer per topic (enforced by registry).
3. At-least-once delivery with idempotent consumers.
4. Per-(user, topic) monotonic ordering by `freshness_at` then producer sequence.
5. No silent drops; rejected envelopes are logged to audit with reason.

**Persistence expectations:** every envelope persisted to an append-only event log; latest-per-(user, topic) materialized to a current-state table; longitudinal snapshots written on cadence per topic policy.

**Replay expectations:** any (user_id, as_of) state must be reconstructable from the event log against a pinned `engine_version`.

**Freshness propagation:** every derived envelope carries `min(freshness_at)` of its inputs; consumers must surface staleness, never hide it.

**Confidence propagation:** derived envelopes carry contract-specified combinator output (typically conservative min or weighted product); never inflated above any input.

**Missingness propagation:** absent inputs produce explicit `missingness_reason`; downstream MUST NOT coerce missing → neutral/healthy.

**Observability guarantees:** producer health, consumer lag, contract-rejection rate, stale-topic detection, orphan-topic detection, duplicate-producer detection, replay-drift detection — all surfaced (see §7).

**Anti-drift guarantees:** contract registry is the single source of truth; producers/consumers fail closed on schema mismatch; CI contract diff gate; runtime enforcer rejects unregistered topics.

---

## 2. Full Topic Inventory

Format per topic: `topic` — owner | producer | consumers | persist | freshness | confidence | missingness | replay | observability | drift risks | state.

> All topics below are `specified` unless noted. Producers/consumers refer to canonical owners, not concrete services.

### LCE
- `lce.quality_density` — LCE | LCE compositor | AINL, DGL, SIL | append+snapshot | 24h | weighted from rep_source toughness + freshness | absent → withhold | yes | per-user histogram | quality vs magnitude conflation | specified.
- `lce.recovery_capacity` — LCE | recovery model | DGL, AINL, IRCL | append+snapshot | 24h | model + input coverage | partial-input → low-confidence emit | yes | trend dashboard | population-prior leakage | specified.
- `lce.elastic_economy` — LCE | elastic model | AINL, SIL | append+snapshot | 7d | coverage of stride/throw economy inputs | absent → withhold | yes | dashboard | metric drift | specified.
- `lce.developmental_diversity` — LCE | diversity scorer | AINL, SIL | append+snapshot | 30d | coverage | absent → withhold | yes | dashboard | sport bias | specified.
- `lce.career_resilience` — LCE | resilience compositor | DGL, SIL, MAAL | snapshot | 30d | downstream of all LCE inputs | absent → withhold | yes | dashboard | optimism bias | specified.

### BCE (Behavioral / Phase 9)
- `bce.aip` (athlete intent posture) — AINL | AIP scorer | DGL, ANE, BAS | append+latest | 24h | input coverage | absent → unknown | yes | per-user trace | drift vs APM | specified.
- `bce.ane` (negotiation events) — AINL | ANE | DGL, audit | append | event | n/a | n/a | yes | event log | duplicate negotiations | specified.
- `bce.apm` (pattern memory) — AINL | APM aggregator | AIP, BAS | snapshot | 7d | coverage | absent → cold-start | yes | dashboard | overfitting | specified.
- `bce.cil` (communication intent layer) — AINL | CIL | UI consumers | latest | 24h | derived | absent → default register | yes | A/B audit | distortion of organism truth | specified.
- `bce.bas` (behavioral adaptation signal) — AINL | BAS | DGL | latest | 24h | derived | absent → no-op | yes | trace | feedback loop with AIP | specified.

### TPE (Training/Performance Engine — current Hammer engine)
- `tpe.session_completion` — TPE | activity logger | LCE, BCE, hammer | append | event | producer | n/a | yes | event log | duplicate logs (idempotency_key) | partially-implemented (today's `custom_activity_logs` is the source of truth; envelope wrapping pending).
- `tpe.cns_load` — TPE | universal CNS load calc | LCE, hammer, readiness | append+latest | 24h | input coverage | absent → withhold | yes | trend | non-universal contributors | partially-implemented.
- `tpe.rep_quality` — TPE | per-rep scorer | LCE, MPI | append | event | per-rep | n/a | yes | trace | rep_source toughness drift | partially-implemented.

### OEAL
- `oeal.intake_context` — OEAL | intake flow | AINL, LCE, IRCL | snapshot | per-event | input coverage | absent → block advanced prescription (per Core rule) | yes | audit | recontextualization vs restart confusion | specified.
- `oeal.context_confidence` — OEAL | OEAL scorer | DGL gate | latest | 24h | derived | low → restrict advanced prescription | yes | dashboard | premature graduation | specified.
- `oeal.recontextualization_event` — OEAL | OEAL | AINL, LCE | append | event | n/a | n/a | yes | audit | data overwrite | specified.

### IRCL
- `ircl.organism_state` — IRCL | rehab state machine | DGL, AINL, LCE, MAAL | latest+append | per-event | derived | absent → assume non-rehab w/ low confidence (NOT healthy) | yes | audit + dashboard | silent state regression | specified.
- `ircl.medical_restriction` — IRCL | medical translator | DGL (hard-stop), MAAL | latest+append | per-event | physician-sourced | absent → no restriction asserted | yes | audit | impersonation | specified.
- `ircl.rtp_phase` — IRCL | RTP engine | DGL, AINL, SIL | latest+append | daily | derived | absent → not-in-RTP | yes | audit | premature RTP advance | specified.
- `ircl.rehab_uncertainty` — IRCL | uncertainty model | DGL, AINL | latest | daily | derived | gaps amplify uncertainty | yes | dashboard | uncertainty collapse | specified.

### AINL
- `ainl.authority_intent` — AINL | intent resolver | DGL, MAAL | event+latest | per-event | derived | absent → AI may not act on athlete behalf | yes | audit | silent override | specified.
- `ainl.override_log` — AINL | override recorder | DGL, MAAL, audit | append (immutable) | event | n/a | n/a | yes | immutable log | tamper | specified.

### DGL
- `dgl.decision_state` — DGL | decision resolver | UI, AINL, audit | latest+append | per-decision | derived w/ confidence band | absent → informational-uncertainty | yes | trace per decision | green/yellow/red collapse (forbidden) | specified.
- `dgl.uncertainty_band` — DGL | uncertainty calc | DGL self, UI | latest | per-decision | derived | low coverage → widens band → may downgrade decision state | yes | trace | hidden precision | specified.
- `dgl.hard_stop` — DGL | medical/safety gate | all consumers | latest+append | event | physician/IRCL | absent → no hard-stop asserted | yes | audit | bypass | specified.

### MAAL
- `maal.actor_authority_state` — MAAL | authority resolver | DGL, AINL | latest | per-event | derived | absent → default to most protective | yes | audit | silent coach/parent override | specified.
- `maal.authority_conflict` — MAAL | conflict detector | DGL, audit | append | event | derived | n/a | yes | audit | unresolved conflict aging | specified.
- `maal.youth_protection_state` — MAAL | youth gate | DGL, SIL | latest | per-event | DOB-derived | absent → assume protected | yes | audit | DOB drift (Core: DOB authoritative) | specified.
- `maal.competitive_pressure_environment` — MAAL | pressure tracker | DGL, SIL, AINL | latest+append | event | self-report + signals | absent → unknown | yes | dashboard | weaponization | specified.

### SIL
- `sil.scenario_projection` — SIL | scenario engine | UI, AINL, DGL | append+latest | per-request | bounded band | absent → no projection | yes | trace | deterministic-destiny language (forbidden) | specified.
- `sil.pathway_tradeoff` — SIL | tradeoff calc | UI, AINL | append | per-request | derived | n/a | yes | trace | pressure-biased framing | specified.
- `sil.rtp_simulation` — SIL | RTP scenario | IRCL, DGL | append | per-request | derived from IRCL | absent → no sim | yes | trace | over-promise | specified.

### Hammer (engine snapshot)
- `hammer.state_snapshot` — Hammer | engine compositor | UI, AINL, DGL | append+latest | per-recompute | derived | absent → unknown | yes | trace + version | engine_version drift (Core: `engine_snapshot_versions.engine_version` only) | partially-implemented.
- `hammer.recompute_request` — Hammer | activity completion + cron | engine compositor | event | event | producer | n/a | yes | event log | throttle bypass (Core: 8s throttle) | partially-implemented.

### Load / Debt
- `load.debt_24h` / `load.debt_7d` / `load.debt_28d` — TPE/LCE | load model | DGL, AINL, IRCL | latest+append | per-cadence | input coverage | absent → withhold | yes | dashboard | dampening drift (Core: rest engine) | partially-implemented.

### Readiness
- `readiness.composite` — Readiness | `useReadinessState` evolved into producer | DGL, UI | latest | per-source freshness windows | weighted (current code: HIE/Physio/Focus, raw weights, ≥0.3 confidence floor) | stale source dropped; insufficient → `unknown` | yes | trace | "fake 60" regression (already prevented in code) | partially-implemented (client-side; needs server-side producer envelope).
- `readiness.source_breakdown` — Readiness | same | UI, audit | latest | per-source | per-source | absent source emitted as missing, not zero | yes | trace | source weight drift | partially-implemented.

### Competitive Density
- `competitive.density_index` — TPE/LCE | competitive density calc | LCE, DGL, SIL | snapshot | 7d | rep_source toughness coverage | absent → withhold | yes | dashboard | tee/game mislabel | specified.

### Psychological Density
- `psych.density_index` — LCE | psych density model | AINL, DGL | snapshot | 7d | coverage | absent → withhold | yes | dashboard | self-report bias | specified.

### Bilateral
- `bilateral.asymmetry_index` — TPE | bilateral calc | LCE, IRCL | snapshot | 7d | side-coverage | absent → withhold | yes | dashboard | handedness mislabel (Core: session intent gate) | specified.

### Elastic Economy
- `elastic.economy_index` — LCE | elastic model | AINL, SIL | snapshot | 7d | coverage | absent → withhold | yes | dashboard | metric drift | specified.

### Recovery Capacity
- `recovery.capacity_index` — LCE | recovery model | DGL, AINL, IRCL | snapshot | daily | coverage | partial → low-confidence | yes | dashboard | trainable-recovery doctrine drift | specified.

### Career Resilience
- `career.resilience_index` — LCE | resilience compositor | DGL, SIL, MAAL | snapshot | 30d | coverage | absent → withhold | yes | dashboard | optimism bias | specified.

### Tool Capability
- `tool.capability_state` — Performance Intel | tool gap engine | DGL, SIL, AINL | snapshot | weekly | ≥15pt-delta logic (Core: HIE tool gap unification, ≥5 game/practice reps) | absent → withhold | yes | dashboard | unification drift | partially-implemented.

### Return To Play
- `rtp.gate_state` — IRCL | RTP gate | DGL (hard-stop interface), AINL, SIL | latest+append | per-event | derived | absent → not-in-RTP | yes | audit | premature green-light | specified.

### Authority / Override
- `authority.hierarchy_state` — MAAL | hierarchy evaluator | DGL, AINL | latest | per-event | derived | absent → most protective | yes | audit | silent bypass | specified.
- `authority.override_event` — AINL/MAAL | recorder | audit, DGL | append (immutable) | event | actor-attested | n/a | yes | immutable log | tamper | specified.
- `authority.high_impact_override_ack` — AINL | override flow | audit | append | event | required by Core rule | n/a | yes | immutable log | missing ack | specified.

### Scenario
- (covered under SIL above)

### Missingness
- `missingness.coverage_report` — ASB | coverage scanner | DGL, observability | snapshot | hourly | self | n/a | yes | dashboard | silent gaps | specified.
- `missingness.spike_event` — ASB | drift detector | observability, DGL | append | event | self | n/a | yes | alert | alert fatigue | specified.

---

## 3. Producer / Consumer Dependency Graph

```text
                 ┌──────────────────────────────────────────────────────┐
                 │                  IIP (governance)                    │
                 └──────────────────────────────────────────────────────┘
                                       │
                ┌──────────────────────┼──────────────────────┐
                │                      │                      │
              OEAL ──▶ AINL ──▶  ┌─── ASB (transport) ───┐ ◀── IRCL
                                 │                       │
   TPE ──▶ load/cns/reps ───────▶│                       │◀── medical/RTP
   LCE ──▶ longitudinal ────────▶│  contract registry +  │
   Readiness ──▶ composite ─────▶│  event log + latest   │──▶ DGL ──▶ MAAL ──▶ SIL
   MAAL ──▶ authority/youth ────▶│  + snapshots + audit  │             │
   AINL ──▶ overrides ──────────▶│                       │             ▼
                                 └───────────────────────┘           UI / Hammer
```

**Sequencing (must precede ASB code):** IIP (locked), OEAL, IRCL, DGL, MAAL, SIL, AINL doctrines (all `specified`/ratified). Contract registry skeleton.

**Must exist before ASB serves traffic:** envelope contract spec, append-only event log, latest-state materialization, idempotency-key enforcement, contract validator, audit log.

**Cannot be implemented before ASB:** unified Hammer recompute pipeline at organism-truth fidelity, DGL runtime enforcer, MAAL authority resolver runtime, SIL scenario engine binding, OEAL recontextualization runtime, IRCL state-machine runtime.

**Can be mocked temporarily:** SIL projections (bounded stub), `psych.density_index`, `elastic.economy_index`, `career.resilience_index` (emit `missingness_reason: model_pending`).

**Replay-safe persistence required day one:** all `*_event`, `*_log`, `override_*`, `medical_restriction`, `decision_state`, `hard_stop`, `recontextualization_event`, `hammer.state_snapshot`.

**Circular-dependency risks:** AINL ↔ DGL (intent vs decision), DGL ↔ MAAL (decision vs authority). Resolved by **sequencing rule**: MAAL evaluated → AINL resolves intent within authority bounds → DGL emits decision; no back-edges within a single tick.

**Eventual-consistency concerns:** latest-per-topic may lag event log; consumers must read by `freshness_at` and tolerate replay reorder.

**Stale-state risks:** readiness sources beyond freshness window (already handled in code); IRCL state during data gaps (uncertainty must amplify).

**Confidence-decay pathways:** every hop applies a contract-declared combinator; no hop may inflate.

---

## 4. Canonical Contract Realization Plan

Per contract: `current state | priority | validation | runtime enforcement | observability | drift detection | migration | replay | confidence rule`.

- **EnvelopeV1** (universal wrapper: `topic, user_id, payload, schema_version, engine_version, freshness_at, confidence, missingness_reason?, idempotency_key, producer_id, signature?`) — `specified` | P0 | JSON schema + zod | reject-on-mismatch at ASB ingress | ingress accept/reject counters | CI schema diff | additive only; new versions side-by-side | required for replay | confidence ∈ [0,1].
- **DecisionGovernanceContract** — `specified` | P0 (DGL) | schema + 8-state enum | DGL runtime | per-decision trace | CI | additive | required | confidence band attached.
- **AuthorityResolutionContract** — `specified` | P0 (MAAL) | schema + actor taxonomy | MAAL runtime | conflict log | CI | additive | required | conservative combinator.
- **ScenarioProjectionContract** — `specified` | P1 (SIL) | schema + bounds | SIL runtime | trace | CI | additive | required | bounded bands mandatory.
- **OEALIntakeContract** — `specified` | P0 | schema + coverage rules | OEAL runtime | coverage dashboard | CI | additive | required | coverage→confidence.
- **IRCLStateContract** — `specified` | P0 | schema + state machine | IRCL runtime | state log | CI | additive | required | rehab gaps amplify uncertainty.
- **LCEOutputContract** — `specified` | P1 | schema + interpretability fields (Core: 5 exposures) | LCE runtime | per-output trace | CI | additive | required | inputs+per-input confidence required.
- **HammerSnapshotContract** — `partially-implemented` | P0 | schema + `engine_version` (Core authoritative) | engine compositor | snapshot trace | CI | engine_version pinning | required | coverage→confidence.
- **ReadinessContract** — `partially-implemented` | P1 | schema + per-source freshness | readiness producer | trace | CI | side-by-side | required | ≥0.3 floor (existing).
- **OverrideLogContract** — `specified` | P0 | schema + ack requirement (Core: high-impact) | AINL runtime | immutable log | CI | append-only | required | actor-attested.

Distinguish for each: **conceptual contract** (doctrine), **transport envelope** (EnvelopeV1 wrapper), **persistence schema** (event log + latest + snapshot tables), **runtime validator** (zod + ASB ingress), **consumer interface** (typed read API + missingness branches mandatory).

---

## 5. Confidence / Missingness Transport Architecture

**Freshness:** every envelope carries `freshness_at`. Derived envelopes set `freshness_at = min(inputs.freshness_at)`. Consumers compare against per-topic `max_age`; stale → drop from composite (matches existing `useReadinessState` pattern) and emit `missingness_reason: stale`.

**Confidence decay:** combinators declared per derived topic — default conservative `min`; weighted product allowed only when contract specifies. No hop may inflate. Population priors may inform but **never** raise confidence above athlete-evidence ceiling (Core: human-authority hierarchy).

**Coverage scoring:** OEAL emits `oeal.context_confidence`; LCE/Readiness/Hammer carry `coverage` field (fraction of expected inputs present and fresh). DGL gates advanced prescription on coverage thresholds.

**Explanation candidates:** every confidence value travels with a structured `reason_chain[]` (input ids + per-input confidence + transformation). Required by LCE Interpretability Mandate.

**Partial-read behavior:** consumer receives `{value?, confidence, missingness_reason?, reason_chain[]}`. Branches MUST handle missing.

**Stale-read behavior:** treat as missing with `reason: stale`. Never coerce to neutral.

**Absent-topic behavior:** consumer receives explicit absence sentinel; default-to-most-protective (MAAL/IRCL/DGL).

**Low-confidence withdrawal:** DGL may downgrade to `informational-uncertainty` or `restriction` when confidence band exceeds threshold.

**Replay semantics:** confidence and missingness reconstructed deterministically from event log against pinned `engine_version`.

**Longitudinal decay:** snapshots record point-in-time confidence; LCE applies time-based decay only via declared combinators; never silently.

**Hard rule (restated):** No consumer may silently interpret missing data as healthy state. Enforced by typed consumer interface that has no "default value" path.

---

## 6. Replay + Time-Travel Architecture

- **Event model:** append-only `asb_events` partitioned by (user_id, month). Immutable.
- **Immutable vs mutable:** events immutable; latest-per-topic and snapshots are derived/mutable (recomputable from events).
- **Snapshots:** per-topic cadence (e.g., daily for hammer, per-event for IRCL/DGL/overrides). Snapshots include `engine_version` and `schema_version`.
- **Recomputation:** `replay(user_id, as_of, engine_version)` rebuilds state by replaying events ≤ `as_of` through pinned engine version.
- **Engine-version handling:** every snapshot pinned to `engine_snapshot_versions.engine_version` (Core authoritative). Old snapshots remain valid; new engine writes new snapshots — never overwrites historical organism truth.
- **Audit reconstruction:** any decision, override, recommendation, or RTP transition reconstructable from event log + pinned engine version.
- **Historical recommendation reconstruction:** `dgl.decision_state` events + inputs preserve full trace.
- **Override reconstruction:** immutable `override_log` + ack events.
- **Rehab timeline:** IRCL events form a closed timeline; gaps explicit, not inferred.
- **Longitudinal curve:** LCE snapshots replayable via pinned model versions.

**Future engine upgrades:** new engine version writes new snapshots side-by-side. Historical snapshots remain authoritative for their period. Replays specify engine version explicitly. No retroactive overwrite permitted.

---

## 7. Observability + Drift Infrastructure

Per signal: `detection source | severity | response | surface | audit`.

- **Producer health (heartbeat / publish rate)** — ASB ingress | warn/crit | alert + degrade | ops dashboard | yes.
- **Consumer lag** — consumer ack offsets | warn/crit | alert | dashboard | yes.
- **Stale-topic** — freshness scanner | warn | mark missing downstream | dashboard | yes.
- **Orphan-topic** (no consumer) — registry diff | warn | block deploy | CI + dashboard | yes.
- **Duplicate producer** — registry | crit | reject deploy | CI | yes.
- **Contract divergence** — schema diff | crit | reject envelope at ingress | CI + ingress log | yes.
- **Confidence collapse** (sudden drop) — anomaly detector | warn | DGL widens bands | dashboard | yes.
- **Replay drift** — periodic replay vs stored snapshots | crit | freeze writes for affected topic | dashboard + immutable audit | yes.
- **Authority hierarchy violation** — MAAL runtime | crit | reject decision; require ack | immutable audit | yes.
- **Override escalation anomaly** — AINL/MAAL | crit | escalate + notify | audit | yes.
- **Missingness spike** — ASB scanner | warn | DGL informational-uncertainty | dashboard | yes.
- **Silent consumer failure** (no progress, no error) — ack-gap detector | crit | alert + degrade | dashboard | yes.

---

## 8. Persistence & State Classification

- **Transient:** in-flight envelopes (queues), client UI hover state.
- **Replayable event state:** `asb_events` (all topics).
- **Longitudinal snapshots:** `asb_snapshots_*` per topic policy.
- **Immutable audit:** `override_log`, `medical_restriction`, `decision_state` (immutable copy), `recontextualization_event`.
- **Derived state:** `asb_latest_*` materializations.
- **Recomputable state:** anything derivable from events at a pinned engine version.
- **Authoritative state:** medical restrictions, DOB-derived youth-protection state, override acks.
- **Cache-only state:** UI denormalizations.

**Must persist:** all events, all immutable audit, snapshots required for replay/longitudinal continuity.
**May be recomputed:** latest materializations, derived dashboards, non-audit aggregates.

---

## 9. OEAL + IRCL Integration

- **Intake → bus:** OEAL emits `oeal.intake_context` + `oeal.context_confidence` envelopes; downstream advanced prescription gated until threshold met (Core).
- **Recontextualization (existing athletes):** OEAL emits `recontextualization_event`; consumers refresh, do **not** wipe history.
- **Rehab supersession:** when `ircl.organism_state` ∈ rehab states, DGL routes readiness/load decisions through IRCL gates; normal readiness logic suppressed (not deleted) and tagged `superseded_by: ircl`.
- **RTP transitions:** `ircl.rtp_phase` transitions emit immutable events; SIL `rtp_simulation` may project but never decide.
- **Medical restrictions:** `ircl.medical_restriction` → `dgl.hard_stop` (no other path may bypass).
- **Uncertainty in rehab gaps:** `ircl.rehab_uncertainty` widens with gap duration; never narrows during data absence.

---

## 10. DGL + MAAL + SIL Integration

- **Authority conflicts:** MAAL emits `maal.authority_conflict`; DGL must resolve before emitting non-informational decision; unresolved → `informational-uncertainty`.
- **Override persistence:** AINL/MAAL append immutable `override_event` + `high_impact_override_ack` (Core). DGL reads and tags downstream decisions.
- **Uncertainty modifies decisions:** `dgl.uncertainty_band` widens → DGL may downgrade state per §11 of DGL doctrine.
- **Scenario bounds:** SIL outputs always include confidence bands + tradeoffs + survivability/biological/retention/elasticity/opportunity-cost (Core); deterministic-destiny language forbidden at producer.
- **Pressure environments:** `maal.competitive_pressure_environment` is a tracked signal; never authoritative; DGL may down-weight pressure-driven inputs.
- **Youth protection:** `maal.youth_protection_state` propagates as a hard gate to SIL projections and DGL high-impact decisions; absent DOB → assume protected.

---

## 11. Implementation Sequencing Plan

**Gates (must pass in order before next begins):**

- **G0 — Doctrine Lock (this artifact ratified).** Implementation state: `implementation-planned`.
- **G1 — Contract Registry skeleton + EnvelopeV1 schema** (no producers yet). Verification: schema in repo, CI diff gate active, no runtime traffic. Rollback: delete files. Observability: CI only.
- **G2 — ASB ingress + append-only event log + audit log** (no consumers). Verification: synthetic envelopes ingested + queryable; reject-on-mismatch test; idempotency test. Rollback: drop tables (no production data yet). Observability: ingress counters.
- **G3 — Latest-state materialization + replay primitive.** Verification: replay equality test on synthetic stream; snapshot vs replay diff = 0. Rollback: drop materializations.
- **G4 — First producer migration: `tpe.session_completion`, `tpe.cns_load`, `hammer.state_snapshot` wrap existing flows in EnvelopeV1** (dual-write; legacy remains source of truth). Verification: dual-write parity ≥ 99.9% over N days; trace per write. Rollback: disable dual-write flag.
- **G5 — First consumers (read-only shadow): readiness composite, hammer recompute** consume from ASB; outputs compared to legacy. Verification: shadow diff dashboard; no user-visible change. Rollback: disable shadow read.
- **G6 — DGL/MAAL/AINL/IRCL/OEAL runtime binding behind feature flag** per cohort. Verification: per-decision trace, override audit, authority-conflict audit; no silent missingness coercion. Rollback: flag off.
- **G7 — LCE / SIL producers + Tool Capability + Competitive Density.** Verification: per-output reason_chain present, confidence bounded, drift detector green ≥ N days. Rollback: producer disable + consumers fall back to missingness.

**Anti-drift checkpoints between gates:** orphan-topic scan = 0; duplicate-producer scan = 0; contract-diff CI green; replay-equality green; missingness-coverage report reviewed.

**Implementation-state definitions (binding):**
- `partially-implemented` — code exists for some producers/consumers; dual-write or shadow-read active; not yet authoritative.
- `implemented-unverified` — full producer+consumer+persistence path exists but proof-of-closure (§12) incomplete.
- `verified` — all §12 proofs satisfied for the topic.
- `production-observed` — `verified` + ≥ N days of production observability green + at least one successful replay drill + at least one successful rollback drill.

---

## 12. Proof-of-Closure Criteria (per topic, then per ASB)

A topic is `verified` only when ALL of:
1. Canonical producer present, registered, signature-validated.
2. ≥1 canonical consumer present, ack offsets advancing.
3. Persistence: event log write + latest materialization + snapshot policy active.
4. Replay: deterministic equality test passes against pinned engine_version.
5. Confidence propagation: per-input reason_chain present; no inflation observed.
6. Missingness propagation: missing/stale paths exercised in tests; no neutral coercion.
7. Observability: all §7 signals wired for the topic.
8. Authority handling (where applicable): MAAL/AINL paths exercised; override audit complete.
9. Rehab continuity (where applicable): IRCL supersession exercised; gap uncertainty widens.
10. Longitudinal reconstruction: historical query at arbitrary `as_of` returns deterministic result.

**ASB overall** is `verified` only when every P0 topic is `verified` and §13 risks have declared mitigation paths in `production-observed` state.

No "ASB complete" claim may occur without all of the above. Banned phrases (Core IIP) apply.

---

## 13. Known Unknowns / Architectural Risks

Each: `severity | affected owners | mitigation | observability`.

- **Replay performance at multi-year scale** — high | ASB, LCE | per-user partitioning, snapshot cadence tuning, replay-from-snapshot+delta | replay-duration histogram.
- **Schema evolution without breaking replay** — high | ASB | additive-only + side-by-side versions; never edit historical envelopes | CI schema diff + replay drift detector.
- **Confidence combinator correctness** — high | LCE, DGL | property-based tests; declared per-topic combinators; no defaulting | confidence anomaly detector.
- **Authority-conflict deadlocks** (AINL ↔ DGL ↔ MAAL) — high | DGL, MAAL, AINL | strict per-tick sequencing rule (§3); deadlock detector | conflict-aging alert.
- **Silent consumer failure under feature-flag rollout** — high | ASB, all consumers | ack-gap detector + canary cohort | dashboard.
- **Population-prior leakage into athlete-evidence confidence** — high | LCE, MAAL | combinator forbids inflation; tests | reason_chain audit.
- **Engine-version drift between writers** — high | Hammer, LCE | single source `engine_snapshot_versions.engine_version` (Core) + ingress check | drift detector.
- **Missingness coercion in UI consumers** — medium | UI | typed consumer interface without default path; lint rule | coverage report.
- **Override tamper / misattribution** — high | AINL, MAAL | immutable log + actor signature + ack | immutable audit.
- **OEAL recontextualization overwriting history** — high | OEAL | events append-only; recontextualization is a new event, never an edit | audit.
- **IRCL state regression silently** — high | IRCL | state-machine guards + audit on every transition | dashboard.
- **Pressure-environment weaponization** — medium | MAAL, SIL | pressure is signal-only, never authoritative (Core) | audit.
- **Deterministic-destiny language leaking into SIL outputs** — medium | SIL | producer-side lint + reviewer gate | sample audits.
- **Test coverage gap for missingness branches** — high | all consumers | mandatory missingness-branch tests in consumer SDK | CI.
- **Idempotency-key collisions** — medium | all producers | producer-supplied UUID v4 (Core: `crypto.randomUUID()` for sessions) + ingress dedupe | counter.
- **Multi-tab race conditions** — medium | UI consumers | `BroadcastChannel('data-sync')` with `TAB_ID` (Core) | logs.
- **PWA stale clients reading stale envelopes** — medium | UI | `/version.json` probe vs `__BUILD_ID__` (Core) | client telemetry.

---

## 14. Final Deliverable

### A. Implementation Dependency Graph
`IIP → (OEAL, IRCL, DGL, MAAL, SIL, AINL doctrines) → Contract Registry + EnvelopeV1 → ASB ingress + event log + audit → Latest materialization + replay primitive → TPE/Hammer dual-write producers → Readiness/Hammer shadow consumers → DGL/MAAL/AINL/IRCL/OEAL runtime (flagged) → LCE/SIL/Tool Capability/Competitive Density producers → Production-observed.`

### B. Canonical Implementation Order
G0 → G1 → G2 → G3 → G4 → G5 → G6 → G7 (per §11). No gate may be skipped or parallelized across gate boundaries.

### C. Current Implementation State of Every Subsystem
- **IIP:** `verified` (doctrine; runtime enforcement = `implementation-planned`).
- **OEAL, IRCL, DGL, MAAL, SIL, AINL, LCE, ASB:** `specified` (doctrine ratified; code = `conceptual`).
- **TPE (`custom_activity_logs`, CNS load, rep quality), Hammer engine snapshot, Readiness composite, Load/Debt, Tool Capability:** `partially-implemented` (legacy code present; ASB envelope wrapping + dual-write pending).
- **All other topics in §2:** `specified` unless explicitly noted.

### D. Gates Required Before First ASB Code Is Allowed
1. This artifact ratified (G0).
2. Contract registry repo location + ownership confirmed.
3. EnvelopeV1 schema reviewed + approved.
4. Append-only event log persistence design reviewed (partitioning, retention, cost).
5. CI gates (schema diff, orphan/duplicate scan) designed.
6. Rollback plan + feature-flag strategy approved.
7. Observability surfaces (§7) confirmed deliverable in target stack.

### E. Gates Required Before ASB May Be Called "Verified"
All of §12 satisfied for every P0 topic; §11 G7 reached; §13 high-severity risks each in `production-observed` mitigation; one successful replay drill; one successful rollback drill; orphan/duplicate scans = 0 for ≥ N days.

### F. Future Audit Requirements (Lifetime Anti-Drift)
- Quarterly contract-diff audit (registry vs producers vs consumers).
- Quarterly replay-drift drill per P0 topic.
- Continuous orphan/duplicate scans in CI + runtime registry.
- Per-PR Integration Audit declaration (Laws / Canonical owner / Longitudinal / Behavioral / Authority+Uncertainty+Pressure+Youth+Scenario / Entry+Rehab continuity / IIP §11 reporting).
- Annual engine-version inventory + replay-equality recertification.
- Annual missingness-coverage review per topic.
- Override-log integrity audit (signature + ack chain) every release.

---

## Out of Scope
No code, migrations, edge functions, UI, prompts, database tables, or feature implementation. This is implementation-grade planning only. Phase 2B implementation begins only after this plan is ratified and §11 G0 gates close.

## Decision Requested
Ratify this Phase 2B ASB Realization Plan as the executable map governing all subsequent ASB implementation. On approval, no implementation begins until G1 design review (separate artifact) is also approved.
