# Observability Consumption Audit

**Sprint:** Canonical Event Emission & Observability Closure
**Scope:** Verify every Wave-1 topic is consumed by at least one reducer with a traceable count path.

| Topic | Producer (file:line) | Consumer (file:line) | Count path | Proof |
|---|---|---|---|---|
| `athlete.lifecycle.signup` | `src/contexts/AuthContext.tsx:79` | `src/lib/observability/funnels.ts:51` (athlete signup), `:64` (coach signup), `:75` (recruiter signup) | `userStageFirst.get(uid).set("signup", ts)` per `computeFunnel` | `topicMatches(row, "athlete.lifecycle.signup")` increments stage `entries` |
| `athlete.onboarding.completed` | `src/pages/OnboardingFlow.tsx:84` | `funnels.ts:52` (athlete onboarding stage) | same | first occurrence per athlete advances stage |
| `intelligence.uhrc.viewed` | `src/components/report-card/UhrcAthleteSection.tsx:44` | `src/lib/observability/intelligenceUtilization.ts:26` (uhrc surface) | `viewsByUser.set(uid, +1)` per matching row | `view_rate`, `unique_viewers`, `median_views_per_viewer` |
| `intelligence.hammer.viewed` | `src/components/coach/PieV2HammerBriefPanel.tsx:32` | `intelligenceUtilization.ts:28` (hammer surface) | same | same |
| `intelligence.trend.viewed` | `src/pages/AsbTimeline.tsx:13`, `src/pages/AthleteDigest.tsx:36` | `intelligenceUtilization.ts:31` (trends surface) | same | same |
| `coach.review.opened` | `src/pages/CoachAthleteDetail.tsx:55` | `funnels.ts:67` (coach athlete_review), `:69` (coach repeat_usage); `intelligenceUtilization.ts:30` (coach_intelligence) | dual: funnel stage + surface counter | first occurrence per (coach,athlete) advances funnel; all occurrences count toward utilization |
| `recruiter.review.opened` | `src/pages/ScoutDashboard.tsx:598` | `funnels.ts:78` (recruiter athlete_review), `:80` (recruiter repeat_usage); `intelligenceUtilization.ts:29` (recruiting) | dual: funnel stage + surface counter | same |

## Orphan / duplicate / dead-telemetry check

- **Orphan events (emitted but not consumed):** none.
- **Orphan consumers (reducer stages with `topic: null`):** remaining (out of scope this sprint):
  - `athlete.first_recommendation` (RFL-009)
  - `coach.drill_assignment` (RFL-008)
  - `recruiter.evaluation` (table-derived, intentional)
  - `parent.invite` (table-derived `parent_invite_dispatches`, intentional)
  - `intelligenceUtilization.detailed_analysis`, `intelligenceUtilization.roadmap` (no canonical surface mount yet)
- **Duplicate counting risk:** none. `coach.review.opened` and `recruiter.review.opened` are consumed by funnel via per-user first-timestamp logic and by utilization via per-user view counts — these measure different quantities (conversion vs consumption) and are not summed.
- **Dead telemetry:** none introduced by Wave-1.

## Reducer extension diffs (functional)

- `funnels.ts` — replaced `topic: null` with canonical topics on 6 stages (athlete.signup, athlete.onboarding, coach.signup, coach.athlete_review, coach.repeat_usage, recruiter.signup, recruiter.athlete_review, recruiter.repeat_usage).
- `intelligenceUtilization.ts` — replaced `topic: null` with canonical topics on 4 surfaces (uhrc, hammer, trends, coach_intelligence) and switched `recruiting` from broad `relational.exposure` to scoped `recruiter.review.opened`.
- `recommendationFunnel.ts` — unchanged (RFL-009 scope).
- `safeguarding.ts` — unchanged (already canonical).
