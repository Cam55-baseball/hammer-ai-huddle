# Post-Launch Observability Inventory

**Sprint:** Post-Launch Observability & Reality Validation
**Posture:** Observation only. No new doctrine, no scoring, no recommendation redesign. Every metric is derived from the canonical `asb_events` ledger; lineage preserved one interaction away. Subordinate to RR-9 (anti-engagement-optimization) and Megaphase 111–150 athlete intelligence delivery doctrine.

## How to read this table

- **behavior** — the real-world organism transition we want to observe.
- **event_name** — human-readable label used in dashboards.
- **source_file** — where the emission originates today (or `GAP` if not yet instrumented).
- **asb_topic** — canonical topic id on `asb_events`. `GAP` = no topic emitted yet.
- **consumer** — who reads it (dashboard, projection, hook).
- **owner** — RACI accountable surface.
- **success_criteria** — what "working" looks like in observation, not optimization.

Any row with `GAP` flows into `docs/asb/reality-feedback-ledger.md` as a `severity=instrumentation` entry. **No fixes in this sprint.**

## Critical organism behaviors

| behavior | event_name | source_file | asb_topic | consumer | owner | success_criteria |
|---|---|---|---|---|---|---|
| Athlete signup | `athlete.signup` | `src/contexts/AuthContext.tsx` (auth.users → profile insert) | `GAP` (auth-managed, no ASB emission) | auth logs + `profiles` rowcount | Platform | Signup observable via `auth_logs` + `profiles` insert rate match |
| Onboarding completion | `athlete.onboarding.completed` | `src/pages/start-here/StartHereRunner.tsx`, `src/pages/SelectSport.tsx` | `GAP` | funnel projection (Section B) | Onboarding | Completion event emitted on final step; ≥80% of signups reach it within 7d |
| Session creation | `session.created` | `src/lib/runtime/...` performance session insert | `session.block.modified` / performance_sessions insert | `useAthleteCommandRows` | Engine | Every session has a canonical lineage edge |
| Analysis completion | `analysis.completed` | `src/lib/runtime/projections/*` | `athlete.readiness`, `athlete.fatigue`, `athlete.recovery` | `useDigestProjection` | Engine | Analysis topics emitted within minutes of session close |
| UHRC viewed | `uhrc.viewed` | `src/lib/uhrc/*`, UHRC pages | `GAP` | intelligence utilization (Section E) | Intelligence | View event emitted per UHRC surface impression |
| Hammer viewed | `hammer.viewed` | `src/lib/hammer/identity.ts`, Hammer surfaces | `GAP` | intelligence utilization | Intelligence | View event per Hammer brief opened |
| Recommendation opened | `recommendation.opened` | `src/hooks/useFoundationVideos.ts`, `foundation_recommendation_traces` | `foundation.recommendation.*` (via traces table) + `GAP` for ASB topic | recommendation funnel (Section D) | Foundations | Trace row present; opened transition observable |
| Drill assigned | `drill.assigned` | `drill_assignments` insert, `drill_prescriptions` | `prescription.override.requested` adjacent; assignment itself `GAP` for ASB | recommendation funnel | Coaching | Assignment row + (future) ASB topic |
| Drill completed | `drill.completed` | `foundation_video_outcomes`, drill completion writes | `foundation.drill.completed` (via outcomes) + `GAP` for ASB | recommendation funnel | Athlete | Completion row present within session window |
| Video viewed | `video.viewed` | `src/hooks/useFoundationVideos.ts`, `foundation_recommendation_traces` | trace-derived; ASB topic `GAP` | recommendation funnel | Foundations | Trace row + view duration observable |
| Coach review | `coach.review` | `src/pages/CoachAthleteDetail.tsx`, `src/pages/CoachConsole.tsx` | `GAP` | coach funnel (Section B) | Coach | Review event per athlete-detail open |
| Recruiter review | `recruiter.review` | scout/recruiter pages, `scout_evaluations` | `relational.exposure.gate_blocked` (negative path) + `GAP` for positive review | recruiter funnel | Recruiting | Review event + gate allow event |
| Parent authorization | `parent.authorization.changed` | `src/pages/ParentRecruitingAuthorization.tsx`, `record_recruiting_consent_change` | `relational.exposure.consent_changed` | safeguarding observability (Section F) | Parent | Audit row 1:1 with consent updates |
| Recruiting visibility enabled | `recruiting.visibility.enabled` | `athlete_recruiting_consent` + `resolve_recruiting_visibility()` | `relational.exposure.consent_changed` | recruiter funnel | Recruiting | Consent change emits event + audit row |
| Safeguarding event | `safeguarding.signal` | `safeguarding_notifications`, `relational.safeguarding.*` | `relational.safeguarding.*` (reserved namespace) | safeguarding observability | Safeguarding | Every emission viewed + acknowledged within SLA |
| Trend review | `trend.viewed` | `src/pages/AthleteDigest.tsx`, `src/pages/AsbTimeline.tsx` | `GAP` | intelligence utilization | Intelligence | View event per timeline/digest open |

## Roll-up

- **Instrumented (canonical ASB topic exists):** 5 of 16 behaviors (session, analysis, recommendation-via-traces, video-via-traces, parent authorization / recruiting visibility, safeguarding)
- **Partial (table-derived only, no ASB topic):** 4 (recommendation opened, drill completed, video viewed, drill assigned)
- **GAP (no canonical event):** 7 (signup, onboarding completion, UHRC viewed, Hammer viewed, coach review, recruiter review positive path, trend viewed)

All gaps recorded in `docs/asb/reality-feedback-ledger.md` for the next sprint. **This sprint does not fix them.**
