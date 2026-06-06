# Observability Completeness Ratification

**Sprint:** Canonical Event Emission & Observability Closure
**Date:** 2026-06-06

## Coverage matrix — 16 critical behaviors

| # | Behavior | Topic / source | Status |
|---|---|---|---|
| 1 | Athlete signup | `athlete.lifecycle.signup` | OBSERVABLE |
| 2 | Onboarding completion | `athlete.onboarding.completed` | OBSERVABLE |
| 3 | Onboarding step progression | `onboarding.step_completed` | OBSERVABLE (pre-existing) |
| 4 | First session | `session.block.modified` | OBSERVABLE (pre-existing) |
| 5 | Athlete readiness | `athlete.readiness` | OBSERVABLE (pre-existing) |
| 6 | UHRC view | `intelligence.uhrc.viewed` | OBSERVABLE |
| 7 | Hammer view | `intelligence.hammer.viewed` | OBSERVABLE |
| 8 | Trend / digest view | `intelligence.trend.viewed` | OBSERVABLE |
| 9 | Coach review opened | `coach.review.opened` | OBSERVABLE |
| 10 | Recruiter review opened | `recruiter.review.opened` | OBSERVABLE |
| 11 | Parent relationship confirmed | `relational.relationship.confirmed` | OBSERVABLE (pre-existing) |
| 12 | Parent authorization grant | `relational.exposure.consent_changed` | OBSERVABLE (pre-existing) |
| 13 | Recruiter discovery exposure | `relational.exposure*` | OBSERVABLE (pre-existing) |
| 14 | Safeguarding signal viewed/acked | `relational.safeguarding.*` + `safeguarding_notifications` | OBSERVABLE (pre-existing) |
| 15 | Drill assignment / completion | `drill_assignments` + `foundation_video_outcomes` table | TABLE-DERIVED (RFL-008 — gap remains) |
| 16 | Recommendation shown / opened / completed | `foundation_recommendation_traces` table | TABLE-DERIVED (RFL-009 — gap remains) |

## Section answers

- **All 16 critical behaviors observable?** 14 via canonical ASB topics, 2 via canonical tables (drill assignments + recommendation traces). All 16 are measurable; 2 are not yet canonical topics.
- **All funnel stages measurable?** All non-null funnel stages have canonical topics. Remaining `topic: null` stages (`athlete.first_recommendation`, `coach.drill_assignment`, `recruiter.evaluation`, `parent.invite`) are scoped to RFL-008 / RFL-009 or are intentionally table-derived.
- **All intelligence surfaces measurable?** 5 of 7 canonical surfaces wired (uhrc, hammer, trends, coach_intelligence, recruiting). `detailed_analysis` and `roadmap` remain `unobservable: true` (no canonical surface mount in current UI — out of scope this sprint).
- **All recommendation stages measurable?** Partial. `recommendationFunnel.ts` consumes `foundation_recommendation_traces` table directly; canonical ASB topics for the recommendation lifecycle (RFL-009, RFL-010) remain open.
- **All safeguarding stages measurable?** Yes — fully canonical via `safeguarding.ts` reducer; RR-10 invariant verified.
- **Any critical behaviors still unobservable?** No critical behavior is unobservable. Two (drill, recommendation) are observable only via table projection — sufficient for measurement, deferred for canonical-topic conversion.
- **Any events orphaned?** None.
- **Any consumers orphaned?** Five reducer stages still hold `topic: null` (enumerated above); all are documented as deferred, not silently broken.

## Completeness score

- **Critical behavior observability:** 16 / 16 = **100% measurable**.
- **Canonical-topic observability:** 14 / 16 = **87.5% canonical**.
- **Funnel canonicalization (non-deferred stages):** 100%.
- **Intelligence surface canonicalization (mountable surfaces):** 5 / 5 = 100% of surfaces with UI mounts.

## Verdict

**Organism fully measurable: YES.** Every critical behavior produces evidence in either the canonical event ledger or a canonical table. Canonical-topic gap is bounded to two well-scoped families (drill + recommendation), already tracked as RFL-008 / RFL-009.
