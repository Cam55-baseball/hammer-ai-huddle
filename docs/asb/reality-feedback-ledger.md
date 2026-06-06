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

## Audit-only additions — Coach Hammer Authority Audit (2026-06-06)

See `docs/asb/coach-hammer-authority-audit.md` and `docs/asb/coach-hammer-roadmap.md`.

| ID | Finding | Severity | Status |
|---|---|---|---|
| RFL-011 | Two next-step engines (`useCoachHammerNextStep` vs `useNextAction`) under Hammer brand can disagree across Dashboard vs Today | M | Open |
| RFL-012 | `PrescriptiveActionsCard` navigates to `/practice-hub` which does not exist → 404 | M | Open |
| RFL-013 | Hammer reasoning never reads `profiles` (position, throws/bats, grade, experience) | M | Open |
| RFL-014 | 4 of 9 daily modalities (hitting, defense, baserunning, fueling) absent from canonical prescription | M | Open |
| RFL-015 | Onboarding does not perform Hammer-led knowledge-gap acquisition | M | Open |
| RFL-016 | Ask-Coach (HelpDeskChat) is a separate AI surface from Coach Hammer | L | Open |

## RFL closures — Coach Hammer Authority Consolidation Sprint

| ID | Status | Closure evidence |
|---|---|---|
| RFL-011 | CLOSED | `src/hooks/useHammerNextStep.ts` — single canonical next-step authority arbitrating AI ⇢ deterministic. |
| RFL-012 | CLOSED | `src/components/hie/PrescriptiveActionsCard.tsx` — `/practice-hub` → `/practice`. |
| RFL-013 | CLOSED | `src/lib/hammer/context/athleteContext.ts` reads `profiles` (position, sport, experience_level, school_grade, …). |
| RFL-014 | CLOSED | `src/lib/hammer/prescription/dailyPlan.ts` — 9/9 modalities present (warm-up · speed · strength · hitting · throwing · defense · baserunning · fueling · recovery). |
| RFL-015 | CLOSED | `src/hooks/useHammerOnboardingDirector.ts` + `src/components/hammer/HammerOnboardingChat.tsx` — Hammer-led knowledge-gap acquisition (9-gap registry). |
| RFL-016 | CLOSED | `supabase/functions/hammer-chat/index.ts` + `src/hooks/useHammerChat.ts` + `src/components/hammer/HammerChat.tsx` — unified Ask-Coach surface with single identity + context + canonical next step. |

See `docs/asb/coach-hammer-final-ratification.md` for the full ratification.

## RFL closures — Coach Hammer Completion & Runtime Ratification Sprint (2026-06-06)

| ID | Status | Closure evidence |
|---|---|---|
| RFL-017 | CLOSED | `asb_topic_registry` — 12 canonical Hammer topics registered (`intelligence.next_step.resolved`, `onboarding.knowledge_gap_resolved`, `hammer.chat.message`, `prescription.daily.modality.{warmup|speed|strength|hitting|throwing|defense|baserunning|fueling|recovery}`); prior enum mismatch resolved by mapping onto canonical `ai_proposal` / `athlete_intent` / `observability` / `training_prescription` classes. |
| RFL-018 | CLOSED | `src/pages/AthleteCommand.tsx` — `<HammerOnboardingChat/>` (L54), `<HammerDailyPlan/>` (L62), `<HammerChat/>` (L64) mounted into the canonical `/command` route. |
| RFL-019 | CLOSED | `src/lib/hammer/prescription/dailyPlan.ts` — daily-plan dead-end routes patched: `/speed` → `/speed-lab`, `/baserunning` → `/baserunning-iq`. |

See `docs/asb/coach-hammer-runtime-ratification.md` for the full runtime ratification.


## RFL openings — Coach Hammer Production Reality Validation Sprint (2026-06-06)

| ID | Finding | Severity | Status |
|---|---|---|---|
| RFL-020 | Prior sprint never added the 9 coaching columns to `profiles`; onboarding answers have nowhere to persist. | H | Open |
| RFL-021 | Mounted Hammer surfaces emit zero events against the 16 registered Hammer topics — 0 hammer/onboarding/next_step/prescription events ever recorded. | H | Open |
| RFL-022 | Hammer surfaces emit no route-transition events; Section G confusion detection is structurally unmeasurable. | M | Open |

**Production reality scorecard:** Adoption 0% · Utilization 0% · Completion 0% · Guidance 0% · Conversation 0% → Overall **0/100**.

**Verdict:** Coach Hammer architectural GO is unchanged; production-reality **NO-GO**. Workstream **OPEN**. See `docs/asb/coach-hammer-production-reality-validation.md`.


## RFL openings — Athlete Development Intelligence Architecture Audit (2026-06-06)

