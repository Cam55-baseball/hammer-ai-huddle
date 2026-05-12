# Phase 2B — G1 ASB Infrastructure Design Review

**Artifact type:** IIP-governed design review. Doctrine only. No code, migrations, UI, prompts, or runtime artifacts. No completion claims.

---

## IIP §11 Header

- **Laws check:** 1 (One Organism), 2 (No Unused Data), 3 (Missingness Is a Signal), 4 (Speed Is Core NS Infra), 5 (Intent≠Completion), 6 (Self-Correct), 7 (Engine Becomes More Elite), 8 (No Fake AI), 9 (Closed Loop or Don't Ship), 10 (Long-Season Durability).
- **Canonical owner(s):** Athlete State Bus (ASB) — infrastructure substrate. Cross-owners: LCE, BCE, TPE, OEAL, IRCL, AINL, DGL, MAAL, SIL, IIP.
- **Longitudinal impact:** Establishes the transport substrate that every longitudinal subsystem depends on across multi-year athlete timelines, multi-org rosters, and engine-version transitions. Choices locked here govern decade-scale replayability, elastic economy continuity, and career resilience auditability.
- **Behavioral impact:** Defines the runtime surfaces where AINL/DGL/MAAL negotiation, override propagation, authority enforcement, and uncertainty-bound communication actually execute. Wrong topology = silent authority bypass.
- **Scope touched:** Architectural doctrine only. Two memory artifacts proposed (one new, one updated). No tables, edge functions, hooks, or UI.
- **Current implementation state:** `specified` for all ASB subsystems. Adjacent subsystems (TPE snapshots, Readiness, Foundation tracing) remain `partially-implemented` and continue under their existing contracts until shadow-read milestones (G4/G5).
- **Verification status:** Doctrine artifact — verification = peer ratification. Runtime verification deferred to G2+.
- **Remaining uncertainty:** Multiple HIGH-severity items registered in §K (Deferred Decisions). None block G1 ratification; all block G2 entry.
- **Drift risks:** (a) Premature implementation before G2 schema review; (b) Supabase-coupling decisions becoming irreversible; (c) offline semantics under-specified at G2; (d) tenant model drifting from athlete-as-root.
- **Observable proof:** Memory files written + index updated; no runtime proof claimed.
- **Next dependency gates:** G2 (schema + ingress + event-log realization plan); blocked until §K HIGH items are resolved/deferred-with-mitigation/accepted-and-logged per §L.

---

## Conceptual / Planned / Deferred Separation (IIP)

| Category | Items |
|---|---|
| **Conceptual doctrine (this artifact)** | All Sections A–L below |
| **Implementation-planned infrastructure** | Envelope contract shape, event-log append-only model, replay-from-snapshot model, per-topic real-time class, trust-tier weighting model |
| **Unresolved unknowns** | Every item in §K |
| **Deferred infrastructure** | Cross-region replay, motion-capture ingestion, multi-engine-version coexistence beyond N/N-1, federated org-of-orgs, on-device LCE inference |
| **Verified assumptions** | Lovable Cloud (Supabase) is current backend; PostgREST + Realtime available; client = React PWA; edge functions = Deno |
| **Unverified assumptions** | Realtime fan-out throughput at org scale; logical-replication ceilings; pg event-log partitioning costs at multi-year horizon; offline queue durability across iOS PWA backgrounding |

---

## SECTION A — Runtime Topology Design

**Responsibilities:**

- **Client (PWA):** local intent capture, offline queueing, optimistic UI under bounded confidence, AINL negotiation surfaces, override acknowledgement capture, last-known-state replay for offline UX. Never authoritative for organism truth, hard-stops, or authority transitions.
- **Edge functions:** envelope validation, idempotency enforcement, producer-identity verification, topic routing, confidence/missingness normalization, DGL/MAAL runtime gates for high-impact writes, AI orchestration calls, external-producer trust adjudication.
- **Database (Postgres):** authoritative event log (`asb_events`), latest-state materializations, snapshot store, engine-version registry, override audit, authority transitions, tenant boundary enforcement via RLS.
- **Event log:** append-only, monotonic per (athlete, topic), envelope-versioned, engine-version-pinned, replay-complete.
- **Realtime transport:** Supabase Realtime (Postgres logical replication) for soft real-time topics; edge-invoked fan-out for hard real-time hard-stops; client polling fallback for replay-only and async.
- **Replay runtime:** deterministic re-execution against pinned engine_version + snapshot baseline + event tail, mirroring the existing `foundationReplay` pattern but generalized.
- **Orchestration runtime:** edge-side AINL/DGL/MAAL adjudicators; never client-side for authority decisions.
- **Observability runtime:** trace insertion (mirrors `foundation_recommendation_traces`), drift detectors, replay drills, SLO emitters.

**Current intended stack:** Lovable Cloud (Supabase Postgres + Realtime + Edge), React PWA client, Workbox SW, BroadcastChannel multi-tab.

**Probable future evolution:** dedicated event-log partition cluster; CDC pipeline to analytical store; dedicated orchestration runtime if edge-function cold-start becomes hard-real-time blocker; on-device inference for Speed-Is-Core-NS-Infra topics.

**Irreversible architectural assumptions (locked):**
1. Append-only event log is the source of truth.
2. Athlete is the root tenant entity (orgs are overlays — see §B).
3. Engine-version is pinned per envelope.
4. Confidence + missingness are first-class envelope fields.
5. Authority decisions are server-side.

**Temporary implementation shortcuts (must be auditable, not load-bearing):**
- Single-region Supabase deployment.
- Single-table `asb_events` partition strategy at G2 (logical partitioning by topic-class deferred to post-G7).
- Edge functions handle orchestration directly (dedicated runtime deferred).

**Anti-lock-in strategy:** all consumers go through `EngineInputContractV2`-style adapters; no direct table coupling; envelope schema is the only stable contract; Supabase-specific features (Realtime, RLS) abstracted behind `BusTransport` / `TenancyEnforcer` interfaces (specified at G2).

**Supabase constraints to respect:**
- Realtime fan-out limits (per-channel subscriber ceilings).
- Logical replication slot pressure under high write volume.
- Edge function cold-start unsuited to hard real-time (<200ms) — handled via persistent connections + warm pools.
- RLS recursion (use `has_role`-style SECURITY DEFINER functions per project memory).

**Replay scalability ceiling:** at G2 baseline, full-history replay viable to ~10⁶ events/athlete; beyond that requires snapshot-cadence enforcement (§G).

---

## SECTION B — Multi-Tenant / Multi-Actor Architecture

**Locked decision:** **Athlete-as-root.** Every envelope is keyed to `athlete_id`. Organizations, teams, academies, facilities, colleges, pro orgs are **overlays** that grant scoped visibility/authority via `organization_members`-style mappings, never own the organism.

**Hierarchy model:** athlete ⟵ (membership) ⟶ org; org ⟵ (parent_org_id) ⟶ parent org. Inheritance flows org→athlete only for visibility scopes, never for organism truth.

**Authority scoping:** MAAL actor taxonomy (athlete, coach, parent, physician, org-admin, scout) attaches to memberships with explicit scope grants. No silent inheritance across org transfers.

**Data isolation:** RLS enforced on every table containing envelopes; tenant leakage is a §H catastrophic failure class.

**Cross-org visibility:** explicit grant model (athlete-controlled), not transitive. Showcase/scout visibility is a time-bounded grant envelope.

**Transfer semantics:** athlete leaving an org revokes that org's future visibility, preserves historical authority audit. Organism continuity is unbroken (athlete-as-root).

**Replay implications:** replays must respect tenant boundaries at the read-model layer; raw event log is athlete-scoped, so replay is naturally clean.

**Audit implications:** every authority assertion logs (actor_id, actor_role, org_context_id, scope_grant_id).

---

## SECTION C — Real-Time Classification Matrix

| Class | Acceptable lag | Examples | Reconciliation | Stale-state | Offline | Replay |
|---|---|---|---|---|---|---|
| **Hard real-time** | <500ms | DGL hard-stops (medical restriction, RTP block), live in-rep injury flag | Server-confirmed before action; client may not act on stale | Block UI action | Block (cannot act offline) | Replay-safe |
| **Soft real-time** | <5s | LCE recompute on rep completion, BCE state refresh, AINL negotiation prompt | Last-write-wins per topic with monotonic seq | Show with staleness badge | Queue + warn | Replay-safe |
| **Async reflective** | seconds–minutes | Foundation recommendations, longitudinal aggregations, daily readiness | Idempotent recompute | Acceptable | Queue | Replay-safe |
| **Replay-only** | n/a | Engine-version migrations, historical re-derivation | Batch | n/a | n/a | Primary path |
| **Immutable audit** | append-only | Authority overrides, MAAL escalations, IRCL transitions | None (append-only) | n/a | Queue with strong durability | Primary source |
| **Eventually consistent** | minutes–hours | Cross-org analytics, cohort priors, population baselines | Periodic reconciliation | Show with timestamp | Acceptable | Replay-safe |

**Per-topic class assignment** is deferred to G2 topic registry, but the classifier doctrine is locked here.

---

## SECTION D — Offline / Sync / Reconciliation Architecture

- **Offline queue strategy:** durable IndexedDB queue with envelope pre-stamped (athlete_id, client_ts, idempotency_key via `crypto.randomUUID()`, last-known engine_version).
- **Client persistence boundary:** queue + last-known materialized state for current athlete only. No cross-athlete data offline.
- **Sync arbitration:** server applies envelopes in (server_received_ts, client_ts, idempotency_key) order. Idempotency key dedupes.
- **Stale-write rejection:** envelopes older than current authoritative state for that topic by > topic-defined staleness window are rejected with `stale_write` audit row, never silently dropped (Law 3).
- **Conflict-resolution hierarchy:** Medical → Organism Safety → Longitudinal Survivability → Athlete → Coach/Parent/Org → AI → Population priors (per Decision Governance Layer).
- **Delayed-event ingestion:** events with `client_ts` < snapshot baseline trigger snapshot invalidation + replay from prior snapshot.
- **Local replay expectation:** client replays last-known state from local snapshot + queued tail for offline UX continuity; UI always shows confidence + staleness.
- **Reconnect reconciliation:** drain queue → fetch authoritative tail → resolve conflicts → emit reconciliation report to observability.
- **Partial-sync organism state:** organism state is marked `partial_sync` with explicit missingness reasons; AINL/DGL operate on bounded confidence.
- **Client truth vs server truth:** server is always authoritative. Client truth is operational convenience under bounded staleness.
- **Authoritative timestamping:** server_received_ts is authoritative for ordering; client_ts is preserved for forensic replay only.
- **Offline override handling:** athlete overrides queued; coach/parent overrides queued with delayed-effect flag; physician/medical overrides require online confirmation (cannot apply offline — Law 1, organism safety).
- **Duplicate handling:** idempotency_key uniqueness constraint at event-log layer.
- **Stale-confidence amplification:** confidence decays monotonically with staleness; never inflates on reconnect.

---

## SECTION E — External Producer Trust Model

| Tier | Source | Trust weight | Confidence ceiling | Notes |
|---|---|---|---|---|
| **T0 — Organism truth** | Internal sensors (logged reps, completed activities, in-app tests) | 1.0 | 100 | Authority root |
| **T1 — Athlete-entered** | Self-report, journal, perceived effort | 0.85 | 90 | Always trusted as athlete intent (AINL); may be challenged by T0 |
| **T2 — Coach-entered** | Coach observations, manual scores | 0.75 | 85 | Tenant-scoped; org-context required |
| **T3 — Calibrated wearables** | Verified-device HRV/sleep/load | 0.65 | 80 | Device fingerprint required; calibration audit |
| **T4 — Imported medical documents** | PT plans, physician notes | Translation only | n/a | Never authority root; IRCL contextualizes (memory rule) |
| **T5 — Uncalibrated wearables / consumer APIs** | Generic fitness APIs | 0.40 | 60 | Advisory only |
| **T6 — Motion capture / force plates** | Lab-grade systems | 0.90 | 95 | When source-verified; deferred ingestion |
| **T7 — Future vendor integrations** | Unknown | Default 0.30 | 50 | Quarantined until certified |

**Conflict arbitration:** higher tier wins on the same topic; cross-tier conflicts emit `producer_conflict` event for AINL surfacing.

**Source lineage:** every envelope carries `producer_id`, `producer_tier`, `producer_calibration_id` (nullable).

**Producer identity:** signed producer tokens for T3+; spoofing protection via per-device key rotation (deferred to G3).

---

## SECTION F — Runtime Authority Enforcement

- **MAAL enforcement:** edge-side adjudicator on every envelope that asserts authority (override, restriction, scope grant). Never client-trusted.
- **DGL hard-stops:** edge-side gate on every envelope in topics flagged `safety_critical`; database-layer trigger as defense-in-depth.
- **Override interception:** edge function `asb_authority_gate` (planned G6); client receives structured rejection with negotiation pathway (AINL).
- **Orchestration approval flow:** AI-initiated adaptations write `proposed_adaptation` envelope → AINL surfaces to athlete → athlete decision envelope → DGL validates → applied envelope. Closed loop or it doesn't ship (Law 9).
- **Replay handling:** authority transitions are immutable audit events; replay reconstructs authority state at any `as_of` time.
- **Emergency restriction propagation:** hard real-time class; broadcast via Realtime + edge push; client refuses conflicting actions even if locally queued.
- **Never client-authoritative:** medical restrictions, RTP gates, scope grants, engine-version selection, snapshot integrity.
- **May operate locally (bounded):** athlete intent capture, perceived-effort logging, journal entries, drill rep logging.
- **Requires server confirmation:** all overrides affecting other actors, all medical-context envelopes, all org-scope changes.
- **During connectivity loss:** safety-critical actions blocked with explicit user-visible reason; non-safety queued.

---

## SECTION G — Replay Scalability & Temporal Architecture

- **Replay horizon:** lifetime athlete (multi-decade target).
- **Snapshot cadence:** rolling daily for hot topics; weekly for cold; on-demand pre-replay snapshot.
- **Partitioning:** `asb_events` partitioned by month (G2) → by (month, topic_class) post-G7.
- **Archival:** events older than 24 months tiered to cold storage with replay-on-demand rehydration.
- **Replay-from-snapshot:** load snapshot at `t0` → apply event tail → assert engine_version match.
- **Temporal queries:** `state_as_of(athlete_id, ts, engine_version)` is a first-class read API.
- **Engine-version pinning:** every envelope carries `engine_version`; replay refuses cross-version mixing without explicit migration envelope.
- **Multi-version coexistence:** N and N-1 supported; older requires migration replay.
- **Org-scale replay:** batched per athlete; no cross-athlete replay coupling.
- **Rebuild-time ceiling:** target <5min for 1-year athlete replay; <30min for full lifetime (post-snapshot).

---

## SECTION H — Operational Failure Modes

| Failure | Detection | Observability | Degradation | Rollback | Organism protection |
|---|---|---|---|---|---|
| Replay drift | Replay-drill diff | Drift dashboard | Read-only mode for affected topics | Pin prior engine_version | Suppress new prescriptions until resolved |
| Duplicate producers | Topic registry violation | Producer-conflict trace | Quarantine duplicate | Disable secondary | No double-counting in LCE |
| Stale offline clients | Reconnect reconciliation report | Staleness histogram | Force resync | Reject stale writes | Confidence floor enforced |
| Authority desync | Authority-audit cron | Authority-diff dashboard | Block high-impact actions | Replay authority log | Hard-stop wins |
| Event-order corruption | Monotonic-seq assertion | Order-violation alert | Halt topic ingest | Replay from snapshot | Topic frozen until clean |
| Partial-write success | Envelope idempotency check | Write-failure trace | Retry with same key | Idempotent dedup | No phantom state |
| Realtime outage | Heartbeat miss | Transport SLO | Fall back to polling | Auto-restore | UI shows degraded mode |
| Snapshot corruption | Hash mismatch | Snapshot-integrity alert | Rebuild from prior snapshot | Replay full tail | Block reads until rebuilt |
| Engine-version mismatch | Envelope validation | Version-skew dashboard | Reject envelope | Force client refresh | No silent downgrade |
| Offline override collision | Reconcile-time conflict | Override-conflict trace | Surface in AINL | Athlete-resolves | Safety wins |
| Tenant leakage | RLS audit + cross-tenant query test | Leak alert (P0) | Block reads | Patch RLS | Immediate |
| Stale rehab restriction | IRCL reconciliation | Rehab-state drift | Re-apply restriction | Restore from audit | Restriction defaults to active |
| Delayed hard-stop | Hard-stop SLO | Latency alert | Escalate to push | N/A | Local refusal |

---

## SECTION I — Observability & Production Certification

- **SLO philosophy:** every topic class has an SLO (latency, replay-determinism, missingness rate, confidence-floor adherence).
- **Production certification requirements (per subsystem):**
  1. Trace coverage ≥99% (untraced = silent failure).
  2. Replay-drill green for ≥30 days.
  3. Drift detector clean for ≥14 days.
  4. Authority audit clean.
  5. Missingness reasons populated ≥99%.
  6. Offline-sync audit passing.
- **Cadences:** drift recertification weekly; replay-drill nightly; rollback-drill monthly; authority audit weekly; confidence audit weekly; missingness audit weekly; offline-sync audit weekly.
- **Verified =** all six certification gates green + IIP §11 evidence.
- **Production-observed =** verified + ≥30 days continuous green in production with non-trivial volume.
- **Longitudinally trusted =** production-observed + ≥1 successful engine-version migration replay + ≥1 cross-season continuity audit.

---

## SECTION J — Infrastructure Evolution Map

- **Intentionally temporary:** single-region Supabase; edge-function-hosted orchestration; single-table event log.
- **Expected to evolve:** transport layer (Realtime → dedicated bus); orchestration runtime; analytical store; on-device inference.
- **Stable forever:** envelope contract shape; athlete-as-root tenancy; append-only event log; engine-version pinning; confidence + missingness as first-class.
- **Anti-corruption boundaries:** `BusTransport`, `TenancyEnforcer`, `EngineInputContract`, `ProducerTrustAdjudicator` interfaces (specified G2).
- **Migration philosophy:** additive-only schema; dual-write before cutover; shadow-read before promotion; never big-bang.
- **Anti-big-bang doctrine:** every infrastructure swap must run in shadow mode with replay-equivalence proof for ≥14 days before promotion.
- **Deprecation protocol:** mark `deprecated` → emit deprecation envelopes → wait ≥1 engine-version cycle → remove.
- **Shadow-runtime expectations:** every G2+ subsystem must support shadow-mode execution emitting parallel envelopes for diff.

---

## SECTION K — Deferred Decisions Register

| ID | Decision | Severity | Blocked-by | Temp doctrine | Future review |
|---|---|---|---|---|---|
| K1 | Realtime fan-out ceiling at org-of-orgs scale | HIGH | Load testing | Single-org channels | Pre-G2 load test |
| K2 | Event-log partition strategy beyond month | HIGH | G2 schema | Monthly partitions | Post-G5 |
| K3 | Producer signing / device key rotation | HIGH | Vendor decision | T3+ unsigned-but-fingerprinted | G3 |
| K4 | Multi-engine-version coexistence beyond N/N-1 | HIGH | Migration replay proof | N/N-1 only | Post-G7 |
| K5 | Cross-org analytics tenancy model | MEDIUM | MAAL ratification | Athlete-grant only | Post-G7 |
| K6 | iOS PWA background sync durability | HIGH | Empirical test | Foreground-only durability claim | Pre-G4 |
| K7 | On-device LCE inference | LOW | Future stack | Server-only | Post-production-observed |
| K8 | Federated org-of-orgs hierarchy depth | MEDIUM | Real customer | 2 levels | Post-G7 |
| K9 | Motion-capture / force-plate ingestion contract | MEDIUM | Vendor partnership | T6 deferred | Post-G7 |
| K10 | Cold-storage rehydration SLA | MEDIUM | Archival design | <24mo hot only | Pre-G7 |
| K11 | Hard-stop push transport (FCM/APNs vs Realtime) | HIGH | Connectivity testing | Realtime + polling | Pre-G6 |
| K12 | Snapshot integrity hash algorithm + rotation | MEDIUM | Crypto review | sha256 placeholder | Pre-G2 |
| K13 | Replay determinism under floating-point drift across runtimes | HIGH | Cross-runtime test | Server-only replay | Pre-G6 |
| K14 | Stale-confidence decay curve specification | MEDIUM | LCE doctrine | Linear decay placeholder | Pre-G2 |
| K15 | Authority-audit retention horizon | MEDIUM | Legal/compliance | Forever | Pre-production |

**No fake certainty:** items above are explicitly unresolved. K1, K2, K3, K4, K6, K11, K13 are HIGH and gate G2 entry per §L.

---

## SECTION L — G2 Entry Requirements

G2 (ingress + event-log realization planning) may begin only when:

1. **Schema review readiness:** envelope DDL drafted with all HIGH §K items resolved or explicitly accepted.
2. **Runtime review readiness:** edge-function topology reviewed; cold-start budgets validated against hard real-time SLOs.
3. **Observability readiness:** trace table design + SLO definitions ratified.
4. **Rollback readiness:** rollback-drill protocol drafted.
5. **Replay test readiness:** replay-equivalence test harness specified.
6. **Authority enforcement readiness:** MAAL/DGL adjudicator interfaces specified.
7. **Offline reconciliation readiness:** queue durability + conflict-resolution protocol specified; K6 resolved or accepted.
8. **Tenancy review readiness:** RLS policy templates drafted; tenant-leakage test harness specified.
9. **Drift detection readiness:** drift detector spec + cadence ratified.

Until all nine are met, no ASB code, migration, or runtime artifact may begin. No "ASB implementation started" claim permitted.

---

## Diagrams (Deliverables)

The following diagrams will accompany this artifact as `.mmd` files in `/mnt/documents/`:

1. **Dependency graph** — owners → ASB → consumers
2. **Runtime topology** — client / edge / db / realtime / replay
3. **Replay topology** — snapshot + tail + engine-version pinning
4. **Authority enforcement flow** — envelope → MAAL/DGL gate → audit
5. **Offline reconciliation flow** — queue → reconnect → arbitrate → audit
6. **Multi-tenant boundary map** — athlete-root + org overlays
7. **Event lifecycle** — produce → validate → append → materialize → fan-out → replay
8. **Failure-state lifecycle** — detect → degrade → rollback → recertify

---

## Current Implementation-State Inventory

| Subsystem | State | Evidence |
|---|---|---|
| ASB envelope contract | `specified` | Phase 2B doctrine |
| `asb_events` table | `conceptual` | None |
| Edge ingress | `conceptual` | None |
| Replay runtime | `conceptual` (pattern proven by `foundationReplay`) | `src/lib/foundationReplay.ts` |
| Trace observability | `partially-implemented` (Foundation only) | `src/lib/foundationTracing.ts` |
| TPE snapshots | `partially-implemented` | `EngineInputContractV2` |
| Realtime fan-out | `partially-implemented` (scheduling only) | `useSchedulingRealtime` |
| Tenancy / orgs | `partially-implemented` | `useOrganization`, `usePlayerOrganization` |
| Offline queue | `conceptual` | None |
| MAAL/DGL runtime adjudicators | `conceptual` | None |
| AINL negotiation surfaces | `conceptual` | None |
| IRCL rehab state | `conceptual` | None |

---

## Files this plan will create/update on approval (memory only — no code)

1. **Create** `mem://architecture/asb-g1-infrastructure-design-review.md` — full content of Sections A–L above.
2. **Update** `mem://index.md` — add Memories entry pointing to the G1 review and one Core line: *"ASB G2 entry blocked until §K HIGH items (K1, K2, K3, K4, K6, K11, K13) resolved/accepted."*
3. **Generate** 8 `.mmd` diagrams in `/mnt/documents/` and emit them as `<lov-artifact>` tags.

No code, no migrations, no edge functions, no UI, no prompts.

---

## Decision requested

Ratify this G1 ASB Infrastructure Design Review as the locked architectural baseline. On approval:
- Persist memory artifacts (1 + 2 above).
- Generate the 8 diagrams.
- Open §K HIGH items for explicit resolution/acceptance pass before G2 may begin.

No implementation. No completion language. Next gate = §K HIGH resolution, then G2 schema + ingress realization planning.
