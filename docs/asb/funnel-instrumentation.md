# Funnel Instrumentation

**Sprint:** Post-Launch Observability & Reality Validation
**Reducer:** `src/lib/observability/funnels.ts` — pure projection over `AsbEventRow[]`. Zero writes, lineage preserved.

## Posture

Funnels are **replay-derived projections**, never authoritative state. They measure transitions visible in the canonical ledger. Where a stage has no canonical topic (see Section A `GAP` rows), the funnel surfaces it as `entries=0 / unobservable=true` — never imputed.

## Athlete Funnel

| stage | topic predicate | notes |
|---|---|---|
| signup | `auth_logs` proxy | GAP: not in `asb_events` |
| onboarding | `athlete.onboarding.completed` | GAP |
| first session | first `session.block.modified` or performance_sessions row | observable |
| first analysis | first `athlete.readiness` / `athlete.fatigue` / `athlete.recovery` | observable |
| first recommendation | first `foundation_recommendation_traces` row | observable via table; ASB topic GAP |
| second session | second session event | observable |
| retained | ≥1 session in days 7–14 | observable |

## Coach Funnel

| stage | topic predicate |
|---|---|
| signup | `auth_logs` + `user_roles.role='coach'` |
| roster | first `parent_athlete_links` / coach-of relationship in `relational.relationship.confirmed` |
| athlete review | `coach.review` GAP |
| drill assignment | `drill_assignments` insert |
| repeat usage | ≥2 reviews within 14d |

## Recruiter Funnel

| stage | topic predicate |
|---|---|
| signup | `scout_applications` approved |
| athlete discovery | `relational.exposure.gate_blocked` / allow events |
| athlete review | `recruiter.review` GAP |
| evaluation | `scout_evaluations` insert |
| repeat usage | ≥2 evaluations within 30d |

## Parent Funnel

| stage | topic predicate |
|---|---|
| invite | `parent_invite_dispatches` insert |
| acceptance | `relational.relationship.confirmed` |
| authorization | `relational.exposure.consent_changed` with `actor_role='parent'` and `change_type='grant'` |
| continued engagement | ≥1 authorization change or review per 30d |

## Stage → topic mapping

Encoded in `src/lib/observability/funnels.ts` as `FUNNEL_DEFS`. Stages with `topic: null` are explicit gaps; the reducer reports them with `unobservable: true`.