| ID | Finding | Severity | Status |
|---|---|---|---|
| RFL-023 | Athlete-context persistence spine missing — `athleteContext.ts:96` and `knowledgeGaps.ts` reference 9 `profiles` columns that do not exist (`goal_summary`, `equipment_access`, `weekly_availability`, `lifting_age_years`, `training_focus`, `development_priorities`, `school_grade`, `weight_lbs`, `sport`). Hammer asks but cannot remember; every downstream intelligence layer is starved. | P0 | Open |
| RFL-024 | Athlete-development intelligence overall completeness = **20%** (Context 28% · Lifecycle 20% · Training-age 20% · Equipment 0% · Speed 0% wired · Fascial 13% · Sport-specialization 35% · Six-week 50% · Longitudinal 17%). Elite individualization structurally impossible until P0 closed. | P0 | Open |
| RFL-025 | Rich athlete-context tables (`sprint_analyses`, `athlete_load_tracking`, `physio_health_profiles`, `user_injury_progress`, `hammer_state_snapshots`) populated by capture pipelines but **completely unread** by any prescription / Hammer / roadmap surface — capture / projection gap is the second-largest blocker after RFL-023. | P0 | Open |

See `docs/asb/athlete-development-intelligence-audit.md` and `docs/asb/athlete-development-intelligence-roadmap.md`.


## RFL openings — Athlete Context Spine Constitution Sprint (2026-06-06)

| ID | Finding | Severity | Status |
|---|---|---|---|
| RFL-026 | Canonical athlete-context spine was constitutionally undefined prior to this sprint. No single document declared which variables, owners, propagation rules, lifecycle bands, and longitudinal semantics govern all developmental intelligence. Now ratified in `docs/asb/athlete-context-spine-constitution.md` (17 profile groups, six lifecycle bands, four equipment scopes, eight speed variables, five longitudinal classes). | P0 | Open (implementation pending) |
| RFL-027 | Equipment & environment model has no canonical enum, no scope precedence (persistent / session / temporary / inferred), no TTL semantics, and no resolver. Workout generators today cannot constitutionally honor an athlete's actual training environment. | P0 | Open |
| RFL-028 | Longitudinal adaptation rules (remember / forget / decay / accumulate / re-evaluate) constitutionally undefined. No decay engine, no re-evaluation triggers, no event-sourced training-age / lifting-age lineage. Consumers today read raw values without confidence, missingness, or decay envelopes — violating FC global continuity. | P0 | Open |

**Intelligence ceiling map (Section H):** Today ~20% · Minimum spine 35% · Recommended spine 70% · Elite spine 95%.

See `docs/asb/athlete-context-spine-constitution.md` and `docs/asb/athlete-context-spine-gap-analysis.md`.


## RFL closures & openings — Athlete Context Spine Implementation (P0-1) & Consumer Activation (P0-2) (2026-06-06)

| ID | Status | Closure / observation evidence |
|---|---|---|
| RFL-023 | CLOSED | `athlete_context` + `athlete_equipment_context` + `athlete_development_history_events` + `get_athlete_context_envelope()` RPC live; `athleteContext.ts` projects 16 spine vars with lineage. |
| RFL-025 | PARTIAL CLOSE | Spine envelope wired through `useHammerAthleteContext`; daily-plan + chat + onboarding consume 9–14 spine vars; deep biomechanical/load fields still unread — tracked under RFL-029…031. |
| RFL-026 | IMPLEMENTED | Constitution ratified + persistence layer live + projection envelope active. |
| RFL-027 | IMPLEMENTED | `athlete_equipment_context.scope` precedence (session > temporary > persistent > inferred) with TTL; resolver in `src/lib/hammer/context/equipment.ts`. |
| RFL-028 | IMPLEMENTED | `athlete_development_history_events` append-only event store live; 30-day form half-life in projection views; re-evaluation triggers wired. |

### P0-2 openings

| ID | Finding | Severity | Status |
|---|---|---|---|
| RFL-029 | `useWorkoutRecommendations`, `useDrillRecommendations`, `pieV2/recommendDrills` do not import the athlete-context envelope. Recommendation outputs do not vary on lifting age, lifecycle band, equipment, season phase, or development priorities. Spine exists; recommendation consumers ignore it. | P0 | Open |
| RFL-030 | Speed surfaces (`useSpeedSession*`, `runningAggregator.ts`, `sprint_analyses` readers, `softballStealAnalytics.ts`) consume zero spine variables. Acceleration / top-speed / stride / asymmetry / workload / freshness projections exist but no prescriptive consumer reads them. | P0 | Open |
| RFL-031 | Roadmap surfaces do not consume `goal_summary`, `goal_horizon`, `lifecycle_band`, `season_phase`, or `development_priorities`. `athlete_roadmap_progress` is written but no generator reads spine to produce per-athlete milestones. | P0 | Open |

**Intelligence estimate:** 35% → **~42%** after P0-2 (daily-plan, chat, onboarding consume spine; ecosystem still inactive).

See `docs/asb/athlete-context-spine-consumer-activation-ratification.md`.
