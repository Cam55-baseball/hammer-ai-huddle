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
| RFL-001 | Athlete signup not emitted as ASB topic | `docs/asb/post-launch-observability.md` row 1; `src/contexts/AuthContext.tsx` | every signup | warn | Emit `athlete.lifecycle.signup` on profile insert | observed |
| RFL-002 | Onboarding completion has no canonical topic | StartHereRunner.tsx end step | every onboarding | warn | Emit `athlete.onboarding.completed` on final step | observed |
| RFL-003 | UHRC views unobservable | `src/lib/uhrc/*` surfaces | per UHRC open | warn | Emit `intelligence.uhrc.viewed` on surface impression | observed |
| RFL-004 | Hammer views unobservable | `src/lib/hammer/identity.ts` surfaces | per Hammer open | warn | Emit `intelligence.hammer.viewed` | observed |
| RFL-005 | Coach review has no canonical topic | `src/pages/CoachAthleteDetail.tsx` open | per review | warn | Emit `coach.review.opened` with athlete_id | observed |
| RFL-006 | Recruiter positive-review path has no canonical topic | recruiter pages; only gate_blocked emitted | per recruiter session | warn | Emit `recruiter.review.opened` with athlete_id | observed |
| RFL-007 | Trend / timeline views unobservable | `src/pages/AsbTimeline.tsx`, `AthleteDigest.tsx` | per timeline open | info | Emit `intelligence.trend.viewed` | observed |
| RFL-008 | Drill assignment / completion only table-derived (no ASB topic) | `drill_assignments`, `foundation_video_outcomes` | per assignment | info | Emit `prescription.drill.assigned` and `.completed` | observed |
| RFL-009 | Recommendation lifecycle partially trace-derived; no canonical ASB topic | `foundation_recommendation_traces` | per recommendation | info | Emit `foundation.recommendation.shown/opened` | observed |
| RFL-010 | Coach acknowledgement of recommendation has no canonical channel | implicit in `coach_notifications` | per coach action | info | Emit `foundation.recommendation.coach_ack` | observed |

## Append-only policy

- Never delete rows. Status transitions only.
- Every new production observation appends a new row with monotonic `RFL-NNN` id.
- Each row must include reproducible evidence. No anecdotes.
- This ledger feeds **prioritization**, not architecture mutation. Architecture changes still flow through the constitutional sprint process.
