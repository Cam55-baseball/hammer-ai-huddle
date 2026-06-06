# Event Replay & Determinism Ratification — Wave 1

**Sprint:** Canonical Event Emission & Observability Closure
**Method:** Per-topic verification against the six replay-determinism axes. Evidence is the code path; runtime evidence is the deterministic idempotency_key + DB UNIQUE constraint on `asb_events.idempotency_key`.

## Axes
1. **Replay-safe** — row reconstructable from canonical inputs.
2. **Idempotent** — duplicate emission yields zero net change.
3. **Refresh-safe** — page refresh does not double-count.
4. **Multi-device-safe** — concurrent emission from two devices yields one canonical row.
5. **Versioned** — `engine_version` pinned.
6. **Lineage preserved** — `causality_refs` / `lineage_refs` present where applicable.

## Per-topic ratification

| Topic | Replay-safe | Idempotent | Refresh-safe | Multi-device-safe | Versioned | Lineage | Verdict |
|---|---|---|---|---|---|---|---|
| `athlete.lifecycle.signup` | PASS (deterministic key from `user.id` + payload) | PASS (lifetime dedupe; `time_material="lifetime"`) | PASS (post-`signUp` only, key collapses to one row) | PASS (DB UNIQUE on idempotency_key) | PASS (`asb-1.0.0`) | N/A (lifecycle origin) | **PASS** |
| `athlete.onboarding.completed` | PASS | PASS (lifetime dedupe; `done` boolean is monotonic) | PASS (`completedEmittedRef` + lifetime key) | PASS | PASS | implicit via prior `onboarding.step_completed` events in ledger | **PASS** |
| `intelligence.uhrc.viewed` | PASS | PASS (day-bucket idempotency) | PASS (sessionStorage + idempotency) | PASS (UTC midnight bucket collapses concurrent views) | PASS | implicit (athlete-self) | **PASS** |
| `intelligence.hammer.viewed` | PASS | PASS | PASS | PASS | PASS (payload carries `aggregate.engine_version`) | aggregate engine_version recorded | **PASS** |
| `intelligence.trend.viewed` | PASS | PASS (per-surface day bucket via distinct dedupe key per page) | PASS | PASS | PASS | implicit (athlete-self) | **PASS** |
| `coach.review.opened` | PASS | PASS (per (coach, athlete) per day) | PASS | PASS | PASS | actor_id (coach) + athlete_id captured | **PASS** |
| `recruiter.review.opened` | PASS | PASS (per (recruiter, athlete) per day) | PASS (click handler + idempotency, repeated clicks collapse) | PASS | PASS | actor_id (recruiter) + athlete_id captured; co-exists with `relational.exposure` lineage | **PASS** |

## Aggregate verdict

All seven Wave-1 topics: **PASS** on all six axes. The shared `useEmitObservability` helper enforces these properties uniformly — any future topic added through the same helper inherits the contract.
