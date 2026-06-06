# Reality Feedback Ledger

**Sprint:** Post-Launch Observability & Reality Validation
**Posture:** Append-only human-curated ledger. **Not organism truth.** Never authored by the engine. Records production observations for the next sprint to consider — no fixes here.

## Format

| id | observed_behavior | evidence | frequency | severity | recommended_future_action | status |
|---|---|---|---|---|---|---|

- **evidence** — `event_id` / SQL query / `file:line` reference. Must be replay-reconstructable.
- **frequency** — how often observed (per day, per cohort, etc.).
- **severity** — `info | warn | high | P0`.
- **status** — `observed | triaged | scheduled | resolved`.

## Pre-seeded entries (from Sections A–F instrumentation gaps)

| id | observed_behavior | evidence | frequency | severity | recommended_future_action | status |
|---|---|---|---|---|---|---|
| RFL-001 | Athlete signup not emitted as ASB topic | CLOSED — producer `src/contexts/AuthContext.tsx:79`; topic `athlete.lifecycle.signup`; consumer `funnels.ts:51` | every signup | warn | (done) | CLOSED |
| RFL-002 | Onboarding completion has no canonical topic | CLOSED — producer `src/pages/OnboardingFlow.tsx:84`; topic `athlete.onboarding.completed`; consumer `funnels.ts:52` | every onboarding | warn | (done) | CLOSED |
| RFL-003 | UHRC views unobservable | CLOSED — producer `src/components/report-card/UhrcAthleteSection.tsx:44`; topic `intelligence.uhrc.viewed`; consumer `intelligenceUtilization.ts:26` | per UHRC open | warn | (done) | CLOSED |
| RFL-004 | Hammer views unobservable | CLOSED — producer `src/components/coach/PieV2HammerBriefPanel.tsx:32`; topic `intelligence.hammer.viewed`; consumer `intelligenceUtilization.ts:28` | per Hammer open | warn | (done) | CLOSED |
| RFL-005 | Coach review has no canonical topic | CLOSED — producer `src/pages/CoachAthleteDetail.tsx:55`; topic `coach.review.opened`; consumer `funnels.ts:67` + `intelligenceUtilization.ts:30` | per review | warn | (done) | CLOSED |
| RFL-006 | Recruiter positive-review path has no canonical topic | CLOSED — producer `src/pages/ScoutDashboard.tsx:598`; topic `recruiter.review.opened`; consumer `funnels.ts:78` + `intelligenceUtilization.ts:29` | per recruiter session | warn | (done) | CLOSED |
| RFL-007 | Trend / timeline views unobservable | CLOSED — producers `src/pages/AsbTimeline.tsx:13` + `src/pages/AthleteDigest.tsx:36`; topic `intelligence.trend.viewed`; consumer `intelligenceUtilization.ts:31` | per timeline open | info | (done) | CLOSED |
| RFL-008 | Drill assignment / completion only table-derived (no ASB topic) | CLOSED — producers `src/hooks/useDrillAssignments.ts:121` (`foundation.drill.assigned`), `:149` (`foundation.drill.started`), `:170` (`foundation.drill.completed`); consumer `src/lib/observability/recommendationFunnel.ts::computeRecommendationEffectivenessFromEvents` | per assignment | info | (done) | CLOSED |
| RFL-009 | Recommendation lifecycle partially trace-derived; no canonical ASB topic | CLOSED — producers `src/components/video-library/FoundationsShelf.tsx:52` (`foundation.recommendation.shown`), `:91` (`foundation.recommendation.opened`), `src/hooks/useDrillAssignments.ts:180` (`foundation.recommendation.completed` — drill sub-channel; video watch-duration sub-channel deferred and surfaced as `missingness.video_watched=true`); consumer `recommendationFunnel.ts::computeRecommendationEffectivenessFromEvents` | per recommendation | info | (done) | CLOSED |
| RFL-010 | Coach acknowledgement of recommendation has no canonical channel | CLOSED — producer `src/components/coach/PieV2HammerBriefPanel.tsx:144` (`foundation.recommendation.coach_ack`, explicit Acknowledge button, lifetime dedupe); consumer `recommendationFunnel.ts::computeRecommendationEffectivenessFromEvents` | per coach action | info | (done) | CLOSED |


## Append-only policy

- Never delete rows. Status transitions only.
- Every new production observation appends a new row with monotonic `RFL-NNN` id.
- Each row must include reproducible evidence. No anecdotes.
- This ledger feeds **prioritization**, not architecture mutation. Architecture changes still flow through the constitutional sprint process.
