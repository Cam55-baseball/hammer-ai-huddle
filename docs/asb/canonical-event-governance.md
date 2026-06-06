# Canonical Event Governance — Registry v1

**Sprint:** Canonical Event Emission & Observability Closure
**Posture:** Additive instrumentation only. All seven new topics ride the canonical `emitAsbEvent` / `asb_events` fabric with deterministic `idempotency_key`. Zero new tables, zero schema migration, zero doctrine change. Topics are interpretive observability — they never author `organism_truth`, `athlete_intent`, `authority_override`, `hard_stop`, or `rehabilitation_state`.

## Pre-existing topics consumed by reducers (Wave-0)

| Topic | Producer (file:line) | Consumer | Replay status |
|---|---|---|---|
| `session.block.modified` | `src/lib/runtime/emitRuntimeEvent.ts` | `funnels.ts` (athlete) | replay-safe |
| `athlete.readiness` | runtime emit fabric | `funnels.ts` (athlete) | replay-safe |
| `relational.relationship.confirmed` | `supabase/functions/relational-*` | `funnels.ts` (coach, parent) | replay-safe |
| `relational.exposure*` | exposure topics | `funnels.ts` (recruiter, parent), `intelligenceUtilization.ts` | replay-safe |
| `relational.safeguarding.*` | safeguarding emitters | `safeguarding.ts` | replay-safe |
| `foundation_recommendation_traces` (table) | recommendation engine | `recommendationFunnel.ts` | table-derived (gap RFL-009) |

## New canonical topics (Wave-1, this sprint)

| Topic | Producer (file:line) | Consumer | Payload schema | Lineage | Versioning |
|---|---|---|---|---|---|
| `athlete.lifecycle.signup` | `src/contexts/AuthContext.tsx:79` (post-`signUp` success) | `funnels.ts` athlete/coach/recruiter `signup` stage | `{ source: "auth_page" }` | none (lifecycle origin) | `engine_version=asb-1.0.0`, lifetime dedupe |
| `athlete.onboarding.completed` | `src/pages/OnboardingFlow.tsx:84` (final step `done` flips true) | `funnels.ts` athlete `onboarding` stage | `{ steps: string[] }` | causally follows `onboarding.step_completed` events | lifetime dedupe |
| `intelligence.uhrc.viewed` | `src/components/report-card/UhrcAthleteSection.tsx:44` (mount once report ready) | `intelligenceUtilization.ts` `uhrc` surface | `{ surface, disciplines }` | UHRC report lineage available via subsequent `UhrcReportCard` lineage hooks | day-bucket dedupe |
| `intelligence.hammer.viewed` | `src/components/coach/PieV2HammerBriefPanel.tsx:32` (mount once aggregate present) | `intelligenceUtilization.ts` `hammer` surface | `{ surface, engine_version }` | aggregate `engine_version` carried | day-bucket dedupe |
| `intelligence.trend.viewed` | `src/pages/AsbTimeline.tsx:13` + `src/pages/AthleteDigest.tsx:36` (mount) | `intelligenceUtilization.ts` `trends` surface | `{ surface }` | none | day-bucket dedupe |
| `coach.review.opened` | `src/pages/CoachAthleteDetail.tsx:55` (roster-access gated) | `funnels.ts` coach `athlete_review` + `repeat_usage`; `intelligenceUtilization.ts` `coach_intelligence` | `{ surface }` | implicit via `actor_id` (coach) + `athlete_id` | day-bucket dedupe per (coach, athlete) |
| `recruiter.review.opened` | `src/pages/ScoutDashboard.tsx:598` (View Profile click) | `funnels.ts` recruiter `athlete_review` + `repeat_usage`; `intelligenceUtilization.ts` `recruiting` | `{ surface }` | implicit via `actor_id` (recruiter) + `athlete_id`; co-emits beside `relational.exposure` lineage | day-bucket dedupe per (recruiter, athlete) |

## Determinism contract

All seven topics route through `src/hooks/useEmitObservability.ts`:

- `idempotency_key = sha256(athlete_id | topic | time_material | canonical(payload))`
  - `time_material = "lifetime"` for `signup`, `onboarding.completed` → exactly one row per (athlete, payload) forever.
  - `time_material = utc_midnight(occurred_at)` for view/open topics → exactly one row per UTC-day per dedupe scope.
- DB UNIQUE constraint on `asb_events.idempotency_key` provides canonical dedupe; `emitAsbEvent` treats 23505 as replay-safe success.
- `sessionStorage` short-circuits in-session re-fires (network optimization, not authority).
- `engine_version` pinned via `ENGINE_VERSION` (`asb-1.0.0`).

## Orphan, duplicate, and non-canonical scan

- **Missing producers:** none after Wave-1. All seven RFL-001…RFL-007 producers wired.
- **Duplicate producers:** none. Each topic has a single canonical emission site (Hammer panel is shared by athlete & coach surfaces but emits one topic with role-derived `actor_role`).
- **Non-canonical producers:** none (no parallel writes to derived views; ledger remains sole canonical store).
- **Orphan consumers:** none after Wave-1 reducer wiring.
- **Remaining gaps (out of scope):** RFL-008 (`prescription.drill.*`), RFL-009 (`foundation.recommendation.*`), RFL-010 (`foundation.recommendation.coach_ack`).
