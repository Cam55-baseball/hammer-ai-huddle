# ASB Production Realization — Phase 1 Implementation Plan

The constitutional / runtime / implementation specs are now frozen. This plan begins **direct production realization** in the strict dependency order mandated. Implementation fidelity supersedes feature expansion.

This plan covers **Phase 1 only** (Foundation: Data + Event Ledger). Subsequent phases (runtime, state reconstruction, API, athlete execution, coach layer, observability, tests) will be planned individually once each predecessor is verified — building them in one batch would violate the canonical dependency ordering and replay/lineage guarantees.

---

## Scope of this plan (Phase 1)

Translate the canonical data architecture spec into the production database foundation. Nothing else. No reads, no API, no UI.

### What we build

1. **Append-only event ledger** — `asb_events`
   - immutable, no UPDATE/DELETE
   - canonical envelope: event_id, timestamp (5 canonical timestamps), actor, entity_target, event_type, payload (jsonb), confidence, lineage_refs (jsonb), causality_refs (jsonb), engine_version, idempotency_key
   - partitioned by month on `occurred_at`
   - RLS: athletes can only read their own events; system actor inserts via service role; no client UPDATE/DELETE

2. **Immutable lineage table** — `asb_event_lineage`
   - parent_event_id → child_event_id
   - derivation_type, engine_version
   - append-only

3. **Replay-safe snapshots** — `asb_state_snapshots`
   - athlete_id, snapshot_kind, as_of_event_id, engine_version
   - snapshot payload (jsonb) — disposable, regenerable from events
   - unique on (athlete_id, snapshot_kind, as_of_event_id, engine_version)

4. **Confidence persistence** — `asb_confidence_records`
   - bound to event_id; per-signal confidence + uncertainty flags + missingness markers
   - append-only

5. **Override audit ledger** — `asb_authority_overrides`
   - actor_role (medical / athlete / coach / ai / system)
   - override_target_event_id, justification, risk_acknowledgement
   - immutable

6. **Organizational propagation persistence** — `asb_org_propagation_log`
   - org_id, athlete_id, propagated_event_id, propagation_kind
   - records cohort-level effects without mutating per-athlete truth

7. **Canonical topic + engine version registries** — `asb_topic_registry`, `asb_engine_versions`
   - enforce that every event references a registered topic + engine_version

### What we do NOT build in this plan

- Event runtime / propagation engine (Phase 2)
- State reconstruction (Phase 3)
- API layer (Phase 4)
- Any UI (Phase 5+)
- Edge functions or business logic

---

## Compliance gates

**Laws check:** Honors all 10 Eternal Laws — One Organism (single athlete_id root), No Unused Data (append-only, no eviction), Missingness Is a Signal (uncertainty_flags + missingness persisted), No Fake AI (AI actor role separated and forbidden from authoring `organism_truth`), Closed Loop (lineage + replay foundation).

**Canonical owner:** Data Architecture layer (Implementation §1). No subsystem owns mutation outside the event ledger.

**Longitudinal impact:** Establishes the substrate for LCE, recovery capacity, elastic economy, and career resilience continuity. No historical data exists yet to migrate.

**Behavioral impact:** Substrate only — AIP/ANE/APM/CIL/BAS will write through this in later phases. Authority hierarchy enforced via RLS + actor_role column + override audit.

**Envelope impact:** Establishes canonical envelope transport (authority + confidence + missingness + engine_version travel WITH each event row). Materialization (snapshots) is disposable and event-derived.

---

## Technical section

### Migration outline

```text
asb_topic_registry         (topic_id PK, authority_pathway, replay_policy, materialization_policy)
asb_engine_versions        (engine_version PK, schema_version, released_at, deprecated_at)
asb_events                 (event_id PK, athlete_id, topic_id FK, actor_role, actor_id,
                            occurred_at, ingested_at, effective_at, valid_from, valid_to,
                            payload jsonb, engine_version FK, idempotency_key UNIQUE,
                            causality_refs jsonb, lineage_refs jsonb)
                           PARTITION BY RANGE (occurred_at), monthly partitions
asb_event_lineage          (parent_event_id FK, child_event_id FK, derivation_type, engine_version)
asb_confidence_records     (record_id PK, event_id FK, signal_key, confidence numeric,
                            uncertainty_flags jsonb, missingness_markers jsonb)
asb_authority_overrides    (override_id PK, actor_role, actor_id, target_event_id FK,
                            justification text, risk_acknowledgement jsonb, occurred_at)
asb_state_snapshots        (snapshot_id PK, athlete_id, snapshot_kind, as_of_event_id FK,
                            engine_version FK, payload jsonb,
                            UNIQUE(athlete_id, snapshot_kind, as_of_event_id, engine_version))
asb_org_propagation_log    (log_id PK, org_id, athlete_id, propagated_event_id FK,
                            propagation_kind, occurred_at)
```

### Immutability enforcement

- Postgres triggers on each table block UPDATE and DELETE for non-service roles.
- Snapshots table allows DELETE (disposable) but not UPDATE.
- All inserts validate engine_version + topic_id existence.

### RLS

- Athletes: SELECT own rows via `athlete_id = auth.uid()` (or profile linkage).
- Coaches/orgs: SELECT scoped through `user_roles` + `org_athletes` mapping (deferred to phase that introduces it; for now, no coach/org reads).
- Inserts: restricted to service role / verified producers; `actor_role = 'ai'` rows MUST NOT carry `organism_truth` topic (enforced by trigger).

### What this plan does NOT do

- No application code changes.
- No edge functions.
- No types regeneration logic — Lovable auto-regenerates `types.ts` after the migration.
- No backfill (no prior ASB events exist).

---

## Realization gate (must pass before Phase 2 is planned)

- Migration applies cleanly.
- Immutability triggers reject UPDATE/DELETE attempts from non-service roles.
- RLS verified: athlete cannot read another athlete's events.
- `asb_topic_registry` + `asb_engine_versions` seeded with the initial canonical set.
- Insert of a sample event round-trips with full envelope + lineage + confidence rows.

If any gate fails, Phase 1 is rejected and re-planned. Phase 2 cannot begin.

---

## Next planning cycles (not part of this approval)

Phase 2: Event runtime + propagation engine
Phase 3: State reconstruction engine
Phase 4: API/runtime layer
Phase 5: Athlete execution E2E (readiness → training → session → feedback → recovery)
Phase 6: Coach operational layer
Phase 7: Observability + replay tooling
Phase 8: Integrity testing framework

Each will be presented as its own plan, only after the predecessor's realization gate passes.
